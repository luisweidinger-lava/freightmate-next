import TitleBar      from '@/components/email/shell/TitleBar'
import DynamicPageBar from '@/components/email/shell/DynamicPageBar'
import ShellActions  from '@/components/email/shell/ShellActions'
import AppRail       from '@/components/email/shell/AppRail'
import CaseRail      from '@/components/workbench/CaseRail'

export default function WorkbenchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="email-shell">
      <TitleBar />
      <DynamicPageBar />
      <div className="es-body-wrapper">
        <AppRail />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ShellActions />
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <CaseRail />
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
