import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DndContext, DragOverlay, useDroppable, useDraggable,
  PointerSensor, useSensors, useSensor,
} from '@dnd-kit/core'
import {
  Plus, LayoutGrid, List, Briefcase, Mail, MapPin, Clock,
  ChevronUp, ChevronDown, ChevronsUpDown, Search, Filter,
  Download, X, ChevronDown as ChevDown,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { createNotification } from '../lib/notifications'
import { logAudit } from '../lib/audit'
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

function exportCSV(rows) {
  const headers = ['Candidate', 'Job', 'Stage', 'Recruiter', 'Date Added']
  const data = rows.map(s => [
    s.candidates?.full_name ?? '',
    s.jobs?.title ?? '',
    s.stage,
    s.profiles?.full_name ?? '',
    s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : '',
  ])
  const csv = [headers, ...data].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `benchpro-pipeline-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Kanban components ────────────────────────────────────────────────────────

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
            {c.skills[0]}{c.skills.length > 1 ? ` +${c.skills.length - 1}` : ''}
          </span>
        ) : <span />}
        <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
          <Clock size={9} /> {daysAgo(submission.created_at)}
        </span>
      </div>
    </div>
  )
}

// ─── Kanban skeleton ─────────────────────────────────────────────────────────

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
      {STAGES.map(stage => (
        <div key={stage.id} className={`flex flex-col w-60 shrink-0 rounded-xl border border-gray-200 ${stage.bg}`}>
          <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${stage.header}`}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
              <span className="text-xs font-semibold">{stage.label}</span>
            </div>
          </div>
          <div className="flex-1 p-2 space-y-2 min-h-[420px] animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
                  <div className="space-y-1 flex-1">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-2 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({ submissions, onRowClick, onBulkStageChange }) {
  const [sortCol, setSortCol] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [search, setSearch]   = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [selected, setSelected]       = useState(new Set())
  const [bulkStage, setBulkStage]     = useState('')
  const [bulkApplying, setBulkApplying] = useState(false)

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let rows = [...submissions]
    if (stageFilter !== 'all') rows = rows.filter(s => s.stage === stageFilter)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(s =>
        s.candidates?.full_name?.toLowerCase().includes(q) ||
        s.jobs?.title?.toLowerCase().includes(q) ||
        s.profiles?.full_name?.toLowerCase().includes(q)
      )
    }
    rows.sort((a, b) => {
      let va, vb
      switch (sortCol) {
        case 'name':      va = a.candidates?.full_name ?? ''; vb = b.candidates?.full_name ?? ''; break
        case 'job':       va = a.jobs?.title ?? ''; vb = b.jobs?.title ?? ''; break
        case 'stage':     va = STAGE_IDS.indexOf(a.stage); vb = STAGE_IDS.indexOf(b.stage); break
        case 'recruiter': va = a.profiles?.full_name ?? ''; vb = b.profiles?.full_name ?? ''; break
        default:          va = a.created_at ?? ''; vb = b.created_at ?? ''; break
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [submissions, stageFilter, search, sortCol, sortDir])

  const allSelected  = filtered.length > 0 && filtered.every(r => selected.has(r.id))
  const someSelected = selected.size > 0

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(filtered.map(r => r.id)))
  }
  function toggleRow(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function clearSelection() { setSelected(new Set()); setBulkStage('') }

  async function applyBulkStage() {
    if (!bulkStage || selected.size === 0) return
    setBulkApplying(true)
    const ids = [...selected]
    await supabase.from('submissions')
      .update({ stage: bulkStage, updated_at: new Date().toISOString() })
      .in('id', ids)
    onBulkStageChange(ids, bulkStage)
    clearSelection()
    setBulkApplying(false)
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <ChevronsUpDown size={12} className="text-gray-300 shrink-0" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-brand-600 shrink-0" />
      : <ChevronDown size={12} className="text-brand-600 shrink-0" />
  }

  function Th({ col, label, className = '' }) {
    return (
      <th
        onClick={() => toggleSort(col)}
        className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none whitespace-nowrap ${className}`}
      >
        <span className="flex items-center gap-1">{label}<SortIcon col={col} /></span>
      </th>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl">
          <span className="text-sm font-semibold text-brand-700">{selected.size} candidate{selected.size !== 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <select
              value={bulkStage}
              onChange={e => setBulkStage(e.target.value)}
              className="px-3 py-1.5 text-sm border border-brand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">Change stage…</option>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button
              onClick={applyBulkStage}
              disabled={!bulkStage || bulkApplying}
              className="px-4 py-1.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {bulkApplying ? 'Applying…' : 'Apply'}
            </button>
            <button
              onClick={() => exportCSV(filtered.filter(r => selected.has(r.id)))}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={13} /> Export selected
            </button>
          </div>
          <button onClick={clearSelection} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 ml-auto">
            <X size={14} /> Clear
          </button>
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search candidates, jobs…"
            className="pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white w-56"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-gray-400 shrink-0" />
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="all">All stages</option>
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        {(search || stageFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setStageFilter('all') }} className="text-xs text-brand-600 hover:underline">
            Clear
          </button>
        )}
        <div className="ml-auto flex items-center gap-3">
          <p className="text-xs text-gray-400">{filtered.length} of {submissions.length} candidate{submissions.length !== 1 ? 's' : ''}</p>
          {filtered.length > 0 && (
            <button
              onClick={() => exportCSV(filtered)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={12} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/70">
              <tr>
                <th className="pl-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                </th>
                <Th col="name"      label="Candidate" className="pl-2" />
                <Th col="job"       label="Job" />
                <Th col="stage"     label="Stage" />
                <Th col="recruiter" label="Recruiter" />
                <Th col="date"      label="Date Added" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-sm text-gray-400">
                    No candidates match your filters.
                  </td>
                </tr>
              ) : filtered.map(sub => {
                const stg        = STAGES.find(s => s.id === sub.stage)
                const isSelected = selected.has(sub.id)
                return (
                  <tr
                    key={sub.id}
                    className={`transition-colors cursor-pointer ${isSelected ? 'bg-brand-50/60' : 'hover:bg-brand-50/40'}`}
                  >
                    <td className="pl-4 py-3 w-8" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(sub.id)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </td>
                    <td className="pl-2 pr-4 py-3" onClick={() => onRowClick(sub)}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(sub.candidate_id)}`}>
                          {initials(sub.candidates?.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{sub.candidates?.full_name ?? '—'}</p>
                          {sub.candidates?.current_title && (
                            <p className="text-xs text-gray-400 truncate">{sub.candidates.current_title}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px]" onClick={() => onRowClick(sub)}>
                      <p className="truncate">{sub.jobs?.title ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3" onClick={() => onRowClick(sub)}>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${stg?.header ?? 'bg-gray-100 text-gray-500'}`}>
                        {stg?.label ?? sub.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs" onClick={() => onRowClick(sub)}>
                      {sub.profiles?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs" onClick={() => onRowClick(sub)}>
                      {sub.created_at
                        ? new Date(sub.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Table skeleton ──────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50/70">
          <tr>
            {['', 'Candidate', 'Job', 'Stage', 'Recruiter', 'Date'].map(h => (
              <th key={h} className="px-4 py-3 text-left">
                <div className="h-3 bg-gray-200 rounded w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map(i => (
            <tr key={i}>
              <td className="pl-4 py-4 w-8"><div className="w-4 h-4 bg-gray-200 rounded" /></td>
              <td className="px-4 py-4"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" /><div className="space-y-1"><div className="h-3 bg-gray-200 rounded w-32" /><div className="h-2 bg-gray-100 rounded w-24" /></div></div></td>
              <td className="px-4 py-4"><div className="h-3 bg-gray-100 rounded w-28" /></td>
              <td className="px-4 py-4"><div className="h-5 bg-gray-100 rounded-full w-20" /></td>
              <td className="px-4 py-4"><div className="h-3 bg-gray-100 rounded w-24" /></td>
              <td className="px-4 py-4"><div className="h-3 bg-gray-100 rounded w-20" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Pipeline Page ────────────────────────────────────────────────────────────

export default function Pipeline() {
  const { user, profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [view, setView]                 = useState('kanban')
  const [jobs, setJobs]                 = useState([])
  const [selectedJobId, setSelectedJobId] = useState(searchParams.get('job') ?? '')
  const [submissions, setSubmissions]   = useState([])
  const [allSubmissions, setAllSubmissions] = useState([])
  const [candidates, setCandidates]     = useState([])
  const [loadingJobs, setLoadingJobs]   = useState(true)
  const [loadingSubs, setLoadingSubs]   = useState(false)
  const [loadingTable, setLoadingTable] = useState(false)
  const [activeId, setActiveId]         = useState(null)
  const [drawer, setDrawer]             = useState(null)
  const [addModal, setAddModal]         = useState(false)
  const [addForm, setAddForm]           = useState({ candidate_id: '' })
  const [adding, setAdding]             = useState(false)
  const [addError, setAddError]         = useState('')

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

  useEffect(() => {
    if (view === 'table') loadTableSubmissions()
  }, [view])

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

  async function loadTableSubmissions() {
    setLoadingTable(true)
    const { data } = await supabase
      .from('submissions')
      .select('*, candidates(full_name, current_title), jobs(id, title), profiles!submitted_by(full_name)')
      .order('created_at', { ascending: false })
    setAllSubmissions(data ?? [])
    setLoadingTable(false)
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
    setAllSubmissions(prev => prev.map(s => s.id === subId ? { ...s, stage: newStage } : s))
    if (drawer?.id === subId) setDrawer(prev => ({ ...prev, stage: newStage }))
    await supabase.from('submissions').update({ stage: newStage, updated_at: new Date().toISOString() }).eq('id', subId)
    await supabase.from('submission_notes').insert({
      submission_id: subId, author_id: user.id,
      content: `Stage changed from ${stageName(oldStage)} to ${stageName(newStage)}`,
      type: 'stage_change', meta: { from: oldStage, to: newStage },
    })
    const sub = submissions.find(s => s.id === subId) ?? allSubmissions.find(s => s.id === subId)
    const entityName = `${sub?.candidates?.full_name ?? 'Candidate'} → ${sub?.jobs?.title ?? ''}`
    logAudit({
      userId: user.id, userName: profile?.full_name ?? user.email,
      action: 'stage_changed', entityType: 'submission', entityId: subId,
      entityName, oldValue: stageName(oldStage), newValue: stageName(newStage),
    })
    createNotification(
      sub?.submitted_by,
      'stage_change',
      'Pipeline stage updated',
      `${sub?.candidates?.full_name ?? 'Candidate'} moved to ${stageName(newStage)}`,
      `/pipeline?job=${sub?.job_id ?? selectedJobId}`,
    )
  }

  function handleBulkStageChange(ids, newStage) {
    setAllSubmissions(prev => prev.map(s => ids.includes(s.id) ? { ...s, stage: newStage } : s))
    setSubmissions(prev => prev.map(s => ids.includes(s.id) ? { ...s, stage: newStage } : s))
    logAudit({
      userId: user.id, userName: profile?.full_name ?? user.email,
      action: 'stage_changed', entityType: 'submission', entityId: null,
      entityName: `${ids.length} submissions`, newValue: stageName(newStage),
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
    setAllSubmissions(prev => [data, ...prev])
    logAudit({
      userId: user.id, userName: profile?.full_name ?? user.email,
      action: 'created', entityType: 'submission', entityId: data.id,
      entityName: `${data.candidates?.full_name ?? 'Candidate'} → ${data.jobs?.title ?? ''}`,
    })
    createNotification(
      user.id, 'new_submission', 'Candidate added to pipeline',
      `${data.candidates?.full_name ?? 'Candidate'} added to ${selectedJob?.title ?? 'job'}`,
      `/pipeline?job=${selectedJobId}`,
    )
    setAddModal(false); setAddForm({ candidate_id: '' }); setAdding(false)
  }

  const tableRows = selectedJobId ? allSubmissions.filter(s => s.job_id === selectedJobId) : allSubmissions
  const byStage   = Object.fromEntries(STAGES.map(s => [s.id, submissions.filter(sub => sub.stage === s.id)]))
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
            {view === 'kanban' && selectedJob && (
              <p className="text-sm text-gray-500">{selectedJob.title} · {submissions.length} candidates</p>
            )}
            {view === 'table' && (
              <p className="text-sm text-gray-500">
                {selectedJob ? selectedJob.title : 'All jobs'} · {tableRows.length} candidates
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'kanban' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid size={15} /> Kanban
            </button>
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'table' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={15} /> Table
            </button>
          </div>

          <select
            value={selectedJobId}
            onChange={e => setSelectedJobId(e.target.value)}
            className="px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white min-w-[220px]"
          >
            <option value="">{view === 'table' ? 'All jobs' : 'Select a job…'}</option>
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

      {/* Kanban view */}
      {view === 'kanban' && (
        !selectedJobId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <LayoutGrid size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="font-medium text-gray-500">Select a job to view its pipeline</p>
              <p className="text-sm text-gray-400 mt-1">Choose from the dropdown above, or switch to Table view to see all candidates.</p>
            </div>
          </div>
        ) : loadingSubs ? (
          <KanbanSkeleton />
        ) : submissions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <LayoutGrid size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="font-medium text-gray-500">No candidates in pipeline for this job yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "Add Candidate" to add the first candidate.</p>
            </div>
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
        )
      )}

      {/* Table view */}
      {view === 'table' && (
        loadingTable ? (
          <TableSkeleton />
        ) : tableRows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-16">
              <List size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="font-medium text-gray-500">No submissions yet</p>
              <p className="text-sm text-gray-400 mt-1">Add candidates to the pipeline to see them here.</p>
            </div>
          </div>
        ) : (
          <TableView
            submissions={tableRows}
            onRowClick={sub => setDrawer(sub)}
            onBulkStageChange={handleBulkStageChange}
          />
        )
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
              ?? allSubmissions.find(s => s.id === subId)?.stage
            moveStage(subId, newStage, old)
          }}
        />
      )}
    </div>
  )
}
