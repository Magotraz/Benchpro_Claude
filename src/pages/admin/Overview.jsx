import { useEffect, useState } from 'react'
import { Users, Globe, Mail, Clock, CheckCircle, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function Overview() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [profilesRes, invitesRes, demoRes] = await Promise.all([
        supabase.from('profiles').select('role'),
        supabase.from('invites').select('used_at, expires_at'),
        supabase.from('demo_requests').select('status'),
      ])

      if (profilesRes.error) { setError(profilesRes.error.message); setLoading(false); return }

      const profiles = profilesRes.data ?? []
      const invites  = invitesRes.data ?? []
      const demos    = demoRes.data ?? []
      const now      = new Date()

      setStats({
        totalUsers:      profiles.length,
        recruiters:      profiles.filter(p => p.role === 'recruiter').length,
        superRecruiters: profiles.filter(p => p.role === 'super_recruiter').length,
        clients:         profiles.filter(p => p.role === 'client').length,
        candidates:      profiles.filter(p => p.role === 'candidate').length,
        invitesPending:  invites.filter(i => !i.used_at && new Date(i.expires_at) > now).length,
        invitesAccepted: invites.filter(i => !!i.used_at).length,
        demosPending:    demos.filter(d => !d.status || d.status === 'pending').length,
        demosApproved:   demos.filter(d => d.status === 'approved').length,
        totalDemos:      demos.length,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Spinner />
  if (error)   return <ErrorCard message={error} />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',     value: stats.totalUsers,  icon: Users,    color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Recruiters',      value: stats.recruiters,  icon: UserPlus, color: 'bg-violet-50 text-violet-600' },
          { label: 'Clients',         value: stats.clients,     icon: Globe,    color: 'bg-sky-50 text-sky-600' },
          { label: 'Candidates',      value: stats.candidates,  icon: Users,    color: 'bg-emerald-50 text-emerald-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pending Invites"
          value={stats.invitesPending}
          sub={`${stats.invitesAccepted} accepted overall`}
          icon={Mail}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Accepted Invites"
          value={stats.invitesAccepted}
          icon={CheckCircle}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Pending Demo Requests"
          value={stats.demosPending}
          sub={`${stats.demosApproved} approved · ${stats.totalDemos} total`}
          icon={Clock}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon: Icon, iconColor, iconBg }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ErrorCard({ message }) {
  return (
    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      Failed to load: {message}
    </div>
  )
}
