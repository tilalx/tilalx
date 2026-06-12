

import { IconFiles, IconSearch, IconGit, IconExtensions, IconSettings } from './icons'

const IconChat = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
)

export default function ActivityBar({ active, onSelect, secondaryActive, onToggleSecondary }) {
  const buttons = [
    { id: 'explorer',   Icon: IconFiles      },
    { id: 'search',     Icon: IconSearch     },
    { id: 'git',        Icon: IconGit        },
    { id: 'extensions', Icon: IconExtensions },
  ]
  return (
    <div className="ide-activity-bar">
      {buttons.map(({ id, Icon }) => (
        <button
          key={id}
          className={`ide-act-btn${active === id ? ' active' : ''}`}
          onClick={() => onSelect(id)}
          title={id}
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
      <button
        className={`ide-act-btn${active === 'settings' ? ' active' : ''}`}
        style={{ marginBottom: 4 }}
        title="settings"
        onClick={() => onSelect('settings')}
      >
        <IconSettings />
      </button>
    </div>
  )
}
