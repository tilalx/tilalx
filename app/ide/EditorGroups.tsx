import { useRef, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { TABS } from './constants'
import { closeAll, closeOthers, closeTab, focusGroup, moveTab, moveTabToNewGroup, setActiveTab, setPinned } from './editor'
import { FileIcon } from './icons'
import Breadcrumb from './Breadcrumb'
import ContextMenu from './ContextMenu'
import type { EditorState, FileNode, Tab } from './types'

export interface TabMenuState     { groupId: string; tabId: string; x: number; y: number }
export interface TabListMenuState { groupId: string; x: number; y: number }

type SetEditor = Dispatch<SetStateAction<EditorState>>

function tabLabel(tab: Tab): string {
  if (tab.kind === 'file') return tab.file!.split('/').pop()!
  return TABS.find(x => x.id === tab.kind)?.label || tab.kind
}

function breadcrumbLabel(tab: Tab | undefined): string {
  if (!tab) return 'README.md'
  if (tab.kind === 'file') return tab.file ?? ''
  return TABS.find(t => t.id === tab.kind)?.label || 'README.md'
}

interface EditorGroupsProps {
  editor:        EditorState
  setEditor:     SetEditor
  fileTree:      FileNode[]
  fileContents:  Record<string, string>
  memeUrl:       string
  onOpenFile:    (file: string, line?: number | null) => void
  renderContent: (tab: Tab, focused: boolean) => ReactNode
  onTabMenu:     (menu: TabMenuState) => void
  onTabListMenu: (menu: TabListMenuState) => void
}

export default function EditorGroups({ editor, setEditor, fileTree, fileContents, memeUrl, onOpenFile, renderContent, onTabMenu, onTabListMenu }: EditorGroupsProps) {
  const dragRef = useRef<{ groupId: string; tabId: string } | null>(null)
  const [dragging, setDragging] = useState(false)

  const select = (groupId: string, tabId: string) => setEditor(e => setActiveTab(e, groupId, tabId))
  const close  = (groupId: string, tabId: string) => setEditor(e => closeTab(e, groupId, tabId))
  const unpin  = (groupId: string, tabId: string) => setEditor(e => setPinned(e, groupId, tabId, false))
  const move   = (groupId: string, index: number) => {
    const d = dragRef.current
    if (d) setEditor(e => moveTab(e, d.groupId, d.tabId, groupId, index))
  }
  const promote = (groupId: string, tabId: string) => setEditor(e => ({
    ...e, groups: e.groups.map(g => g.id === groupId ? { ...g, tabs: g.tabs.map(t => t.id === tabId ? { ...t, preview: false } : t) } : g),
  }))

  return (
    <div className="ide-editor-groups">
      {editor.groups.map(group => {
        const focused = group.id === editor.activeGroupId
        const activeTab = group.tabs.find(t => t.id === group.activeTabId) || group.tabs[0]
        return (
          <div
            key={group.id}
            className={`ide-editor-group${focused ? ' focused' : ''}`}
            onMouseDown={() => { if (!focused) setEditor(e => focusGroup(e, group.id)) }}
          >
            <div
              className="ide-tab-bar"
              onDragOver={e => { if (dragRef.current) e.preventDefault() }}
              onDrop={e => { if (dragRef.current) { e.preventDefault(); move(group.id, group.tabs.length) } }}
            >
              {group.tabs.map((tab, index) => {
                const label  = tabLabel(tab)
                const active = tab.id === group.activeTabId
                const dirty  = tab.kind === 'memes' || tab.kind === 'quotes'
                return (
                  <div
                    key={tab.id}
                    className={`ide-tab${active ? ' active' : ''}${tab.preview ? ' preview' : ''}${tab.pinned ? ' pinned' : ''}${dirty ? ' dirty' : ''}`}
                    draggable
                    onDragStart={e => { dragRef.current = { groupId: group.id, tabId: tab.id }; setDragging(true); e.dataTransfer.effectAllowed = 'move' }}
                    onDragEnd={() => { dragRef.current = null; setDragging(false) }}
                    onDragOver={e => { if (dragRef.current) e.preventDefault() }}
                    onDrop={e => { if (dragRef.current) { e.preventDefault(); e.stopPropagation(); move(group.id, index) } }}
                    onClick={() => select(group.id, tab.id)}
                    onDoubleClick={() => promote(group.id, tab.id)}
                    onAuxClick={e => { if (e.button === 1) { e.preventDefault(); close(group.id, tab.id) } }}
                    onContextMenu={e => { e.preventDefault(); select(group.id, tab.id); onTabMenu({ groupId: group.id, tabId: tab.id, x: e.clientX, y: e.clientY }) }}
                    onMouseEnter={() => { if (tab.kind === 'memes' && memeUrl) { const img = new window.Image(); img.src = memeUrl } }}
                    title={tab.kind === 'file' ? tab.file : label}
                  >
                    <FileIcon name={label} />
                    <span className="ide-tab-label">{label}</span>
                    <span
                      className="ide-tab-close"
                      title={tab.pinned ? 'Unpin' : 'Close'}
                      onClick={e => { e.stopPropagation(); if (tab.pinned) unpin(group.id, tab.id); else close(group.id, tab.id) }}
                    />
                  </div>
                )
              })}
              <div className="ide-tab-bar-spacer" />
              {group.tabs.length > 1 && (
                <button
                  className="ide-tab-overflow"
                  title="Open editors…"
                  aria-label="Open editors"
                  onClick={e => { e.stopPropagation(); onTabListMenu({ groupId: group.id, x: e.clientX, y: e.clientY }) }}
                >⌄</button>
              )}
            </div>

            <Breadcrumb
              tab={activeTab}
              fileTree={fileTree}
              fileContents={fileContents}
              onOpenFile={onOpenFile}
              fixedLabel={breadcrumbLabel(activeTab)}
            />

            {activeTab && renderContent(activeTab, focused)}

            <div
              className="ide-group-dropzone"
              style={{ pointerEvents: dragging ? 'auto' : 'none' }}
              onDragOver={e => { if (dragRef.current) { e.preventDefault(); e.currentTarget.classList.add('over') } }}
              onDragLeave={e => e.currentTarget.classList.remove('over')}
              onDrop={e => {
                const d = dragRef.current
                e.currentTarget.classList.remove('over')
                if (d) { e.preventDefault(); setEditor(s => moveTabToNewGroup(s, d.groupId, d.tabId, group.id)) }
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

export function TabContextMenu({ menu, editor, setEditor, onReveal, onClose }: {
  menu: TabMenuState; editor: EditorState; setEditor: SetEditor; onReveal: () => void; onClose: () => void
}) {
  const { groupId, tabId } = menu
  const group = editor.groups.find(g => g.id === groupId)
  const tab = group?.tabs.find(t => t.id === tabId)
  if (!group || !tab) return null
  return (
    <ContextMenu
      x={menu.x} y={menu.y}
      onClose={onClose}
      items={[
        { label: 'Close', hint: 'Ctrl+W', onClick: () => setEditor(e => closeTab(e, groupId, tabId)) },
        { label: 'Close Others', disabled: group.tabs.length <= 1, onClick: () => setEditor(e => closeOthers(e, groupId, tabId)) },
        { label: 'Close All', onClick: () => setEditor(e => closeAll(e, groupId)) },
        { sep: true },
        { label: tab.pinned ? 'Unpin' : 'Pin', onClick: () => setEditor(e => setPinned(e, groupId, tabId, !tab.pinned)) },
        { label: 'Split Editor', hint: 'Ctrl+\\', onClick: () => setEditor(e => moveTabToNewGroup(e, groupId, tabId, groupId)) },
        ...(tab.kind === 'file' ? [
          { sep: true },
          { label: 'Copy Path', onClick: () => { try { navigator.clipboard?.writeText(tab.file!) } catch {} } },
          { label: 'Reveal in Explorer', onClick: onReveal },
        ] : []),
      ]}
    />
  )
}

export function TabListMenu({ menu, editor, setEditor, onClose }: {
  menu: TabListMenuState; editor: EditorState; setEditor: SetEditor; onClose: () => void
}) {
  const group = editor.groups.find(g => g.id === menu.groupId)
  if (!group) return null
  return (
    <ContextMenu
      x={menu.x} y={menu.y}
      onClose={onClose}
      items={group.tabs.map(t => ({
        label: tabLabel(t),
        onClick: () => setEditor(e => setActiveTab(e, group.id, t.id)),
      }))}
    />
  )
}
