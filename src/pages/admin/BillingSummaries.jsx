import { useMemo, useState } from 'react'
import { Users, CalendarDays, UserRound, CalendarRange } from 'lucide-react'

// Read-only aggregation over billing_records using STORED values only.
// Revenue = inr_total (taxable, EXCLUDES GST/TDS). All totals are INR.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const num = v => Number(v) || 0
const fmtINR = v => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(num(v))

function formatMonth(ym) {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`
}

// FY (Apr–Mar) start year for a billing_month (YYYY-MM-DD / YYYY-MM).
function fyStartYear(monthStr) {
  if (!monthStr) return null
  const [y, m] = monthStr.split('-').map(Number)
  return m >= 4 ? y : y - 1
}
const fyLabel = startY => `FY${startY}-${String((startY + 1) % 100).padStart(2, '0')}`

// Sum the metric set for an array of rows.
function metricsOf(rows) {
  const m = { count: 0, revenue: 0, gst: 0, tds: 0, invoiceValue: 0, bankTransfer: 0, received: 0, outstanding: 0 }
  for (const r of rows) {
    m.count        += 1
    m.revenue      += num(r.inr_total)
    m.gst          += num(r.gst_amount)
    m.tds          += num(r.tds_amount)
    m.invoiceValue += num(r.total_invoice_value)
    m.bankTransfer += num(r.bank_transfer)
    m.received     += num(r.amount_received)
    m.outstanding  += Math.max(0, num(r.bank_transfer) - num(r.amount_received))
  }
  return m
}

// Group rows by a key function, return [{ key, label, ...metrics }], pre-sorted by caller.
function groupBy(rows, keyFn, labelFn) {
  const map = new Map()
  for (const r of rows) {
    const k = keyFn(r) ?? '—'
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(r)
  }
  return [...map.entries()].map(([key, rs]) => ({ key, label: labelFn(key), ...metricsOf(rs) }))
}

const SUBVIEWS = [
  { id: 'client',     label: 'By Client',     icon: Users },
  { id: 'month',      label: 'By Month',      icon: CalendarDays },
  { id: 'contractor', label: 'By Contractor', icon: UserRound },
  { id: 'fy',         label: 'FY Summary',    icon: CalendarRange },
]

export default function BillingSummaries({ records }) {
  const [sub, setSub]         = useState('client')
  const [fClient, setFClient] = useState('')

  const clientOptions = useMemo(
    () => [...new Set(records.map(r => r.client_name).filter(Boolean))].sort(),
    [records],
  )

  // Client filter applies to By Month / By Contractor / FY (By Client lists all).
  const scoped = useMemo(
    () => (fClient ? records.filter(r => r.client_name === fClient) : records),
    [records, fClient],
  )

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 text-center py-14">
        <CalendarRange size={36} className="mx-auto text-gray-300 mb-3" />
        <p className="font-medium text-gray-500">No billing records to summarize</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {SUBVIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id} onClick={() => setSub(id)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                sub === id ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-white text-gray-500 border-gray-200 hover:text-gray-700'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        {sub !== 'client' && (
          <select value={fClient} onChange={e => setFClient(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">All clients</option>
            {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {sub === 'client' && (
        <GroupTable
          firstCol="Client"
          rows={groupBy(records, r => r.client_name, k => k).sort((a, b) => b.revenue - a.revenue)}
        />
      )}

      {sub === 'month' && (
        <GroupTable
          firstCol="Month"
          rows={groupBy(scoped, r => (r.billing_month ? r.billing_month.slice(0, 7) : null), formatMonth)
            .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0))}
        />
      )}

      {sub === 'contractor' && (
        <GroupTable
          firstCol="Contractor"
          rows={groupBy(scoped, r => r.contractor_name, k => k).sort((a, b) => b.revenue - a.revenue)}
        />
      )}

      {sub === 'fy' && <FYSummary rows={scoped} />}
    </div>
  )
}

// ── FY view ───────────────────────────────────────────────────────────────────
function FYSummary({ rows }) {
  const fyYears = useMemo(() => {
    const set = new Set()
    for (const r of rows) { const y = fyStartYear(r.billing_month); if (y != null) set.add(y) }
    return [...set].sort((a, b) => b - a)
  }, [rows])

  const currentFY = fyStartYear(new Date().toISOString().slice(0, 10))
  const [fy, setFy] = useState(() =>
    fyYears.includes(currentFY) ? currentFY : (fyYears[0] ?? currentFY),
  )

  // Apr (start year) .. Mar (start year + 1)
  const monthRows = useMemo(() => {
    const out = []
    for (let i = 0; i < 12; i++) {
      const mIndex = ((3 + i) % 12)               // 0-based; 3 = April
      const year   = mIndex >= 3 ? fy : fy + 1
      const ym     = `${year}-${String(mIndex + 1).padStart(2, '0')}`
      const rs     = rows.filter(r => r.billing_month && r.billing_month.slice(0, 7) === ym)
      out.push({ key: ym, label: formatMonth(ym), ...metricsOf(rs) })
    }
    return out
  }, [rows, fy])

  const fyTotals = useMemo(() => metricsOf(
    rows.filter(r => fyStartYear(r.billing_month) === fy),
  ), [rows, fy])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700">Financial Year</label>
        <select value={fy} onChange={e => setFy(Number(e.target.value))} className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          {(fyYears.length ? fyYears : [fy]).map(y => <option key={y} value={y}>{fyLabel(y)} (Apr {y} – Mar {y + 1})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card label="FY Revenue"       value={fmtINR(fyTotals.revenue)} />
        <Card label="FY GST Collected" value={fmtINR(fyTotals.gst)} />
        <Card label="FY TDS"           value={fmtINR(fyTotals.tds)} />
        <Card label="FY Outstanding"   value={fmtINR(fyTotals.outstanding)} />
      </div>

      <GroupTable firstCol="Month" rows={monthRows} totals={fyTotals} dimZero />
    </div>
  )
}

// ── Shared table ───────────────────────────────────────────────────────────────
function GroupTable({ firstCol, rows, totals, dimZero }) {
  const grand = totals ?? metricsOf([])
  if (!totals) {
    for (const r of rows) {
      grand.revenue += r.revenue; grand.gst += r.gst; grand.tds += r.tds
      grand.invoiceValue += r.invoiceValue; grand.bankTransfer += r.bankTransfer
      grand.received += r.received; grand.outstanding += r.outstanding; grand.count += r.count
    }
  }

  const cols = ['Rows', 'Revenue', 'GST Collected', 'TDS', 'Invoice Value', 'Bank Transfer', 'Received', 'Outstanding']

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-xs whitespace-nowrap">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100 text-left">
            <th className="px-3 py-3 font-medium text-gray-500 uppercase tracking-wide">{firstCol}</th>
            {cols.map(h => <th key={h} className="px-3 py-3 font-medium text-gray-500 uppercase tracking-wide text-right">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(r => (
            <tr key={r.key} className={`hover:bg-gray-50 ${dimZero && r.count === 0 ? 'text-gray-300' : ''}`}>
              <td className="px-3 py-3 font-medium text-gray-800">{r.label}</td>
              <td className="px-3 py-3 text-right text-gray-600">{r.count}</td>
              <td className="px-3 py-3 text-right font-semibold text-gray-800">{fmtINR(r.revenue)}</td>
              <td className="px-3 py-3 text-right text-gray-600">{fmtINR(r.gst)}</td>
              <td className="px-3 py-3 text-right text-gray-600">{fmtINR(r.tds)}</td>
              <td className="px-3 py-3 text-right text-gray-600">{fmtINR(r.invoiceValue)}</td>
              <td className="px-3 py-3 text-right text-gray-600">{fmtINR(r.bankTransfer)}</td>
              <td className="px-3 py-3 text-right text-gray-600">{fmtINR(r.received)}</td>
              <td className="px-3 py-3 text-right font-semibold text-gray-800">{fmtINR(r.outstanding)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-gray-800">
            <td className="px-3 py-3">Total</td>
            <td className="px-3 py-3 text-right">{grand.count}</td>
            <td className="px-3 py-3 text-right">{fmtINR(grand.revenue)}</td>
            <td className="px-3 py-3 text-right">{fmtINR(grand.gst)}</td>
            <td className="px-3 py-3 text-right">{fmtINR(grand.tds)}</td>
            <td className="px-3 py-3 text-right">{fmtINR(grand.invoiceValue)}</td>
            <td className="px-3 py-3 text-right">{fmtINR(grand.bankTransfer)}</td>
            <td className="px-3 py-3 text-right">{fmtINR(grand.received)}</td>
            <td className="px-3 py-3 text-right">{fmtINR(grand.outstanding)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function Card({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-bold text-gray-800 mt-1">{value}</p>
    </div>
  )
}
