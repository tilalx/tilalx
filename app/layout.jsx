import { cookies } from 'next/headers'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import './globals.css'
import Track from './Track'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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

const THEMES = {
  'Catppuccin Mocha': { '--ide-bg': '#1e1e2e', '--ide-bg2': '#181825', '--ide-bg3': '#11111b', '--ide-border': '#313244', '--ide-accent': '#89b4fa', '--ide-fg': '#cdd6f4', '--ide-fg2': '#a6adc8', '--ide-muted': '#6c7086' },
  'One Dark Pro':     { '--ide-bg': '#282c34', '--ide-bg2': '#21252b', '--ide-bg3': '#1a1d23', '--ide-border': '#3e4451', '--ide-accent': '#61afef', '--ide-fg': '#abb2bf', '--ide-fg2': '#9da5b4', '--ide-muted': '#5c6370' },
  'GitHub Dark':      { '--ide-bg': '#0d1117', '--ide-bg2': '#161b22', '--ide-bg3': '#010409', '--ide-border': '#30363d', '--ide-accent': '#58a6ff', '--ide-fg': '#c9d1d9', '--ide-fg2': '#8b949e', '--ide-muted': '#484f58' },
  'Tokyo Night':      { '--ide-bg': '#1a1b26', '--ide-bg2': '#16161e', '--ide-bg3': '#13131a', '--ide-border': '#292e42', '--ide-accent': '#7aa2f7', '--ide-fg': '#c0caf5', '--ide-fg2': '#a9b1d6', '--ide-muted': '#565f89' },
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
