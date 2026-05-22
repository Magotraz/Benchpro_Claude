import { useEffect, useState } from 'react'
import { UserCheck, UserX, ShieldCheck, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ROLE_LABELS } from '../../lib/auth'

function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function Recruiters() {
  const [recruiters, setRecruiters] = useState([])
  const [loading, setLoading]       = useState(true)
  const [toggling, setToggling]     = useState(null)
  const [error, setError]           = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['recruiter', 'super_recruiter'])
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    setRecruiters(data ?? [])
    setLoading(false)
  }

  async function toggleActive(r) {
    setToggling(r.id)
    const { error: err } = await supabase
      .from('profiles')
      .update({ is_active: !r.is_active })
      .eq('id', r.id)
    if (!err) {
      setRecruiters(prev => prev.map(p => p.id === r.id ? { ...p, is_active: !p.is_active } : p))
    }
    setToggling(null)
  }

  if (loading) return <Spinner />

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Recruiters ({recruiters.length})</h2>
        <button
          onClick={load}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {error && (
        <div className="m-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {recruiters.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No recruiters yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recruiters.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {initials(r.full_name)}
                      </div>
                      <span className="font-medium text-gray-800">{r.full_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{r.email || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.role === 'super_recruiter'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {r.role === 'super_recruiter' && <ShieldCheck size={11} />}
                      {ROLE_LABELS[r.role] ?? r.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {r.is_active ? <UserCheck size={11} /> : <UserX size={11} />}
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {r.role !== 'super_recruiter' && (
                      <button
                        onClick={() => toggleActive(r)}
                        disabled={toggling === r.id}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                          r.is_active
                            ? 'bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-600'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {toggling === r.id
                          ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : r.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
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

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
