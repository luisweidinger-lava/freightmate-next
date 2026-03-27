'use client'
import EmailFolderView from '@/components/email/EmailFolderView'
export default function Page() {
  const folder = typeof window !== 'undefined' ? window.location.pathname.replace('/','') : 'inbox'
  return <EmailFolderView folder={folder as any} />
}
