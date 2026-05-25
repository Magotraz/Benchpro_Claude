import { useState, useEffect, useRef } from 'react'
import { X, Mail, Phone, MapPin, Briefcase, Linkedin, MessageSquare, ChevronRight, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { createNotification } from '../lib/notifications'

const STAGES = [
  { id: 'sourced',    label: 'Sourced',    color: 'bg-gray-100 text-gray-600 border-gray-200' },
  { id: 'screening',  label: 'Screening',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'interview',  label: 'Interview',  color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { id: 'offer',      label: 'Offer',      color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'placed',     label: 'Placed',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'rejected',   label: 'Rejected',   color: 'bg-red-100 text-red-600 border-red-200' },
]

const ACTIVE_STAGE = 'bg-brand-600 text-white border-brand-600'

function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function SubmissionDrawer({ submission, onClose, onStageChange }) {
  const { user, profile } = useAuth()
  const [notes, setNotes]     = useState([])
  const [noteText, setNoteText] = useState('')
  const [posting, setPosting] = useState(false)
  const [moving, setMoving]   = useState(false)
  const noteRef               = useRef(null)

  const candidate = submission.candidates
  const job       = submission.jobs

  useEffect(() => {
    loadNotes()
  }, [submission.id])

  async function loadNotes() {
    const { data } = await supabase
      .from('submission_notes')
      .select('*, profiles!author_id(full_name)')
      .eq('submission_id', submission.id)
      .order('created_at', { ascending: true })
    setNotes(data ?? [])
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

  function stageLabel(id) { return STAGES.find(s => s.id === id)?.label ?? id }

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
            {(candidate?.skills?.length > 0) && (
              <div className="flex flex-wrap gap-1 pt-1">
                {candidate.skills.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Stage pipeline */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pipeline Stage</p>
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
    </>
  )
}
