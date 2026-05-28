import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MapPin, Briefcase, Clock, ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import PublicNav from '../../components/PublicNav'
import ApplyModal from '../../components/ApplyModal'
import CtaBanner from '../../components/CtaBanner'

const TYPE_COLORS = {
  'Full-time': 'bg-blue-100 text-blue-700',
  'Part-time':  'bg-violet-100 text-violet-700',
  'Contract':   'bg-amber-100 text-amber-700',
  'Freelance':  'bg-emerald-100 text-emerald-700',
}

function formatLPA(val) {
  if (!val) return null
  const l = val / 100000
  return `₹${Number.isInteger(l) ? l : l.toFixed(1)}L`
}

export default function JobDetail() {
  const { slug }    = useParams()
  const { user, role } = useAuth()
  const navigate    = useNavigate()
  const [job, setJob]         = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showApply, setShowApply] = useState(false)
  const [applied, setApplied]     = useState(false)

  useEffect(() => { load() }, [slug])

  async function load() {
    setLoading(true)
    setNotFound(false)

    // Try slug first
    let { data } = await supabase
      .from('jobs')
      .select('id, title, location, employment_type, salary_min, salary_max, show_salary, skills_required, experience_min, description, requirements, slug, created_at')
      .eq('slug', slug)
      .eq('status', 'open')
      .eq('is_public', true)
      .maybeSingle()

    // Fallback: maybe slug is actually an id
    if (!data) {
      const res = await supabase
        .from('jobs')
        .select('id, title, location, employment_type, salary_min, salary_max, show_salary, skills_required, experience_min, description, requirements, slug, created_at')
        .eq('id', slug)
        .eq('status', 'open')
        .eq('is_public', true)
        .maybeSingle()
      data = res.data
    }

    if (!data) { setNotFound(true); setLoading(false); return }
    setJob(data)

    // Check if already applied
    if (user && role === 'candidate') {
      const { data: cp } = await supabase
        .from('candidate_profiles').select('id').eq('user_id', user.id).maybeSingle()
      if (cp) {
        const { data: app } = await supabase
          .from('applications').select('id').eq('candidate_profile_id', cp.id).eq('job_id', data.id).maybeSingle()
        if (app) setApplied(true)
      }
    }

    // Related jobs
    const { data: rel } = await supabase
      .from('jobs')
      .select('id, title, location, employment_type, slug')
      .eq('status', 'open')
      .eq('is_public', true)
      .eq('employment_type', data.employment_type)
      .neq('id', data.id)
      .limit(3)
    setRelated(rel ?? [])
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center">
        <h2 className="text-2xl font-bold text-gray-700">Job not found</h2>
        <p className="mt-2 text-gray-500">This listing may have been closed or removed.</p>
        <Link to="/jobs" className="mt-6 inline-flex items-center gap-2 text-brand-600 hover:underline text-sm font-medium">
          <ArrowLeft size={15} /> Browse all jobs
        </Link>
      </div>
    </div>
  )

  const salaryLine = job.show_salary && (job.salary_min || job.salary_max)
    ? [formatLPA(job.salary_min), formatLPA(job.salary_max)].filter(Boolean).join(' – ')
    : null

  const daysAgo = Math.floor((Date.now() - new Date(job.created_at)) / 86400000)
  const posted  = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <PublicNav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={15} /> All jobs
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800 leading-tight">{job.title}</h1>
                {job.employment_type && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium shrink-0 ${TYPE_COLORS[job.employment_type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {job.employment_type}
                  </span>
                )}
              </div>
              <p className="mt-1 font-medium text-gray-500">Confidential Client</p>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
                {job.location && (
                  <span className="flex items-center gap-1.5"><MapPin size={14} />{job.location}</span>
                )}
                {salaryLine && (
                  <span className="text-emerald-600 font-semibold">{salaryLine} / yr</span>
                )}
                {job.experience_min > 0 && (
                  <span className="flex items-center gap-1.5"><Briefcase size={14} />{job.experience_min}+ years experience</span>
                )}
                <span className="flex items-center gap-1.5 text-gray-400"><Clock size={13} />Posted {posted}</span>
              </div>

              {job.skills_required?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {job.skills_required.map(s => (
                    <span key={s} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">{s}</span>
                  ))}
                </div>
              )}
            </div>

            {job.description && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-800 mb-3">About the Role</h2>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{job.description}</p>
              </div>
            )}

            {job.requirements && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-800 mb-3">Requirements</h2>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{job.requirements}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="font-semibold text-gray-800">Confidential Client</p>
              <p className="text-sm text-gray-500 mt-0.5 mb-4">Hiring through BenchPro</p>

              {applied ? (
                <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium">
                  <CheckCircle size={15} /> Application submitted
                </div>
              ) : role === 'recruiter' || role === 'super_recruiter' ? (
                <button
                  onClick={() => navigate('/manage/jobs')}
                  className="w-full px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Manage in Pipeline
                </button>
              ) : (
                <button
                  onClick={() => setShowApply(true)}
                  className="w-full px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Apply Now
                </button>
              )}
            </div>

            {related.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">Similar Jobs</h3>
                <div className="space-y-3">
                  {related.map(r => (
                    <Link key={r.id} to={`/jobs/${r.slug ?? r.id}`}
                      className="block group p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-gray-700 group-hover:text-brand-600 transition-colors">{r.title}</p>
                      {r.location && <p className="text-xs text-gray-400 mt-0.5">{r.location}</p>}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CtaBanner />

      {showApply && (
        <ApplyModal
          job={job}
          onClose={() => setShowApply(false)}
          onApplied={() => { setApplied(true); setShowApply(false) }}
        />
      )}
    </div>
  )
}
