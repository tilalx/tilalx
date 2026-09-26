// Self-check for the virtual shell. Run:
//   node --experimental-strip-types --no-warnings --import ./app/ide/ts-resolve.mjs app/ide/shell.check.ts
import assert from 'node:assert/strict'
import { runShell, completions, parse, stripAnsi, type ShellCtx } from './shell'

const files = {
  'ReadMe.md': '# Hi\nline two',
  'package.json': '{\n  "name": "tilalx",\n  "next": "16"\n}',
  'app/page.tsx': 'export default function Page() {}\n// Next page',
  'app/ide/shell.ts': 'export const x = 1',
}
const ctx: ShellCtx = { files, cwd: '' }
const run = (line: string, c = ctx) => {
  const r = runShell(line, c)
  return { ...r, text: r.out?.map(stripAnsi) ?? null }
}

assert.deepEqual(parse(`grep "a b" x | head -n 2`), [['grep', 'a b', 'x'], ['head', '-n', '2']])
assert.deepEqual(run('ls app').text, ['ide/  page.tsx'])
assert.deepEqual(run('ls app | grep ide').text, ['ide/  page.tsx'])
assert.deepEqual(run('cat package.json | head -n 2').text, ['{', '  "name": "tilalx",'])
assert.deepEqual(run('cat readme.md').text, ['# Hi', 'line two'])
assert.deepEqual(run('grep -i next package.json').text, ['package.json:3: "next": "16"'])
assert.deepEqual(run('grep -i next').text, ['app/page.tsx:2: // Next page', 'package.json:3: "next": "16"'])
assert.equal(run('cd app').cwd, 'app')
assert.deepEqual(run('pwd', { ...ctx, cwd: 'app/ide' }).text, ['/home/tilo/Github/tilalx/app/ide'])
assert.equal(run('cd ../..', { ...ctx, cwd: 'app/ide' }).cwd, '')
assert.match(run('cd nope').text![0], /No such directory/)
assert.deepEqual(run('wc -l ReadMe.md').text, ['2'])
assert.deepEqual(run('find -name *.ts').text, ['app/ide/shell.ts'])
assert.deepEqual(run('code app/page.tsx:2').effect, { kind: 'open', path: 'app/page.tsx', line: 2 })
assert.deepEqual(run('cat ReadMe.md | ask what is this').effect, { kind: 'ask', prompt: 'what is this', context: '# Hi\nline two' })
assert.deepEqual(run('curl example.com | head -n 1').effect, { kind: 'curl', url: 'https://example.com', rest: [['head', '-n', '1']] })
assert.equal(run('clear').out, null)
assert.deepEqual(completions('cat app/i', ctx), ['app/ide/'])
assert.deepEqual(completions('ls | gr', ctx), ['grep'])

const big = { 'big.txt': Array.from({ length: 5000 }, (_, i) => `l${i}`).join('\n') }
const capped = run('cat big.txt', { files: big, cwd: '' }).text!
assert.equal(capped.length, 2001)
assert.match(capped.at(-1)!, /3000 more lines/)

console.log('shell ok')
