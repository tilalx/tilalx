'use client'

import { useEffect, useRef, useState } from 'react'
import type { editor as MonacoEditor } from 'monaco-editor/editor/editor.api.js'
import { editorRequestsHandled, useWorkbench } from '../context'
import { languageOf } from '../languages'
import { editorFont, loadMonaco } from './monaco'
import type { Monaco } from './monaco'

/** One Monaco model per file, shared by every group that shows it (like VS Code's text file models). */
function modelFor(monaco: Monaco, path: string, text: string): MonacoEditor.ITextModel {
  const uri = monaco.Uri.parse(`file:///tilalx/${path}`)
  const existing = monaco.editor.getModel(uri)
  if (existing) return existing
  return monaco.editor.createModel(text, languageOf(path).grammar ?? 'plaintext', uri)
}

export default function TextEditor({ path, active, onPin }: { path: string; active: boolean; onPin(): void }) {
  const wb      = useWorkbench()
  const host    = useRef<HTMLDivElement>(null)
  const editor  = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const [monaco, setMonaco] = useState<Monaco | null>(null)
  const text    = wb.fileText(path)

  // Latest workbench callbacks for Monaco listeners registered once.
  const wbRef = useRef(wb)
  wbRef.current = wb
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => { loadMonaco().then(setMonaco) }, [])
  useEffect(() => { if (text === undefined && !wb.fileFailed(path)) wb.loadFile(path) }, [path, text, wb])

  useEffect(() => {
    if (!monaco || !host.current || text === undefined) return
    const model = modelFor(monaco, path, text)
    const markdown = languageOf(path).id === 'markdown'
    const ed = monaco.editor.create(host.current, {
      model,
      theme: wbRef.current.theme.id,
      ...editorFont(),
      automaticLayout: true,
      minimap: { enabled: true },
      stickyScroll: { enabled: true },
      bracketPairColorization: { enabled: true },
      guides: { indentation: true, bracketPairs: false },
      wordWrap: markdown ? 'on' : 'off',
      renderLineHighlight: 'line',
      smoothScrolling: false,
      mouseWheelZoom: false,
      fixedOverflowWidgets: true,
      scrollBeyondLastLine: true,
      unicodeHighlight: { ambiguousCharacters: !markdown },
      quickSuggestions: false,
      'semanticHighlighting.enabled': false,
    })
    editor.current = ed

    const report = () => {
      if (!activeRef.current) return
      const pos = ed.getPosition()
      const sel = ed.getSelection()
      if (!pos) return
      wbRef.current.setCursor({ line: pos.lineNumber, column: pos.column, selected: sel ? model.getValueInRange(sel).length : 0 })
    }
    const subs = [
      ed.onDidChangeCursorSelection(report),
      ed.onDidFocusEditorText(report),
      model.onDidChangeContent(() => {
        wbRef.current.editFile(path, model.getValue())
        onPin()
      }),
    ]
    report()
    return () => { subs.forEach(s => s.dispose()); ed.dispose(); editor.current = null }
    // The editor is created once per file; content changes flow through the model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monaco, path, text === undefined])

  // Reverting or saving replaces the text from outside Monaco.
  useEffect(() => {
    const model = editor.current?.getModel()
    if (model && text !== undefined && model.getValue() !== text) model.setValue(text)
  }, [text])

  useEffect(() => { if (monaco) monaco.editor.setTheme(wb.theme.id) }, [monaco, wb.theme.id])

  const { settings } = wb
  useEffect(() => {
    const ed = editor.current
    if (!ed) return
    const font = editorFont()
    const wrap = settings['editor.wordWrap']
    ed.updateOptions({
      fontSize:    settings['editor.fontSize'] ?? font.fontSize,
      lineHeight:  settings['editor.fontSize'] ? 0 : font.lineHeight,
      wordWrap:    wrap === 'default' ? (languageOf(path).id === 'markdown' ? 'on' : 'off') : wrap,
      minimap:     { enabled: settings['editor.minimap.enabled'] && !window.matchMedia('(max-width: 700px)').matches },
      lineNumbers: settings['editor.lineNumbers'],
    })
  }, [settings, path, monaco, text === undefined])

  // Report this editor's cursor when it becomes the active one.
  useEffect(() => {
    const pos = editor.current?.getPosition()
    if (active && pos) wbRef.current.setCursor({ line: pos.lineNumber, column: pos.column, selected: 0 })
  }, [active, monaco, text === undefined])

  // Take focus only when asked (opening without preserveFocus, clicking the tab), and only once per request:
  // the counter never resets, so an editor activated later must not treat an old request as its own.
  const focusRequest = wb.editorFocus
  useEffect(() => {
    if (!active || !editor.current || focusRequest <= editorRequestsHandled.focus) return
    editorRequestsHandled.focus = focusRequest
    editor.current.focus()
  }, [focusRequest, active, monaco, text === undefined])

  const reveal = wb.revealLine
  useEffect(() => {
    const ed = editor.current
    if (!ed || !reveal || reveal.path !== path || !active || reveal.nonce === editorRequestsHandled.reveal) return
    editorRequestsHandled.reveal = reveal.nonce
    ed.revealLineInCenter(reveal.line)
    ed.setPosition({ lineNumber: reveal.line, column: 1 })
    ed.focus()
  }, [reveal, path, active, monaco, text === undefined])

  return <div ref={host} className="text-editor" style={{ position: 'absolute', inset: 0 }} />
}
