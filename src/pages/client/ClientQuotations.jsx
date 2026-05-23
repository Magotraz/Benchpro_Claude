import { useEffect, useState } from 'react'
import { ReceiptText, CheckCircle, XCircle, IndianRupee } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'

const STATUS_COLORS = {
  draft:    'bg-gray-100 text-gray-500',
  sent:     'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
  invoiced: 'bg-indigo-100 text-indigo-700',
}
const STATUS_LABELS = {
  draft: 'Draft', sent: 'Awaiting Approval', approved: 'Approved', rejected: 'Rejected', invoiced: 'Invoiced',
}

export default function ClientQuotations() {
  const [quotes, setQuotes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('quotations')
      .select('*, jobs(title)')
      .order('created_at', { ascending: false })
    setQuotes(data ?? [])
    setLoading(false)
  }

  async function decide(q, decision) {
    setActing(q.id)
    await supabase
      .from('quotations')
      .update({ status: decision, updated_at: new Date().toISOString() })
      .eq('id', q.id)
    setQuotes(prev => prev.map(x => x.id === q.id ? { ...x, status: decision } : x))
    setActing(null)
  }

  const approvedTotal = quotes
    .filter(q => q.status === 'approved' || q.status === 'invoiced')
    .reduce((s, q) => s + (q.fee_amount ?? 0), 0)

  const currency = quotes[0]?.currency ?? 'INR'
  const pending  = quotes.filter(q => q.status === 'sent')

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 bg-gradient-to-r from-brand-700 to-brand-600 rounded-xl p-5 text-white flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-sm">Total Approved Fees</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(approvedTotal, currency)}</p>
            <p className="text-indigo-300 text-xs mt-1">
              {quotes.filter(q => q.status === 'approved' || q.status === 'invoiced').length} approved placements
            </p>
          </div>
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <IndianRupee size={20} />
          </div>
        </div>
        <div className={`bg-white rounded-xl border p-5 flex flex-col justify-center ${pending.length > 0 ? 'border-amber-200' : 'border-gray-200'}`}>
          <p className="text-sm font-medium text-gray-600">Awaiting Your Approval</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{pending.length}</p>
          {pending.length > 0 && (
            <p className="text-xs text-amber-600 mt-1 font-medium">Action required</p>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-800">Quotations</h1>
        <p className="text-sm text-gray-500">{quotes.length} total</p>
      </div>

      {quotes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <ReceiptText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No quotations yet</p>
          <p className="text-sm text-gray-400 mt-1">Fee quotations from your recruiter will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map(q => (
            <div
              key={q.id}
              className={`bg-white rounded-xl border p-5 transition-shadow hover:shadow-md ${
                q.status === 'sent' ? 'border-amber-200 ring-1 ring-amber-100' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-gray-400 font-medium">{q.quote_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[q.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[q.status] ?? q.status}
                    </span>
                  </div>

                  <p className="font-semibold text-gray-800 mt-1">
                    {q.jobs?.title ?? 'Placement Fee'}
                    {q.candidate_name ? ` — ${q.candidate_name}` : ''}
                  </p>

                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
                    <p className="text-2xl font-bold text-brand-700">
                      {formatCurrency(q.fee_amount ?? 0, q.currency)}
                    </p>
                    <p className="text-sm text-gray-400">
                      {q.fee_type === 'percentage'
                        ? `${q.fee_value}% of ${formatCurrency(q.annual_salary ?? 0, q.currency)} annual salary`
                        : 'Fixed placement fee'}
                    </p>
                  </div>

                  {q.valid_until && (
                    <p className="text-xs text-gray-400 mt-1">
                      Valid until {new Date(q.valid_until).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                    </p>
                  )}
                  {q.notes && (
                    <p className="text-sm text-gray-500 mt-2 italic">"{q.notes}"</p>
                  )}
                </div>

                {/* Action buttons — only for 'sent' quotes */}
                {q.status === 'sent' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => decide(q, 'rejected')}
                      disabled={acting === q.id}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={15} /> Decline
                    </button>
                    <button
                      onClick={() => decide(q, 'approved')}
                      disabled={acting === q.id}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {acting === q.id
                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><CheckCircle size={15} /> Approve</>}
                    </button>
                  </div>
                )}

                {q.status === 'approved' && (
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium shrink-0">
                    <CheckCircle size={15} /> Approved
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-3">
                Issued {q.created_at ? new Date(q.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' }) : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
