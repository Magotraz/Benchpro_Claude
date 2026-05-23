import { useEffect, useState } from 'react'
import { Briefcase, Users, CheckCircle, ReceiptText, Clock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const STAGE_COLORS = {
  sourced:   'bg-gray-100 text-gray-600',
  screening: 'bg-blue-100 text-blue-700',
  interview: 'bg-violet-100 text-violet-700',
  offer:     'bg-amber-100 text-amber-700',
  placed:    'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-600',
}
const STAGE_LABELS = {
  sourced: 'Sourced', screening: 'Screening', interview: 'Interview',
  offer: 'Offer', placed: 'Placed', rejected: 'Rejected',
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function ClientDashboard() {
  const { profile } = useAuth()
  const [stats, setStats]   = useState(null)
  const [recent, setRecent] = useState([])
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [jobsRes, submRes, quotRes] = await Promise.all([
      supabase.from('jobs').select('id, status'),
      supabase.from('submissions').select('id, stage, updated_at, candidates(full_name, current_title), jobs(title)').order('updated_at', { ascending: false }),
      supabase.from('quotations').select('id, status, fee_amount, currency, quote_number, jobs(title)').order('created_at', { ascending: false }),
    ])

    const jobs  = jobsRes.data ?? []
    const subs  = submRes.data ?? []
    const qts   = quotRes.data ?? []

    setStats({
      activeJobs:       jobs.filter(j => j.status === 'open').length,
      totalCandidates:  subs.length,
      placed:           subs.filter(s => s.stage === 'placed').length,
      pendingQuotes:    qts.filter(q => q.status === 'sent').length,
    })
    setRecent(subs.slice(0, 5))
    setQuotes(qts.filter(q => q.status === 'sent').slice(0, 3))
    setLoading(false)
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-600 rounded-2xl p-6 text-white">
        <p className="text-indigo-200 text-sm font-medium">Client Portal</p>
        <h1 className="text-2xl font-bold mt-1">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-indigo-300 text-sm mt-1">
          Here's a snapshot of your active hiring with BenchPro.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Active Jobs',          value: stats.activeJobs,      icon: Briefcase,    color: 'bg-brand-50 text-brand-600' },
          { label: 'Candidates Submitted', value: stats.totalCandidates, icon: Users,        color: 'bg-violet-50 text-violet-600' },
          { label: 'Placed',               value: stats.placed,          icon: CheckCircle,  color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Quotations Pending',   value: stats.pendingQuotes,   icon: ReceiptText,  color: 'bg-amber-50 text-amber-600' },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent candidates */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Recent Candidates</h2>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No candidates submitted yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map(sub => (
                <li key={sub.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {initials(sub.candidates?.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{sub.candidates?.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {sub.candidates?.current_title ?? ''}
                      {sub.jobs?.title ? ` · ${sub.jobs.title}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[sub.stage] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STAGE_LABELS[sub.stage] ?? sub.stage}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {sub.updated_at ? new Date(sub.updated_at).toLocaleDateString('en-IN', { dateStyle: 'short' }) : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending quotations */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Awaiting Your Approval</h2>
          </div>
          {quotes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No pending quotations.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {quotes.map(q => (
                <li key={q.id} className="px-5 py-4">
                  <p className="text-xs font-mono text-gray-400">{q.quote_number}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{q.jobs?.title ?? 'Placement fee'}</p>
                  <p className="text-base font-bold text-brand-700 mt-1">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: q.currency ?? 'INR' }).format(q.fee_amount ?? 0)}
                  </p>
                  <span className="mt-1 inline-flex px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    Awaiting approval
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
