import { useEffect, useState } from 'react'
import { TrendingUp, Users, Mail, Globe } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const ROLE_COLORS = {
  super_recruiter: 'bg-amber-500',
  recruiter:       'bg-brand-500',
  client:          'bg-sky-500',
  candidate:       'bg-emerald-500',
}

const ROLE_LABELS = {
  super_recruiter: 'Super Recruiter',
  recruiter:       'Recruiter',
  client:          'Client',
  candidate:       'Candidate',
}

export default function Analytics() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    async function load() {
      const [profilesRes, invitesRes, demoRes] = await Promise.all([
        supabase.from('profiles').select('role, created_at'),
        supabase.from('invites').select('role, used_at, created_at, expires_at'),
        supabase.from('demo_requests').select('status, created_at'),
      ])

      if (profilesRes.error) { setError(profilesRes.error.message); setLoading(false); return }

      const profiles = profilesRes.data ?? []
      const invites  = invitesRes.data ?? []
      const demos    = demoRes.data ?? []
      const now      = new Date()
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)

      const byRole = {
        super_recruiter: profiles.filter(p => p.role === 'super_recruiter').length,
        recruiter:       profiles.filter(p => p.role === 'recruiter').length,
        client:          profiles.filter(p => p.role === 'client').length,
        candidate:       profiles.filter(p => p.role === 'candidate').length,
      }

      const totalInvites    = invites.length
      const acceptedInvites = invites.filter(i => !!i.used_at).length
      const conversionRate  = totalInvites > 0 ? Math.round((acceptedInvites / totalInvites) * 100) : 0

      const recentSignups7d  = profiles.filter(p => new Date(p.created_at) > sevenDaysAgo).length
      const recentSignups30d = profiles.filter(p => new Date(p.created_at) > thirtyDaysAgo).length

      const demosPending  = demos.filter(d => !d.status || d.status === 'pending').length
      const demosApproved = demos.filter(d => d.status === 'approved').length
      const demosRejected = demos.filter(d => d.status === 'rejected').length

      setData({
        byRole,
        totalUsers: profiles.length,
        totalInvites,
        acceptedInvites,
        conversionRate,
        recentSignups7d,
        recentSignups30d,
        demosPending,
        demosApproved,
        demosRejected,
        totalDemos: demos.length,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      Failed to load analytics: {error}
    </div>
  )

  const maxRole = Math.max(...Object.values(data.byRole), 1)

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'New signups (7d)',    value: data.recentSignups7d,  icon: TrendingUp, color: 'text-brand-600',   bg: 'bg-brand-50' },
          { label: 'New signups (30d)',   value: data.recentSignups30d, icon: Users,      color: 'text-indigo-600',  bg: 'bg-indigo-50' },
          { label: 'Invite conversion',   value: `${data.conversionRate}%`, icon: Mail,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Demo requests',       value: data.totalDemos,       icon: Globe,      color: 'text-sky-600',     bg: 'bg-sky-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500 font-medium">{label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon size={15} className={color} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by role */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5">Platform users by role</h2>
          <div className="space-y-4">
            {Object.entries(data.byRole).map(([role, count]) => (
              <div key={role} className="flex items-center gap-4">
                <p className="text-sm text-gray-600 w-32 shrink-0">{ROLE_LABELS[role]}</p>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${ROLE_COLORS[role]}`}
                    style={{ width: `${Math.max(count > 0 ? (count / maxRole) * 100 : 0, count > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <p className="text-sm font-semibold text-gray-700 w-6 text-right shrink-0">{count}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">{data.totalUsers} total users on platform</p>
        </div>

        {/* Invite funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5">Invite performance</h2>
          <div className="space-y-3">
            {[
              { label: 'Sent',     value: data.totalInvites,    pct: 100,                                               color: 'bg-indigo-400' },
              { label: 'Accepted', value: data.acceptedInvites, pct: data.totalInvites > 0 ? (data.acceptedInvites / data.totalInvites) * 100 : 0, color: 'bg-emerald-500' },
              { label: 'Pending',  value: data.totalInvites - data.acceptedInvites, pct: data.totalInvites > 0 ? ((data.totalInvites - data.acceptedInvites) / data.totalInvites) * 100 : 0, color: 'bg-amber-400' },
            ].map(({ label, value, pct, color }) => (
              <div key={label} className="flex items-center gap-4">
                <p className="text-sm text-gray-600 w-16 shrink-0">{label}</p>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${color}`}
                    style={{ width: `${Math.max(value > 0 ? pct : 0, value > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <p className="text-sm font-semibold text-gray-700 w-6 text-right shrink-0">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">{data.conversionRate}% conversion rate overall</p>
        </div>
      </div>

      {/* Demo request funnel */}
      {data.totalDemos > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-6">Demo request funnel</h2>
          <div className="flex items-end gap-6 h-32">
            {[
              { label: 'Received', value: data.totalDemos,      color: 'bg-sky-400' },
              { label: 'Approved', value: data.demosApproved,   color: 'bg-emerald-500' },
              { label: 'Pending',  value: data.demosPending,    color: 'bg-amber-400' },
              { label: 'Rejected', value: data.demosRejected,   color: 'bg-red-400' },
            ].map(({ label, value, color }) => {
              const heightPct = data.totalDemos > 0
                ? Math.max(value > 0 ? (value / data.totalDemos) * 100 : 0, value > 0 ? 8 : 0)
                : 0
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-2">
                  <p className="text-sm font-bold text-gray-700">{value}</p>
                  <div className="w-full bg-gray-100 rounded-t-lg relative flex-1">
                    <div
                      className={`absolute bottom-0 w-full rounded-t-lg ${color} transition-all`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
