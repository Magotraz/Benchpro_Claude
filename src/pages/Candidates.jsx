import { useState, useEffect } from 'react'
import { Plus, Mail, Phone, MapPin, Briefcase, Search, Edit2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'

const EMPTY = {
  full_name: '', email: '', phone: '', current_title: '',
  current_company: '', location: '', experience_years: '',
  skills: '', linkedin_url: '',
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function skillsToArray(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean)
}

const BG_COLORS = [
  'bg-brand-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500',
]
function avatarColor(id) { return BG_COLORS[(id?.charCodeAt(0) ?? 0) % BG_COLORS.length] }

export default function Candidates() {
  const { user } = useAuth()
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [modal, setModal]           = useState(null)
  const [form, setForm]             = useState(EMPTY)
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

  function openCreate() { setForm(EMPTY); setError(''); setModal('create') }
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
    setError(''); setModal(c)
  }

  async function save(e) {
    e.preventDefault(); setError(''); setSaving(true)
    const payload = {
      ...form,
      skills:           skillsToArray(form.skills),
      experience_years: form.experience_years !== '' ? Number(form.experience_years) : null,
      updated_at:       new Date().toISOString(),
    }
    const res = modal === 'create'
      ? await supabase.from('candidates').insert({ ...payload, created_by: user.id })
      : await supabase.from('candidates').update(payload).eq('id', modal.id)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setModal(null); load(); setSaving(false)
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Candidates</h1>
          <p className="text-sm text-gray-500">{candidates.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, skills…"
              className="pl-9 pr-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white w-52"
            />
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0">
            <Plus size={16} /> Add Candidate
          </button>
        </div>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">{search ? 'No results found' : 'No candidates yet'}</p>
          {!search && <button onClick={openCreate} className="mt-4 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">Add Candidate</button>}
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
                <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors shrink-0">
                  <Edit2 size={13} />
                </button>
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
                <input required value={form.full_name} onChange={f('full_name')} placeholder="Jane Doe"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={f('email')} placeholder="jane@example.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone} onChange={f('phone')} placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Title</label>
                <input value={form.current_title} onChange={f('current_title')} placeholder="Senior Engineer"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label>
                <input value={form.current_company} onChange={f('current_company')} placeholder="Acme Corp"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input value={form.location} onChange={f('location')} placeholder="Mumbai"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                <input type="number" min="0" step="0.5" value={form.experience_years} onChange={f('experience_years')} placeholder="5"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Skills <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                <input value={form.skills} onChange={f('skills')} placeholder="React, TypeScript, Node.js, AWS"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                <input type="url" value={form.linkedin_url} onChange={f('linkedin_url')} placeholder="https://linkedin.com/in/…"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
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

function Spinner() {
  return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
}
