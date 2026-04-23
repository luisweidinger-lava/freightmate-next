'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { EmailMessage } from '@/lib/types'
import { MsgExpanded, MsgCollapsed } from '@/components/email/MessageItem'

export interface ThreadSummaryStrip {
  summary_text: string | null
  tone: string | null
  open_questions: string[] | null
  communication_risks: string[] | null
}

interface ThreadViewProps {
  messages: EmailMessage[]
  singleEmail?: EmailMessage
  summary?: ThreadSummaryStrip | null
  onReply?: (mode: 'reply' | 'replyAll' | 'forward', msg: EmailMessage) => void
}

export default function ThreadView({ messages, singleEmail, summary, onReply }: ThreadViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const last = messages.length > 0
      ? messages[messages.length - 1].id
      : singleEmail?.id
    return last ? new Set([last]) : new Set()
  })
  const [summaryExpanded, setSummaryExpanded] = useState(false)

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const displayThread = messages.length > 1 ? messages : null

  return (
    <div className="es-thread-scroll">
      {/* AI summary strip */}
      {summary && (
        <div className="es-ai-strip">
          <div className="es-ai-strip-title" onClick={() => setSummaryExpanded(e => !e)}>
            <Sparkles size={11} /> Thread summary
            {summaryExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </div>
          {summaryExpanded && (
            <>
              <div className="es-ai-strip-body">{summary.summary_text}</div>
              <div className="es-ai-strip-meta">
                {summary.tone && <span>Tone: <strong>{summary.tone}</strong></span>}
                {summary.open_questions?.length ? <span>Open questions: <strong>{summary.open_questions.length}</strong></span> : null}
                {summary.communication_risks?.length ? <span>Risks: <strong>{summary.communication_risks.length}</strong></span> : null}
              </div>
            </>
          )}
        </div>
      )}

      {/* Thread messages */}
      {displayThread ? (
        displayThread.map((msg, i) => {
          const isLatest = i === displayThread.length - 1
          const isExpanded = expandedIds.has(msg.id)
          if (!isExpanded && !isLatest) {
            return <MsgCollapsed key={msg.id} msg={msg} onExpand={() => toggleExpand(msg.id)} />
          }
          return (
            <MsgExpanded
              key={msg.id}
              msg={msg}
              isLatest={isLatest}
              onCollapse={!isLatest ? () => toggleExpand(msg.id) : undefined}
              onReply={onReply ? (mode) => onReply(mode, msg) : undefined}
            />
          )
        })
      ) : singleEmail ? (
        <MsgExpanded
          msg={singleEmail}
          isLatest
          onReply={onReply ? (mode) => onReply(mode, singleEmail) : undefined}
        />
      ) : (
        <p style={{ fontSize: 12, color: 'var(--es-n-200)', textAlign: 'center', padding: '32px 0' }}>
          No messages yet
        </p>
      )}
    </div>
  )
}
