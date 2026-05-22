import { useState, useEffect } from 'react'
import { Plus, Briefcase, MapPin, Users, Edit2, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../lib/utils'
import Modal from '../components/Modal'

const STATUS_COLORS = {
  open:    'bg-emerald-100 text-emerald-700',
  draft:   'bg-gray-100 text-gray-600',
  on_hold: 'bg-amber-100 text-amber-700',
  closed:  'bg-red-100 text-red-600',
}
const STATUS_LABELS = { open: 'Open', draft: 'Draft', on_hold: 'On Hold', closed: 'Closed' }
const TYPE_LABELS   = { full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', freelance: 'Freelance' }
const FILTERS       = ['all', 'open', 'draft', 'on_hold', 'closed']

const EMPTY = {
  title: '', status: 'open', location: '', employment_type: 'full_time',
  salary_min: '', salary_max: '', currency: 'INR',
  description: '', requirements: '', client_id: '',
}

function field(form, setForm, key) {
  return (e) => setForm(f => ({ ...f, [key]: e.target.value }))
}

export default function Jobs() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [jobs, setJobs]       = useState([])
  const [clients, setClients] = useState([])
  const [submCounts, setSubmCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [jobsRes, clientsRes, submRes] = await Promise.all([
      supabase.from('jobs').select('*, profiles!client_id(full_name, email)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'client'),
      supabase.from('submissions').select('job_id'),
    ])
    setJobs(jobsRes.data ?? [])
    setClients(clientsRes.data ?? [])
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
      employment_type: job.employment_type ?? 'full_time',
      salary_min:      job.salary_min ?? '',
      salary_max:      job.salary_max ?? '',
      currency:        job.currency ?? 'INR',
      description:     job.description ?? '',
      requirements:    job.requirements ?? '',
      client_id:       job.client_id ?? '',
    })
    setError('')
    setModal(job)
  }

  async function save(e) {
    e.preventDefault(); setError(''); setSaving(true)
    const payload = {
      ...form,
      salary_min: form.salary_min !== '' ? Number(form.salary_min) : null,
      salary_max: form.salary_max !== '' ? Number(form.salary_max) : null,
      client_id:  form.client_id || null,
      updated_at: new Date().toISOString(),
    }
    const res = modal === 'create'
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
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={16} /> New Job
        </button>
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
        <EmptyState onNew={openCreate} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Job</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Client</th>
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
                    <p className="font-medium text-gray-800">{job.title}</p>
                    {(job.salary_min || job.salary_max) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {job.salary_min ? formatCurrency(job.salary_min, job.currency) : ''}
                        {job.salary_min && job.salary_max ? ' – ' : ''}
                        {job.salary_max ? formatCurrency(job.salary_max, job.currency) : ''}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-500 hidden md:table-cell">
                    {job.profiles?.full_name ?? job.profiles?.email ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    {job.location
                      ? <span className="flex items-center gap-1 text-gray-500"><MapPin size={12} />{job.location}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-gray-500">
                    {TYPE_LABELS[job.employment_type] ?? '—'}
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
                      <button
                        onClick={() => navigate(`/pipeline?job=${job.id}`)}
                        title="Open pipeline"
                        className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(job)}
                        className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'New Job' : 'Edit Job'} onClose={() => setModal(null)} wide>
          {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title <span className="text-red-500">*</span></label>
                <input required value={form.title} onChange={field(form, setForm, 'title')} placeholder="e.g. Senior React Developer"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={field(form, setForm, 'status')}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="open">Open</option>
                  <option value="draft">Draft</option>
                  <option value="on_hold">On Hold</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                <select value={form.employment_type} onChange={field(form, setForm, 'employment_type')}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input value={form.location} onChange={field(form, setForm, 'location')} placeholder="Mumbai / Remote"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select value={form.client_id} onChange={field(form, setForm, 'client_id')}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="">No client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Min</label>
                <input type="number" value={form.salary_min} onChange={field(form, setForm, 'salary_min')} placeholder="0"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Max</label>
                <input type="number" value={form.salary_max} onChange={field(form, setForm, 'salary_max')} placeholder="0"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={form.description} onChange={field(form, setForm, 'description')} placeholder="Role overview, responsibilities…"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white resize-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                <textarea rows={3} value={form.requirements} onChange={field(form, setForm, 'requirements')} placeholder="Skills, qualifications, experience…"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white resize-none" />
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

function EmptyState({ onNew }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
      <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
      <p className="font-medium text-gray-500">No jobs yet</p>
      <p className="text-sm text-gray-400 mt-1">Create your first job posting to get started.</p>
      <button onClick={onNew} className="mt-4 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">New Job</button>
    </div>
  )
}
