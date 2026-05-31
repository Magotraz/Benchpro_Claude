import { useEffect, useState } from 'react'
import { Shield, Clock, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const ACTION_COLORS = {
  created:           'bg-emerald-100 text-emerald-700',
  updated:           'bg-blue-100 text-blue-700',
  deleted:           'bg-red-100 text-red-600',
  stage_changed:     'bg-violet-100 text-violet-700',
  passed_to_client:  'bg-indigo-100 text-indigo-700',
  feedback_submitted:'bg-amber-100 text-amber-700',
}

function timeAgo(d) {
  const secs = Math.floor((Date.now() - new Date(d)) / 1000)
  if (secs < 60)   return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

export default function AuditLog() {
  const [logs, setLogs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setLogs(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const displayed = filter
    ? logs.filter(l =>
        l.user_name?.toLowerCase().includes(filter.toLowerCase()) ||
        l.entity_name?.toLowerCase().includes(filter.toLowerCase()) ||
        l.action?.toLowerCase().includes(filter.toLowerCase()) ||
        l.entity_type?.toLowerCase().includes(filter.toLowerCase())
      )
    : logs

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-gray-500 mt-0.5">Last 100 entries across all team members</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by user, action, entity…"
            className="px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white w-56"
          />
          <button
            onClick={load}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Shield size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No audit entries yet</p>
          <p className="text-sm text-gray-400 mt-1">Actions like stage changes, candidate creation, and client feedback will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Change</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                      {log.user_name ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 font-medium truncate max-w-[200px]">{log.entity_name ?? '—'}</p>
                      <p className="text-xs text-gray-400 capitalize">{log.entity_type}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {(log.old_value || log.new_value) ? (
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">
                          {log.old_value && <span className="text-red-500 line-through">{log.old_value}</span>}
                          {log.old_value && log.new_value && <span className="text-gray-400"> → </span>}
                          {log.new_value && <span className="text-emerald-600">{log.new_value}</span>}
                        </p>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={11} />
                        {timeAgo(log.created_at)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 text-center">Showing {displayed.length} of {logs.length} entries</p>
    </div>
  )
}
