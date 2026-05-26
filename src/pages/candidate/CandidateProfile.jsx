import { useEffect, useState, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Save, X, Plus, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { completionPct } from '../../components/CandidateLayout'

// ─── Constants ────────────────────────────────────────────────────────────────

const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Available Now',     color: 'bg-emerald-600 text-white border-emerald-600',    idle: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
  { value: 'bench',     label: 'On Bench',           color: 'bg-blue-600 text-white border-blue-600',         idle: 'border-blue-300 text-blue-700 hover:bg-blue-50' },
  { value: 'notice',    label: 'In Notice Period',   color: 'bg-amber-500 text-white border-amber-500',       idle: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
  { value: 'placed',    label: 'Currently Placed',   color: 'bg-slate-600 text-white border-slate-600',       idle: 'border-slate-300 text-slate-600 hover:bg-slate-50' },
]

const EMPTY = {
  full_name: '', email: '', phone: '', location: '',
  current_title: '', current_company: '', experience_years: '',
  current_ctc: '', expected_ctc: '', notice_period: '',
  availability: 'available', summary: '', skills: [], linkedin_url: '',
}

// ─── Skills Tag Input ─────────────────────────────────────────────────────────

function SkillInput({ skills, onChange }) {
  const [text, setText] = useState('')
  const inputRef = useRef(null)

  function addSkill(raw) {
    const parts = raw.split(/[,\n]+/).map(s => s.trim()).filter(s => s && !skills.includes(s))
    if (parts.length) onChange([...skills, ...parts])
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (text.trim()) { addSkill(text); setText('') }
    } else if (e.key === 'Backspace' && !text && skills.length) {
      onChange(skills.slice(0, -1))
    }
  }

  function handleBlur() {
    if (text.trim()) { addSkill(text); setText('') }
  }

  return (
    <div
      className="min-h-[44px] flex flex-wrap gap-1.5 px-3 py-2 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-brand-500 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {skills.map(s => (
        <span key={s} className="flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
          {s}
          <button type="button" onClick={() => onChange(skills.filter(x => x !== s))}
            className="hover:text-red-600 transition-colors">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={skills.length === 0 ? 'Type a skill and press Enter…' : ''}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
      />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CandidateProfile() {
  const { user }       = useAuth()
  const { setCp }      = useOutletContext()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    supabase.from('candidate_profiles').select('*').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setForm({
            ...EMPTY,
            ...data,
            experience_years: data.experience_years ?? '',
            current_ctc:      data.current_ctc ?? '',
            expected_ctc:     data.expected_ctc ?? '',
            notice_period:    data.notice_period ?? '',
            skills:           data.skills ?? [],
          })
        }
        setLoading(false)
      })
  }, [user?.id])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      user_id:         user.id,
      full_name:       form.full_name.trim(),
      email:           form.email.trim(),
      phone:           form.phone || null,
      location:        form.location || null,
      current_title:   form.current_title || null,
      current_company: form.current_company || null,
      experience_years: form.experience_years !== '' ? +form.experience_years : null,
      current_ctc:     form.current_ctc !== '' ? +form.current_ctc : null,
      expected_ctc:    form.expected_ctc !== '' ? +form.expected_ctc : null,
      notice_period:   form.notice_period !== '' ? +form.notice_period : null,
      availability:    form.availability,
      summary:         form.summary || null,
      skills:          form.skills,
      linkedin_url:    form.linkedin_url || null,
      updated_at:      new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('candidate_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single()

    if (!error && data) {
      setCp(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const pct = completionPct(form)

  const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white'
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

      {/* Completion bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Profile Completion</p>
          <p className="text-sm font-bold text-brand-700">{pct}%</p>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-brand-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && (
          <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Profile is complete!</p>
        )}
      </div>

      {/* Personal Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm">Personal Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Full Name *</label>
            <input type="text" required value={form.full_name} onChange={e => set('full_name', e.target.value)}
              placeholder="Jane Doe" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="you@example.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="+91 98765 43210" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="e.g. Bangalore, India" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Professional Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm">Professional Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Current Role</label>
            <input type="text" value={form.current_title} onChange={e => set('current_title', e.target.value)}
              placeholder="e.g. Senior Developer" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Current Company</label>
            <input type="text" value={form.current_company} onChange={e => set('current_company', e.target.value)}
              placeholder="e.g. TCS" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Experience (years)</label>
            <input type="number" min="0" max="50" value={form.experience_years}
              onChange={e => set('experience_years', e.target.value)}
              placeholder="e.g. 5" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Notice Period (days)</label>
            <input type="number" min="0" value={form.notice_period}
              onChange={e => set('notice_period', e.target.value)}
              placeholder="e.g. 30" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Current CTC (₹ LPA)</label>
            <input type="number" min="0" step="0.5" value={form.current_ctc}
              onChange={e => set('current_ctc', e.target.value)}
              placeholder="e.g. 12" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Expected CTC (₹ LPA)</label>
            <input type="number" min="0" step="0.5" value={form.expected_ctc}
              onChange={e => set('expected_ctc', e.target.value)}
              placeholder="e.g. 18" className={inputCls} />
          </div>
        </div>

        {/* Availability */}
        <div>
          <label className={labelCls}>Availability Status</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {AVAILABILITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('availability', opt.value)}
                className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  form.availability === opt.value ? opt.color : opt.idle
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm">Professional Summary</h3>
        <textarea
          value={form.summary}
          onChange={e => set('summary', e.target.value)}
          rows={4}
          placeholder="A brief description of your experience, strengths, and career goals…"
          className={`${inputCls} resize-none`}
        />
        <p className="text-xs text-gray-400">{form.summary?.length ?? 0} / 500 characters</p>
      </div>

      {/* Skills */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm">Skills</h3>
        <SkillInput skills={form.skills} onChange={v => set('skills', v)} />
        <p className="text-xs text-gray-400">Type a skill and press Enter or comma to add. Click the × to remove.</p>
      </div>

      {/* Links */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm">Links</h3>
        <div>
          <label className={labelCls}>LinkedIn URL</label>
          <input type="url" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)}
            placeholder="https://linkedin.com/in/your-profile" className={inputCls} />
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Saved successfully
          </span>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Save size={14} /> Save Profile</>}
        </button>
      </div>
    </form>
  )
}
