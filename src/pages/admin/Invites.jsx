import { useState, useEffect } from 'react'
import { Send, Copy, Check, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ROLE_LABELS } from '../../lib/auth'

function inviteStatus(invite) {
  if (invite.used_at) return { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle }
  if (new Date(invite.expires_at) < new Date()) return { label: 'Expired', color: 'bg-gray-100 text-gray-500', icon: XCircle }
  return { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock }
}

export default function Invites() {
  const { user }     = useAuth()
  const [invites, setInvites]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [form, setForm]               = useState({ email: '', role: 'recruiter' })
  const [sending, setSending]         = useState(false)
  const [newLink, setNewLink]         = useState(null)
  const [copiedNew, setCopiedNew]     = useState(false)
  const [copiedRow, setCopiedRow]     = useState(null)
  const [error, setError]             = useState('')

  useEffect(() => { loadInvites() }, [])

  async function loadInvites() {
    setLoading(true)
    const { data } = await supabase
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false })
    setInvites(data ?? [])
    setLoading(false)
  }

  async function sendInvite(e) {
    e.preventDefault()
    setError('')
    setSending(true)

    const token     = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error: dbErr } = await supabase.from('invites').insert({
      token,
      email:      form.email.trim().toLowerCase(),
      role:       form.role,
      expires_at: expiresAt,
      created_by: user.id,
    })

    if (dbErr) { setError(dbErr.message); setSending(false); return }

    const link = `${window.location.origin}/accept-invite?token=${token}`
    setNewLink({ link, email: form.email, role: form.role })
    setForm({ email: '', role: 'recruiter' })
    loadInvites()
    setSending(false)
  }

  function copyNew() {
    if (!newLink) return
    navigator.clipboard.writeText(newLink.link)
    setCopiedNew(true)
    setTimeout(() => setCopiedNew(false), 2500)
  }

  function copyRow(token) {
    navigator.clipboard.writeText(`${window.location.origin}/accept-invite?token=${token}`)
    setCopiedRow(token)
    setTimeout(() => setCopiedRow(null), 2500)
  }

  const pending  = invites.filter(i => !i.used_at && new Date(i.expires_at) > new Date()).length
  const accepted = invites.filter(i => !!i.used_at).length

  return (
    <div className="space-y-6">
      {/* Send invite form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-1">Send an invite</h2>
        <p className="text-sm text-gray-500 mb-4">Generate a 7-day invite link for a recruiter or client.</p>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {newLink && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm font-medium text-emerald-800 mb-2">
              Invite created for <strong>{newLink.email}</strong> ({ROLE_LABELS[newLink.role]}) — expires in 7 days
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs text-gray-700 truncate">
                {newLink.link}
              </code>
              <button
                onClick={copyNew}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
              >
                {copiedNew ? <Check size={13} /> : <Copy size={13} />}
                {copiedNew ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="invitee@company.com"
            className="flex-1 px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
          <select
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            className="px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="recruiter">Recruiter</option>
            <option value="client">Client</option>
          </select>
          <button
            type="submit"
            disabled={sending}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 shrink-0"
          >
            {sending
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send size={15} />}
            Send invite
          </button>
        </form>
      </div>

      {/* Invite history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-gray-800">Invite history ({invites.length})</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">{pending} pending</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">{accepted} accepted</span>
            </div>
          </div>
          <button onClick={loadInvites} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invites.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No invites sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Sent</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Expires</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invites.map(invite => {
                  const s    = inviteStatus(invite)
                  const Icon = s.icon
                  return (
                    <tr key={invite.id ?? invite.token} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5 text-gray-800">{invite.email}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                          {ROLE_LABELS[invite.role] ?? invite.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                        {invite.created_at ? new Date(invite.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                        {invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                          <Icon size={11} /> {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {s.label === 'Pending' && (
                          <button
                            onClick={() => copyRow(invite.token)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                          >
                            {copiedRow === invite.token ? <Check size={11} /> : <Copy size={11} />}
                            {copiedRow === invite.token ? 'Copied' : 'Copy link'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
