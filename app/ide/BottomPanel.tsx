import type { ReactNode } from 'react'
import { IconAdd, IconSplitH, IconTrash, IconClose, IconMaximize, IconRestore } from './icons'
import { ProblemsPanel } from './Terminal'
import type { BottomTab, WorkbenchLayout } from './useWorkbenchLayout'
import type { Repo } from './types'

export default function BottomPanel({ layout, repos, children: terminal }: { layout: WorkbenchLayout; repos: Repo[]; children: ReactNode }) {
  const { bottomTab, setBottomTab, panelMaximized, panelCollapsed, terminals, activeTerminalId } = layout
  const tabs: { id: BottomTab; label: string; badge?: string | null }[] = [
    { id: 'problems',      label: 'Problems'      },
    { id: 'output',        label: 'Output'        },
    { id: 'debug-console', label: 'Debug Console' },
    { id: 'terminal',      label: 'Terminal', badge: terminals.length > 1 ? String(terminals.length) : null },
    { id: 'ports',         label: 'Ports'         },
  ]
  const maximizeLabel = panelMaximized ? 'Restore Panel Size' : 'Maximize Panel Size'

  return (
    <div
      className={`ide-bottom-panel${panelMaximized ? ' maximized' : ''}${panelCollapsed ? ' collapsed' : ''}`}
      style={panelMaximized || panelCollapsed ? undefined : { height: layout.panelHeight }}
    >
      <div
        className="ide-panel-resize-handle"
        onPointerDown={layout.startPanelResize}
        onDoubleClick={layout.toggleMaximizedPanel}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panel"
      />
      <div className="ide-bottom-tabs">
        {tabs.map(t => (
          <div
            key={t.id}
            className={`ide-bottom-tab${bottomTab === t.id ? ' active' : ''}`}
            onClick={() => setBottomTab(t.id)}
          >
            {t.label}
            {t.badge && <span className="ide-bottom-tab-badge">{t.badge}</span>}
          </div>
        ))}
        <div className="ide-bottom-actions">
          {bottomTab === 'terminal' && <>
            <button className="ide-bottom-action-btn" title="New Terminal (Ctrl+Shift+`)" aria-label="New Terminal" onClick={layout.addTerminal}><IconAdd /></button>
            <button className="ide-bottom-action-btn" title="Split Terminal" aria-label="Split Terminal" onClick={layout.splitTerminal}><IconSplitH /></button>
            <button
              className="ide-bottom-action-btn"
              title="Kill Terminal"
              aria-label="Kill Terminal"
              onClick={() => { if (activeTerminalId != null) layout.closeTerminal(activeTerminalId) }}
            ><IconTrash /></button>
            <span className="ide-bottom-action-sep" />
          </>}
          <button
            className="ide-bottom-action-btn"
            title={maximizeLabel}
            aria-label={maximizeLabel}
            onClick={layout.toggleMaximizedPanel}
          >{panelMaximized ? <IconRestore /> : <IconMaximize />}</button>
          <button
            className="ide-bottom-action-btn"
            title="Hide Panel (Ctrl+J)"
            aria-label="Hide Panel"
            onClick={() => layout.setPanelCollapsed(true)}
          ><IconClose /></button>
        </div>
      </div>
      {!panelCollapsed && bottomTab !== 'terminal' && (
        <div className="ide-panel-content">
          {bottomTab === 'problems'      && <ProblemsPanel repos={repos} />}
          {bottomTab === 'output'        && <div className="ide-bottom-empty">No output available.</div>}
          {bottomTab === 'debug-console' && <div className="ide-bottom-empty">No debug sessions active.</div>}
          {bottomTab === 'ports'         && <div className="ide-bottom-empty">No ports forwarded.</div>}
        </div>
      )}
      <div style={{ display: !panelCollapsed && bottomTab === 'terminal' ? 'flex' : 'none', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {terminal}
      </div>
    </div>
  )
}
