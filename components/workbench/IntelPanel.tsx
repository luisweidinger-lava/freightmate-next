'use client'

import { useState } from 'react'
import { RefreshCw, Sparkles, AlertCircle, Check } from 'lucide-react'
import { ShipmentCase, ThreadSummary } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  shipmentCase: ShipmentCase
  summary: ThreadSummary | null
}

export function IntelPanel({ shipmentCase: c, summary }: Props) {
  const [refreshing, setRefreshing] = useState(false)

  async function handleUpdateSummary() {
    setRefreshing(true)
    try {
      const results = await Promise.all(['client', 'vendor'].map(channelType =>
        fetch('/api/request-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ case_id: c.id, channel_type: channelType }),
        })
      ))
      const failed = results.find(r => !r.ok)
      if (failed) {
        const err = await failed.json().catch(() => ({}))
        toast.error(`Summary update failed: ${err.error ?? failed.statusText}`)
      } else {
        toast.success('Generating summary — check back in ~30s')
      }
    } catch {
      toast.error('Summary update failed')
    } finally {
      setRefreshing(false)
    }
  }

  const facts = [
    { label: 'Origin',      value: c.origin },
    { label: 'Destination', value: c.destination },
    { label: 'Weight',      value: c.weight_kg    ? `${c.weight_kg} kg`                  : null },
    { label: 'Dimensions',  value: c.dimensions },
    { label: 'Rate',        value: c.rate_amount  ? `${c.rate_amount} ${c.rate_currency}` : null },
    { label: 'Transit',     value: c.transit_days ? `${c.transit_days} days`              : null },
    { label: 'Flight date', value: c.flight_date },
    { label: 'Item',        value: c.item_desc },
  ].filter(f => f.value)

  const milestones = summary?.milestones ?? []

  return (
    <div className="wb-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="wb-panel-header intel">
        <span className="wb-panel-title">Intelligence</span>
        <button
          onClick={handleUpdateSummary}
          disabled={refreshing}
          className="wb-intel-refresh-btn"
          style={{ marginLeft: 'auto' }}
        >
          <RefreshCw size={10} style={refreshing ? { animation: 'spin 0.8s linear infinite' } : {}} />
          {refreshing ? 'Updating…' : 'Update'}
        </button>
      </div>

      <div className="wb-intel-scroll">
        {/* AI Milestones */}
        {milestones.length > 0 && (
          <div>
            <span className="wb-intel-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={11} /> Milestones
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {milestones.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                    background: m.completed ? 'var(--es-brand)' : 'var(--es-n-50)',
                    color: m.completed ? 'white' : 'var(--es-n-300)',
                    border: `1px solid ${m.completed ? 'var(--es-brand)' : 'var(--es-n-100)'}`,
                  }}>
                    {m.completed ? <Check size={11} strokeWidth={2.5} /> : m.position}
                  </div>
                  <span style={{
                    fontSize: 11.5,
                    color: m.completed ? 'var(--es-n-500)' : 'var(--es-n-300)',
                    fontWeight: m.completed ? 400 : 500,
                  }}>
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
            <hr className="wb-intel-divider" style={{ marginTop: 12 }} />
          </div>
        )}

        {/* Rolling Summary */}
        <div>
          <div className="wb-intel-section-title">
            <span className="wb-intel-label"><Sparkles size={11} /> Rolling Summary</span>
          </div>
          {summary ? (
            <div className="wb-ai-summary">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {summary.tone && <span className={`wb-ai-tone ${summary.tone}`}>{summary.tone}</span>}
                <span className="wb-ai-updated">Updated {formatDate(summary.updated_at)}</span>
              </div>
              <p className="wb-ai-text">{summary.summary_text}</p>
              {summary.open_questions?.length > 0 && (
                <>
                  <p className="wb-ai-subsection-label questions">Open Questions</p>
                  <div className="wb-ai-list">
                    {summary.open_questions.map((q, i) => (
                      <div key={i} className="wb-ai-list-item">
                        <AlertCircle size={10} className="q" /> {q}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {summary.communication_risks?.length > 0 && (
                <>
                  <p className="wb-ai-subsection-label risks">Risks</p>
                  <div className="wb-ai-list">
                    {summary.communication_risks.map((r, i) => (
                      <div key={i} className="wb-ai-list-item">
                        <AlertCircle size={10} className="r" /> {r}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="wb-ai-empty">No summary yet — click Update to generate.</p>
          )}
        </div>

        {/* Confirmed Facts */}
        {facts.length > 0 && (
          <>
            <hr className="wb-intel-divider" />
            <div>
              <span className="wb-intel-label" style={{ marginBottom: 8, display: 'block' }}>Confirmed Facts</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {facts.map(f => (
                  <div key={f.label} className="wb-fact-row">
                    <span className="wb-fact-key">{f.label}</span>
                    <span className="wb-fact-val">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
