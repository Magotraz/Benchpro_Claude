import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Briefcase, ArrowRight, Users, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// Floating skill/location pills — absolute positioned around the headline
const PILLS = [
  // Left column
  { label: 'React Developer', top: '18%', left: '4%',  rotate: '-2deg' },
  { label: 'Oracle Cloud',    top: '32%', left: '6%',  rotate:  '2deg' },
  { label: 'SAP Consultant',  top: '47%', left: '4%',  rotate: '-1deg' },
  { label: 'Bangalore',       top: '61%', left: '7%',  rotate:  '3deg' },
  { label: 'Data Engineer',   top: '75%', left: '4%',  rotate: '-2deg' },
  { label: 'Pune',            top: '86%', left: '9%',  rotate:  '1deg' },
  // Right column
  { label: 'Salesforce',      top: '16%', right: '5%', rotate:  '2deg' },
  { label: 'Delhi',           top: '29%', right: '4%', rotate: '-3deg' },
  { label: 'Java Developer',  top: '43%', right: '6%', rotate:  '1deg' },
  { label: 'Hyderabad',       top: '57%', right: '4%', rotate: '-2deg' },
  { label: 'Contract',        top: '71%', right: '7%', rotate:  '3deg' },
  { label: 'Kolkata',         top: '83%', right: '5%', rotate: '-1deg' },
  // Top / bottom scatter
  { label: 'Mumbai',          top:  '9%', left: '22%', rotate:  '1deg' },
  { label: 'Node.js',         top:  '9%', right:'22%', rotate: '-2deg' },
  { label: 'AWS',             top: '90%', left: '30%', rotate:  '2deg' },
  { label: 'Chennai',         top: '90%', right:'27%', rotate: '-1deg' },
]

const TYPE_COLORS = {
  'Full-time': 'bg-blue-50 text-blue-700',
  'Part-time':  'bg-violet-50 text-violet-700',
  'Contract':   'bg-amber-50 text-amber-700',
  'Freelance':  'bg-emerald-50 text-emerald-700',
}

function formatLPA(val) {
  if (!val) return null
  const l = val / 100000
  return `₹${Number.isInteger(l) ? l : l.toFixed(1)}L`
}

export default function HomePage() {
  const { user, role, loading } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])

  // Redirect authenticated users straight to their dashboard
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

  if (loading) return null

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAVBAR ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <span className="text-xl font-bold tracking-tight text-gray-900 select-none">
            BenchPro<span className="text-indigo-600">:</span>
          </span>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/jobs" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              For Candidates
            </Link>
            <Link to="/request-demo" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              For Companies
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Log In
            </Link>
            <Link to="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative min-h-[calc(100vh-64px)] flex items-center justify-center overflow-hidden bg-white">
        {/* Floating pills — hidden on smaller screens */}
        {PILLS.map(({ label, rotate, ...pos }) => (
          <span
            key={label}
            style={{ position: 'absolute', transform: `rotate(${rotate})`, ...pos }}
            className="hidden lg:inline-flex px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-500 shadow-sm select-none whitespace-nowrap"
          >
            {label}
          </span>
        ))}

        {/* Central content */}
        <div className="relative z-10 text-center px-6 max-w-2xl">
          <h1 className="text-6xl sm:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.08]">
            Find what's next
          </h1>
          <p className="mt-5 text-lg text-gray-400">
            India's consulting &amp; tech talent network
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="px-8 py-4 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-700 transition-colors"
            >
              Find your next hire
            </Link>
            <Link
              to="/register"
              className="px-8 py-4 bg-white text-gray-900 text-sm font-semibold rounded-full border border-gray-900 hover:bg-gray-50 transition-colors"
            >
              Find your next job
            </Link>
          </div>
        </div>
      </section>

      {/* ── LIVE JOBS ───────────────────────────────────────────── */}
      <section className="bg-[#F8F7F4] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">Latest opportunities</h2>
            <Link to="/jobs" className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <p className="text-sm text-gray-500 mb-8">
            Roles across India, UK, Gulf &amp; beyond — updated daily
          </p>

          {jobs.length === 0 ? (
            <p className="text-sm text-gray-400">No open roles right now — check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── DUAL AUDIENCE ───────────────────────────────────────── */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Candidates */}
          <div className="border border-gray-200 rounded-2xl p-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mb-5">
              <Users size={20} className="text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">For Candidates</h3>
            <p className="text-sm text-gray-500 mb-5">Your next consulting or tech role is here.</p>
            <ul className="space-y-2.5 text-sm text-gray-600 mb-7">
              {[
                'Browse curated roles from vetted clients',
                'One profile, multiple opportunities',
                'Track your applications in real time',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle size={15} className="text-indigo-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/register"
              className="inline-block px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
              Create free profile
            </Link>
          </div>

          {/* Companies */}
          <div className="border border-gray-200 rounded-2xl p-8">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-5">
              <Briefcase size={20} className="text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">For Companies</h3>
            <p className="text-sm text-gray-500 mb-5">Hire pre-vetted consulting &amp; tech talent fast.</p>
            <ul className="space-y-2.5 text-sm text-gray-600 mb-7">
              {[
                'Access a curated bench of ready talent',
                'Full pipeline visibility — CV to offer',
                'Dedicated recruiter support throughout',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle size={15} className="text-amber-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <a href="mailto:hello@hiref.in"
              className="inline-block px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
              Request a demo
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p>© 2026 BenchPro · Powered by HIREF Technologies</p>
          <div className="flex items-center gap-6">
            <Link to="/jobs"     className="hover:text-gray-700 transition-colors">Jobs</Link>
            <Link to="/login"    className="hover:text-gray-700 transition-colors">Login</Link>
            <Link to="/register" className="hover:text-gray-700 transition-colors">Register</Link>
            <a href="mailto:hello@hiref.in" className="hover:text-gray-700 transition-colors">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  )
}

function JobCard({ job }) {
  const salary = job.show_salary && (job.salary_min || job.salary_max)
    ? [formatLPA(job.salary_min), formatLPA(job.salary_max)].filter(Boolean).join(' – ')
    : null

  return (
    <Link
      to={`/jobs/${job.slug ?? job.id}`}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all group flex flex-col gap-3"
    >
      <div>
        <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight">
          {job.title}
        </p>
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
            <span key={s} className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
              {s}
            </span>
          ))}
          {job.skills_required.length > 3 && (
            <span className="text-xs text-gray-400">+{job.skills_required.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        {salary
          ? <span className="text-sm font-semibold text-emerald-600">{salary} / yr</span>
          : <span />
        }
        <span className="text-xs font-medium text-indigo-600 group-hover:underline">Apply →</span>
      </div>
    </Link>
  )
}
