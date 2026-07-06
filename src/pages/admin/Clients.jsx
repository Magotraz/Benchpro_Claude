import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, Copy, Check, RefreshCw, Building2, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function Clients() {
  const { user }       = useAuth()
  const [requests, setRequests]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [processing, setProcessing] = useState(null)
  const [inviteLinks, setInviteLinks] = useState({})
  const [copiedId, setCopiedId]   = useState(null)
  const [showRejected, setShowRejected] = useState(false)
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
      invited_by: user.id,
    })

    if (inviteErr) { setError(inviteErr.message); setProcessing(null); return }

    const link = `${window.location.origin}/accept-invite?token=${token}`
    setInviteLinks(prev => ({ ...prev, [req.id]: link }))
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved', reviewed_at: now } : r))
    setProcessing(null)
  }

  async function reject(req) {
    setProcessing(req.id)
    const now = new Date().toISOString()
    const { error: err } = await supabase
      .from('demo_requests')
      .update({ status: 'rejected', reviewed_at: now, reviewed_by: user.id })
      .eq('id', req.id)
    if (err) setError(err.message)
    else setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected', reviewed_at: now } : r))
    setProcessing(null)
  }

  function copyLink(id, link) {
    navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const pending   = requests.filter(r => !r.status || r.status === 'new' || r.status === 'pending')
  const onboarded = requests.filter(r => r.status === 'approved')
  const rejected  = requests.filter(r => r.status === 'rejected')

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* ── Section A: Pending Requests ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-amber-500" />
            <h2 className="font-semibold text-gray-800">Pending Requests ({pending.length})</h2>
            {pending.length > 0 && <GlowDot />}
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
                      {req.designation && <span className="text-xs text-gray-500">· {req.designation}</span>}
                      <span className="text-xs text-gray-400">at</span>
                      <p className="font-semibold text-brand-700">{req.company_name}</p>
                      {req.company_size && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500">
                          {req.company_size} employees
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{req.email}</p>
                    {(req.phone || req.country) && (
                      <p className="text-sm text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                        {req.phone && <span>{[req.dial_code, req.phone].filter(Boolean).join(' ')}</span>}
                        {req.phone && req.country && <span className="text-gray-300">·</span>}
                        {req.country && <span>{req.country}</span>}
                      </p>
                    )}
                    {(req.hiring_needs || req.message) && (
                      <p className="text-sm text-gray-600 mt-1.5 italic line-clamp-2">"{req.hiring_needs || req.message}"</p>
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

      {/* ── Section B: Onboarded Clients ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Building2 size={15} className="text-emerald-500" />
          <h2 className="font-semibold text-gray-800">Onboarded Clients ({onboarded.length})</h2>
        </div>

        {onboarded.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No onboarded clients yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Company</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Size</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Approved</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {onboarded.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 font-semibold text-gray-800">{req.company_name}</td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {req.contact_name}
                      {req.designation && <span className="text-gray-400"> · {req.designation}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{req.email}</td>
                    <td className="px-5 py-3.5 text-gray-500">{req.company_size || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                      {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {inviteLinks[req.id] && (
                        <button
                          onClick={() => copyLink(req.id, inviteLinks[req.id])}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                        >
                          {copiedId === req.id ? <Check size={12} /> : <Copy size={12} />}
                          {copiedId === req.id ? 'Copied!' : 'Invite link'}
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

      {/* ── Rejected (collapsed) ── */}
      {rejected.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowRejected(s => !s)}
            className="w-full px-5 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <XCircle size={15} className="text-gray-400" />
              <h2 className="font-semibold text-gray-700">Rejected Requests ({rejected.length})</h2>
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${showRejected ? 'rotate-180' : ''}`} />
          </button>

          {showRejected && (
            <div className="divide-y divide-gray-100 border-t border-gray-100">
              {rejected.map(req => (
                <div key={req.id} className="px-5 py-3 flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="font-medium text-gray-700">{req.contact_name}</span>
                  <span className="text-gray-400">at</span>
                  <span className="text-gray-600">{req.company_name}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">{req.email}</span>
                  <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
                    {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GlowDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
    </span>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
