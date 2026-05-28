import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, Briefcase, Clock, ChevronRight, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import PublicNav from '../../components/PublicNav'
import CtaBanner from '../../components/CtaBanner'

const TYPE_COLORS = {
  'Full-time': 'bg-blue-100 text-blue-700',
  'Part-time':  'bg-violet-100 text-violet-700',
  'Contract':   'bg-amber-100 text-amber-700',
  'Freelance':  'bg-emerald-100 text-emerald-700',
}

function formatLPA(val) {
  if (!val) return null
  const l = val / 100000
  return `₹${Number.isInteger(l) ? l : l.toFixed(1)}L`
}

export default function JobBoard() {
  const [jobs, setJobs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('jobs')
      .select('id, title, location, employment_type, salary_min, salary_max, show_salary, skills_required, experience_min, description, slug, created_at')
      .eq('status', 'open')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
    setJobs(data ?? [])
    setLoading(false)
  }

  const types = [...new Set(jobs.map(j => j.employment_type).filter(Boolean))]

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase()
    const matchQ = !q ||
      j.title.toLowerCase().includes(q) ||
      (j.location ?? '').toLowerCase().includes(q) ||
      (j.skills_required ?? []).some(s => s.toLowerCase().includes(q))
    const matchType = !typeFilter || j.employment_type === typeFilter
    return matchQ && matchType
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <PublicNav />

      {/* Hero */}
      <div className="bg-brand-900 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Find Your Next Role</h1>
          <p className="mt-3 text-indigo-300 text-lg">Curated opportunities from our network of clients</p>
          <div className="mt-8 max-w-xl mx-auto relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Job title, skill, or location…"
              className="w-full pl-10 pr-10 py-3 text-sm text-gray-800 bg-white rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Type filters */}
        {types.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setTypeFilter('')}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                !typeFilter ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'
              }`}
            >
              All types
            </button>
            {types.map(t => (
              <button key={t} onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  typeFilter === t ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Briefcase size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium text-gray-500">No jobs found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              {filtered.length} {filtered.length === 1 ? 'job' : 'jobs'} found
            </p>
            {filtered.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </div>

      <CtaBanner />
    </div>
  )
}

function JobCard({ job }) {
  const salaryLine = job.show_salary && (job.salary_min || job.salary_max)
    ? [formatLPA(job.salary_min), formatLPA(job.salary_max)].filter(Boolean).join(' – ')
    : null

  const daysAgo = Math.floor((Date.now() - new Date(job.created_at)) / 86400000)
  const posted  = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`

  return (
    <Link
      to={`/jobs/${job.slug ?? job.id}`}
      className="block bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all group p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-gray-800 group-hover:text-brand-700 transition-colors">{job.title}</h2>
            {job.employment_type && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[job.employment_type] ?? 'bg-gray-100 text-gray-600'}`}>
                {job.employment_type}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="font-medium text-gray-600">Confidential Client</span>
            {job.location && (
              <span className="flex items-center gap-1"><MapPin size={12} />{job.location}</span>
            )}
            {salaryLine && (
              <span className="text-emerald-600 font-semibold">{salaryLine} / yr</span>
            )}
            {job.experience_min > 0 && (
              <span>{job.experience_min}+ yrs exp</span>
            )}
          </div>

          {job.skills_required?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.skills_required.slice(0, 5).map(s => (
                <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{s}</span>
              ))}
              {job.skills_required.length > 5 && (
                <span className="text-xs text-gray-400">+{job.skills_required.length - 5} more</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock size={11} />{posted}
          </span>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
        </div>
      </div>
    </Link>
  )
}
