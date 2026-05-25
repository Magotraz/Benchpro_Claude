import { useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'

const pageTitles = {
  '/dashboard':   'Dashboard',
  '/jobs':        'Jobs',
  '/candidates':  'Candidates',
  '/submissions': 'Submissions',
  '/quotations':  'Quotations',
}

// Candidate-facing labels override the defaults
const candidateTitles = {
  '/jobs':        'Browse Jobs',
  '/submissions': 'My Applications',
}

export default function TopBar() {
  const { pathname }      = useLocation()
  const { isCandidate }   = useAuth()
  const titles = isCandidate ? { ...pageTitles, ...candidateTitles } : pageTitles
  const title  = titles[pathname] ?? 'BenchPro'

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search…"
            className="pl-9 pr-4 py-2 text-sm bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:border-brand-500 focus:bg-white transition-colors w-52"
          />
        </div>
        <NotificationBell />
      </div>
    </header>
  )
}
