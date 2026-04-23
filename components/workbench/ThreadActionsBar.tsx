'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Reply, ReplyAll, Forward, Star, Trash2, AlertOctagon, Plus } from 'lucide-react'
import { EmailMessage } from '@/lib/types'

interface Props {
  lastMsg?: EmailMessage
  onReply?: (mode: 'reply' | 'replyAll' | 'forward') => void
  onNewMessage?: () => void
}

export function ThreadActionsBar({ lastMsg, onReply, onNewMessage }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div className="wb-actions-toggle" onClick={() => setExpanded(e => !e)}>
        {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <span>Actions</span>
      </div>
      {expanded && (
        <div className="es-ribbon" style={{ borderBottom: '1px solid var(--es-n-100)', flexShrink: 0 }}>
          <div className="es-ribbon-group">
            <button className="es-rbtn primary" onClick={onNewMessage}>
              <Plus size={12} /> New Message
            </button>
          </div>
          <div className="es-vsep" />
          <div className="es-ribbon-group">
            <button className="es-rbtn" disabled={!lastMsg} onClick={() => onReply?.('reply')}>
              <Reply size={12} /> Reply
            </button>
            <button className="es-rbtn" disabled={!lastMsg} onClick={() => onReply?.('replyAll')}>
              <ReplyAll size={12} /> Reply All
            </button>
            <button className="es-rbtn" disabled={!lastMsg} onClick={() => onReply?.('forward')}>
              <Forward size={12} /> Forward
            </button>
          </div>
          <div className="es-vsep" />
          <div className="es-ribbon-group">
            <button className="es-rbtn icon" title="Star"><Star size={12} /></button>
            <button className="es-rbtn icon" title="Bin"><Trash2 size={12} /></button>
            <button className="es-rbtn icon" title="Spam"><AlertOctagon size={12} /></button>
          </div>
        </div>
      )}
    </>
  )
}
