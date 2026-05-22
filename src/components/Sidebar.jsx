import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  ReceiptText,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/jobs',        label: 'Jobs',         icon: Briefcase },
  { to: '/candidates',  label: 'Candidates',   icon: Users },
  { to: '/submissions', label: 'Submissions',  icon: FileText },
  { to: '/quotations',  label: 'Quotations',   icon: ReceiptText },
]

export default function Sidebar() {
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
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold text-white">
            SM
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">Sachin Magotra</p>
            <p className="text-xs text-indigo-300 truncate">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
