import { useEffect, useRef } from 'react'
import type { WorkbenchActions } from './commands'

const VIEW_KEYS: Record<string, string> = { e: 'explorer', f: 'search', g: 'git', x: 'extensions' }

export function useKeybindings(actions: WorkbenchActions, settingsOpen: boolean, zenMode: boolean) {
  const latest = useRef({ actions, settingsOpen, zenMode })
  useEffect(() => { latest.current = { actions, settingsOpen, zenMode } })

  useEffect(() => {
    let chordAt = 0
    let lastEscAt = 0

    const onKey = (e: KeyboardEvent) => {
      const { actions: a, settingsOpen, zenMode } = latest.current
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key

      if (k === 'Escape') {
        if (settingsOpen) { a.closeSettings(); return }
        if (zenMode) {
          const now = Date.now()
          if (now - lastEscAt < 500) { a.exitZen(); lastEscAt = 0 }
          else lastEscAt = now
        }
        return
      }

      // Ctrl+K is kill-line in the terminal's hidden textarea, so it doesn't start a chord there.
      const typing = (e.target as Element | null)?.closest?.('input, textarea, select, [contenteditable="true"]')
      if (typing && (!(e.ctrlKey || e.metaKey) || k === 'k')) return

      if (chordAt && Date.now() - chordAt < 1500) {
        chordAt = 0
        if (k === 'z') { e.preventDefault(); a.toggleZen(); return }
        if (k === 'w') { e.preventDefault(); a.closeActiveGroup(); return }
      }

      if (k === 'z' && e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); a.toggleWordWrap(); return }

      if (!(e.ctrlKey || e.metaKey)) return

      if (k === 'k')               { e.preventDefault(); chordAt = Date.now(); return }
      if (k === '-' && e.altKey)   { e.preventDefault(); a.navigate(-1); return }
      if (k === '_' && e.shiftKey) { e.preventDefault(); a.navigate(1); return }
      if (e.shiftKey && !e.altKey && VIEW_KEYS[k]) { e.preventDefault(); a.showView(VIEW_KEYS[k]); return }
      if (k === 'b' && e.altKey)   { e.preventDefault(); a.toggleSecondary(); return }

      switch (k) {
        case ',':        e.preventDefault(); a.openSettings(); break
        case 'p':        e.preventDefault(); a.openPalette(e.shiftKey ? 'commands' : 'files'); break
        case 'g':        e.preventDefault(); a.openPalette('goto'); break
        case 'o':        if (e.shiftKey) { e.preventDefault(); a.openPalette('symbols') } break
        case '`':        e.preventDefault(); a.toggleTerminalPanel(); break
        case '~':        e.preventDefault(); a.addTerminal(); break
        case 'j':        e.preventDefault(); a.togglePanel(); break
        case 'b':        e.preventDefault(); a.toggleSidebar(); break
        case '\\':       e.preventDefault(); a.splitEditor(); break
        case 'w':        e.preventDefault(); a.closeActiveEditor(); break
        case 'Tab':      e.preventDefault(); a.mruSwitch(); break
        case 'PageUp':   e.preventDefault(); a.cycleTab(-1); break
        case 'PageDown': e.preventDefault(); a.cycleTab(1); break
        case '1':        e.preventDefault(); a.focusGroup(0); break
        case '2':        e.preventDefault(); a.focusGroup(1); break
        case '3':        e.preventDefault(); a.focusGroup(2); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
