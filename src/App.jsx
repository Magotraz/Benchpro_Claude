import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import CandidateLayout from './components/CandidateLayout'

// Public pages
import HomePage    from './pages/public/HomePage'
import JobBoard    from './pages/public/JobBoard'
import JobDetail   from './pages/public/JobDetail'

// Auth pages
import Login              from './pages/auth/Login'
import SignupCandidate    from './pages/auth/SignupCandidate'
import RegisterCandidate  from './pages/auth/RegisterCandidate'
import AcceptInvite       from './pages/auth/AcceptInvite'
import DemoRequest        from './pages/auth/DemoRequest'
import VerifyEmail        from './pages/auth/VerifyEmail'
import ForgotPassword     from './pages/auth/ForgotPassword'
import ResetPassword      from './pages/auth/ResetPassword'

// Recruiter/admin pages
import Dashboard          from './pages/Dashboard'
import Jobs               from './pages/Jobs'
import Candidates         from './pages/Candidates'
import Submissions        from './pages/Submissions'
import Quotations         from './pages/Quotations'
import Pipeline           from './pages/Pipeline'
import InterviewCalendar  from './pages/InterviewCalendar'

// Client portal pages
import ClientDashboard    from './pages/client/ClientDashboard'
import ClientJobs         from './pages/client/ClientJobs'
import ClientSubmissions  from './pages/client/ClientSubmissions'
import ClientQuotations   from './pages/client/ClientQuotations'
import ClientApplicants   from './pages/client/ClientApplicants'

// Admin pages
import AdminPanel   from './pages/admin/AdminPanel'
import Overview     from './pages/admin/Overview'
import Recruiters   from './pages/admin/Recruiters'
import Clients      from './pages/admin/Clients'
import Invites      from './pages/admin/Invites'
import Analytics    from './pages/admin/Analytics'
import AuditLog     from './pages/admin/AuditLog'
import Assignments  from './pages/admin/Assignments'
import Billing       from './pages/admin/Billing'

// Other pages
import NotFound from './pages/NotFound'

// Candidate portal pages
import CandidateDashboard    from './pages/candidate/CandidateDashboard'
import CandidateProfile      from './pages/candidate/CandidateProfile'
import CandidateResume       from './pages/candidate/CandidateResume'
import CandidateJobs         from './pages/candidate/CandidateJobs'
import CandidateApplications from './pages/candidate/CandidateApplications'

// ─── Role-aware redirect helpers ─────────────────────────────────────────────

function DashboardByRole() {
  const { role } = useAuth()
  if (role === 'candidate') return <Navigate to="/candidate/dashboard" replace />
  if (role === 'client')    return <ClientDashboard />
  return <Dashboard />
}

function SubmissionsByRole() {
  const { role } = useAuth()
  if (role === 'candidate') return <Navigate to="/candidate/applications" replace />
  if (role === 'client')    return <ClientSubmissions />
  return <Submissions />
}

function QuotationsByRole() {
  const { role } = useAuth()
  if (role === 'candidate') return <Navigate to="/candidate/dashboard" replace />
  if (role === 'client')    return <ClientQuotations />
  return <Quotations />
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <Routes>

        {/* ── Public landing page — / (auth-aware redirect inside) ─ */}
        <Route path="/" element={<HomePage />} />

        {/* ── Public job board ──────────────────────────────────── */}
        <Route path="/jobs"       element={<JobBoard />} />
        <Route path="/jobs/:slug" element={<JobDetail />} />

        {/* ── Public auth routes ────────────────────────────────── */}
        <Route path="/login"            element={<Login />} />
        <Route path="/signup"           element={<SignupCandidate />} />
        <Route path="/register"         element={<RegisterCandidate />} />
        <Route path="/accept-invite"    element={<AcceptInvite />} />
        <Route path="/request-demo"     element={<DemoRequest />} />
        <Route path="/verify-email"     element={<VerifyEmail />} />
        <Route path="/forgot-password"  element={<ForgotPassword />} />
        <Route path="/reset-password"   element={<ResetPassword />} />

        {/* ── Candidate portal (/candidate/*) ──────────────────── */}
        <Route
          path="/candidate"
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <CandidateLayout />
            </ProtectedRoute>
          }
        >
          <Route index               element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"    element={<CandidateDashboard />} />
          <Route path="profile"      element={<CandidateProfile />} />
          <Route path="resume"       element={<CandidateResume />} />
          <Route path="jobs"         element={<CandidateJobs />} />
          <Route path="applications" element={<CandidateApplications />} />
        </Route>

        {/* ── Recruiter / client portal — pathless layout ───────── */}
        {/* Uses a pathless Route so child paths are absolute and   */}
        {/* do not conflict with the public / homepage above.       */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard"   element={<DashboardByRole />} />
          <Route path="/submissions" element={<SubmissionsByRole />} />
          <Route path="/quotations"  element={<QuotationsByRole />} />

          <Route
            path="/manage/jobs"
            element={
              <ProtectedRoute allowedRoles={['super_recruiter', 'recruiter']}>
                <Jobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/jobs"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/applicants"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientApplicants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates"
            element={
              <ProtectedRoute allowedRoles={['super_recruiter', 'recruiter']}>
                <Candidates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pipeline"
            element={
              <ProtectedRoute allowedRoles={['super_recruiter', 'recruiter']}>
                <Pipeline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interviews"
            element={
              <ProtectedRoute allowedRoles={['super_recruiter', 'recruiter']}>
                <InterviewCalendar />
              </ProtectedRoute>
            }
          />

          {/* ── Admin (super_recruiter only) ─────────────────── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['super_recruiter']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          >
            <Route path="overview"     element={<Overview />} />
            <Route path="recruiters"   element={<Recruiters />} />
            <Route path="clients"      element={<Clients />} />
            <Route path="invites"      element={<Invites />} />
            <Route path="assignments"  element={<Assignments />} />
            <Route path="analytics"    element={<Analytics />} />
            <Route path="billing"      element={<Billing />} />
            <Route path="audit-log"    element={<AuditLog />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />

      </Routes>
    </AuthProvider>
  )
}
