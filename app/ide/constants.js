export const THEMES = {
  'Catppuccin Mocha': { '--ide-bg': '#1e1e2e', '--ide-bg2': '#181825', '--ide-bg3': '#11111b', '--ide-border': '#313244', '--ide-accent': '#89b4fa', '--ide-fg': '#cdd6f4', '--ide-fg2': '#a6adc8', '--ide-muted': '#6c7086' },
  'One Dark Pro':     { '--ide-bg': '#282c34', '--ide-bg2': '#21252b', '--ide-bg3': '#1a1d23', '--ide-border': '#3e4451', '--ide-accent': '#61afef', '--ide-fg': '#abb2bf', '--ide-fg2': '#9da5b4', '--ide-muted': '#5c6370' },
  'GitHub Dark':      { '--ide-bg': '#0d1117', '--ide-bg2': '#161b22', '--ide-bg3': '#010409', '--ide-border': '#30363d', '--ide-accent': '#58a6ff', '--ide-fg': '#c9d1d9', '--ide-fg2': '#8b949e', '--ide-muted': '#484f58' },
  'Tokyo Night':      { '--ide-bg': '#1a1b26', '--ide-bg2': '#16161e', '--ide-bg3': '#13131a', '--ide-border': '#292e42', '--ide-accent': '#7aa2f7', '--ide-fg': '#c0caf5', '--ide-fg2': '#a9b1d6', '--ide-muted': '#565f89' },
}

export const TABS = [
  { id: 'readme', label: 'README.md',   color: '#519aba' },
  { id: 'memes',  label: 'memes.feed',  color: '#fab387' },
  { id: 'quotes', label: 'quotes.log',  color: '#f9e2af' },
]

export const LANG_COLORS = {
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

// Per-setting metadata. `default` powers the modified-indicator + Reset action.
// `enumDescs` (optional) documents each select option, like VS Code dropdowns.
const SET = {
  fontSize:    { key: 'editor.fontSize',     label: 'Font Size',        desc: 'Controls the font size in pixels.',                        type: 'num',    min: 10, max: 24, default: 13 },
  wordWrap:    { key: 'editor.wordWrap',      label: 'Word Wrap',        desc: 'Controls how lines should wrap.',                          type: 'select', default: 'off', options: ['off', 'on', 'wordWrapColumn', 'bounded'],
                 enumDescs: ['Lines will never wrap.', 'Lines will wrap at the viewport width.', 'Lines will wrap at "Word Wrap Column".', 'Lines wrap at the minimum of viewport and column.'] },
  tabSize:     { key: 'editor.tabSize',       label: 'Tab Size',         desc: 'The number of spaces a tab is equal to. This setting is overridden based on the file contents when "Detect Indentation" is on.', type: 'num', min: 1, max: 8, default: 2 },
  formatOnSave:{ key: 'editor.formatOnSave',  label: 'Format On Save',   desc: 'Format a file on save. A formatter must be available, the file must not be saved after delay, and the editor must not be shutting down.', type: 'bool', default: false, boolLabel: 'Format a file on save.' },
  minimap:     { key: 'editor.minimap',       label: 'Minimap: Enabled', desc: 'Controls whether the minimap is shown.',                   type: 'bool',   default: false, boolLabel: 'Controls whether the minimap is shown.' },
  autoSave:    { key: 'files.autoSave',       label: 'Auto Save',        desc: 'Controls auto save of editors that have unsaved changes.', type: 'select', default: 'off', options: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'],
                 enumDescs: ['An editor with changes is never automatically saved.', 'An editor with changes is automatically saved after the configured delay.', 'An editor with changes is automatically saved when the editor loses focus.', 'An editor with changes is automatically saved when the window loses focus.'] },
  memesAuto:   { key: 'memes.autoPlay',       label: 'Memes: Auto Play', desc: 'Automatically advance the meme feed in the editor.',       type: 'bool',   default: false, boolLabel: 'Automatically advance the meme feed.' },
  memesInterval:{ key: 'memes.interval',      label: 'Memes: Interval',  desc: 'Number of seconds between memes when auto-play is enabled.', type: 'num', min: 1, max: 60, default: 10 },
  showLog:     { key: 'network.showLog',      label: 'Network: Show Log',desc: 'Show the live network request log in the preview panel.',  type: 'bool',   default: true,  boolLabel: 'Show live network request log.' },
  colorTheme:  { key: 'workbench.colorTheme', label: 'Color Theme',      desc: 'Specifies the color theme used in the workbench.',          type: 'select', default: 'Catppuccin Mocha', options: ['Catppuccin Mocha', 'One Dark Pro', 'GitHub Dark', 'Tokyo Night'] },
}

export const SETTINGS_DEF = [
  { group: 'Commonly Used', items: [SET.fontSize, SET.wordWrap, SET.formatOnSave, SET.autoSave, SET.colorTheme, SET.memesAuto, SET.showLog] },
  { group: 'Text Editor',   items: [SET.fontSize, SET.wordWrap, SET.tabSize, SET.formatOnSave, SET.minimap] },
  { group: 'Files',         items: [SET.autoSave] },
  { group: 'Workbench',     items: [SET.colorTheme] },
  { group: 'Memes',         items: [SET.memesAuto, SET.memesInterval] },
  { group: 'Network',       items: [SET.showLog] },
]

// Flat key → default map, for resets and modified-detection.
export const SETTINGS_DEFAULTS = Object.fromEntries(Object.values(SET).map(s => [s.key, s.default]))
