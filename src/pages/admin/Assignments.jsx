import { useState, useEffect } from 'react'
import { Users, Briefcase, MapPin, UserX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_COLORS = {
  open:    'bg-emerald-100 text-emerald-700',
  draft:   'bg-gray-100 text-gray-500',
  on_hold: 'bg-amber-100 text-amber-700',
  closed:  'bg-red-100 text-red-600',
}
const STATUS_LABELS = { open: 'Open', draft: 'Draft', on_hold: 'On Hold', closed: 'Closed' }

export default function Assignments() {
  const { user } = useAuth()
  const [jobs, setJobs]           = useState([])
  const [assignments, setAssignments] = useState([])
  const [recruiters, setRecruiters]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [removing, setRemoving]   = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [jobsRes, assignRes, recRes] = await Promise.all([
      supabase.from('jobs').select('id, title, status, location').order('created_at', { ascending: false }),
      supabase.from('job_assignments').select('job_id, recruiter_id, assigned_at'),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'recruiter').order('full_name'),
    ])
    setJobs(jobsRes.data ?? [])
    setAssignments(assignRes.data ?? [])
    setRecruiters(recRes.data ?? [])
    setLoading(false)
  }

  async function removeAssignment(jobId, recruiterId) {
    const key = `${jobId}-${recruiterId}`
    setRemoving(key)
    await supabase.from('job_assignments').delete().eq('job_id', jobId).eq('recruiter_id', recruiterId)
    setAssignments(prev => prev.filter(a => !(a.job_id === jobId && a.recruiter_id === recruiterId)))
    setRemoving(null)
  }

  async function addAssignment(jobId, recruiterId) {
    const already = assignments.some(a => a.job_id === jobId && a.recruiter_id === recruiterId)
    if (already) return
    const { data, error } = await supabase
      .from('job_assignments')
      .insert({ job_id: jobId, recruiter_id: recruiterId, assigned_by: user.id })
      .select('job_id, recruiter_id, assigned_at')
      .single()
    if (!error && data) setAssignments(prev => [...prev, data])
  }

  const recruiterMap = Object.fromEntries(recruiters.map(r => [r.id, r]))

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-20" />
        ))}
      </div>
    )
  }

  const jobsWithAssignments = jobs.map(job => ({
    ...job,
    assigned: assignments.filter(a => a.job_id === job.id).map(a => recruiterMap[a.recruiter_id]).filter(Boolean),
    unassigned: recruiters.filter(r => !assignments.some(a => a.job_id === job.id && a.recruiter_id === r.id)),
  }))

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-gray-800">Job Assignments</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} across {jobs.length} job{jobs.length !== 1 ? 's' : ''}
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No jobs yet</p>
          <p className="text-sm text-gray-400 mt-1">Create jobs from the Jobs page to assign recruiters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobsWithAssignments.map(job => (
            <div key={job.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Job header */}
              <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-800">{job.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[job.status] ?? job.status}
                    </span>
                  </div>
                  {job.location && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {job.location}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                  <Users size={13} />
                  <span>{job.assigned.length} assigned</span>
                </div>
              </div>

              {/* Assigned recruiters */}
              <div className="px-5 py-4">
                {job.assigned.length === 0 ? (
                  <p className="text-sm text-gray-400 mb-3">No recruiters assigned to this job.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {job.assigned.map(r => (
                      <div key={r.id} className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 bg-brand-50 border border-brand-200 rounded-full">
                        <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0">
                          {(r.full_name || r.email || '?')[0]}
                        </div>
                        <span className="text-xs font-medium text-brand-700 max-w-[120px] truncate">
                          {r.full_name || r.email}
                        </span>
                        <button
                          onClick={() => removeAssignment(job.id, r.id)}
                          disabled={removing === `${job.id}-${r.id}`}
                          title="Remove assignment"
                          className="text-brand-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        >
                          <UserX size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add recruiter dropdown */}
                {job.unassigned.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      defaultValue=""
                      onChange={e => { if (e.target.value) { addAssignment(job.id, e.target.value); e.target.value = '' } }}
                      className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-600"
                    >
                      <option value="" disabled>+ Add recruiter…</option>
                      {job.unassigned.map(r => (
                        <option key={r.id} value={r.id}>{r.full_name || r.email}</option>
                      ))}
                    </select>
                  </div>
                )}

                {recruiters.length === 0 && (
                  <p className="text-xs text-gray-400">No recruiters on the platform yet. Invite them from the Invites tab.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
