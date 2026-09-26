import { useState, useMemo } from 'react'
import { LANG_COLORS } from '../constants'
import { IconChevron } from '../icons'
import { ViewTitle } from './shared'
import type { StackItem } from '../types'

const EXTENSIONS_BASE = [
  { category: 'Languages',               name: 'TypeScript',  desc: 'TypeScript language support',    version: '5.4.2',  enabled: true  },
  { category: 'Languages',               name: 'JavaScript',  desc: 'JavaScript language features',   version: '1.91.0', enabled: true  },
  { category: 'Languages',               name: 'Python',      desc: 'Python IntelliSense',            version: '2024.4', enabled: true  },
  { category: 'Languages',               name: 'Java',        desc: 'Java language support',          version: '1.28.0', enabled: true  },
  { category: 'Languages',               name: 'Shell',       desc: 'ShellScript language support',   version: '0.9.0',  enabled: true  },
  { category: 'Languages',               name: 'Nix',         desc: 'Nix expression language',        version: '0.7.0',  enabled: true  },
  { category: 'Frameworks & Runtimes',   name: 'Next.js',     desc: 'Next.js snippets & tools',       version: '0.0.12', enabled: true  },
  { category: 'Frameworks & Runtimes',   name: 'React',       desc: 'React snippets & IntelliSense',  version: '0.3.1',  enabled: true  },
  { category: 'Frameworks & Runtimes',   name: 'Node.js',     desc: 'Node.js runtime support',        version: '22.0.0', enabled: true  },
  { category: 'DevOps & Infrastructure', name: 'Docker',      desc: 'Dockerfile language features',   version: '1.29.0', enabled: true  },
  { category: 'DevOps & Infrastructure', name: 'Terraform',   desc: 'HashiCorp Terraform',            version: '2.31.0', enabled: true  },
  { category: 'DevOps & Infrastructure', name: 'Ansible',     desc: 'Ansible automation support',     version: '1.2.3',  enabled: true  },
  { category: 'DevOps & Infrastructure', name: 'Kubernetes',  desc: 'Kubernetes YAML schemas',        version: '1.3.11', enabled: false },
]

export default function ExtensionsPanel({ stack }: { stack: StackItem[] }) {
  const [extQuery, setExtQuery] = useState('')
  const [toggles, setToggles] = useState(() => Object.fromEntries(EXTENSIONS_BASE.map(e => [e.name, e.enabled])))

  const allExtensions = useMemo(() => {
    const names = new Set(EXTENSIONS_BASE.map(e => e.name))
    const fromStack = (stack || [])
      .filter(s => !names.has(s.name))
      .map(s => ({ category: 'Languages', name: s.name, desc: `${s.name} language support`, version: '—', enabled: true }))
    return [...EXTENSIONS_BASE, ...fromStack]
  }, [stack])

  const filtered = useMemo(() => {
    if (!extQuery.trim()) return allExtensions
    const q = extQuery.toLowerCase()
    return allExtensions.filter(e => e.name.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q))
  }, [allExtensions, extQuery])

  const categories = useMemo(() => [...new Set(filtered.map(e => e.category))], [filtered])

  return (
    <div className="ide-sidebar">
      <ViewTitle title="Extensions" />
      <div style={{ padding: '8px 8px 4px' }}>
        <input
          className="ide-search-input"
          placeholder="Search Extensions"
          value={extQuery}
          onChange={e => setExtQuery(e.target.value)}
        />
      </div>
      {categories.map(cat => (
        <div key={cat} className="ide-section">
          <div className="ide-section-header">
            <IconChevron open={true} />
            <span style={{ flex: 1 }}>{cat.toUpperCase()}</span>
            <span className="ide-section-badge">{filtered.filter(e => e.category === cat).length}</span>
          </div>
          {filtered.filter(e => e.category === cat).map(ext => (
            <div key={ext.name} className="ide-ext-item">
              <span className="ide-ext-icon" style={{ background: LANG_COLORS[ext.name] || 'var(--ide-surface)' }} />
              <div className="ide-ext-info">
                <div className="ide-ext-name">{ext.name}</div>
                <div className="ide-ext-desc">{ext.desc}</div>
              </div>
              <div className="ide-ext-right">
                <span className="ide-ext-ver">{ext.version}</span>
                <button
                  className={`ide-ext-toggle${toggles[ext.name] !== false ? ' on' : ''}`}
                  onClick={() => setToggles(t => ({ ...t, [ext.name]: !t[ext.name] }))}
                  title={toggles[ext.name] !== false ? 'Disable' : 'Enable'}
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
