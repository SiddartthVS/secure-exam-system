import { useAuth } from '../context/AuthContext'
import { resetAllMockData } from '../services/mockStorage'

export const Navbar = ({ onResetData }) => {
  const { user, logout, isSupabaseConfigured } = useAuth()

  const handleReset = () => {
    if (window.confirm('Reset all demo submissions, master paper, and audit logs to initial state?')) {
      resetAllMockData()
      if (onResetData) onResetData()
      window.location.reload()
    }
  }

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-logo">&#128272;</div>
          <div>
            <h1 className="brand-title">Secure Exam Paper Distribution</h1>
            <span className="brand-subtitle">
              Role-Isolated Question Paper Vault & Controlled Release System
            </span>
          </div>
        </div>

        <div className="navbar-meta">
          <div
            className={`status-pill ${
              isSupabaseConfigured ? 'status-live' : 'status-demo'
            }`}
            title={
              isSupabaseConfigured
                ? 'Connected to real Supabase database & storage'
                : 'Running in offline simulation mode (Configure .env for Supabase)'
            }
          >
            <span className="pulse-dot"></span>
            {isSupabaseConfigured ? 'Supabase Live' : 'Demo Mode'}
          </div>

          {user && (
            <div className="user-profile-widget">
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-role-tag">
                  {user.role === 'central_admin'
                    ? 'Central Authority'
                    : user.role === 'region'
                    ? 'Setting Region'
                    : 'Exam Centre'}
                </span>
              </div>

              {!isSupabaseConfigured && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={handleReset}
                  title="Reset local demo submissions for re-testing"
                >
                  &#8635; Reset Demo
                </button>
              )}

              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={logout}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
