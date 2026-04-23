import TitleBar    from '@/components/email/shell/TitleBar'
import TabStrip    from '@/components/email/shell/TabStrip'
import ShellActions from '@/components/email/shell/ShellActions'
import AppRail     from '@/components/email/shell/AppRail'
import FolderRail  from '@/components/email/shell/FolderRail'

export default function EmailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="email-shell">
      <TitleBar />
      <TabStrip />
      <ShellActions />
      <div className="es-body-wrapper">
        <AppRail />
        <FolderRail />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
