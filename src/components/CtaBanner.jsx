import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'

const DISMISS_KEY = 'benchpro_cta_dismissed'
const DISMISS_TTL = 24 * 60 * 60 * 1000

export default function CtaBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY)
    if (!stored || Date.now() - Number(stored) > DISMISS_TTL) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-brand-900 text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-sm">Looking to hire top talent?</p>
          <p className="text-xs text-indigo-300 mt-0.5">BenchPro connects companies with pre-vetted candidates faster.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/request-demo"
            className="px-4 py-2 text-sm font-medium bg-brand-500 hover:bg-brand-400 text-white rounded-lg transition-colors"
          >
            Request Demo
          </Link>
          <button onClick={dismiss} className="p-1.5 text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
