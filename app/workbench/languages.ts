import seti from './vendor/seti.json'

export interface Language {
  id: string
  label: string
  grammar?: string
}

const LANGUAGES: Record<string, Language> = {
  typescript:      { id: 'typescript',      label: 'TypeScript',         grammar: 'typescript' },
  typescriptreact: { id: 'typescriptreact', label: 'TypeScript JSX',     grammar: 'tsx' },
  javascript:      { id: 'javascript',      label: 'JavaScript',         grammar: 'javascript' },
  javascriptreact: { id: 'javascriptreact', label: 'JavaScript JSX',     grammar: 'jsx' },
  json:            { id: 'json',            label: 'JSON',               grammar: 'json' },
  jsonc:           { id: 'jsonc',           label: 'JSON with Comments', grammar: 'jsonc' },
  markdown:        { id: 'markdown',        label: 'Markdown',           grammar: 'markdown' },
  css:             { id: 'css',             label: 'CSS',                grammar: 'css' },
  dockerfile:      { id: 'dockerfile',      label: 'Dockerfile',         grammar: 'dockerfile' },
  yaml:            { id: 'yaml',            label: 'YAML',               grammar: 'yaml' },
  groovy:          { id: 'groovy',          label: 'Groovy',             grammar: 'groovy' },
  xml:             { id: 'xml',             label: 'XML',                grammar: 'xml' },
  shellscript:     { id: 'shellscript',     label: 'Shell Script',       grammar: 'shellscript' },
  ignore:          { id: 'ignore',          label: 'Ignore' },
  plaintext:       { id: 'plaintext',       label: 'Plain Text' },
}

const BY_NAME: Record<string, string> = {
  'dockerfile': 'dockerfile', 'jenkinsfile': 'groovy',
  '.gitignore': 'ignore', '.dockerignore': 'ignore',
  'tsconfig.json': 'jsonc', 'jsconfig.json': 'jsonc', '.yarnrc.yml': 'yaml',
}

const BY_EXT: Record<string, string> = {
  ts: 'typescript', mts: 'typescript', cts: 'typescript', tsx: 'typescriptreact',
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascriptreact',
  json: 'json', jsonc: 'jsonc', md: 'markdown', css: 'css',
  yml: 'yaml', yaml: 'yaml', svg: 'xml', xml: 'xml', sh: 'shellscript', txt: 'plaintext',
}

export const GRAMMARS = [...new Set(Object.values(LANGUAGES).flatMap(l => l.grammar ? [l.grammar] : []))]

export function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

export function languageOf(path: string): Language {
  const name = basename(path).toLowerCase()
  const ext  = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : ''
  return LANGUAGES[BY_NAME[name] ?? BY_EXT[ext] ?? 'plaintext']
}

interface IconDef { fontCharacter: string; fontColor?: string }
interface SetiAssociations {
  file?: string
  fileNames?: Record<string, string>
  fileExtensions?: Record<string, string>
  languageIds?: Record<string, string>
}
const SETI = seti as unknown as SetiAssociations & { iconDefinitions: Record<string, IconDef>; light: SetiAssociations }

export interface FileIconGlyph { char: string; color?: string }

export function setiIcon(path: string, light = false): FileIconGlyph {
  const name    = basename(path).toLowerCase()
  const sets    = light ? [SETI.light, SETI] : [SETI]
  const lookup  = (key: keyof SetiAssociations, k: string) => {
    for (const s of sets) { const v = (s[key] as Record<string, string> | undefined)?.[k]; if (v) return v }
  }
  let id = lookup('fileNames', name)
  for (let i = name.indexOf('.'); !id && i >= 0; i = name.indexOf('.', i + 1)) {
    id = lookup('fileExtensions', name.slice(i + 1))
  }
  id ??= lookup('languageIds', languageOf(path).id) ?? (light ? SETI.light.file : undefined) ?? SETI.file!
  const def = SETI.iconDefinitions[id] ?? SETI.iconDefinitions[SETI.file!]
  return { char: String.fromCharCode(parseInt(def.fontCharacter.slice(1), 16)), color: def.fontColor }
}
