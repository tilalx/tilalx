import type { Commit, FileNode, GitStatus, Repo } from '../types'


export interface ShellEnv {
  tree: FileNode[]
  git: Record<string, GitStatus>
  branch: string
  commits: Commit[]
  repos: Repo[]
  readFile(path: string): Promise<string | null>
  openFile(path: string, line?: number): void
  setTheme(type: 'dark' | 'light'): void
  history: string[]
  startedAt: number
}

export interface ShellState { cwd: string }
export type Output = string[] | 'clear'

const ESC = '\x1b['
const c = {
  bold: (s: string) => `${ESC}1m${s}${ESC}0m`,
  dim: (s: string) => `${ESC}2m${s}${ESC}0m`,
  red: (s: string) => `${ESC}31m${s}${ESC}0m`,
  green: (s: string) => `${ESC}32m${s}${ESC}0m`,
  yellow: (s: string) => `${ESC}33m${s}${ESC}0m`,
  blue: (s: string) => `${ESC}34m${s}${ESC}0m`,
  magenta: (s: string) => `${ESC}35m${s}${ESC}0m`,
  cyan: (s: string) => `${ESC}36m${s}${ESC}0m`,
}

const HOME = '/home/tilo/tilalx'

export function prompt(state: ShellState): string {
  const dir = state.cwd ? `~/tilalx/${state.cwd}` : '~/tilalx'
  return `${ESC}1;32mtilo@aelx${ESC}0m:${ESC}1;34m${dir}${ESC}0m$ `
}

function resolvePath(cwd: string, arg = '.'): string | null {
  const parts = (arg.startsWith('/') || arg.startsWith('~') ? [] : cwd.split('/').filter(Boolean))
  const input = arg.replace(/^~\/?(tilalx\/?)?/, '').replace(new RegExp(`^${HOME}/?`), '')
  for (const seg of input.split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') { if (!parts.length) return null; parts.pop() } else parts.push(seg)
  }
  return parts.join('/')
}

function nodeAt(tree: FileNode[], path: string): FileNode | { type: 'folder'; children: FileNode[]; name: string; path: string } | null {
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

function allFiles(nodes: FileNode[]): string[] {
  return nodes.flatMap(n => n.type === 'folder' ? allFiles(n.children ?? []) : [n.path])
}

const colorName = (n: FileNode) => n.type === 'folder' ? c.blue(c.bold(n.name)) : /\.(sh)$/.test(n.name) ? c.green(n.name) : n.name

export function tokenize(line: string): string[] {
  const out: string[] = []
  let cur = '', quote: string | null = null, has = false
  for (const ch of line) {
    if (quote) { if (ch === quote) quote = null; else cur += ch; continue }
    if (ch === '"' || ch === "'") { quote = ch; has = true; continue }
    if (/\s/.test(ch)) { if (cur || has) { out.push(cur); cur = ''; has = false } continue }
    cur += ch
  }
  if (cur || has) out.push(cur)
  return out
}

export function splitPipes(line: string): string[] {
  const out: string[] = []
  let cur = '', quote: string | null = null
  for (const ch of line) {
    if (quote) { if (ch === quote) quote = null }
    else if (ch === '"' || ch === "'") quote = ch
    else if (ch === '|') { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out
}

export const stripControl = (text: string) => text.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '')

function lineCount(args: string[]): { n: number; rest: string[] } {
  const i = args.indexOf('-n')
  const short = args.findIndex(a => /^-\d+$/.test(a))
  const raw = i >= 0 ? args[i + 1] : short >= 0 ? args[short].slice(1) : '10'
  const n = Number(raw)
  const drop = new Set(i >= 0 ? [i, i + 1] : [short])
  return { n: Number.isInteger(n) && n >= 0 ? n : 10, rest: args.filter((a, j) => !drop.has(j) && !a.startsWith('-')) }
}

type Cmd = (args: string[], stdin: string[] | null, st: ShellState, env: ShellEnv) => Promise<Output> | Output

async function readArgOrStdin(args: string[], stdin: string[] | null, st: ShellState, env: ShellEnv, name: string): Promise<string[] | string> {
  if (!args.length) return stdin ?? `${name}: missing file operand`
  const lines: string[] = []
  for (const a of args) {
    const p = resolvePath(st.cwd, a)
    const node = p === null ? null : nodeAt(env.tree, p)
    if (!node) return `${name}: ${a}: No such file or directory`
    if (node.type === 'folder') return `${name}: ${a}: Is a directory`
    const text = await env.readFile(p!)
    if (text === null) return `${name}: ${a}: Permission denied`
    lines.push(...stripControl(text.replace(/\r?\n$/, '')).split('\n'))
  }
  return lines
}

function fmtUptime(ms: number): string {
  const m = Math.floor(ms / 60000)
  return m < 1 ? `${Math.floor(ms / 1000)} sec` : m < 60 ? `${m} min` : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

const HELP: [string, string][] = [
  ['ls [dir]', 'list files'], ['cd <dir>', 'change directory'], ['cat <file>', 'print a file'],
  ['code <file>', 'open a file in the editor'], ['tree', 'show the tree'], ['grep <pat> [file]', 'search text'],
  ['head / tail / wc', 'text filters (pipes work)'], ['find <name>', 'find files'],
  ['git log | status | branch', 'repository info'], ['whoami · neofetch', 'about me'],
  ['curl <url>', 'fetch a public URL'], ['theme dark|light', 'switch color theme'], ['history · clear', 'the usual'],
]

const COMMANDS: Record<string, Cmd> = {
  help: () => [c.bold('Available commands') + c.dim('  (pipe text filters with |)'), '', ...HELP.map(([k, v]) => `  ${c.cyan(k.padEnd(28))}${c.dim(v)}`)],
  clear: () => 'clear',
  pwd: (_, __, st) => [HOME + (st.cwd ? `/${st.cwd}` : '')],
  echo: args => [args.join(' ')],
  cd: (args, _, st, env) => {
    const p = resolvePath(st.cwd, args[0] ?? '~')
    const node = p === null ? null : nodeAt(env.tree, p)
    if (!node) return [`bash: cd: ${args[0]}: No such file or directory`]
    if (node.type !== 'folder') return [`bash: cd: ${args[0]}: Not a directory`]
    st.cwd = p!
    return []
  },
  ls: (args, _, st, env) => {
    const long = args.some(a => /^-\w*l/.test(a))
    const all  = args.some(a => /^-\w*a/.test(a))
    const target = args.find(a => !a.startsWith('-'))
    const p = resolvePath(st.cwd, target)
    const node = p === null ? null : nodeAt(env.tree, p)
    if (!node) return [`ls: cannot access '${target}': No such file or directory`]
    if (node.type !== 'folder') return [node.name]
    const entries = (node.children ?? []).filter(n => all || !n.name.startsWith('.'))
    if (long) return entries.map(n => `${c.dim(n.type === 'folder' ? 'drwxr-xr-x' : '-rw-r--r--')}  tilo  ${colorName(n)}`)
    return [entries.map(colorName).join('  ')]
  },
  tree: (args, _, st, env) => {
    const p = resolvePath(st.cwd, args[0])
    const node = p === null ? null : nodeAt(env.tree, p)
    if (!node || node.type !== 'folder') return [`tree: ${args[0] ?? '.'}: not a directory`]
    const out = [c.blue(c.bold(args[0] ?? '.'))]
    const walk = (nodes: FileNode[], prefix: string) => nodes.forEach((n, i) => {
      const last = i === nodes.length - 1
      out.push(`${prefix}${last ? '└── ' : '├── '}${colorName(n)}`)
      if (n.type === 'folder') walk(n.children ?? [], prefix + (last ? '    ' : '│   '))
    })
    walk(node.children ?? [], '')
    return out
  },
  cat: async (args, stdin, st, env) => { const r = await readArgOrStdin(args, stdin, st, env, 'cat'); return typeof r === 'string' ? [r] : r },
  head: async (args, stdin, st, env) => {
    const { n, rest } = lineCount(args)
    const r = await readArgOrStdin(rest, stdin, st, env, 'head')
    return typeof r === 'string' ? [r] : r.slice(0, n)
  },
  tail: async (args, stdin, st, env) => {
    const { n, rest } = lineCount(args)
    const r = await readArgOrStdin(rest, stdin, st, env, 'tail')
    return typeof r === 'string' ? [r] : n === 0 ? [] : r.slice(-n)
  },
  wc: async (args, stdin, st, env) => {
    const r = await readArgOrStdin(args.filter(a => !a.startsWith('-')), stdin, st, env, 'wc')
    if (typeof r === 'string') return [r]
    const words = r.join(' ').split(/\s+/).filter(Boolean).length
    if (args.includes('-l')) return [String(r.length)]
    return [`${String(r.length).padStart(7)} ${String(words).padStart(7)} ${String(r.join('\n').length).padStart(7)}`]
  },
  grep: async (args, stdin, st, env) => {
    const flags = args.filter(a => a.startsWith('-')).join('')
    const [pattern, ...files] = args.filter(a => !a.startsWith('-'))
    if (!pattern) return ['usage: grep [-i] [-n] PATTERN [FILE...]']
    let re: RegExp
    try { re = new RegExp(pattern, flags.includes('i') ? 'i' : '') } catch { re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }
    const hl = (l: string) => l.replace(new RegExp(re.source, re.flags + 'g'), m => `${ESC}1;31m${m}${ESC}0m`)
    if (!files.length && stdin) return stdin.filter(l => re.test(l)).map(hl)
    const targets = files.length ? files : ['.']
    const out: string[] = []
    for (const f of targets) {
      const p = resolvePath(st.cwd, f)
      const node = p === null ? null : nodeAt(env.tree, p)
      if (!node) { out.push(`grep: ${f}: No such file or directory`); continue }
      const paths = node.type === 'folder' ? allFiles((node as { children?: FileNode[] }).children ?? []) : [p!]
      for (const path of paths) {
        if (/\.(woff2?|png|ico|lock)$/.test(path)) continue
        const text = await env.readFile(path)
        text?.split('\n').forEach((l, i) => {
          if (re.test(l)) out.push(`${paths.length > 1 || node.type === 'folder' ? c.magenta(path) + c.cyan(':') : ''}${flags.includes('n') ? c.green(String(i + 1)) + c.cyan(':') : ''}${hl(l.trim().slice(0, 200))}`)
        })
      }
    }
    return out
  },
  find: (args, _, st, env) => {
    const nameIdx = args.indexOf('-name')
    const pattern = nameIdx >= 0 ? args[nameIdx + 1] : args.find(a => !a.startsWith('-') && a !== '.')
    const base = resolvePath(st.cwd, '.') ?? ''
    const files = allFiles(env.tree).filter(p => !base || p.startsWith(base + '/'))
    if (!pattern) return files.map(p => `./${base ? p.slice(base.length + 1) : p}`)
    const re = new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'i')
    return files.filter(p => re.test(p.split('/').pop()!)).map(p => `./${base ? p.slice(base.length + 1) : p}`)
  },
  code: (args, _, st, env) => {
    if (!args.length) return ['Usage: code <file>[:line]']
    const [file, line] = args[0].split(':')
    const p = resolvePath(st.cwd, file)
    const node = p === null ? null : nodeAt(env.tree, p)
    if (!node || node.type === 'folder') return [`code: ${file}: No such file`]
    env.openFile(p!, line ? Number(line) : undefined)
    return []
  },
  whoami: () => ['tilo'],
  date: () => [new Date().toString()],
  uname: args => [args.includes('-a') ? 'Linux aelx 6.12.0-tilalx #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux' : 'Linux'],
  uptime: (_, __, ___, env) => [` ${new Date().toTimeString().slice(0, 8)} up ${fmtUptime(Date.now() - env.startedAt)},  1 user,  load average: 0.42, 0.13, 0.37`],
  history: (_, __, ___, env) => env.history.map((h, i) => `${String(i + 1).padStart(5)}  ${h}`),
  theme: (args, _, __, env) => {
    if (args[0] !== 'dark' && args[0] !== 'light') return ['usage: theme dark|light']
    env.setTheme(args[0]); return []
  },
  neofetch: (_, __, ___, env) => {
    const logo = [
      '       _____       ', '      /     \\      ', '     | () () |     ', '      \\  ^  /      ',
      '       |||||       ', '       |||||       ', '                   ', '                   ',
    ]
    const info = [
      `${c.bold(c.cyan('tilo'))}@${c.bold(c.cyan('aelx'))}`,
      '---------',
      `${c.cyan('Role')}: Systems & DevOps Engineer`,
      `${c.cyan('Location')}: Germany`,
      `${c.cyan('Shell')}: bash (in a browser)`,
      `${c.cyan('Editor')}: VS Code, obviously`,
      `${c.cyan('Repos')}: ${env.repos.filter(r => !r.fork).length} public`,
      `${c.cyan('Uptime')}: ${fmtUptime(Date.now() - env.startedAt)}`,
    ]
    return logo.map((l, i) => c.cyan(l) + '  ' + (info[i] ?? ''))
  },
  git: (args, _, __, env) => {
    switch (args[0]) {
      case 'log': {
        const oneline = args.includes('--oneline')
        if (!env.commits.length) return ['fatal: could not read commits from GitHub']
        return env.commits.flatMap(cm => oneline
          ? [`${c.yellow(cm.sha.slice(0, 7))} ${cm.commit.message.split('\n')[0]}`]
          : [c.yellow(`commit ${cm.sha}`), `Author: ${cm.commit.author.name}`, `Date:   ${new Date(cm.commit.author.date).toString()}`, '', `    ${cm.commit.message.split('\n')[0]}`, ''])
      }
      case 'status': {
        const entries = Object.entries(env.git)
        const out = [`On branch ${env.branch}`, `Your branch is up to date with 'origin/${env.branch}'.`, '']
        if (!entries.length) return [...out, 'nothing to commit, working tree clean']
        const mod = entries.filter(([, s]) => s !== 'U'), untracked = entries.filter(([, s]) => s === 'U')
        if (mod.length) out.push('Changes not staged for commit:', ...mod.map(([p]) => c.red(`\tmodified:   ${p}`)), '')
        if (untracked.length) out.push('Untracked files:', ...untracked.map(([p]) => c.red(`\t${p}`)), '')
        return out
      }
      case 'branch': return [`* ${c.green(env.branch)}`]
      case 'remote': return args.includes('-v') ? ['origin\thttps://github.com/tilalx/tilalx.git (fetch)', 'origin\thttps://github.com/tilalx/tilalx.git (push)'] : ['origin']
      case undefined: return ['usage: git <command> [<args>]', '', '   log      Show commit logs', '   status   Show the working tree status', '   branch   List branches', '   remote   Show remotes']
      default: return [`git: '${args[0]}' is not a git command. See 'git --help'.`]
    }
  },
  curl: async args => {
    const url = args.find(a => /^https?:\/\//.test(a))
    if (!url) return ['curl: try \'curl https://example.com\'']
    try {
      const res  = await fetch('/api/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
      const json = await res.json()
      if (json.error) return [`curl: ${json.error}`]
      return stripControl(json.text as string).split('\n').slice(0, 200)
    } catch (e) { return [`curl: ${(e as Error).message}`] }
  },
  sudo: () => ['tilo is not in the sudoers file. This incident will be reported.'],
  exit: () => ['logout', c.dim('(nice try, the terminal stays)')],
}

export const COMMAND_NAMES = Object.keys(COMMANDS)

export async function run(line: string, st: ShellState, env: ShellEnv): Promise<Output> {
  const stages = splitPipes(line).map(s => tokenize(s.trim())).filter(s => s.length)
  let stdin: string[] | null = null
  for (const [name, ...args] of stages) {
    const cmd = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined
    if (!cmd) return [`${name}: command not found`]
    const out: Output = await cmd(args, stdin, st, env)
    if (out === 'clear') return 'clear'
    stdin = out
  }
  return stdin ?? []
}

export function complete(line: string, st: ShellState, env: ShellEnv): { word: string; options: string[] } {
  const segment = splitPipes(line).pop() ?? ''
  const words = tokenize(segment)
  const current = /\s$/.test(segment) ? '' : words.pop() ?? ''
  if (!words.length && !/\s$/.test(segment)) return { word: current, options: COMMAND_NAMES.filter(n => n.startsWith(current)) }
  const slash = current.lastIndexOf('/')
  const dirPart = slash >= 0 ? current.slice(0, slash + 1) : ''
  const base = resolvePath(st.cwd, dirPart || '.')
  const node = base === null ? null : nodeAt(env.tree, base)
  if (!node || node.type !== 'folder') return { word: current, options: [] }
  const rest = current.slice(slash + 1)
  return {
    word: current,
    options: ((node as { children?: FileNode[] }).children ?? [])
      .filter(n => n.name.startsWith(rest))
      .map(n => dirPart + n.name + (n.type === 'folder' ? '/' : '')),
  }
}
