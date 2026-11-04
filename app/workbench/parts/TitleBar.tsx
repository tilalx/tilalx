'use client'

import { Codicon } from '../icons'
import { useWorkbench, useIsMac } from '../context'
import { keyLabel } from '../keybinding'

export default function TitleBar({ canGoBack, canGoForward, onBack, onForward }: {
  canGoBack: boolean; canGoForward: boolean; onBack(): void; onForward(): void
}) {
  const wb  = useWorkbench()
  const mac = useIsMac()
  return (
    <header className="titlebar" role="banner">
      <div className="titlebar-left" />
      <div className="titlebar-center">
        <button className={`action-label${canGoBack ? '' : ' disabled'}`} title={`Go Back (${keyLabel(mac ? 'Ctrl+-' : 'Alt+Left', mac)})`} onClick={onBack}>
          <Codicon name="arrow-left" />
        </button>
        <button className={`action-label${canGoForward ? '' : ' disabled'}`} title={`Go Forward (${keyLabel(mac ? 'Ctrl+Shift+-' : 'Alt+Right', mac)})`} onClick={onForward}>
          <Codicon name="arrow-right" />
        </button>
        <button className="command-center" title={`Search tilalx (${keyLabel('Cmd+P', mac)})`} onClick={() => wb.quickInput('files')}>
          <Codicon name="search" />
          <span>tilalx</span>
        </button>
        <span className="command-center-spacer" />
      </div>
      <div className="titlebar-right">
        <button className="action-label" title="Customize Layout..." onClick={() => wb.quickInput('commands', '>View: Toggle ')}>
          <Codicon name="layout" />
        </button>
        <button className="action-label" title={`Toggle Primary Side Bar (${keyLabel('Cmd+B', mac)})`} onClick={wb.toggleSidebar}>
          <Codicon name={wb.sidebar.visible ? 'layout-sidebar-left' : 'layout-sidebar-left-off'} />
        </button>
        <button className="action-label" title={`Toggle Panel (${keyLabel('Cmd+J', mac)})`} onClick={wb.togglePanel}>
          <Codicon name={wb.panel.visible ? 'layout-panel' : 'layout-panel-off'} />
        </button>
        <button className="action-label disabled" title="Toggle Secondary Side Bar">
          <Codicon name="layout-sidebar-right-off" />
        </button>
      </div>
    </header>
  )
}
