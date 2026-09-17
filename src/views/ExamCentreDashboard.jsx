import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMasterPaper, downloadMasterPaper } from '../services/examService'

export const ExamCentreDashboard = () => {
  const { user } = useAuth()
  const centre = user?.centre

  const [masterPaper, setMasterPaper] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadStatus = useCallback(async () => {
    try {
      const data = await getMasterPaper()
      setMasterPaper(data)
    } catch (err) {
      setErrorMessage('Failed checking master paper status: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleDownload = async () => {
    if (!masterPaper || masterPaper.status !== 'published') {
      setErrorMessage('Master question paper is not published yet.')
      return
    }

    setDownloading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await downloadMasterPaper(user, masterPaper)
      setSuccessMessage('Secure paper downloaded successfully. Access recorded in Audit Log.')
    } catch (err) {
      setErrorMessage(err.message || 'Download failed.')
    } finally {
      setDownloading(false)
    }
  }

  const isPublished = masterPaper?.status === 'published'

  const formatDate = (iso) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleString('en-US', {
      dateStyle: 'medium',
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

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header-card">
        <div className="header-left">
          <span className="section-eyebrow">Exam Distribution Centre</span>
          <h2 className="dashboard-title">{user?.name}</h2>
          <div className="meta-tags">
            <span className="code-pill">Centre Code: {centre?.centre_code || 'CENTRE-901'}</span>
            <span className="code-pill">Role: Exam Centre Endpoint</span>
          </div>
        </div>
        <div className="header-right">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadStatus}
            disabled={loading}
          >
            &#8635; Check Status Update
          </button>
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

      {/* Controlled Distribution Portal Card */}
      <div className="card centre-paper-card">
        <div className="card-header">
          <h3>Master Question Paper Vault</h3>
          <span className="card-subtitle">
            Controlled Distribution Gate: Papers are encrypted in private storage until Central Admin publication.
          </span>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="loading-spinner">Verifying release authorization...</div>
          ) : !isPublished ? (
            /* CASE 1: NOT PUBLISHED (DISABLED DOWNLOAD) */
            <div className="vault-restricted-view">
              <div className="vault-banner banner-restricted">
                <div className="vault-icon">&#128274;</div>
                <div>
                  <h4>Master Question Paper is not yet available</h4>
                  <p>
                    The Central Examination Authority has not released or published the master
                    paper for this exam session. Downloads are strictly locked to prevent leakages.
                  </p>
                </div>
              </div>

              <div className="vault-status-indicator">
                <span className="status-label">Distribution Status:</span>
                <span className="badge badge-pending">RESTRICTED &bull; UNPUBLISHED</span>
              </div>

              <div className="download-action-container">
                <button
                  type="button"
                  className="btn btn-secondary btn-lg btn-block"
                  disabled
                  title="Download disabled until Central Admin publishes"
                >
                  &#128274; DOWNLOAD MASTER QUESTION PAPER (LOCKED)
                </button>
                <small className="action-hint">
                  Please refresh or await official clearance notification from Central Admin.
                </small>
              </div>
            </div>
          ) : (
            /* CASE 2: PUBLISHED (AVAILABLE FOR DOWNLOAD) */
            <div className="vault-available-view">
              <div className="vault-banner banner-available">
                <div className="vault-icon">&#10004;</div>
                <div>
                  <h4>Master Question Paper Available</h4>
                  <p>
                    Central Exam Authority has officially cleared and published the master paper.
                    Authorized centres may now download the authenticated question paper.
                  </p>
                </div>
              </div>

              <div className="vault-file-details">
                <div className="file-info-row">
                  <span className="info-label">Document Name:</span>
                  <span className="filename-preview">&#128196; {masterPaper.file_name}</span>
                </div>
                <div className="file-info-row">
                  <span className="info-label">File Size:</span>
                  <span>{formatBytes(masterPaper.file_size)}</span>
                </div>
                <div className="file-info-row">
                  <span className="info-label">Clearance Timestamp:</span>
                  <span className="text-success font-semibold">
                    {formatDate(masterPaper.published_at)}
                  </span>
                </div>
              </div>

              <div className="download-action-container">
                <button
                  type="button"
                  className="btn btn-success btn-lg btn-block"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    'Generating Signed Token...'
                  ) : (
                    <>&#11015; DOWNLOAD MASTER QUESTION PAPER</>
                  )}
                </button>
                <small className="action-hint">
                  Security notice: This download action is time-stamped and recorded in the Central Audit Trail.
                </small>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
