import type { ThemeId } from './theme'

export interface Settings {
  'workbench.colorTheme': ThemeId
  'editor.fontSize': number | null
  'editor.wordWrap': 'off' | 'on' | 'default'
  'editor.minimap.enabled': boolean
  'editor.lineNumbers': 'on' | 'off' | 'relative'
  'workbench.startupEditor': 'welcomePage' | 'readme' | 'none'
}

export const DEFAULT_SETTINGS: Settings = {
  'workbench.colorTheme': 'dark-modern',
  'editor.fontSize': null,
  'editor.wordWrap': 'default',
  'editor.minimap.enabled': true,
  'editor.lineNumbers': 'on',
  'workbench.startupEditor': 'welcomePage',
}

export const SETTINGS_COOKIE = 'vscode-settings'

export interface SettingSpec {
  key: keyof Settings
  category: string
  title: string
  description: string
  type: 'enum' | 'number' | 'boolean'
  options?: { value: string; label: string }[]
}

export const SETTING_SPECS: SettingSpec[] = [
  { key: 'workbench.colorTheme', category: 'Workbench › Appearance', title: 'Color Theme', type: 'enum',
    description: 'Specifies the color theme used in the workbench.',
    options: [{ value: 'dark-modern', label: 'Dark Modern' }, { value: 'light-modern', label: 'Light Modern' }] },
  { key: 'workbench.startupEditor', category: 'Workbench', title: 'Startup Editor', type: 'enum',
    description: 'Controls which editor is shown at startup, if none are restored from the previous session.',
    options: [{ value: 'welcomePage', label: 'welcomePage' }, { value: 'readme', label: 'readme' }, { value: 'none', label: 'none' }] },
  { key: 'editor.fontSize', category: 'Editor', title: 'Font Size', type: 'number',
    description: 'Controls the font size in pixels. Leave empty for the platform default.' },
  { key: 'editor.wordWrap', category: 'Editor', title: 'Word Wrap', type: 'enum',
    description: 'Controls how lines should wrap. "default" wraps Markdown only, like VS Code\'s language defaults.',
    options: [{ value: 'default', label: 'default' }, { value: 'off', label: 'off' }, { value: 'on', label: 'on' }] },
  { key: 'editor.lineNumbers', category: 'Editor', title: 'Line Numbers', type: 'enum',
    description: 'Controls the display of line numbers.',
    options: [{ value: 'on', label: 'on' }, { value: 'off', label: 'off' }, { value: 'relative', label: 'relative' }] },
  { key: 'editor.minimap.enabled', category: 'Editor › Minimap', title: 'Enabled', type: 'boolean',
    description: 'Controls whether the minimap is shown.' },
]

/** Parses the settings cookie, keeping only known keys with valid values. */
export function parseSettings(raw: string | undefined): Settings {
  const out = { ...DEFAULT_SETTINGS }
  if (!raw) return out
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>
    for (const spec of SETTING_SPECS) {
      const v = parsed[spec.key]
      if (v === undefined) continue
      if (spec.type === 'enum' && spec.options!.some(o => o.value === v)) (out as Record<string, unknown>)[spec.key] = v
      if (spec.type === 'boolean' && typeof v === 'boolean') (out as Record<string, unknown>)[spec.key] = v
      if (spec.type === 'number' && (v === null || (typeof v === 'number' && v >= 6 && v <= 40))) (out as Record<string, unknown>)[spec.key] = v
    }
  } catch {}
  return out
}
