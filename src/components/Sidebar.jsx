import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, Users, FileText, ReceiptText,
  ChevronRight, LogOut, ShieldCheck, LayoutGrid, CalendarDays,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ROLE_LABELS } from '../lib/auth'

const recruiterNav = [
  { to: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/jobs',        label: 'Jobs',          icon: Briefcase },
  { to: '/pipeline',    label: 'Pipeline',      icon: LayoutGrid },
  { to: '/interviews',  label: 'Interviews',    icon: CalendarDays },
  { to: '/candidates',  label: 'Candidates',    icon: Users },
  { to: '/submissions', label: 'Submissions',   icon: FileText },
  { to: '/quotations',  label: 'Quotations',    icon: ReceiptText },
]

const clientNav = [
  { to: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/jobs',        label: 'My Jobs',       icon: Briefcase },
  { to: '/submissions', label: 'Candidates',    icon: FileText },
  { to: '/quotations',  label: 'Quotations',    icon: ReceiptText },
]

const candidateNav = [
  { to: '/dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/jobs',        label: 'Browse Jobs',      icon: Briefcase },
  { to: '/submissions', label: 'My Applications',  icon: FileText },
]

function navForRole(role) {
  if (role === 'client')    return clientNav
  if (role === 'candidate') return candidateNav
  return recruiterNav  // recruiter + super_recruiter
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default function Sidebar() {
  const { profile, role, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const navItems  = navForRole(role)
  const adminActive = location.pathname.startsWith('/admin')

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-brand-900 text-white shrink-0">
      {/* Branding */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-500 font-bold text-white text-lg select-none">
          B
        </div>
        <div>
          <p className="font-semibold text-white text-base leading-tight">BenchPro</p>
          <p className="text-xs text-indigo-300">Recruiting Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
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

        {role === 'super_recruiter' && (
          <div className="pt-3 mt-3 border-t border-white/10">
            <p className="px-3 mb-1 text-xs font-semibold text-indigo-400 uppercase tracking-wider">Admin</p>
            <NavLink
              to="/admin/overview"
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                adminActive
                  ? 'bg-amber-500/30 text-amber-200'
                  : 'text-indigo-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ShieldCheck size={18} className="shrink-0" />
              <span className="flex-1">Admin Panel</span>
              {adminActive && <ChevronRight size={14} className="opacity-70" />}
            </NavLink>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials(profile?.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-indigo-300 truncate">{ROLE_LABELS[role] ?? role}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
