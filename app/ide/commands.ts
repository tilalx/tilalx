import { THEMES } from './constants'
import type { PaletteMode, PaletteCommand } from './CommandPalette'
import type { TitleMenu } from './TitleBar'
import type { TabKind } from './types'

export interface WorkbenchActions {
  openPalette:          (mode: PaletteMode) => void
  showView:             (id: string) => void
  navigate:             (dir: -1 | 1) => void
  openKind:             (kind: TabKind) => void
  openSettings:         () => void
  closeSettings:        () => void
  splitEditor:          () => void
  closeActiveEditor:    () => void
  closeActiveGroup:     () => void
  focusGroup:           (index: number) => void
  cycleTab:             (dir: number) => void
  mruSwitch:            () => void
  addTerminal:          () => void
  splitTerminal:        () => void
  toggleSidebar:        () => void
  toggleSecondary:      () => void
  togglePanel:          () => void
  toggleTerminalPanel:  () => void
  toggleMaximizedPanel: () => void
  toggleZen:            () => void
  exitZen:              () => void
  toggleWordWrap:       () => void
  toggleNetworkLog:     () => void
  setTheme:             (name: string) => void
}

export function paletteCommands(a: WorkbenchActions): PaletteCommand[] {
  return [
    { id: 'term-new',       label: 'Terminal: Create New Terminal',          hint: 'Ctrl+Shift+`', run: a.addTerminal },
    { id: 'term-split',     label: 'Terminal: Split Terminal',                                     run: a.splitTerminal },
    { id: 'split-editor',   label: 'View: Split Editor',                     hint: 'Ctrl+\\',      run: a.splitEditor },
    { id: 'close-group',    label: 'View: Close Editor Group',               hint: 'Ctrl+K W',     run: a.closeActiveGroup },
    { id: 'goto-symbol',    label: 'Go to Symbol in Editor…',                hint: 'Ctrl+Shift+O', run: () => a.openPalette('symbols') },
    { id: 'goto-line',      label: 'Go to Line/Column…',                     hint: 'Ctrl+G',       run: () => a.openPalette('goto') },
    { id: 'view-panel',     label: 'View: Toggle Panel',                     hint: 'Ctrl+`',       run: a.togglePanel },
    { id: 'view-sidebar',   label: 'View: Toggle Primary Side Bar',          hint: 'Ctrl+B',       run: a.toggleSidebar },
    { id: 'view-maxpanel',  label: 'View: Toggle Maximized Panel',                                 run: a.toggleMaximizedPanel },
    { id: 'view-zen',       label: 'View: Toggle Zen Mode',                  hint: 'Ctrl+K Z',     run: a.toggleZen },
    { id: 'view-wrap',      label: 'View: Toggle Word Wrap',                 hint: 'Alt+Z',        run: a.toggleWordWrap },
    { id: 'view-secondary', label: 'View: Toggle Secondary Side Bar (Chat)', hint: 'Ctrl+Alt+B',   run: a.toggleSecondary },
    { id: 'pref-settings',  label: 'Preferences: Open Settings',             hint: 'Ctrl+,',       run: a.openSettings },
    { id: 'go-readme',      label: 'Go to File: README.md',                                        run: () => a.openKind('readme') },
    { id: 'go-memes',       label: 'Go to File: memes.feed',                                       run: () => a.openKind('memes') },
    { id: 'go-quotes',      label: 'Go to File: quotes.log',                                       run: () => a.openKind('quotes') },
    ...Object.keys(THEMES).map(name => ({ id: `theme-${name}`, label: `Preferences: Color Theme — ${name}`, run: () => a.setTheme(name) })),
    { id: 'net-log',        label: 'Network: Toggle Request Log',                                  run: a.toggleNetworkLog },
  ]
}

export function titleMenus(a: WorkbenchActions, canGoBack: boolean, canGoForward: boolean): TitleMenu[] {
  return [
    { label: 'File', items: [
      { label: 'Open File…',              hint: 'Ctrl+P',        onClick: () => a.openPalette('files') },
      { sep: true },
      { label: 'Preferences: Settings',   hint: 'Ctrl+,',        onClick: a.openSettings },
      { sep: true },
      { label: 'Close Editor',            hint: 'Ctrl+W',        onClick: a.closeActiveEditor },
      { label: 'Close Editor Group',      hint: 'Ctrl+K W',      onClick: a.closeActiveGroup },
    ] },
    { label: 'Edit', items: [
      { label: 'Find in Files',           hint: 'Ctrl+Shift+F',  onClick: () => a.showView('search') },
      { label: 'Toggle Word Wrap',        hint: 'Alt+Z',         onClick: a.toggleWordWrap },
    ] },
    { label: 'View', items: [
      { label: 'Command Palette…',        hint: 'Ctrl+Shift+P',  onClick: () => a.openPalette('commands') },
      { sep: true },
      { label: 'Explorer',                hint: 'Ctrl+Shift+E',  onClick: () => a.showView('explorer') },
      { label: 'Search',                  hint: 'Ctrl+Shift+F',  onClick: () => a.showView('search') },
      { label: 'Source Control',          hint: 'Ctrl+Shift+G',  onClick: () => a.showView('git') },
      { label: 'Extensions',              hint: 'Ctrl+Shift+X',  onClick: () => a.showView('extensions') },
      { sep: true },
      { label: 'Primary Side Bar',        hint: 'Ctrl+B',        onClick: a.toggleSidebar },
      { label: 'Secondary Side Bar',      hint: 'Ctrl+Alt+B',    onClick: a.toggleSecondary },
      { label: 'Panel',                   hint: 'Ctrl+J',        onClick: a.togglePanel },
      { label: 'Zen Mode',                hint: 'Ctrl+K Z',      onClick: a.toggleZen },
      { sep: true },
      { label: 'Split Editor',            hint: 'Ctrl+\\',       onClick: a.splitEditor },
    ] },
    { label: 'Go', items: [
      { label: 'Back',                    hint: 'Ctrl+Alt+-',    onClick: () => a.navigate(-1), disabled: !canGoBack },
      { label: 'Forward',                 hint: 'Ctrl+Shift+-',  onClick: () => a.navigate(1),  disabled: !canGoForward },
      { sep: true },
      { label: 'Next Editor',             hint: 'Ctrl+PageDown', onClick: () => a.cycleTab(1) },
      { label: 'Previous Editor',         hint: 'Ctrl+PageUp',   onClick: () => a.cycleTab(-1) },
      { sep: true },
      { label: 'Go to File…',             hint: 'Ctrl+P',        onClick: () => a.openPalette('files') },
      { label: 'Go to Symbol in Editor…', hint: 'Ctrl+Shift+O',  onClick: () => a.openPalette('symbols') },
      { label: 'Go to Line/Column…',      hint: 'Ctrl+G',        onClick: () => a.openPalette('goto') },
    ] },
    { label: 'Terminal', items: [
      { label: 'New Terminal',            hint: 'Ctrl+Shift+`',  onClick: a.addTerminal },
      { label: 'Split Terminal',                                 onClick: a.splitTerminal },
    ] },
    { label: 'Help', items: [
      { label: 'Show All Commands',       hint: 'Ctrl+Shift+P',  onClick: () => a.openPalette('commands') },
      { sep: true },
      { label: 'View Source on GitHub',                          onClick: () => window.open('https://github.com/tilalx/tilalx', '_blank', 'noopener') },
      { label: 'About',                                          onClick: () => a.openKind('readme') },
    ] },
  ]
}
