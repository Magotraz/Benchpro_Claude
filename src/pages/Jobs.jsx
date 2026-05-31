import { useState, useEffect, useRef } from 'react'
import { Plus, Briefcase, MapPin, Users, Edit2, ExternalLink, Globe, Inbox, Check, UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../lib/utils'
import Modal from '../components/Modal'
import JobApplicationsPanel from '../components/JobApplicationsPanel'

const STATUS_COLORS = {
  open:    'bg-emerald-100 text-emerald-700',
  draft:   'bg-gray-100 text-gray-600',
  on_hold: 'bg-amber-100 text-amber-700',
  closed:  'bg-red-100 text-red-600',
}
const STATUS_LABELS = { open: 'Open', draft: 'Draft', on_hold: 'On Hold', closed: 'Closed' }
const FILTERS       = ['all', 'open', 'draft', 'on_hold', 'closed']

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Freelance']

const EMPTY = {
  title: '', status: 'open', location: '', employment_type: 'Full-time',
  salary_min: '', salary_max: '', currency: 'INR',
  description: '', requirements: '', client_id: '',
  show_salary: false, skills_required: [], experience_min: 0, is_public: true,
}

function makeSlug(title, location) {
  return (title + '-' + (location || 'remote'))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function field(setForm, key) {
  return (e) => setForm(f => ({ ...f, [key]: e.target.value }))
}

function SkillInput({ skills, onChange }) {
  const [input, setInput] = useState('')
  const ref = useRef(null)

  function add(raw) {
    const tag = raw.trim()
    if (tag && !skills.includes(tag)) onChange([...skills, tag])
    setInput('')
  }

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
    if (e.key === 'Backspace' && !input && skills.length > 0) onChange(skills.slice(0, -1))
  }

  return (
    <div
      onClick={() => ref.current?.focus()}
      className="min-h-[40px] flex flex-wrap gap-1.5 px-3 py-2 border border-gray-300 rounded-lg cursor-text focus-within:ring-2 focus-within:ring-brand-500"
    >
      {skills.map(s => (
        <span key={s} className="flex items-center gap-1 px-2 py-0.5 bg-brand-100 text-brand-700 rounded text-xs font-medium">
          {s}
          <button type="button" onClick={() => onChange(skills.filter(x => x !== s))} className="hover:text-brand-900">×</button>
        </span>
      ))}
      <input
        ref={ref}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => input && add(input)}
        placeholder={skills.length === 0 ? 'Type a skill and press Enter…' : ''}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
      />
    </div>
  )
}

// ── Assign Recruiters Modal (super_recruiter only) ─────────────────────────────

function AssignRecruitersModal({ job, recruiters, onClose }) {
  const { user } = useAuth()
  const [assigned, setAssigned] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase
      .from('job_assignments')
      .select('recruiter_id')
      .eq('job_id', job.id)
      .then(({ data }) => {
        setAssigned((data ?? []).map(a => a.recruiter_id))
        setLoading(false)
      })
  }, [job.id])

  async function toggle(recruiterId) {
    const isAssigned = assigned.includes(recruiterId)
    if (isAssigned) {
      await supabase.from('job_assignments').delete().eq('job_id', job.id).eq('recruiter_id', recruiterId)
      setAssigned(prev => prev.filter(id => id !== recruiterId))
    } else {
      await supabase.from('job_assignments').insert({ job_id: job.id, recruiter_id: recruiterId, assigned_by: user.id })
      setAssigned(prev => [...prev, recruiterId])
    }
  }

  return (
    <Modal title={`Assign Recruiters — ${job.title}`} onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : recruiters.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No recruiters yet. Invite recruiters from the Admin Panel.
        </p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto py-1">
          {recruiters.map(r => {
            const isAssigned = assigned.includes(r.id)
            return (
              <button
                key={r.id}
                onClick={() => toggle(r.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left ${
                  isAssigned
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0 uppercase">
                  {(r.full_name || r.email || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.full_name || r.email}</p>
                  {r.full_name && <p className="text-xs text-gray-400 truncate">{r.email}</p>}
                </div>
                {isAssigned && <Check size={16} className="text-brand-600 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-4">
        <p className="text-xs text-gray-400">{assigned.length} recruiter{assigned.length !== 1 ? 's' : ''} assigned</p>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
        >
          Done
        </button>
      </div>
    </Modal>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Jobs() {
  const { user, isSuperRecruiter, role } = useAuth()
  const navigate  = useNavigate()
  const [jobs, setJobs]         = useState([])
  const [clients, setClients]   = useState([])
  const [recruiters, setRecruiters] = useState([])
  const [submCounts, setSubmCounts] = useState({})
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [appPanel, setAppPanel] = useState(null)
  const [assignJob, setAssignJob] = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)

    const queries = [
      supabase.from('jobs').select('*, profiles!client_id(full_name, email)').order('created_at', { ascending: false }),
      supabase.from('submissions').select('job_id'),
    ]

    if (isSuperRecruiter) {
      queries.push(
        supabase.from('profiles').select('id, full_name, email').eq('role', 'client'),
        supabase.from('profiles').select('id, full_name, email').eq('role', 'recruiter').order('full_name'),
      )
    }

    const [jobsRes, submRes, clientsRes, recruitersRes] = await Promise.all(queries)

    setJobs(jobsRes.data ?? [])
    setClients(clientsRes?.data ?? [])
    setRecruiters(recruitersRes?.data ?? [])

    const counts = {}
    for (const s of submRes.data ?? []) {
      counts[s.job_id] = (counts[s.job_id] ?? 0) + 1
    }
    setSubmCounts(counts)
    setLoading(false)
  }

  function openCreate() { setForm(EMPTY); setError(''); setModal('create') }
  function openEdit(job) {
    setForm({
      title:           job.title ?? '',
      status:          job.status ?? 'open',
      location:        job.location ?? '',
      employment_type: job.employment_type ?? 'Full-time',
      salary_min:      job.salary_min ?? '',
      salary_max:      job.salary_max ?? '',
      currency:        job.currency ?? 'INR',
      description:     job.description ?? '',
      requirements:    job.requirements ?? '',
      client_id:       job.client_id ?? '',
      show_salary:     job.show_salary ?? false,
      skills_required: job.skills_required ?? [],
      experience_min:  job.experience_min ?? 0,
      is_public:       job.is_public ?? true,
    })
    setError('')
    setModal(job)
  }

  async function save(e) {
    e.preventDefault(); setError(''); setSaving(true)
    const isCreate = modal === 'create'
    const slug = isCreate ? makeSlug(form.title, form.location) : undefined

    const payload = {
      ...form,
      salary_min:      form.salary_min !== '' ? Number(form.salary_min) : null,
      salary_max:      form.salary_max !== '' ? Number(form.salary_max) : null,
      experience_min:  Number(form.experience_min) || 0,
      client_id:       form.client_id || null,
      updated_at:      new Date().toISOString(),
      ...(slug ? { slug } : {}),
    }

    const res = isCreate
      ? await supabase.from('jobs').insert({ ...payload, created_by: user.id })
      : await supabase.from('jobs').update(payload).eq('id', modal.id)

    if (res.error) { setError(res.error.message); setSaving(false); return }
    setModal(null); loadAll(); setSaving(false)
  }

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Jobs</h1>
          <p className="text-sm text-gray-500">
            {jobs.length} total · {jobs.filter(j => j.status === 'open').length} open
            {!isSuperRecruiter && jobs.length > 0 && ' · assigned to you'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperRecruiter && (
            <>
              <Link
                to="/jobs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Globe size={14} /> Job Board
              </Link>
              <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">
                <Plus size={16} /> New Job
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {FILTERS.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              filter === s ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {STATUS_LABELS[s] ?? 'All'}{' '}
            <span className="text-xs text-gray-400">({s === 'all' ? jobs.length : jobs.filter(j => j.status === s).length})</span>
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState onNew={isSuperRecruiter ? openCreate : null} isSuperRecruiter={isSuperRecruiter} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Job</th>
                {isSuperRecruiter && <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Client</th>}
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Location</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Type</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Pipeline</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(job => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800">{job.title}</p>
                      {isSuperRecruiter && job.is_public && job.status === 'open' && job.slug && (
                        <Link
                          to={`/jobs/${job.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View on job board"
                          onClick={e => e.stopPropagation()}
                          className="text-gray-300 hover:text-brand-500 transition-colors"
                        >
                          <Globe size={13} />
                        </Link>
                      )}
                    </div>
                    {(job.salary_min || job.salary_max) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {job.salary_min ? formatCurrency(job.salary_min, job.currency) : ''}
                        {job.salary_min && job.salary_max ? ' – ' : ''}
                        {job.salary_max ? formatCurrency(job.salary_max, job.currency) : ''}
                      </p>
                    )}
                  </td>
                  {isSuperRecruiter && (
                    <td className="px-5 py-4 text-gray-500 hidden md:table-cell">
                      {job.profiles?.full_name ?? job.profiles?.email ?? <span className="text-gray-300">—</span>}
                    </td>
                  )}
                  <td className="px-5 py-4 hidden lg:table-cell">
                    {job.location
                      ? <span className="flex items-center gap-1 text-gray-500"><MapPin size={12} />{job.location}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-gray-500">
                    {job.employment_type ?? '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[job.status] ?? job.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden xl:table-cell">
                    <span className="flex items-center gap-1 text-gray-500">
                      <Users size={12} /> {submCounts[job.id] ?? 0} candidates
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      {isSuperRecruiter && (
                        <>
                          <button
                            onClick={() => setAppPanel(job)}
                            title="Review applications"
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Inbox size={14} />
                          </button>
                          <button
                            onClick={() => setAssignJob(job)}
                            title="Assign recruiters"
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <UserPlus size={14} />
                          </button>
                          <button
                            onClick={() => openEdit(job)}
                            className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => navigate(`/pipeline?job=${job.id}`)}
                        title="Open pipeline"
                        className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {appPanel && (
        <JobApplicationsPanel job={appPanel} onClose={() => setAppPanel(null)} />
      )}

      {assignJob && (
        <AssignRecruitersModal
          job={assignJob}
          recruiters={recruiters}
          onClose={() => setAssignJob(null)}
        />
      )}

      {modal && isSuperRecruiter && (
        <Modal title={modal === 'create' ? 'New Job' : 'Edit Job'} onClose={() => setModal(null)} wide>
          {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title <span className="text-red-500">*</span></label>
                <input required value={form.title} onChange={field(setForm, 'title')} placeholder="e.g. Senior React Developer"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={field(setForm, 'status')}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="open">Open</option>
                  <option value="draft">Draft</option>
                  <option value="on_hold">On Hold</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                <select value={form.employment_type} onChange={field(setForm, 'employment_type')}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input value={form.location} onChange={field(setForm, 'location')} placeholder="Mumbai / Remote"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min. Experience (years)</label>
                <input type="number" min={0} max={30} value={form.experience_min}
                  onChange={field(setForm, 'experience_min')} placeholder="0"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select value={form.client_id} onChange={field(setForm, 'client_id')}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="">No client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Min</label>
                <input type="number" value={form.salary_min} onChange={field(setForm, 'salary_min')} placeholder="0"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Max</label>
                <input type="number" value={form.salary_max} onChange={field(setForm, 'salary_max')} placeholder="0"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills</label>
                <SkillInput
                  skills={form.skills_required}
                  onChange={skills => setForm(f => ({ ...f, skills_required: skills }))}
                />
                <p className="mt-1 text-xs text-gray-400">Press Enter or comma to add a skill</p>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={form.description} onChange={field(setForm, 'description')} placeholder="Role overview, responsibilities…"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white resize-none" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                <textarea rows={3} value={form.requirements} onChange={field(setForm, 'requirements')} placeholder="Skills, qualifications, experience…"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white resize-none" />
              </div>

              {/* Toggles */}
              <div className="col-span-2 flex flex-wrap gap-6 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.is_public}
                    onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm font-medium text-gray-700">Visible on public job board</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.show_salary}
                    onChange={e => setForm(f => ({ ...f, show_salary: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm font-medium text-gray-700">Show salary publicly</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : modal === 'create' ? 'Create Job' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Spinner() {
  return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
}

function EmptyState({ onNew, isSuperRecruiter }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
      <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
      {isSuperRecruiter ? (
        <>
          <p className="font-medium text-gray-500">No jobs yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first job posting to get started.</p>
          {onNew && (
            <button onClick={onNew} className="mt-4 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">New Job</button>
          )}
        </>
      ) : (
        <>
          <p className="font-medium text-gray-500">No assigned jobs</p>
          <p className="text-sm text-gray-400 mt-1">Your manager will assign jobs to you. Check back soon.</p>
        </>
      )}
    </div>
  )
}
