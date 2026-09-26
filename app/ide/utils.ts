import type { Commit, FileNode, Problem, Repo, StackItem } from './types'

export function pickMemeUrl(preview: string[] | null | undefined, fallback: string | null | undefined, targetWidth = 500): string {
  if (preview?.length) {
    const sized = preview
      .map(p => { const m = p.match(/[?&]width=(\d+)/); return { url: p, w: m ? +m[1] : 0 } })
      .filter(p => p.w > 0)
      .sort((a, b) => a.w - b.w)
    if (sized.length) return (sized.find(p => p.w >= targetWidth) ?? sized.at(-1))!.url
  }
  return fallback || ''
}

export function stripQuotes(text: string | null | undefined): string {
  return text ? text.replace(/^["'\u201C\u201D\u2018\u2019]+|["'\u201C\u201D\u2018\u2019]+$/g, '').trim() : ''
}

export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw.replace(/^\[|\]$/g, '').split(',').map(t => t.trim()).filter(Boolean)
}

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const h = (Date.now() - new Date(dateStr).getTime()) / 3600000
  if (h < 1)   return 'just now'
  if (h < 24)  return `${Math.floor(h)}h ago`
  const d = Math.floor(h / 24)
  if (d < 30)  return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

export function repoStatusColor(pushedAt: string | null | undefined): string {
  if (!pushedAt) return 'var(--ide-surface)'
  const h = (Date.now() - new Date(pushedAt).getTime()) / 3600000
  if (h < 24 * 7)  return 'var(--ide-green)'
  if (h < 24 * 60) return 'var(--ide-yellow)'
  return 'var(--ide-red)'
}

export function getFileType(activeTab: string | null | undefined, openFile: string | null | undefined): string {
  if (openFile) {
    const name = openFile.split('/').pop() ?? ''
    if (name === 'Dockerfile') return 'Dockerfile'
    if (name === '.gitignore') return 'Git Config'
    const ext = name.includes('.') ? name.split('.').pop() ?? '' : ''
    return ({ jsx: 'JavaScript JSX', js: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript JSX', css: 'CSS', json: 'JSON', md: 'Markdown' } as Record<string, string>)[ext] || ext.toUpperCase()
  }
  if (activeTab === 'readme')   return 'Markdown'
  if (activeTab === 'memes')    return 'Media Feed'
  if (activeTab === 'settings') return 'JSON'
  return 'Log'
}

export function getFileColor(filepath: string): string {
  const name = filepath.split('/').pop() ?? ''
  if (name === 'Dockerfile') return '#2496ed'
  if (name === '.gitignore') return '#f1502f'
  const ext = name.includes('.') ? name.split('.').pop() ?? '' : ''
  return ({ jsx: '#519aba', js: '#cbcb41', ts: '#3178c6', tsx: '#519aba', css: '#6196cc', json: '#cbcb41', md: '#519aba' } as Record<string, string>)[ext] || 'var(--ide-fg2)'
}

export function computeProblems(repos: Repo[] | null | undefined): Problem[] {
  const problems: Problem[] = []
  repos?.forEach(repo => {
    if (!repo.description)
      problems.push({ severity: 'warning', file: `${repo.name}/README.md`, msg: 'No description set' })
    if (Date.now() - new Date(repo.pushed_at).getTime() > 365 * 24 * 3600000)
      problems.push({ severity: 'info', file: repo.name, msg: `Stale: last push ${timeAgo(repo.pushed_at)}` })
  })
  return problems
}

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', ul: '\x1b[4m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
  magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m',
  bblue: '\x1b[94m', bgreen: '\x1b[92m', byellow: '\x1b[93m', bcyan: '\x1b[96m',
}
const a = (code: string, text: string) => `${code}${text}${C.reset}`

export interface TerminalContext {
  repos?:    Repo[] | null
  stack?:    StackItem[] | null
  commits?:  Commit[] | null
  fileTree?: FileNode[]
}

export function runTerminalCommand(cmd: string, { repos, stack, commits }: TerminalContext): string[] {
  const lc = cmd.trim().toLowerCase()
  if (!lc) return []

  if (lc === 'git log --oneline' || lc === 'git log') {
    if (!commits?.length) return [a(C.dim, '(no commits loaded — open Source Control panel first)')]
    return commits.slice(0, 10).map(c =>
      `${a(C.yellow, c.sha.slice(0, 7))}  ${a(C.white, c.commit.message.split('\n')[0])}`
    )
  }

  if (lc === 'whoami') return [
    a(C.bgreen, 'tilalx'),
    `${a(C.bold + C.white, 'Tilo Alexander')} ${a(C.dim, '— systems & DevOps engineer')}`,
    `${a(C.blue + C.ul, 'github.com/tilalx')}  ·  ${a(C.blue + C.ul, 'linkedin.com/in/tilo-alexander')}`,
  ]

  if (lc === 'date') return [a(C.byellow, new Date().toString())]

  if (lc === 'uname' || lc === 'uname -a') return [
    a(C.white, lc === 'uname -a'
      ? 'Linux tilalx 7.0.9-204.fc44.x86_64 #1 SMP PREEMPT x86_64 GNU/Linux'
      : 'Linux')
  ]

  if (lc === 'uptime') {
    const t = new Date().toTimeString().slice(0, 8)
    return [`${a(C.white, t)} up ${a(C.byellow, '42 days, 7:13')},  ${a(C.bgreen, '1 user')},  load average: ${a(C.cyan, '0.12, 0.08, 0.05')}`]
  }

  if (lc === 'ps aux') return [
    `${a(C.bold + C.white, 'USER      ')} ${a(C.bold + C.white, 'PID')}  ${a(C.bold + C.white, '%CPU')} ${a(C.bold + C.white, '%MEM')}  ${a(C.bold + C.white, 'COMMAND')}`,
    `${a(C.bgreen, 'tilo')}         ${a(C.dim, '1')}   0.0   0.1  ${a(C.white, '/sbin/init')}`,
    `${a(C.bgreen, 'tilo')}       ${a(C.dim, '812')}   0.2   1.4  ${a(C.cyan, 'node server.js')}`,
    `${a(C.bgreen, 'tilo')}      ${a(C.dim, '1337')}   1.1   2.8  ${a(C.byellow, 'next dev')}`,
    `${a(C.bgreen, 'tilo')}      ${a(C.dim, '2048')}   0.0   0.3  ${a(C.bgreen, 'fish')}`,
    `${a(C.bgreen, 'tilo')}      ${a(C.dim, '4096')}   0.1   0.6  ${a(C.blue, 'docker daemon')}`,
  ]

  if (lc === 'env') return [
    `${a(C.cyan, 'HOME')}=${a(C.white, '/home/tilo')}`,
    `${a(C.cyan, 'SHELL')}=${a(C.bgreen, '/usr/bin/fish')}`,
    `${a(C.cyan, 'NODE_ENV')}=${a(C.byellow, 'development')}`,
    `${a(C.cyan, 'NEXT_PUBLIC_URL')}=${a(C.blue + C.ul, 'https://aelx.de')}`,
    `${a(C.cyan, 'LANG')}=${a(C.white, 'en_US.UTF-8')}`,
    `${a(C.cyan, 'TERM')}=${a(C.white, 'xterm-256color')}`,
    `${a(C.cyan, 'USER')}=${a(C.bgreen, 'tilo')}`,
  ]

  if (lc === 'neofetch') {
    const art = [
      '          #####      ',
      '         #######     ',
      '         ##O#O##     ',
      '         #######     ',
      '       ###########   ',
      '      #############  ',
      '     ############### ',
      '    #################',
      '   ##################',
    ]
    const info = [
      `${a(C.bgreen, 'tilo')}${a(C.white, '@')}${a(C.bgreen, 'aelx.de')}`,
      a(C.dim, '─────────────────'),
      `${a(C.cyan, 'OS')}: Arch Linux x86_64`,
      `${a(C.cyan, 'Shell')}: fish 3.7.0`,
      `${a(C.cyan, 'Terminal')}: xterm.js ${a(C.byellow, '6.0')}`,
      `${a(C.cyan, 'Node')}: ${a(C.bgreen, '22.x')}`,
      `${a(C.cyan, 'Repos')}: ${a(C.byellow, String(repos?.length || 0))} public`,
      `${a(C.cyan, 'Stack')}: ${a(C.byellow, String(stack?.length || 0))} languages`,
      `${a(C.cyan, 'Uptime')}: 42 days`,
    ]
    return art.map((line, i) => `${C.blue}${line}${C.reset}  ${info[i] || ''}`)
  }

  return [
    `${a(C.red, 'bash:')} ${a(C.bold, cmd)}: command not found`,
    `Type ${a(C.cyan, 'help')} for available commands.`,
  ]
}
