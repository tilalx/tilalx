import type { Commit, FileNode, GitStatus, Repo } from '../types'

export interface SearchHit { path: string; line: number; text: string }

export interface ShellEnv {
  tree: FileNode[]
  git: Record<string, GitStatus>
  branch: string
  commits: Commit[]
  repos: Repo[]
  readFile(path: string): Promise<string | null>
  /** Server-side search over every shipped file; a string is an error message. */
  search(source: string, opts: { caseSensitive: boolean; wholeWord: boolean }): Promise<SearchHit[] | string>
  fetchUrl(url: string): Promise<string>
  openFile(path: string, line?: number): void
  openUrl(url: string): void
  setTheme(type: 'dark' | 'light'): void
  commands: { id: string; title: string }[]
  runCommand(id: string): void
  history: string[]
  startedAt: number
  signal?: AbortSignal
}

export interface ShellState { cwd: string; status: number; aliases: Record<string, string> }
export interface Result { lines: string[]; clear: boolean; code: number }

export const newState = (): ShellState => ({ cwd: '', status: 0, aliases: { ll: 'ls -la', la: 'ls -a' } })

export const MAX_LINES = 2000 // per command line, keeps xterm responsive
export const MAX_MATCHES = 500

const ESC = '\x1b['
const C = {
  bold: (s: string) => `${ESC}1m${s}${ESC}0m`,
  dim: (s: string) => `${ESC}2m${s}${ESC}0m`,
  red: (s: string) => `${ESC}31m${s}${ESC}0m`,
  green: (s: string) => `${ESC}32m${s}${ESC}0m`,
  yellow: (s: string) => `${ESC}33m${s}${ESC}0m`,
  blue: (s: string) => `${ESC}34m${s}${ESC}0m`,
  magenta: (s: string) => `${ESC}35m${s}${ESC}0m`,
  cyan: (s: string) => `${ESC}36m${s}${ESC}0m`,
}
export const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '')
export const stripControl = (text: string) => text.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '')

const HOME = '/home/tilo/tilalx'

export function prompt(state: ShellState): string {
  const dir = state.cwd ? `~/tilalx/${state.cwd}` : '~/tilalx'
  return `${ESC}1;32mtilo@aelx${ESC}0m:${ESC}1;34m${dir}${ESC}0m$ `
}

// ---------- paths ----------

type Node = Pick<FileNode, 'name' | 'path' | 'type' | 'children'>

function resolvePath(cwd: string, arg = '.'): string | null {
  const parts = (arg.startsWith('/') || arg.startsWith('~') ? [] : cwd.split('/').filter(Boolean))
  const input = arg.replace(new RegExp(`^${HOME}/?`), '').replace(/^~\/?(tilalx\/?)?/, '')
  for (const seg of input.split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') { if (!parts.length) return null; parts.pop() } else parts.push(seg)
  }
  return parts.join('/')
}

function nodeAt(tree: FileNode[], path: string): Node | null {
  if (!path) return { type: 'folder', children: tree, name: 'tilalx', path: '' }
  let nodes = tree
  let found: FileNode | null = null
  for (const seg of path.split('/')) {
    found = nodes.find(n => n.name === seg) ?? null
    if (!found) return null
    nodes = found.children ?? []
  }
  return found
}

const allFiles = (nodes: FileNode[]): string[] => nodes.flatMap(n => n.type === 'folder' ? allFiles(n.children ?? []) : [n.path])
const colorName = (n: Node) => n.type === 'folder' ? C.blue(C.bold(n.name)) : /\.sh$/.test(n.name) ? C.green(n.name) : n.name
const BINARY = /\.(woff2?|ttf|png|jpe?g|gif|ico|webp|lock)$/i

// ---------- parsing ----------

/** Splits a line on `;`, `&&` and `||` outside quotes. */
export function splitList(line: string): { op: '' | ';' | '&&' | '||'; text: string }[] {
  const out: { op: '' | ';' | '&&' | '||'; text: string }[] = []
  let cur = '', quote: string | null = null, op: '' | ';' | '&&' | '||' = ''
  for (let i = 0; i < line.length; i++) {
    const ch = line[i], two = line.slice(i, i + 2)
    if (ch === '\\' && quote !== "'") { cur += ch + (line[i + 1] ?? ''); i++; continue }
    if (quote) { if (ch === quote) quote = null }
    else if (ch === '"' || ch === "'") quote = ch
    else if (two === '&&' || two === '||') { out.push({ op, text: cur }); op = two; cur = ''; i++; continue }
    else if (ch === ';') { out.push({ op, text: cur }); op = ';'; cur = ''; continue }
    cur += ch
  }
  out.push({ op, text: cur })
  return out.filter(s => s.text.trim())
}

/** Splits a command list item on `|` outside quotes. */
export function splitPipes(line: string): string[] {
  const out: string[] = []
  let cur = '', quote: string | null = null
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '\\' && quote !== "'") { cur += ch + (line[i + 1] ?? ''); i++; continue }
    if (quote) { if (ch === quote) quote = null }
    else if (ch === '"' || ch === "'") quote = ch
    else if (ch === '|') { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out
}

/** Words with quotes, backslash escapes and `$VAR` / `$?` expansion (not inside single quotes). */
export function tokenize(line: string, vars: Record<string, string> = {}): string[] {
  const out: string[] = []
  let cur = '', quote: string | null = null, has = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '\\' && i + 1 < line.length && (!quote || (quote === '"' && /["\\$]/.test(line[i + 1])))) { cur += line[++i]; continue }
    if (ch === '$' && quote !== "'") {
      const m = /^\$(\?|[A-Za-z_]\w*)/.exec(line.slice(i))
      if (m) { cur += vars[m[1]] ?? ''; has = true; i += m[0].length - 1; continue }
    }
    if (quote) { if (ch === quote) quote = null; else cur += ch; continue }
    if (ch === '"' || ch === "'") { quote = ch; has = true; continue }
    if (/\s/.test(ch)) { if (cur || has) { out.push(cur); cur = ''; has = false } continue }
    if (ch === '~' && !cur && (i + 1 === line.length || /[\s/]/.test(line[i + 1]))) { cur += HOME; continue }
    cur += ch
  }
  if (cur || has) out.push(cur)
  return out
}

/** getopt-ish: `-abc` sets flags a,b,c; letters in `valued` take the rest of the word or the next arg; `-5` means `-n 5`. */
export function parseArgs(args: string[], valued = '') {
  const flags = new Set<string>(), values: Record<string, string> = {}, rest: string[] = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--') { rest.push(...args.slice(i + 1)); break }
    if (/^-\d+$/.test(a)) { values.n = a.slice(1); continue }
    if (a.startsWith('--') && a.length > 2) { flags.add(a.slice(2)); continue }
    if (a.length < 2 || a[0] !== '-') { rest.push(a); continue }
    for (let j = 1; j < a.length; j++) {
      if (valued.includes(a[j])) { values[a[j]] = a.slice(j + 1) || (args[++i] ?? ''); break }
      flags.add(a[j])
    }
  }
  return { flags, values, rest }
}

// ---------- command plumbing ----------

class Fail extends Error {}
const fail = (msg: string): never => { throw new Fail(msg) }

interface Ctx {
  args: string[]
  stdin: string[] | null
  st: ShellState
  env: ShellEnv
  /** Report an error without stopping; the command exits 1. */
  err(msg: string): void
}
type Out = string[] | void | 'clear' | { out: string[]; code: number }

interface Command {
  usage: string
  desc: string
  hidden?: boolean
  /** Completions for the argument being typed (path completion when absent). */
  complete?: (env: ShellEnv, words: string[]) => string[]
  run(c: Ctx): Out | Promise<Out>
}

function stat(c: Ctx, arg: string | undefined, cmd: string): { path: string; node: Node } {
  const p = resolvePath(c.st.cwd, arg)
  const node = p === null ? null : nodeAt(c.env.tree, p)
  if (!node) return fail(`${cmd}: ${arg}: No such file or directory`)
  return { path: p!, node }
}

const aborted = (env: ShellEnv) => { if (env.signal?.aborted) throw new DOMException('Aborted', 'AbortError') }

async function readText(c: Ctx, arg: string, cmd: string): Promise<string[]> {
  const { path, node } = stat(c, arg, cmd)
  if (node.type === 'folder') return fail(`${cmd}: ${arg}: Is a directory`)
  const text = await c.env.readFile(path)
  if (text === null) return fail(`${cmd}: ${arg}: Permission denied`)
  return stripControl(text.replace(/\r?\n$/, '')).split(/\r?\n/)
}

/** The lines of every file argument, or stdin when there are none. */
async function input(c: Ctx, files: string[], cmd: string): Promise<string[]> {
  if (!files.length) return c.stdin ?? fail(`${cmd}: missing file operand`)
  const lines: string[] = []
  for (const f of files) { aborted(c.env); lines.push(...await readText(c, f, cmd)) }
  return lines
}

const count = (v: string | undefined, dflt = 10) => {
  const n = v === '' ? NaN : Number(v ?? dflt)
  return Number.isInteger(n) && n >= 0 ? n : fail(`invalid number of lines: '${v}'`)
}

function fmtUptime(ms: number): string {
  const m = Math.floor(ms / 60000)
  return m < 1 ? `${Math.floor(ms / 1000)} sec` : m < 60 ? `${m} min` : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

/** `a-z` style sets for tr. */
const charSet = (s: string) => s.replace(/(.)-(.)/g, (_, a: string, b: string) => {
  let out = ''
  for (let i = a.charCodeAt(0); i <= b.charCodeAt(0); i++) out += String.fromCharCode(i)
  return out
})

/** cut field lists like `1,3-5,7-`. */
function fieldSpec(spec: string): (i: number) => boolean {
  const parts = spec.split(',').map(p => {
    const m = /^(\d*)(-?)(\d*)$/.exec(p)
    if (!m || (!m[1] && !m[3])) return fail(`cut: invalid field list '${spec}'`)
    const from = Number(m[1] || 1), to = m[2] ? (m[3] ? Number(m[3]) : Infinity) : from
    return [from, to] as const
  })
  return i => parts.some(([a, b]) => i >= a && i <= b)
}

const GIT_SUB = ['log', 'show', 'status', 'branch', 'remote']

// ---------- commands ----------

const COMMANDS: Record<string, Command> = {
  help: {
    usage: 'help [command]', desc: 'list commands, or explain one',
    complete: () => COMMAND_NAMES,
    run: ({ args }) => {
      if (args[0]) {
        const cmd = Object.hasOwn(COMMANDS, args[0]) ? COMMANDS[args[0]] : fail(`help: no help topics match '${args[0]}'`)
        return [`${C.cyan(cmd.usage)}`, `    ${cmd.desc}`]
      }
      return [
        C.bold('Available commands') + C.dim('  (| pipes, ; && || lists, $? $PWD, Ctrl+R history search)'), '',
        ...Object.values(COMMANDS).filter(x => !x.hidden).map(x => `  ${C.cyan(x.usage.padEnd(30))}${C.dim(x.desc)}`),
      ]
    },
  },
  clear: { usage: 'clear', desc: 'clear the screen', run: () => 'clear' },
  pwd: { usage: 'pwd', desc: 'print the working directory', run: ({ st }) => [HOME + (st.cwd ? `/${st.cwd}` : '')] },
  echo: { usage: 'echo [text]', desc: 'print text', run: ({ args }) => [args.join(' ')] },
  true: { usage: 'true', desc: 'do nothing, successfully', hidden: true, run: () => [] },
  false: { usage: 'false', desc: 'do nothing, unsuccessfully', hidden: true, run: () => ({ out: [], code: 1 }) },
  cd: {
    usage: 'cd [dir]', desc: 'change directory',
    run: c => {
      const target = c.args[0] ?? '~'
      const { path, node } = stat(c, target, 'cd')
      if (node.type !== 'folder') fail(`cd: ${target}: Not a directory`)
      c.st.cwd = path
    },
  },
  ls: {
    usage: 'ls [-la] [dir]', desc: 'list files',
    run: c => {
      const { flags, rest } = parseArgs(c.args)
      const out: string[] = []
      for (const target of rest.length ? rest : ['.']) {
        let entry: { node: Node }
        try { entry = stat(c, target, 'ls') } catch (e) { if (e instanceof Fail) { c.err(`ls: cannot access '${target}': No such file or directory`); continue } throw e }
        const { node } = entry
        if (rest.length > 1) out.push(`${target}:`)
        if (node.type !== 'folder') { out.push(node.name); continue }
        const entries = (node.children ?? []).filter(n => flags.has('a') || !n.name.startsWith('.'))
        if (flags.has('l')) out.push(...entries.map(n => `${C.dim(n.type === 'folder' ? 'drwxr-xr-x' : '-rw-r--r--')}  tilo  ${colorName(n)}`))
        else if (entries.length) out.push(entries.map(colorName).join('  '))
      }
      return out
    },
  },
  tree: {
    usage: 'tree [dir]', desc: 'show the directory tree',
    run: c => {
      const { node } = stat(c, c.args[0], 'tree')
      if (node.type !== 'folder') fail(`tree: ${c.args[0]}: Not a directory`)
      const out = [C.blue(C.bold(c.args[0] ?? '.'))]
      const walk = (nodes: FileNode[], prefix: string) => nodes.forEach((n, i) => {
        if (out.length > MAX_LINES) return
        const last = i === nodes.length - 1
        out.push(`${prefix}${last ? '└── ' : '├── '}${colorName(n)}`)
        if (n.type === 'folder') walk(n.children ?? [], prefix + (last ? '    ' : '│   '))
      })
      walk(node.children ?? [], '')
      return out
    },
  },
  cat: { usage: 'cat <file...>', desc: 'print files', run: c => input(c, c.args, 'cat') },
  head: {
    usage: 'head [-n N] [file]', desc: 'first lines',
    run: async c => { const { values, rest } = parseArgs(c.args, 'n'); const n = count(values.n); return (await input(c, rest, 'head')).slice(0, n) },
  },
  tail: {
    usage: 'tail [-n N] [file]', desc: 'last lines',
    run: async c => { const { values, rest } = parseArgs(c.args, 'n'); const n = count(values.n); return n ? (await input(c, rest, 'tail')).slice(-n) : [] },
  },
  wc: {
    usage: 'wc [-lwc] [file]', desc: 'count lines, words, characters',
    run: async c => {
      const { flags, rest } = parseArgs(c.args)
      const lines = await input(c, rest, 'wc')
      const counts = { l: lines.length, w: lines.join(' ').split(/\s+/).filter(Boolean).length, c: lines.join('\n').length + (lines.length ? 1 : 0) }
      const pick = (['l', 'w', 'c'] as const).filter(k => flags.has(k))
      return pick.length === 1 ? [String(counts[pick[0]])] : [(pick.length ? pick : ['l', 'w', 'c'] as const).map(k => String(counts[k]).padStart(7)).join(' ')]
    },
  },
  grep: {
    usage: 'grep [-invclw] PATTERN [path...]', desc: 'search text (recursive by default)',
    run: async c => {
      const { flags, values, rest } = parseArgs(c.args, 'e')
      const pattern = values.e ?? rest.shift()
      if (pattern === undefined) fail('usage: grep [-invclw] [-e] PATTERN [FILE...]')
      let source: string
      try { new RegExp(pattern!); source = pattern! } catch { source = pattern!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
      const re = new RegExp(flags.has('w') ? `\\b(?:${source})\\b` : source, flags.has('i') ? 'i' : '')
      const invert = flags.has('v')
      const hits: SearchHit[] = []
      const scan = (path: string, lines: string[]) => lines.forEach((l, i) => { if (re.test(l) !== invert && hits.length < MAX_MATCHES) hits.push({ path, line: i + 1, text: l }) })

      let multi = rest.length > 1
      if (!rest.length && c.stdin) scan('', c.stdin)
      for (const target of rest.length ? rest : c.stdin ? [] : ['.']) {
        aborted(c.env)
        let entry: { path: string; node: Node }
        try { entry = stat(c, target, 'grep') } catch (e) { if (e instanceof Fail) { c.err(e.message); continue } throw e }
        const { path, node } = entry
        if (node.type === 'file') { scan(path, await readText(c, target, 'grep')); continue }
        multi = true
        if (!invert) {
          const found = await c.env.search(source, { caseSensitive: !flags.has('i'), wholeWord: flags.has('w') })
          if (typeof found === 'string') fail(`grep: ${found}`)
          const seen = new Set<string>()
          for (const h of found as SearchHit[]) {
            const key = `${h.path}:${h.line}`
            if ((path && !h.path.startsWith(path + '/')) || seen.has(key) || hits.length >= MAX_MATCHES) continue
            seen.add(key); hits.push(h)
          }
        } else {
          for (const f of allFiles(node.children ?? [])) {
            aborted(c.env)
            if (BINARY.test(f) || hits.length >= MAX_MATCHES) continue
            const text = await c.env.readFile(f)
            if (text !== null) scan(f, stripControl(text).split(/\r?\n/))
          }
        }
      }

      const label = (p: string) => multi && p ? C.magenta(p) + C.cyan(':') : ''
      let out: string[]
      if (flags.has('l')) out = [...new Set(hits.map(h => h.path))].map(p => C.magenta(p || '(standard input)'))
      else if (flags.has('c')) {
        const per = new Map<string, number>()
        for (const h of hits) per.set(h.path, (per.get(h.path) ?? 0) + 1)
        out = multi ? [...per].map(([p, n]) => label(p) + n) : [String(hits.length)]
      } else {
        const hl = (l: string) => invert ? l : l.replace(new RegExp(re.source, re.flags + 'g'), m => `${ESC}1;31m${m}${ESC}0m`)
        out = hits.map(h => `${label(h.path)}${flags.has('n') ? C.green(String(h.line)) + C.cyan(':') : ''}${hl(multi ? h.text.trim().slice(0, 200) : h.text)}`)
      }
      if (hits.length >= MAX_MATCHES) out.push(C.dim(`… stopped after ${MAX_MATCHES} matches`))
      return { out, code: hits.length ? 0 : 1 }
    },
  },
  find: {
    usage: 'find [dir] [-name GLOB] [-type f|d]', desc: 'find files',
    run: c => {
      const nameAt = c.args.indexOf('-name'), typeAt = c.args.indexOf('-type')
      let glob = nameAt >= 0 ? c.args[nameAt + 1] : undefined
      const type = typeAt >= 0 ? c.args[typeAt + 1] : undefined
      const valueAt = new Set([nameAt, typeAt].filter(i => i >= 0).map(i => i + 1))
      let dir = c.args.find((a, i) => !a.startsWith('-') && !valueAt.has(i))
      // `find shell` with no such dir and no -name: treat it as a name search, the common intent here
      if (dir && !glob && !nodeAt(c.env.tree, resolvePath(c.st.cwd, dir) ?? '\0')) { glob = `*${dir}*`; dir = undefined }
      const { path: base, node } = stat(c, dir, 'find')
      const re = glob && new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'i')
      const out: string[] = []
      const walk = (nodes: FileNode[]) => nodes.forEach(n => {
        if ((!re || re.test(n.name)) && (!type || (type === 'd') === (n.type === 'folder'))) out.push(`${dir ?? '.'}/${base ? n.path.slice(base.length + 1) : n.path}`)
        if (n.type === 'folder') walk(n.children ?? [])
      })
      walk(node.children ?? [])
      return out
    },
  },
  sort: {
    usage: 'sort [-rnu] [file]', desc: 'sort lines',
    run: async c => {
      const { flags, rest } = parseArgs(c.args)
      let lines = [...await input(c, rest, 'sort')]
      lines.sort(flags.has('n') ? (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) : (a, b) => a.localeCompare(b))
      if (flags.has('u')) lines = [...new Set(lines)]
      return flags.has('r') ? lines.reverse() : lines
    },
  },
  uniq: {
    usage: 'uniq [-c] [file]', desc: 'collapse repeated lines',
    run: async c => {
      const { flags, rest } = parseArgs(c.args)
      const runs: [string, number][] = []
      for (const l of await input(c, rest, 'uniq')) { const last = runs.at(-1); if (last && last[0] === l) last[1]++; else runs.push([l, 1]) }
      return runs.map(([l, n]) => flags.has('c') ? `${String(n).padStart(7)} ${l}` : l)
    },
  },
  cut: {
    usage: 'cut -d DELIM -f LIST [file]', desc: 'select fields',
    run: async c => {
      const { values, rest } = parseArgs(c.args, 'df')
      if (!values.f) fail('cut: you must specify a list of fields')
      const keep = fieldSpec(values.f), d = values.d || '\t'
      return (await input(c, rest, 'cut')).map(l => l.includes(d) ? l.split(d).filter((_, i) => keep(i + 1)).join(d) : l)
    },
  },
  tr: {
    usage: 'tr [-d] SET1 [SET2]', desc: 'translate or delete characters',
    run: c => {
      const { flags, rest } = parseArgs(c.args)
      if (!c.stdin) fail('tr: reads standard input, e.g. cat file | tr a-z A-Z')
      const from = charSet(rest[0] ?? ''), to = charSet(rest[1] ?? '')
      if (!from || (!flags.has('d') && !to)) fail('usage: tr [-d] SET1 [SET2]')
      return c.stdin!.map(l => [...l].map(ch => {
        const i = from.indexOf(ch)
        return i < 0 ? ch : flags.has('d') ? '' : to[Math.min(i, to.length - 1)]
      }).join(''))
    },
  },
  nl: { usage: 'nl [file]', desc: 'number lines', run: async c => (await input(c, c.args, 'nl')).map((l, i) => `${String(i + 1).padStart(6)}  ${l}`) },
  rev: { usage: 'rev [file]', desc: 'reverse each line', run: async c => (await input(c, c.args, 'rev')).map(l => [...l].reverse().join('')) },
  code: {
    usage: 'code <file>[:line]', desc: 'open a file in the editor',
    run: c => {
      if (!c.args.length) fail('usage: code <file>[:line]')
      for (const a of c.args) {
        const [file, line] = a.split(':')
        const { path, node } = stat(c, file, 'code')
        if (node.type === 'folder') fail(`code: ${file}: Is a directory`)
        c.env.openFile(path, line ? Number(line) : undefined)
      }
    },
  },
  open: {
    usage: 'open <url|file>', desc: 'open a URL in a new tab, or a file',
    run: c => {
      const target = c.args[0] ?? fail('usage: open <url|file>')
      if (/^https?:\/\//.test(target)) return void c.env.openUrl(target)
      const { path, node } = stat(c, target, 'open')
      if (node.type === 'folder') fail(`open: ${target}: Is a directory`)
      c.env.openFile(path)
    },
  },
  wb: {
    usage: 'wb [command-id]', desc: 'run a workbench command (no args: list)',
    complete: env => env.commands.map(x => x.id),
    run: c => {
      if (!c.args[0]) return c.env.commands.map(x => `${C.cyan(x.id.padEnd(48))}${C.dim(x.title)}`)
      const cmd = c.env.commands.find(x => x.id === c.args[0]) ?? fail(`wb: unknown command '${c.args[0]}'`)
      c.env.runCommand(cmd.id)
    },
  },
  git: {
    usage: 'git log|show|status|branch|remote', desc: 'repository info',
    complete: (_, words) => words.length === 1 ? GIT_SUB : [],
    run: c => {
      const { env, args } = c
      const first = (m: string) => m.split('\n')[0]
      switch (args[0]) {
        case 'log': {
          const { flags, values } = parseArgs(args.slice(1), 'n')
          if (!env.commits.length) fail('fatal: could not read commits from GitHub')
          const commits = env.commits.slice(0, values.n ? count(values.n) : undefined)
          return commits.flatMap(cm => flags.has('oneline')
            ? [`${C.yellow(cm.sha.slice(0, 7))} ${first(cm.commit.message)}`]
            : [C.yellow(`commit ${cm.sha}`), `Author: ${cm.commit.author.name}`, `Date:   ${new Date(cm.commit.author.date).toString()}`, '', `    ${first(cm.commit.message)}`, ''])
        }
        case 'show': {
          const ref = args[1] ?? env.commits[0]?.sha ?? fail('fatal: could not read commits from GitHub')
          const cm = env.commits.find(x => x.sha.startsWith(ref)) ?? fail(`fatal: ambiguous argument '${ref}': unknown revision`)
          return [C.yellow(`commit ${cm.sha}`), `Author: ${cm.commit.author.name}`, `Date:   ${new Date(cm.commit.author.date).toString()}`, '',
            ...cm.commit.message.split('\n').map(l => `    ${l}`), '', C.dim(cm.html_url)]
        }
        case 'status': {
          const entries = Object.entries(env.git)
          const out = [`On branch ${env.branch}`, `Your branch is up to date with 'origin/${env.branch}'.`, '']
          if (!entries.length) return [...out, 'nothing to commit, working tree clean']
          const mod = entries.filter(([, s]) => s !== 'U'), untracked = entries.filter(([, s]) => s === 'U')
          if (mod.length) out.push('Changes not staged for commit:', ...mod.map(([p]) => C.red(`\tmodified:   ${p}`)), '')
          if (untracked.length) out.push('Untracked files:', ...untracked.map(([p]) => C.red(`\t${p}`)), '')
          return out
        }
        case 'branch': return [`* ${C.green(env.branch)}`]
        case 'remote': return args.includes('-v') ? ['origin\thttps://github.com/tilalx/tilalx.git (fetch)', 'origin\thttps://github.com/tilalx/tilalx.git (push)'] : ['origin']
        case undefined: return ['usage: git <command> [<args>]', '', '   log      Show commit logs (-n N, --oneline)', '   show     Show a commit', '   status   Show the working tree status', '   branch   List branches', '   remote   Show remotes']
        default: return fail(`git: '${args[0]}' is not a git command. See 'git --help'.`)
      }
    },
  },
  curl: {
    usage: 'curl <url>', desc: 'fetch a public URL',
    run: async c => {
      const url = c.args.find(a => /^https?:\/\//.test(a)) ?? fail("curl: try 'curl https://example.com'")
      let text: string
      try { text = await c.env.fetchUrl(url) } catch (e) { if ((e as Error).name === 'AbortError') throw e; return fail(`curl: ${(e as Error).message}`) }
      return stripControl(text).split('\n')
    },
  },
  alias: {
    usage: 'alias [name=value]', desc: 'define or list aliases',
    run: ({ args, st }) => {
      if (!args.length) return Object.entries(st.aliases).map(([k, v]) => `alias ${k}='${v}'`)
      for (const a of args) {
        const m = /^([\w.-]+)=(.*)$/s.exec(a)
        if (!m) fail(`alias: ${a}: not found`)
        st.aliases[m![1]] = m![2]
      }
    },
  },
  unalias: { usage: 'unalias <name>', desc: 'remove an alias', hidden: true, run: ({ args, st }) => { for (const a of args) delete st.aliases[a] } },
  history: { usage: 'history', desc: 'command history', run: ({ env }) => env.history.map((h, i) => `${String(i + 1).padStart(5)}  ${h}`) },
  theme: {
    usage: 'theme dark|light', desc: 'switch color theme',
    complete: () => ['dark', 'light'],
    run: ({ args, env }) => { if (args[0] !== 'dark' && args[0] !== 'light') fail('usage: theme dark|light'); env.setTheme(args[0] as 'dark' | 'light') },
  },
  whoami: { usage: 'whoami', desc: 'about me (see also neofetch)', run: () => ['tilo'] },
  neofetch: {
    usage: 'neofetch', desc: 'system info, sort of', hidden: true,
    run: ({ env }) => {
      const logo = ['       _____       ', '      /     \\      ', '     | () () |     ', '      \\  ^  /      ', '       |||||       ', '       |||||       ', '                   ', '                   ']
      const info = [
        `${C.bold(C.cyan('tilo'))}@${C.bold(C.cyan('aelx'))}`, '---------',
        `${C.cyan('Role')}: Systems & DevOps Engineer`, `${C.cyan('Location')}: Germany`,
        `${C.cyan('Shell')}: bash (in a browser)`, `${C.cyan('Editor')}: VS Code, obviously`,
        `${C.cyan('Repos')}: ${env.repos.filter(r => !r.fork).length} public`, `${C.cyan('Uptime')}: ${fmtUptime(Date.now() - env.startedAt)}`,
      ]
      return logo.map((l, i) => C.cyan(l) + '  ' + (info[i] ?? ''))
    },
  },
  date: { usage: 'date', desc: 'current date', hidden: true, run: () => [new Date().toString()] },
  uname: { usage: 'uname [-a]', desc: 'system name', hidden: true, run: ({ args }) => [args.includes('-a') ? 'Linux aelx 6.12.0-tilalx #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux' : 'Linux'] },
  uptime: { usage: 'uptime', desc: 'session uptime', hidden: true, run: ({ env }) => [` ${new Date().toTimeString().slice(0, 8)} up ${fmtUptime(Date.now() - env.startedAt)},  1 user,  load average: 0.42, 0.13, 0.37`] },
  sudo: { usage: 'sudo', desc: '', hidden: true, run: () => ({ out: ['tilo is not in the sudoers file. This incident will be reported.'], code: 1 }) },
  exit: { usage: 'exit', desc: '', hidden: true, run: () => ['logout', C.dim('(nice try, the terminal stays)')] },
}

export const COMMAND_NAMES = Object.keys(COMMANDS)

// ---------- runner ----------

function expandAlias(words: string[], st: ShellState, vars: Record<string, string>): string[] {
  const alias = words.length && Object.hasOwn(st.aliases, words[0]) ? st.aliases[words[0]] : undefined
  return alias === undefined ? words : [...tokenize(alias, vars), ...words.slice(1)]
}

async function runPipeline(text: string, st: ShellState, env: ShellEnv, lines: string[]): Promise<{ code: number; clear: boolean }> {
  let stdin: string[] | null = null, code = 0, clear = false
  const stages = splitPipes(text)
  for (let i = 0; i < stages.length; i++) {
    aborted(env)
    const vars = { '?': String(st.status), PWD: HOME + (st.cwd ? `/${st.cwd}` : ''), HOME, USER: 'tilo', SHELL: '/bin/bash' }
    const [name, ...args] = expandAlias(tokenize(stages[i].trim(), vars), st, vars)
    if (!name) { lines.push('bash: syntax error near unexpected token `|\''); return { code: 2, clear } }
    const cmd = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined
    if (!cmd) { lines.push(`bash: ${name}: command not found`); stdin = []; code = 127; continue }
    if (args.includes('--help')) { stdin = [C.cyan(cmd.usage), `    ${cmd.desc}`]; code = 0; continue }
    code = 0
    try {
      const out = await cmd.run({ args, stdin, st, env, err: msg => { lines.push(msg); code = 1 } })
      if (out === 'clear') { clear = true; lines.length = 0; stdin = [] }
      else if (Array.isArray(out)) stdin = out
      else if (out) { stdin = out.out; code = out.code || code }
      else stdin = []
    } catch (e) {
      if (!(e instanceof Fail)) throw e
      lines.push(e.message.includes(':') ? e.message : `${name}: ${e.message}`)
      stdin = []; code = 1
    }
  }
  if (stdin) lines.push(...stdin)
  return { code, clear }
}

export async function run(line: string, st: ShellState, env: ShellEnv): Promise<Result> {
  const lines: string[] = []
  let clear = false
  for (const { op, text } of splitList(line)) {
    if ((op === '&&' && st.status !== 0) || (op === '||' && st.status === 0)) continue
    const r = await runPipeline(text, st, env, lines)
    st.status = r.code
    clear ||= r.clear
  }
  if (lines.length > MAX_LINES) lines.splice(MAX_LINES, Infinity, C.dim(`… ${lines.length - MAX_LINES} more lines`))
  return { lines, clear, code: st.status }
}

export function complete(line: string, st: ShellState, env: ShellEnv): { word: string; options: string[] } {
  const segment = splitPipes(splitList(line + '\0').pop()?.text.slice(0, -1) ?? '').pop() ?? ''
  const words = tokenize(segment)
  const current = /\s$/.test(segment) || !segment ? '' : words.pop() ?? ''
  if (!words.length) return { word: current, options: [...COMMAND_NAMES, ...Object.keys(st.aliases)].filter(n => n.startsWith(current)).sort() }
  const cmd = Object.hasOwn(COMMANDS, words[0]) ? COMMANDS[words[0]] : undefined
  if (cmd?.complete) return { word: current, options: cmd.complete(env, words).filter(o => o.startsWith(current)) }
  const slash = current.lastIndexOf('/')
  const dirPart = slash >= 0 ? current.slice(0, slash + 1) : ''
  const base = resolvePath(st.cwd, dirPart || '.')
  const node = base === null ? null : nodeAt(env.tree, base)
  if (!node || node.type !== 'folder') return { word: current, options: [] }
  const rest = current.slice(slash + 1)
  return {
    word: current,
    options: (node.children ?? []).filter(n => n.name.startsWith(rest)).map(n => dirPart + n.name + (n.type === 'folder' ? '/' : '')),
  }
}

/** Longest shared prefix, for bash-style partial tab completion. */
export function commonPrefix(options: string[]): string {
  if (!options.length) return ''
  let p = options[0]
  for (const o of options) while (!o.startsWith(p)) p = p.slice(0, -1)
  return p
}
