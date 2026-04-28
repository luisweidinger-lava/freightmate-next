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
      <span style={{ fontSize: 13 }}>Open a case to work on in the Workbench.</span>
    </div>
  )
}
