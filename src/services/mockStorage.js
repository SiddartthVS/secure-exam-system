const STORAGE_KEYS = {
  SUBMISSIONS: 'ses_mock_submissions',
  MASTER_PAPER: 'ses_mock_master_paper',
  AUDIT_LOGS: 'ses_mock_audit_logs',
  FILES: 'ses_mock_files'
}

// Initial state generator
const getInitialSubmissions = () => {
  return {}
}

export const getMockSubmissions = () => {
  const data = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS)
  return data ? JSON.parse(data) : getInitialSubmissions()
}

export const saveMockSubmissions = (submissions) => {
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions))
}

export const getMockMasterPaper = () => {
  const data = localStorage.getItem(STORAGE_KEYS.MASTER_PAPER)
  return data ? JSON.parse(data) : null
}

export const saveMockMasterPaper = (master) => {
  localStorage.setItem(STORAGE_KEYS.MASTER_PAPER, JSON.stringify(master))
}

export const getMockAuditLogs = () => {
  const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)
  if (data) return JSON.parse(data)

  const initialLogs = [
    {
      id: 'log-001',
      user_email: 'system',
      role: 'system',
      event_type: 'system_initialized',
      details: { message: 'Secure Exam Distribution System ready' },
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ]
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initialLogs))
  return initialLogs
}

export const addMockAuditLog = (user, eventType, details = {}) => {
  const logs = getMockAuditLogs()
  const newLog = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    user_id: user?.id || null,
    user_email: user?.email || user?.name || 'Anonymous',
    role: user?.role || 'unknown',
    event_type: eventType,
    details,
    created_at: new Date().toISOString()
  }
  logs.unshift(newLog)
  // Keep last 100
  if (logs.length > 100) logs.pop()
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs))
  return newLog
}

export const resetAllMockData = () => {
  localStorage.removeItem(STORAGE_KEYS.SUBMISSIONS)
  localStorage.removeItem(STORAGE_KEYS.MASTER_PAPER)
  localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS)
  localStorage.removeItem(STORAGE_KEYS.FILES)
}
