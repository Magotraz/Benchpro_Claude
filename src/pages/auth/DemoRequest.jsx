import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { isBenchProEmail, isFreeEmail } from '../../lib/auth'
import { CheckCircle, Send } from 'lucide-react'

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+']

export default function DemoRequest() {
  const [form, setForm] = useState({
    company_name: '', contact_name: '', email: '',
    phone: '', company_size: '', message: '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
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

    setLoading(true)
    const { error: dbError } = await supabase.from('demo_requests').insert([form])

    if (dbError) { setError('Something went wrong. Please try again.'); setLoading(false); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-sm w-full text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
          <h2 className="text-lg font-semibold text-gray-800">Request received!</h2>
          <p className="mt-2 text-sm text-gray-500">
            Thanks, <strong>{form.contact_name.split(' ')[0]}</strong>. A member of the BenchPro team will reach out to{' '}
            <strong>{form.email}</strong> within 1 business day.
          </p>
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
          <h1 className="text-4xl font-bold text-white leading-tight">Let's find your<br />next hire together.</h1>
          <p className="mt-4 text-indigo-300 text-lg max-w-sm">
            BenchPro connects you with pre-vetted candidates through a dedicated recruiter network. No noise, just results.
          </p>
          <ul className="mt-6 space-y-2 text-indigo-200 text-sm">
            {['Dedicated recruiter assigned to your account', 'Full candidate pipeline visibility', 'Transparent quotation and invoicing'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle size={16} className="text-brand-400 shrink-0" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-indigo-400 text-sm">© {new Date().getFullYear()} BenchPro.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white">B</div>
            <span className="font-semibold text-gray-800 text-lg">BenchPro</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-800">Request a demo</h2>
          <p className="mt-1 text-gray-500 text-sm">
            Already have access?{' '}
            <Link to="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
          </p>

          {error && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company name <span className="text-red-500">*</span></label>
                <input type="text" required value={form.company_name} onChange={set('company_name')} placeholder="Acme Corp"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Your name <span className="text-red-500">*</span></label>
                <input type="text" required value={form.contact_name} onChange={set('contact_name')} placeholder="Jane Smith"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work email <span className="text-red-500">*</span></label>
              <input type="email" required value={form.email} onChange={set('email')} placeholder="jane@yourcompany.com"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company size</label>
                <select value={form.company_size} onChange={set('company_size')}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="">Select…</option>
                  {COMPANY_SIZES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tell us about your hiring needs</label>
              <textarea rows={3} value={form.message} onChange={set('message')} placeholder="Roles you're hiring for, timeline, volume…"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white resize-none" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors disabled:opacity-60">
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Send size={15} /> Send request</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
