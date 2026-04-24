import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nexio — The Nexus of Freight Forwarding',
  description: 'Track every shipment. Connect every route. Operate with confidence.',
}

export default function NexioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${jakarta.variable} fixed inset-0 overflow-y-auto bg-white`}
      style={{ fontFamily: 'var(--font-jakarta), sans-serif' }}
    >
      {children}
    </div>
  )
}
