import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, ArrowRight, CheckCircle, Menu, X, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// ─── Floating hero pills ──────────────────────────────────────────────────────
const PILLS = [
  { label: 'Oracle Cloud',   top: '15%', left: '5%',   rotate: '-2deg' },
  { label: 'SAP',            top: '28%', left: '7%',   rotate:  '2deg' },
  { label: 'Java',           top: '41%', left: '4%',   rotate: '-1deg' },
  { label: 'Hyderabad',      top: '55%', left: '6%',   rotate:  '3deg' },
  { label: 'Data Engineer',  top: '68%', left: '4%',   rotate: '-2deg' },
  { label: 'Pune',           top: '81%', left: '7%',   rotate:  '1deg' },
  { label: 'Salesforce',     top: '13%', right: '5%',  rotate:  '2deg' },
  { label: 'React Developer',top: '26%', right: '4%',  rotate: '-3deg' },
  { label: 'AWS',            top: '39%', right: '6%',  rotate:  '1deg' },
  { label: 'Bangalore',      top: '52%', right: '4%',  rotate: '-2deg' },
  { label: 'Node.js',        top: '65%', right: '5%',  rotate:  '3deg' },
  { label: 'DevOps',         top: '78%', right: '7%',  rotate: '-1deg' },
  { label: 'Mumbai',         top:  '9%', left: '22%',  rotate:  '1deg' },
  { label: 'Salesforce CPQ', top:  '9%', right: '19%', rotate: '-2deg' },
  { label: 'Delhi NCR',      top: '89%', left: '26%',  rotate:  '2deg' },
  { label: 'Power BI',       top: '89%', right: '23%', rotate: '-1deg' },
]

const TYPE_COLORS = {
  'Full-time': 'bg-blue-50 text-blue-700',
  'Part-time':  'bg-violet-50 text-violet-700',
  'Contract':   'bg-amber-50 text-amber-700',
  'Freelance':  'bg-emerald-50 text-emerald-700',
}

const SPECIALISATIONS = [
  { title: 'Oracle Cloud',      desc: 'ERP, HCM, Finance, SCM' },
  { title: 'Salesforce',        desc: 'CRM, CPQ, Vlocity, LWC' },
  { title: 'SAP',               desc: 'FICO, MM, SD, Basis, ABAP' },
  { title: 'Java / Spring Boot',desc: 'Microservices, APIs' },
  { title: 'React / Node.js',   desc: 'Frontend, Full-stack' },
  { title: 'AWS / Azure / GCP', desc: 'Cloud, DevOps' },
  { title: 'Data Engineering',  desc: 'Spark, Python, SQL, Power BI' },
  { title: 'QA / Test Automation', desc: 'Selenium, Cypress, JIRA' },
]

const HOW_STEPS = [
  {
    num: '01',
    title: 'Share your requirement',
    desc: 'Tell us the role, skills, timeline and budget. Takes less than 2 minutes.',
  },
  {
    num: '02',
    title: 'AI-assisted screening & expert review',
    desc: 'Every applicant is screened against your job requirements and rated by our specialist recruiters. Only candidates rated 4★ or above reach your pipeline.',
  },
  {
    num: '03',
    title: 'Contractor joins your team',
    desc: 'Your vetted contractor starts work — on our payroll, billed to you monthly. We handle contracts, compliance and invoicing.',
  },
]

const TIMELINES = ['Immediate', 'Within 2 weeks', 'Within a month', 'Planning ahead']
const BUDGETS   = ['Under $20/hr', '$20–30/hr', '$30–50/hr', '$50+/hr', 'Discuss on call']

const FORM_EMPTY = {
  name: '', company: '', email: '', phone: '', role: '',
  skills: '', timeline: TIMELINES[0], budget: BUDGETS[0], context: '',
}

function formatLPA(val) {
  if (!val) return null
  const l = val / 100000
  return `₹${Number.isInteger(l) ? l : l.toFixed(1)}L`
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, role, loading } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs]             = useState([])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [form, setForm]             = useState(FORM_EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [formError, setFormError]   = useState('')

  useEffect(() => {
    if (!loading && user) {
      if (role === 'candidate') navigate('/candidate/dashboard', { replace: true })
      else if (role) navigate('/dashboard', { replace: true })
    }
  }, [user, role, loading, navigate])

  useEffect(() => {
    supabase
      .from('jobs')
      .select('id, title, location, employment_type, salary_min, salary_max, show_salary, skills_required, slug, created_at')
      .eq('status', 'open')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setJobs(data ?? []))
  }, [])

  function scrollTo(id) {
    setMobileOpen(false)
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  function fld(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleFormSubmit(e) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    const message = [
      `Position: ${form.role}`,
      form.skills  ? `Skills: ${form.skills}` : null,
      `Timeline: ${form.timeline}`,
      `Budget: ${form.budget}`,
      form.context ? `Additional context: ${form.context}` : null,
    ].filter(Boolean).join('\n')

    const { error } = await supabase.from('demo_requests').insert({
      contact_name: form.name,
      company_name: form.company,
      email:        form.email,
      phone:        form.phone || null,
      message,
    })
    if (error) { setFormError(error.message); setSubmitting(false); return }
    setSubmitted(true)
    setSubmitting(false)
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAVBAR ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          {/* Wordmark */}
          <span className="text-xl font-bold tracking-tight text-gray-900 select-none">
            BenchPro<span className="text-indigo-600">:</span>
          </span>

          {/* Desktop center links */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('how-it-works')} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              How it works
            </button>
            <button onClick={() => scrollTo('specialisations')} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Specialisations
            </button>
            <button onClick={() => scrollTo('for-talent')} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              For Talent
            </button>
          </div>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Client Login
            </Link>
            <button
              onClick={() => scrollTo('requirement-form')}
              className="px-5 py-2 text-sm font-semibold text-white bg-gray-900 rounded-full hover:bg-gray-700 transition-colors">
              Post a Requirement
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3">
            {[
              { label: 'How it works',    id: 'how-it-works' },
              { label: 'Specialisations', id: 'specialisations' },
              { label: 'For Talent',      id: 'for-talent' },
            ].map(({ label, id }) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="block w-full text-left text-sm font-medium text-gray-600 py-1.5 hover:text-gray-900 transition-colors">
                {label}
              </button>
            ))}
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileOpen(false)}
                className="block text-center px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">
                Client Login
              </Link>
              <button onClick={() => scrollTo('requirement-form')}
                className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-full">
                Post a Requirement
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative min-h-[calc(100vh-64px)] flex items-center justify-center overflow-hidden bg-white">
        {PILLS.map(({ label, rotate, ...pos }) => (
          <span
            key={label}
            style={{ position: 'absolute', transform: `rotate(${rotate})`, ...pos }}
            className="hidden lg:inline-flex px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-500 shadow-sm select-none whitespace-nowrap"
          >
            {label}
          </span>
        ))}

        <div className="relative z-10 text-center px-6 max-w-3xl">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.08]">
            On-demand tech talent,<br />
            <span className="text-gray-700">on your project timeline</span>
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            AI-assisted screening, expert-verified shortlists. Vetted contractors across ERP, Cloud, Data &amp; Engineering —
            placed in days, billed monthly, zero hiring overhead.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => scrollTo('requirement-form')}
              className="px-8 py-4 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-700 transition-colors"
            >
              Post a requirement
            </button>
            <button
              onClick={() => scrollTo('how-it-works')}
              className="px-8 py-4 bg-white text-gray-900 text-sm font-semibold rounded-full border border-gray-900 hover:bg-gray-50 transition-colors"
            >
              See how it works
            </button>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ───────────────────────────────────────────── */}
      <section className="bg-gray-50 py-8 border-y border-gray-200">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-500 mb-4">Trusted by 50+ companies across</p>
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {['🇮🇳 India', '🇬🇧 UK', '🇦🇪 Gulf', '🇺🇸 US', '🇪🇺 EU'].map(r => (
              <span key={r} className="text-sm font-medium text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-full">
                {r}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            {[
              ['7+ years', 'experience'],
              ['500+', 'placements'],
              ['Fortune 500', 'partnerships'],
              ['AI-assisted', 'matching'],
            ].map(([bold, rest]) => (
              <span key={bold}><strong className="text-gray-800">{bold}</strong> {rest}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-gray-900">How BenchPro works</h2>
            <p className="mt-3 text-gray-500">From requirement to deployment in days, not months</p>
          </div>

          <div className="flex flex-col md:flex-row gap-0">
            {HOW_STEPS.map((step, i) => (
              <div key={step.num} className="flex flex-col md:flex-row flex-1">
                <div className="flex-1 text-center px-4 md:px-8">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-indigo-200 flex items-center justify-center mx-auto mb-5">
                    <span className="text-indigo-600 font-bold text-sm">{step.num}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </div>
                {i < HOW_STEPS.length - 1 && (
                  <div className="hidden md:flex items-start justify-center w-8 pt-[22px] shrink-0">
                    <div className="w-full border-t-2 border-dashed border-gray-200" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI ADVANTAGE ────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Hiring intelligence, built in</h2>
            <p className="mt-2 text-gray-500">Stop reviewing 200 resumes. See only the best.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: '⭐',
                title: 'Expert-rated shortlists',
                desc: 'Every candidate is manually reviewed and rated 1–5 by our specialist recruiters before reaching your pipeline. You only see 4★ and above.',
              },
              {
                icon: '🎯',
                title: 'Skills-matched candidates',
                desc: 'Our recruiters map candidate skills, experience and seniority to your exact requirement — not just keyword matching.',
              },
              {
                icon: '⚡',
                title: 'AI-assisted, human-verified',
                desc: 'We use AI tools to assist our recruiters in analysing resumes faster — combined with human expertise for accurate, bias-aware shortlisting.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <span className="text-2xl block mb-3">{icon}</span>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            AI-powered screening coming soon — currently powered by expert recruiter review
          </p>
        </div>
      </section>

      {/* ── SPECIALISATIONS ─────────────────────────────────────── */}
      <section id="specialisations" className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Our specialisations</h2>
            <p className="mt-2 text-gray-500">Deep expertise across enterprise tech stacks</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SPECIALISATIONS.map(({ title, desc }) => (
              <div key={title}
                className="border border-gray-200 rounded-xl p-4 hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-default">
                <p className="font-semibold text-gray-800 text-sm">{title}</p>
                <p className="text-xs text-gray-500 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACTIVE OPENINGS ─────────────────────────────────────── */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold text-gray-900">Active openings</h2>
            <Link to="/jobs" className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <p className="text-sm text-gray-500 mb-8">
            Current client requirements — join our talent network to apply
          </p>

          {jobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-12 text-gray-400">
              <p className="font-medium">New roles added weekly</p>
              <p className="text-sm mt-1">Register to get notified</p>
              <Link to="/register" className="mt-4 inline-block px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                Join talent network
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── POST A REQUIREMENT ──────────────────────────────────── */}
      <section id="requirement-form" className="bg-white py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Post a requirement</h2>
            <p className="mt-2 text-gray-500">Tell us what you need — we'll get back to you within 24 hours</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-bold text-gray-900">Thanks, {form.name.split(' ')[0]}!</h3>
                <p className="text-gray-500 mt-2">Our team will reach out within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {formError && (
                  <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name <span className="text-red-500">*</span></label>
                    <input required value={form.name} onChange={fld('name')} placeholder="Jane Smith"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Company name <span className="text-red-500">*</span></label>
                    <input required value={form.company} onChange={fld('company')} placeholder="Acme Corp"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Work email <span className="text-red-500">*</span></label>
                    <input required type="email" value={form.email} onChange={fld('email')} placeholder="jane@acme.com"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
                    <input type="tel" value={form.phone} onChange={fld('phone')} placeholder="+44 7700 900000"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role / Position needed <span className="text-red-500">*</span></label>
                  <input required value={form.role} onChange={fld('role')} placeholder="e.g. Oracle Cloud Finance Consultant"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Key skills required</label>
                  <textarea rows={2} value={form.skills} onChange={fld('skills')} placeholder="e.g. Oracle Fusion, HCM, Payroll, OIC…"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Timeline</label>
                    <select value={form.timeline} onChange={fld('timeline')}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      {TIMELINES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Budget range</label>
                    <select value={form.budget} onChange={fld('budget')}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      {BUDGETS.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional context <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea rows={3} value={form.context} onChange={fld('context')} placeholder="Project details, start date, remote/onsite preference…"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none" />
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 mt-2">
                  {submitting
                    ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</span>
                    : 'Submit requirement'
                  }
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── FOR TALENT ──────────────────────────────────────────── */}
      <section id="for-talent" className="bg-white py-20 px-6 border-t border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold tracking-widest text-indigo-600 uppercase mb-3">For Candidates</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Looking for your next contract role?
            </h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Join our talent network and get matched with top companies across India, UK and Gulf.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Access exclusive client requirements',
                'Competitive contract rates',
                'Payroll and compliance handled by HIREF',
                'Expert recruiters advocate for your profile',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <CheckCircle size={15} className="text-indigo-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/register"
              className="inline-block px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors">
              Create your profile →
            </Link>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
            <div className="space-y-6">
              {[
                { stat: '500+', label: 'contractors placed' },
                { stat: '50+',  label: 'active clients' },
                { stat: '8 days', label: 'avg. time to placement' },
                { stat: 'India · UK · Gulf · US · EU', label: 'regions covered' },
              ].map(({ stat, label }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-1 h-8 bg-indigo-500 rounded-full shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900">{stat}</p>
                    <p className="text-sm text-gray-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8 pb-8 border-b border-gray-800">
            <div>
              <span className="text-xl font-bold tracking-tight">
                BenchPro<span className="text-indigo-400">:</span>
              </span>
              <p className="text-sm text-gray-400 mt-1">Powered by HIREF Technologies</p>
            </div>
            <div className="flex items-center gap-6">
              {[
                { label: 'Jobs',     to: '/jobs' },
                { label: 'Login',    to: '/login' },
                { label: 'Register', to: '/register' },
              ].map(({ label, to }) => (
                <Link key={label} to={to} className="text-sm text-gray-400 hover:text-white transition-colors">
                  {label}
                </Link>
              ))}
              <a href="mailto:hello@hiref.in" className="text-sm text-gray-400 hover:text-white transition-colors">
                Contact
              </a>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
            <p>© 2026 HIREF Technologies Pvt. Ltd. · Jammu, India</p>
            <p>Built for modern staffing operations</p>
          </div>
        </div>
      </footer>

    </div>
  )
}

// ─── Job card ─────────────────────────────────────────────────────────────────

function JobCard({ job }) {
  const salary = job.show_salary && (job.salary_min || job.salary_max)
    ? [job.salary_min, job.salary_max]
        .filter(Boolean)
        .map(v => { const l = v / 100000; return `₹${Number.isInteger(l) ? l : l.toFixed(1)}L` })
        .join(' – ')
    : null

  return (
    <Link
      to={`/jobs/${job.slug ?? job.id}`}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all group flex flex-col gap-3"
    >
      <div>
        <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{job.title}</p>
        <p className="text-sm text-gray-400 mt-0.5">Confidential Client</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {job.location && (
          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            <MapPin size={10} /> {job.location}
          </span>
        )}
        {job.employment_type && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLORS[job.employment_type] ?? 'bg-gray-100 text-gray-600'}`}>
            {job.employment_type}
          </span>
        )}
      </div>
      {job.skills_required?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.skills_required.slice(0, 3).map(s => (
            <span key={s} className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">{s}</span>
          ))}
          {job.skills_required.length > 3 && (
            <span className="text-xs text-gray-400">+{job.skills_required.length - 3}</span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mt-auto pt-1">
        {salary ? <span className="text-sm font-semibold text-emerald-600">{salary} / yr</span> : <span />}
        <span className="text-xs font-medium text-indigo-600 group-hover:underline">Apply →</span>
      </div>
    </Link>
  )
}
