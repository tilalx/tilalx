

import { IconFiles, IconSearch, IconGit, IconExtensions, IconSettings } from './icons'

export default function ActivityBar({ active, onSelect }) {
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
