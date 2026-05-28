import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function PublicNav() {
  const { user, role } = useAuth()
  const navigate = useNavigate()

  function dashboardPath() {
    if (role === 'candidate') return '/candidate/dashboard'
    return '/dashboard'
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to="/jobs" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white text-sm">B</div>
          <span className="font-semibold text-gray-800 text-lg">BenchPro</span>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <button
              onClick={() => navigate(dashboardPath())}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
                Sign in
              </Link>
              <Link to="/register" className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors">
                Register free
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
