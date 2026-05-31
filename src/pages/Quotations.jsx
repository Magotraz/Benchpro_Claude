import { useState, useEffect } from 'react'
import { Plus, ReceiptText, TrendingUp, IndianRupee, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { createNotification } from '../lib/notifications'
import { logAudit } from '../lib/audit'
import { formatCurrency } from '../lib/utils'
import Modal from '../components/Modal'

function exportCSV(quotes) {
  const headers = ['Quote #', 'Candidate', 'Job', 'Client', 'Fee Amount', 'Fee Type', 'Currency', 'Status', 'Created']
  const rows = quotes.map(q => [
    q.quote_number ?? '',
    q.candidate_name ?? '',
    q.jobs?.title ?? '',
    q.profiles?.full_name ?? q.profiles?.email ?? '',
    q.fee_amount ?? '',
    q.fee_type ?? '',
    q.currency ?? '',
    q.status ?? '',
    q.created_at ? new Date(q.created_at).toLocaleDateString('en-IN') : '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `benchpro-quotations-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const STATUS_COLORS = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
  invoiced: 'bg-indigo-100 text-indigo-700',
}
const STATUS_LABELS = { draft: 'Draft', sent: 'Sent', approved: 'Approved', rejected: 'Rejected', invoiced: 'Invoiced' }
const NEXT_STATUS   = { draft: 'sent', sent: 'approved', approved: 'invoiced' }

const EMPTY = {
  candidate_name: '', job_id: '', fee_type: 'percentage',
  fee_value: '', annual_salary: '', currency: 'INR',
  valid_until: '', notes: '',
}

function calcFee(form) {
  const salary = parseFloat(form.annual_salary) || 0
  const val    = parseFloat(form.fee_value) || 0
  return form.fee_type === 'percentage' ? (salary * val) / 100 : val
}

export default function Quotations() {
  const { user, profile } = useAuth()
  const [quotes, setQuotes]   = useState([])
  const [jobs, setJobs]       = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [advancing, setAdvancing] = useState(null)
  const [error, setError]     = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [quotesRes, jobsRes, clientsRes] = await Promise.all([
      supabase.from('quotations').select('*, jobs(title), profiles!client_id(full_name, email)').order('created_at', { ascending: false }),
      supabase.from('jobs').select('id, title, client_id').eq('status', 'open').order('title'),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'client'),
    ])
    setQuotes(quotesRes.data ?? [])
    setJobs(jobsRes.data ?? [])
    setClients(clientsRes.data ?? [])
    setLoading(false)
  }

  function openCreate() { setForm(EMPTY); setError(''); setModal(true) }

  function setField(key) { return (e) => setForm(f => ({ ...f, [key]: e.target.value })) }

  function onJobChange(e) {
    const jobId   = e.target.value
    const job     = jobs.find(j => j.id === jobId)
    const client  = clients.find(c => c.id === job?.client_id)
    setForm(f => ({ ...f, job_id: jobId, client_id: job?.client_id ?? '' }))
  }

  const feeAmount = calcFee(form)

  async function save(e) {
    e.preventDefault(); setError(''); setSaving(true)
    const { data: countData } = await supabase.from('quotations').select('id', { count: 'exact', head: true })
    const num = `Q-${new Date().getFullYear()}-${String((countData ?? []).length + 1).padStart(3, '0')}`
    const job = jobs.find(j => j.id === form.job_id)
    const { error: err } = await supabase.from('quotations').insert({
      quote_number:   num,
      job_id:         form.job_id || null,
      client_id:      job?.client_id || null,
      candidate_name: form.candidate_name,
      created_by:     user.id,
      status:         'draft',
      fee_type:       form.fee_type,
      fee_value:      parseFloat(form.fee_value) || 0,
      annual_salary:  parseFloat(form.annual_salary) || null,
      fee_amount:     feeAmount,
      currency:       form.currency,
      valid_until:    form.valid_until || null,
      notes:          form.notes,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setModal(false); loadAll(); setSaving(false)
  }

  async function advance(q) {
    const next = NEXT_STATUS[q.status]
    if (!next) return
    setAdvancing(q.id)
    await supabase.from('quotations').update({ status: next, updated_at: new Date().toISOString() }).eq('id', q.id)
    setQuotes(prev => prev.map(x => x.id === q.id ? { ...x, status: next } : x))
    setAdvancing(null)
    logAudit({
      userId: user.id, userName: profile?.full_name ?? user.email,
      action: 'updated', entityType: 'quotation', entityId: q.id,
      entityName: q.quote_number, oldValue: q.status, newValue: next,
    })

    const title = 'Quotation status updated'
    const body  = `${q.quote_number} moved to ${STATUS_LABELS[next]}`
    createNotification(q.created_by, 'quotation_status', title, body, '/quotations')
    supabase.from('profiles').select('id').eq('role', 'super_recruiter').then(({ data }) => {
      for (const p of data ?? []) {
        if (p.id !== q.created_by) createNotification(p.id, 'quotation_status', title, body, '/quotations')
      }
    })
  }

  const approvedRevenue = quotes
    .filter(q => q.status === 'approved' || q.status === 'invoiced')
    .reduce((sum, q) => sum + (q.fee_amount ?? 0), 0)
  const pendingFees = quotes
    .filter(q => q.status === 'sent' || q.status === 'draft')
    .reduce((sum, q) => sum + (q.fee_amount ?? 0), 0)
  const currency = quotes[0]?.currency ?? 'INR'

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl p-5 text-white flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-sm">Approved Revenue (All-time)</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(approvedRevenue, currency)}</p>
            <p className="text-indigo-300 text-xs mt-1">{quotes.filter(q => q.status === 'approved' || q.status === 'invoiced').length} approved quotes</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <IndianRupee size={22} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 font-medium">Pending Fees</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(pendingFees, currency)}</p>
          <p className="text-xs text-gray-400 mt-1">{quotes.filter(q => q.status === 'sent' || q.status === 'draft').length} open quotes</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Quotations</h1>
          <p className="text-sm text-gray-500">{quotes.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          {quotes.length > 0 && (
            <button
              onClick={() => exportCSV(quotes)}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>
          )}
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus size={16} /> New Quotation
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : quotes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-14">
          <ReceiptText size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No quotations yet</p>
          <button onClick={openCreate} className="mt-4 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">New Quotation</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Quote #</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Client</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Job</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Candidate</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fee</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotes.map(q => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <p className="font-mono text-xs text-gray-500 font-medium">{q.quote_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{q.created_at ? new Date(q.created_at).toLocaleDateString('en-IN') : ''}</p>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">
                    {q.profiles?.full_name ?? q.profiles?.email ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 hidden lg:table-cell">{q.jobs?.title ?? '—'}</td>
                  <td className="px-5 py-3.5 text-gray-600 hidden sm:table-cell">{q.candidate_name || '—'}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-800">{formatCurrency(q.fee_amount ?? 0, q.currency)}</p>
                    <p className="text-xs text-gray-400">
                      {q.fee_type === 'percentage'
                        ? `${q.fee_value}% of ${formatCurrency(q.annual_salary ?? 0, q.currency)}`
                        : 'Fixed fee'}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[q.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[q.status] ?? q.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {NEXT_STATUS[q.status] && (
                      <button
                        onClick={() => advance(q)}
                        disabled={advancing === q.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-brand-50 hover:text-brand-700 text-gray-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {advancing === q.id ? '…' : <>
                          <TrendingUp size={11} />
                          Mark {STATUS_LABELS[NEXT_STATUS[q.status]]}
                        </>}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Quotation Modal */}
      {modal && (
        <Modal title="New Quotation" onClose={() => setModal(false)} wide>
          {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Name <span className="text-red-500">*</span></label>
                <input required value={form.candidate_name} onChange={setField('candidate_name')} placeholder="Jane Doe"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job</label>
                <select value={form.job_id} onChange={onJobChange}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="">Select job…</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>

              {/* Fee type toggle */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Fee Structure</label>
                <div className="flex gap-3">
                  {['percentage', 'fixed'].map(ft => (
                    <button
                      key={ft} type="button"
                      onClick={() => setForm(f => ({ ...f, fee_type: ft }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.fee_type === ft
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                      }`}
                    >
                      {ft === 'percentage' ? '% of Salary' : 'Fixed Amount'}
                    </button>
                  ))}
                </div>
              </div>

              {form.fee_type === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Salary <span className="text-red-500">*</span></label>
                  <input type="number" required={form.fee_type === 'percentage'} value={form.annual_salary} onChange={setField('annual_salary')} placeholder="1200000"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.fee_type === 'percentage' ? 'Fee %' : 'Fixed Fee Amount'} <span className="text-red-500">*</span>
                </label>
                <input type="number" required step="0.1" value={form.fee_value} onChange={setField('fee_value')}
                  placeholder={form.fee_type === 'percentage' ? '8.33' : '150000'}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>

              {/* Live fee preview */}
              {feeAmount > 0 && (
                <div className="col-span-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-emerald-800">Calculated fee</span>
                  <span className="text-lg font-bold text-emerald-700">{formatCurrency(feeAmount, form.currency)}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select value={form.currency} onChange={setField('currency')}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="INR">INR ₹</option>
                  <option value="USD">USD $</option>
                  <option value="GBP">GBP £</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input type="date" value={form.valid_until} onChange={setField('valid_until')}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={setField('notes')} placeholder="Any additional terms or notes…"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : 'Create Quotation'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
