import { useEffect, useState, useMemo } from 'react'
import { Search, Briefcase, MapPin, Clock, CheckCircle2, ChevronRight, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const STATUS_BADGE = {
  open:   'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-500',
}

function timeAgo(d) {
  const days = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

export default function CandidateJobs() {
  const { user } = useAuth()

  const [jobs, setJobs]             = useState([])
  const [appliedIds, setAppliedIds] = useState(new Set())
  const [cpId, setCpId]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [applying, setApplying]     = useState(null) // job id being applied to
  const [applied, setApplied]       = useState(null) // job id just confirmed
  const [search, setSearch]         = useState('')

  useEffect(() => { if (user?.id) load() }, [user?.id])

  async function load() {
    setLoading(true)

    const [cpRes, jobsRes] = await Promise.all([
      supabase.from('candidate_profiles').select('id').eq('user_id', user.id).single(),
      supabase.from('jobs').select('*').eq('status', 'open').order('created_at', { ascending: false }),
    ])

    const id = cpRes.data?.id ?? null
    setCpId(id)

    if (id) {
      const { data: appData } = await supabase
        .from('applications')
        .select('job_id')
        .eq('candidate_profile_id', id)
      setAppliedIds(new Set((appData ?? []).map(a => a.job_id)))
    }

    setJobs(jobsRes.data ?? [])
    setLoading(false)
  }

  async function applyToJob(job) {
    if (!cpId) return
    setApplying(job.id)

    await supabase.from('applications').insert({
      candidate_profile_id: cpId,
      job_id:               job.id,
      status:               'applied',
    })

    setAppliedIds(prev => new Set([...prev, job.id]))
    setApplied(job.id)
    setTimeout(() => setApplied(null), 3000)
    setApplying(null)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return jobs
    const q = search.toLowerCase()
    return jobs.filter(j =>
      j.title?.toLowerCase().includes(q) ||
      j.location?.toLowerCase().includes(q) ||
      (j.skills_required ?? j.required_skills ?? []).some(s => s.toLowerCase().includes(q))
    )
  }, [jobs, search])

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const appliedCount = appliedIds.size

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Browse Open Roles</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {jobs.length} open position{jobs.length !== 1 ? 's' : ''}
            {appliedCount > 0 && ` · ${appliedCount} applied`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, location, or skill…"
          className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Success toast */}
      {applied && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 animate-pulse">
          <CheckCircle2 size={15} className="shrink-0" />
          Application submitted! Track it in <strong className="ml-1">My Applications</strong>.
        </div>
      )}

      {/* No profile warning */}
      {!cpId && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          Complete your profile before applying to jobs.
        </div>
      )}

      {/* Job grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Briefcase size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">
            {search ? 'No jobs match your search' : 'No open positions right now'}
          </p>
          {search && (
            <button onClick={() => setSearch('')} className="mt-3 text-sm text-brand-600 hover:underline">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(job => {
            const isApplied = appliedIds.has(job.id)
            const isApplying = applying === job.id
            const skills = job.skills_required ?? job.required_skills ?? []

            return (
              <div
                key={job.id}
                className={`bg-white rounded-xl border p-5 flex flex-col gap-3 transition-shadow hover:shadow-sm ${
                  isApplied ? 'border-emerald-200' : 'border-gray-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 leading-tight">{job.title}</p>
                    {job.employment_type && (
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">{job.employment_type}</p>
                    )}
                  </div>
                  {isApplied && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium shrink-0">
                      <CheckCircle2 size={10} /> Applied
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {job.location && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin size={11} /> {job.location}
                    </span>
                  )}
                  {job.min_experience != null && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Briefcase size={11} /> {job.min_experience}+ yrs
                    </span>
                  )}
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={11} /> {timeAgo(job.created_at)}
                  </span>
                </div>

                {/* Description */}
                {job.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{job.description}</p>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {skills.slice(0, 5).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">{s}</span>
                    ))}
                    {skills.length > 5 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">+{skills.length - 5}</span>
                    )}
                  </div>
                )}

                {/* Apply button */}
                <button
                  onClick={() => !isApplied && !isApplying && applyToJob(job)}
                  disabled={isApplied || isApplying || !cpId}
                  className={`mt-auto w-full py-2 text-sm font-medium rounded-lg transition-colors disabled:cursor-default ${
                    isApplied
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                      : 'bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50'
                  }`}
                >
                  {isApplying ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Applying…
                    </span>
                  ) : isApplied ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={14} /> Applied
                    </span>
                  ) : 'Apply Now'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
