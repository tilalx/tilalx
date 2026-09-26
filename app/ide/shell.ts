import { runTerminalCommand, type TerminalContext } from './utils'

const ROOT = '/home/tilo/Github/tilalx'
const MAX_LINES   = 2000 // per command, keeps xterm responsive
const MAX_MATCHES = 500

export type Files = Record<string, string>

export interface ShellCtx extends TerminalContext {
  files: Files
  cwd:   string // repo-relative, '' = root
}

// Run by XTermPanel; a curl result is piped into `rest`, the remaining stages.
export type Effect =
  | { kind: 'open'; path: string; line?: number }
  | { kind: 'curl'; url: string; rest: string[][] }
  | { kind: 'ask';  prompt: string; context?: string }

interface ShellOut {
  out:     string[] | null // null = clear screen
  cwd?:    string
  effect?: Effect
}

const C = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', magenta: '\x1b[35m', cyan: '\x1b[36m', bblue: '\x1b[94m', byellow: '\x1b[93m', bcyan: '\x1b[96m', bgreen: '\x1b[92m' }
const a = (code: string, s: string) => code + s + C.reset
const err = (cmd: string, msg: string) => [`${a(C.red, cmd + ':')} ${msg}`]
export const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '')

export function parse(line: string): string[][] {
  const stages: string[][] = [[]]
  let tok = '', quote = '', has = false
  const push = () => { if (has) stages.at(-1)!.push(tok); tok = ''; has = false }
  for (const ch of line) {
    if (quote) { if (ch === quote) quote = ''; else tok += ch; continue }
    if (ch === '"' || ch === "'") { quote = ch; has = true }
    else if (ch === '|') { push(); stages.push([]) }
    else if (/\s/.test(ch)) push()
    else { tok += ch; has = true }
  }
  push()
  return stages
}

export function resolvePath(cwd: string, p = '.'): string {
  if (p.startsWith(ROOT)) p = p.slice(ROOT.length) || '/'
  if (p === '~' || p.startsWith('~/')) p = '/' + p.slice(1)
  const parts = p.startsWith('/') ? [] : cwd.split('/').filter(Boolean)
  for (const seg of p.split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') parts.pop(); else parts.push(seg)
  }
  return parts.join('/')
}

const isDir = (files: Files, p: string) =>
  p === '' || Object.keys(files).some(k => k.startsWith(p + '/'))

// Falls back to case-insensitive so `cat readme.md` finds ReadMe.md.
export function findFile(files: Files, p: string): string | undefined {
  if (p in files) return p
  const lc = p.toLowerCase()
  return Object.keys(files).find(k => k.toLowerCase() === lc)
}

function listDir(files: Files, dir: string): { name: string; dir: boolean }[] {
  const prefix = dir ? dir + '/' : ''
  const seen = new Map<string, boolean>()
  for (const k of Object.keys(files)) {
    if (!k.startsWith(prefix)) continue
    const [name, ...more] = k.slice(prefix.length).split('/')
    seen.set(name, seen.get(name) || more.length > 0)
  }
  return [...seen].map(([name, dir]) => ({ name, dir }))
    .sort((x, y) => x.dir !== y.dir ? (x.dir ? -1 : 1) : x.name.localeCompare(y.name))
}

const filesUnder = (files: Files, p: string) =>
  p in files ? [p] : Object.keys(files).filter(k => !p || k.startsWith(p + '/')).sort()

const isBinary = (s: string) => s.includes('\0') || s.includes('�')

function colorName(name: string, dir: boolean): string {
  if (dir) return a(C.bold + C.bblue, name + '/')
  const ext = name.split('.').pop() ?? ''
  return a(['js', 'jsx', 'ts', 'tsx'].includes(ext) ? C.byellow
    : ext === 'json' ? C.bcyan : ext === 'md' ? C.bgreen : ext === 'css' ? C.magenta : '', name)
}

function input(cmd: string, arg: string | undefined, stdin: string[] | null, ctx: ShellCtx): string[] | { error: string[] } {
  if (arg === undefined) return stdin ?? { error: err(cmd, 'missing file operand') }
  const p = resolvePath(ctx.cwd, arg)
  const f = findFile(ctx.files, p)
  if (!f) return { error: err(cmd, isDir(ctx.files, p) ? `${arg}: Is a directory` : `${arg}: No such file or directory`) }
  if (isBinary(ctx.files[f])) return { error: err(cmd, `${arg}: binary file`) }
  return ctx.files[f].split('\n')
}

export function toRegex(pattern: string, ignoreCase: boolean): RegExp {
  try { return new RegExp(pattern, ignoreCase ? 'i' : '') }
  catch { return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ignoreCase ? 'i' : '') }
}

export function grepFiles(files: Files, re: RegExp, under = '', max = MAX_MATCHES) {
  const hits: { file: string; line: number; text: string }[] = []
  for (const f of filesUnder(files, under)) {
    if (isBinary(files[f])) continue
    const lines = files[f].split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        hits.push({ file: f, line: i + 1, text: lines[i].trim().slice(0, 200) })
        if (hits.length >= max) return hits
      }
    }
  }
  return hits
}

const hl = (s: string, re: RegExp) => s.replace(new RegExp(re.source, re.flags + 'g'), m => a(C.bold + C.red, m))

type Cmd = (args: string[], stdin: string[] | null, ctx: ShellCtx) => ShellOut

const flags = (args: string[]) => {
  const f = new Set<string>(), rest: string[] = []
  let n: number | undefined
  for (let i = 0; i < args.length; i++) {
    const x = args[i]
    if (x === '-n' && /^\d+$/.test(args[i + 1] ?? '')) n = +args[++i]
    else if (/^-\d+$/.test(x)) n = +x.slice(1)
    else if (/^-[a-zA-Z]+$/.test(x)) [...x.slice(1)].forEach(c => f.add(c))
    else rest.push(x)
  }
  return { f, rest, n }
}

const HELP: [string, string][] = [
  ['ls [-la] [path]', 'list directory'],
  ['cd <dir>', 'change directory'],
  ['tree [path]', 'directory tree'],
  ['cat <file>', 'print file'],
  ['head / tail [-n N] [file]', 'first / last lines'],
  ['wc [-l] [file]', 'count lines, words, chars'],
  ['grep [-in] <re> [path]', 'search files (or stdin)'],
  ['find [path] [-name glob]', 'find files'],
  ['code <file>[:line]', 'open file in the editor'],
  ['curl <url>', 'fetch a URL'],
  ['ask <question>', 'ask the local AI (pipe input: cat f | ask ...)'],
  ['explain <file>', 'AI explanation of a file'],
  ['git log · whoami · neofetch', 'and friends'],
  ['clear', 'clear screen (Ctrl+L)'],
]

const COMMANDS_MAP: Record<string, Cmd> = {
  help: () => ({ out: [a(C.bold, 'Commands') + a(C.dim, '  (pipes with | work for text filters)'), '',
    ...HELP.map(([c, d]) => `  ${a(C.cyan, c.padEnd(28))}${a(C.dim, d)}`)] }),

  clear: () => ({ out: null }),

  pwd: (_, __, ctx) => ({ out: [ROOT + (ctx.cwd ? '/' + ctx.cwd : '')] }),

  cd: (args, _, ctx) => {
    const p = resolvePath(ctx.cwd, args[0] ?? '~')
    if (!isDir(ctx.files, p)) return { out: err('cd', `${args[0]}: No such directory`) }
    return { out: [], cwd: p }
  },

  echo: args => ({ out: [args.join(' ')] }),

  ls: (args, _, ctx) => {
    const { f, rest } = flags(args)
    const p = resolvePath(ctx.cwd, rest[0])
    const file = findFile(ctx.files, p)
    if (file) return { out: [colorName(rest[0], false)] }
    if (!isDir(ctx.files, p)) return { out: err('ls', `${rest[0]}: No such file or directory`) }
    const entries = listDir(ctx.files, p)
    if (!f.has('l')) return { out: [entries.map(e => colorName(e.name, e.dir)).join('  ')] }
    return { out: entries.map(e => {
      const size = e.dir ? '-' : String(ctx.files[(p ? p + '/' : '') + e.name]?.length ?? 0)
      return `${a(C.dim, e.dir ? 'drwxr-xr-x' : '-rw-r--r--')} ${size.padStart(7)} ${colorName(e.name, e.dir)}`
    }) }
  },

  tree: (args, _, ctx) => {
    const root = resolvePath(ctx.cwd, args[0])
    if (!isDir(ctx.files, root)) return { out: err('tree', `${args[0]}: not a directory`) }
    const out = [a(C.bold + C.bblue, args[0] ?? '.')]
    const walk = (dir: string, pad: string) => listDir(ctx.files, dir).forEach((e, i, all) => {
      const last = i === all.length - 1
      out.push(pad + (last ? '└── ' : '├── ') + colorName(e.name, e.dir))
      if (e.dir && out.length < MAX_LINES) walk((dir ? dir + '/' : '') + e.name, pad + (last ? '    ' : '│   '))
    })
    walk(root, '')
    return { out }
  },

  cat: (args, stdin, ctx) => {
    if (!args.length) return { out: stdin ?? [] }
    const out: string[] = []
    for (const arg of args) {
      const r = input('cat', arg, null, ctx)
      out.push(...('error' in r ? r.error : r))
    }
    return { out }
  },

  head: (args, stdin, ctx) => {
    const { rest, n = 10 } = flags(args)
    const r = input('head', rest[0], stdin, ctx)
    return { out: 'error' in r ? r.error : r.slice(0, n) }
  },

  tail: (args, stdin, ctx) => {
    const { rest, n = 10 } = flags(args)
    const r = input('tail', rest[0], stdin, ctx)
    return { out: 'error' in r ? r.error : r.slice(-n) }
  },

  wc: (args, stdin, ctx) => {
    const { f, rest } = flags(args)
    const r = input('wc', rest[0], stdin, ctx)
    if ('error' in r) return { out: r.error }
    const text = r.join('\n')
    const lines = r.length, words = text.split(/\s+/).filter(Boolean).length
    return { out: [f.has('l') ? String(lines) : `${lines} ${words} ${text.length}${rest[0] ? ' ' + rest[0] : ''}`] }
  },

  grep: (args, stdin, ctx) => {
    const { f, rest } = flags(args)
    const [pattern, path] = rest
    if (!pattern) return { out: err('grep', 'usage: grep [-in] <pattern> [path]') }
    const re = toRegex(pattern, f.has('i'))
    if (stdin && path === undefined) {
      return { out: stdin.flatMap((l, i) => re.test(l) ? [(f.has('n') ? a(C.green, `${i + 1}:`) : '') + hl(l, re)] : []) }
    }
    const under = resolvePath(ctx.cwd, path)
    if (!findFile(ctx.files, under) && !isDir(ctx.files, under)) return { out: err('grep', `${path}: No such file or directory`) }
    const hits = grepFiles(ctx.files, re, findFile(ctx.files, under) ?? under)
    const out = hits.map(h => `${a(C.magenta, h.file)}${a(C.dim, ':')}${a(C.green, String(h.line))}${a(C.dim, ':')} ${hl(h.text, re)}`)
    if (hits.length >= MAX_MATCHES) out.push(a(C.dim, `… stopped after ${MAX_MATCHES} matches`))
    return { out }
  },

  find: (args, _, ctx) => {
    const i = args.indexOf('-name')
    const glob = i >= 0 ? args[i + 1] : undefined
    const path = args.find((x, j) => j !== i && j !== i + 1 && !x.startsWith('-'))
    const under = resolvePath(ctx.cwd, path)
    const re = glob && new RegExp('^' + glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i')
    return { out: filesUnder(ctx.files, under).filter(f => !re || re.test(f.split('/').pop()!)) }
  },

  code: (args, _, ctx) => {
    if (!args[0]) return { out: err('code', 'usage: code <file>[:line]') }
    const [, file, line] = /^(.*?)(?::(\d+))?$/.exec(args[0])!
    const f = findFile(ctx.files, resolvePath(ctx.cwd, file))
    if (!f) return { out: err('code', `${file}: No such file`) }
    return { out: [a(C.dim, `opening ${f}${line ? ':' + line : ''}`)], effect: { kind: 'open', path: f, line: line ? +line : undefined } }
  },

  ask: (args, stdin) => {
    if (!args.length) return { out: err('ask', 'usage: ask <question>') }
    return { out: [], effect: { kind: 'ask', prompt: args.join(' '), context: stdin?.join('\n') } }
  },

  explain: (args, _, ctx) => {
    const r = input('explain', args[0], null, ctx)
    if ('error' in r) return { out: r.error }
    const f = findFile(ctx.files, resolvePath(ctx.cwd, args[0]))!
    return { out: [], effect: { kind: 'ask', prompt: `Explain what the file ${f} does, briefly.`, context: r.join('\n') } }
  },
}

const COMMAND_NAMES = [...Object.keys(COMMANDS_MAP), 'git', 'whoami', 'neofetch', 'date', 'uname', 'uptime', 'ps', 'env', 'curl']

export function runPipeline(stages: string[][], stdin: string[] | null, ctx: ShellCtx): ShellOut {
  let cwd = ctx.cwd
  let out: string[] | null = stdin
  for (let i = 0; i < stages.length; i++) {
    const [cmd, ...args] = stages[i]
    if (!cmd) return { out: err('fish', 'empty pipeline stage') }
    const piped = i > 0 ? out?.map(stripAnsi) ?? [] : stdin
    let r: ShellOut
    if (cmd === 'curl') {
      if (!args[0]) return { out: err('curl', 'usage: curl <url>') }
      const url = /^https?:\/\//.test(args[0]) ? args[0] : 'https://' + args[0]
      return { out: [], effect: { kind: 'curl', url, rest: stages.slice(i + 1) } }
    } else if (COMMANDS_MAP[cmd]) {
      r = COMMANDS_MAP[cmd](args, piped, { ...ctx, cwd })
    } else {
      r = { out: runTerminalCommand(stages[i].join(' '), ctx) }
    }
    if (r.cwd !== undefined) cwd = r.cwd
    if (r.effect) {
      if (r.effect.kind === 'ask' && i < stages.length - 1) return { out: err('ask', 'must be the last command in a pipeline') }
      return { ...r, cwd }
    }
    out = r.out
    if (out === null) return { out: null, cwd }
  }
  return { out: out && out.length > MAX_LINES ? [...out.slice(0, MAX_LINES), a(C.dim, `… ${out.length - MAX_LINES} more lines`)] : out, cwd }
}

export const runShell = (line: string, ctx: ShellCtx) => runPipeline(parse(line), null, ctx)

export function completions(line: string, ctx: ShellCtx): string[] {
  const m = /(\S*)$/.exec(line)!
  const word = m[1]
  const first = !line.slice(0, m.index).trim() || /\|\s*$/.test(line.slice(0, m.index))
  if (first) return COMMAND_NAMES.filter(c => c.startsWith(word))
  const slash = word.lastIndexOf('/')
  const dirPart = word.slice(0, slash + 1), base = word.slice(slash + 1)
  const dir = resolvePath(ctx.cwd, dirPart || '.')
  if (!isDir(ctx.files, dir)) return []
  return listDir(ctx.files, dir).filter(e => e.name.startsWith(base)).map(e => dirPart + e.name + (e.dir ? '/' : ''))
}
