import { useEffect, useState, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Upload, FileText, Download, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function CandidateResume() {
  const { user }       = useAuth()
  const { cp, setCp }  = useOutletContext()
  const fileRef        = useRef(null)

  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file) {
    setError('')
    setSuccess('')

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only PDF, DOC, and DOCX files are accepted.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`File too large. Maximum size is 10 MB (your file: ${formatBytes(file.size)}).`)
      return
    }

    setUploading(true)
    const path = `${user.id}/${file.name}`

    // Remove old file first if it exists and name differs
    if (cp?.resume_url && cp.resume_url !== path) {
      await supabase.storage.from('candidate-resumes').remove([cp.resume_url])
    }

    const { error: uploadError } = await supabase.storage
      .from('candidate-resumes')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`)
      setUploading(false)
      return
    }

    // Update candidate_profiles
    const { data: updatedCp } = await supabase
      .from('candidate_profiles')
      .update({ resume_url: path, resume_filename: file.name, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single()

    if (updatedCp) setCp(updatedCp)
    setSuccess(`"${file.name}" uploaded successfully.`)
    setUploading(false)
  }

  function handleInputChange(e) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = '' // reset so same file can be re-selected
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function handleDownload() {
    if (!cp?.resume_url) return
    setDownloading(true)
    const { data, error: signedError } = await supabase.storage
      .from('candidate-resumes')
      .createSignedUrl(cp.resume_url, 120)

    if (signedError || !data?.signedUrl) {
      setError('Could not generate download link. Please try again.')
    } else {
      window.open(data.signedUrl, '_blank')
    }
    setDownloading(false)
  }

  async function handleDelete() {
    if (!cp?.resume_url) return
    if (!window.confirm('Remove your resume? You can upload a new one at any time.')) return

    await supabase.storage.from('candidate-resumes').remove([cp.resume_url])
    const { data: updatedCp } = await supabase
      .from('candidate_profiles')
      .update({ resume_url: null, resume_filename: null, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single()

    if (updatedCp) setCp(updatedCp)
    setSuccess('')
    setError('')
  }

  const hasResume = !!cp?.resume_url

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Resume / CV</h2>
        <p className="text-sm text-gray-500 mt-0.5">Upload your latest CV. Recruiters will use this to evaluate your application.</p>
      </div>

      {/* Current file */}
      {hasResume && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Current Resume</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
              <FileText size={22} className="text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{cp.resume_filename}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Uploaded {cp.updated_at ? new Date(cp.updated_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg transition-colors border border-brand-200 disabled:opacity-50"
              >
                {downloading ? '…' : <><Download size={12} /> Download</>}
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove resume"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-brand-500 bg-brand-50'
            : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50 bg-white'
        }`}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={handleInputChange}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-600">Uploading…</p>
          </div>
        ) : (
          <>
            <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-brand-600' : 'text-gray-400'}`} />
            <p className="text-sm font-semibold text-gray-700">
              {hasResume ? 'Replace your resume' : 'Upload your resume'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Drag & drop here, or click to browse</p>
            <p className="text-xs text-gray-400 mt-0.5">PDF, DOC, DOCX — max 10 MB</p>
          </>
        )}
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          <CheckCircle2 size={15} className="shrink-0" /> {success}
        </div>
      )}

      {/* Tips */}
      <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
        <p className="text-xs font-semibold text-indigo-700 mb-2">Resume Tips</p>
        <ul className="space-y-1">
          {[
            'Keep it to 1–2 pages for best results',
            'Use clear section headings (Experience, Education, Skills)',
            'Include measurable achievements, not just responsibilities',
            'PDF format is preferred for consistent formatting',
          ].map(tip => (
            <li key={tip} className="text-xs text-indigo-600 flex items-start gap-1.5">
              <span className="mt-0.5">•</span> {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
