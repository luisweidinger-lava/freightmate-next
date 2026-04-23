import TitleBar from '@/components/email/shell/TitleBar'
import AppRail  from '@/components/email/shell/AppRail'
import CaseRail from '@/components/workbench/CaseRail'

export default function WorkbenchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="email-shell">
      <TitleBar />
      <div className="es-body-wrapper">
        <AppRail />
        <CaseRail />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
