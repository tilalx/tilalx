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

export const FILE_TREE = [
  { name: 'README.md',      path: 'README.md',      ext: 'md',   color: '#519aba', modified: true },
  { name: 'package.json',   path: 'package.json',   ext: 'json', color: '#cbcb41' },
  { name: 'next.config.js', path: 'next.config.js', ext: 'js',   color: '#cbcb41' },
  { name: 'Dockerfile',     path: 'Dockerfile',      ext: 'dock', color: '#2496ed' },
  { name: '.gitignore',     path: '.gitignore',      ext: 'git',  color: '#f1502f' },
  {
    name: 'app', type: 'folder', color: '#dcb67a', open: true,
    children: [
      { name: 'layout.jsx',  path: 'app/layout.jsx',  ext: 'jsx', color: '#519aba' },
      { name: 'page.jsx',    path: 'app/page.jsx',    ext: 'jsx', color: '#519aba', modified: true },
      { name: 'globals.css', path: 'app/globals.css', ext: 'css', color: '#6196cc' },
      { name: 'IDEApp.jsx',  path: 'app/IDEApp.jsx',  ext: 'jsx', color: '#519aba', modified: true },
      { name: 'Track.jsx',   path: 'app/Track.jsx',   ext: 'jsx', color: '#519aba' },
    ],
  },
  {
    name: 'public', type: 'folder', color: '#dcb67a', open: false,
    children: [
      { name: 'favicon.svg',  path: 'public/favicon.svg',  ext: 'svg', color: '#ffb13b' },
      { name: 'manifest.json',path: 'public/manifest.json',ext: 'json',color: '#cbcb41' },
      { name: 'robots.txt',   path: 'public/robots.txt',   ext: 'txt', color: '#a6adc8' },
    ],
  },
]

export const SOURCE_FILES = []

export const CONTRIB_COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
export const CONTRIB_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export const SETTINGS_DEF = [
  {
    group: 'Commonly Used',
    items: [
      { key: 'editor.fontSize',    label: 'Font Size',         desc: 'Controls the font size in pixels.',                          type: 'num',    min: 10, max: 24 },
      { key: 'editor.wordWrap',    label: 'Word Wrap',         desc: 'Controls how lines should wrap.',                            type: 'select', options: ['off', 'on', 'wordWrapColumn', 'bounded'] },
      { key: 'editor.formatOnSave',label: 'Format On Save',    desc: 'Format a file on save. A formatter must be available.',      type: 'bool' },
      { key: 'files.autoSave',     label: 'Auto Save',         desc: 'Controls auto save of editors that have unsaved changes.',   type: 'select', options: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'] },
      { key: 'memes.autoPlay',     label: 'Memes: Auto Play',  desc: 'Automatically advance the meme feed.',                      type: 'bool' },
      { key: 'network.showLog',    label: 'Network: Show Log', desc: 'Show live network request log in the preview panel.',        type: 'bool' },
    ],
  },
  {
    group: 'Editor',
    items: [
      { key: 'editor.fontSize',    label: 'Font Size',         desc: 'Controls the font size in pixels.',                          type: 'num',    min: 10, max: 24 },
      { key: 'editor.wordWrap',    label: 'Word Wrap',         desc: 'Controls how lines should wrap.',                            type: 'select', options: ['off', 'on', 'wordWrapColumn', 'bounded'] },
      { key: 'editor.tabSize',     label: 'Tab Size',          desc: 'The number of spaces a tab is equal to.',                    type: 'num',    min: 1,  max: 8 },
      { key: 'editor.formatOnSave','label': 'Format On Save',  desc: 'Format a file on save. A formatter must be available.',      type: 'bool' },
      { key: 'editor.minimap',     label: 'Minimap: Enabled',  desc: 'Controls whether the minimap is shown.',                     type: 'bool' },
    ],
  },
  {
    group: 'Files',
    items: [
      { key: 'files.autoSave',     label: 'Auto Save',         desc: 'Controls auto save of editors that have unsaved changes.',   type: 'select', options: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'] },
    ],
  },
  {
    group: 'Memes',
    items: [
      { key: 'memes.autoPlay',     label: 'Auto Play',         desc: 'Automatically advance the meme feed.',                      type: 'bool' },
      { key: 'memes.interval',     label: 'Interval',          desc: 'Seconds between memes when auto-play is on.',               type: 'num',    min: 1,  max: 60 },
    ],
  },
  {
    group: 'Network',
    items: [
      { key: 'network.showLog',    label: 'Show Request Log',  desc: 'Show live network request log in the preview panel.',        type: 'bool' },
    ],
  },
  {
    group: 'Appearance',
    items: [
      { key: 'workbench.colorTheme', label: 'Color Theme',     desc: 'Specifies the color theme used in the workbench.',           type: 'select', options: ['Catppuccin Mocha', 'One Dark Pro', 'GitHub Dark', 'Tokyo Night'] },
    ],
  },
]
