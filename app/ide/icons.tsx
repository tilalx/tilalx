import type { ReactNode } from 'react'

export const IconFiles = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
)

export const IconSearch = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
)

export const IconGit = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
    <path d="M6 9v6M15 18H9"/>
  </svg>
)

export const IconExtensions = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="7" width="7" height="7"/><rect x="15" y="7" width="7" height="7"/>
    <rect x="2" y="15" width="7" height="7"/><path d="M9 10.5h6M12 7.5v6"/>
  </svg>
)

export const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)

export const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    width="10" height="10" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2"
    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s', flexShrink: 0 }}
  >
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

export const IconExternalLink = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.5 }}>
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)

export const IconFork = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.6 }}>
    <circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/>
    <path d="M6 9v2a3 3 0 003 3h6a3 3 0 003-3V9"/>
    <line x1="12" y1="12" x2="12" y2="15"/>
  </svg>
)

const SETI_NAMES: Record<string, [string, string]> = {
  'package.json': ['⬢', '#cc3e44'],
  'dockerfile':   ['◈', '#519aba'],
  'jenkinsfile':  ['⚙', '#d4d7d6'],
  '.gitignore':   ['◆', '#f1502f'],
  'readme.md':    ['ℹ', '#519aba'],
  'license':      ['§', '#cbcb41'],
}
const SETI_EXT: Record<string, [string, string]> = {
  ts:   ['TS', '#519aba'], tsx: ['⚛', '#519aba'], mts: ['TS', '#519aba'],
  js:   ['JS', '#cbcb41'], jsx: ['⚛', '#cbcb41'], mjs: ['JS', '#cbcb41'], cjs: ['JS', '#cbcb41'],
  json: ['{}', '#cbcb41'], webmanifest: ['{}', '#cbcb41'],
  css:  ['#',  '#519aba'], scss: ['#', '#f55385'],
  md:   ['M↓', '#519aba'], txt: ['≡', '#6d8086'], log: ['≡', '#cbcb41'],
  svg:  ['◧',  '#a074c4'], png: ['◧', '#a074c4'], jpg: ['◧', '#a074c4'], ico: ['◧', '#a074c4'],
  yml:  ['!',  '#a074c4'], yaml: ['!', '#a074c4'], sh: ['$', '#4d5a5e'], lock: ['⚿', '#8dc149'],
  feed: ['▶',  '#e37933'],
}
const SETI_DEFAULT: [string, string] = ['≡', '#6d8086']

function fileIconFor(name: string): [string, string] {
  const lower = name.toLowerCase()
  if (SETI_NAMES[lower]) return SETI_NAMES[lower]
  const ext = lower.includes('.') ? lower.split('.').pop()! : ''
  return SETI_EXT[ext] ?? SETI_DEFAULT
}

export function FileIcon({ name }: { name: string }) {
  const [glyph, color] = fileIconFor(name)
  return <span className={`ide-file-icon${glyph.length > 1 ? ' wide' : ''}`} style={{ color }} aria-hidden="true">{glyph}</span>
}

const Cod = ({ children, size = 16 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const IconAdd           = () => <Cod><path d="M8 3v10M3 8h10"/></Cod>
export const IconSplitH        = () => <Cod><rect x="2.5" y="2.5" width="11" height="11" rx="1"/><path d="M8 2.5v11"/></Cod>
export const IconTrash         = () => <Cod><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5M7 7v4M9 7v4"/></Cod>
export const IconClose         = () => <Cod><path d="M4 4l8 8M12 4l-8 8"/></Cod>
export const IconMaximize      = () => <Cod><path d="M4 10l4-4 4 4M4 13h8"/></Cod>
export const IconRestore       = () => <Cod><path d="M4 6l4 4 4-4M4 3h8"/></Cod>
export const IconArrowLeft     = () => <Cod><path d="M13 8H3M7 4L3 8l4 4"/></Cod>
export const IconArrowRight    = () => <Cod><path d="M3 8h10M9 4l4 4-4 4"/></Cod>
export const IconSearchSmall   = () => <Cod size={14}><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></Cod>
export const IconBell          = () => <Cod size={14}><path d="M4 11V7a4 4 0 018 0v4l1.5 1.5h-11zM6.5 14h3"/></Cod>
export const IconRemote        = () => <Cod size={14}><path d="M2 6l3.5 3.5L2 13M14 3l-3.5 3.5L14 10"/></Cod>
export const IconError         = () => <Cod size={14}><circle cx="8" cy="8" r="5.5"/><path d="M6 6l4 4M10 6l-4 4"/></Cod>
export const IconWarning       = () => <Cod size={14}><path d="M8 2.5l6 11H2zM8 7v3M8 11.8v.2"/></Cod>
export const IconAccount       = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="10" r="3.5"/><path d="M5.5 18.5a7.5 7.5 0 0113 0"/>
  </svg>
)
export const IconLayoutSidebar = ({ on }: { on: boolean }) => <Cod><rect x="2" y="3" width="12" height="10" rx="1"/><rect x="2" y="3" width="4" height="10" fill={on ? 'currentColor' : 'none'}/></Cod>
export const IconLayoutPanel   = ({ on }: { on: boolean }) => <Cod><rect x="2" y="3" width="12" height="10" rx="1"/><rect x="2" y="9" width="12" height="4" fill={on ? 'currentColor' : 'none'}/></Cod>
export const IconLayoutAux     = ({ on }: { on: boolean }) => <Cod><rect x="2" y="3" width="12" height="10" rx="1"/><rect x="10" y="3" width="4" height="10" fill={on ? 'currentColor' : 'none'}/></Cod>
export const IconCollapseAll   = () => <Cod><path d="M5 2.5h8.5V11M2.5 5h8.5v8.5H2.5zM4.5 9.25h4.5"/></Cod>
export const IconExpandAll     = () => <Cod><path d="M5 2.5h8.5V11M2.5 5h8.5v8.5H2.5zM4.5 9.25h4.5M6.75 7v4.5"/></Cod>
export const IconClearAll      = () => <Cod><path d="M2.5 4h9M2.5 7.5h6M2.5 11h4M9.5 9.5l4 4M13.5 9.5l-4 4"/></Cod>
