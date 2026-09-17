import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  PREDEFINED_REGIONS,
  PREDEFINED_ADMIN,
  PREDEFINED_CENTRES
} from '../data/predefinedData'

export const LoginView = () => {
  const { loginAsRegion, loginAsAdmin, loginAsCentre, isSupabaseConfigured } = useAuth()

  // Selected role tab: 'region' | 'central_admin' | 'exam_centre'
  const [activeTab, setActiveTab] = useState('region')

  // Region Login form states
  const [selectedRegionId, setSelectedRegionId] = useState(PREDEFINED_REGIONS[0].id)
  const [regionCode, setRegionCode] = useState('')
  const [regionPassword, setRegionPassword] = useState('')

  // Central Admin form states
  const [adminEmail, setAdminEmail] = useState(PREDEFINED_ADMIN.email)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminSecurityCode, setAdminSecurityCode] = useState('')

  // Exam Centre form states
  const [selectedCentreId, setSelectedCentreId] = useState(PREDEFINED_CENTRES[0].id)
  const [centreCode, setCentreCode] = useState('')
  const [centrePassword, setCentrePassword] = useState('')

  // UI state
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Clear errors when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setError('')
  }

  // Quick fill helper for presentation demonstration
  const handleQuickFill = (type, item) => {
    setError('')
    if (type === 'region') {
      setActiveTab('region')
      setSelectedRegionId(item.id)
      setRegionCode(item.region_code)
      setRegionPassword(item.password)
    } else if (type === 'admin') {
      setActiveTab('central_admin')
      setAdminEmail(PREDEFINED_ADMIN.email)
      setAdminSecurityCode(PREDEFINED_ADMIN.admin_code)
      setAdminPassword(PREDEFINED_ADMIN.password)
    } else if (type === 'centre') {
      setActiveTab('exam_centre')
      setSelectedCentreId(item.id)
      setCentreCode(item.centre_code)
      setCentrePassword(item.password)
    }
  }

  // Handle Region Submission
  const handleRegionSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!regionCode.trim()) {
        throw new Error('Please enter the Region Code.')
      }
      await loginAsRegion(selectedRegionId, regionCode, regionPassword)
    } catch (err) {
      setError(err.message || 'Region authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Admin Submission
  const handleAdminSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await loginAsAdmin(adminEmail, adminPassword, adminSecurityCode)
    } catch (err) {
      setError(err.message || 'Central Admin authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Centre Submission
  const handleCentreSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!centreCode.trim()) {
        throw new Error('Please enter the Centre Code.')
      }
      await loginAsCentre(selectedCentreId, centreCode, centrePassword)
    } catch (err) {
      setError(err.message || 'Exam Centre authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="shield-icon">&#128737;</div>
          <h2>Authorized Exam Portal Login</h2>
          <p className="login-desc">
            Select your authorized role and provide your access credentials.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="role-tabs">
          <button
            type="button"
            className={`role-tab ${activeTab === 'region' ? 'active' : ''}`}
            onClick={() => handleTabChange('region')}
          >
            Question Paper Region
          </button>
          <button
            type="button"
            className={`role-tab ${activeTab === 'central_admin' ? 'active' : ''}`}
            onClick={() => handleTabChange('central_admin')}
          >
            Central Admin
          </button>
          <button
            type="button"
            className={`role-tab ${activeTab === 'exam_centre' ? 'active' : ''}`}
            onClick={() => handleTabChange('exam_centre')}
          >
            Exam Centre
          </button>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon">&#9888;</span>
            <div>
              <strong>Access Denied: </strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* TAB 1: QUESTION PAPER REGION */}
        {activeTab === 'region' && (
          <form onSubmit={handleRegionSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="region-select">Region:</label>
              <select
                id="region-select"
                className="form-control"
                value={selectedRegionId}
                onChange={(e) => setSelectedRegionId(e.target.value)}
              >
                {PREDEFINED_REGIONS.map((reg) => (
                  <option key={reg.id} value={reg.id}>
                    {reg.name}
                  </option>
                ))}
              </select>
              <small className="form-hint">
                Select your assigned Question Paper Setting Region.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="region-code">Region Code:</label>
              <input
                id="region-code"
                type="text"
                className="form-control"
                placeholder="e.g. REG-101"
                value={regionCode}
                onChange={(e) => setRegionCode(e.target.value)}
                required
              />
              <small className="form-hint">
                Security check: Code must strictly match the selected Region.
              </small>
            </div>

            {isSupabaseConfigured && (
              <div className="form-group">
                <label htmlFor="region-password">Supabase Password:</label>
                <input
                  id="region-password"
                  type="password"
                  className="form-control"
                  placeholder="Region@12345"
                  value={regionPassword}
                  onChange={(e) => setRegionPassword(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Verifying Credentials...' : 'Login as Region'}
            </button>
          </form>
        )}

        {/* TAB 2: CENTRAL ADMIN */}
        {activeTab === 'central_admin' && (
          <form onSubmit={handleAdminSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="admin-email">Admin Email:</label>
              <input
                id="admin-email"
                type="email"
                className="form-control"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="admin-security-code">Authority Security Code:</label>
              <input
                id="admin-security-code"
                type="text"
                className="form-control"
                placeholder="e.g. ADMIN-SECURE-999"
                value={adminSecurityCode}
                onChange={(e) => setAdminSecurityCode(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="admin-password">Admin Password:</label>
              <input
                id="admin-password"
                type="password"
                className="form-control"
                placeholder="Admin@12345"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Authenticating Admin...' : 'Login as Central Admin'}
            </button>
          </form>
        )}

        {/* TAB 3: EXAM CENTRE */}
        {activeTab === 'exam_centre' && (
          <form onSubmit={handleCentreSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="centre-select">Exam Centre:</label>
              <select
                id="centre-select"
                className="form-control"
                value={selectedCentreId}
                onChange={(e) => setSelectedCentreId(e.target.value)}
              >
                {PREDEFINED_CENTRES.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="centre-code">Centre Code:</label>
              <input
                id="centre-code"
                type="text"
                className="form-control"
                placeholder="e.g. CENTRE-901"
                value={centreCode}
                onChange={(e) => setCentreCode(e.target.value)}
                required
              />
            </div>

            {isSupabaseConfigured && (
              <div className="form-group">
                <label htmlFor="centre-password">Password:</label>
                <input
                  id="centre-password"
                  type="password"
                  className="form-control"
                  placeholder="Centre@12345"
                  value={centrePassword}
                  onChange={(e) => setCentrePassword(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Verifying Centre...' : 'Login as Exam Centre'}
            </button>
          </form>
        )}

        {/* Evaluator Quick Access Panel */}
        <div className="evaluator-panel">
          <p className="evaluator-message">
            Mam, for easy evaluation across all role tiers without manual typing, click any identity button below to auto-populate authorized credentials and verify system isolation.
          </p>
          <div className="evaluator-chips-grid">
            {PREDEFINED_REGIONS.map((r, idx) => (
              <button
                key={r.id}
                type="button"
                className="btn btn-chip btn-chip-region"
                onClick={() => handleQuickFill('region', r)}
              >
                Region {idx + 1} ({r.region_code})
              </button>
            ))}
            <button
              type="button"
              className="btn btn-chip btn-chip-admin"
              onClick={() => handleQuickFill('admin')}
            >
              Central Admin
            </button>
            <button
              type="button"
              className="btn btn-chip btn-chip-centre"
              onClick={() => handleQuickFill('centre', PREDEFINED_CENTRES[0])}
            >
              Exam Centre 1
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
