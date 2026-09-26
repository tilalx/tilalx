import { useCallback, useEffect, useRef, useState } from 'react'
import { THEMES, DEFAULT_THEME } from './constants'
import type { SettingValue } from './constants'
import type { Settings } from './types'

// Saved settings load after mount, so the first client render matches the server.
export function useSettings() {
  const [settings, setSettings] = useState<Settings>({ 'memes.autoPlay': false, 'memes.interval': 10, 'editor.fontSize': 13, 'network.showLog': true })
  const setSetting = useCallback((k: string, v: SettingValue) => setSettings(p => ({ ...p, [k]: v })), [])
  const toggleWordWrap = () => setSettings(p => ({ ...p, 'editor.wordWrap': (p['editor.wordWrap'] ?? 'off') === 'off' ? 'on' : 'off' }))

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ide-settings') || '{}')
      if (saved && typeof saved === 'object') setSettings(p => ({ ...p, ...saved }))
    } catch {}
  }, [])

  const firstWriteRef = useRef(true)
  useEffect(() => {
    if (firstWriteRef.current) { firstWriteRef.current = false; return }
    const str = JSON.stringify(settings)
    try { localStorage.setItem('ide-settings', str) } catch {}
    document.cookie = `ide-settings=${encodeURIComponent(str)}; path=/; max-age=31536000; SameSite=Lax`
  }, [settings])

  const fontSize  = Math.min(24, Math.max(10, Number(settings['editor.fontSize']) || 13))
  const themeVars = THEMES[settings['workbench.colorTheme'] as string] || THEMES[DEFAULT_THEME]

  useEffect(() => {
    document.documentElement.style.setProperty('--ide-font-size', `${fontSize}px`)
  }, [fontSize])

  useEffect(() => {
    Object.entries(themeVars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))
  }, [themeVars])

  return { settings, setSetting, toggleWordWrap, fontSize, themeVars }
}
