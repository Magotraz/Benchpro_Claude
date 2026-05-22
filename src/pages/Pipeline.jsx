import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DndContext, DragOverlay, useDroppable, useDraggable,
  PointerSensor, useSensors, useSensor,
} from '@dnd-kit/core'
import { Plus, LayoutGrid, Briefcase, Mail, MapPin, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'
import SubmissionDrawer from '../components/SubmissionDrawer'

const STAGES = [
  { id: 'sourced',   label: 'Sourced',   bg: 'bg-gray-50',      header: 'bg-gray-100 text-gray-700',     dot: 'bg-gray-400' },
  { id: 'screening', label: 'Screening', bg: 'bg-blue-50/60',   header: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  { id: 'interview', label: 'Interview', bg: 'bg-violet-50/60', header: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  { id: 'offer',     label: 'Offer',     bg: 'bg-amber-50/60',  header: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  { id: 'placed',    label: 'Placed',    bg: 'bg-emerald-50/60',header: 'bg-emerald-100 text-emerald-700',dot: 'bg-emerald-500' },
  { id: 'rejected',  label: 'Rejected',  bg: 'bg-red-50/40',    header: 'bg-red-100 text-red-600',       dot: 'bg-red-400' },
]
const STAGE_IDS = STAGES.map(s => s.id)

const BG_COLORS = ['bg-brand-500','bg-violet-500','bg-sky-500','bg-emerald-500','bg-amber-500']
function avatarColor(id) { return BG_COLORS[(id?.charCodeAt(0) ?? 0) % BG_COLORS.length] }
function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function daysAgo(dateStr) {
  const d = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return '1d ago'
  return `${d}d ago`
}

// ─── Droppable Column ────────────────────────────────────────────────────────
function KanbanColumn({ stage, cards, onCardClick, isDraggingId }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-60 shrink-0 rounded-xl border transition-colors ${
        isOver ? 'border-brand-400 ring-2 ring-brand-200' : 'border-gray-200'
      } ${stage.bg}`}
    >
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${stage.header}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
          <span className="text-xs font-semibold">{stage.label}</span>
        </div>
        <span className="text-xs font-bold opacity-60">{cards.length}</span>
      </div>

      <div className="flex-1 p-2 space-y-2 min-h-[420px]">
        {cards.map(sub => (
          <KanbanCard
            key={sub.id}
            submission={sub}
            onClick={() => onCardClick(sub)}
            isBeingDragged={isDraggingId === sub.id}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Draggable Card ──────────────────────────────────────────────────────────
function KanbanCard({ submission, onClick, isBeingDragged, overlay = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: submission.id,
    disabled: overlay,
  })

  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` } : undefined
  const c = submission.candidates

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      className={`bg-white rounded-lg border border-gray-200 p-3 select-none transition-shadow
        ${isDragging || overlay ? 'opacity-40 shadow-lg' : 'hover:shadow-md cursor-grab active:cursor-grabbing'}
        ${overlay ? 'opacity-100 shadow-xl rotate-1 cursor-grabbing' : ''}`}
      {...(overlay ? {} : { ...attributes, ...listeners })}
    >
      {/* Candidate avatar + name */}
      <div className="flex items-center gap-2 mb-2" onClick={(e) => { e.stopPropagation(); if (!isDragging) onClick() }}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(submission.candidate_id)}`}>
          {initials(c?.full_name)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate leading-tight cursor-pointer hover:text-brand-700">
            {c?.full_name ?? 'Unknown'}
          </p>
          {c?.current_title && (
            <p className="text-xs text-gray-400 truncate leading-tight">{c.current_title}</p>
          )}
        </div>
      </div>

      {c?.current_company && (
        <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
          <Briefcase size={10} className="shrink-0" /> {c.current_company}
        </p>
      )}
      {c?.location && (
        <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
          <MapPin size={10} className="shrink-0" /> {c.location}
        </p>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        {(c?.skills?.length > 0) ? (
          <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded font-medium truncate max-w-[80px]">
            {c.skills[0]}
            {c.skills.length > 1 ? ` +${c.skills.length - 1}` : ''}
          </span>
        ) : <span />}
        <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
          <Clock size={9} /> {daysAgo(submission.created_at)}
        </span>
      </div>
    </div>
  )
}

// ─── Pipeline Page ───────────────────────────────────────────────────────────
export default function Pipeline() {
  const { user }          = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [jobs, setJobs]           = useState([])
  const [selectedJobId, setSelectedJobId] = useState(searchParams.get('job') ?? '')
  const [submissions, setSubmissions] = useState([])
  const [candidates, setCandidates] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [activeId, setActiveId]   = useState(null)
  const [drawer, setDrawer]       = useState(null)
  const [addModal, setAddModal]   = useState(false)
  const [addForm, setAddForm]     = useState({ candidate_id: '' })
  const [adding, setAdding]       = useState(false)
  const [addError, setAddError]   = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    supabase.from('jobs').select('id, title, status').order('created_at', { ascending: false }).then(({ data }) => {
      setJobs(data ?? [])
      setLoadingJobs(false)
    })
    supabase.from('candidates').select('id, full_name, current_title').order('full_name').then(({ data }) => {
      setCandidates(data ?? [])
    })
  }, [])

  useEffect(() => {
    if (!selectedJobId) { setSubmissions([]); return }
    setSearchParams({ job: selectedJobId })
    loadSubmissions(selectedJobId)
  }, [selectedJobId])

  async function loadSubmissions(jobId) {
    setLoadingSubs(true)
    const { data } = await supabase
      .from('submissions')
      .select('*, candidates(*), jobs(id, title)')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })
    setSubmissions(data ?? [])
    setLoadingSubs(false)
  }

  function handleDragStart({ active }) { setActiveId(active.id) }

  async function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over || !STAGE_IDS.includes(over.id)) return
    const newStage = over.id
    const sub = submissions.find(s => s.id === active.id)
    if (!sub || sub.stage === newStage) return
    await moveStage(active.id, newStage, sub.stage)
  }

  async function moveStage(subId, newStage, oldStage) {
    setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, stage: newStage } : s))
    if (drawer?.id === subId) setDrawer(prev => ({ ...prev, stage: newStage }))
    await supabase.from('submissions').update({ stage: newStage, updated_at: new Date().toISOString() }).eq('id', subId)
    await supabase.from('submission_notes').insert({
      submission_id: subId, author_id: user.id,
      content: `Stage changed from ${stageName(oldStage)} to ${stageName(newStage)}`,
      type: 'stage_change', meta: { from: oldStage, to: newStage },
    })
  }

  function stageName(id) { return STAGES.find(s => s.id === id)?.label ?? id }

  async function addToBoard(e) {
    e.preventDefault(); setAddError(''); setAdding(true)
    if (!addForm.candidate_id) { setAddError('Select a candidate.'); setAdding(false); return }
    const existing = submissions.find(s => s.candidate_id === addForm.candidate_id)
    if (existing) { setAddError('This candidate is already on this board.'); setAdding(false); return }
    const { data, error } = await supabase
      .from('submissions')
      .insert({ job_id: selectedJobId, candidate_id: addForm.candidate_id, stage: 'sourced', submitted_by: user.id })
      .select('*, candidates(*), jobs(id, title)')
      .single()
    if (error) { setAddError(error.message); setAdding(false); return }
    setSubmissions(prev => [...prev, data])
    setAddModal(false)
    setAddForm({ candidate_id: '' })
    setAdding(false)
  }

  const byStage = Object.fromEntries(STAGES.map(s => [s.id, submissions.filter(sub => sub.stage === s.id)]))
  const activeSubmission = submissions.find(s => s.id === activeId)
  const selectedJob = jobs.find(j => j.id === selectedJobId)

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-3">
          <LayoutGrid size={20} className="text-brand-600 shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">Pipeline</h1>
            {selectedJob && (
              <p className="text-sm text-gray-500">{selectedJob.title} · {submissions.length} candidates</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedJobId}
            onChange={e => setSelectedJobId(e.target.value)}
            className="px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white min-w-[220px]"
          >
            <option value="">Select a job…</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>

          {selectedJobId && (
            <button
              onClick={() => { setAddForm({ candidate_id: '' }); setAddError(''); setAddModal(true) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              <Plus size={16} /> Add Candidate
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      {!selectedJobId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LayoutGrid size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="font-medium text-gray-500">Select a job to view its pipeline</p>
            <p className="text-sm text-gray-400 mt-1">Choose from the dropdown above.</p>
          </div>
        </div>
      ) : loadingSubs ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                cards={byStage[stage.id] ?? []}
                onCardClick={(sub) => setDrawer(sub)}
                isDraggingId={activeId}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeSubmission && (
              <KanbanCard submission={activeSubmission} onClick={() => {}} overlay />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Add candidate modal */}
      {addModal && (
        <Modal title="Add Candidate to Pipeline" onClose={() => setAddModal(false)}>
          {addError && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{addError}</div>}
          <form onSubmit={addToBoard} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Candidate <span className="text-red-500">*</span></label>
              {candidates.length === 0 ? (
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Mail size={14} /> No candidates yet — add one in the Candidates tab first.
                </p>
              ) : (
                <select
                  value={addForm.candidate_id}
                  onChange={e => setAddForm(f => ({ ...f, candidate_id: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="">Select candidate…</option>
                  {candidates.filter(c => !submissions.find(s => s.candidate_id === c.id)).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}{c.current_title ? ` — ${c.current_title}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-xs text-gray-400">The candidate will start in the <strong>Sourced</strong> column.</p>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={adding} className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-60">
                {adding ? 'Adding…' : 'Add to Pipeline'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Submission drawer */}
      {drawer && (
        <SubmissionDrawer
          submission={drawer}
          onClose={() => setDrawer(null)}
          onStageChange={(subId, newStage) => {
            const old = submissions.find(s => s.id === subId)?.stage
            moveStage(subId, newStage, old)
          }}
        />
      )}
    </div>
  )
}
