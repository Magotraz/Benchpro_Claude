import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function NotFound() {
  const { user, role } = useAuth()
  const navigate = useNavigate()

  const dashboardPath = role === 'candidate' ? '/candidate/dashboard' : '/dashboard'

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-8xl font-extrabold text-gray-900 tracking-tight leading-none">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          Only The Best Make It.
        </h1>
        <p className="mt-3 text-base text-gray-500">
          Looks like this page didn't make the cut.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="px-6 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-full hover:bg-gray-700 transition-colors"
          >
            Go to homepage
          </Link>
          {user && (
            <button
              onClick={() => navigate(dashboardPath)}
              className="px-6 py-2.5 text-sm font-semibold text-gray-900 bg-white rounded-full border border-gray-900 hover:bg-gray-50 transition-colors"
            >
              Go to dashboard
            </button>
          )}
        </div>
        <p className="mt-10 text-xs text-gray-400">
          BenchPro<span className="text-indigo-600">:</span> Recruiting Platform
        </p>
      </div>
    </div>
  )
}
