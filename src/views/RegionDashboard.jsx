import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getRegionSubmission,
  uploadRegionPaper,
  removeRegionDraft,
  confirmRegionSubmission
} from '../services/examService'
import { StatusBadge } from '../components/StatusBadge'
import { ConfirmationModal } from '../components/ConfirmationModal'

export const RegionDashboard = () => {
  const { user } = useAuth()
  const region = user?.region

  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Confirmation Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  // Load existing submission
  const loadSubmission = useCallback(async () => {
    if (!region?.id) return
    try {
      const data = await getRegionSubmission(region.id)
      setSubmission(data)
    } catch (err) {
      setErrorMessage('Failed to load submission status: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [region?.id])

  useEffect(() => {
    loadSubmission()
  }, [loadSubmission])

  // Handle PDF file selection for initial upload or replacement
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate PDF type
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Security Violation: Only PDF files (.pdf) are permitted.')
      event.target.value = ''
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(true)

    try {
      const updated = await uploadRegionPaper(region, user, file)
      setSubmission(updated)
      setSuccessMessage(
        submission
          ? `Question paper successfully replaced with "${file.name}".`
          : `Question paper "${file.name}" uploaded in Draft state.`
      )
    } catch (err) {
      setErrorMessage(err.message || 'Upload failed.')
    } finally {
      setActionLoading(false)
      // Reset input
      event.target.value = ''
    }
  }

  // Handle removing draft
  const handleRemoveDraft = async () => {
    if (!window.confirm('Remove current draft question paper? You will need to upload another.')) {
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(true)

    try {
      await removeRegionDraft(region, user)
      setSubmission(null)
      setSuccessMessage('Draft question paper removed. You can upload a new PDF.')
    } catch (err) {
      setErrorMessage(err.message || 'Failed to remove draft.')
    } finally {
      setActionLoading(false)
    }
  }

  // Confirm final submission
  const handleFinalConfirm = async () => {
    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(true)

    try {
      const confirmed = await confirmRegionSubmission(region, user)
      setSubmission(confirmed)
      setIsConfirmModalOpen(false)
      setSuccessMessage('Submission Confirmed! Question paper is permanently LOCKED.')
    } catch (err) {
      setErrorMessage(err.message || 'Failed to confirm submission.')
    } finally {
      setActionLoading(false)
    }
  }

  const isLocked = submission?.status === 'submitted'
  const isDraft = submission && submission.status === 'draft'

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (isoString) => {
    if (!isoString) return '-'
    return new Date(isoString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    })
  }

  return (
    <div className="dashboard-container">
      {/* Page Header */}
      <div className="dashboard-header-card">
        <div className="header-left">
          <span className="section-eyebrow">Question Paper Setting Authority</span>
          <h2 className="dashboard-title">{region?.name}</h2>
          <div className="meta-tags">
            <span className="code-pill">Code: {region?.region_code}</span>
            <span className="code-pill">ID: {region?.id?.substring(0, 8)}...</span>
          </div>
        </div>
        <div className="header-right">
          <div className="status-container">
            <span className="status-label">Current Submission State</span>
            <StatusBadge status={submission?.status || 'pending'} />
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

      {/* Main Submission Card */}
      <div className="card submission-card">
        <div className="card-header">
          <h3>Regional Question Paper Submission</h3>
          <span className="card-subtitle">
            Strict Policy: Exactly ONE question paper PDF per region. Once confirmed, submissions are permanently locked.
          </span>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="loading-spinner">Loading regional submission state...</div>
          ) : isLocked ? (
            /* STATE 2: CONFIRMED & LOCKED */
            <div className="locked-view">
              <div className="locked-banner">
                <div className="locked-icon">&#128274;</div>
                <div className="locked-info">
                  <h4>Submission Finalized & Locked</h4>
                  <p>
                    Your question paper has been submitted to the Central Exam Authority and
                    is now permanently locked under cryptographic verification. No further
                    modifications, replacements, or deletions are permitted.
                  </p>
                </div>
              </div>

              <div className="file-details-grid">
                <div className="detail-item">
                  <span className="detail-label">File Name</span>
                  <span className="detail-value filename-value">&#128196; {submission.file_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">File Size</span>
                  <span className="detail-value">{formatBytes(submission.file_size)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Initial Upload</span>
                  <span className="detail-value">{formatDate(submission.uploaded_at)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Locked Timestamp</span>
                  <span className="detail-value locked-time">
                    {formatDate(submission.confirmed_at)}
                  </span>
                </div>
              </div>

              <div className="locked-actions-disabled">
                <button type="button" className="btn btn-secondary" disabled>
                  Upload Disabled (Locked)
                </button>
                <button type="button" className="btn btn-secondary" disabled>
                  Replace Disabled (Locked)
                </button>
              </div>
            </div>
          ) : isDraft ? (
            /* STATE 1: DRAFT (Uploaded, Can Replace or Confirm) */
            <div className="draft-view">
              <div className="status-notice-box notice-warning">
                <span className="notice-icon">&#9432;</span>
                <div>
                  <strong>Status: Draft – You can replace your question paper</strong>
                  <p>
                    Uploading a PDF does NOT mean the submission is final. You may review,
                    replace, or delete this file. Click <strong>Confirm Submission</strong> when
                    you are ready to permanently submit.
                  </p>
                </div>
              </div>

              <div className="file-card">
                <div className="file-card-info">
                  <div className="pdf-badge">PDF</div>
                  <div>
                    <span className="file-card-name">{submission.file_name}</span>
                    <span className="file-card-meta">
                      {formatBytes(submission.file_size)} &bull; Uploaded {formatDate(submission.uploaded_at)}
                    </span>
                  </div>
                </div>

                <div className="file-card-actions">
                  <label className="btn btn-outline file-upload-label">
                    &#8635; Replace PDF
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileUpload}
                      disabled={actionLoading}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={handleRemoveDraft}
                    disabled={actionLoading}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="confirm-section">
                <div className="confirm-prompt">
                  <strong>Ready to finalize?</strong>
                  <span>
                    Confirming will permanently seal this question paper for the Central Exam Authority.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={actionLoading}
                >
                  &#128274; CONFIRM SUBMISSION
                </button>
              </div>
            </div>
          ) : (
            /* INITIAL STATE: NO FILE UPLOADED YET */
            <div className="empty-upload-view">
              <div className="upload-dropzone">
                <div className="dropzone-icon">&#128194;</div>
                <h4>Upload Question Paper PDF</h4>
                <p>Select your region's finalized question paper in PDF format.</p>
                <label className="btn btn-primary file-upload-label">
                  Choose PDF File
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileUpload}
                    disabled={actionLoading}
                    style={{ display: 'none' }}
                  />
                </label>
                <span className="upload-policy-note">
                  Strictly PDF documents only. Max file size: 25MB.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Warning Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Confirm Question Paper Submission"
        message={`Are you sure you want to confirm submission of "${submission?.file_name}" for ${region?.name}?`}
        warning="After confirmation, this question paper CANNOT be changed, replaced, or deleted. The submission will become permanently locked."
        confirmText="Yes, Lock & Confirm Submission"
        cancelText="Review Again"
        isDangerous={true}
        loading={actionLoading}
        onConfirm={handleFinalConfirm}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </div>
  )
}
