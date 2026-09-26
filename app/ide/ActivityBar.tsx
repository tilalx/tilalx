import { IconFiles, IconSearch, IconGit, IconExtensions, IconSettings, IconAccount } from './icons'

const IconChat = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
)

export interface ActivityBarProps {
  active:            string
  onSelect:          (id: string) => void
  secondaryActive:   boolean
  onToggleSecondary: () => void
}

export default function ActivityBar({ active, onSelect, secondaryActive, onToggleSecondary }: ActivityBarProps) {
  const buttons = [
    { id: 'explorer',   Icon: IconFiles,      title: 'Explorer (Ctrl+Shift+E)'       },
    { id: 'search',     Icon: IconSearch,     title: 'Search (Ctrl+Shift+F)'         },
    { id: 'git',        Icon: IconGit,        title: 'Source Control (Ctrl+Shift+G)' },
    { id: 'extensions', Icon: IconExtensions, title: 'Extensions (Ctrl+Shift+X)'     },
  ]
  return (
    <div className="ide-activity-bar">
      {buttons.map(({ id, Icon, title }) => (
        <button
          key={id}
          className={`ide-act-btn${active === id ? ' active' : ''}`}
          onClick={() => onSelect(id)}
          title={title}
          aria-label={title}
          aria-pressed={active === id}
        >
          <Icon />
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button
        className={`ide-act-btn${secondaryActive ? ' active' : ''}`}
        title="Chat (Ctrl+Alt+B)"
        onClick={onToggleSecondary}
      >
        <IconChat />
      </button>
      <a
        className="ide-act-btn"
        href="https://github.com/tilalx"
        target="_blank" rel="noopener noreferrer"
        title="Accounts: tilalx (GitHub)"
        aria-label="Accounts"
      >
        <IconAccount />
      </a>
      <button
        className="ide-act-btn"
        title="Manage (Ctrl+,)"
        aria-label="Manage"
        onClick={() => onSelect('settings')}
      >
        <IconSettings />
      </button>
    </div>
  )
}
