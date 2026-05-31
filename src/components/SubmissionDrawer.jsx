import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Mail, Phone, MapPin, Briefcase, Linkedin, MessageSquare,
  ChevronRight, Clock, CalendarPlus, Calendar, CheckCircle2,
  Video, PhoneCall, Building2, Wrench, Users2, Trophy,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { createNotification } from '../lib/notifications'
import { logAudit } from '../lib/audit'

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = [
  { id: 'sourced',    label: 'Sourced',    color: 'bg-gray-100 text-gray-600 border-gray-200' },
  { id: 'screening',  label: 'Screening',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'interview',  label: 'Interview',  color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { id: 'offer',      label: 'Offer',      color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'placed',     label: 'Placed',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'rejected',   label: 'Rejected',   color: 'bg-red-100 text-red-600 border-red-200' },
]
const ACTIVE_STAGE = 'bg-brand-600 text-white border-brand-600'

const ROUND_TYPES = [
  { value: 'phone',     label: 'Phone Screen', icon: PhoneCall },
  { value: 'video',     label: 'Video Call',   icon: Video },
  { value: 'onsite',    label: 'Onsite',       icon: Building2 },
  { value: 'technical', label: 'Technical',    icon: Wrench },
  { value: 'hr',        label: 'HR Round',     icon: Users2 },
]
const TYPE_LABEL = Object.fromEntries(ROUND_TYPES.map(t => [t.value, t.label]))

const OUTCOME_COLORS = {
  pending: 'bg-gray-100 text-gray-600',
  pass:    'bg-emerald-100 text-emerald-700',
  fail:    'bg-red-100 text-red-600',
  hold:    'bg-amber-100 text-amber-700',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function stageLabel(id) { return STAGES.find(s => s.id === id)?.label ?? id }

// ─── Schedule Interview Modal ─────────────────────────────────────────────────

function ScheduleModal({ submission, roundCount, onClose, onSaved }) {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({
    round_number: roundCount + 1,
    type:         'video',
    scheduled_at: '',
    interviewer:  '',
    location:     '',
    notes:        '',
  })
  const [saving, setSaving] = useState(false)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.scheduled_at) return
    setSaving(true)

    const { error } = await supabase.from('interview_rounds').insert({
      submission_id: submission.id,
      created_by:    user.id,
      round_number:  form.round_number,
      type:          form.type,
      scheduled_at:  new Date(form.scheduled_at).toISOString(),
      interviewer:   form.interviewer  || null,
      location:      form.location     || null,
      notes:         form.notes        || null,
    })

    if (!error) {
      logAudit({
        userId: user.id, userName: profile?.full_name ?? user.email,
        action: 'created', entityType: 'interview', entityId: submission.id,
        entityName: `Round ${form.round_number} — ${submission.candidates?.full_name ?? 'Candidate'}`,
        newValue: TYPE_LABEL[form.type],
      })
      if (!['interview', 'offer', 'placed'].includes(submission.stage)) {
        await supabase.from('submissions').update({ stage: 'interview' }).eq('id', submission.id)
      }
      createNotification(
        submission.submitted_by,
        'interview_scheduled',
        'Interview scheduled',
        `Round ${form.round_number} (${TYPE_LABEL[form.type]}) scheduled for ${submission.candidates?.full_name ?? 'candidate'}`,
        `/pipeline?job=${submission.job_id}`,
      )
      onSaved({ ...form, outcome: 'pending', id: crypto.randomUUID() })
    }
    setSaving(false)
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white'
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <CalendarPlus size={16} className="text-brand-600" /> Schedule Interview
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Round #</label>
              <input
                type="number" min="1" value={form.round_number}
                onChange={e => set('round_number', +e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
                {ROUND_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Date &amp; Time *</label>
            <input
              type="datetime-local" required value={form.scheduled_at}
              onChange={e => set('scheduled_at', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Interviewer</label>
            <input
              type="text" value={form.interviewer} placeholder="e.g. Priya Sharma"
              onChange={e => set('interviewer', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Location / Meeting Link</label>
            <input
              type="text" value={form.location} placeholder="e.g. Zoom link or office address"
              onChange={e => set('location', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={form.notes} rows={2} placeholder="Optional notes for this round…"
              onChange={e => set('notes', e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !form.scheduled_at}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50">
              {saving ? '…' : <><CalendarPlus size={14} /> Schedule</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

// ─── Interview Timeline ───────────────────────────────────────────────────────

function InterviewTimeline({ rounds, onOutcomeChange, updatingOutcome }) {
  if (rounds.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        No interviews scheduled yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {rounds.map((r, idx) => (
        <div key={r.id} className="flex gap-3">
          {/* Timeline dot + line */}
          <div className="flex flex-col items-center shrink-0">
            <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold">
              {r.round_number}
            </div>
            {idx < rounds.length - 1 && (
              <div className="w-px flex-1 bg-gray-200 mt-1" />
            )}
          </div>

          {/* Round detail */}
          <div className={`flex-1 pb-3 ${idx < rounds.length - 1 ? 'border-b border-gray-100' : ''}`}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">
                    Round {r.round_number}
                  </span>
                  <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-medium">
                    {TYPE_LABEL[r.type] ?? r.type}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Calendar size={10} />
                  {new Date(r.scheduled_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                {r.interviewer && (
                  <p className="text-xs text-gray-400 mt-0.5">with {r.interviewer}</p>
                )}
                {r.location && (
                  <p className="text-xs text-gray-400 truncate max-w-[180px]">{r.location}</p>
                )}
              </div>

              {/* Outcome selector */}
              <select
                value={r.outcome}
                disabled={updatingOutcome === r.id}
                onChange={e => onOutcomeChange(r.id, e.target.value, r.round_number)}
                className={`text-xs font-medium px-2 py-1 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer ${
                  OUTCOME_COLORS[r.outcome] ?? 'bg-gray-100 text-gray-600'
                } ${updatingOutcome === r.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="pending">Pending</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="hold">Hold</option>
              </select>
            </div>
            {r.notes && <p className="text-xs text-gray-500 mt-1 italic">"{r.notes}"</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export default function SubmissionDrawer({ submission, onClose, onStageChange }) {
  const { user, profile } = useAuth()
  const [notes, setNotes]           = useState([])
  const [noteText, setNoteText]     = useState('')
  const [posting, setPosting]       = useState(false)
  const [moving, setMoving]         = useState(false)
  const [rounds, setRounds]         = useState([])
  const [showSchedule, setShowSchedule] = useState(false)
  const [updatingOutcome, setUpdatingOutcome] = useState(null)
  const noteRef = useRef(null)

  const candidate = submission.candidates
  const job       = submission.jobs

  useEffect(() => {
    loadNotes()
    loadRounds()
  }, [submission.id])

  async function loadNotes() {
    const { data } = await supabase
      .from('submission_notes')
      .select('*, profiles!author_id(full_name)')
      .eq('submission_id', submission.id)
      .order('created_at', { ascending: true })
    setNotes(data ?? [])
  }

  async function loadRounds() {
    const { data } = await supabase
      .from('interview_rounds')
      .select('*')
      .eq('submission_id', submission.id)
      .order('round_number', { ascending: true })
    setRounds(data ?? [])
  }

  async function addNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    setPosting(true)
    await supabase.from('submission_notes').insert({
      submission_id: submission.id,
      author_id:     user.id,
      content:       noteText.trim(),
      type:          'note',
    })
    setNoteText('')
    await loadNotes()
    setPosting(false)
  }

  async function changeStage(newStage) {
    if (newStage === submission.stage || moving) return
    setMoving(true)
    const oldStage = submission.stage
    await supabase.from('submission_notes').insert({
      submission_id: submission.id,
      author_id:     user.id,
      content:       `Stage changed from ${stageLabel(oldStage)} to ${stageLabel(newStage)}`,
      type:          'stage_change',
      meta:          { from: oldStage, to: newStage },
    })
    await loadNotes()
    onStageChange(submission.id, newStage)
    createNotification(
      submission.submitted_by,
      'stage_change',
      'Pipeline stage updated',
      `${candidate?.full_name ?? 'Candidate'} moved to ${stageLabel(newStage)}`,
      `/pipeline?job=${submission.job_id}`,
    )
    setMoving(false)
  }

  async function updateOutcome(roundId, outcome, roundNumber) {
    setUpdatingOutcome(roundId)
    await supabase.from('interview_rounds').update({ outcome }).eq('id', roundId)
    setRounds(prev => prev.map(r => r.id === roundId ? { ...r, outcome } : r))
    if (['pass', 'fail'].includes(outcome)) {
      createNotification(
        submission.submitted_by,
        'interview_outcome',
        outcome === 'pass' ? 'Interview round passed' : 'Interview round failed',
        `${candidate?.full_name ?? 'Candidate'} ${outcome === 'pass' ? 'passed' : 'failed'} Round ${roundNumber}`,
        `/pipeline?job=${submission.job_id}`,
      )
    }
    setUpdatingOutcome(null)
  }

  function onRoundSaved(round) {
    setRounds(prev => [...prev, round])
    setShowSchedule(false)
    // If stage was advanced, reflect it
    if (!['interview', 'offer', 'placed'].includes(submission.stage)) {
      onStageChange(submission.id, 'interview')
    }
  }

  const allRoundsPassed = rounds.length > 0 && rounds.every(r => r.outcome === 'pass')
  const showOfferBtn = allRoundsPassed && submission.stage === 'interview'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initials(candidate?.full_name)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{candidate?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{job?.title ?? 'Unknown job'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Candidate details */}
          <div className="px-5 py-4 border-b border-gray-100 space-y-1.5">
            {candidate?.current_title && (
              <p className="text-sm flex items-center gap-2 text-gray-600">
                <Briefcase size={13} className="shrink-0 text-gray-400" />
                {candidate.current_title}
                {candidate.current_company ? ` @ ${candidate.current_company}` : ''}
                {candidate.experience_years ? ` · ${candidate.experience_years}y` : ''}
              </p>
            )}
            {candidate?.location && (
              <p className="text-sm flex items-center gap-2 text-gray-500">
                <MapPin size={13} className="shrink-0 text-gray-400" /> {candidate.location}
              </p>
            )}
            {candidate?.email && (
              <p className="text-sm flex items-center gap-2 text-gray-500">
                <Mail size={13} className="shrink-0 text-gray-400" /> {candidate.email}
              </p>
            )}
            {candidate?.phone && (
              <p className="text-sm flex items-center gap-2 text-gray-500">
                <Phone size={13} className="shrink-0 text-gray-400" /> {candidate.phone}
              </p>
            )}
            {candidate?.linkedin_url && (
              <a href={candidate.linkedin_url} target="_blank" rel="noreferrer"
                className="text-sm flex items-center gap-2 text-brand-600 hover:underline">
                <Linkedin size={13} className="shrink-0" /> LinkedIn profile
              </a>
            )}
            {candidate?.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {candidate.skills.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline stage */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pipeline Stage</p>
              <button
                onClick={() => setShowSchedule(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg transition-colors border border-violet-200"
              >
                <CalendarPlus size={12} /> Schedule Interview
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {STAGES.map(stage => (
                <button
                  key={stage.id}
                  onClick={() => changeStage(stage.id)}
                  disabled={moving}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:cursor-not-allowed ${
                    submission.stage === stage.id ? ACTIVE_STAGE : `${stage.color} hover:opacity-80`
                  }`}
                >
                  {stage.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interview rounds timeline */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar size={13} /> Interview Rounds {rounds.length > 0 && `(${rounds.length})`}
              </p>
              {showOfferBtn && (
                <button
                  onClick={() => changeStage('offer')}
                  disabled={moving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trophy size={12} /> Mark as Offer
                </button>
              )}
            </div>
            <InterviewTimeline
              rounds={rounds}
              updatingOutcome={updatingOutcome}
              onOutcomeChange={updateOutcome}
            />
            {rounds.length > 0 && (
              <button
                onClick={() => setShowSchedule(true)}
                className="mt-3 flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
              >
                <CalendarPlus size={12} /> Add another round
              </button>
            )}
          </div>

          {/* Activity log */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <MessageSquare size={13} /> Activity &amp; Notes
            </p>

            {notes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No activity yet. Add the first note.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {notes.map(note => (
                  <div key={note.id} className={`flex gap-3 ${note.type === 'stage_change' ? 'opacity-75' : ''}`}>
                    <div className="shrink-0 mt-0.5">
                      {note.type === 'stage_change' ? (
                        <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center">
                          <ChevronRight size={12} className="text-brand-600" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold">
                          {initials(note.profiles?.full_name)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-700">
                          {note.profiles?.full_name ?? 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(note.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <p className={`text-sm mt-0.5 ${note.type === 'stage_change' ? 'text-gray-500 italic' : 'text-gray-700'}`}>
                        {note.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add note form */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <form onSubmit={addNote} className="flex gap-2">
            <input
              ref={noteRef}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add a note…"
              className="flex-1 px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            />
            <button type="submit" disabled={posting || !noteText.trim()}
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {posting ? '…' : 'Post'}
            </button>
          </form>
        </div>
      </div>

      {/* Schedule Interview modal (portal renders outside drawer DOM) */}
      {showSchedule && (
        <ScheduleModal
          submission={submission}
          roundCount={rounds.length}
          onClose={() => setShowSchedule(false)}
          onSaved={onRoundSaved}
        />
      )}
    </>
  )
}
