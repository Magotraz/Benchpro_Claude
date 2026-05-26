import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { isBenchProEmail } from '../../lib/auth'
import { Eye, EyeOff, UserPlus, CheckCircle2 } from 'lucide-react'

export default function RegisterCandidate() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name:     '',
    email:         '',
    phone:         '',
    current_title: '',
    password:      '',
    confirm:       '',
  })
  const [showPw, setShowPw]   = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (isBenchProEmail(form.email)) {
      setError('BenchPro team accounts are managed by your admin.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: {
          role:          'candidate',
          full_name:     form.full_name.trim(),
          phone:         form.phone.trim() || null,
          current_title: form.current_title.trim() || null,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // If session exists → confirmed immediately → go to profile
    if (data.session) {
      navigate('/candidate/profile')
    } else {
      // Email confirmation required
      navigate('/verify-email', { state: { email: form.email } })
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="min-h-screen flex">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-white text-xl">B</div>
          <span className="text-white font-semibold text-xl">BenchPro</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight">Your next<br />role awaits.</h1>
          <p className="mt-4 text-indigo-300 text-lg max-w-sm">
            Build your profile once and let top companies discover you through BenchPro's recruiter network.
          </p>
          <div className="mt-8 space-y-3">
            {['Free to join — always', 'Get found by top recruiters', 'Track your applications in one place'].map(t => (
              <div key={t} className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-brand-400 shrink-0" />
                <span className="text-indigo-200 text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-indigo-400 text-sm">© {new Date().getFullYear()} BenchPro. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md py-6">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white">B</div>
            <span className="font-semibold text-gray-800 text-lg">BenchPro</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-800">Create your candidate profile</h2>
          <p className="mt-1 text-gray-500 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
          </p>

          {error && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className={labelCls}>Full name *</label>
              <input type="text" required value={form.full_name} onChange={set('full_name')}
                placeholder="Jane Doe" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Email address *</label>
              <input type="email" required value={form.email} onChange={set('email')}
                placeholder="you@example.com" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Phone</label>
                <input type="tel" value={form.phone} onChange={set('phone')}
                  placeholder="+91 98765 43210" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Current role</label>
                <input type="text" value={form.current_title} onChange={set('current_title')}
                  placeholder="e.g. Software Engineer" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Password *</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required value={form.password}
                  onChange={set('password')} placeholder="Min. 8 characters" className={inputCls} />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelCls}>Confirm password *</label>
              <input type={showPw ? 'text' : 'password'} required value={form.confirm}
                onChange={set('confirm')} placeholder="Repeat password" className={inputCls} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors disabled:opacity-60">
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><UserPlus size={16} /> Create account</>}
            </button>
          </form>

          <p className="mt-4 text-xs text-center text-gray-400">
            By registering you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
