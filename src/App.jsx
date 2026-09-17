
import { AuthProvider, useAuth } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { LoginView } from './views/LoginView'
import { RegionDashboard } from './views/RegionDashboard'
import { CentralAdminDashboard } from './views/CentralAdminDashboard'
import { ExamCentreDashboard } from './views/ExamCentreDashboard'
import './App.css'

const MainRouter = () => {
  const { user, loading, isSupabaseConfigured } = useAuth()

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="spinner"></div>
        <p>Verifying secure session...</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Navbar />

      {/* Guidance banner for project evaluation */}
      {!isSupabaseConfigured && (
        <div className="system-notice-bar">
          <div className="notice-inner">
            <span className="notice-tag">Notice</span>
            <span>
              <strong>Demo & Evaluation Mode Active:</strong> Operating in local simulation mode. To connect to your Supabase PostgreSQL cloud backend, copy <code>.env.example</code> to <code>.env</code> and insert your Supabase API credentials. Full schema is in <code>supabase/schema.sql</code>.
            </span>
          </div>
        </div>
      )}

      <main className="main-content">
        {!user && <LoginView />}
        {user?.role === 'region' && <RegionDashboard />}
        {user?.role === 'central_admin' && <CentralAdminDashboard />}
        {user?.role === 'exam_centre' && <ExamCentreDashboard />}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <span>Secure Question Paper Management & Controlled Exam Distribution System &bull; MicroProject MVP</span>
          <span className="footer-tech">Tech: React + Vite + Supabase (Auth, RLS, Storage)</span>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  )
}

export default App
