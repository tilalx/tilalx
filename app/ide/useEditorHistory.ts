import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { openInGroup, tabKey } from './editor'
import type { EditorState, Tab, TabSpec } from './types'

export function useEditorHistory(activeTab: Tab | null, setEditor: Dispatch<SetStateAction<EditorState>>) {
  // `jumping` marks a change caused by back/forward so it isn't recorded again.
  const navRef = useRef<{ stack: TabSpec[]; idx: number; jumping: boolean }>({ stack: [], idx: -1, jumping: false })
  const [navPos, setNavPos] = useState({ idx: -1, len: 0 })
  const activeKey = activeTab ? tabKey(activeTab) : null

  useEffect(() => {
    if (!activeTab) return
    const nav = navRef.current
    if (nav.jumping) { nav.jumping = false; return }
    const cur = nav.stack[nav.idx]
    if (cur && tabKey(cur) === activeKey) return
    const spec: TabSpec = { kind: activeTab.kind, file: activeTab.file }
    nav.stack = [...nav.stack.slice(0, nav.idx + 1), spec].slice(-50)
    nav.idx = nav.stack.length - 1
    setNavPos({ idx: nav.idx, len: nav.stack.length })
  }, [activeKey])

  const navigate = useCallback((dir: -1 | 1) => {
    const nav = navRef.current
    const target = nav.stack[nav.idx + dir]
    if (!target) return
    nav.idx += dir
    nav.jumping = true
    setNavPos({ idx: nav.idx, len: nav.stack.length })
    setEditor(e => openInGroup(e, target, { preview: false }))
  }, [setEditor])

  return { navigate, canGoBack: navPos.idx > 0, canGoForward: navPos.idx < navPos.len - 1 }
}
