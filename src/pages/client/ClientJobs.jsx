import { useEffect, useState } from 'react'
import { Briefcase, MapPin, Users, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const STATUS_COLORS = {
  open:    'bg-emerald-100 text-emerald-700',
  draft:   'bg-gray-100 text-gray-500',
  on_hold: 'bg-amber-100 text-amber-700',
  closed:  'bg-red-100 text-red-600',
}
const STATUS_LABELS = { open: 'Open', draft: 'Draft', on_hold: 'On Hold', closed: 'Closed' }
const TYPE_LABELS   = { full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', freelance: 'Freelance' }

export default function ClientJobs() {
  const navigate = useNavigate()
  const [jobs, setJobs]           = useState([])
  const [submCounts, setSubmCounts] = useState({})
  const [stageSummary, setStageSummary] = useState({})
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      const [jobsRes, submRes] = await Promise.all([
        supabase.from('jobs').select('*').order('created_at', { ascending: false }),
        supabase.from('submissions').select('job_id, stage'),
      ])

      const subs = submRes.data ?? []
      const counts = {}
      const summary = {}

      for (const s of subs) {
        counts[s.job_id] = (counts[s.job_id] ?? 0) + 1
        if (!summary[s.job_id]) summary[s.job_id] = {}
        summary[s.job_id][s.stage] = (summary[s.job_id][s.stage] ?? 0) + 1
      }

      setJobs(jobsRes.data ?? [])
      setSubmCounts(counts)
      setStageSummary(summary)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Your Jobs</h1>
        <p className="text-sm text-gray-500">{jobs.length} position{jobs.length !== 1 ? 's' : ''} assigned to your account</p>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No jobs assigned yet</p>
          <p className="text-sm text-gray-400 mt-1">Your BenchPro recruiter will add jobs here as they begin hiring for you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => {
            const count   = submCounts[job.id] ?? 0
            const summary = stageSummary[job.id] ?? {}
            const active  = (summary.screening ?? 0) + (summary.interview ?? 0) + (summary.offer ?? 0)

            return (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">{job.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[job.status] ?? job.status}
                      </span>
                      {job.employment_type && (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">
                          {TYPE_LABELS[job.employment_type] ?? job.employment_type}
                        </span>
                      )}
                    </div>

                    {job.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin size={12} /> {job.location}
                      </p>
                    )}

                    {job.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{job.description}</p>
                    )}

                    {/* Pipeline mini-summary */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Users size={12} /> {count} candidate{count !== 1 ? 's' : ''}
                      </span>
                      {summary.screening > 0  && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{summary.screening} screening</span>}
                      {summary.interview > 0  && <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full">{summary.interview} interview</span>}
                      {summary.offer > 0      && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{summary.offer} offer</span>}
                      {summary.placed > 0     && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">{summary.placed} placed</span>}
                    </div>
                  </div>

                  {count > 0 && (
                    <button
                      onClick={() => navigate(`/submissions?job=${job.id}`)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors shrink-0"
                    >
                      <ExternalLink size={13} /> View candidates
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
