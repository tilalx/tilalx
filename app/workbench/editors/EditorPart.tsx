'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { pressable } from '../pressable'
import { Codicon, FileIcon } from '../icons'
import { useWorkbench } from '../context'
import { Keybinding } from '../keybinding'
import { basename, languageOf } from '../languages'
import { parseSymbols, symbolPath } from '../symbols'
import type { EditorInput, Group, Tab } from '../types'
import { closeTabs, focusGroup, moveTab, pinTab, setActiveTab, splitGroup } from './model'
import MarkdownPreview from './MarkdownPreview'
import Welcome from './Welcome'
import SettingsEditor from './SettingsEditor'
import ExtensionEditor from './ExtensionEditor'
import { MemesEditor, QuotesEditor, ContributionsEditor } from './FeedEditors'

const TextEditor = dynamic(() => import('./TextEditor'), { ssr: false })

export interface TabMenuRequest { x: number; y: number; group: number; tab: Tab }

export function tabTitle(input: EditorInput): string {
  switch (input.type) {
    case 'file':          return basename(input.path)
    case 'preview':       return `Preview ${basename(input.path)}`
    case 'welcome':       return 'Welcome'
    case 'settings':      return 'Settings'
    case 'extension':     return `Extension: ${input.name}`
    case 'memes':         return 'memes.feed'
    case 'quotes':        return 'quotes.log'
    case 'contributions': return 'contributions.graph'
  }
}

const TAB_CODICONS: Partial<Record<EditorInput['type'], string>> = {
  preview: 'open-preview', welcome: 'vscode', settings: 'settings', extension: 'extensions',
  memes: 'file-media', quotes: 'quote', contributions: 'graph',
}

export function TabIcon({ input, light }: { input: EditorInput; light: boolean }) {
  if (input.type === 'file') return <FileIcon path={input.path} light={light} />
  return <Codicon name={TAB_CODICONS[input.type] ?? 'file'} className="tab-icon" style={input.type === 'preview' ? { color: '#519aba' } : undefined} />
}

function Watermark() {
  const entries: [string, string][] = [
    ['Show All Commands', 'Cmd+Shift+P'],
    ['Go to File', 'Cmd+P'],
    ['Open Settings', 'Cmd+,'],
    ['Find in Files', 'Cmd+Shift+F'],
  ]
  return (
    <div className="watermark">
      <div className="letterpress" />
      <dl>
        {entries.map(([label, key]) => (
          <div className="entry" key={label}><dt>{label}</dt><dd><Keybinding binding={key} /></dd></div>
        ))}
      </dl>
    </div>
  )
}

function Breadcrumbs({ input }: { input: EditorInput }) {
  const wb = useWorkbench()
  const path = input.type === 'file' ? input.path : null
  const text = path ? wb.fileText(path) : undefined
  const symbols = useMemo(() => path && text !== undefined ? parseSymbols(path, text) : [], [path, text])
  if (!path) return null
  const chain = symbolPath(symbols, wb.cursor.line)
  const segments = path.split('/')
  return (
    <div className="breadcrumbs" role="navigation" aria-label="Breadcrumbs">
      {segments.map((seg, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="breadcrumb-sep"><Codicon name="chevron-right" /></span>}
          <span className="breadcrumb-item" {...pressable(() => wb.showView('explorer'))}>
            {i === segments.length - 1 && <FileIcon path={path} light={wb.theme.type === 'light'} />}
            {seg}
          </span>
        </Fragment>
      ))}
      {chain.map(s => (
        <Fragment key={`${s.line}`}>
          <span className="breadcrumb-sep"><Codicon name="chevron-right" /></span>
          <span className="breadcrumb-item" {...pressable(() => wb.quickInput('symbols', '@'))}>
            <Codicon name={s.kind} className={`symbol-icon ${s.kind}`} />
            {s.name}
          </span>
        </Fragment>
      ))}
    </div>
  )
}

const BINARY = /\.(woff2?|ttf|otf|png|jpe?g|gif|ico|webp|zip|gz)$/i

/** VS Code's placeholder for files the text editor won't show. */
function BinaryEditor({ path }: { path: string }) {
  return (
    <div className="binary-editor">
      <p>The file is not displayed in the text editor because it is either binary or uses an unsupported text encoding.</p>
      <a href={`https://github.com/tilalx/tilalx/blob/main/${path}`} target="_blank" rel="noopener noreferrer">Open on GitHub</a>
    </div>
  )
}

/** VS Code's message when an editor's input can't be resolved, with a way to try again. */
function LoadError({ path }: { path: string }) {
  const wb = useWorkbench()
  return (
    <div className="binary-editor">
      <p>The editor could not be opened because the file could not be read.</p>
      <button className="button-link" onClick={() => wb.loadFile(path)}>Try Again</button>
    </div>
  )
}

function EditorContent({ input, active, onPin }: { input: EditorInput; active: boolean; onPin(): void }) {
  const wb = useWorkbench()
  if ((input.type === 'file' || input.type === 'preview') && wb.fileFailed(input.path) && wb.fileText(input.path) === undefined) {
    return <LoadError path={input.path} />
  }
  switch (input.type) {
    case 'file':          return BINARY.test(input.path) ? <BinaryEditor path={input.path} /> : <TextEditor path={input.path} active={active} onPin={onPin} />
    case 'preview':       return <MarkdownPreview path={input.path} />
    case 'welcome':       return <Welcome />
    case 'settings':      return <SettingsEditor />
    case 'extension':     return <ExtensionEditor name={input.name} />
    case 'memes':         return <MemesEditor />
    case 'quotes':        return <QuotesEditor />
    case 'contributions': return <ContributionsEditor />
  }
}

type DragState = { group: number; tab: string } | null

function EditorGroup({ group, isActive, onTabMenu, drag, setDrag }: {
  group: Group; isActive: boolean; onTabMenu(r: TabMenuRequest): void
  drag: DragState; setDrag(d: DragState): void
}) {
  const wb = useWorkbench()
  const [dropAt, setDropAt] = useState<number | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    tabsRef.current?.querySelector('.tab.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [group.active, group.tabs.length])
  const light = wb.theme.type === 'light'
  const activeTab = group.tabs.find(t => t.id === group.active) ?? null
  const activePath = activeTab && activeTab.input.type === 'file' ? activeTab.input.path : null
  const isMd = activePath ? languageOf(activePath).id === 'markdown' : false

  const close = (id: string) => wb.setEditors(s => closeTabs(s, group.id, [id]))
  const drop  = (index: number) => {
    if (drag) wb.setEditors(s => moveTab(s, drag.group, drag.tab, group.id, index))
    setDrag(null); setDropAt(null)
  }

  return (
    <div
      className={`editor-group${isActive ? ' active' : ' inactive'}`}
      onMouseDownCapture={() => { if (!isActive) wb.setEditors(s => focusGroup(s, group.id)) }}
    >
      {group.tabs.length > 0 && (
        <div className="title-container">
          <div
            className="tabs-container"
            ref={tabsRef}
            role="tablist"
            onDragOver={e => { if (drag) { e.preventDefault(); if (e.target === e.currentTarget) setDropAt(group.tabs.length) } }}
            onDrop={e => { e.preventDefault(); drop(dropAt ?? group.tabs.length) }}
          >
            {group.tabs.map((tab, i) => {
              const path  = tab.input.type === 'file' ? tab.input.path : null
              const dirty = !!path && wb.isDirty(path)
              const sameName = path && group.tabs.some(t => t !== tab && t.input.type === 'file' && basename(t.input.path) === basename(path))
              const cls = [
                'tab', tab.id === group.active && 'active', tab.preview && 'preview', dirty && 'dirty',
                dropAt === i && 'drop-before', dropAt === group.tabs.length && i === group.tabs.length - 1 && 'drop-after',
              ].filter(Boolean).join(' ')
              return (
                <div
                  key={tab.id}
                  className={cls}
                  role="tab"
                  aria-selected={tab.id === group.active}
                  title={path ?? tabTitle(tab.input)}
                  draggable
                  onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDrag({ group: group.id, tab: tab.id }) }}
                  onDragEnd={() => { setDrag(null); setDropAt(null) }}
                  onDragOver={e => {
                    if (!drag) return
                    e.preventDefault(); e.stopPropagation()
                    const r = e.currentTarget.getBoundingClientRect()
                    setDropAt(e.clientX < r.left + r.width / 2 ? i : i + 1)
                  }}
                  onMouseDown={e => {
                    if (e.button === 1) { e.preventDefault(); close(tab.id) }
                    else if (e.button === 0) { wb.setEditors(s => setActiveTab(s, group.id, tab.id)); wb.focusEditor() }
                  }}
                  onDoubleClick={() => wb.setEditors(s => pinTab(s, group.id, tab.id))}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.target !== e.currentTarget) return
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wb.setEditors(s => setActiveTab(s, group.id, tab.id)); wb.focusEditor() }
                    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); close(tab.id) }
                  }}
                  onContextMenu={e => { e.preventDefault(); onTabMenu({ x: e.clientX, y: e.clientY, group: group.id, tab }) }}
                >
                  <TabIcon input={tab.input} light={light} />
                  <span className="tab-name">{tabTitle(tab.input)}</span>
                  {sameName && path && <span className="tab-description">{path.split('/').slice(-2, -1)[0] ?? ''}</span>}
                  <div className="tab-actions">
                    <button
                      className="action-label"
                      title="Close"
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); close(tab.id) }}
                    >
                      <Codicon name="close" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="editor-actions">
            {isMd && activePath && (
              <button className="action-label" title="Open Preview to the Side" onClick={() => wb.open({ type: 'preview', path: activePath }, { group: 'side' })}>
                <Codicon name="open-preview" />
              </button>
            )}
            {activeTab?.input.type === 'preview' && (
              <button className="action-label" title="Open Source" onClick={() => wb.runCommand('markdown.showSource')}>
                <Codicon name="go-to-file" />
              </button>
            )}
            <button className="action-label" title="Split Editor Right" onClick={() => wb.setEditors(s => splitGroup(focusGroup(s, group.id)))}>
              <Codicon name="split-horizontal" />
            </button>
            <button
              className="action-label"
              title="More Actions..."
              onClick={e => activeTab && onTabMenu({ x: e.clientX, y: e.clientY + 10, group: group.id, tab: activeTab })}
            >
              <Codicon name="ellipsis" />
            </button>
          </div>
        </div>
      )}
      {activeTab && <Breadcrumbs input={activeTab.input} />}
      <div className="editor-container">
        {/* Inactive tabs stay mounted (hidden) so Monaco keeps scroll position and undo stack, as in VS Code. */}
        {group.tabs.map(tab => (
          <div key={tab.id} className="editor-instance" style={{ display: tab.id === group.active ? 'block' : 'none' }}>
            <EditorContent
              input={tab.input}
              active={isActive && tab.id === group.active}
              onPin={() => { if (tab.preview) wb.setEditors(s => pinTab(s, group.id, tab.id)) }}
            />
          </div>
        ))}
        {group.tabs.length === 0 && wb.editors.groups.length === 1 && <Watermark />}
      </div>
    </div>
  )
}

export default function EditorPart({ onTabMenu }: { onTabMenu(r: TabMenuRequest): void }) {
  const wb = useWorkbench()
  const [drag, setDrag] = useState<DragState>(null)
  return (
    <div className="editor-part" role="main">
      {wb.editors.groups.map(g => (
        <EditorGroup key={g.id} group={g} isActive={g.id === wb.editors.activeGroup} onTabMenu={onTabMenu} drag={drag} setDrag={setDrag} />
      ))}
    </div>
  )
}
