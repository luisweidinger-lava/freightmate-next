export const ROUTES = {
  INBOX:           '/inbox',
  INBOX_UNMATCHED: '/inbox?filter=unmatched',
  WORKBENCH:       '/workbench',
  CASE:            (ref: string) => `/cases/${ref}`,
  CASES:           '/cases',
  CRM:             '/crm',
  REPORTS:         '/reports',
  DASHBOARD:       '/dashboard',
} as const

// Keys pushed onto /cases from the Dashboard
export const DASHBOARD_NAV = {
  DELAYED:  `${ROUTES.CASES}?filter=delayed`,
  CRITICAL: `${ROUTES.CASES}?filter=critical`,
  SILENT:   `${ROUTES.CASES}?filter=silent`,
  STAGE:    (stage: string) => `${ROUTES.CASES}?stage=${stage}`,
  FLIGHT:   `${ROUTES.CASES}?period=today`,
} as const
