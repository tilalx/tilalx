import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'

export const README_OUTLINE = [
  { level: 'h1', text: "Hi, I'm Tilo Alexander", anchor: null                   },
  { level: 'h2', text: '## about',               anchor: 'readme-about'         },
  { level: 'h2', text: '## stack',               anchor: 'readme-stack'         },
  { level: 'h2', text: '## repositories',        anchor: 'readme-repositories'  },
  { level: 'h2', text: '## contributions',       anchor: 'readme-contributions' },
  { level: 'h2', text: '## contact',             anchor: 'readme-contact'       },
]

interface ViewAction { title: string; icon: ReactNode; onClick: () => void }

export function ViewTitle({ title, actions = [] }: { title: string; actions?: ViewAction[] }) {
  return (
    <div className="ide-sidebar-title">
      <span className="ide-view-title-label">{title}</span>
      <div className="ide-view-actions">
        {actions.map(a => (
          <button key={a.title} className="ide-view-action" title={a.title} aria-label={a.title} onClick={a.onClick}>{a.icon}</button>
        ))}
      </div>
    </div>
  )
}

const typeNav = { text: '', at: 0 }

export function treeKeyDown(e: ReactKeyboardEvent<HTMLElement>) {
  const rows = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"]')]
  if (!rows.length || e.ctrlKey || e.metaKey || e.altKey) return
  const cur = rows.indexOf(document.activeElement as HTMLElement)
  const row = rows[cur]
  const focus = (i: number) => rows[Math.max(0, Math.min(rows.length - 1, i))].focus()
  const expanded = row?.getAttribute('aria-expanded')
  switch (e.key) {
    case 'ArrowDown': focus(cur + 1); break
    case 'ArrowUp':   focus(cur < 0 ? 0 : cur - 1); break
    case 'Home':      focus(0); break
    case 'End':       focus(rows.length - 1); break
    case 'ArrowRight':
      if (expanded === 'false') row.click()
      else if (expanded === 'true') focus(cur + 1)
      break
    case 'ArrowLeft': {
      if (expanded === 'true') { row.click(); break }
      const level = Number(row?.getAttribute('aria-level') || 1)
      for (let i = cur - 1; i >= 0; i--) {
        if (Number(rows[i].getAttribute('aria-level') || 1) < level) { focus(i); break }
      }
      break
    }
    case 'Enter': case ' ': if (row) row.click(); break
    default: {
      if (e.key.length !== 1) return
      const now = Date.now()
      typeNav.text = (now - typeNav.at < 800 ? typeNav.text : '') + e.key.toLowerCase()
      typeNav.at = now
      const order = [...rows.slice(cur + (typeNav.text.length === 1 ? 1 : 0)), ...rows]
      // Skip the icon glyph so typing matches the row's name.
      const label = (r: HTMLElement) => (r.textContent ?? '').slice(r.querySelector('.ide-file-icon')?.textContent?.length ?? 0).trim().toLowerCase()
      order.find(r => label(r).startsWith(typeNav.text))?.focus()
    }
  }
  e.preventDefault()
}
