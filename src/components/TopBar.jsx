import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'
import SearchModal from './SearchModal'

const pageTitles = {
  '/dashboard':   'Dashboard',
  '/jobs':        'Jobs',
  '/candidates':  'Candidates',
  '/submissions': 'Submissions',
  '/quotations':  'Quotations',
}

const candidateTitles = {
  '/jobs':        'Browse Jobs',
  '/submissions': 'My Applications',
}

export default function TopBar({ onMenuClick }) {
  const { pathname }    = useLocation()
  const { isCandidate } = useAuth()
  const titles = isCandidate ? { ...pageTitles, ...candidateTitles } : pageTitles
  const title  = titles[pathname] ?? 'BenchPro'

  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
          )}
          <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="relative flex items-center gap-2 pl-3 pr-3 sm:pr-4 py-2 text-sm bg-gray-100 border border-transparent rounded-lg hover:bg-gray-200 transition-colors text-gray-500 w-36 sm:w-52 text-left"
          >
            <Search size={15} className="text-gray-400 shrink-0" />
            <span className="flex-1 hidden sm:block">Search…</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-xs font-mono text-gray-400">
              <span>⌘</span><span>K</span>
            </kbd>
          </button>
          <NotificationBell />
        </div>
      </header>

      {open && <SearchModal onClose={() => setOpen(false)} />}
    </>
  )
}
