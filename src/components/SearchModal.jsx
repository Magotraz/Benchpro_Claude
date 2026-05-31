import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Briefcase, Users, FileText, Building2, X, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

const GROUPS = [
  { key: 'jobs',       label: 'Jobs',        icon: Briefcase,  color: 'text-blue-600',    bg: 'bg-blue-50' },
  { key: 'candidates', label: 'Candidates',  icon: Users,      color: 'text-violet-600',  bg: 'bg-violet-50' },
  { key: 'submissions',label: 'Submissions', icon: FileText,   color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  { key: 'companies',  label: 'Companies',   icon: Building2,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
]

function highlight(text, query) {
  if (!query || !text) return text ?? ''
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-100 text-amber-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function SearchModal({ onClose }) {
  const navigate = useNavigate()
  const inputRef  = useRef(null)
  const listRef   = useRef(null)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState({ jobs: [], candidates: [], submissions: [], companies: [] })
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  const flatResults = GROUPS.flatMap(g => results[g.key].map(r => ({ ...r, _group: g.key })))

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults({ jobs: [], candidates: [], submissions: [], companies: [] }); return }
    setLoading(true)
    const like = `%${q}%`

    const [jobsRes, candidatesRes, subsRes, companiesRes] = await Promise.all([
      supabase.from('jobs').select('id, title, location, employment_type, status')
        .or(`title.ilike.${like},location.ilike.${like}`)
        .eq('status', 'open')
        .limit(5),
      supabase.from('candidates').select('id, full_name, current_title, current_company, skills')
        .or(`full_name.ilike.${like},current_title.ilike.${like}`)
        .limit(5),
      supabase.from('submissions').select('id, stage, job_id, candidate_id, candidates(full_name, current_title), jobs(title)')
        .limit(5),
      supabase.from('profiles').select('id, full_name, email, role')
        .eq('role', 'client')
        .ilike('full_name', like)
        .limit(5),
    ])

    // Filter submissions client-side for candidate name or job title match
    const subQ = q.toLowerCase()
    const filteredSubs = (subsRes.data ?? []).filter(s =>
      s.candidates?.full_name?.toLowerCase().includes(subQ) ||
      s.jobs?.title?.toLowerCase().includes(subQ)
    ).slice(0, 5)

    setResults({
      jobs:        jobsRes.data ?? [],
      candidates:  candidatesRes.data ?? [],
      submissions: filteredSubs,
      companies:   companiesRes.data ?? [],
    })
    setLoading(false)
    setActiveIdx(-1)
  }, [])

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Keyboard navigation
  function onKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && flatResults[activeIdx]) {
        navigateTo(flatResults[activeIdx])
      }
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return
    const items = listRef.current.querySelectorAll('[data-result-item]')
    items[activeIdx]?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  function navigateTo(item) {
    switch (item._group) {
      case 'jobs':        navigate(`/manage/jobs`); break
      case 'candidates':  navigate(`/candidates`); break
      case 'submissions': navigate(`/pipeline?job=${item.job_id}`); break
      case 'companies':   navigate(`/dashboard`); break
    }
    onClose()
  }

  const totalResults = flatResults.length
  const hasResults   = totalResults > 0
  const searched     = query.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search jobs, candidates, submissions…"
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          {query && !loading && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 shrink-0">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono bg-gray-100 text-gray-500 rounded border border-gray-200 shrink-0">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {!searched ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Type to search across jobs, candidates, submissions and companies.
            </div>
          ) : !hasResults && !loading ? (
            <div className="px-5 py-10 text-center">
              <Search size={32} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">No results for "{query}"</p>
              <p className="text-xs text-gray-400 mt-1">Try different keywords or check the spelling.</p>
            </div>
          ) : (
            <div className="py-2">
              {GROUPS.map(group => {
                const items = results[group.key]
                if (!items.length) return null
                const Icon = group.icon
                // Track flat index for keyboard nav
                const groupOffset = GROUPS.slice(0, GROUPS.indexOf(group))
                  .reduce((sum, g) => sum + results[g.key].length, 0)

                return (
                  <div key={group.key}>
                    <div className="px-4 py-1.5 flex items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${group.color}`}>
                        {group.label}
                      </span>
                      <span className="text-xs text-gray-300">{items.length}</span>
                    </div>
                    {items.map((item, i) => {
                      const flatIdx = groupOffset + i
                      const isActive = flatIdx === activeIdx
                      return (
                        <button
                          key={item.id}
                          data-result-item
                          onClick={() => navigateTo({ ...item, _group: group.key })}
                          onMouseEnter={() => setActiveIdx(flatIdx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isActive ? 'bg-brand-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${group.bg}`}>
                            <Icon size={13} className={group.color} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <ResultLabel item={item} group={group.key} query={query} />
                          </div>
                          {isActive && <ArrowRight size={14} className="text-gray-400 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {hasResults && (
          <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> open</span>
            <span><kbd className="font-mono">Esc</kbd> close</span>
            <span className="ml-auto">{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ResultLabel({ item, group, query }) {
  switch (group) {
    case 'jobs':
      return (
        <>
          <p className="text-sm font-medium text-gray-800 truncate">{highlight(item.title, query)}</p>
          <p className="text-xs text-gray-400 truncate">{item.location ?? ''}{item.employment_type ? ` · ${item.employment_type}` : ''}</p>
        </>
      )
    case 'candidates':
      return (
        <>
          <p className="text-sm font-medium text-gray-800 truncate">{highlight(item.full_name, query)}</p>
          <p className="text-xs text-gray-400 truncate">{item.current_title ?? ''}{item.current_company ? ` @ ${item.current_company}` : ''}</p>
        </>
      )
    case 'submissions':
      return (
        <>
          <p className="text-sm font-medium text-gray-800 truncate">{highlight(item.candidates?.full_name, query)}</p>
          <p className="text-xs text-gray-400 truncate">{item.jobs?.title ?? ''} · {item.stage}</p>
        </>
      )
    case 'companies':
      return (
        <>
          <p className="text-sm font-medium text-gray-800 truncate">{highlight(item.full_name, query)}</p>
          <p className="text-xs text-gray-400 truncate">{item.email}</p>
        </>
      )
    default:
      return null
  }
}
