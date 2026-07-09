import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Briefcase, MapPin, Filter, ThumbsUp, ThumbsDown, Clock,
  Pause, Star, CheckCircle2, ChevronDown, ChevronUp, Edit2,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { createNotification } from '../../lib/notifications'

// ─── Constants ───────────────────────────────────────────────────────────────

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

const VERDICTS = [
  { id: 'interested', label: 'Interested',  icon: ThumbsUp,     active: 'bg-emerald-600 text-white border-emerald-600', idle: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
  { id: 'hold',       label: 'Hold',        icon: Pause,        active: 'bg-amber-500 text-white border-amber-500',    idle: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
  { id: 'pass',       label: 'Pass',        icon: ThumbsDown,   active: 'bg-red-500 text-white border-red-500',        idle: 'border-red-300 text-red-600 hover:bg-red-50' },
  { id: 'hire',       label: 'Hire Now',    icon: Star,         active: 'bg-brand-600 text-white border-brand-600',    idle: 'border-brand-300 text-brand-700 hover:bg-brand-50' },
]

const VERDICT_BADGE = {
  interested: 'bg-emerald-100 text-emerald-700',
  hold:       'bg-amber-100 text-amber-700',
  pass:       'bg-red-100 text-red-600',
  hire:       'bg-brand-100 text-brand-700',
}
const VERDICT_BORDER = {
  interested: 'border-l-emerald-400',
  hold:       'border-l-amber-400',
  pass:       'border-l-red-400',
  hire:       'border-l-brand-500',
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function daysAgo(d) {
  const n = Math.floor((Date.now() - new Date(d)) / 86400000)
  return n === 0 ? 'Today' : n === 1 ? '1d ago' : `${n}d ago`
}

const BG_COLORS = ['bg-brand-500','bg-violet-500','bg-sky-500','bg-emerald-500','bg-amber-500','bg-rose-500']
function avatarColor(id) { return BG_COLORS[(id?.charCodeAt(0) ?? 0) % BG_COLORS.length] }

// ─── Feedback form ────────────────────────────────────────────────────────────

function FeedbackForm({ submissionId, existing, onSaved, recruiterId, candidateName }) {
  const { user } = useAuth()
  const [verdict, setVerdict] = useState(existing?.verdict ?? '')
  const [notes, setNotes]     = useState(existing?.notes ?? '')
  const [saving, setSaving]   = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!verdict) return
    setSaving(true)
    await supabase.from('client_feedback').upsert(
      { submission_id: submissionId, client_id: user.id, verdict, notes, updated_at: new Date().toISOString() },
      { onConflict: 'submission_id,client_id' }
    )
    createNotification(
      recruiterId,
      'client_feedback',
      'Client submitted feedback',
      `${candidateName ?? 'A candidate'} was marked as "${verdict}"`,
      '/pipeline',
    )
    onSaved({ verdict, notes })
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Feedback</p>
      <div className="flex flex-wrap gap-2">
        {VERDICTS.map(v => {
          const Icon = v.icon
          return (
            <button
              key={v.id} type="button"
              onClick={() => setVerdict(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                verdict === v.id ? v.active : v.idle
              }`}
            >
              <Icon size={12} /> {v.label}
            </button>
          )
        })}
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        placeholder="Optional note for your recruiter…"
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none bg-white"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!verdict || saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? '…' : <><CheckCircle2 size={14} /> Submit feedback</>}
        </button>
      </div>
    </form>
  )
}

// ─── Candidate card ───────────────────────────────────────────────────────────

function CandidateCard({ submission, feedback, onFeedbackSaved }) {
  const [open, setOpen] = useState(false)
  const c = submission.candidates

  const hasFeedback = !!feedback?.verdict
  const borderClass = hasFeedback ? `border-l-4 ${VERDICT_BORDER[feedback.verdict]}` : ''

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 transition-shadow hover:shadow-md ${borderClass}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${avatarColor(submission.candidate_id)}`}>
          {initials(c?.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{c?.full_name}</p>
              {c?.current_title && (
                <p className="text-xs text-gray-500 truncate">
                  {c.current_title}{c.current_company ? ` @ ${c.current_company}` : ''}
                  {c.experience_years ? ` · ${c.experience_years}y` : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {hasFeedback && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${VERDICT_BADGE[feedback.verdict]}`}>
                  {feedback.verdict}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[submission.stage] ?? 'bg-gray-100 text-gray-500'}`}>
                {STAGE_LABELS[submission.stage] ?? submission.stage}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {c?.location && (
          <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={10} />{c.location}</span>
        )}
        {submission.jobs?.title && (
          <span className="text-xs text-gray-400 flex items-center gap-1"><Briefcase size={10} />{submission.jobs.title}</span>
        )}
        <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} />{daysAgo(submission.updated_at)}</span>
      </div>

      {/* Skills */}
      {c?.skills?.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {c.skills.slice(0, 5).map(s => (
            <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">{s}</span>
          ))}
          {c.skills.length > 5 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">+{c.skills.length - 5}</span>
          )}
        </div>
      )}

      {/* Existing feedback note preview */}
      {hasFeedback && feedback.notes && !open && (
        <p className="mt-2 text-xs text-gray-500 italic line-clamp-1">"{feedback.notes}"</p>
      )}

      {/* Feedback toggle */}
      <div className="mt-3 pt-2 border-t border-gray-100">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-700 transition-colors"
        >
          {hasFeedback ? <><Edit2 size={12} /> Edit feedback</> : <><ThumbsUp size={12} /> Give feedback</>}
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {open && (
          <FeedbackForm
            submissionId={submission.id}
            existing={feedback}
            onSaved={(fb) => { onFeedbackSaved(submission.id, fb); setOpen(false) }}
            recruiterId={submission.submitted_by}
            candidateName={c?.full_name}
          />
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientSubmissions() {
  const { user }   = useAuth()
  const [searchParams] = useSearchParams()

  const [submissions, setSubmissions] = useState([])
  const [feedbacks, setFeedbacks]     = useState({})
  const [jobs, setJobs]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [jobFilter, setJobFilter]     = useState(searchParams.get('job') ?? '')
  const [stageFilter, setStageFilter] = useState('all')

  useEffect(() => {
    supabase.from('jobs').select('id, title').order('title').then(({ data }) => setJobs(data ?? []))
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [submRes, fbRes] = await Promise.all([
      supabase.from('submissions')
        .select('*, candidates(id, full_name, current_title, current_company, skills, experience_years, location), jobs(id, title)')
        .order('updated_at', { ascending: false }),
      supabase.from('client_feedback').select('submission_id, verdict, notes'),
    ])
    setSubmissions(submRes.data ?? [])
    const fbMap = {}
    for (const fb of fbRes.data ?? []) fbMap[fb.submission_id] = fb
    setFeedbacks(fbMap)
    setLoading(false)
  }

  function handleFeedbackSaved(submissionId, fb) {
    setFeedbacks(prev => ({ ...prev, [submissionId]: { ...prev[submissionId], ...fb } }))
  }

  const filtered = submissions.filter(s => {
    if (jobFilter && s.job_id !== jobFilter) return false
    if (stageFilter !== 'all' && s.stage !== stageFilter) return false
    return true
  })

  const verdictCounts = Object.values(feedbacks).reduce((acc, fb) => {
    acc[fb.verdict] = (acc[fb.verdict] ?? 0) + 1; return acc
  }, {})

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Candidates</h1>
        <p className="text-sm text-gray-500">
          {submissions.length} submitted to you
          {Object.keys(feedbacks).length > 0 && ` · ${Object.keys(feedbacks).length} reviewed`}
        </p>
      </div>

      {/* Feedback summary pills */}
      {Object.keys(verdictCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {VERDICTS.filter(v => verdictCounts[v.id]).map(v => {
            const Icon = v.icon
            return (
              <span key={v.id} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${v.idle}`}>
                <Icon size={11} /> {v.label}: {verdictCounts[v.id]}
              </span>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-gray-500"><Filter size={14} /> Filter:</span>
        <select value={jobFilter} onChange={e => setJobFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white min-w-[180px]">
          <option value="">All jobs</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="all">All stages</option>
          {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(jobFilter || stageFilter !== 'all') && (
          <button onClick={() => { setJobFilter(''); setStageFilter('all') }} className="text-xs text-brand-600 hover:underline">
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <ThumbsUp size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No candidates yet</p>
          <p className="text-sm text-gray-400 mt-1">Your recruiter will submit candidates here as they source them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(sub => (
            <CandidateCard
              key={sub.id}
              submission={sub}
              feedback={feedbacks[sub.id]}
              onFeedbackSaved={handleFeedbackSaved}
            />
          ))}
        </div>
      )}
    </div>
  )
}
