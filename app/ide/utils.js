import { FILE_TREE } from './constants'

export function stripQuotes(text) {
  return text ? text.replace(/^["'"']+|["'"']+$/g, '').trim() : ''
}

export function parseTags(raw) {
  if (!raw) return []
  return raw.replace(/^\[|\]$/g, '').split(',').map(t => t.trim()).filter(Boolean)
}

export function timeAgo(dateStr) {
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

export function repoStatusColor(pushedAt) {
  if (!pushedAt) return '#45475a'
  const h = (Date.now() - new Date(pushedAt).getTime()) / 3600000
  if (h < 24 * 7)  return '#a6e3a1'
  if (h < 24 * 60) return '#f9e2af'
  return '#f38ba8'
}

export function getFileType(activeTab, openFile) {
  if (openFile) {
    const name = openFile.split('/').pop()
    if (name === 'Dockerfile') return 'Dockerfile'
    if (name === '.gitignore') return 'Git Config'
    const ext = name.includes('.') ? name.split('.').pop() : ''
    return { jsx: 'JavaScript JSX', js: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript JSX', css: 'CSS', json: 'JSON', md: 'Markdown' }[ext] || ext.toUpperCase()
  }
  if (activeTab === 'readme')   return 'Markdown'
  if (activeTab === 'memes')    return 'Media Feed'
  if (activeTab === 'settings') return 'JSON'
  return 'Log'
}

export function getFileColor(filepath) {
  const name = filepath.split('/').pop()
  if (name === 'Dockerfile') return '#2496ed'
  if (name === '.gitignore') return '#f1502f'
  const ext = name.includes('.') ? name.split('.').pop() : ''
  return { jsx: '#519aba', js: '#cbcb41', ts: '#3178c6', tsx: '#519aba', css: '#6196cc', json: '#cbcb41', md: '#519aba' }[ext] || '#a6adc8'
}

export function computeProblems(repos) {
  const problems = []
  repos?.forEach(repo => {
    if (!repo.description)
      problems.push({ severity: 'warning', file: `${repo.name}/README.md`, msg: 'No description set' })
    if (Date.now() - new Date(repo.pushed_at).getTime() > 365 * 24 * 3600000)
      problems.push({ severity: 'info', file: repo.name, msg: `Stale: last push ${timeAgo(repo.pushed_at)}` })
  })
  return problems
}

export function runTerminalCommand(cmd, { repos, stack, commits }) {
  const c = cmd.trim().toLowerCase()
  if (!c) return []
  if (c === 'clear') return null

  if (c === 'help') return [
    'Available commands:',
    '  help              — show this message',
    '  ls                — list project files',
    '  cat README.md     — show about summary',
    '  git log --oneline — recent commits',
    '  whoami            — show author info',
    '  clear             — clear terminal',
  ]

  if (c === 'ls' || c === 'ls -la')
    return FILE_TREE.map(f => f.type === 'folder' ? `drwxr-xr-x  ${f.name}/` : `-rw-r--r--  ${f.name}`)

  if (c === 'cat readme.md') return [
    "# Hi, I'm Tilo Alexander", '',
    'Systems and DevOps engineer based in Germany.',
    'Containers, pipelines, and the glue code that holds everything together.',
    '',
    `${stack?.length || 0} languages in stack · ${repos?.length || 0} public repos`,
  ]

  if (c === 'git log --oneline' || c === 'git log') {
    if (!commits?.length) return ['(no commits loaded — open Source Control panel first)']
    return commits.slice(0, 10).map(c => `${c.sha.slice(0, 7)}  ${c.commit.message.split('\n')[0]}`)
  }

  if (c === 'whoami') return [
    'tilalx',
    'Tilo Alexander — systems & DevOps engineer',
    'github.com/tilalx · linkedin.com/in/tilo-alexander',
  ]

  return [`bash: ${cmd}: command not found`, 'Type "help" for available commands.']
}
