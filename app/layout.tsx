import { cookies } from 'next/headers'
import type { CSSProperties, ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import type { Settings } from './ide/types'
import './globals.css'
import '@xterm/xterm/css/xterm.css'
import { THEMES, DEFAULT_THEME } from './ide/constants'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'tilalx',
  description: 'Personal page — Tilo Alexander',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  manifest: '/manifest.json',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  let settings: Settings = {}
  try {
    const raw = cookieStore.get('ide-settings')?.value
    if (raw) settings = JSON.parse(decodeURIComponent(raw))
  } catch {}

  const theme    = THEMES[settings['workbench.colorTheme'] as string] || THEMES[DEFAULT_THEME]
  const fontSize = Math.min(24, Math.max(10, Number(settings['editor.fontSize']) || 13))
  const htmlStyle = { ...theme, '--ide-font-size': `${fontSize}px` } as CSSProperties

  return (
    <html lang="en" style={htmlStyle}>
      <body>
        {children}
      </body>
    </html>
  )
}
