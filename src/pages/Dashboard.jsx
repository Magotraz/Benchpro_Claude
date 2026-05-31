import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, Users, FileText, IndianRupee,
  Plus, UserPlus, ReceiptText, Clock,
  ChevronRight, Activity, LayoutGrid, MapPin,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../lib/utils'

// ── Shared helpers ────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { id: 'sourced',   label: 'Sourced',   color: 'bg-gray-400' },
  { id: 'screening', label: 'Screening', color: 'bg-blue-500' },
  { id: 'interview', label: 'Interview', color: 'bg-violet-500' },
  { id: 'offer',     label: 'Offer',     color: 'bg-amber-500' },
  { id: 'placed',    label: 'Placed',    color: 'bg-emerald-500' },
]

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-lg bg-gray-200 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-100 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function ActivityFeed({ items, emptyText = 'No activity yet.' }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-10">{emptyText}</p>
  }
  return (
    <ul className="divide-y divide-gray-100">
      {items.map((note, i) => (
        <li key={i} className="flex items-start gap-3 px-5 py-3.5">
          <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
            note.type === 'stage_change' ? 'bg-brand-500' : 'bg-gray-300'
          }`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">
              {note.submissions?.candidates?.full_name ?? 'Unknown'}
              {note.submissions?.jobs?.title ? ` → ${note.submissions.jobs.title}` : ''}
            </p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{note.content}</p>
          </div>
          <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1 mt-0.5">
            <Clock size={11} /> {timeAgo(note.created_at)}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ── ADMIN / SUPER-RECRUITER DASHBOARD ────────────────────────────────────────
function AdminDashboard() {
  const navigate  = useNavigate()
  const [stats, setStats]         = useState(null)
  const [recruiters, setRecruiters] = useState([])
  const [activity, setActivity]   = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      const startOfMonth = new Date(
        new Date().getFullYear(), new Date().getMonth(), 1,
      ).toISOString()

      const [jobsRes, candRes, submRes, revenueRes, recruiterRes, activityRes] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('candidates').select('id', { count: 'exact', head: true }),
        supabase.from('submissions')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startOfMonth),
        supabase.from('quotations').select('fee_amount').in('status', ['approved', 'invoiced']),
        supabase.rpc('get_recruiter_performance'),
        supabase.from('submission_notes')
          .select('content, type, created_at, profiles!author_id(full_name), submissions(stage, candidates(full_name), jobs(title))')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      setStats({
        jobs:       jobsRes.count ?? 0,
        candidates: candRes.count ?? 0,
        submissionsThisMonth: submRes.count ?? 0,
        revenue: (revenueRes.data ?? []).reduce((s, q) => s + (q.fee_amount ?? 0), 0),
      })
      setRecruiters(recruiterRes.data ?? [])
      setActivity(activityRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <KpiSkeleton />

  const month = new Date().toLocaleString('en-IN', { month: 'long' })

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiCard label="Active Jobs"             value={stats.jobs}            icon={Briefcase}   color="bg-indigo-50 text-indigo-600" />
        <KpiCard label="Total Candidates"        value={stats.candidates}      icon={Users}       color="bg-emerald-50 text-emerald-600" />
        <KpiCard label="Submissions This Month"  value={stats.submissionsThisMonth} icon={FileText} color="bg-amber-50 text-amber-600" sub={month} />
        <KpiCard label="Approved Revenue"        value={formatCurrency(stats.revenue, 'INR')} icon={IndianRupee} color="bg-brand-50 text-brand-600" />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/jobs')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={15} /> Add Job
        </button>
        <button
          onClick={() => navigate('/admin/invites')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:border-brand-400 hover:text-brand-700 text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          <UserPlus size={15} /> Invite Recruiter
        </button>
        <button
          onClick={() => navigate('/quotations')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:border-brand-400 hover:text-brand-700 text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          <ReceiptText size={15} /> New Quotation
        </button>
      </div>

      {/* Recruiter performance + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Activity size={15} className="text-brand-600" />
            <h2 className="font-semibold text-gray-800">Recruiter Performance</h2>
          </div>
          {recruiters.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No recruiter data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {['Recruiter', 'Submissions', 'Placed', 'Rejected', 'Revenue'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recruiters.map(r => (
                    <tr key={r.recruiter_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{r.recruiter_name ?? '—'}</td>
                      <td className="px-4 py-3 font-semibold text-gray-700">{Number(r.submissions)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                          {Number(r.placed)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-600">
                          {Number(r.rejected)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {formatCurrency(Number(r.pipeline_value), 'INR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock size={15} className="text-brand-600" />
            <h2 className="font-semibold text-gray-800">Recent Activity</h2>
          </div>
          <ActivityFeed items={activity} emptyText="No activity yet. Start adding jobs and candidates." />
        </div>
      </div>
    </div>
  )
}

const JOB_STATUS_COLORS = {
  open:    'bg-emerald-100 text-emerald-700',
  draft:   'bg-gray-100 text-gray-500',
  on_hold: 'bg-amber-100 text-amber-700',
  closed:  'bg-red-100 text-red-600',
}
const JOB_STATUS_LABELS = { open: 'Open', draft: 'Draft', on_hold: 'On Hold', closed: 'Closed' }

// ── RECRUITER DASHBOARD ───────────────────────────────────────────────────────
function RecruiterDashboard() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [stats, setStats]           = useState(null)
  const [stageMap, setStageMap]     = useState({})
  const [activity, setActivity]     = useState([])
  const [assignedJobs, setAssignedJobs] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const startOfMonth = new Date(
        new Date().getFullYear(), new Date().getMonth(), 1,
      ).toISOString()

      const [mySubsRes, actRes, assignedRes] = await Promise.all([
        supabase
          .from('submissions')
          .select('id, stage, job_id, candidate_id, created_at')
          .eq('submitted_by', user.id),
        supabase
          .from('submission_notes')
          .select('content, type, created_at, submissions(candidates(full_name), jobs(title))')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('job_assignments')
          .select('jobs(id, title, location, status, employment_type)')
          .eq('recruiter_id', user.id),
      ])

      const mySubs = mySubsRes.data ?? []
      const sm = {}
      for (const s of mySubs) sm[s.stage] = (sm[s.stage] ?? 0) + 1

      const activeJobIds = new Set(
        mySubs.filter(s => !['rejected', 'placed'].includes(s.stage)).map(s => s.job_id),
      )

      setStats({
        activeJobs:          activeJobIds.size,
        candidates:          new Set(mySubs.map(s => s.candidate_id)).size,
        submissionsThisMonth: mySubs.filter(s => s.created_at >= startOfMonth).length,
        placements:          sm['placed'] ?? 0,
      })
      setStageMap(sm)
      setActivity(actRes.data ?? [])
      setAssignedJobs((assignedRes.data ?? []).map(a => a.jobs).filter(Boolean))
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <KpiSkeleton />

  const totalActive = PIPELINE_STAGES
    .filter(s => s.id !== 'placed')
    .reduce((sum, s) => sum + (stageMap[s.id] ?? 0), 0)
  const maxStage = Math.max(...PIPELINE_STAGES.map(s => stageMap[s.id] ?? 0), 1)
  const month = new Date().toLocaleString('en-IN', { month: 'long' })

  return (
    <div className="space-y-6">
      {/* Header with CTA */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">My Dashboard</h1>
          <p className="text-sm text-gray-500">{totalActive} active candidate{totalActive !== 1 ? 's' : ''} in your pipeline</p>
        </div>
        <button
          onClick={() => navigate('/candidates')}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Candidate
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Active Jobs"       value={stats.activeJobs}            icon={LayoutGrid} color="bg-indigo-50 text-indigo-600" />
        <KpiCard label="My Candidates"     value={stats.candidates}            icon={Users}      color="bg-emerald-50 text-emerald-600" />
        <KpiCard label="Submissions (MTM)" value={stats.submissionsThisMonth}  icon={FileText}   color="bg-amber-50 text-amber-600" sub={month} />
        <KpiCard label="Placements"        value={stats.placements}            icon={Briefcase}  color="bg-brand-50 text-brand-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My pipeline */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5">My Pipeline</h2>
          {Object.keys(stageMap).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No submissions yet. Add a candidate to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {PIPELINE_STAGES.map(({ id, label, color }) => {
                const count = stageMap[id] ?? 0
                const pct   = count > 0 ? Math.max((count / maxStage) * 100, 4) : 0
                return (
                  <div key={id} className="flex items-center gap-4">
                    <p className="text-sm text-gray-600 w-20 shrink-0">{label}</p>
                    <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 w-5 text-right shrink-0">{count}</p>
                  </div>
                )
              })}
              {(stageMap['rejected'] ?? 0) > 0 && (
                <p className="text-xs text-gray-400 pt-1">{stageMap['rejected']} rejected</p>
              )}
            </div>
          )}
          <button
            onClick={() => navigate('/pipeline')}
            className="mt-5 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors"
          >
            Open full pipeline <ChevronRight size={14} />
          </button>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock size={15} className="text-brand-600" />
            <h2 className="font-semibold text-gray-800">My Recent Activity</h2>
          </div>
          <ActivityFeed
            items={activity}
            emptyText="No activity yet. Add notes or move a candidate to see updates."
          />
        </div>
      </div>

      {/* Assigned jobs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase size={15} className="text-brand-600" />
            <h2 className="font-semibold text-gray-800">My Assigned Jobs</h2>
          </div>
          <button
            onClick={() => navigate('/manage/jobs')}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1 transition-colors"
          >
            View all <ChevronRight size={13} />
          </button>
        </div>
        {assignedJobs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No jobs assigned yet. Your manager will assign jobs to you.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {assignedJobs.map(job => (
              <div key={job.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{job.title}</p>
                  {job.location && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {job.location}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${JOB_STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {JOB_STATUS_LABELS[job.status] ?? job.status}
                </span>
                <button
                  onClick={() => navigate(`/pipeline?job=${job.id}`)}
                  className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors shrink-0"
                  title="Open pipeline"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Default export — dispatches by role ───────────────────────────────────────
export default function Dashboard() {
  const { isSuperRecruiter } = useAuth()
  return isSuperRecruiter ? <AdminDashboard /> : <RecruiterDashboard />
}
