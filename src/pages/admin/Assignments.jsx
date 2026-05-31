import { useState, useEffect, useMemo } from 'react'
import { Briefcase, UserX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_COLORS = {
  open:    'bg-emerald-100 text-emerald-700',
  draft:   'bg-gray-100 text-gray-500',
  on_hold: 'bg-amber-100 text-amber-700',
  closed:  'bg-red-100 text-red-600',
}
const STATUS_LABELS = { open: 'Open', draft: 'Draft', on_hold: 'On Hold', closed: 'Closed' }

const TYPE_COLORS = {
  'Full-time': 'bg-blue-100 text-blue-700',
  'Part-time': 'bg-violet-100 text-violet-700',
  'Contract':  'bg-amber-100 text-amber-700',
  'Freelance': 'bg-emerald-100 text-emerald-700',
}

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (s < 60)      return 'just now'
  if (s < 3600)    return `${Math.floor(s / 60)}m ago`
  if (s < 86400)   return `${Math.floor(s / 3600)}h ago`
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`
  return `${Math.floor(s / 2592000)}mo ago`
}

export default function Assignments() {
  const { user } = useAuth()
  const [jobs, setJobs]               = useState([])
  const [assignments, setAssignments] = useState([])
  const [recruiters, setRecruiters]   = useState([])
  const [submCounts, setSubmCounts]   = useState({})
  const [loading, setLoading]         = useState(true)
  const [removing, setRemoving]       = useState(null)
  const [filter, setFilter]           = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [jobsRes, assignRes, recRes, submRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('id, title, status, location, employment_type, client_id, created_at, profiles!client_id(full_name, email)')
        .order('created_at', { ascending: false }),
      supabase.from('job_assignments').select('job_id, recruiter_id, assigned_at'),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'recruiter').order('full_name'),
      supabase.from('submissions').select('job_id'),
    ])

    setJobs(jobsRes.data ?? [])
    setAssignments(assignRes.data ?? [])
    setRecruiters(recRes.data ?? [])

    const counts = {}
    for (const s of submRes.data ?? []) {
      counts[s.job_id] = (counts[s.job_id] ?? 0) + 1
    }
    setSubmCounts(counts)
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
    if (!recruiterId) return
    const already = assignments.some(a => a.job_id === jobId && a.recruiter_id === recruiterId)
    if (already) return
    const { data, error } = await supabase
      .from('job_assignments')
      .insert({ job_id: jobId, recruiter_id: recruiterId, assigned_by: user.id })
      .select('job_id, recruiter_id, assigned_at')
      .single()
    if (!error && data) setAssignments(prev => [...prev, data])
  }

  const recruiterMap = useMemo(
    () => Object.fromEntries(recruiters.map(r => [r.id, r])),
    [recruiters],
  )

  const enriched = useMemo(() => jobs.map(job => ({
    ...job,
    assigned: assignments
      .filter(a => a.job_id === job.id)
      .map(a => recruiterMap[a.recruiter_id])
      .filter(Boolean),
    unassigned: recruiters.filter(r =>
      !assignments.some(a => a.job_id === job.id && a.recruiter_id === r.id)
    ),
  })), [jobs, assignments, recruiters, recruiterMap])

  const totalAssigned   = enriched.filter(j => j.assigned.length > 0).length
  const totalUnassigned = enriched.filter(j => j.assigned.length === 0).length

  const FILTER_OPTS = [
    { key: 'all',        label: 'All',        count: enriched.length },
    { key: 'assigned',   label: 'Assigned',   count: totalAssigned },
    { key: 'unassigned', label: 'Unassigned', count: totalUnassigned, amber: true },
    { key: 'open',       label: 'Open only',  count: enriched.filter(j => j.status === 'open').length },
  ]

  const filtered = useMemo(() => {
    switch (filter) {
      case 'assigned':   return enriched.filter(j => j.assigned.length > 0)
      case 'unassigned': return enriched.filter(j => j.assigned.length === 0)
      case 'open':       return enriched.filter(j => j.status === 'open')
      default:           return enriched
    }
  }, [enriched, filter])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <div className="h-5 bg-gray-200 rounded w-40" />
            <div className="h-3.5 bg-gray-100 rounded w-56" />
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-7 bg-gray-100 rounded-full w-20" />)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-6 px-5 py-4 border-b border-gray-100 last:border-0">
              <div className="h-4 bg-gray-200 rounded w-40" />
              <div className="h-4 bg-gray-100 rounded w-24 hidden sm:block" />
              <div className="h-4 bg-gray-100 rounded w-20 hidden md:block" />
              <div className="h-4 bg-gray-100 rounded w-14 hidden md:block" />
              <div className="h-4 bg-gray-100 rounded w-14" />
              <div className="h-4 bg-gray-100 rounded flex-1" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Summary + filter pills */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-800">Job Assignments</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {enriched.length} job{enriched.length !== 1 ? 's' : ''} total
            {' · '}{totalAssigned} assigned
            {' · '}
            <span className={totalUnassigned > 0 ? 'text-amber-600 font-semibold' : ''}>
              {totalUnassigned} unassigned
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 shrink-0">
          {FILTER_OPTS.map(({ key, label, count, amber }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filter === key
                  ? amber ? 'bg-amber-500 text-white' : 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
              <span className={`min-w-[16px] text-center rounded-full text-[10px] font-bold px-1 ${
                filter === key ? 'bg-white/25 text-white' : 'bg-white text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {enriched.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No jobs yet</p>
          <p className="text-sm text-gray-400 mt-1">Create jobs from the Jobs page, then assign recruiters here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  {/* left-border placeholder cell in header */}
                  <th className="pl-4 pr-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Job</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Client</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Location</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Type</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned To</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Submissions</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Posted</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-400">
                      No jobs match this filter.
                    </td>
                  </tr>
                ) : filtered.map(job => {
                  const isUnassigned = job.assigned.length === 0
                  const clientName   = job.profiles?.full_name ?? job.profiles?.email ?? null

                  return (
                    <tr
                      key={job.id}
                      className={isUnassigned
                        ? 'bg-amber-50/50 hover:bg-amber-50/80'
                        : 'hover:bg-gray-50'
                      }
                    >
                      {/* Job — amber left border when unassigned
                          border-l-4 (4px) + pl-4 (16px) = 20px = same as pl-5 on assigned rows */}
                      <td className={`py-4 pr-5 ${isUnassigned ? 'pl-4 border-l-4 border-amber-400' : 'pl-5'}`}>
                        <p className="font-medium text-gray-800 leading-snug">{job.title}</p>
                        {/* Type badge shown only on mobile (column hidden below md) */}
                        {job.employment_type && (
                          <span className={`mt-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium md:hidden ${TYPE_COLORS[job.employment_type] ?? 'bg-gray-100 text-gray-500'}`}>
                            {job.employment_type}
                          </span>
                        )}
                      </td>

                      {/* Client */}
                      <td className="px-5 py-4 text-gray-500 hidden sm:table-cell max-w-[160px] truncate">
                        {clientName ?? <span className="text-gray-300">—</span>}
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4 text-gray-500 hidden md:table-cell max-w-[140px] truncate">
                        {job.location || <span className="text-gray-300">—</span>}
                      </td>

                      {/* Employment type badge */}
                      <td className="px-5 py-4 hidden md:table-cell">
                        {job.employment_type ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${TYPE_COLORS[job.employment_type] ?? 'bg-gray-100 text-gray-500'}`}>
                            {job.employment_type}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Status badge */}
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_LABELS[job.status] ?? job.status}
                        </span>
                      </td>

                      {/* Assigned To — recruiter name pills with remove button */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5 min-w-[120px]">
                          {isUnassigned ? (
                            <span className="text-xs font-medium text-amber-600">Unassigned</span>
                          ) : job.assigned.map(r => (
                            <span
                              key={r.id}
                              className="inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 bg-brand-50 border border-brand-200 rounded-full text-xs font-medium text-brand-700 whitespace-nowrap"
                            >
                              {r.full_name || r.email}
                              <button
                                onClick={() => removeAssignment(job.id, r.id)}
                                disabled={removing === `${job.id}-${r.id}`}
                                title="Remove assignment"
                                className="text-brand-400 hover:text-red-500 transition-colors disabled:opacity-40 shrink-0"
                              >
                                <UserX size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Submissions count */}
                      <td className="px-5 py-4 text-gray-500 tabular-nums hidden lg:table-cell">
                        {submCounts[job.id] ?? 0}
                      </td>

                      {/* Posted time ago */}
                      <td className="px-5 py-4 text-gray-400 whitespace-nowrap hidden lg:table-cell">
                        {timeAgo(job.created_at)}
                      </td>

                      {/* Actions — add recruiter dropdown */}
                      <td className="px-5 py-4">
                        {job.unassigned.length > 0 ? (
                          <select
                            defaultValue=""
                            onChange={e => { addAssignment(job.id, e.target.value); e.target.value = '' }}
                            className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-500 cursor-pointer hover:border-brand-300 transition-colors max-w-[130px]"
                          >
                            <option value="" disabled>+ Assign…</option>
                            {job.unassigned.map(r => (
                              <option key={r.id} value={r.id}>{r.full_name || r.email}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-gray-300 whitespace-nowrap">
                            {recruiters.length === 0 ? 'No recruiters' : 'All assigned'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
