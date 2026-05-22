import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, Filter, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'

const STAGE_COLORS = {
  sourced:   'bg-gray-100 text-gray-600',
  screening: 'bg-blue-100 text-blue-700',
  interview: 'bg-violet-100 text-violet-700',
  offer:     'bg-amber-100 text-amber-700',
  placed:    'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-600',
}
const STAGE_LABELS = {
  sourced: 'Sourced', screening: 'Screening', interview: 'Interview',
  offer: 'Offer', placed: 'Placed', rejected: 'Rejected',
}

export default function Submissions() {
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading]         = useState(true)
  const [stageFilter, setStageFilter] = useState('all')
  const [jobFilter, setJobFilter]     = useState('')
  const [jobs, setJobs]               = useState([])

  useEffect(() => {
    supabase.from('jobs').select('id, title').order('title').then(({ data }) => setJobs(data ?? []))
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('submissions')
      .select('*, candidates(full_name, current_title, current_company), jobs(id, title)')
      .order('updated_at', { ascending: false })
    setSubmissions(data ?? [])
    setLoading(false)
  }

  const filtered = submissions.filter(s => {
    if (stageFilter !== 'all' && s.stage !== stageFilter) return false
    if (jobFilter && s.job_id !== jobFilter) return false
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Submissions</h1>
          <p className="text-sm text-gray-500">{submissions.length} total</p>
        </div>
        <button
          onClick={() => navigate('/pipeline')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <LayoutGrid size={15} /> Open Pipeline
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-gray-500"><Filter size={14} /> Filters:</span>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="all">All stages</option>
          {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={jobFilter} onChange={e => setJobFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white min-w-[180px]">
          <option value="">All jobs</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        {(stageFilter !== 'all' || jobFilter) && (
          <button onClick={() => { setStageFilter('all'); setJobFilter('') }} className="text-xs text-brand-600 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-14">
          <LayoutGrid size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No submissions found</p>
          <p className="text-sm text-gray-400 mt-1">Use the Pipeline to add candidates to jobs.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Candidate</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Job</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Stage</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Updated</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-800">{sub.candidates?.full_name ?? '—'}</p>
                    {sub.candidates?.current_title && (
                      <p className="text-xs text-gray-400">{sub.candidates.current_title}{sub.candidates.current_company ? ` · ${sub.candidates.current_company}` : ''}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">{sub.jobs?.title ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[sub.stage] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STAGE_LABELS[sub.stage] ?? sub.stage}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs hidden lg:table-cell whitespace-nowrap">
                    {sub.updated_at ? new Date(sub.updated_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => navigate(`/pipeline?job=${sub.job_id}`)}
                      className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title="Open in pipeline"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
