'use client'

import { useWorkbench } from '../context'
import { Codicon } from '../icons'
import { timeAgo } from '../format'

const SHORT_NAMES: Record<string, string> = {
  TypeScript: 'TS', JavaScript: 'JS', Python: 'Py', Java: 'Java', Go: 'Go', 'C++': 'C++', C: 'C', 'C#': 'C#',
  CSS: 'CSS', HTML: 'HTML', Shell: 'sh', Vue: 'Vue', Rust: 'Rs', Kotlin: 'Kt', Swift: 'Sw', Ruby: 'Rb', PHP: 'PHP',
  Dart: 'Dart', Nix: 'Nix', HCL: 'HCL', Dockerfile: 'DF', Groovy: 'Gy',
  Docker: 'Dkr', Kubernetes: 'K8s', Terraform: 'TF', Ansible: 'A', Jenkins: 'Jk',
}

export function ExtensionIcon({ name, color, size }: { name: string; color: string; size: number }) {
  const label = SHORT_NAMES[name] ?? name.replace(/[^A-Za-z0-9#+]/g, '').slice(0, 2)
  const scale = label.length <= 2 ? 0.38 : label.length === 3 ? 0.32 : 0.26
  return (
    <span className="extension-icon" style={{ width: size, height: size, background: color, fontSize: size * scale }}>
      {label}
    </span>
  )
}

export default function ExtensionEditor({ name }: { name: string }) {
  const { data } = useWorkbench()
  const item  = data.stack.find(s => s.name === name)
  const repos = data.repos.filter(r => r.language === name && !r.fork)
  const stars = repos.reduce((n, r) => n + r.stars, 0)
  const last  = repos.map(r => r.pushed_at).sort().at(-1)

  return (
    <div className="extension-editor scrollable">
      <div className="extension-header">
        <ExtensionIcon name={name} color={item?.color ?? '#858585'} size={128} />
        <div className="extension-details">
          <div className="extension-name">{name}</div>
          <div className="extension-subtitle">
            <span className="publisher"><Codicon name="verified-filled" /> tilalx</span>
            <span className="sep">|</span>
            <span><Codicon name="repo" /> {repos.length} {repos.length === 1 ? 'repository' : 'repositories'}</span>
            <span className="sep">|</span>
            <span><Codicon name="star-full" /> {stars}</span>
          </div>
          <div className="extension-description">
            {name} as used across my public GitHub repositories{last ? `, last pushed ${timeAgo(last)} ago` : ''}.
          </div>
          <div className="extension-actions">
            <button className="monaco-button secondary" disabled>Installed</button>
            <a className="monaco-button" href={`https://github.com/tilalx?tab=repositories&language=${encodeURIComponent(name.toLowerCase())}`} target="_blank" rel="noopener noreferrer">
              View on GitHub
            </a>
          </div>
        </div>
      </div>
      <div className="extension-tabs"><span className="active">Details</span></div>
      <div className="extension-body markdown-body">
        <h2>Repositories</h2>
        {repos.length === 0 ? <p>No public repositories in {name}.</p> : (
          <table>
            <thead><tr><th>Name</th><th>Description</th><th>Stars</th><th>Updated</th></tr></thead>
            <tbody>
              {repos.map(r => (
                <tr key={r.name}>
                  <td><a href={r.url} target="_blank" rel="noopener noreferrer">{r.name}</a></td>
                  <td>{r.description ?? ''}</td>
                  <td>{r.stars}</td>
                  <td>{timeAgo(r.pushed_at)} ago</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
