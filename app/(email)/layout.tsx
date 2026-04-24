import TitleBar      from '@/components/email/shell/TitleBar'
import DynamicPageBar from '@/components/email/shell/DynamicPageBar'
import ShellActions  from '@/components/email/shell/ShellActions'
import AppRail       from '@/components/email/shell/AppRail'
import FolderRail    from '@/components/email/shell/FolderRail'
import { ComposeProvider } from '@/lib/compose-context'

export default function EmailLayout({ children }: { children: React.ReactNode }) {
  return (
    <ComposeProvider>
      <div className="email-shell">
        <TitleBar />
        <DynamicPageBar />
        <div className="es-body-wrapper">
          <AppRail />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ShellActions />
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              <FolderRail />
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ComposeProvider>
  )
}
