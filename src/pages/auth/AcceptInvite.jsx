import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ROLE_LABELS } from '../../lib/auth'
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const navigate        = useNavigate()
  const token           = searchParams.get('token') ?? ''

  const [invite, setInvite]   = useState(null)
  const [status, setStatus]   = useState('loading') // loading | valid | invalid | expired | used
  const [form, setForm]       = useState({ full_name: '', password: '', confirm: '' })
  const [showPw, setShowPw]   = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }

    supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) { setStatus('invalid'); return }
        if (data.used_at)  { setStatus('used');    return }
        if (new Date(data.expires_at) < new Date()) { setStatus('expired'); return }
        setInvite(data)
        setStatus('valid')
      })
  }, [token])

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (form.password.length < 8)       { setError('Password must be at least 8 characters.'); return }

    setLoading(true)

    const { error: authError } = await supabase.auth.signUp({
      email:    invite.email,
      password: form.password,
      options: {
        data: {
          role:         invite.role,
          full_name:    form.full_name,
          company_id:   invite.company_id,
          company_role: invite.company_role,
        },
      },
    })

    if (authError) { setError(authError.message); setLoading(false); return }

    // Mark invite as used
    await supabase.from('invites').update({ used_at: new Date().toISOString() }).eq('token', token)

    navigate('/verify-email', { state: { email: invite.email } })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status !== 'valid') {
    const msgs = {
      invalid: { icon: XCircle,     color: 'text-red-500',    title: 'Invalid invite link',    body: 'This invite link is not valid. Please contact your administrator.' },
      expired: { icon: XCircle,     color: 'text-amber-500',  title: 'Invite link expired',    body: 'This invite link has expired (7-day limit). Please ask for a new one.' },
      used:    { icon: CheckCircle, color: 'text-emerald-500', title: 'Already accepted',       body: 'This invite has already been used. Try signing in instead.' },
    }
    const m = msgs[status]
    const Icon = m.icon
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-sm w-full text-center">
          <Icon size={48} className={`mx-auto mb-4 ${m.color}`} />
          <h2 className="text-lg font-semibold text-gray-800">{m.title}</h2>
          <p className="mt-2 text-sm text-gray-500">{m.body}</p>
          <Link to="/login" className="mt-6 inline-block text-sm text-brand-600 hover:underline">Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-white text-xl">B</div>
          <span className="text-white font-semibold text-xl">BenchPro</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight">You've been<br />invited.</h1>
          <p className="mt-4 text-indigo-300 text-lg max-w-sm">
            Set up your {ROLE_LABELS[invite.role]} account to get started on the BenchPro platform.
          </p>
        </div>
        <p className="text-indigo-400 text-sm">© {new Date().getFullYear()} BenchPro.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white">B</div>
            <span className="font-semibold text-gray-800 text-lg">BenchPro</span>
          </div>

          <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-medium">
            {ROLE_LABELS[invite.role]} invite
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Complete your registration</h2>

          <div className="mt-4 px-4 py-3 bg-gray-100 rounded-lg text-sm text-gray-600">
            Registering as: <span className="font-semibold text-gray-800">{invite.email}</span>
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                type="text" required value={form.full_name} onChange={set('full_name')}
                placeholder="Your name"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required value={form.password} onChange={set('password')}
                  placeholder="Min. 8 characters"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                type={showPw ? 'text' : 'password'} required value={form.confirm} onChange={set('confirm')}
                placeholder="Repeat password"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Create account & join BenchPro'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
