import { useState, useEffect, useCallback } from 'react'
import { Star, Download, Users, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

function timeAgo(d) {
  const days = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

const VERDICT_ACTIVE = {
  interested: 'bg-green-600 text-white border-green-600',
  hold:       'bg-amber-500 text-white border-amber-500',
  pass:       'bg-red-500 text-white border-red-500',
}
const VERDICT_GHOST = {
  interested: 'border-green-300 text-green-700 hover:bg-green-50',
  hold:       'border-amber-300 text-amber-700 hover:bg-amber-50',
  pass:       'border-red-300 text-red-600 hover:bg-red-50',
}

export default function ClientApplicants() {
  const { user } = useAuth()
  const [apps, setApps]       = useState([])
  const [loading, setLoading] = useState(true)
  const [verdicts, setVerdicts] = useState({}) // { appId: verdict }
  const [saving, setSaving]     = useState({}) // { appId: bool }

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Step 1: get this client's job IDs
    const { data: clientJobs } = await supabase
      .from('jobs')
      .select('id, title, employment_type, location')
      .eq('client_id', user.id)

    const jobMap = {}
    for (const j of clientJobs ?? []) jobMap[j.id] = j
    const jobIds = Object.keys(jobMap)

    if (jobIds.length === 0) { setApps([]); setLoading(false); return }

    // Step 2: get passed applications for those jobs
    const { data } = await supabase
      .from('applications')
      .select('*, candidate_profiles(*)')
      .eq('passed_to_client', true)
      .in('job_id', jobIds)
      .order('reviewed_at', { ascending: false })

    const list = (data ?? []).map(a => ({ ...a, job: jobMap[a.job_id] }))
    setApps(list)

    const vmap = {}
    for (const a of list) { if (a.client_verdict) vmap[a.id] = a.client_verdict }
    setVerdicts(vmap)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function setVerdict(appId, verdict) {
    // Optimistic update
    setVerdicts(v => ({ ...v, [appId]: verdict }))
    setSaving(s => ({ ...s, [appId]: true }))
    await supabase.from('applications').update({ client_verdict: verdict }).eq('id', appId)
    setSaving(s => ({ ...s, [appId]: false }))
  }

  async function downloadResume(resumeUrl) {
    if (!resumeUrl) return
    const { data } = await supabase.storage.from('candidate-resumes').createSignedUrl(resumeUrl, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const verdictedCount = Object.keys(verdicts).length

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Shortlisted Applicants</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {apps.length} candidate{apps.length !== 1 ? 's' : ''} shortlisted by BenchPro recruiters
          {verdictedCount > 0 && ` · ${verdictedCount} reviewed`}
        </p>
      </div>

      {apps.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No applicants yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
            Our recruiters are reviewing applications — shortlisted candidates will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map(app => {
            const cp      = app.candidate_profiles
            const verdict = verdicts[app.id]
            const isSaving = !!saving[app.id]

            return (
              <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-5">

                {/* Trust signal + verdict badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    <Star size={11} className="fill-indigo-600" />
                    Shortlisted by BenchPro recruiters
                  </span>
                  {verdict && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize
                      ${verdict === 'interested' ? 'bg-green-100 text-green-700' :
                        verdict === 'hold'       ? 'bg-amber-100 text-amber-700' :
                                                   'bg-red-100 text-red-600'}`}>
                      {verdict}
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800">{cp?.full_name ?? 'Candidate'}</p>
                    <p className="text-sm text-gray-500">{cp?.current_title ?? '—'}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
                      {cp?.experience_years != null && (
                        <span>{cp.experience_years} yrs experience</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> Applied {timeAgo(app.created_at)}
                      </span>
                    </div>

                    {/* Recruiter star score */}
                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star
                          key={n}
                          size={14}
                          className={app.recruiter_score >= n
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-200 fill-gray-100'}
                        />
                      ))}
                      <span className="text-xs text-gray-500 ml-1">{app.recruiter_score}/5</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {app.job && (
                      <p className="text-xs text-gray-400 text-right max-w-[140px] truncate">{app.job.title}</p>
                    )}
                    {cp?.resume_url && (
                      <button
                        onClick={() => downloadResume(cp.resume_url)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Download size={12} /> Download CV
                      </button>
                    )}
                  </div>
                </div>

                {/* Skills */}
                {cp?.skills?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {cp.skills.slice(0, 5).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{s}</span>
                    ))}
                    {cp.skills.length > 5 && (
                      <span className="text-xs text-gray-400">+{cp.skills.length - 5} more</span>
                    )}
                  </div>
                )}

                {/* Recruiter notes (if any) */}
                {app.recruiter_notes && (
                  <p className="mt-3 text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                    Recruiter note: "{app.recruiter_notes}"
                  </p>
                )}

                {/* Verdict buttons */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Your verdict:</p>
                  <div className="flex gap-2">
                    {[
                      { key: 'interested', label: 'Interested' },
                      { key: 'hold',       label: 'Hold' },
                      { key: 'pass',       label: 'Pass' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => !isSaving && setVerdict(app.id, key)}
                        disabled={isSaving}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-60 ${
                          verdict === key
                            ? VERDICT_ACTIVE[key]
                            : `bg-white ${VERDICT_GHOST[key]}`
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
