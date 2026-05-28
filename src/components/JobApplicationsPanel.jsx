import { useState, useEffect, useCallback } from 'react'
import { X, Star, Download, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const FILTERS = ['all', 'unreviewed', 'reviewed', 'passed']
const FILTER_LABELS = {
  all:        'All',
  unreviewed: 'Unreviewed',
  reviewed:   'Reviewed',
  passed:     'Passed to Client',
}

function timeAgo(d) {
  const days = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

function StatusBadge({ app }) {
  if (app.passed_to_client)
    return <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Passed to Client</span>
  if (app.recruiter_score)
    return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Reviewed</span>
  return <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Unreviewed</span>
}

function StarWidget({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={18}
            className={`transition-colors ${(hover || value) >= n
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-200 fill-gray-100'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export default function JobApplicationsPanel({ job, onClose }) {
  const { user } = useAuth()
  const [apps, setApps]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [sort, setSort]       = useState('newest')
  const [review, setReview]   = useState({})  // { [appId]: { score, notes } }
  const [saving, setSaving]   = useState({})  // { [appId]: bool }

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('applications')
      .select('*, candidate_profiles(*)')
      .eq('job_id', job.id)
      .order('created_at', { ascending: false })
    const list = data ?? []
    setApps(list)
    const init = {}
    for (const a of list) {
      init[a.id] = { score: a.recruiter_score ?? 0, notes: a.recruiter_notes ?? '' }
    }
    setReview(init)
    setLoading(false)
  }, [job.id])

  useEffect(() => { load() }, [load])

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function setScore(appId, score) {
    setReview(r => ({ ...r, [appId]: { ...r[appId], score } }))
  }
  function setNotes(appId, notes) {
    setReview(r => ({ ...r, [appId]: { ...r[appId], notes } }))
  }

  async function saveReview(appId) {
    setSaving(s => ({ ...s, [appId]: true }))
    const { score, notes } = review[appId] ?? {}
    await supabase.from('applications').update({
      recruiter_score: score || null,
      recruiter_notes: notes || null,
      reviewed_by:     user.id,
      reviewed_at:     new Date().toISOString(),
    }).eq('id', appId)
    await load()
    setSaving(s => ({ ...s, [appId]: false }))
  }

  async function passToClient(appId) {
    setSaving(s => ({ ...s, [appId]: true }))
    const { score, notes } = review[appId] ?? {}
    await supabase.from('applications').update({
      recruiter_score:  score || null,
      recruiter_notes:  notes || null,
      reviewed_by:      user.id,
      reviewed_at:      new Date().toISOString(),
      passed_to_client: true,
    }).eq('id', appId)
    await load()
    setSaving(s => ({ ...s, [appId]: false }))
  }

  async function downloadResume(resumeUrl) {
    if (!resumeUrl) return
    const { data } = await supabase.storage.from('candidate-resumes').createSignedUrl(resumeUrl, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  // Filter + sort
  let displayed = [...apps]
  if (filter === 'unreviewed') displayed = displayed.filter(a => !a.recruiter_score && !a.passed_to_client)
  if (filter === 'reviewed')   displayed = displayed.filter(a => !!a.recruiter_score && !a.passed_to_client)
  if (filter === 'passed')     displayed = displayed.filter(a => a.passed_to_client)
  if (sort === 'highest_rated') displayed.sort((a, b) => (b.recruiter_score ?? 0) - (a.recruiter_score ?? 0))

  const counts = {
    all:        apps.length,
    unreviewed: apps.filter(a => !a.recruiter_score && !a.passed_to_client).length,
    reviewed:   apps.filter(a => !!a.recruiter_score && !a.passed_to_client).length,
    passed:     apps.filter(a => a.passed_to_client).length,
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-6 px-4 bg-black/50 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mb-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">{job.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {apps.length} application{apps.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="newest">Newest first</option>
              <option value="highest_rated">Highest rated</option>
            </select>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-6 border-b border-gray-100">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                filter === f
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {FILTER_LABELS[f]}{' '}
              <span className="text-xs text-gray-400">({counts[f]})</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium text-gray-500">No applications in this category</p>
            </div>
          ) : (
            displayed.map(app => {
              const cp      = app.candidate_profiles
              const rv      = review[app.id] ?? { score: 0, notes: '' }
              const canPass = rv.score >= 4
              const isSaving = !!saving[app.id]

              return (
                <div
                  key={app.id}
                  className={`border rounded-xl p-5 ${
                    app.passed_to_client ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                  }`}
                >
                  {/* Candidate header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-800">{cp?.full_name ?? 'Unknown'}</p>
                        <StatusBadge app={app} />
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{cp?.current_title ?? '—'}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
                        {cp?.experience_years != null && (
                          <span>{cp.experience_years} yrs exp</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> Applied {timeAgo(app.created_at)}
                        </span>
                      </div>
                    </div>
                    {cp?.resume_url && (
                      <button
                        onClick={() => downloadResume(cp.resume_url)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors shrink-0"
                      >
                        <Download size={12} /> Resume
                      </button>
                    )}
                  </div>

                  {/* Skills */}
                  {cp?.skills?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {cp.skills.slice(0, 6).map(s => (
                        <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">{s}</span>
                      ))}
                      {cp.skills.length > 6 && (
                        <span className="text-xs text-gray-400">+{cp.skills.length - 6}</span>
                      )}
                    </div>
                  )}

                  {/* Cover note */}
                  {app.cover_note && (
                    <p className="mt-3 text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                      "{app.cover_note}"
                    </p>
                  )}

                  {/* Review controls (not shown if already passed) */}
                  {!app.passed_to_client ? (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 shrink-0">Rating:</span>
                        <StarWidget value={rv.score} onChange={score => setScore(app.id, score)} />
                        {rv.score > 0 && (
                          <span className="text-sm font-semibold text-gray-700">{rv.score}/5</span>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        value={rv.notes}
                        onChange={e => setNotes(app.id, e.target.value)}
                        placeholder="Add review notes (optional)…"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none bg-white"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => saveReview(app.id)}
                          disabled={isSaving}
                          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-60"
                        >
                          {isSaving ? 'Saving…' : 'Save review'}
                        </button>

                        {/* Pass to client — tooltip when disabled */}
                        <div className="relative group">
                          <button
                            onClick={() => !isSaving && canPass && passToClient(app.id)}
                            disabled={!canPass || isSaving}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                              canPass
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <CheckCircle size={14} /> Pass to client
                          </button>
                          {!canPass && (
                            <div className="pointer-events-none absolute bottom-full mb-1.5 right-0 bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              Rate 4★ or above to pass to client
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle size={14} />
                      Passed to client
                      {app.recruiter_score > 0 && (
                        <span className="font-medium">· {app.recruiter_score}★</span>
                      )}
                      {app.recruiter_notes && (
                        <span className="text-gray-400 truncate">· "{app.recruiter_notes}"</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
