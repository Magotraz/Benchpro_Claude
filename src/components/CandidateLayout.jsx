import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, User, FileText, Briefcase, ClipboardList,
  ChevronRight, LogOut,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import NotificationBell from './NotificationBell'

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV = [
  { to: '/candidate/dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/candidate/profile',      label: 'My Profile',      icon: User },
  { to: '/candidate/resume',       label: 'My Resume',       icon: FileText },
  { to: '/candidate/jobs',         label: 'Browse Jobs',     icon: Briefcase },
  { to: '/candidate/applications', label: 'My Applications', icon: ClipboardList },
]

const PAGE_TITLES = {
  '/candidate/dashboard':    'Dashboard',
  '/candidate/profile':      'My Profile',
  '/candidate/resume':       'My Resume',
  '/candidate/jobs':         'Browse Jobs',
  '/candidate/applications': 'My Applications',
}

const COMPLETION_FIELDS = [
  'phone', 'location', 'current_title', 'current_company',
  'experience_years', 'summary', 'linkedin_url', 'resume_url',
]

function completionPct(cp) {
  if (!cp) return 0
  // full_name + email always filled = 2 automatic points
  const optional = COMPLETION_FIELDS.filter(f => cp[f] !== null && cp[f] !== undefined && cp[f] !== '').length
  const hasSkills = cp.skills?.length > 0 ? 1 : 0
  // 2 always-filled + 8 optional + 1 skills = 11 total → show as /10 to reward completion
  const score = Math.min(2 + optional + hasSkills, 10)
  return Math.round((score / 10) * 100)
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ─── Main layout ──────────────────────────────────────────────────────────────

export default function CandidateLayout() {
  const { user, profile, signOut } = useAuth()
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const [cp, setCp] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    supabase.from('candidate_profiles').select('*').eq('user_id', user.id).single()
      .then(({ data }) => setCp(data ?? null))
  }, [user?.id])

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const pct   = completionPct(cp)
  const title = PAGE_TITLES[pathname] ?? 'Candidate Portal'

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className="flex flex-col w-64 min-h-screen bg-brand-900 text-white shrink-0">

        {/* Branding */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-white text-lg">B</div>
          <div>
            <p className="font-semibold text-white text-base leading-tight">BenchPro</p>
            <p className="text-xs text-indigo-300">Candidate Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className="shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={14} className="opacity-70" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Profile completion bar */}
        <div className="px-3 pb-3">
          <div className="bg-white/10 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-indigo-200">Profile complete</p>
              <p className="text-xs font-bold text-white">{pct}%</p>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-400' : 'bg-brand-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct < 100 && (
              <button
                onClick={() => navigate('/candidate/profile')}
                className="mt-2 text-xs text-indigo-300 hover:text-white transition-colors"
              >
                Complete profile →
              </button>
            )}
          </div>
        </div>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials(profile?.full_name ?? cp?.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? cp?.full_name ?? 'Candidate'}</p>
              <p className="text-xs text-indigo-300 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
          <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ cp, setCp, pct }} />
        </main>
      </div>
    </div>
  )
}

// Helper exported so child pages can use the same calculation
export { completionPct }
