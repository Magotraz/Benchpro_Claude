import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Mail, Phone, MapPin, Briefcase, Search, Edit2, Users, Download, X,
  FileText, CheckCircle, Sparkles, Trash2,
  LayoutGrid, Table2, AlignJustify, Columns,
  Filter, ChevronUp, ChevronDown, Monitor,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logAudit } from '../lib/audit'
import { extractTextFromFile, parseResumeText } from '../lib/resumeParser'
import Modal from '../components/Modal'

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY = {
  full_name: '', email: '', phone: '', current_title: '',
  current_company: '', location: '', experience_years: '',
  skills: '', linkedin_url: '', availability: 'bench',
}

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const ALLOWED_EXTS  = ['.pdf', '.docx']
const MAX_SIZE_MB   = 10
const PAGE_SIZE     = 25

const BG_COLORS = [
  'bg-brand-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500',
]

const AVAIL_CONFIG = {
  available: { label: 'Available', badge: 'bg-green-100 text-green-700 border-green-200', active: 'bg-green-600 text-white', header: 'border-green-300 bg-green-50', dot: 'bg-green-500' },
  bench:     { label: 'On Bench',  badge: 'bg-blue-100 text-blue-700 border-blue-200',   active: 'bg-blue-600 text-white',  header: 'border-blue-300 bg-blue-50',   dot: 'bg-blue-500'  },
  notice:    { label: 'In Notice', badge: 'bg-amber-100 text-amber-700 border-amber-200', active: 'bg-amber-500 text-white', header: 'border-amber-300 bg-amber-50', dot: 'bg-amber-500' },
  placed:    { label: 'Placed',    badge: 'bg-gray-100 text-gray-600 border-gray-200',    active: 'bg-gray-500 text-white',  header: 'border-gray-200 bg-gray-50',   dot: 'bg-gray-400'  },
}
const AVAIL_KEYS = ['available', 'bench', 'notice', 'placed']

const SORT_OPTIONS = [
  { key: 'created_at',       dir: 'desc', label: 'Newest first' },
  { key: 'created_at',       dir: 'asc',  label: 'Oldest first' },
  { key: 'full_name',        dir: 'asc',  label: 'Name A–Z' },
  { key: 'full_name',        dir: 'desc', label: 'Name Z–A' },
  { key: 'experience_years', dir: 'desc', label: 'Most experienced' },
  { key: 'experience_years', dir: 'asc',  label: 'Least experienced' },
]

const VIEWS = [
  { key: 'card',    label: 'Cards',   Icon: LayoutGrid },
  { key: 'table',   label: 'Table',   Icon: Table2 },
  { key: 'compact', label: 'Compact', Icon: AlignJustify },
  { key: 'board',   label: 'Board',   Icon: Columns },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function skillsToArray(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean)
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function avatarColor(id) { return BG_COLORS[(id?.charCodeAt(0) ?? 0) % BG_COLORS.length] }

function exportCSV(candidates) {
  const headers = ['Name', 'Email', 'Phone', 'Title', 'Company', 'Location', 'Exp (yrs)', 'Skills', 'LinkedIn', 'Availability']
  const rows = candidates.map(c => [
    c.full_name ?? '', c.email ?? '', c.phone ?? '', c.current_title ?? '',
    c.current_company ?? '', c.location ?? '', c.experience_years ?? '',
    (c.skills ?? []).join('; '), c.linkedin_url ?? '',
    AVAIL_CONFIG[c.availability]?.label ?? '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `benchpro-candidates-${new Date().toISOString().slice(0, 10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

function highlight(text, query) {
  if (!text) return ''
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-gray-900 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function sortData(arr, { key, dir }) {
  const mul = dir === 'asc' ? 1 : -1
  return [...arr].sort((a, b) => {
    if (key === 'experience_years') return mul * ((a[key] ?? -1) - (b[key] ?? -1))
    if (key === 'created_at') return mul * (new Date(a[key]) - new Date(b[key]))
    return mul * String(a[key] ?? '').localeCompare(String(b[key] ?? ''))
  })
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded w-2/3" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
          <div className="mt-3 flex gap-1">
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
            <div className="h-5 w-20 bg-gray-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── CV Drop Zone ─────────────────────────────────────────────────────────────

function CvDropZone({ cvFile, onFile, onRemove, error, isEdit, existingFilename }) {
  const fileRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function validate(file) {
    if (!ALLOWED_TYPES.includes(file.type)) return 'Only PDF and Word (.docx) files are allowed.'
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `File must be under ${MAX_SIZE_MB}MB.`
    return null
  }

  function processFile(file) {
    const err = validate(file)
    if (err) { onFile(null, err); return }
    onFile({ file, name: file.name, size: file.size }, '')
  }

  function onInputChange(e) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const onDragOver  = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setDragging(true) }, [])
  const onDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setDragging(false) }, [])
  const onDrop      = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [])

  return (
    <div className="col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        CV / Resume {!isEdit && <span className="text-red-500">*</span>}
        {isEdit && <span className="text-gray-400 font-normal"> (leave blank to keep existing)</span>}
      </label>
      <input ref={fileRef} type="file" accept={ALLOWED_EXTS.join(',')} onChange={onInputChange} className="hidden" />

      {cvFile ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle size={16} className="text-emerald-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-emerald-800 truncate">{cvFile.name}</p>
            <p className="text-xs text-emerald-600">{formatSize(cvFile.size)}</p>
          </div>
          <button type="button" onClick={onRemove} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors shrink-0" title="Remove file">
            <X size={15} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`w-full flex flex-col items-center gap-2 px-4 py-7 rounded-lg border-2 border-dashed cursor-pointer transition-colors select-none ${
            dragging ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-400 hover:bg-brand-50/30 text-gray-500'
          }`}
        >
          <FileText size={22} className={dragging ? 'text-brand-500' : 'text-gray-300'} />
          {dragging ? <p className="text-sm font-semibold">Drop to upload</p> : (
            <>
              <p className="text-sm font-medium">Drag &amp; drop your CV here</p>
              <p className="text-xs text-gray-400">or <span className="text-brand-600 underline underline-offset-2">click to browse</span></p>
            </>
          )}
          <p className="text-xs text-gray-400">PDF or Word (.docx) · max {MAX_SIZE_MB}MB</p>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {isEdit && existingFilename && !cvFile && (
        <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1.5">
          <FileText size={11} /> Current: {existingFilename}
        </p>
      )}
    </div>
  )
}

// ─── Small UI atoms ───────────────────────────────────────────────────────────

function AutoBadge({ show }) {
  if (!show) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full ml-2 font-normal">
      <Sparkles size={9} />Auto-filled
    </span>
  )
}

function AvailBadge({ value }) {
  const cfg = AVAIL_CONFIG[value]
  if (!cfg) return null
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${cfg.badge}`}>{cfg.label}</span>
}

// ─── Card View ────────────────────────────────────────────────────────────────

function CardView({ sorted, openEdit, downloadCV }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {sorted.map(c => (
        <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${avatarColor(c.id)}`}>
                {initials(c.full_name)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 truncate">{c.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{c.current_title || <span className="text-gray-300">No title</span>}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {c.resume_url && (
                <button onClick={() => downloadCV(c)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Download CV">
                  <FileText size={13} />
                </button>
              )}
              <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                <Edit2 size={13} />
              </button>
            </div>
          </div>

          {c.availability && <div className="mb-2.5"><AvailBadge value={c.availability} /></div>}
          {c.current_company && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1.5">
              <Briefcase size={11} className="shrink-0" /> {c.current_company}
              {c.experience_years ? ` · ${c.experience_years}y exp` : ''}
            </p>
          )}
          {c.location && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1.5">
              <MapPin size={11} className="shrink-0" /> {c.location}
            </p>
          )}
          {c.email && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1.5">
              <Mail size={11} className="shrink-0" /> {c.email}
            </p>
          )}
          {c.skills?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {c.skills.slice(0, 4).map(s => (
                <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">{s}</span>
              ))}
              {c.skills.length > 4 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">+{c.skills.length - 4}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({ sorted, sort, onSort, page, setPage, openEdit, downloadCV, onDelete, onAddToPipeline }) {
  const total    = sorted.length
  const start    = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(start, start + PAGE_SIZE)

  const thBase = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50'

  function SortIcon({ col }) {
    if (sort.key !== col) return <ChevronDown size={11} className="text-gray-300 ml-0.5" />
    return sort.dir === 'asc'
      ? <ChevronUp   size={11} className="text-indigo-500 ml-0.5" />
      : <ChevronDown size={11} className="text-indigo-500 ml-0.5" />
  }

  function Th({ col, children }) {
    return (
      <th onClick={() => onSort(col)} className={`${thBase} cursor-pointer hover:text-gray-700 select-none`}>
        <span className="flex items-center">{children}<SortIcon col={col} /></span>
      </th>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead className="sticky top-0 z-10 border-b border-gray-200">
            <tr>
              <th className={`${thBase} w-10`} />
              <Th col="full_name">Name</Th>
              <Th col="current_title">Title</Th>
              <th className={thBase}>Company</th>
              <Th col="location">Location</Th>
              <th className={thBase}>Skills</th>
              <Th col="experience_years">Exp</Th>
              <th className={thBase}>Status</th>
              <th className={thBase}>CV</th>
              <th className={thBase}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="pl-4 pr-2 py-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${avatarColor(c.id)}`}>
                    {initials(c.full_name)}
                  </div>
                </td>
                <td className="px-4 py-3 max-w-[150px]">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.full_name}</p>
                  {c.email && <p className="text-xs text-gray-400 truncate">{c.email}</p>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[140px]">
                  <p className="truncate">{c.current_title ?? '—'}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[120px]">
                  <p className="truncate">{c.current_company ?? '—'}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[100px]">
                  <p className="truncate">{c.location ?? '—'}</p>
                </td>
                <td className="px-4 py-3 max-w-[160px]">
                  <div className="flex flex-wrap gap-1">
                    {(c.skills ?? []).slice(0, 3).map(s => (
                      <span key={s} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">{s}</span>
                    ))}
                    {(c.skills?.length ?? 0) > 3 && (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs" title={(c.skills ?? []).slice(3).join(', ')}>
                        +{c.skills.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {c.experience_years != null ? `${c.experience_years} yrs` : '—'}
                </td>
                <td className="px-4 py-3">
                  <AvailBadge value={c.availability ?? 'bench'} />
                </td>
                <td className="px-4 py-3">
                  {c.resume_url
                    ? <button onClick={() => downloadCV(c)} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded transition-colors" title="Download CV"><FileText size={14} /></button>
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => openEdit(c)} title="Edit" className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"><Edit2 size={13} /></button>
                    <button onClick={() => onAddToPipeline(c)} title="Add to pipeline" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Plus size={13} /></button>
                    <button onClick={() => onDelete(c)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/60">
            <span className="text-sm text-gray-500">
              Showing {start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total} candidates
            </span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                ← Prev
              </button>
              <button disabled={start + PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile fallback */}
      <div className="md:hidden py-14 text-center">
        <Monitor size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="font-medium text-gray-500">Switch to desktop for table view</p>
        <p className="text-sm text-gray-400 mt-1">Try Card or Compact view on mobile</p>
      </div>
    </div>
  )
}

// ─── Compact View ─────────────────────────────────────────────────────────────

function CompactView({ sorted, search, openEdit, downloadCV, compactLimit, setCompactLimit }) {
  const visible = sorted.slice(0, compactLimit)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {visible.length === 0
        ? <div className="py-12 text-center text-sm text-gray-400">No candidates match your filters.</div>
        : (
          <ul className="divide-y divide-gray-100">
            {visible.map(c => (
              <li
                key={c.id}
                onClick={() => openEdit(c)}
                className="flex items-center gap-3 px-4 hover:bg-gray-50 cursor-pointer transition-colors"
                style={{ height: 40 }}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${avatarColor(c.id)}`}>
                  {initials(c.full_name)}
                </div>
                <span className="font-medium text-sm text-gray-800 truncate min-w-0 max-w-[130px]">
                  {highlight(c.full_name, search)}
                </span>
                {c.current_title && (
                  <span className="text-xs text-gray-500 truncate hidden sm:block max-w-[120px]">
                    · {highlight(c.current_title, search)}
                  </span>
                )}
                {c.current_company && (
                  <span className="text-xs text-gray-400 truncate hidden md:block max-w-[100px]">
                    · {highlight(c.current_company, search)}
                  </span>
                )}
                {c.location && (
                  <span className="text-xs text-gray-400 truncate hidden lg:block">· {c.location}</span>
                )}
                <div className="ml-auto flex items-center gap-1.5 shrink-0">
                  <AvailBadge value={c.availability ?? 'bench'} />
                  {c.resume_url && (
                    <button
                      onClick={e => { e.stopPropagation(); downloadCV(c) }}
                      className="p-1 text-gray-400 hover:text-emerald-600 rounded transition-colors" title="Download CV"
                    ><FileText size={12} /></button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(c) }}
                    className="p-1 text-gray-400 hover:text-brand-600 rounded transition-colors"
                  ><Edit2 size={12} /></button>
                </div>
              </li>
            ))}
          </ul>
        )
      }
      {compactLimit < sorted.length && (
        <div className="px-4 py-3 border-t border-gray-100 text-center">
          <button onClick={() => setCompactLimit(l => l + 50)} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Load more ({sorted.length - compactLimit} remaining)
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Board / Kanban View ──────────────────────────────────────────────────────

function KanbanView({ sorted, openEdit, onAvailChange }) {
  const [draggingId,  setDraggingId]  = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)

  function byCol(key) { return sorted.filter(c => (c.availability ?? 'bench') === key) }

  function handleDrop(col) {
    setDragOverCol(null)
    if (!draggingId) return
    const c = sorted.find(x => x.id === draggingId)
    if (c && (c.availability ?? 'bench') !== col) onAvailChange(c.id, col)
    setDraggingId(null)
  }

  return (
    <>
      <div className="md:hidden py-14 text-center">
        <Monitor size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="font-medium text-gray-500">Switch to desktop for board view</p>
        <p className="text-sm text-gray-400 mt-1">Try Card or Compact view on mobile</p>
      </div>

      <div className="hidden md:grid grid-cols-4 gap-3">
        {AVAIL_KEYS.map(col => {
          const cfg   = AVAIL_CONFIG[col]
          const cards = byCol(col)
          const isOver = dragOverCol === col

          return (
            <div
              key={col}
              onDragEnter={() => setDragOverCol(col)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(col)}
              className={`rounded-xl border-2 transition-colors min-h-[300px] flex flex-col ${
                isOver ? 'border-indigo-400 bg-indigo-50/60' : `border-opacity-70 ${cfg.header}`
              }`}
            >
              <div className="px-3 py-2.5 flex items-center justify-between border-b border-black/5">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-sm font-semibold text-gray-700">{cfg.label}</span>
                </div>
                <span className="text-xs font-medium bg-white/80 text-gray-500 px-2 py-0.5 rounded-full">{cards.length}</span>
              </div>

              <div className="p-2 space-y-2 flex-1">
                {cards.map(c => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDraggingId(c.id)}
                    onDragEnd={() => { setDraggingId(null); setDragOverCol(null) }}
                    onClick={() => openEdit(c)}
                    className={`bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all select-none ${
                      draggingId === c.id ? 'opacity-40 ring-2 ring-indigo-300' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${avatarColor(c.id)}`}>
                        {initials(c.full_name)}
                      </div>
                      <p className="font-medium text-sm text-gray-800 truncate">{c.full_name}</p>
                    </div>
                    {c.current_title && <p className="text-xs text-gray-500 mb-1 truncate">{c.current_title}</p>}
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
                      {c.location && <span className="flex items-center gap-0.5"><MapPin size={9} />{c.location}</span>}
                      {c.experience_years != null && <span>{c.experience_years}y</span>}
                    </div>
                    {c.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.skills.slice(0, 3).map(s => (
                          <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">{s}</span>
                        ))}
                        {c.skills.length > 3 && <span className="text-[10px] text-gray-400">+{c.skills.length - 3}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Candidates() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  // ── Data ──
  const [candidates, setCandidates] = useState([])
  const [loading,    setLoading]    = useState(true)

  // ── Modal / form ──
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState(EMPTY)
  const [cvFile,    setCvFile]    = useState(null)
  const [cvError,   setCvError]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')

  // ── CV auto-fill ──
  const [autoFilled,   setAutoFilled]   = useState(new Set())
  const [parseStatus,  setParseStatus]  = useState('idle')

  // ── View / filters / sort ──
  const [view,       setView]       = useState(() => localStorage.getItem('candidates_view') ?? 'card')
  const [filters,    setFilters]    = useState({ search: '', availability: '', location: '', minExp: '', skills: '', hasCV: '' })
  const [sort,       setSort]       = useState({ key: 'created_at', dir: 'desc' })
  const [showFilters,setShowFilters]= useState(false)
  const filterRef = useRef(null)

  // ── Table ──
  const [page, setPage] = useState(1)

  // ── Compact ──
  const [compactLimit, setCompactLimit] = useState(50)

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!localStorage.getItem('candidates_view') && candidates.length >= 50) setView('table')
  }, [candidates.length])

  useEffect(() => {
    if (!showFilters) return
    function handle(e) { if (!filterRef.current?.contains(e.target)) setShowFilters(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showFilters])

  useEffect(() => { setPage(1) },        [filters, sort])
  useEffect(() => { setCompactLimit(50) }, [filters])

  // ── Derived data ──
  const filtered = useMemo(() => candidates.filter(c => {
    const { search, availability, location, minExp, skills, hasCV } = filters
    if (search) {
      const q = search.toLowerCase()
      if (!c.full_name?.toLowerCase().includes(q) &&
          !c.current_title?.toLowerCase().includes(q) &&
          !c.current_company?.toLowerCase().includes(q) &&
          !c.email?.toLowerCase().includes(q) &&
          !(c.skills ?? []).some(s => s.toLowerCase().includes(q))) return false
    }
    if (availability && (c.availability ?? 'bench') !== availability) return false
    if (location && !c.location?.toLowerCase().includes(location.toLowerCase())) return false
    if (minExp && (c.experience_years == null || c.experience_years < Number(minExp))) return false
    if (skills) {
      const req = skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      if (req.length && !req.some(rs => (c.skills ?? []).some(s => s.toLowerCase().includes(rs)))) return false
    }
    if (hasCV === 'yes' && !c.resume_url) return false
    if (hasCV === 'no' && c.resume_url) return false
    return true
  }), [candidates, filters])

  const sorted = useMemo(() => sortData(filtered, sort), [filtered, sort])

  const activeFilterPills = useMemo(() => {
    const pills = []
    if (filters.availability) pills.push({ key: 'availability', label: `Availability: ${AVAIL_CONFIG[filters.availability]?.label}` })
    if (filters.location)     pills.push({ key: 'location',     label: `Location: ${filters.location}` })
    if (filters.minExp)       pills.push({ key: 'minExp',       label: `Min exp: ${filters.minExp}y` })
    if (filters.skills)       pills.push({ key: 'skills',       label: `Skills: ${filters.skills}` })
    if (filters.hasCV)        pills.push({ key: 'hasCV',        label: `Has CV: ${filters.hasCV === 'yes' ? 'Yes' : 'No'}` })
    return pills
  }, [filters])

  const hasFilters = activeFilterPills.length > 0 || !!filters.search

  // ── Handlers ──
  async function load() {
    setLoading(true)
    const { data } = await supabase.from('candidates').select('*').order('created_at', { ascending: false })
    setCandidates(data ?? [])
    setLoading(false)
  }

  function switchView(v) { setView(v); localStorage.setItem('candidates_view', v) }
  function clearFilters() { setFilters({ search: '', availability: '', location: '', minExp: '', skills: '', hasCV: '' }) }
  function resetParseState() { setAutoFilled(new Set()); setParseStatus('idle') }

  function openCreate() {
    setForm(EMPTY); setCvFile(null); setCvError(''); setFormError('')
    resetParseState(); setModal('create')
  }

  function openEdit(c) {
    setForm({
      full_name:        c.full_name ?? '',
      email:            c.email ?? '',
      phone:            c.phone ?? '',
      current_title:    c.current_title ?? '',
      current_company:  c.current_company ?? '',
      location:         c.location ?? '',
      experience_years: c.experience_years ?? '',
      skills:           (c.skills ?? []).join(', '),
      linkedin_url:     c.linkedin_url ?? '',
      availability:     c.availability ?? 'bench',
    })
    setCvFile(null); setCvError(''); setFormError('')
    resetParseState(); setModal(c)
  }

  async function parseCv(file) {
    setParseStatus('parsing'); setAutoFilled(new Set())
    try {
      const text = await extractTextFromFile(file)
      if (!text || text.trim().length < 30) { setParseStatus('error'); return }
      const parsed = parseResumeText(text)
      const fieldMap = {
        full_name:        parsed.name,
        email:            parsed.email,
        phone:            parsed.phone,
        current_title:    parsed.currentTitle,
        current_company:  parsed.currentCompany,
        location:         parsed.location,
        experience_years: parsed.experienceYears != null ? String(parsed.experienceYears) : null,
        skills:           parsed.skills?.length > 0 ? parsed.skills.join(', ') : null,
        linkedin_url:     parsed.linkedinUrl,
      }
      const newFilled = new Set()
      setForm(prev => {
        const next = { ...prev }
        for (const [key, val] of Object.entries(fieldMap)) {
          if (val && !prev[key]) { next[key] = val; newFilled.add(key) }
        }
        return next
      })
      Promise.resolve().then(() => {
        setAutoFilled(new Set(newFilled))
        setParseStatus(newFilled.size > 0 ? 'success' : 'idle')
      })
    } catch { setParseStatus('error') }
  }

  async function uploadCV(candidateId) {
    if (!cvFile) return null
    const ext  = cvFile.name.split('.').pop()
    const path = `${user.id}/${candidateId}_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('candidate-resumes').upload(path, cvFile.file, { contentType: cvFile.file.type, upsert: true })
    if (upErr) throw upErr
    return { path, name: cvFile.name }
  }

  async function save(e) {
    e.preventDefault(); setFormError('')
    if (modal === 'create' && !cvFile) { setCvError('A CV (PDF or Word) is required.'); return }
    setSaving(true)
    const payload = {
      ...form,
      skills:           skillsToArray(form.skills),
      experience_years: form.experience_years !== '' ? Number(form.experience_years) : null,
      updated_at:       new Date().toISOString(),
    }

    if (modal === 'create') {
      const { data, error: insErr } = await supabase
        .from('candidates').insert({ ...payload, created_by: user.id }).select().single()
      if (insErr) { setFormError(insErr.message); setSaving(false); return }
      try {
        const cv = await uploadCV(data.id)
        if (cv) await supabase.from('candidates').update({ resume_url: cv.path, resume_filename: cv.name }).eq('id', data.id)
      } catch (upErr) { setFormError(`Candidate saved but CV upload failed: ${upErr.message}`); setSaving(false); load(); return }
      logAudit({ userId: user.id, userName: profile?.full_name ?? user.email, action: 'created', entityType: 'candidate', entityId: data.id, entityName: data.full_name })
    } else {
      const { error: updErr } = await supabase.from('candidates').update(payload).eq('id', modal.id)
      if (updErr) { setFormError(updErr.message); setSaving(false); return }
      if (cvFile) {
        try {
          const cv = await uploadCV(modal.id)
          if (cv) await supabase.from('candidates').update({ resume_url: cv.path, resume_filename: cv.name }).eq('id', modal.id)
        } catch (upErr) { setFormError(`Candidate updated but CV upload failed: ${upErr.message}`); setSaving(false); load(); return }
      }
      logAudit({ userId: user.id, userName: profile?.full_name ?? user.email, action: 'updated', entityType: 'candidate', entityId: modal.id, entityName: form.full_name })
    }
    setModal(null); load(); setSaving(false)
  }

  async function deleteCand(c) {
    if (!window.confirm(`Delete ${c.full_name}? This cannot be undone.`)) return
    await supabase.from('candidates').delete().eq('id', c.id)
    logAudit({ userId: user.id, userName: profile?.full_name ?? user.email, action: 'deleted', entityType: 'candidate', entityId: c.id, entityName: c.full_name })
    load()
  }

  async function downloadCV(c) {
    if (!c.resume_url) return
    const { data } = await supabase.storage.from('candidate-resumes').createSignedUrl(c.resume_url, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function updateAvailability(id, availability) {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, availability } : c))
    await supabase.from('candidates').update({ availability }).eq('id', id)
    logAudit({ userId: user.id, userName: profile?.full_name ?? user.email, action: 'updated', entityType: 'candidate', entityId: id, newValue: availability })
  }

  function handleColSort(key) {
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }

  function f(key) {
    return (e) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
      if (autoFilled.has(key)) setAutoFilled(prev => { const s = new Set(prev); s.delete(key); return s })
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white'

  // ── Render ──
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Candidates</h1>
          <p className="text-sm text-gray-500">{filtered.length} of {candidates.length} total</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search name, skills…"
              className="pl-9 pr-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white w-48"
            />
          </div>

          {/* Filter popover */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${
                hasFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter size={13} />
              Filters{activeFilterPills.length > 0 ? ` (${activeFilterPills.length})` : ''}
            </button>

            {showFilters && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter candidates</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Availability</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['', ...AVAIL_KEYS].map(av => (
                        <button key={av} onClick={() => setFilters(prev => ({ ...prev, availability: av }))}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                            filters.availability === av ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                          }`}
                        >{av ? AVAIL_CONFIG[av].label : 'All'}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Location</p>
                    <input value={filters.location} onChange={e => setFilters(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Mumbai, Delhi…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Min experience (years)</p>
                    <input type="number" min="0" value={filters.minExp} onChange={e => setFilters(prev => ({ ...prev, minExp: e.target.value }))}
                      placeholder="e.g. 3"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Skills (comma-separated)</p>
                    <input value={filters.skills} onChange={e => setFilters(prev => ({ ...prev, skills: e.target.value }))}
                      placeholder="React, AWS, SAP…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Has CV</p>
                    <div className="flex gap-1.5">
                      {[['', 'All'], ['yes', 'Yes'], ['no', 'No']].map(([val, lbl]) => (
                        <button key={val} onClick={() => setFilters(prev => ({ ...prev, hasCV: val }))}
                          className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                            filters.hasCV === val ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >{lbl}</button>
                      ))}
                    </div>
                  </div>
                </div>
                {(hasFilters) && (
                  <button onClick={clearFilters} className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 py-1">
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sort */}
          <select
            value={`${sort.key}:${sort.dir}`}
            onChange={e => { const [key, dir] = e.target.value.split(':'); setSort({ key, dir }) }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-gray-700 cursor-pointer"
          >
            {SORT_OPTIONS.map(o => (
              <option key={`${o.key}:${o.dir}`} value={`${o.key}:${o.dir}`}>{o.label}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {VIEWS.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => switchView(key)} title={label}
                className={`px-2.5 py-2 flex items-center gap-1.5 border-r last:border-r-0 border-gray-200 text-xs transition-colors ${
                  view === key ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Export */}
          {sorted.length > 0 && (
            <button onClick={() => exportCSV(sorted)}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={14} /> Export
            </button>
          )}

          {/* Add */}
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            <Plus size={16} /> Add Candidate
          </button>
        </div>
      </div>

      {/* Active filter pills */}
      {activeFilterPills.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {activeFilterPills.map(pill => (
            <span key={pill.key} className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
              {pill.label}
              <button onClick={() => setFilters(prev => ({ ...prev, [pill.key]: '' }))} className="ml-0.5 hover:text-indigo-900">
                <X size={10} />
              </button>
            </span>
          ))}
          <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">Clear all</button>
        </div>
      )}

      {/* Content */}
      {loading ? <Skeleton /> : sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">
            {hasFilters ? 'No candidates match your filters' : 'No candidates yet'}
          </p>
          {hasFilters
            ? <button onClick={clearFilters} className="mt-2 text-sm text-indigo-600 hover:underline">Clear filters</button>
            : (
              <>
                <p className="text-sm text-gray-400 mt-1">Add your first candidate to start building your talent pool.</p>
                <button onClick={openCreate} className="mt-4 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">
                  Add Candidate
                </button>
              </>
            )
          }
        </div>
      ) : (
        <>
          {view === 'card' && (
            <CardView sorted={sorted} openEdit={openEdit} downloadCV={downloadCV} />
          )}
          {view === 'table' && (
            <TableView
              sorted={sorted} sort={sort} onSort={handleColSort}
              page={page} setPage={setPage}
              openEdit={openEdit} downloadCV={downloadCV}
              onDelete={deleteCand}
              onAddToPipeline={() => navigate('/pipeline')}
            />
          )}
          {view === 'compact' && (
            <CompactView
              sorted={sorted} search={filters.search}
              openEdit={openEdit} downloadCV={downloadCV}
              compactLimit={compactLimit} setCompactLimit={setCompactLimit}
            />
          )}
          {view === 'board' && (
            <KanbanView sorted={sorted} openEdit={openEdit} onAvailChange={updateAvailability} />
          )}
        </>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <Modal title={modal === 'create' ? 'Add Candidate' : 'Edit Candidate'} onClose={() => setModal(null)} wide>
          {formError && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                  <AutoBadge show={autoFilled.has('full_name')} />
                </label>
                <input required value={form.full_name} onChange={f('full_name')} placeholder="Jane Doe" className={inputCls} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <AutoBadge show={autoFilled.has('email')} />
                </label>
                <input type="email" value={form.email} onChange={f('email')} placeholder="jane@example.com" className={inputCls} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <AutoBadge show={autoFilled.has('phone')} />
                </label>
                <input value={form.phone} onChange={f('phone')} placeholder="+91 98765 43210" className={inputCls} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Title <AutoBadge show={autoFilled.has('current_title')} />
                </label>
                <input value={form.current_title} onChange={f('current_title')} placeholder="Senior Engineer" className={inputCls} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Company <AutoBadge show={autoFilled.has('current_company')} />
                </label>
                <input value={form.current_company} onChange={f('current_company')} placeholder="Acme Corp" className={inputCls} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location <AutoBadge show={autoFilled.has('location')} />
                </label>
                <input value={form.location} onChange={f('location')} placeholder="Mumbai" className={inputCls} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Experience <AutoBadge show={autoFilled.has('experience_years')} />
                </label>
                <input type="number" min="0" step="0.5" value={form.experience_years} onChange={f('experience_years')} placeholder="5" className={inputCls} />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skills <span className="text-gray-400 font-normal">(comma-separated)</span>
                  <AutoBadge show={autoFilled.has('skills')} />
                </label>
                <input value={form.skills} onChange={f('skills')} placeholder="React, TypeScript, Node.js, AWS" className={inputCls} />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn URL <AutoBadge show={autoFilled.has('linkedin_url')} />
                </label>
                <input type="url" value={form.linkedin_url} onChange={f('linkedin_url')} placeholder="https://linkedin.com/in/…" className={inputCls} />
              </div>

              {/* Availability */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Availability</label>
                <div className="flex gap-2">
                  {AVAIL_KEYS.map(av => {
                    const cfg = AVAIL_CONFIG[av]
                    return (
                      <button key={av} type="button"
                        onClick={() => setForm(prev => ({ ...prev, availability: av }))}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                          form.availability === av ? `${cfg.active} border-transparent` : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <CvDropZone
                cvFile={cvFile}
                onFile={(fileObj, err) => {
                  setCvFile(fileObj); setCvError(err)
                  if (fileObj && !err) parseCv(fileObj.file)
                  else resetParseState()
                }}
                onRemove={() => { setCvFile(null); setCvError(''); resetParseState() }}
                error={cvError}
                isEdit={modal !== 'create'}
                existingFilename={modal !== 'create' ? modal?.resume_filename : null}
              />

              {parseStatus !== 'idle' && (
                <div className="col-span-2">
                  {parseStatus === 'parsing' && (
                    <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin shrink-0" />
                      Analysing CV…
                    </div>
                  )}
                  {parseStatus === 'success' && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                      <Sparkles size={14} className="shrink-0" />
                      CV analysed — please review and correct the fields below
                    </div>
                  )}
                  {parseStatus === 'error' && (
                    <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                      Could not extract text from this CV — please fill in the fields manually
                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : modal === 'create' ? 'Add Candidate' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
