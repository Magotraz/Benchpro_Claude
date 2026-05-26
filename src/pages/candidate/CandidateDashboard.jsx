import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { User, FileText, Briefcase, ClipboardList, ChevronRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { completionPct } from '../../components/CandidateLayout'

const STATUS_COLORS = {
  applied:     'bg-blue-100 text-blue-700',
  reviewing:   'bg-amber-100 text-amber-700',
  shortlisted: 'bg-emerald-100 text-emerald-700',
  rejected:    'bg-red-100 text-red-600',
}

function KpiCard({ label, value, icon: Icon, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-sm transition-shadow text-left w-full"
    >
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </button>
  )
}

export default function CandidateDashboard() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const { cp, pct } = useOutletContext()

  const [apps, setApps]       = useState([])
  const [jobCount, setJobCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    load()
  }, [user?.id])

  async function load() {
    setLoading(true)
    const [cpRes, jobsRes] = await Promise.all([
      supabase.from('candidate_profiles').select('id').eq('user_id', user.id).single(),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ])

    const cpId = cpRes.data?.id
    if (cpId) {
      const { data: appsData } = await supabase
        .from('applications')
        .select('id, status, created_at, jobs(title)')
        .eq('candidate_profile_id', cpId)
        .order('created_at', { ascending: false })
        .limit(5)
      setApps(appsData ?? [])
    }

    setJobCount(jobsRes.count ?? 0)
    setLoading(false)
  }

  const totalApps    = apps.length
  const reviewing    = apps.filter(a => a.status === 'reviewing').length
  const shortlisted  = apps.filter(a => a.status === 'shortlisted').length

  const firstName = cp?.full_name?.split(' ')[0] ?? 'there'

  const QUICK_LINKS = [
    { label: 'Complete your profile',  icon: User,         to: '/candidate/profile',      hidden: pct === 100 },
    { label: 'Upload your resume',     icon: FileText,     to: '/candidate/resume',        hidden: !!cp?.resume_url },
    { label: 'Browse open jobs',       icon: Briefcase,    to: '/candidate/jobs' },
    { label: 'View my applications',   icon: ClipboardList, to: '/candidate/applications', hidden: apps.length === 0 },
  ].filter(l => !l.hidden)

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-600 rounded-2xl p-6 text-white">
        <p className="text-indigo-200 text-sm font-medium">Candidate Portal</p>
        <h1 className="text-2xl font-bold mt-1">Welcome back, {firstName}!</h1>
        <p className="text-indigo-300 text-sm mt-1">
          {cp?.current_title ? `${cp.current_title} · ` : ''}
          {jobCount} open role{jobCount !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Profile completion alert */}
      {pct < 100 && (
        <div
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => navigate('/candidate/profile')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <User size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">Your profile is {pct}% complete</p>
              <p className="text-xs text-amber-600 mt-0.5">A complete profile gets 3× more recruiter views</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-24 h-2 bg-amber-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <ChevronRight size={16} className="text-amber-600" />
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Applications" value={totalApps} icon={ClipboardList}
          color="bg-brand-50 text-brand-600" onClick={() => navigate('/candidate/applications')} />
        <KpiCard label="Under Review"  value={reviewing} icon={FileText}
          color="bg-amber-50 text-amber-600" onClick={() => navigate('/candidate/applications')} />
        <KpiCard label="Shortlisted"   value={shortlisted} icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600" onClick={() => navigate('/candidate/applications')} />
        <KpiCard label="Open Jobs"     value={jobCount} icon={Briefcase}
          color="bg-violet-50 text-violet-600" onClick={() => navigate('/candidate/jobs')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent applications */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Recent Applications</h2>
            {apps.length > 0 && (
              <button onClick={() => navigate('/candidate/applications')}
                className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                View all <ChevronRight size={12} />
              </button>
            )}
          </div>
          {apps.length === 0 ? (
            <div className="text-center py-12 px-5">
              <ClipboardList size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="font-medium text-gray-500">No applications yet</p>
              <p className="text-sm text-gray-400 mt-1">Browse open jobs and apply to get started.</p>
              <button
                onClick={() => navigate('/candidate/jobs')}
                className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Browse Jobs
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {apps.map(app => (
                <li key={app.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{app.jobs?.title ?? '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Applied {new Date(app.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize shrink-0 ${STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {app.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Quick Actions</h2>
          </div>
          <div className="p-3 space-y-1">
            {QUICK_LINKS.map(({ label, icon: Icon, to }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                  <Icon size={15} className="text-brand-600" />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-700">{label}</span>
                <ChevronRight size={14} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
              </button>
            ))}
            {QUICK_LINKS.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">All caught up!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
