import { useEffect, useState } from 'react'
import {
  TrendingUp, Users, Mail, Globe, IndianRupee,
  UserCheck, Clock, BarChart2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'

// ── Stage config ─────────────────────────────────────────────────────────────
const FUNNEL_STAGES = [
  { id: 'sourced',   label: 'Sourced',   color: 'bg-gray-400' },
  { id: 'screening', label: 'Screening', color: 'bg-blue-500' },
  { id: 'interview', label: 'Interview', color: 'bg-violet-500' },
  { id: 'offer',     label: 'Offer',     color: 'bg-amber-500' },
  { id: 'placed',    label: 'Placed',    color: 'bg-emerald-500' },
  { id: 'rejected',  label: 'Rejected',  color: 'bg-red-400' },
]

const ROLE_COLORS  = { super_recruiter: 'bg-amber-500', recruiter: 'bg-brand-500', client: 'bg-sky-500', candidate: 'bg-emerald-500' }
const ROLE_LABELS  = { super_recruiter: 'Super Recruiter', recruiter: 'Recruiter', client: 'Client', candidate: 'Candidate' }

// ── Helpers ───────────────────────────────────────────────────────────────────
function n(v) { return Number(v ?? 0) }

function Bar({ pct, color, minPct = 0 }) {
  const width = pct > 0 ? Math.max(pct, minPct) : 0
  return (
    <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${width}%` }} />
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={15} className={iconColor} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function SectionHeader({ title, sub }) {
  return (
    <div className="mb-5">
      <h2 className="font-semibold text-gray-800">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function EmptyState({ message }) {
  return <p className="text-sm text-gray-400 text-center py-8">{message}</p>
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Analytics() {
  const [d, setD]         = useState(null)
  const [loading, setL]   = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [
        funnelRes, revenueRes, recruiterRes, ttfRes,
        profilesRes, invitesRes, demosRes, quotesRes,
      ] = await Promise.all([
        supabase.rpc('get_pipeline_funnel'),
        supabase.rpc('get_monthly_revenue', { months: 6 }),
        supabase.rpc('get_recruiter_performance'),
        supabase.rpc('get_time_to_fill'),
        supabase.from('profiles').select('role, created_at'),
        supabase.from('invites').select('used_at, expires_at'),
        supabase.from('demo_requests').select('status'),
        supabase.from('quotations').select('fee_amount, status'),
      ])

      if (funnelRes.error) { setError(funnelRes.error.message); setL(false); return }

      const funnel    = funnelRes.data    ?? []
      const revenue   = revenueRes.data   ?? []
      const recruiters = recruiterRes.data ?? []
      const ttf        = ttfRes.data       ?? []
      const profiles   = profilesRes.data  ?? []
      const invites    = invitesRes.data   ?? []
      const demos      = demosRes.data     ?? []
      const quotes     = quotesRes.data    ?? []

      // Pipeline funnel — ensure all stages present
      const funnelMap  = Object.fromEntries(funnel.map(r => [r.stage, n(r.count)]))
      const funnelRows = FUNNEL_STAGES.map(s => ({ ...s, count: funnelMap[s.id] ?? 0 }))
      const maxFunnel  = Math.max(...funnelRows.map(r => r.count), 1)

      // KPIs
      const activePipeline = ['sourced','screening','interview','offer']
        .reduce((sum, s) => sum + (funnelMap[s] ?? 0), 0)
      const placedCount    = funnelMap['placed'] ?? 0
      const totalRevenue   = quotes
        .filter(q => ['approved','invoiced'].includes(q.status))
        .reduce((sum, q) => sum + n(q.fee_amount), 0)
      const avgDaysToFill  = ttf.length
        ? Math.round(ttf.reduce((s, r) => s + n(r.days_to_fill), 0) / ttf.length)
        : null

      // Monthly revenue
      const maxRevenue = Math.max(...revenue.map(r => n(r.revenue)), 1)

      // Platform metrics
      const now = new Date()
      const thirtyDaysAgo = new Date(now - 30 * 86400000)
      const byRole = {
        super_recruiter: profiles.filter(p => p.role === 'super_recruiter').length,
        recruiter:       profiles.filter(p => p.role === 'recruiter').length,
        client:          profiles.filter(p => p.role === 'client').length,
        candidate:       profiles.filter(p => p.role === 'candidate').length,
      }
      const maxRole        = Math.max(...Object.values(byRole), 1)
      const recentSignups  = profiles.filter(p => new Date(p.created_at) > thirtyDaysAgo).length
      const totalInvites   = invites.length
      const acceptedInvites = invites.filter(i => !!i.used_at).length
      const conversionRate = totalInvites > 0 ? Math.round((acceptedInvites / totalInvites) * 100) : 0
      const demosPending   = demos.filter(d => !d.status || d.status === 'pending').length
      const demosApproved  = demos.filter(d => d.status === 'approved').length
      const demosRejected  = demos.filter(d => d.status === 'rejected').length

      setD({
        funnelRows, maxFunnel,
        revenue, maxRevenue,
        recruiters,
        ttf,
        activePipeline, placedCount, totalRevenue, avgDaysToFill,
        byRole, maxRole, recentSignups,
        totalInvites, acceptedInvites, conversionRate,
        demosPending, demosApproved, demosRejected,
        totalDemos: demos.length, totalUsers: profiles.length,
      })
      setL(false)
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

  return (
    <div className="space-y-8">

      {/* ── Recruiting KPIs ─────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Recruiting Overview" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Active pipeline"
            value={d.activePipeline}
            icon={BarChart2}
            iconBg="bg-brand-50"
            iconColor="text-brand-600"
            sub="Sourced → Offer"
          />
          <KpiCard
            label="Candidates placed"
            value={d.placedCount}
            icon={UserCheck}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            sub="Successful hires"
          />
          <KpiCard
            label="Approved revenue"
            value={formatCurrency(d.totalRevenue, 'INR')}
            icon={IndianRupee}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
            sub="All-time invoiced + approved"
          />
          <KpiCard
            label="Avg. days to fill"
            value={d.avgDaysToFill !== null ? `${d.avgDaysToFill}d` : '—'}
            icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            sub={d.ttf.length > 0 ? `Across ${d.ttf.length} filled job${d.ttf.length > 1 ? 's' : ''}` : 'No filled jobs yet'}
          />
        </div>
      </div>

      {/* ── Pipeline funnel + Monthly revenue ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pipeline funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeader title="Pipeline funnel" sub="Candidates by current stage" />
          <div className="space-y-3">
            {d.funnelRows.map(({ id, label, color, count }) => (
              <div key={id} className="flex items-center gap-4">
                <p className="text-sm text-gray-600 w-20 shrink-0">{label}</p>
                <Bar pct={count > 0 ? (count / d.maxFunnel) * 100 : 0} color={color} minPct={3} />
                <p className="text-sm font-semibold text-gray-700 w-5 text-right shrink-0">{count}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            {d.funnelRows.reduce((s, r) => s + r.count, 0)} total submissions
          </p>
        </div>

        {/* Monthly revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeader title="Monthly revenue" sub="Approved & invoiced quotations — last 6 months" />
          {d.revenue.length === 0 ? (
            <EmptyState message="No approved revenue yet. Advance a quotation to 'Approved' to see data here." />
          ) : (
            <div className="flex items-end gap-3 h-36 mt-2">
              {d.revenue.map(({ month, revenue: rev }) => {
                const pct = d.maxRevenue > 0 ? Math.max((n(rev) / d.maxRevenue) * 100, n(rev) > 0 ? 6 : 0) : 0
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate w-full text-center">
                      {formatCurrency(n(rev), 'INR')}
                    </p>
                    <div className="w-full bg-gray-100 rounded-t-lg relative flex-1">
                      <div
                        className="absolute bottom-0 w-full bg-brand-500 rounded-t-lg transition-all duration-500"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 truncate w-full text-center">{month}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Recruiter performance ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <SectionHeader title="Recruiter performance" sub="Submissions, placements, and pipeline value per recruiter" />
        {d.recruiters.length === 0 ? (
          <EmptyState message="No recruiter data yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Recruiter','Submissions','Placed','Rejected','Success rate','Pipeline value'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap first:pl-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {d.recruiters.map(r => {
                  const subs       = n(r.submissions)
                  const placed     = n(r.placed)
                  const rejected   = n(r.rejected)
                  const successPct = subs > 0 ? Math.round((placed / subs) * 100) : 0
                  return (
                    <tr key={r.recruiter_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 pl-0 whitespace-nowrap">
                        {r.recruiter_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-semibold">{subs}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          {placed}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                          {rejected}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${successPct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{successPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                        {formatCurrency(n(r.pipeline_value), 'INR')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Time to fill ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <SectionHeader title="Time to fill" sub="Days from job creation to first placed candidate" />
        {d.ttf.length === 0 ? (
          <EmptyState message="No filled positions yet. Place a candidate to see time-to-fill metrics." />
        ) : (
          <div className="space-y-2">
            {d.ttf.map(({ job_id, job_title, days_to_fill }) => {
              const days     = n(days_to_fill)
              const maxDays  = Math.max(...d.ttf.map(r => n(r.days_to_fill)), 1)
              const pct      = Math.max((days / maxDays) * 100, 4)
              const color    = days <= 14 ? 'bg-emerald-500'
                             : days <= 30 ? 'bg-amber-500'
                             : 'bg-red-400'
              return (
                <div key={job_id} className="flex items-center gap-4">
                  <p className="text-sm text-gray-700 w-56 shrink-0 truncate">{job_title}</p>
                  <Bar pct={pct} color={color} />
                  <p className="text-sm font-semibold text-gray-700 w-14 shrink-0 text-right whitespace-nowrap">
                    {days}d
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Platform metrics ─────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Platform metrics" sub="Users, invites, and demo requests" />

        {/* KPIs row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'New signups (30d)', value: d.recentSignups,   icon: TrendingUp, color: 'text-brand-600',   bg: 'bg-brand-50' },
            { label: 'Total users',       value: d.totalUsers,      icon: Users,      color: 'text-indigo-600',  bg: 'bg-indigo-50' },
            { label: 'Invite conversion', value: `${d.conversionRate}%`, icon: Mail,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Demo requests',     value: d.totalDemos,      icon: Globe,      color: 'text-sky-600',     bg: 'bg-sky-50' },
          ].map(({ label, value, icon, color, bg }) => (
            <KpiCard key={label} label={label} value={value} icon={icon} iconBg={bg} iconColor={color} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users by role */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-5">Users by role</h3>
            <div className="space-y-3">
              {Object.entries(d.byRole).map(([role, count]) => (
                <div key={role} className="flex items-center gap-4">
                  <p className="text-sm text-gray-600 w-32 shrink-0">{ROLE_LABELS[role]}</p>
                  <Bar pct={count > 0 ? (count / d.maxRole) * 100 : 0} color={ROLE_COLORS[role]} minPct={3} />
                  <p className="text-sm font-semibold text-gray-700 w-6 text-right shrink-0">{count}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">{d.totalUsers} total users</p>
          </div>

          {/* Invite performance */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-5">Invite performance</h3>
            <div className="space-y-3">
              {[
                { label: 'Sent',     value: d.totalInvites,                              pct: 100,                                                                            color: 'bg-indigo-400' },
                { label: 'Accepted', value: d.acceptedInvites,                           pct: d.totalInvites > 0 ? (d.acceptedInvites / d.totalInvites) * 100 : 0,            color: 'bg-emerald-500' },
                { label: 'Pending',  value: d.totalInvites - d.acceptedInvites,          pct: d.totalInvites > 0 ? ((d.totalInvites - d.acceptedInvites) / d.totalInvites) * 100 : 0, color: 'bg-amber-400' },
              ].map(({ label, value, pct, color }) => (
                <div key={label} className="flex items-center gap-4">
                  <p className="text-sm text-gray-600 w-16 shrink-0">{label}</p>
                  <Bar pct={value > 0 ? Math.max(pct, 3) : 0} color={color} />
                  <p className="text-sm font-semibold text-gray-700 w-6 text-right shrink-0">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">{d.conversionRate}% conversion rate overall</p>
          </div>
        </div>
      </div>

      {/* ── Demo request funnel ──────────────────────────────────────────────── */}
      {d.totalDemos > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeader title="Demo request funnel" />
          <div className="flex items-end gap-6 h-32">
            {[
              { label: 'Received', value: d.totalDemos,    color: 'bg-sky-400' },
              { label: 'Approved', value: d.demosApproved, color: 'bg-emerald-500' },
              { label: 'Pending',  value: d.demosPending,  color: 'bg-amber-400' },
              { label: 'Rejected', value: d.demosRejected, color: 'bg-red-400' },
            ].map(({ label, value, color }) => {
              const pct = d.totalDemos > 0
                ? Math.max(value > 0 ? (value / d.totalDemos) * 100 : 0, value > 0 ? 8 : 0)
                : 0
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-2">
                  <p className="text-sm font-bold text-gray-700">{value}</p>
                  <div className="w-full bg-gray-100 rounded-t-lg relative flex-1">
                    <div className={`absolute bottom-0 w-full rounded-t-lg ${color} transition-all`} style={{ height: `${pct}%` }} />
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
