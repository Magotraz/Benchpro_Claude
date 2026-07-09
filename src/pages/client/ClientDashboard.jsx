import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, Users, CheckCircle2, ReceiptText, Clock, ThumbsUp,
  Pause, ThumbsDown, ChevronRight, CheckCircle, XCircle,
  MessageSquare, Star,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { createNotification } from '../../lib/notifications'

// ─── Constants ────────────────────────────────────────────────────────────────

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
const PIPELINE_STAGES = ['sourced', 'screening', 'interview', 'offer', 'placed']

const VERDICT_BADGE = {
  interested: 'bg-emerald-100 text-emerald-700',
  hold:       'bg-amber-100 text-amber-700',
  pass:       'bg-red-100 text-red-600',
  hire:       'bg-brand-100 text-brand-700',
}

const QUICK_VERDICTS = [
  { id: 'interested', label: 'Interested', icon: ThumbsUp,   active: 'bg-emerald-600 text-white', idle: 'border border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
  { id: 'hold',       label: 'Hold',       icon: Pause,      active: 'bg-amber-500 text-white',   idle: 'border border-amber-300 text-amber-700 hover:bg-amber-50' },
  { id: 'pass',       label: 'Pass',       icon: ThumbsDown, active: 'bg-red-500 text-white',     idle: 'border border-red-300 text-red-600 hover:bg-red-50' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
const BG_COLORS = ['bg-brand-500','bg-violet-500','bg-sky-500','bg-emerald-500','bg-amber-500','bg-rose-500']
function avatarColor(id) { return BG_COLORS[(id?.charCodeAt(0) ?? 0) % BG_COLORS.length] }

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function AwaitingCard({ submission, onVerdict, saving }) {
  const c = submission.candidates
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(submission.candidate_id)}`}>
          {initials(c?.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{c?.full_name}</p>
          {c?.current_title && (
            <p className="text-xs text-gray-400 truncate">{c.current_title}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[submission.stage] ?? 'bg-gray-100 text-gray-500'}`}>
              {STAGE_LABELS[submission.stage] ?? submission.stage}
            </span>
            {submission.jobs?.title && (
              <span className="text-xs text-gray-400 truncate">{submission.jobs.title}</span>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-400 shrink-0">{timeAgo(submission.updated_at)}</span>
      </div>

      {/* Skills */}
      {c?.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {c.skills.slice(0, 4).map(s => (
            <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs">{s}</span>
          ))}
          {c.skills.length > 4 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">+{c.skills.length - 4}</span>
          )}
        </div>
      )}

      {/* Quick verdict buttons */}
      <div className="flex gap-2">
        {QUICK_VERDICTS.map(v => {
          const Icon = v.icon
          const isSaving = saving === v.id
          return (
            <button
              key={v.id}
              onClick={() => onVerdict(v.id)}
              disabled={!!saving}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-60 ${
                isSaving ? v.active : v.idle
              }`}
            >
              <Icon size={11} /> {isSaving ? '…' : v.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [jobs, setJobs]               = useState([])
  const [submissions, setSubmissions] = useState([])
  const [feedbacks, setFeedbacks]     = useState({})
  const [quotations, setQuotations]   = useState([])
  const [recentFb, setRecentFb]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [actioning, setActioning]     = useState({}) // submissionId → verdict being saved
  const [quoteActioning, setQuoteActioning] = useState({}) // quoteId → true

  useEffect(() => { if (user?.id) load() }, [user?.id])

  async function load() {
    setLoading(true)
    const [jobsRes, subsRes, quotRes, fbRes] = await Promise.all([
      supabase.from('jobs')
        .select('id, title, status')
        .eq('status', 'open')
        .order('created_at', { ascending: false }),

      supabase.from('submissions')
        .select('id, stage, submitted_by, updated_at, job_id, candidate_id, candidates(id, full_name, current_title, skills), jobs!inner(id, title, client_id)')
        .order('updated_at', { ascending: false }),

      supabase.from('quotations')
        .select('id, status, fee_amount, currency, quote_number, created_by, jobs(title)')
        .eq('status', 'sent')
        .order('created_at', { ascending: false }),

      supabase.from('client_feedback')
        .select('submission_id, verdict, notes, updated_at, submissions(candidates(full_name), jobs(title))')
        .order('updated_at', { ascending: false })
        .limit(20),
    ])

    setJobs(jobsRes.data ?? [])
    setSubmissions(subsRes.data ?? [])
    setQuotations(quotRes.data ?? [])

    const fbData = fbRes.data ?? []
    const fbMap = {}
    for (const fb of fbData) fbMap[fb.submission_id] = fb
    setFeedbacks(fbMap)
    setRecentFb(fbData.slice(0, 5))
    setLoading(false)
  }

  async function saveVerdict(submission, verdict) {
    setActioning(prev => ({ ...prev, [submission.id]: verdict }))
    await supabase.from('client_feedback').upsert(
      { submission_id: submission.id, client_id: user.id, verdict, updated_at: new Date().toISOString() },
      { onConflict: 'submission_id,client_id' }
    )
    createNotification(
      submission.submitted_by,
      'client_feedback',
      'Client submitted feedback',
      `${submission.candidates?.full_name ?? 'A candidate'} was marked as "${verdict}"`,
      '/pipeline',
    )
    setFeedbacks(prev => ({ ...prev, [submission.id]: { verdict, notes: '' } }))
    setActioning(prev => { const n = { ...prev }; delete n[submission.id]; return n })
  }

  async function handleQuotation(q, decision) {
    setQuoteActioning(prev => ({ ...prev, [q.id]: true }))
    const newStatus = decision === 'approve' ? 'approved' : 'rejected'
    const { error } = await supabase.from('quotations').update({ status: newStatus }).eq('id', q.id)
    if (!error) {
      setQuotations(prev => prev.filter(x => x.id !== q.id))
      createNotification(
        q.created_by,
        'quotation_update',
        decision === 'approve' ? 'Quotation approved' : 'Quotation declined',
        `${q.quote_number} has been ${newStatus} by the client`,
        '/quotations',
      )
    }
    setQuoteActioning(prev => { const n = { ...prev }; delete n[q.id]; return n })
  }

  if (loading) return <Spinner />

  // Derived state
  const placed       = submissions.filter(s => s.stage === 'placed').length
  const awaiting     = submissions.filter(s => !feedbacks[s.id] && s.stage !== 'rejected' && s.stage !== 'placed')

  // Stage counts per job
  const jobStages = {}
  for (const sub of submissions) {
    if (!jobStages[sub.job_id]) jobStages[sub.job_id] = {}
    jobStages[sub.job_id][sub.stage] = (jobStages[sub.job_id][sub.stage] ?? 0) + 1
  }

  const fmt = (amount, currency = 'INR') =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount ?? 0)

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-600 rounded-2xl p-6 text-white">
        <p className="text-indigo-200 text-sm font-medium">Client Portal</p>
        <h1 className="text-2xl font-bold mt-1">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-indigo-300 text-sm mt-1">
          {jobs.length} open role{jobs.length !== 1 ? 's' : ''} &middot; {submissions.length} candidate{submissions.length !== 1 ? 's' : ''} in pipeline
          {awaiting.length > 0 && ` · ${awaiting.length} awaiting your feedback`}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Open Roles"          value={jobs.length}         icon={Briefcase}    color="bg-brand-50 text-brand-600" />
        <KpiCard label="Candidates Submitted" value={submissions.length}  icon={Users}        color="bg-violet-50 text-violet-600" />
        <KpiCard label="Placed"              value={placed}              icon={CheckCircle2}  color="bg-emerald-50 text-emerald-600" />
        <KpiCard label="Awaiting Feedback"   value={awaiting.length}     icon={MessageSquare} color="bg-amber-50 text-amber-600" />
      </div>

      {/* Awaiting feedback */}
      {awaiting.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">Awaiting Your Feedback</h2>
              <p className="text-xs text-gray-400 mt-0.5">Let your recruiter know what you think</p>
            </div>
            {awaiting.length > 6 && (
              <button
                onClick={() => navigate('/submissions')}
                className="text-xs text-brand-600 hover:underline flex items-center gap-1"
              >
                View all {awaiting.length} <ChevronRight size={12} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {awaiting.slice(0, 6).map(sub => (
              <AwaitingCard
                key={sub.id}
                submission={sub}
                saving={actioning[sub.id] ?? null}
                onVerdict={verdict => saveVerdict(sub, verdict)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Open roles + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Open roles */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Your Open Roles</h2>
            <button
              onClick={() => navigate('/submissions')}
              className="text-xs text-brand-600 hover:underline flex items-center gap-1"
            >
              All candidates <ChevronRight size={12} />
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-12">
              <Briefcase size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="font-medium text-gray-500">No open roles</p>
              <p className="text-sm text-gray-400 mt-1">Your recruiter will add roles once hiring starts.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {jobs.map(job => {
                const stages = jobStages[job.id] ?? {}
                const total = Object.values(stages).reduce((a, b) => a + b, 0)
                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => navigate(`/submissions?job=${job.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{job.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{total} candidate{total !== 1 ? 's' : ''}</p>
                      </div>
                      <ChevronRight size={14} className="text-gray-400 shrink-0 mt-0.5" />
                    </div>

                    {/* Stage pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {PIPELINE_STAGES.map(stage => {
                        const count = stages[stage]
                        if (!count) return null
                        return (
                          <span key={stage} className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[stage]}`}>
                            {STAGE_LABELS[stage]} {count}
                          </span>
                        )
                      })}
                      {stages.rejected > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS.rejected}`}>
                          Rejected {stages.rejected}
                        </span>
                      )}
                      {total === 0 && (
                        <span className="text-xs text-gray-400">No candidates yet</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Pending quotations */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Pending Quotations</h2>
            </div>
            {quotations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No pending quotations.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {quotations.map(q => (
                  <li key={q.id} className="px-5 py-4 space-y-3">
                    <div>
                      <p className="text-xs font-mono text-gray-400">{q.quote_number}</p>
                      <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">{q.jobs?.title ?? 'Placement fee'}</p>
                      <p className="text-lg font-bold text-brand-700 mt-0.5">{fmt(q.fee_amount, q.currency)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleQuotation(q, 'approve')}
                        disabled={!!quoteActioning[q.id]}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={12} /> {quoteActioning[q.id] ? '…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleQuotation(q, 'decline')}
                        disabled={!!quoteActioning[q.id]}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <XCircle size={12} /> Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent feedback activity */}
          {recentFb.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Your Recent Feedback</h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {recentFb.map(fb => {
                  const candidate = fb.submissions?.candidates?.full_name
                  const jobTitle  = fb.submissions?.jobs?.title
                  return (
                    <li key={fb.submission_id} className="px-5 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{candidate ?? '—'}</p>
                        {jobTitle && <p className="text-xs text-gray-400 truncate">{jobTitle}</p>}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${VERDICT_BADGE[fb.verdict] ?? 'bg-gray-100 text-gray-500'}`}>
                          {fb.verdict}
                        </span>
                        <span className="text-xs text-gray-400">{timeAgo(fb.updated_at)}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="px-5 py-3 border-t border-gray-100">
                <button
                  onClick={() => navigate('/submissions')}
                  className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                >
                  View all candidates <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Empty state if no sidebar content */}
          {quotations.length === 0 && recentFb.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-10 px-5">
              <Star size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-500">All caught up</p>
              <p className="text-xs text-gray-400 mt-1">No pending quotations or feedback to review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
