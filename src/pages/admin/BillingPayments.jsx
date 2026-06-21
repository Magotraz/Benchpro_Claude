import { useMemo, useState } from 'react'
import { Wallet, AlertTriangle } from 'lucide-react'
import {
  expectedFor, outstandingFor, isOverdue, ageDays, ageingBucket,
  PAYMENT_BADGE, fmtMoney,
} from '../../lib/billingPayments'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatMonth(dateStr) {
  if (!dateStr) return '—'
  const [y, m] = dateStr.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`
}
const fmtDate = v => v ? new Date(v).toLocaleDateString('en-IN') : '—'

// Outstanding tracker. Admin-only; rendered as a sub-tab inside the Billing module.
export default function BillingPayments({ records, clients }) {
  const [fClient, setFClient] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fMonth, setFMonth]   = useState('')

  const clientById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])

  // Decorate each row with derived payment figures (stored values only).
  const rows = useMemo(() => records.map(r => {
    const client = r.client_id ? clientById[r.client_id] : null
    const { expected, received, outstanding, currency } = outstandingFor(r, client)
    const age = ageDays(r.invoice_date)
    return { r, expected, received, outstanding, currency, age, overdue: isOverdue(r) }
  }), [records, clientById])

  const monthOptions = useMemo(
    () => [...new Set(records.map(r => r.billing_month).filter(Boolean))].sort().reverse(),
    [records],
  )
  const clientOptions = useMemo(
    () => [...new Set(records.map(r => r.client_name).filter(Boolean))].sort(),
    [records],
  )

  const filtered = rows.filter(({ r, overdue }) => {
    if (fClient && r.client_name !== fClient) return false
    if (fMonth && r.billing_month !== fMonth) return false
    if (fStatus === 'overdue') return overdue
    if (fStatus && r.payment_status !== fStatus) return false
    return true
  })

  // Default sort: overdue first, then oldest invoice_date.
  const sorted = [...filtered].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    const da = a.r.invoice_date || '9999-12-31'
    const db = b.r.invoice_date || '9999-12-31'
    return da < db ? -1 : da > db ? 1 : 0
  })

  // Summary totals — INR and USD kept strictly separate.
  const totals = useMemo(() => {
    const t = {
      outstanding: { INR: 0, USD: 0 },
      received:    { INR: 0, USD: 0 },
      overdue:     { INR: 0, USD: 0, count: 0 },
    }
    for (const row of rows) {
      t.outstanding[row.currency] += row.outstanding
      t.received[row.currency]    += row.received
      if (row.overdue) {
        t.overdue[row.currency] += row.outstanding
        t.overdue.count += 1
      }
    }
    return t
  }, [rows])

  return (
    <div className="space-y-5">
      {/* Summary cards — INR and USD shown separately, never combined */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Wallet size={18} className="text-amber-600" />} tint="amber"
          title="Outstanding"
          inr={totals.outstanding.INR} usd={totals.outstanding.USD}
        />
        <SummaryCard
          icon={<Wallet size={18} className="text-emerald-600" />} tint="emerald"
          title="Received"
          inr={totals.received.INR} usd={totals.received.USD}
        />
        <SummaryCard
          icon={<AlertTriangle size={18} className="text-red-600" />} tint="red"
          title={`Overdue (${totals.overdue.count})`}
          inr={totals.overdue.INR} usd={totals.overdue.USD}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={fClient} onChange={e => setFClient(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All clients</option>
          {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="received">Received</option>
          <option value="overdue">Overdue</option>
        </select>
        <select value={fMonth} onChange={e => setFMonth(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All months</option>
          {monthOptions.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
        {(fClient || fStatus || fMonth) && (
          <button onClick={() => { setFClient(''); setFStatus(''); setFMonth('') }} className="text-sm text-gray-500 hover:text-gray-700">Clear filters</button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-14">
          <Wallet size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No matching invoices</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                {['Contractor', 'Client', 'Month', 'Invoice #', 'Inv Date', 'Age', 'Expected', 'Received', 'Outstanding', 'Status', 'Overdue'].map(h => (
                  <th key={h} className="px-3 py-3 font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(({ r, expected, received, outstanding, currency, age, overdue }) => {
                const bucket = ageingBucket(age)
                const badge = PAYMENT_BADGE[r.payment_status] ?? PAYMENT_BADGE.pending
                return (
                  <tr key={r.id} className={`hover:bg-gray-50 ${bucket === '90+' ? 'bg-red-50/60' : ''}`}>
                    <td className="px-3 py-3 font-medium text-gray-800">{r.contractor_name}</td>
                    <td className="px-3 py-3 text-gray-600">{r.client_name}</td>
                    <td className="px-3 py-3 text-gray-600">{formatMonth(r.billing_month)}</td>
                    <td className="px-3 py-3 text-gray-500">{r.invoice_no || '—'}</td>
                    <td className="px-3 py-3 text-gray-500">{fmtDate(r.invoice_date)}</td>
                    <td className="px-3 py-3 text-gray-600">
                      {age == null ? '—' : `${age}d`}
                      {bucket !== 'Current' && bucket !== '—' && (
                        <span className="ml-1 text-gray-400">({bucket})</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-600">{fmtMoney(expected, currency)}</td>
                    <td className="px-3 py-3 text-gray-600">{fmtMoney(received, currency)}</td>
                    <td className="px-3 py-3 font-semibold text-gray-800">{fmtMoney(outstanding, currency)}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-3 py-3">
                      {overdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                          <AlertTriangle size={11} /> Overdue
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const TINT = {
  amber:   'bg-amber-100',
  emerald: 'bg-emerald-100',
  red:     'bg-red-100',
}

function SummaryCard({ icon, tint, title, inr, usd }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${TINT[tint]}`}>{icon}</div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-xl font-bold text-gray-800">{fmtMoney(inr, 'INR')}</p>
        <p className="text-sm font-semibold text-gray-500">{fmtMoney(usd, 'USD')}</p>
      </div>
    </div>
  )
}
