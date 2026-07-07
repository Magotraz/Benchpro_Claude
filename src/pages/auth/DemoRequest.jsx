import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { isBenchProEmail, isFreeEmail } from '../../lib/auth'
import { COUNTRIES } from '../../lib/countries'
import { CheckCircle, Check, Send } from 'lucide-react'

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+']

const CLIENT_BULLETS = [
  'Pre-vetted talent',
  'Only the best make it',
  "Skip the shortlisting — we've done it",
]

export default function DemoRequest() {
  const [form, setForm] = useState({
    company_name: '', contact_name: '', designation: '',
    email: '', company_size: '', hiring_needs: '',
    country_iso: '', dial_code: '', phone: '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function selectCountry(e) {
    const iso = e.target.value
    const c = COUNTRIES.find((x) => x.iso2 === iso)
    setForm((f) => ({ ...f, country_iso: iso, dial_code: c ? c.dial : f.dial_code }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (isBenchProEmail(form.email)) {
      setError('Use your company email address, not a BenchPro email.')
      return
    }
    if (isFreeEmail(form.email)) {
      setError('Please use your work email address (not Gmail, Yahoo, etc.).')
      return
    }

    const country = COUNTRIES.find((x) => x.iso2 === form.country_iso)
    if (!country) {
      setError('Please select your country.')
      return
    }
    const digits = form.phone.replace(/\D/g, '')
    if (!/^\d{6,15}$/.test(digits)) {
      setError('Please enter a valid mobile number (digits only, 6–15 digits).')
      return
    }

    setLoading(true)
    const { error: dbError } = await supabase.from('demo_requests').insert({
      company_name: form.company_name,
      contact_name: form.contact_name,
      designation:  form.designation,
      email:        form.email,
      company_size: form.company_size || null,
      hiring_needs: form.hiring_needs || null,
      country:      country.name,
      dial_code:    country.dial,
      phone:        digits,
      status:       'pending',
    })

    if (dbError) { setError('Something went wrong. Please try again.'); setLoading(false); return }
    setDone(true)
  }

  const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5'

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-brand-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl bg-gradient-to-br from-brand-200 via-indigo-100 to-purple-200 p-[1.5px] shadow-xl shadow-indigo-100/60">
          <div className="rounded-[calc(1.5rem-1.5px)] bg-white p-10 text-center">
            <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
            <h2 className="text-lg font-semibold text-gray-800">Request received</h2>
            <p className="mt-2 text-sm text-gray-500">
              Thanks, <strong>{form.contact_name.split(' ')[0]}</strong> — we'll review your
              request and get back to <strong>{form.email}</strong> shortly.
            </p>
            <Link to="/login" className="mt-6 inline-block text-sm text-brand-600 hover:underline">Back to sign in</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-brand-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl rounded-3xl bg-gradient-to-br from-brand-200 via-indigo-100 to-purple-200 p-[1.5px] shadow-xl shadow-indigo-100/60">
        <div className="grid md:grid-cols-2 rounded-[calc(1.5rem-1.5px)] bg-white overflow-hidden">

          {/* ── Value prop ── */}
          <div className="order-2 md:order-1 flex flex-col bg-gradient-to-br from-brand-800 via-brand-900 to-indigo-950 text-white p-8 sm:p-10">
            <Link to="/" className="text-lg font-bold tracking-tight text-white">
              BenchPro<span className="text-brand-300">:</span>
            </Link>

            <div className="mt-10 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-300">For companies</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight">Request access to<br />BenchPro.</h2>
              <p className="mt-4 text-sm text-indigo-200 max-w-xs">
                Tell us who you are and what you're hiring for. We'll review your request and
                set you up with a dedicated recruiter.
              </p>

              <ul className="mt-7 space-y-3">
                {CLIENT_BULLETS.map(b => (
                  <li key={b} className="flex items-center gap-3 text-sm text-indigo-100">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/30 shrink-0">
                      <Check size={12} className="text-brand-200" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-8 text-sm text-white/70">
              Already have access?{' '}
              <Link to="/login" className="font-semibold text-white underline underline-offset-4 decoration-brand-400">Sign in</Link>
            </p>
          </div>

          {/* ── Intake form ── */}
          <div className="order-1 md:order-2 p-8 sm:p-10">
            <h1 className="text-2xl font-bold text-gray-900">Request access</h1>
            <p className="mt-1 text-sm text-gray-500">Work email required — no account is created yet.</p>

            {error && (
              <div className="mt-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className={labelCls}>Company name <span className="text-red-500">*</span></label>
                <input type="text" required value={form.company_name} onChange={set('company_name')} placeholder="Acme Corp" className={inputCls} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Contact person <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.contact_name} onChange={set('contact_name')} placeholder="Jane Smith" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Designation <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.designation} onChange={set('designation')} placeholder="Head of Talent" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Work email <span className="text-red-500">*</span></label>
                <input type="email" required value={form.email} onChange={set('email')} placeholder="jane@yourcompany.com" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Country <span className="text-red-500">*</span></label>
                <select required value={form.country_iso} onChange={selectCountry} className={inputCls}>
                  <option value="">Select country…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.iso2} value={c.iso2}>{c.name} ({c.dial})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Mobile phone <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="shrink-0 min-w-[3.5rem] px-3 py-2.5 text-sm text-gray-600 bg-gray-100 border border-gray-200 rounded-lg text-center select-none"
                  >
                    {form.dial_code || <span className="text-gray-400">+</span>}
                  </span>
                  <input
                    type="tel" required inputMode="numeric" value={form.phone} onChange={set('phone')}
                    placeholder="98765 43210" aria-label="Mobile number"
                    className={`${inputCls} flex-1`}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Company size <span className="text-gray-400 font-normal">(optional)</span></label>
                <select value={form.company_size} onChange={set('company_size')} className={inputCls}>
                  <option value="">Select…</option>
                  {COMPANY_SIZES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Hiring needs <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea rows={3} value={form.hiring_needs} onChange={set('hiring_needs')} placeholder="Roles you're hiring for, skills, timeline, volume…"
                  className={`${inputCls} resize-none`} />
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors disabled:opacity-60">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Send size={15} /> Request access</>}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
