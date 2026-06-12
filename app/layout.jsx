import { cookies } from 'next/headers'
import './globals.css'
import '@xterm/xterm/css/xterm.css'
import Track from './Track'
import { THEMES } from './ide/constants'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata = {
  title: 'tilalx',
  description: 'Personal page — Tilo Alexander',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  manifest: '/manifest.json',
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies()
  let settings = {}
  try {
    const raw = cookieStore.get('ide-settings')?.value
    if (raw) settings = JSON.parse(decodeURIComponent(raw))
  } catch {}

  const theme    = THEMES[settings['workbench.colorTheme']] || THEMES['Catppuccin Mocha']
  const fontSize = Math.min(24, Math.max(10, Number(settings['editor.fontSize']) || 13))
  const htmlStyle = { ...theme, '--ide-font-size': `${fontSize}px` }

  return (
    <html lang="en" style={htmlStyle}>
      <body>
        <Track />
        {children}
      </body>
    </html>
  )
}
