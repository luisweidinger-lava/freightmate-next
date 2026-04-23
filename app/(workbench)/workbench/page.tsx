export default function WorkbenchPage() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      color: 'var(--es-n-300)',
    }}>
      <span style={{ fontSize: 13 }}>Select a case to open the workbench</span>
    </div>
  )
}
