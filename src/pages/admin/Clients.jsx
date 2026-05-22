import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, Copy, Check, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function Clients() {
  const { user }       = useAuth()
  const [requests, setRequests]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [processing, setProcessing] = useState(null)
  const [inviteLinks, setInviteLinks] = useState({})
  const [copiedId, setCopiedId]   = useState(null)
  const [error, setError]         = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('demo_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    setRequests(data ?? [])
    setLoading(false)
  }

  async function approve(req) {
    setProcessing(req.id)
    const now = new Date().toISOString()

    const { error: updateErr } = await supabase
      .from('demo_requests')
      .update({ status: 'approved', reviewed_at: now, reviewed_by: user.id })
      .eq('id', req.id)

    if (updateErr) { setError(updateErr.message); setProcessing(null); return }

    const token     = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { error: inviteErr } = await supabase.from('invites').insert({
      token,
      email:      req.email,
      role:       'client',
      expires_at: expiresAt,
      created_by: user.id,
    })

    if (inviteErr) { setError(inviteErr.message); setProcessing(null); return }

    const link = `${window.location.origin}/accept-invite?token=${token}`
    setInviteLinks(prev => ({ ...prev, [req.id]: link }))
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r))
    setProcessing(null)
  }

  async function reject(req) {
    setProcessing(req.id)
    const { error: err } = await supabase
      .from('demo_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq('id', req.id)
    if (err) setError(err.message)
    else setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r))
    setProcessing(null)
  }

  function copyLink(id, link) {
    navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const pending  = requests.filter(r => !r.status || r.status === 'pending')
  const reviewed = requests.filter(r => r.status && r.status !== 'pending')

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Pending requests */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-amber-500" />
            <h2 className="font-semibold text-gray-800">Pending Demo Requests ({pending.length})</h2>
          </div>
          <button onClick={load} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>

        {pending.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No pending requests.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {pending.map(req => (
              <div key={req.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium text-gray-800">{req.contact_name}</p>
                      <span className="text-xs text-gray-400">at</span>
                      <p className="font-semibold text-brand-700">{req.company_name}</p>
                      {req.company_size && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500">
                          {req.company_size} employees
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{req.email}</p>
                    {req.phone && <p className="text-xs text-gray-400 mt-0.5">{req.phone}</p>}
                    {req.message && (
                      <p className="text-sm text-gray-600 mt-1.5 italic line-clamp-2">"{req.message}"</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">
                      Submitted {req.created_at ? new Date(req.created_at).toLocaleString() : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {inviteLinks[req.id] ? (
                      <button
                        onClick={() => copyLink(req.id, inviteLinks[req.id])}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        {copiedId === req.id ? <Check size={13} /> : <Copy size={13} />}
                        {copiedId === req.id ? 'Copied!' : 'Copy invite link'}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => reject(req)}
                          disabled={processing === req.id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                        <button
                          onClick={() => approve(req)}
                          disabled={processing === req.id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          {processing === req.id
                            ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <CheckCircle size={13} />}
                          Approve &amp; invite
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviewed requests */}
      {reviewed.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Reviewed Requests ({reviewed.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Company</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Decision</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Reviewed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviewed.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 font-medium text-gray-800">{req.contact_name}</td>
                    <td className="px-5 py-3.5 text-gray-600">{req.company_name}</td>
                    <td className="px-5 py-3.5 text-gray-500">{req.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {req.status === 'approved'
                          ? <CheckCircle size={11} />
                          : <XCircle size={11} />}
                        {req.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                      {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
