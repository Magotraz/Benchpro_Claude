import { useEffect, useState } from 'react'
import { ClipboardList, Briefcase, Clock, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const STATUS_CONFIG = {
  applied:     { label: 'Applied',     color: 'bg-blue-100 text-blue-700' },
  reviewing:   { label: 'Reviewing',   color: 'bg-amber-100 text-amber-700' },
  shortlisted: { label: 'Shortlisted', color: 'bg-emerald-100 text-emerald-700' },
  rejected:    { label: 'Rejected',    color: 'bg-red-100 text-red-600' },
}

function timeAgo(d) {
  const days = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

export default function CandidateApplications() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [apps, setApps]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  useEffect(() => { if (user?.id) load() }, [user?.id])

  async function load() {
    setLoading(true)

    const { data: cpData } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!cpData?.id) { setLoading(false); return }

    const { data } = await supabase
      .from('applications')
      .select('id, status, cover_note, created_at, jobs(id, title, location, employment_type, status)')
      .eq('candidate_profile_id', cpData.id)
      .order('created_at', { ascending: false })

    setApps(data ?? [])
    setLoading(false)
  }

  const FILTERS = [
    { value: 'all',         label: 'All' },
    { value: 'applied',     label: 'Applied' },
    { value: 'reviewing',   label: 'Reviewing' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'rejected',    label: 'Rejected' },
  ]

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter)

  // Status counts for filter tabs
  const counts = apps.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1; return acc
  }, {})

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">My Applications</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {apps.length} total application{apps.length !== 1 ? 's' : ''}
        </p>
      </div>

      {apps.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <ClipboardList size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No applications yet</p>
          <p className="text-sm text-gray-400 mt-1">Browse open jobs and submit your first application.</p>
          <button
            onClick={() => navigate('/candidate/jobs')}
            className="mt-4 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Browse Jobs
          </button>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(f => {
              const count = f.value === 'all' ? apps.length : (counts[f.value] ?? 0)
              if (f.value !== 'all' && !count) return null
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    filter === f.value
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {f.label} {count > 0 && <span className="ml-1 opacity-75">({count})</span>}
                </button>
              )
            })}
          </div>

          {/* Applications list */}
          <div className="space-y-3">
            {filtered.map(app => {
              const job    = app.jobs
              const cfg    = STATUS_CONFIG[app.status] ?? { label: app.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                          <Briefcase size={18} className="text-brand-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{job?.title ?? 'Unknown Job'}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            {job?.location && (
                              <span className="text-xs text-gray-400">{job.location}</span>
                            )}
                            {job?.employment_type && (
                              <span className="text-xs text-gray-400 capitalize">· {job.employment_type}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> {timeAgo(app.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Cover note preview */}
                  {app.cover_note && (
                    <p className="mt-3 text-xs text-gray-500 italic border-t border-gray-100 pt-3 line-clamp-2">
                      "{app.cover_note}"
                    </p>
                  )}

                  {/* Status explanation */}
                  {app.status === 'shortlisted' && (
                    <div className="mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                      Congratulations! Your application has been shortlisted. The recruiter will reach out soon.
                    </div>
                  )}
                  {app.status === 'rejected' && (
                    <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                      This application was not selected for this role. Keep applying — the right opportunity is out there!
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-10">
              <p className="text-sm text-gray-400">No applications in this status.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
