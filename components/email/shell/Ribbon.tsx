'use client'

import { useRef, useEffect } from 'react'
import {
  Send, ChevronDown, Undo2, Redo2, Bold, Italic, Underline,
  Paperclip, Link2, Image, Table2, Sparkles, Tag, Printer, MoreHorizontal,
} from 'lucide-react'

const FONTS = ['Arial', 'Georgia', 'Verdana', 'Courier New']
const SIZES = [
  { label: '8',  val: '1' },
  { label: '10', val: '2' },
  { label: '12', val: '3' },
  { label: '14', val: '4' },
  { label: '18', val: '5' },
  { label: '24', val: '6' },
]

interface RibbonProps {
  onDraftWithAI?: () => void
  onNewMessage?:  () => void
  onSync?:        () => void
  syncing?:       boolean
}

// Module-level helper — used by handlers inside the component via closure
function execFmt(cmd: string, value?: string) {
  document.execCommand(cmd, false, value)
}

export default function Ribbon({ onDraftWithAI, onNewMessage, onSync, syncing }: RibbonProps) {
  const fileRef      = useRef<HTMLInputElement>(null)
  const imageRef     = useRef<HTMLInputElement>(null)
  const savedRange   = useRef<Range | null>(null)

  // Track the last selection inside any contenteditable so we can restore
  // focus before calling execCommand (required for <select> elements which
  // steal focus when opened and can't use onMouseDown + preventDefault).
  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      const range = sel.getRangeAt(0)
      let node: Node | null = range.commonAncestorContainer
      while (node) {
        if (node instanceof HTMLElement && node.isContentEditable) {
          savedRange.current = range.cloneRange()
          return
        }
        node = node.parentNode
      }
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  function restoreSelection() {
    if (!savedRange.current) return
    const sel = window.getSelection()
    if (sel) { sel.removeAllRanges(); sel.addRange(savedRange.current) }
  }

  // Component-level fmt always restores selection first before executing
  function fmt(cmd: string, value?: string) {
    restoreSelection()
    execFmt(cmd, value)
  }

  function handleAttachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    fmt('insertText', `[📎 ${file.name}]`)
    e.target.value = ''
  }

  function handleInsertLink() {
    const url = prompt('Enter URL:')
    if (url) fmt('createLink', url)
  }

  function handleInsertImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      if (ev.target?.result) fmt('insertImage', ev.target.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleInsertTable() {
    const html = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;margin:4px 0"><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></table><br/>`
    fmt('insertHTML', html)
  }

  return (
    <div className="es-ribbon">

      {/* Send / New message */}
      <div className="es-ribbon-group">
        <button className="es-rbtn primary" onClick={onNewMessage}>
          <Send size={13} /> New message
          <ChevronDown size={10} className="caret" />
        </button>
      </div>

      {/* Edit history */}
      <div className="es-ribbon-group">
        <button className="es-rbtn icon" title="Undo"
          onMouseDown={e => { e.preventDefault(); fmt('undo') }}>
          <Undo2 size={14} />
        </button>
        <button className="es-rbtn icon" title="Redo"
          onMouseDown={e => { e.preventDefault(); fmt('redo') }}>
          <Redo2 size={14} />
        </button>
      </div>

      {/* Format */}
      <div className="es-ribbon-group">
        <select
          className="es-rbtn es-select"
          title="Font"
          defaultValue="Arial"
          onChange={e => { fmt('fontName', e.target.value); e.target.blur() }}
        >
          {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
        <select
          className="es-rbtn es-select"
          title="Size"
          defaultValue="3"
          onChange={e => { fmt('fontSize', e.target.value); e.target.blur() }}
          style={{ minWidth: 42 }}
        >
          {SIZES.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
        </select>
        <div className="es-vsep" />
        <button className="es-rbtn icon" title="Bold"
          onMouseDown={e => { e.preventDefault(); fmt('bold') }}>
          <Bold size={13} />
        </button>
        <button className="es-rbtn icon" title="Italic"
          onMouseDown={e => { e.preventDefault(); fmt('italic') }}>
          <Italic size={13} />
        </button>
        <button className="es-rbtn icon" title="Underline"
          onMouseDown={e => { e.preventDefault(); fmt('underline') }}>
          <Underline size={13} />
        </button>
      </div>

      {/* Attachments / insert */}
      <div className="es-ribbon-group">
        <button className="es-rbtn icon" title="Attach file"
          onClick={() => fileRef.current?.click()}>
          <Paperclip size={14} />
        </button>
        <button className="es-rbtn icon" title="Insert link"
          onMouseDown={e => { e.preventDefault(); handleInsertLink() }}>
          <Link2 size={14} />
        </button>
        <button className="es-rbtn icon" title="Insert image"
          onClick={() => imageRef.current?.click()}>
          <Image size={14} />
        </button>
        <button className="es-rbtn icon" title="Insert table"
          onMouseDown={e => { e.preventDefault(); handleInsertTable() }}>
          <Table2 size={14} />
        </button>
        <input ref={fileRef}  type="file"             style={{ display: 'none' }} onChange={handleAttachFile} />
        <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleInsertImage} />
      </div>

      {/* FreightMate-specific actions */}
      <div className="es-ribbon-group">
        <button className="es-rbtn" onClick={onDraftWithAI}>
          <Sparkles size={13} /> Draft with AI
          <ChevronDown size={10} className="caret" />
        </button>
        <button className="es-rbtn">
          <Tag size={13} /> Link to case
        </button>
      </div>

      {/* Utility */}
      <div className="es-ribbon-group" style={{ marginLeft: 'auto', borderRight: 0 }}>
        {onSync && (
          <button className="es-rbtn" onClick={onSync} disabled={syncing} title="Sync inbox from Gmail">
            {syncing ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 12, height: 12, border: '2px solid #ccc', borderTopColor: 'var(--es-brand)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                Syncing…
              </span>
            ) : 'Sync'}
          </button>
        )}
        <button className="es-rbtn icon" title="Print" onClick={() => window.print()}>
          <Printer size={14} />
        </button>
        <button className="es-rbtn icon" title="More options"><MoreHorizontal size={14} /></button>
      </div>
    </div>
  )
}
