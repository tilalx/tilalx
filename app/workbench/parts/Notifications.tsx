'use client'

import { Codicon } from '../icons'

export interface Notification { id: number; message: string; severity: 'info' | 'warning' | 'error' }

export default function Notifications({ items, onDismiss }: { items: Notification[]; onDismiss(id: number): void }) {
  if (!items.length) return null
  return (
    <div className="notifications-toasts" role="alert">
      {items.slice(-3).map(n => (
        <div key={n.id} className="notification-toast">
          <Codicon name={n.severity} className={`severity ${n.severity}`} />
          <span className="message">{n.message}</span>
          <button className="action-label" title="Clear Notification" onClick={() => onDismiss(n.id)}><Codicon name="close" /></button>
        </div>
      ))}
    </div>
  )
}
