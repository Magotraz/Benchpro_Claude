import { useEffect, useState } from 'react'
import { Briefcase, Users, FileText, ReceiptText, TrendingUp, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [stats, setStats]       = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const [jobsRes, candRes, submRes, quotRes, notesRes] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('candidates').select('id', { count: 'exact', head: true }),
        supabase.from('submissions').select('id', { count: 'exact', head: true }),
        supabase.from('quotations').select('id', { count: 'exact', head: true }).in('status', ['draft', 'sent']),
        supabase.from('submission_notes')
          .select('content, type, created_at, profiles!author_id(full_name), submissions(stage, candidates(full_name), jobs(title))')
          .order('created_at', { ascending: false })
          .limit(6),
      ])
      setStats({
        jobs:        jobsRes.count ?? 0,
        candidates:  candRes.count ?? 0,
        submissions: submRes.count ?? 0,
        quotations:  quotRes.count ?? 0,
      })
      setActivity(notesRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const statCards = stats ? [
    { label: 'Active Jobs',     value: stats.jobs,        icon: Briefcase,   color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Candidates',      value: stats.candidates,  icon: Users,       color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Submissions',     value: stats.submissions, icon: FileText,    color: 'bg-amber-50 text-amber-600' },
    { label: 'Open Quotations', value: stats.quotations,  icon: ReceiptText, color: 'bg-rose-50 text-rose-600' },
  ] : []

  function activityLabel(note) {
    if (note.type === 'stage_change') return 'Stage updated'
    return 'Note added'
  }

  function activityDetail(note) {
    const candidate = note.submissions?.candidates?.full_name
    const job       = note.submissions?.jobs?.title
    if (candidate && job) return `${candidate} → ${job}`
    if (candidate) return candidate
    return note.content
  }

  function timeAgo(d) {
    const s = Math.floor((Date.now() - new Date(d)) / 1000)
    if (s < 60)   return `${s}s ago`
    if (s < 3600) return `${Math.floor(s/60)}m ago`
    if (s < 86400) return `${Math.floor(s/3600)}h ago`
    return `${Math.floor(s/86400)}d ago`
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[0,1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24 animate-pulse bg-gray-50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                  <TrendingUp size={11} /> live
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Recent Activity</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activity.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No activity yet. Start adding jobs and candidates.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {activity.map((note, i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">{activityLabel(note)}</p>
                  <p className="text-xs text-gray-400 truncate">{activityDetail(note)}</p>
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                  <Clock size={11} /> {timeAgo(note.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
