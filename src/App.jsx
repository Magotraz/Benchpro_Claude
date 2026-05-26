import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

// Auth pages
import Login           from './pages/auth/Login'
import SignupCandidate from './pages/auth/SignupCandidate'
import AcceptInvite    from './pages/auth/AcceptInvite'
import DemoRequest     from './pages/auth/DemoRequest'
import VerifyEmail     from './pages/auth/VerifyEmail'

// Recruiter/admin pages
import Dashboard   from './pages/Dashboard'
import Jobs        from './pages/Jobs'
import Candidates  from './pages/Candidates'
import Submissions from './pages/Submissions'
import Quotations  from './pages/Quotations'
import Pipeline           from './pages/Pipeline'
import InterviewCalendar  from './pages/InterviewCalendar'

// Client portal pages
import ClientDashboard   from './pages/client/ClientDashboard'
import ClientJobs        from './pages/client/ClientJobs'
import ClientSubmissions from './pages/client/ClientSubmissions'
import ClientQuotations  from './pages/client/ClientQuotations'

// Admin pages (super_recruiter only)
import AdminPanel  from './pages/admin/AdminPanel'
import Overview    from './pages/admin/Overview'
import Recruiters  from './pages/admin/Recruiters'
import Clients     from './pages/admin/Clients'
import Invites     from './pages/admin/Invites'
import Analytics   from './pages/admin/Analytics'

function ByRole({ client: clientEl, recruiter: recruiterEl }) {
  const { role } = useAuth()
  return role === 'client' ? clientEl : recruiterEl
}

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

          <Route path="dashboard"   element={<ByRole client={<ClientDashboard />}   recruiter={<Dashboard />} />} />
          <Route path="jobs"        element={<ByRole client={<ClientJobs />}        recruiter={<Jobs />} />} />
          <Route path="submissions" element={<ByRole client={<ClientSubmissions />} recruiter={<Submissions />} />} />
          <Route path="quotations"  element={<ByRole client={<ClientQuotations />}  recruiter={<Quotations />} />} />

          <Route
            path="candidates"
            element={
              <ProtectedRoute allowedRoles={['super_recruiter', 'recruiter']}>
                <Candidates />
              </ProtectedRoute>
            }
          />
          <Route
            path="pipeline"
            element={
              <ProtectedRoute allowedRoles={['super_recruiter', 'recruiter']}>
                <Pipeline />
              </ProtectedRoute>
            }
          />
          <Route
            path="interviews"
            element={
              <ProtectedRoute allowedRoles={['super_recruiter', 'recruiter']}>
                <InterviewCalendar />
              </ProtectedRoute>
            }
          />

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
