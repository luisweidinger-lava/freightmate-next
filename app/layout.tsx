import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Freightmate-Next',
  description: 'AI-assisted logistics mail operations platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
