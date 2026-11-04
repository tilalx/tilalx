import type { Workbench } from './context'
import {
  activeGroupOf, activeTabOf, closeAll, closeOthers, closeTabs, cycleTab, focusGroup, splitGroup,
} from './editors/model'
import { languageOf } from './languages'

export interface Command {
  id: string
  title: string
  category?: string
  key?: string
  hidden?: boolean
  when?: (wb: Workbench) => boolean
  run: (wb: Workbench) => void
}

const activePath = (wb: Workbench) => {
  const tab = activeTabOf(wb.editors)
  return tab && (tab.input.type === 'file' || tab.input.type === 'preview') ? tab.input.path : null
}

const isMarkdown = (wb: Workbench) => {
  const p = activePath(wb)
  return !!p && languageOf(p).id === 'markdown'
}

export const COMMANDS: Command[] = [
  { id: 'workbench.action.showCommands', title: 'Show All Commands', key: 'Cmd+Shift+P', run: wb => wb.quickInput('commands') },
  { id: 'workbench.action.showCommands.f1', title: 'Show All Commands', key: 'F1', hidden: true, run: wb => wb.quickInput('commands') },
  { id: 'workbench.action.quickOpen', title: 'Go to File...', key: 'Cmd+P', run: wb => wb.quickInput('files') },
  { id: 'workbench.action.gotoLine', title: 'Go to Line/Column...', key: 'Ctrl+G', run: wb => wb.quickInput('line', ':') },
  { id: 'workbench.action.gotoSymbol', title: 'Go to Symbol in Editor...', key: 'Cmd+Shift+O', run: wb => wb.quickInput('symbols', '@') },
  { id: 'workbench.action.openSettings', title: 'Open Settings (UI)', category: 'Preferences', key: 'Cmd+,', run: wb => wb.open({ type: 'settings' }) },
  { id: 'workbench.action.selectTheme', title: 'Color Theme', category: 'Preferences', run: wb => wb.quickInput('themes') },
  { id: 'workbench.action.toggleLightDarkThemes', title: 'Toggle between Light/Dark Themes', category: 'Preferences',
    run: wb => wb.setTheme(wb.theme.type === 'dark' ? 'light-modern' : 'dark-modern') },

  { id: 'workbench.view.explorer', title: 'Show Explorer', category: 'View', key: 'Cmd+Shift+E', run: wb => wb.showView('explorer') },
  { id: 'workbench.action.findInFiles', title: 'Find in Files', category: 'Search', key: 'Cmd+Shift+F', run: wb => wb.showView('search') },
  { id: 'workbench.view.scm', title: 'Show Source Control', category: 'View', key: 'Ctrl+Shift+G', run: wb => wb.showView('scm') },
  { id: 'workbench.view.debug', title: 'Show Run and Debug', category: 'View', key: 'Cmd+Shift+D', run: wb => wb.showView('run') },
  { id: 'workbench.view.extensions', title: 'Show Extensions', category: 'View', key: 'Cmd+Shift+X', run: wb => wb.showView('extensions') },
  { id: 'workbench.action.toggleSidebarVisibility', title: 'Toggle Primary Side Bar Visibility', category: 'View', key: 'Cmd+B', run: wb => wb.toggleSidebar() },
  { id: 'workbench.action.togglePanel', title: 'Toggle Panel Visibility', category: 'View', key: 'Cmd+J', run: wb => wb.togglePanel() },
  { id: 'workbench.action.toggleMaximizedPanel', title: 'Toggle Maximized Panel', category: 'View', run: wb => wb.toggleMaximizedPanel() },
  { id: 'workbench.actions.view.problems', title: 'Focus on Problems View', category: 'View', key: 'Cmd+Shift+M', run: wb => wb.showPanel('problems') },
  { id: 'workbench.action.output.toggleOutput', title: 'Toggle Output', category: 'View', key: 'Cmd+Shift+U', run: wb => wb.showPanel('output') },
  { id: 'workbench.action.terminal.toggleTerminal', title: 'Toggle Terminal', category: 'View', key: 'Ctrl+`',
    run: wb => wb.panel.visible && wb.panel.view === 'terminal' ? wb.togglePanel() : wb.showPanel('terminal') },
  { id: 'workbench.action.terminal.new', title: 'Create New Terminal', category: 'Terminal', key: 'Ctrl+Shift+`', run: wb => wb.showPanel('terminal') },
  { id: 'workbench.action.toggleZenMode', title: 'Toggle Zen Mode', category: 'View', key: 'Cmd+K Z', run: wb => wb.runCommand('internal.zen') },

  { id: 'workbench.action.splitEditor', title: 'Split Editor', category: 'View', key: 'Cmd+\\', run: wb => wb.setEditors(s => splitGroup(s)) },
  { id: 'workbench.action.closeActiveEditor', title: 'Close Editor', category: 'View', key: 'Ctrl+Alt+W',
    run: wb => wb.setEditors(s => { const g = activeGroupOf(s); return g.active ? closeTabs(s, g.id, [g.active]) : s }) },
  { id: 'workbench.action.closeOtherEditors', title: 'Close Other Editors in Group', category: 'View',
    run: wb => wb.setEditors(s => { const g = activeGroupOf(s); return g.active ? closeOthers(s, g.id, g.active) : s }) },
  { id: 'workbench.action.closeAllEditors', title: 'Close All Editors', category: 'View', key: 'Cmd+K W', run: wb => wb.setEditors(closeAll) },
  { id: 'workbench.action.nextEditor', title: 'Open Next Editor', category: 'View', key: 'Alt+Cmd+Right', run: wb => wb.setEditors(s => cycleTab(s, 1)) },
  { id: 'workbench.action.previousEditor', title: 'Open Previous Editor', category: 'View', key: 'Alt+Cmd+Left', run: wb => wb.setEditors(s => cycleTab(s, -1)) },
  ...[1, 2, 3].map((n): Command => ({
    id: `workbench.action.focus${['First', 'Second', 'Third'][n - 1]}EditorGroup`, title: `Focus ${['First', 'Second', 'Third'][n - 1]} Editor Group`,
    category: 'View', run: wb => wb.setEditors(s => s.groups[n - 1] ? focusGroup(s, s.groups[n - 1].id) : splitGroup(s, false)),
  })),
  { id: 'workbench.action.files.save', title: 'Save', category: 'File', key: 'Cmd+S',
    run: wb => { const p = activePath(wb); if (p) wb.saveFile(p) } },
  { id: 'workbench.action.files.revert', title: 'Revert File', category: 'File',
    when: wb => { const p = activePath(wb); return !!p && wb.isDirty(p) },
    run: wb => { const p = activePath(wb); if (p) wb.revertFile(p) } },

  { id: 'markdown.showPreview', title: 'Open Preview', category: 'Markdown', key: 'Cmd+Shift+V', when: isMarkdown,
    run: wb => { const p = activePath(wb); if (p) wb.open({ type: 'preview', path: p }) } },
  { id: 'markdown.showPreviewToSide', title: 'Open Preview to the Side', category: 'Markdown', key: 'Cmd+K V', when: isMarkdown,
    run: wb => { const p = activePath(wb); if (p) wb.open({ type: 'preview', path: p }, { group: 'side' }) } },
  { id: 'markdown.showSource', title: 'Show Source', category: 'Markdown',
    when: wb => activeTabOf(wb.editors)?.input.type === 'preview',
    run: wb => { const p = activePath(wb); if (p) wb.open({ type: 'file', path: p }) } },

  { id: 'workbench.action.openWelcome', title: 'Welcome', category: 'Help', run: wb => wb.open({ type: 'welcome' }) },
  { id: 'tilalx.openMemes', title: 'Open Memes Feed', category: 'tilalx', run: wb => wb.open({ type: 'memes' }) },
  { id: 'tilalx.openQuotes', title: 'Open Quotes Log', category: 'tilalx', run: wb => wb.open({ type: 'quotes' }) },
  { id: 'tilalx.openContributions', title: 'Open Contribution Graph', category: 'tilalx', run: wb => wb.open({ type: 'contributions' }) },
  { id: 'tilalx.github', title: 'Open GitHub Profile', category: 'tilalx', run: () => window.open('https://github.com/tilalx', '_blank', 'noopener') },
  { id: 'tilalx.linkedin', title: 'Open LinkedIn Profile', category: 'tilalx', run: () => window.open('https://www.linkedin.com/in/tilo-alexander', '_blank', 'noopener') },
]

export function commandLabel(c: Command): string {
  return c.category ? `${c.category}: ${c.title}` : c.title
}

export function findCommand(id: string): Command | undefined {
  return COMMANDS.find(c => c.id === id)
}
