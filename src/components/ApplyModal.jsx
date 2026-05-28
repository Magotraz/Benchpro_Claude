import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, LogIn, UserPlus, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function ApplyModal({ job, onClose, onApplied }) {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [coverNote, setCoverNote] = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { data: cp, error: cpErr } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (cpErr || !cp) {
      setError('Please complete your candidate profile before applying.')
      setSaving(false)
      return
    }

    const { error: appErr } = await supabase.from('applications').insert({
      candidate_profile_id: cp.id,
      job_id:     job.id,
      cover_note: coverNote || null,
    })

    if (appErr) {
      if (appErr.code === '23505') setError('You have already applied for this role.')
      else setError(appErr.message)
      setSaving(false)
      return
    }

    onApplied()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">Apply for role</h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">{job.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          {!user ? (
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-6">
                Create a free account or sign in to apply for this role.
              </p>
              <div className="space-y-3">
                <Link
                  to={`/register?job=${job.slug ?? job.id}`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <UserPlus size={16} /> Create free account
                </Link>
                <Link
                  to={`/login?redirect=/jobs/${job.slug ?? job.id}`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  <LogIn size={16} /> Sign in
                </Link>
              </div>
            </div>
          ) : role === 'candidate' ? (
            <form onSubmit={submit}>
              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
              )}
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cover note <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={4}
                value={coverNote}
                onChange={e => setCoverNote(e.target.value)}
                placeholder="Briefly introduce yourself and why you're a great fit…"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none bg-white"
              />
              <div className="mt-4 flex gap-3 justify-end">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-60">
                  <Send size={14} /> {saving ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                You're signed in as a recruiter. Manage candidates from the job pipeline.
              </p>
              <button
                onClick={() => { navigate('/manage/jobs'); onClose() }}
                className="w-full px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Go to Job Management
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
