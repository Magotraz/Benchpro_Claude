import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Eye, EyeOff, Check, ArrowRight } from 'lucide-react'

// Left-column value prop + secondary CTA, toggled between audiences.
// This controls ONLY the marketing panel — never the login credentials.
const VALUE = {
  jobseeker: {
    eyebrow: 'For jobseekers',
    heading: 'Your next role,\nminus the noise.',
    bullets: [
      'Get discovered by top companies',
      'Only verified, real roles',
      'Apply in one click',
    ],
    ctaLead: 'New here?',
    ctaText: 'Create a candidate account',
    ctaTo:   '/register',
  },
  client: {
    eyebrow: 'For companies',
    heading: 'Pre-vetted talent,\nready to start.',
    bullets: [
      'Pre-vetted talent',
      'Only the best make it',
      "Skip the shortlisting — we've done it",
    ],
    ctaLead: 'Want BenchPro for your company?',
    ctaText: 'Request access',
    ctaTo:   '/request-demo',
  },
}

export default function Login() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const from       = location.state?.from?.pathname ?? '/dashboard'
  const initError  = location.state?.error ?? ''
  const initMsg    = location.state?.message ?? ''

  const [mode, setMode]         = useState('jobseeker') // 'jobseeker' | 'client'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState(initError)
  const [message, setMessage]   = useState(initMsg)
  const [loading, setLoading]   = useState(false)

  const v = VALUE[mode]

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-brand-50 flex items-center justify-center px-4 py-10">
      {/* Gradient border wrapper */}
      <div className="w-full max-w-4xl rounded-3xl bg-gradient-to-br from-brand-200 via-indigo-100 to-purple-200 p-[1.5px] shadow-xl shadow-indigo-100/60">
        <div className="grid md:grid-cols-2 rounded-[calc(1.5rem-1.5px)] bg-white overflow-hidden">

          {/* ── Value prop (left on desktop, below the form on mobile) ── */}
          <div className="order-2 md:order-1 flex flex-col bg-gradient-to-br from-brand-800 via-brand-900 to-indigo-950 text-white p-8 sm:p-10">
            <Link to="/" className="text-lg font-bold tracking-tight text-white">
              BenchPro<span className="text-brand-300">:</span>
            </Link>

            {/* Audience toggle — controls this panel only */}
            <div className="mt-8 inline-flex self-start p-1 rounded-full bg-white/10 backdrop-blur">
              {[
                ['jobseeker', 'Jobseeker'],
                ['client',    'Client'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                    mode === key
                      ? 'bg-white text-brand-800 shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-8 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-300">{v.eyebrow}</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight whitespace-pre-line">{v.heading}</h2>

              <ul className="mt-7 space-y-3">
                {v.bullets.map(b => (
                  <li key={b} className="flex items-center gap-3 text-sm text-indigo-100">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/30 shrink-0">
                      <Check size={12} className="text-brand-200" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to={v.ctaTo}
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              <span className="text-white/60">{v.ctaLead}</span>
              <span className="font-semibold underline underline-offset-4 decoration-brand-400">{v.ctaText}</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* ── Login form (right on desktop, first on mobile) ── */}
          <div className="order-1 md:order-2 p-8 sm:p-10 flex flex-col justify-center">
            <h1 className="text-2xl font-bold text-gray-900">Log in</h1>
            <p className="mt-1 text-sm text-gray-500">Welcome back — sign in to your account</p>

            {message && (
              <div className="mt-5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                {message}
              </div>
            )}

            {error && (
              <div className="mt-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <Link to="/forgot-password" className="text-xs text-brand-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading
                  ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in…</span>
                  : 'Log in'
                }
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
