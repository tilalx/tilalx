import { cookies } from 'next/headers'
import type { CSSProperties, ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import './workbench/vendor/codicon.css'
import '@xterm/xterm/css/xterm.css'
import './workbench/workbench.css'
import './workbench/components.css'
import './workbench/editors/markdown-preview.css'
import { THEMES, themeCssVars } from './workbench/theme'
import { SETTINGS_COOKIE, parseSettings } from './workbench/settings'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'tilalx',
  description: 'Personal page — Tilo Alexander',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
  manifest: '/manifest.json',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const settings = parseSettings((await cookies()).get(SETTINGS_COOKIE)?.value)
  const theme = THEMES[settings['workbench.colorTheme']]
  const style = { ...themeCssVars(theme), colorScheme: theme.type } as CSSProperties

  return (
    <html lang="en" style={style} data-theme={theme.type}>
      <body>{children}</body>
    </html>
  )
}
