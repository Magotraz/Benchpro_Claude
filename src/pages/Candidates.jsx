import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Mail, Phone, MapPin, Briefcase, Search, Edit2, Users, Download, X, FileText, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logAudit } from '../lib/audit'
import Modal from '../components/Modal'

const EMPTY = {
  full_name: '', email: '', phone: '', current_title: '',
  current_company: '', location: '', experience_years: '',
  skills: '', linkedin_url: '',
}

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const ALLOWED_EXTS  = ['.pdf', '.docx']
const MAX_SIZE_MB   = 10

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

const BG_COLORS = [
  'bg-brand-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500',
]
function avatarColor(id) { return BG_COLORS[(id?.charCodeAt(0) ?? 0) % BG_COLORS.length] }

function exportCSV(candidates) {
  const headers = ['Name', 'Email', 'Phone', 'Title', 'Company', 'Location', 'Experience (yrs)', 'Skills', 'LinkedIn']
  const rows = candidates.map(c => [
    c.full_name ?? '',
    c.email ?? '',
    c.phone ?? '',
    c.current_title ?? '',
    c.current_company ?? '',
    c.location ?? '',
    c.experience_years ?? '',
    (c.skills ?? []).join('; '),
    c.linkedin_url ?? '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `benchpro-candidates-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
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
  const fileRef    = useRef(null)
  const [dragging, setDragging] = useState(false)

  function validate(file) {
    if (!file) return null
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

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [])

  return (
    <div className="col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        CV / Resume {!isEdit && <span className="text-red-500">*</span>}
        {isEdit && <span className="text-gray-400 font-normal"> (leave blank to keep existing)</span>}
      </label>

      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_EXTS.join(',')}
        onChange={onInputChange}
        className="hidden"
      />

      {cvFile ? (
        /* ── Uploaded state ── */
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle size={16} className="text-emerald-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-emerald-800 truncate">{cvFile.name}</p>
            <p className="text-xs text-emerald-600">{formatSize(cvFile.size)}</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors shrink-0"
            title="Remove file"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`
            w-full flex flex-col items-center gap-2 px-4 py-7 rounded-lg border-2 border-dashed
            cursor-pointer transition-colors select-none
            ${dragging
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-gray-200 hover:border-brand-400 hover:bg-brand-50/30 text-gray-500'
            }
          `}
        >
          <FileText size={22} className={dragging ? 'text-brand-500' : 'text-gray-300'} />
          {dragging ? (
            <p className="text-sm font-semibold">Drop to upload</p>
          ) : (
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function Candidates() {
  const { user, profile } = useAuth()
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [modal, setModal]           = useState(null)   // null | 'create' | candidate obj
  const [form, setForm]             = useState(EMPTY)
  const [cvFile, setCvFile]         = useState(null)   // { file, name, size } | null
  const [cvError, setCvError]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false })
    setCandidates(data ?? [])
    setLoading(false)
  }

  function openCreate() { setForm(EMPTY); setCvFile(null); setCvError(''); setError(''); setModal('create') }
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
    })
    setCvFile(null); setCvError(''); setError(''); setModal(c)
  }

  // Upload path: {recruiter_uid}/{candidate_id}_{timestamp}.{ext}
  // Folder = recruiter's own UID so it matches the existing owner-folder RLS policy.
  async function uploadCV(candidateId) {
    if (!cvFile) return null
    const ext  = cvFile.name.split('.').pop()
    const path = `${user.id}/${candidateId}_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('candidate-resumes')
      .upload(path, cvFile.file, { contentType: cvFile.file.type, upsert: true })
    if (upErr) throw upErr
    return { path, name: cvFile.name }
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    if (modal === 'create' && !cvFile) {
      setCvError('A CV (PDF or Word) is required.')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      skills:           skillsToArray(form.skills),
      experience_years: form.experience_years !== '' ? Number(form.experience_years) : null,
      updated_at:       new Date().toISOString(),
    }

    if (modal === 'create') {
      const { data, error: insErr } = await supabase
        .from('candidates')
        .insert({ ...payload, created_by: user.id })
        .select()
        .single()
      if (insErr) { setError(insErr.message); setSaving(false); return }

      try {
        const cv = await uploadCV(data.id)
        if (cv) {
          await supabase.from('candidates').update({
            resume_url: cv.path, resume_filename: cv.name,
          }).eq('id', data.id)
        }
      } catch (upErr) {
        setError(`Candidate saved but CV upload failed: ${upErr.message}`)
        setSaving(false); load(); return
      }

      logAudit({
        userId: user.id, userName: profile?.full_name ?? user.email,
        action: 'created', entityType: 'candidate',
        entityId: data.id, entityName: data.full_name,
      })
    } else {
      const { error: updErr } = await supabase
        .from('candidates')
        .update(payload)
        .eq('id', modal.id)
      if (updErr) { setError(updErr.message); setSaving(false); return }

      if (cvFile) {
        try {
          const cv = await uploadCV(modal.id)
          if (cv) {
            await supabase.from('candidates').update({
              resume_url: cv.path, resume_filename: cv.name,
            }).eq('id', modal.id)
          }
        } catch (upErr) {
          setError(`Candidate updated but CV upload failed: ${upErr.message}`)
          setSaving(false); load(); return
        }
      }

      logAudit({
        userId: user.id, userName: profile?.full_name ?? user.email,
        action: 'updated', entityType: 'candidate',
        entityId: modal.id, entityName: form.full_name,
      })
    }

    setModal(null); load(); setSaving(false)
  }

  async function downloadCV(candidate) {
    if (!candidate.resume_url) return
    const { data } = await supabase.storage
      .from('candidate-resumes')
      .createSignedUrl(candidate.resume_url, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  function f(key) { return (e) => setForm(prev => ({ ...prev, [key]: e.target.value })) }

  const filtered = candidates.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.current_title?.toLowerCase().includes(q) ||
      c.current_company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      (c.skills ?? []).some(s => s.toLowerCase().includes(q))
    )
  })

  const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Candidates</h1>
          <p className="text-sm text-gray-500">{candidates.length} total</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, skills…"
              className="pl-9 pr-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white w-52"
            />
          </div>
          {filtered.length > 0 && (
            <button
              onClick={() => exportCSV(filtered)}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>
          )}
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0">
            <Plus size={16} /> Add Candidate
          </button>
        </div>
      </div>

      {loading ? <Skeleton /> : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">{search ? `No results for "${search}"` : 'No candidates yet'}</p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Try different keywords.' : 'Add your first candidate to start building your talent pool.'}
          </p>
          {!search && (
            <button onClick={openCreate} className="mt-4 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">
              Add Candidate
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
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
                    <button
                      onClick={() => downloadCV(c)}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Download CV"
                    >
                      <FileText size={13} />
                    </button>
                  )}
                  <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                    <Edit2 size={13} />
                  </button>
                </div>
              </div>

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
              {c.phone && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1.5">
                  <Phone size={11} className="shrink-0" /> {c.phone}
                </p>
              )}

              {(c.skills?.length > 0) && (
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
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Add Candidate' : 'Edit Candidate'} onClose={() => setModal(null)} wide>
          {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input required value={form.full_name} onChange={f('full_name')} placeholder="Jane Doe" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={f('email')} placeholder="jane@example.com" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone} onChange={f('phone')} placeholder="+91 98765 43210" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Title</label>
                <input value={form.current_title} onChange={f('current_title')} placeholder="Senior Engineer" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label>
                <input value={form.current_company} onChange={f('current_company')} placeholder="Acme Corp" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input value={form.location} onChange={f('location')} placeholder="Mumbai" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                <input type="number" min="0" step="0.5" value={form.experience_years} onChange={f('experience_years')} placeholder="5" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Skills <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                <input value={form.skills} onChange={f('skills')} placeholder="React, TypeScript, Node.js, AWS" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                <input type="url" value={form.linkedin_url} onChange={f('linkedin_url')} placeholder="https://linkedin.com/in/…" className={inputCls} />
              </div>

              <CvDropZone
                cvFile={cvFile}
                onFile={(f, err) => { setCvFile(f); setCvError(err) }}
                onRemove={() => { setCvFile(null); setCvError('') }}
                error={cvError}
                isEdit={modal !== 'create'}
                existingFilename={modal !== 'create' ? modal?.resume_filename : null}
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : modal === 'create' ? 'Add Candidate' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
