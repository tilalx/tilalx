// Pure, React-free editor-groups model + reducers — the VS Code "editor groups"
// data model. A *tab* is one open editor; a *group* is a column of tabs (a split);
// state holds all groups and which one is focused. Every reducer takes the whole
// state and returns a new state (no mutation), so it's trivial to drive from a
// single `useState` in IDEApp and to serialize for persistence.
//
// Tab:   { id, kind, file?, line?, preview, pinned }
//        kind ∈ 'readme' | 'memes' | 'quotes' | 'file'
// Group: { id, tabs: Tab[], activeTabId, mru: id[] }   // mru = most-recently-used
// State: { groups: Group[], activeGroupId, seq }       // seq = monotonic id source

export function tabKey(tab) {
  return tab.kind === 'file' ? `file:${tab.file}` : tab.kind
}
function specKey(spec) {
  return spec.kind === 'file' ? `file:${spec.file}` : spec.kind
}
function pushMru(mru, id) {
  return [id, ...mru.filter(x => x !== id)]
}

// Pinned tabs sort to the front (stable), like VS Code.
function sortPinned(tabs) {
  return [...tabs].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
}

export function initialEditorState() {
  return {
    groups: [{ id: 'g1', tabs: [{ id: 't1', kind: 'readme', preview: false, pinned: false }], activeTabId: 't1', mru: ['t1'] }],
    activeGroupId: 'g1',
    seq: 1,
  }
}

export function groupOf(state, groupId) {
  return state.groups.find(g => g.id === groupId) || null
}
export function activeGroupOf(state) {
  return groupOf(state, state.activeGroupId) || state.groups[0]
}
export function activeTabOf(state) {
  const g = activeGroupOf(state)
  return g ? g.tabs.find(t => t.id === g.activeTabId) || g.tabs[0] : null
}

// Open an editor in a group. `spec` = { kind, file?, line? }. By default it opens
// as a reused *preview* tab (single-click); pass { preview:false } to make it a
// permanent tab (double-click / pin). If the editor is already open anywhere, we
// focus that tab instead of creating a duplicate.
export function openInGroup(state, spec, opts = {}) {
  const preview = opts.preview ?? true
  let targetGroupId = opts.groupId ?? state.activeGroupId
  if (!groupOf(state, targetGroupId)) targetGroupId = state.activeGroupId
  const key = specKey(spec)

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
  const tab = { id, kind: spec.kind, file: spec.file, line: spec.line, preview, pinned: false }
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
          tabs[pvIdx] = tab
          return { ...g, tabs, activeTabId: id, mru: pushMru(g.mru, id) }
        }
      }
      return { ...g, tabs: [...g.tabs, tab], activeTabId: id, mru: pushMru(g.mru, id) }
    }),
  }
}

function freshGroup(seq) {
  const gid = 'g' + (seq + 1)
  const tid = 't' + (seq + 2)
  return {
    group: { id: gid, tabs: [{ id: tid, kind: 'readme', preview: false, pinned: false }], activeTabId: tid, mru: [tid] },
    seq: seq + 2,
  }
}

function removeGroup(state, groupId) {
  const groups = state.groups.filter(g => g.id !== groupId)
  if (groups.length === 0) {
    const { group, seq } = freshGroup(state.seq)
    return { ...state, seq, groups: [group], activeGroupId: group.id }
  }
  const activeGroupId = state.activeGroupId === groupId ? groups[groups.length - 1].id : state.activeGroupId
  return { ...state, groups, activeGroupId }
}

export function closeTab(state, groupId, tabId) {
  const g = groupOf(state, groupId)
  if (!g) return state
  const tabs = g.tabs.filter(t => t.id !== tabId)
  if (tabs.length === 0) return removeGroup(state, groupId)
  const mru = g.mru.filter(x => x !== tabId)
  const activeTabId = g.activeTabId === tabId ? (mru[0] ?? tabs[tabs.length - 1].id) : g.activeTabId
  return { ...state, groups: state.groups.map(x => x.id === groupId ? { ...x, tabs, activeTabId, mru } : x) }
}

export function closeOthers(state, groupId, tabId) {
  const g = groupOf(state, groupId)
  if (!g) return state
  const tabs = g.tabs.filter(t => t.id === tabId || t.pinned)
  const ids = new Set(tabs.map(t => t.id))
  return { ...state, groups: state.groups.map(x => x.id === groupId
    ? { ...x, tabs, activeTabId: tabId, mru: x.mru.filter(i => ids.has(i)) }
    : x) }
}

export function closeAll(state, groupId) {
  const g = groupOf(state, groupId)
  if (!g) return state
  const tabs = g.tabs.filter(t => t.pinned)
  if (tabs.length === 0) return removeGroup(state, groupId)
  const ids = new Set(tabs.map(t => t.id))
  return { ...state, groups: state.groups.map(x => x.id === groupId
    ? { ...x, tabs, activeTabId: tabs[tabs.length - 1].id, mru: x.mru.filter(i => ids.has(i)) }
    : x) }
}

// Close an entire editor group (Ctrl+K W).
export function closeGroup(state, groupId) {
  return groupOf(state, groupId) ? removeGroup(state, groupId) : state
}

export function setPinned(state, groupId, tabId, pinned) {
  return { ...state, groups: state.groups.map(g => {
    if (g.id !== groupId) return g
    const tabs = sortPinned(g.tabs.map(t => t.id === tabId ? { ...t, pinned, preview: pinned ? false : t.preview } : t))
    return { ...g, tabs }
  }) }
}

export function setActiveTab(state, groupId, tabId) {
  return { ...state, activeGroupId: groupId, groups: state.groups.map(g => g.id === groupId
    ? { ...g, activeTabId: tabId, mru: pushMru(g.mru, tabId) }
    : g) }
}

export function focusGroup(state, groupId) {
  return groupOf(state, groupId) ? { ...state, activeGroupId: groupId } : state
}
export function focusGroupByIndex(state, idx) {
  const g = state.groups[idx]
  return g ? { ...state, activeGroupId: g.id } : state
}

// Move a tab to a position in another (or the same) group; used by drag-and-drop.
export function moveTab(state, fromGroupId, tabId, toGroupId, index) {
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
  // Source may now be empty → drop it.
  const src = groupOf(next, fromGroupId)
  if (src && src.tabs.length === 0) next = removeGroup(next, fromGroupId)
  return next
}

// Split: clone the active tab of `groupId` into a brand-new group to its right.
export function splitGroup(state, groupId = state.activeGroupId) {
  const g = groupOf(state, groupId)
  if (!g) return state
  const src = g.tabs.find(t => t.id === g.activeTabId) || g.tabs[0]
  const seq = state.seq + 1
  const gid = 'g' + seq
  const tid = 't' + seq + 'b'
  const clone = src
    ? { ...src, id: tid, preview: false }
    : { id: tid, kind: 'readme', preview: false, pinned: false }
  const newGroup = { id: gid, tabs: [clone], activeTabId: tid, mru: [tid] }
  const idx = state.groups.findIndex(x => x.id === groupId)
  const groups = state.groups.slice()
  groups.splice(idx + 1, 0, newGroup)
  return { ...state, seq, groups, activeGroupId: gid }
}

// Move a tab out into a brand-new group placed after `afterGroupId` (drag-to-split).
export function moveTabToNewGroup(state, fromGroupId, tabId, afterGroupId) {
  const from = groupOf(state, fromGroupId)
  if (!from) return state
  const tab = from.tabs.find(t => t.id === tabId)
  if (!tab) return state
  // A single-tab group dropped onto its own edge is a no-op.
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

// Cycle tabs within the active group (Ctrl+PageUp / PageDown).
export function cycleTab(state, dir) {
  const g = activeGroupOf(state)
  if (!g || g.tabs.length < 2) return state
  const i = g.tabs.findIndex(t => t.id === g.activeTabId)
  const next = g.tabs[(i + dir + g.tabs.length) % g.tabs.length]
  return setActiveTab(state, g.id, next.id)
}

// MRU switch within the active group (Ctrl+Tab) — jump to previously-used tab.
export function mruSwitch(state) {
  const g = activeGroupOf(state)
  if (!g || g.mru.length < 2) return state
  return setActiveTab(state, g.id, g.mru[1])
}

// ── Persistence ───────────────────────────────────────────────────────────────
// Serialize just enough to reopen the layout (no scroll/line). Files reopen fresh.
export function serializeEditor(state) {
  return {
    groups: state.groups.map(g => ({
      tabs: g.tabs.map(t => ({ kind: t.kind, file: t.file, pinned: t.pinned })),
      active: g.tabs.findIndex(t => t.id === g.activeTabId),
    })),
    activeGroupIndex: state.groups.findIndex(g => g.id === state.activeGroupId),
  }
}

export function deserializeEditor(data) {
  try {
    if (!data || !Array.isArray(data.groups) || data.groups.length === 0) return null
    let seq = 0
    const groups = data.groups.map(g => {
      const tabs = (g.tabs || [])
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
