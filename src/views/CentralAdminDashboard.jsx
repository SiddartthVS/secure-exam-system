import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getAllRegionSubmissions,
  getMasterPaper,
  uploadMasterPaper,
  publishMasterPaper,
  getAuditLogs
} from '../services/examService'
import { StatusBadge } from '../components/StatusBadge'
import { ConfirmationModal } from '../components/ConfirmationModal'

export const CentralAdminDashboard = () => {
  const { user } = useAuth()

  // State
  const [regionalSubmissions, setRegionalSubmissions] = useState([])
  const [masterPaper, setMasterPaper] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Master paper upload selection
  const [selectedFile, setSelectedFile] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Double confirmation states (0 = closed, 1 = first confirmation, 2 = second confirmation)
  const [confirmStep, setConfirmStep] = useState(0)

  const loadDashboardData = useCallback(async () => {
    try {
      const [regions, master, logs] = await Promise.all([
        getAllRegionSubmissions(),
        getMasterPaper(),
        getAuditLogs()
      ])
      setRegionalSubmissions(regions)
      setMasterPaper(master)
      setAuditLogs(logs)
    } catch (err) {
      setErrorMessage('Failed to load dashboard data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // File selection for master paper
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Invalid file type: Master Question Paper must be a PDF document.')
      e.target.value = ''
      setSelectedFile(null)
      return
    }
    setErrorMessage('')
    setSelectedFile(file)
  }

  // Upload Master Paper
  const handleUploadMasterPaper = async () => {
    if (!selectedFile) {
      setErrorMessage('Please choose a PDF file to upload as the Master Question Paper.')
      return
    }

    setActionLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const updated = await uploadMasterPaper(user, selectedFile)
      setMasterPaper(updated)
      setSelectedFile(null)
      setSuccessMessage('Master Question Paper uploaded successfully.')
      // Refresh audit logs
      const logs = await getAuditLogs()
      setAuditLogs(logs)
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload master paper.')
    } finally {
      setActionLoading(false)
    }
  }

  // Double confirmation publish workflow
  const handleStartPublish = () => {
    setConfirmStep(1)
  }

  const handleFirstConfirm = () => {
    setConfirmStep(2)
  }

  const handleFinalPublishConfirm = async () => {
    setActionLoading(true)
    setErrorMessage('')
    try {
      const published = await publishMasterPaper(masterPaper.id, user)
      setMasterPaper(published)
      setConfirmStep(0)
      setSuccessMessage('Master Question Paper is now PUBLISHED and available to authorized exam centres.')
      // Refresh audit logs
      const logs = await getAuditLogs()
      setAuditLogs(logs)
    } catch (err) {
      setErrorMessage(err.message || 'Publishing failed.')
      setConfirmStep(0)
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (iso) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleString('en-US', {
      dateStyle: 'short',
      timeStyle: 'medium'
    })
  }

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const submittedCount = regionalSubmissions.filter((r) => r.status === 'submitted').length

  return (
    <div className="dashboard-container">
      {/* Top Header Card */}
      <div className="dashboard-header-card">
        <div className="header-left">
          <span className="section-eyebrow">Apex Examination Authority</span>
          <h2 className="dashboard-title">Central Admin Control Centre</h2>
          <div className="meta-tags">
            <span className="code-pill">Officer: {user?.email}</span>
            <span className="code-pill">Clearance: Level-1 Highest</span>
          </div>
        </div>
        <div className="header-right">
          <div className="stat-pill-group">
            <div className="stat-pill">
              <span className="stat-number">{submittedCount} / 5</span>
              <span className="stat-label">Regions Submitted</span>
            </div>
            <div className="stat-pill">
              <span className="stat-number">
                {masterPaper?.status === 'published' ? 'PUBLISHED' : 'UNPUBLISHED'}
              </span>
              <span className="stat-label">Master Paper</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">&#9888;</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" role="alert">
          <span className="alert-icon">&#10004;</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* SECTION 1: 5 REGIONS SUBMISSION STATUS */}
      <div className="card admin-table-card">
        <div className="card-header flex-between">
          <div>
            <h3>Regional Question Paper Submissions</h3>
            <span className="card-subtitle">
              Live tracking matrix of all 5 setting regions. Submissions are strictly read-only for Central Admin.
            </span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={loadDashboardData}
            disabled={loading}
          >
            &#8635; Refresh Status
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Region</th>
                <th>Region Code</th>
                <th>Status</th>
                <th>Submitted File</th>
                <th>File Size</th>
                <th>Confirmed Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    Loading regional submissions...
                  </td>
                </tr>
              ) : regionalSubmissions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    No regions registered.
                  </td>
                </tr>
              ) : (
                regionalSubmissions.map((reg) => (
                  <tr key={reg.region_id}>
                    <td>
                      <strong>{reg.region_name}</strong>
                    </td>
                    <td>
                      <code className="table-code">{reg.region_code}</code>
                    </td>
                    <td>
                      <StatusBadge status={reg.status} />
                    </td>
                    <td>
                      {reg.file_name ? (
                        <span className="filename-preview">&#128196; {reg.file_name}</span>
                      ) : (
                        <span className="text-muted">Awaiting Upload</span>
                      )}
                    </td>
                    <td>{formatBytes(reg.file_size)}</td>
                    <td>{formatDate(reg.confirmed_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: MASTER QUESTION PAPER MANAGEMENT */}
      <div className="card master-paper-card">
        <div className="card-header">
          <h3>Master Question Paper Management</h3>
          <span className="card-subtitle">
            Upload the consolidated master paper and execute controlled release to exam centres.
          </span>
        </div>

        <div className="card-body">
          <div className="master-grid">
            {/* Upload form */}
            <div className="master-action-box">
              <h4>1. Upload Master Question Paper</h4>
              <p className="section-note">
                Select the verified master exam paper PDF to store in private encrypted storage.
              </p>

              <div className="upload-controls">
                <input
                  type="file"
                  id="master-file-input"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  disabled={actionLoading}
                  className="form-control-file"
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUploadMasterPaper}
                  disabled={!selectedFile || actionLoading}
                >
                  {actionLoading ? 'Uploading...' : 'Upload Master Paper'}
                </button>
              </div>

              {selectedFile && (
                <div className="selected-file-banner">
                  <span>Selected: <strong>{selectedFile.name}</strong> ({formatBytes(selectedFile.size)})</span>
                </div>
              )}
            </div>

            {/* Current Master Status & Publish Action */}
            <div className="master-status-box">
              <h4>2. Master Paper Status & Release</h4>

              {masterPaper ? (
                <div className="master-current-info">
                  <div className="status-row">
                    <span className="info-label">Current Status:</span>
                    <StatusBadge status={masterPaper.status} />
                  </div>

                  <div className="status-row">
                    <span className="info-label">File:</span>
                    <span className="filename-preview">&#128196; {masterPaper.file_name}</span>
                  </div>

                  <div className="status-row">
                    <span className="info-label">Uploaded At:</span>
                    <span>{formatDate(masterPaper.uploaded_at)}</span>
                  </div>

                  {masterPaper.published_at && (
                    <div className="status-row">
                      <span className="info-label">Published At:</span>
                      <span className="text-success font-semibold">
                        {formatDate(masterPaper.published_at)}
                      </span>
                    </div>
                  )}

                  <div className="publish-action-area">
                    {masterPaper.status === 'published' ? (
                      <div className="alert alert-success mt-3">
                        <span className="alert-icon">&#10004;</span>
                        <span>
                          Master Question Paper is <strong>PUBLISHED</strong>. Exam centres are now authorized to download.
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-success btn-lg btn-block mt-3"
                        onClick={handleStartPublish}
                        disabled={actionLoading}
                      >
                        &#128640; PUBLISH MASTER QUESTION PAPER
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-master-notice">
                  <span className="text-muted">
                    No master question paper has been uploaded yet. Please upload a PDF above to begin.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: RECENT AUDIT ACTIVITY LOGS */}
      <div className="card audit-card">
        <div className="card-header flex-between">
          <div>
            <h3>Audit Trail & Recent Activity</h3>
            <span className="card-subtitle">
              Tamper-evident log of authentication, uploads, locks, and paper distribution.
            </span>
          </div>
          <span className="audit-counter">{auditLogs.length} events logged</span>
        </div>

        <div className="table-responsive">
          <table className="data-table audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event Type</th>
                <th>User / Identity</th>
                <th>Role</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">
                    No audit records recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-nowrap text-muted font-mono">{formatDate(log.created_at)}</td>
                    <td>
                      <span className={`event-tag tag-${log.event_type}`}>
                        {log.event_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td><strong>{log.user_email || 'System'}</strong></td>
                    <td><span className="role-chip">{log.role}</span></td>
                    <td className="log-details-cell">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DOUBLE CONFIRMATION MODAL - STEP 1 */}
      <ConfirmationModal
        isOpen={confirmStep === 1}
        title="Publish Master Question Paper (Step 1 of 2)"
        message={`Are you sure you want to publish the Master Question Paper "${masterPaper?.file_name}"?`}
        warning="This action initiates exam distribution clearance."
        confirmText="Yes, Proceed to Final Verification"
        cancelText="Cancel"
        onConfirm={handleFirstConfirm}
        onCancel={() => setConfirmStep(0)}
      />

      {/* DOUBLE CONFIRMATION MODAL - STEP 2 */}
      <ConfirmationModal
        isOpen={confirmStep === 2}
        title="Final Authorization Required (Step 2 of 2)"
        message="Publishing will make the paper immediately available to all authorized exam centres."
        warning="CRITICAL: Once published, authenticated exam centres can download the decrypted master question paper. Continue?"
        confirmText="Authorize & Confirm Publish"
        cancelText="Abort Publication"
        isDangerous={true}
        loading={actionLoading}
        onConfirm={handleFinalPublishConfirm}
        onCancel={() => setConfirmStep(0)}
      />
    </div>
  )
}
