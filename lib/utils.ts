import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ')
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function formatRef(ref: string | null): string {
  if (!ref) return '—'
  return ref.startsWith('Ref') ? ref : `Ref ${ref}`
}

export function slaStatus(updatedAt: string, status: string): 'ok' | 'warning' | 'overdue' {
  const waitingStatuses = ['vendor_requested', 'quote_sent', 'vendor_confirmed']
  if (!waitingStatuses.includes(status)) return 'ok'
  const hours = (Date.now() - new Date(updatedAt).getTime()) / 36e5
  if (hours > 24) return 'overdue'
  if (hours > 16) return 'warning'
  return 'ok'
}
