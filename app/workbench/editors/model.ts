import type { EditorInput, Group, Tab } from '../types'

export interface EditorsState { groups: Group[]; activeGroup: number; nextGroupId: number }

const MAX_GROUPS = 3

export function inputId(input: EditorInput): string {
  switch (input.type) {
    case 'file':      return `file:${input.path}`
    case 'preview':   return `preview:${input.path}`
    case 'extension': return `extension:${input.name}`
    default:          return input.type
  }
}

export function initialEditors(inputs: EditorInput[], active = 0): EditorsState {
  const tabs = inputs.map(input => ({ id: inputId(input), input, preview: false }))
  const activeId = tabs[active]?.id ?? null
  return {
    groups: [{ id: 1, tabs, active: activeId, mru: activeId ? [activeId, ...tabs.map(t => t.id).filter(id => id !== activeId)] : [] }],
    activeGroup: 1,
    nextGroupId: 2,
  }
}

export function activeGroupOf(s: EditorsState): Group {
  return s.groups.find(g => g.id === s.activeGroup) ?? s.groups[0]
}

export function activeTabOf(s: EditorsState): Tab | null {
  const g = activeGroupOf(s)
  return g.tabs.find(t => t.id === g.active) ?? null
}

function updateGroup(s: EditorsState, id: number, fn: (g: Group) => Group): EditorsState {
  return { ...s, groups: s.groups.map(g => g.id === id ? fn(g) : g) }
}

function activate(g: Group, id: string): Group {
  return { ...g, active: id, mru: [id, ...g.mru.filter(m => m !== id)] }
}

export interface OpenOptions {
  preview?: boolean
  group?: number | 'side'
  preserveFocus?: boolean
}

export function openEditor(s: EditorsState, input: EditorInput, opts: OpenOptions = {}): EditorsState {
  if (opts.group === 'side') {
    s = splitGroup(s, false)
    opts = { ...opts, group: s.activeGroup }
  }
  const groupId = typeof opts.group === 'number' ? opts.group : s.activeGroup
  const id = inputId(input)
  const next = updateGroup(s, groupId, g => {
    const existing = g.tabs.find(t => t.id === id)
    if (existing) {
      const tabs = opts.preview ? g.tabs : g.tabs.map(t => t.id === id ? { ...t, preview: false } : t)
      return activate({ ...g, tabs }, id)
    }
    const tab: Tab = { id, input, preview: !!opts.preview }
    const previewIdx = g.tabs.findIndex(t => t.preview)
    let tabs: Tab[]
    let mru = g.mru
    if (previewIdx >= 0) {
      mru = mru.filter(m => m !== g.tabs[previewIdx].id)
      tabs = g.tabs.map((t, i) => i === previewIdx ? tab : t)
    } else {
      const at = g.tabs.findIndex(t => t.id === g.active) + 1
      tabs = [...g.tabs.slice(0, at), tab, ...g.tabs.slice(at)]
    }
    return activate({ ...g, tabs, mru }, id)
  })
  return { ...next, activeGroup: groupId }
}

export function pinTab(s: EditorsState, groupId: number, id: string): EditorsState {
  return updateGroup(s, groupId, g => ({ ...g, tabs: g.tabs.map(t => t.id === id ? { ...t, preview: false } : t) }))
}

export function setActiveTab(s: EditorsState, groupId: number, id: string): EditorsState {
  return { ...updateGroup(s, groupId, g => activate(g, id)), activeGroup: groupId }
}

export function focusGroup(s: EditorsState, groupId: number): EditorsState {
  return s.groups.some(g => g.id === groupId) ? { ...s, activeGroup: groupId } : s
}

export function closeTabs(s: EditorsState, groupId: number, ids: string[]): EditorsState {
  const drop = new Set(ids)
  let next = updateGroup(s, groupId, g => {
    const tabs = g.tabs.filter(t => !drop.has(t.id))
    const mru  = g.mru.filter(m => !drop.has(m))
    return { ...g, tabs, mru, active: g.active && !drop.has(g.active) ? g.active : mru[0] ?? null }
  })
  const emptied = next.groups.find(g => g.id === groupId)
  if (emptied && emptied.tabs.length === 0 && next.groups.length > 1) {
    const idx    = next.groups.findIndex(g => g.id === groupId)
    const groups = next.groups.filter(g => g.id !== groupId)
    const fallback = groups[Math.max(0, idx - 1)].id
    next = { ...next, groups, activeGroup: next.activeGroup === groupId ? fallback : next.activeGroup }
  }
  return next
}

export function closeOthers(s: EditorsState, groupId: number, keep: string): EditorsState {
  const g = s.groups.find(x => x.id === groupId)
  return g ? closeTabs(setActiveTab(s, groupId, keep), groupId, g.tabs.filter(t => t.id !== keep).map(t => t.id)) : s
}

export function closeToRight(s: EditorsState, groupId: number, from: string): EditorsState {
  const g = s.groups.find(x => x.id === groupId)
  if (!g) return s
  const idx = g.tabs.findIndex(t => t.id === from)
  return closeTabs(s, groupId, g.tabs.slice(idx + 1).map(t => t.id))
}

export function closeAll(s: EditorsState): EditorsState {
  return { groups: [{ id: s.groups[0].id, tabs: [], active: null, mru: [] }], activeGroup: s.groups[0].id, nextGroupId: s.nextGroupId }
}

export function splitGroup(s: EditorsState, copyActive = true): EditorsState {
  if (s.groups.length >= MAX_GROUPS) {
    const idx = s.groups.findIndex(g => g.id === s.activeGroup)
    return { ...s, activeGroup: s.groups[Math.min(idx + 1, s.groups.length - 1)].id }
  }
  const src  = activeGroupOf(s)
  const tab  = copyActive ? src.tabs.find(t => t.id === src.active) : undefined
  const group: Group = tab
    ? { id: s.nextGroupId, tabs: [{ ...tab, preview: false }], active: tab.id, mru: [tab.id] }
    : { id: s.nextGroupId, tabs: [], active: null, mru: [] }
  const at = s.groups.findIndex(g => g.id === src.id) + 1
  return { groups: [...s.groups.slice(0, at), group, ...s.groups.slice(at)], activeGroup: group.id, nextGroupId: s.nextGroupId + 1 }
}

export function moveTab(s: EditorsState, from: number, id: string, to: number, index: number): EditorsState {
  const src = s.groups.find(g => g.id === from)
  const tab = src?.tabs.find(t => t.id === id)
  if (!src || !tab) return s
  if (from === to) {
    return updateGroup(s, from, g => {
      const rest = g.tabs.filter(t => t.id !== id)
      const at   = Math.min(index > g.tabs.indexOf(tab) ? index - 1 : index, rest.length)
      return { ...g, tabs: [...rest.slice(0, at), { ...tab, preview: false }, ...rest.slice(at)] }
    })
  }
  let next = updateGroup(s, to, g => {
    const rest = g.tabs.filter(t => t.id !== id)
    const at   = Math.min(index, rest.length)
    return activate({ ...g, tabs: [...rest.slice(0, at), { ...tab, preview: false }, ...rest.slice(at)] }, id)
  })
  next = closeTabs(next, from, [id])
  return { ...next, activeGroup: to }
}

export function cycleTab(s: EditorsState, delta: number): EditorsState {
  const g = activeGroupOf(s)
  if (g.tabs.length < 2) return s
  const idx = g.tabs.findIndex(t => t.id === g.active)
  return setActiveTab(s, g.id, g.tabs[(idx + delta + g.tabs.length) % g.tabs.length].id)
}

export function findTab(s: EditorsState, id: string): { group: Group; tab: Tab } | null {
  for (const group of s.groups) {
    const tab = group.tabs.find(t => t.id === id)
    if (tab) return { group, tab }
  }
  return null
}
