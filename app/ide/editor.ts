import type { EditorState, Group, Tab, TabSpec } from './types'

export function tabKey(tab: TabSpec): string {
  return tab.kind === 'file' ? `file:${tab.file}` : tab.kind
}
function pushMru(mru: string[], id: string): string[] {
  return [id, ...mru.filter(x => x !== id)]
}

function sortPinned(tabs: Tab[]): Tab[] {
  return [...tabs].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
}

export function initialEditorState(): EditorState {
  return {
    groups: [{ id: 'g1', tabs: [{ id: 't1', kind: 'readme', preview: false, pinned: false }], activeTabId: 't1', mru: ['t1'] }],
    activeGroupId: 'g1',
    seq: 1,
  }
}

function groupOf(state: EditorState, groupId: string): Group | null {
  return state.groups.find(g => g.id === groupId) || null
}
export function activeGroupOf(state: EditorState): Group {
  return groupOf(state, state.activeGroupId) || state.groups[0]
}
export function activeTabOf(state: EditorState): Tab | null {
  const g = activeGroupOf(state)
  return g ? g.tabs.find(t => t.id === g.activeTabId) || g.tabs[0] : null
}

export function openInGroup(state: EditorState, spec: TabSpec, opts: { preview?: boolean; groupId?: string } = {}): EditorState {
  const preview = opts.preview ?? true
  let targetGroupId = opts.groupId ?? state.activeGroupId
  if (!groupOf(state, targetGroupId)) targetGroupId = state.activeGroupId
  const key = tabKey(spec)

  for (const g of state.groups) {
    const existing = g.tabs.find(t => tabKey(t) === key)
    if (existing) {
      const tabs = g.tabs.map(t => t.id === existing.id
        ? { ...t, line: spec.line ?? t.line, preview: preview ? t.preview : false }
        : t)
      return {
        ...state,
        activeGroupId: g.id,
        groups: state.groups.map(gr => gr.id === g.id
          ? { ...gr, tabs, activeTabId: existing.id, mru: pushMru(gr.mru, existing.id) }
          : gr),
      }
    }
  }

  const seq = state.seq + 1
  const id = 't' + seq
  const tab: Tab = { id, kind: spec.kind, file: spec.file, line: spec.line, preview, pinned: false }
  return {
    ...state,
    seq,
    activeGroupId: targetGroupId,
    groups: state.groups.map(g => {
      if (g.id !== targetGroupId) return g
      if (preview) {
        const pvIdx = g.tabs.findIndex(t => t.preview && !t.pinned)
        if (pvIdx !== -1) {
          const tabs = g.tabs.slice()
          const replacedId = tabs[pvIdx].id
          tabs[pvIdx] = tab
          return { ...g, tabs, activeTabId: id, mru: pushMru(g.mru.filter(x => x !== replacedId), id) }
        }
      }
      return { ...g, tabs: [...g.tabs, tab], activeTabId: id, mru: pushMru(g.mru, id) }
    }),
  }
}

function freshGroup(seq: number): { group: Group; seq: number } {
  const gid = 'g' + (seq + 1)
  const tid = 't' + (seq + 2)
  return {
    group: { id: gid, tabs: [{ id: tid, kind: 'readme', preview: false, pinned: false }], activeTabId: tid, mru: [tid] },
    seq: seq + 2,
  }
}

function removeGroup(state: EditorState, groupId: string): EditorState {
  const groups = state.groups.filter(g => g.id !== groupId)
  if (groups.length === 0) {
    const { group, seq } = freshGroup(state.seq)
    return { ...state, seq, groups: [group], activeGroupId: group.id }
  }
  const activeGroupId = state.activeGroupId === groupId ? groups[groups.length - 1].id : state.activeGroupId
  return { ...state, groups, activeGroupId }
}

export function closeTab(state: EditorState, groupId: string, tabId: string): EditorState {
  const g = groupOf(state, groupId)
  if (!g) return state
  const tabs = g.tabs.filter(t => t.id !== tabId)
  if (tabs.length === 0) return removeGroup(state, groupId)
  const mru = g.mru.filter(x => x !== tabId)
  const activeTabId = g.activeTabId === tabId ? (mru[0] ?? tabs[tabs.length - 1].id) : g.activeTabId
  return { ...state, groups: state.groups.map(x => x.id === groupId ? { ...x, tabs, activeTabId, mru } : x) }
}

export function closeOthers(state: EditorState, groupId: string, tabId: string): EditorState {
  const g = groupOf(state, groupId)
  if (!g) return state
  const tabs = g.tabs.filter(t => t.id === tabId || t.pinned)
  const ids = new Set(tabs.map(t => t.id))
  return { ...state, groups: state.groups.map(x => x.id === groupId
    ? { ...x, tabs, activeTabId: tabId, mru: x.mru.filter(i => ids.has(i)) }
    : x) }
}

export function closeAll(state: EditorState, groupId: string): EditorState {
  const g = groupOf(state, groupId)
  if (!g) return state
  const tabs = g.tabs.filter(t => t.pinned)
  if (tabs.length === 0) return removeGroup(state, groupId)
  const ids = new Set(tabs.map(t => t.id))
  return { ...state, groups: state.groups.map(x => x.id === groupId
    ? { ...x, tabs, activeTabId: tabs[tabs.length - 1].id, mru: x.mru.filter(i => ids.has(i)) }
    : x) }
}

export function closeGroup(state: EditorState, groupId: string): EditorState {
  return groupOf(state, groupId) ? removeGroup(state, groupId) : state
}

export function setPinned(state: EditorState, groupId: string, tabId: string, pinned: boolean): EditorState {
  return { ...state, groups: state.groups.map(g => {
    if (g.id !== groupId) return g
    const tabs = sortPinned(g.tabs.map(t => t.id === tabId ? { ...t, pinned, preview: pinned ? false : t.preview } : t))
    return { ...g, tabs }
  }) }
}

export function setActiveTab(state: EditorState, groupId: string, tabId: string): EditorState {
  return { ...state, activeGroupId: groupId, groups: state.groups.map(g => g.id === groupId
    ? { ...g, activeTabId: tabId, mru: pushMru(g.mru, tabId) }
    : g) }
}

export function focusGroup(state: EditorState, groupId: string): EditorState {
  return groupOf(state, groupId) ? { ...state, activeGroupId: groupId } : state
}
export function focusGroupByIndex(state: EditorState, idx: number): EditorState {
  const g = state.groups[idx]
  return g ? { ...state, activeGroupId: g.id } : state
}

export function moveTab(state: EditorState, fromGroupId: string, tabId: string, toGroupId: string, index: number): EditorState {
  const from = groupOf(state, fromGroupId)
  if (!from) return state
  const tab = from.tabs.find(t => t.id === tabId)
  if (!tab) return state

  if (fromGroupId === toGroupId) {
    const without = from.tabs.filter(t => t.id !== tabId)
    const clamped = Math.max(0, Math.min(index, without.length))
    without.splice(clamped, 0, tab)
    return { ...state, activeGroupId: toGroupId, groups: state.groups.map(g => g.id === toGroupId
      ? { ...g, tabs: sortPinned(without), activeTabId: tabId, mru: pushMru(g.mru, tabId) }
      : g) }
  }

  let next = { ...state, groups: state.groups.map(g => {
    if (g.id === fromGroupId) {
      const tabs = g.tabs.filter(t => t.id !== tabId)
      const mru = g.mru.filter(x => x !== tabId)
      return { ...g, tabs, mru, activeTabId: g.activeTabId === tabId ? (mru[0] ?? tabs[tabs.length - 1]?.id) : g.activeTabId }
    }
    if (g.id === toGroupId) {
      const tabs = g.tabs.slice()
      const clamped = Math.max(0, Math.min(index, tabs.length))
      tabs.splice(clamped, 0, tab)
      return { ...g, tabs: sortPinned(tabs), activeTabId: tabId, mru: pushMru(g.mru, tabId) }
    }
    return g
  }) }
  next.activeGroupId = toGroupId
  const src = groupOf(next, fromGroupId)
  if (src && src.tabs.length === 0) next = removeGroup(next, fromGroupId)
  return next
}

export function splitGroup(state: EditorState, groupId: string = state.activeGroupId): EditorState {
  const g = groupOf(state, groupId)
  if (!g) return state
  const src = g.tabs.find(t => t.id === g.activeTabId) || g.tabs[0]
  const seq = state.seq + 1
  const gid = 'g' + seq
  const tid = 't' + seq + 'b'
  const clone: Tab = src
    ? { ...src, id: tid, preview: false }
    : { id: tid, kind: 'readme', preview: false, pinned: false }
  const newGroup: Group = { id: gid, tabs: [clone], activeTabId: tid, mru: [tid] }
  const idx = state.groups.findIndex(x => x.id === groupId)
  const groups = state.groups.slice()
  groups.splice(idx + 1, 0, newGroup)
  return { ...state, seq, groups, activeGroupId: gid }
}

export function moveTabToNewGroup(state: EditorState, fromGroupId: string, tabId: string, afterGroupId?: string): EditorState {
  const from = groupOf(state, fromGroupId)
  if (!from) return state
  const tab = from.tabs.find(t => t.id === tabId)
  if (!tab) return state
  if (from.tabs.length === 1) return focusGroup(state, fromGroupId)
  const seq = state.seq + 1
  const gid = 'g' + seq
  const moved = { ...tab, preview: false }
  let next = { ...state, seq, groups: state.groups.map(g => {
    if (g.id !== fromGroupId) return g
    const tabs = g.tabs.filter(t => t.id !== tabId)
    const mru = g.mru.filter(x => x !== tabId)
    return { ...g, tabs, mru, activeTabId: g.activeTabId === tabId ? (mru[0] ?? tabs[tabs.length - 1]?.id) : g.activeTabId }
  }) }
  const idx = next.groups.findIndex(g => g.id === (afterGroupId || fromGroupId))
  const groups = next.groups.slice()
  groups.splice(idx + 1, 0, { id: gid, tabs: [moved], activeTabId: moved.id, mru: [moved.id] })
  return { ...next, groups, activeGroupId: gid }
}

export function cycleTab(state: EditorState, dir: number): EditorState {
  const g = activeGroupOf(state)
  if (!g || g.tabs.length < 2) return state
  const i = g.tabs.findIndex(t => t.id === g.activeTabId)
  const next = g.tabs[(i + dir + g.tabs.length) % g.tabs.length]
  return setActiveTab(state, g.id, next.id)
}

export function mruSwitch(state: EditorState): EditorState {
  const g = activeGroupOf(state)
  if (!g || g.mru.length < 2) return state
  return setActiveTab(state, g.id, g.mru[1])
}

interface SerializedEditor {
  groups: { tabs: { kind: Tab['kind']; file?: string; pinned: boolean }[]; active: number }[]
  activeGroupIndex: number
}

export function serializeEditor(state: EditorState): SerializedEditor {
  return {
    groups: state.groups.map(g => ({
      tabs: g.tabs.map(t => ({ kind: t.kind, file: t.file, pinned: t.pinned })),
      active: g.tabs.findIndex(t => t.id === g.activeTabId),
    })),
    activeGroupIndex: state.groups.findIndex(g => g.id === state.activeGroupId),
  }
}

export function deserializeEditor(data: SerializedEditor | null | undefined): EditorState | null {
  try {
    if (!data || !Array.isArray(data.groups) || data.groups.length === 0) return null
    let seq = 0
    const groups = data.groups.map(g => {
      const tabs: Tab[] = (g.tabs || [])
        .filter(t => t && (t.kind !== 'file' || t.file))
        .map(t => { seq++; return { id: 't' + seq, kind: t.kind, file: t.file, preview: false, pinned: !!t.pinned } })
      if (tabs.length === 0) { seq++; tabs.push({ id: 't' + seq, kind: 'readme', preview: false, pinned: false }) }
      seq++
      const active = tabs[g.active] || tabs[0]
      return { id: 'g' + seq, tabs: sortPinned(tabs), activeTabId: active.id, mru: [active.id] }
    })
    const activeGroupId = (groups[data.activeGroupIndex] || groups[0]).id
    return { groups, activeGroupId, seq }
  } catch { return null }
}
