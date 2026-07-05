import { useEffect, useState } from 'react'
import { Outlet, NavLink, useLocation, Navigate } from 'react-router-dom'
import { LayoutDashboard, Users, Globe, Mail, BarChart2, ShieldCheck, Shield, ClipboardList, Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const tabs = [
  { to: '/admin/overview',     label: 'Overview',     icon: LayoutDashboard },
  { to: '/admin/recruiters',   label: 'Recruiters',   icon: Users },
  { to: '/admin/clients',      label: 'Clients',      icon: Globe },
  { to: '/admin/invites',      label: 'Invites',      icon: Mail },
  { to: '/admin/assignments',  label: 'Assignments',  icon: ClipboardList },
  { to: '/admin/analytics',    label: 'Analytics',    icon: BarChart2 },
  { to: '/admin/billing',      label: 'Billing',      icon: Receipt },
  { to: '/admin/audit-log',    label: 'Audit Log',    icon: Shield },
]

export default function AdminPanel() {
  const location = useLocation()
  const [pendingClients, setPendingClients] = useState(0)

  // Refetch whenever the admin route changes so the glow clears once
  // requests are reviewed from the Clients tab.
  useEffect(() => {
    supabase
      .from('demo_requests')
      .select('status')
      .then(({ data }) => {
        const n = (data ?? []).filter(r => !r.status || r.status === 'new' || r.status === 'pending').length
        setPendingClients(n)
      })
  }, [location.pathname])

  if (location.pathname === '/admin' || location.pathname === '/admin/') {
    return <Navigate to="/admin/overview" replace />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <ShieldCheck size={20} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
          <p className="text-sm text-gray-500">Platform management — recruiters, clients, invites &amp; analytics</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`
            }
          >
            <Icon size={15} />
            {label}
            {to === '/admin/clients' && pendingClients > 0 && (
              <span className="relative flex h-2 w-2 ml-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            )}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  )
}
