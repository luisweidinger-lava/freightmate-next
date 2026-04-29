import TitleBar      from '@/components/email/shell/TitleBar'
import DynamicPageBar from '@/components/email/shell/DynamicPageBar'
import AppRail       from '@/components/email/shell/AppRail'
import { UserProvider } from '@/components/UserProvider'

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
    <div className="email-shell">
      <TitleBar />
      <DynamicPageBar />
      <div className="es-body-wrapper">
        <AppRail />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
    </UserProvider>
  )
}
