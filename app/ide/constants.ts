import type { TabKind, ThemeVars } from './types'

// Every theme must set every token, or switching themes leaves stale vars on <html>.
function theme(base: ThemeVars, extra: ThemeVars = {}): ThemeVars {
  return {
    '--ide-selection':     `color-mix(in srgb, ${base['--ide-accent']} 28%, transparent)`,
    '--ide-hover':         'rgba(255,255,255,0.05)',
    '--ide-focus':         base['--ide-accent'],
    '--ide-status-bg':     base['--ide-bg3'],
    '--ide-status-fg':     base['--ide-fg2'],
    '--ide-status-border': base['--ide-border'],
    '--ide-remote-bg':     base['--ide-accent'],
    ...base,
    ...extra,
  }
}

export const DEFAULT_THEME = 'Dark Modern'

export const THEMES: Record<string, ThemeVars> = {
  'Dark Modern':      theme({ '--ide-bg': '#1f1f1f', '--ide-bg2': '#181818', '--ide-bg3': '#181818', '--ide-border': '#2b2b2b', '--ide-accent': '#4daafc', '--ide-fg': '#cccccc', '--ide-fg2': '#9d9d9d', '--ide-muted': '#868686',
                            '--ide-text': '#cccccc', '--ide-green': '#89d185', '--ide-red': '#f14c4c', '--ide-yellow': '#cca700', '--ide-orange': '#d18616', '--ide-purple': '#c586c0', '--ide-pink': '#d670d6', '--ide-cyan': '#29b8db', '--ide-surface': '#474747', '--ide-surface2': '#616161' },
                            { '--ide-selection': '#04395e', '--ide-hover': '#2a2d2e', '--ide-focus': '#0078d4', '--ide-remote-bg': '#0078d4', '--ide-status-fg': '#cccccc' }),
  'Catppuccin Mocha': theme({ '--ide-bg': '#1e1e2e', '--ide-bg2': '#181825', '--ide-bg3': '#11111b', '--ide-border': '#313244', '--ide-accent': '#89b4fa', '--ide-fg': '#cdd6f4', '--ide-fg2': '#a6adc8', '--ide-muted': '#6c7086',
                            '--ide-text': '#bac2de', '--ide-green': '#a6e3a1', '--ide-red': '#f38ba8', '--ide-yellow': '#f9e2af', '--ide-orange': '#fab387', '--ide-purple': '#cba6f7', '--ide-pink': '#f5c2e7', '--ide-cyan': '#89dceb', '--ide-surface': '#45475a', '--ide-surface2': '#585b70' }),
  'One Dark Pro':     theme({ '--ide-bg': '#282c34', '--ide-bg2': '#21252b', '--ide-bg3': '#1a1d23', '--ide-border': '#3e4451', '--ide-accent': '#61afef', '--ide-fg': '#abb2bf', '--ide-fg2': '#9da5b4', '--ide-muted': '#5c6370',
                            '--ide-text': '#abb2bf', '--ide-green': '#98c379', '--ide-red': '#e06c75', '--ide-yellow': '#e5c07b', '--ide-orange': '#d19a66', '--ide-purple': '#c678dd', '--ide-pink': '#d55fde', '--ide-cyan': '#56b6c2', '--ide-surface': '#3e4451', '--ide-surface2': '#4b5263' }),
  'GitHub Dark':      theme({ '--ide-bg': '#0d1117', '--ide-bg2': '#161b22', '--ide-bg3': '#010409', '--ide-border': '#30363d', '--ide-accent': '#58a6ff', '--ide-fg': '#c9d1d9', '--ide-fg2': '#8b949e', '--ide-muted': '#484f58',
                            '--ide-text': '#c9d1d9', '--ide-green': '#3fb950', '--ide-red': '#f85149', '--ide-yellow': '#d29922', '--ide-orange': '#ffa657', '--ide-purple': '#d2a8ff', '--ide-pink': '#f778ba', '--ide-cyan': '#39c5cf', '--ide-surface': '#484f58', '--ide-surface2': '#6e7681' }),
  'Tokyo Night':      theme({ '--ide-bg': '#1a1b26', '--ide-bg2': '#16161e', '--ide-bg3': '#13131a', '--ide-border': '#292e42', '--ide-accent': '#7aa2f7', '--ide-fg': '#c0caf5', '--ide-fg2': '#a9b1d6', '--ide-muted': '#565f89',
                            '--ide-text': '#a9b1d6', '--ide-green': '#9ece6a', '--ide-red': '#f7768e', '--ide-yellow': '#e0af68', '--ide-orange': '#ff9e64', '--ide-purple': '#bb9af7', '--ide-pink': '#ff007c', '--ide-cyan': '#7dcfff', '--ide-surface': '#3b4261', '--ide-surface2': '#545c7e' }),
}

interface TabMeta { id: TabKind; label: string; color: string }

export const TABS: TabMeta[] = [
  { id: 'readme', label: 'README.md',   color: '#519aba' },
  { id: 'memes',  label: 'memes.feed',  color: 'var(--ide-orange)' },
  { id: 'quotes', label: 'quotes.log',  color: 'var(--ide-yellow)' },
]

export const LANG_COLORS: Record<string, string> = {
  TypeScript:  '#3178c6',
  JavaScript:  '#f1e05a',
  Java:        '#b07219',
  Vue:         '#41b883',
  Python:      '#3572a5',
  'C++':       '#f34b7d',
  C:           '#555555',
  'C#':        '#178600',
  CSS:         '#563d7c',
  HTML:        '#e34c26',
  Go:          '#00add8',
  Rust:        '#dea584',
  Shell:       '#89e051',
  Kotlin:      '#a97bff',
  Swift:       '#f05138',
  Ruby:        '#701516',
  PHP:         '#4f5d95',
  Dart:        '#00b4ab',
  Nix:         '#7e7eff',
}

export const CONTRIB_COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
export const CONTRIB_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export type SettingValue = string | number | boolean

interface SettingBase { key: string; label: string; desc: string }
interface BoolSetting   extends SettingBase { type: 'bool';   default: boolean; boolLabel: string }
export interface NumSetting    extends SettingBase { type: 'num';    default: number;  min: number; max: number }
interface SelectSetting extends SettingBase { type: 'select'; default: string;  options: string[]; enumDescs?: string[] }
export type SettingDef = BoolSetting | NumSetting | SelectSetting
interface SettingGroup { group: string; items: SettingDef[] }

const SET = {
  fontSize:    { key: 'editor.fontSize',     label: 'Font Size',        desc: 'Controls the font size in pixels.',                        type: 'num',    min: 10, max: 24, default: 13 },
  wordWrap:    { key: 'editor.wordWrap',      label: 'Word Wrap',        desc: 'Controls how lines should wrap.',                          type: 'select', default: 'off', options: ['off', 'on', 'wordWrapColumn', 'bounded'],
                 enumDescs: ['Lines will never wrap.', 'Lines will wrap at the viewport width.', 'Lines will wrap at "Word Wrap Column".', 'Lines wrap at the minimum of viewport and column.'] },
  tabSize:     { key: 'editor.tabSize',       label: 'Tab Size',         desc: 'The number of spaces a tab is equal to. This setting is overridden based on the file contents when "Detect Indentation" is on.', type: 'num', min: 1, max: 8, default: 2 },
  formatOnSave:{ key: 'editor.formatOnSave',  label: 'Format On Save',   desc: 'Format a file on save. A formatter must be available, the file must not be saved after delay, and the editor must not be shutting down.', type: 'bool', default: false, boolLabel: 'Format a file on save.' },
  minimap:     { key: 'editor.minimap',       label: 'Minimap: Enabled', desc: 'Controls whether the minimap is shown.',                   type: 'bool',   default: false, boolLabel: 'Controls whether the minimap is shown.' },
  stickyScroll:{ key: 'editor.stickyScroll',  label: 'Sticky Scroll: Enabled', desc: 'Shows the nested current scopes during the scroll at the top of the editor.', type: 'bool', default: false, boolLabel: 'Show nested scopes while scrolling.' },
  indentGuides:{ key: 'editor.guides.indentation', label: 'Guides: Indentation', desc: 'Controls whether the editor should render indent guides.', type: 'bool', default: false, boolLabel: 'Render indentation guides.' },
  autoSave:    { key: 'files.autoSave',       label: 'Auto Save',        desc: 'Controls auto save of editors that have unsaved changes.', type: 'select', default: 'off', options: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'],
                 enumDescs: ['An editor with changes is never automatically saved.', 'An editor with changes is automatically saved after the configured delay.', 'An editor with changes is automatically saved when the editor loses focus.', 'An editor with changes is automatically saved when the window loses focus.'] },
  memesAuto:   { key: 'memes.autoPlay',       label: 'Memes: Auto Play', desc: 'Automatically advance the meme feed in the editor.',       type: 'bool',   default: false, boolLabel: 'Automatically advance the meme feed.' },
  memesInterval:{ key: 'memes.interval',      label: 'Memes: Interval',  desc: 'Number of seconds between memes when auto-play is enabled.', type: 'num', min: 1, max: 60, default: 10 },
  showLog:     { key: 'network.showLog',      label: 'Network: Show Log',desc: 'Show the live network request log in the preview panel.',  type: 'bool',   default: true,  boolLabel: 'Show live network request log.' },
  colorTheme:  { key: 'workbench.colorTheme', label: 'Color Theme',      desc: 'Specifies the color theme used in the workbench.',          type: 'select', default: DEFAULT_THEME, options: Object.keys(THEMES) },
} satisfies Record<string, SettingDef>

export const SETTINGS_DEF: SettingGroup[] = [
  { group: 'Commonly Used', items: [SET.fontSize, SET.wordWrap, SET.formatOnSave, SET.autoSave, SET.colorTheme, SET.memesAuto, SET.showLog] },
  { group: 'Text Editor',   items: [SET.fontSize, SET.wordWrap, SET.tabSize, SET.formatOnSave, SET.minimap, SET.stickyScroll, SET.indentGuides] },
  { group: 'Files',         items: [SET.autoSave] },
  { group: 'Workbench',     items: [SET.colorTheme] },
  { group: 'Memes',         items: [SET.memesAuto, SET.memesInterval] },
  { group: 'Network',       items: [SET.showLog] },
]

export const SETTINGS_DEFAULTS: Record<string, SettingValue> = Object.fromEntries(Object.values(SET).map(s => [s.key, s.default]))
