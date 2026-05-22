import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

// Auth pages
import Login           from './pages/auth/Login'
import SignupCandidate from './pages/auth/SignupCandidate'
import AcceptInvite    from './pages/auth/AcceptInvite'
import DemoRequest     from './pages/auth/DemoRequest'
import VerifyEmail     from './pages/auth/VerifyEmail'

// App pages
import Dashboard   from './pages/Dashboard'
import Jobs        from './pages/Jobs'
import Candidates  from './pages/Candidates'
import Submissions from './pages/Submissions'
import Quotations  from './pages/Quotations'

// Admin pages (super_recruiter only)
import AdminPanel  from './pages/admin/AdminPanel'
import Overview    from './pages/admin/Overview'
import Recruiters  from './pages/admin/Recruiters'
import Clients     from './pages/admin/Clients'
import Invites     from './pages/admin/Invites'
import Analytics   from './pages/admin/Analytics'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public auth routes ─────────────────────────────── */}
        <Route path="/login"          element={<Login />} />
        <Route path="/signup"         element={<SignupCandidate />} />
        <Route path="/accept-invite"  element={<AcceptInvite />} />
        <Route path="/request-demo"   element={<DemoRequest />} />
        <Route path="/verify-email"   element={<VerifyEmail />} />

        {/* ── Protected app routes ───────────────────────────── */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="jobs"        element={<Jobs />} />
          <Route
            path="candidates"
            element={
              <ProtectedRoute allowedRoles={['super_recruiter', 'recruiter']}>
                <Candidates />
              </ProtectedRoute>
            }
          />
          <Route path="submissions" element={<Submissions />} />
          <Route path="quotations"  element={<Quotations />} />

          {/* ── Admin routes (super_recruiter only) ────────────── */}
          <Route
            path="admin"
            element={
              <ProtectedRoute allowedRoles={['super_recruiter']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          >
            <Route path="overview"   element={<Overview />} />
            <Route path="recruiters" element={<Recruiters />} />
            <Route path="clients"    element={<Clients />} />
            <Route path="invites"    element={<Invites />} />
            <Route path="analytics"  element={<Analytics />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
