// Self-check for the terminal shell. Run: npm test
import assert from 'node:assert/strict'
import type { FileNode } from '../types'
import { commonPrefix, complete, newState, parseArgs, run, splitList, stripAnsi, tokenize, type ShellEnv } from './shell.ts'
import { edit, searchHistory } from './lineEditor.ts'

const files: Record<string, string> = {
  'ReadMe.md': '# Hi\nline two\n',
  'package.json': '{\n  "name": "tilalx",\n  "next": "16"\n}',
  'app/page.tsx': 'export default function Page() {}\n// Next page',
  'app/workbench/terminal/shell.ts': 'export const x = 1',
}

function treeOf(paths: string[]): FileNode[] {
  const root: FileNode[] = []
  for (const p of paths) {
    let nodes = root
    p.split('/').forEach((name, i, parts) => {
      const path = parts.slice(0, i + 1).join('/'), leaf = i === parts.length - 1
      let n = nodes.find(x => x.name === name)
      if (!n) { n = { name, path, type: leaf ? 'file' : 'folder', ...(leaf ? {} : { children: [] }) }; nodes.push(n) }
      nodes = n.children ?? []
    })
  }
  return root
}

const ran: string[] = []
const env: ShellEnv = {
  tree: treeOf(Object.keys(files)), git: {}, branch: 'main', repos: [],
  commits: [{ sha: 'abcdef1234567', html_url: 'https://x', commit: { message: 'First\n\nbody', author: { name: 'tilo', date: '2026-01-01T00:00:00Z' } } }],
  readFile: async p => files[p] ?? null,
  search: async (source, o) => {
    const re = new RegExp(o.wholeWord ? `\\b(?:${source})\\b` : source, o.caseSensitive ? '' : 'i')
    return Object.entries(files).flatMap(([path, t]) => t.split('\n').flatMap((text, i) => re.test(text) ? [{ path, line: i + 1, text }] : []))
  },
  fetchUrl: async () => { throw new Error('blocked host') },
  openFile: p => ran.push(`open ${p}`), openUrl: u => ran.push(`url ${u}`), setTheme: () => {},
  commands: [{ id: 'workbench.view.explorer', title: 'Show Explorer' }], runCommand: id => ran.push(`cmd ${id}`),
  history: [], startedAt: 0,
}

const st = newState()
const sh = async (line: string) => (await run(line, st, env)).lines.map(stripAnsi)

// parsing
assert.deepEqual(tokenize(`grep "a b" 'c d' e\\ f`), ['grep', 'a b', 'c d', 'e f'])
assert.deepEqual(tokenize(`echo "\\d" '$?' "$?"`, { '?': '0' }), ['echo', '\\d', '$?', '0'])
assert.deepEqual(splitList(`a && b || c; d "x;y"`).map(s => [s.op, s.text.trim()]), [['', 'a'], ['&&', 'b'], ['||', 'c'], [';', 'd "x;y"']])
assert.deepEqual(parseArgs(['-in', '5', '-e', '-x', 'f'], 'e').values, { e: '-x' })
assert.deepEqual([...parseArgs(['-in', 'f']).flags], ['i', 'n'])
assert.equal(parseArgs(['-5', 'f'], 'n').values.n, '5')

// files and pipes
assert.deepEqual(await sh('ls app'), ['page.tsx  workbench'])
assert.deepEqual(await sh('cat package.json | head -n 2'), ['{', '  "name": "tilalx",'])
assert.deepEqual(await sh('head -1 ReadMe.md'), ['# Hi'])
assert.deepEqual(await sh('wc -l ReadMe.md'), ['2'])
assert.deepEqual(await sh('cat ReadMe.md | grep "Hi|two"'), ['# Hi', 'line two'])
assert.deepEqual(await sh('find -name *.ts'), ['./app/workbench/terminal/shell.ts'])
assert.deepEqual(await sh('find shell'), ['./app/workbench/terminal/shell.ts'])
assert.deepEqual(await sh('printf'), ['bash: printf: command not found'])

// grep: recursive via search, local for files, flags
assert.deepEqual(await sh('grep -i next'), ['package.json:"next": "16"', 'app/page.tsx:// Next page'])
assert.deepEqual(await sh('grep -n next package.json'), ['3:  "next": "16"'])
assert.deepEqual(await sh('grep -il next app'), ['app/page.tsx'])
assert.deepEqual(await sh('grep -c Hi ReadMe.md'), ['1'])
assert.deepEqual(await sh('cat ReadMe.md | grep -v Hi'), ['line two'])

// filters
assert.deepEqual(await sh('echo b a b | tr " " _ | cut -d _ -f 2-'), ['a_b'])
assert.deepEqual(await sh('cat package.json | sort | head -1'), ['  "name": "tilalx",'])
assert.deepEqual(await sh('echo a; echo a | uniq -c'), ['a', '      1 a'])
assert.deepEqual(await sh('echo abc | rev'), ['cba'])
assert.deepEqual(await sh('echo abc | tr a-c A-C'), ['ABC'])

// lists, status, variables, aliases
assert.deepEqual(await sh('false && echo no || echo yes'), ['yes'])
assert.deepEqual(await sh('cat nope; echo $?'), ['cat: nope: No such file or directory', '1'])
assert.deepEqual(await sh('grep zzz ReadMe.md || echo none'), ['none'])
assert.deepEqual(await sh('alias hi="echo hello" && hi there'), ['hello there'])

// cd and paths
await sh('cd app/workbench')
assert.equal(st.cwd, 'app/workbench')
assert.deepEqual(await sh('pwd'), ['/home/tilo/tilalx/app/workbench'])
assert.deepEqual(await sh('cd ../.. && pwd'), ['/home/tilo/tilalx'])
assert.deepEqual(await sh('cd ~/app && echo $PWD'), ['/home/tilo/tilalx/app'])
await sh('cd')
assert.equal(st.cwd, '')
assert.match((await sh('cd nope'))[0], /No such file or directory/)

// git, workbench, help
assert.deepEqual(await sh('git log --oneline -n 1'), ['abcdef1 First'])
assert.ok((await sh('git show abc')).includes('    body'))
await sh('code ReadMe.md; wb workbench.view.explorer; open https://example.com')
assert.deepEqual(ran, ['open ReadMe.md', 'cmd workbench.view.explorer', 'url https://example.com'])
assert.deepEqual(await sh('curl https://x.test'), ['curl: blocked host'])
assert.deepEqual(await sh('head --help'), ['head [-n N] [file]', '    first lines'])

// output cap and clear
assert.equal((await run('echo x; cat package.json', st, env)).clear, false)
assert.equal((await run('echo x; clear; echo y', st, env)).lines.length, 1)

// completion
assert.deepEqual(complete('gi', st, env).options, ['git'])
assert.deepEqual(complete('git s', st, env).options, ['show', 'status'])
assert.deepEqual(complete('ls ap', st, env).options, ['app/'])
assert.deepEqual(complete('echo x | ca', st, env).options, ['cat'])
assert.deepEqual(complete('ls && ca', st, env).options, ['cat'])
assert.equal(commonPrefix(['status', 'show']), 's')

// line editor
assert.deepEqual(edit({ line: 'git log', cursor: 7 }, '\x17'), { line: 'git ', cursor: 4 })
assert.deepEqual(edit({ line: 'git log', cursor: 7 }, '\x1bb'), { line: 'git log', cursor: 4 })
assert.deepEqual(edit({ line: 'ab', cursor: 1 }, '\x0b'), { line: 'a', cursor: 1 })
assert.deepEqual(edit({ line: '', cursor: 0 }, 'a\nb'), { line: 'a b', cursor: 3 })
assert.equal(edit({ line: '', cursor: 0 }, '\x1b[A'), null)
assert.equal(searchHistory(['ls', 'git log', 'cat x', 'git status'], 'git'), 3)
assert.equal(searchHistory(['ls', 'git log', 'cat x', 'git status'], 'git', 3), 1)

console.log('shell ok')
