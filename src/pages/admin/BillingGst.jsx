import { useMemo, useState } from 'react'
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Quarterly GST filing dashboard. GST is filed QUARTERLY, combined across ALL
// clients, keyed off invoice_date (NOT billing_month). Read-only aggregation;
// the only write is the bulk "mark quarter filed" which flips gstr1_closed /
// gstr3b_closed on every row in the quarter.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Indian fiscal quarter + statutory due dates, derived from an invoice_date.
//   Q1 Apr-Jun -> GSTR1 Jul 13, GSTR3B Jul 22 (same FY-start year)
//   Q2 Jul-Sep -> GSTR1 Oct 13, GSTR3B Oct 22
//   Q3 Oct-Dec -> GSTR1 Jan 13, GSTR3B Jan 22 (next year)
//   Q4 Jan-Mar -> GSTR1 Apr 13, GSTR3B Apr 22 (same calendar year as invoices)
const QDEF = {
  1: { months: 'Apr-Jun', startYearOffset: 0, rangeYearOffset: 0, gstr1: y => `${y}-07-13`,     gstr3b: y => `${y}-07-22`,     sortMonth: 4 },
  2: { months: 'Jul-Sep', startYearOffset: 0, rangeYearOffset: 0, gstr1: y => `${y}-10-13`,     gstr3b: y => `${y}-10-22`,     sortMonth: 7 },
  3: { months: 'Oct-Dec', startYearOffset: 0, rangeYearOffset: 0, gstr1: y => `${y + 1}-01-13`, gstr3b: y => `${y + 1}-01-22`, sortMonth: 10 },
  4: { months: 'Jan-Mar', startYearOffset: 1, rangeYearOffset: 1, gstr1: y => `${y + 1}-04-13`, gstr3b: y => `${y + 1}-04-22`, sortMonth: 1 },
}

function quarterOf(dateStr) {
  const [y, m] = dateStr.split('-').map(Number)
  if (m >= 4 && m <= 6)  return { fyStart: y,     q: 1 }
  if (m >= 7 && m <= 9)  return { fyStart: y,     q: 2 }
  if (m >= 10)           return { fyStart: y,     q: 3 }
  return { fyStart: y - 1, q: 4 } // Jan-Mar belong to the prior FY-start year
}

const fyLabel = fy => `FY${fy}-${String((fy + 1) % 100).padStart(2, '0')}`

function quarterLabel(fyStart, q) {
  const def = QDEF[q]
  const calYear = fyStart + def.rangeYearOffset
  return `Q${q} ${fyLabel(fyStart)} (${def.months} ${calYear})`
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`
}

const today = () => new Date().toISOString().slice(0, 10)

// Status of a filing flag across a quarter's rows.
function statusOf(rows, flag) {
  const total  = rows.length
  const closed = rows.filter(r => r[flag]).length
  let status = 'pending'
  if (closed === total && total > 0) status = 'filed'
  else if (closed > 0)               status = 'partial'
  return { status, total, closed, unfiled: total - closed }
}

const STATUS_BADGE = {
  filed:   { cls: 'bg-emerald-100 text-emerald-700', label: 'Filed' },
  partial: { cls: 'bg-amber-100 text-amber-700',     label: 'Partial' },
  pending: { cls: 'bg-red-100 text-red-700',         label: 'Pending' },
}

export default function BillingGst({ records, onChanged }) {
  const [busy, setBusy]   = useState(null) // `${qkey}:${flag}`
  const [error, setError] = useState('')

  // Group invoiced rows (invoice_date present) into quarters.
  const quarters = useMemo(() => {
    const map = new Map()
    for (const r of records) {
      if (!r.invoice_date) continue
      const { fyStart, q } = quarterOf(r.invoice_date)
      const key = `${fyStart}-Q${q}`
      if (!map.has(key)) map.set(key, { key, fyStart, q, rows: [] })
      map.get(key).rows.push(r)
    }
    const arr = [...map.values()].map(grp => {
      const def = QDEF[grp.q]
      const gstr1Due  = def.gstr1(grp.fyStart)
      const gstr3bDue = def.gstr3b(grp.fyStart)
      const g1 = statusOf(grp.rows, 'gstr1_closed')
      const g3 = statusOf(grp.rows, 'gstr3b_closed')
      const t = today()
      return {
        ...grp,
        label: quarterLabel(grp.fyStart, grp.q),
        rangeYear: grp.fyStart + def.rangeYearOffset,
        sortKey: `${grp.fyStart + def.rangeYearOffset}-${String(def.sortMonth).padStart(2, '0')}`,
        count: grp.rows.length,
        gstr1Due, gstr3bDue,
        g1, g3,
        g1Overdue: g1.status !== 'filed' && t > gstr1Due,
        g3Overdue: g3.status !== 'filed' && t > gstr3bDue,
      }
    })
    // Most recent quarters first.
    return arr.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0))
  }, [records])

  // Next upcoming statutory due date across quarters still needing filing.
  const nextDue = useMemo(() => {
    const t = today()
    const dues = []
    for (const qq of quarters) {
      if (qq.g1.status !== 'filed' && qq.gstr1Due >= t) dues.push({ date: qq.gstr1Due, kind: 'GSTR1', q: qq.label })
      if (qq.g3.status !== 'filed' && qq.gstr3bDue >= t) dues.push({ date: qq.gstr3bDue, kind: 'GSTR3B', q: qq.label })
    }
    dues.sort((a, b) => (a.date < b.date ? -1 : 1))
    return dues[0] ?? null
  }, [quarters])

  const recent = quarters[0]

  async function markFiled(qq, flag) {
    const fileLabel = flag === 'gstr1_closed' ? 'GSTR1' : 'GSTR3B'
    if (!window.confirm(`Mark ${fileLabel} filed for all ${qq.count} invoice${qq.count === 1 ? '' : 's'} in ${qq.label}?`)) return
    setBusy(`${qq.key}:${flag}`); setError('')
    const ids = qq.rows.map(r => r.id)
    const { error: err } = await supabase.from('billing_records').update({ [flag]: true }).in('id', ids)
    setBusy(null)
    if (err) { setError(err.message); return }
    onChanged?.()
  }

  if (quarters.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 text-center py-14">
        <ShieldCheck size={36} className="mx-auto text-gray-300 mb-3" />
        <p className="font-medium text-gray-500">No invoiced records to file yet</p>
        <p className="text-sm text-gray-400 mt-1">Quarters appear once rows have an invoice date.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {/* Summary cards: most-recent quarter status + next due */}
      {recent && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatusCard title={`${recent.label} — GSTR1`} st={recent.g1} overdue={recent.g1Overdue} due={recent.gstr1Due} />
          <StatusCard title={`${recent.label} — GSTR3B`} st={recent.g3} overdue={recent.g3Overdue} due={recent.gstr3bDue} />
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center"><Clock size={18} className="text-indigo-600" /></div>
              <p className="text-sm font-medium text-gray-500">Next due</p>
            </div>
            {nextDue
              ? <p className="text-lg font-bold text-gray-800 mt-2">{nextDue.kind} · {fmtDate(nextDue.date)}</p>
              : <p className="text-lg font-bold text-emerald-700 mt-2">All filed</p>}
            {nextDue && <p className="text-xs text-gray-400 mt-0.5">{nextDue.q}</p>}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left">
              {['Quarter', 'Invoices', 'GSTR1', 'GSTR1 Due', 'GSTR3B', 'GSTR3B Due', ''].map(h => (
                <th key={h} className="px-3 py-3 font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quarters.map(qq => (
              <tr key={qq.key} className="hover:bg-gray-50">
                <td className="px-3 py-3 font-medium text-gray-800">{qq.label}</td>
                <td className="px-3 py-3 text-gray-600">{qq.count}</td>
                <td className="px-3 py-3"><FilingCell st={qq.g1} overdue={qq.g1Overdue} /></td>
                <td className={`px-3 py-3 ${qq.g1Overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{fmtDate(qq.gstr1Due)}</td>
                <td className="px-3 py-3"><FilingCell st={qq.g3} overdue={qq.g3Overdue} /></td>
                <td className={`px-3 py-3 ${qq.g3Overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{fmtDate(qq.gstr3bDue)}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <MarkBtn label="GSTR1" busy={busy === `${qq.key}:gstr1_closed`} done={qq.g1.status === 'filed'} onClick={() => markFiled(qq, 'gstr1_closed')} />
                    <MarkBtn label="GSTR3B" busy={busy === `${qq.key}:gstr3b_closed`} done={qq.g3.status === 'filed'} onClick={() => markFiled(qq, 'gstr3b_closed')} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilingCell({ st, overdue }) {
  const badge = STATUS_BADGE[st.status]
  return (
    <div className="flex items-center gap-1.5">
      <span className={`px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
      {st.status === 'partial' && <span className="text-gray-400">{st.closed} of {st.total} filed</span>}
      {st.status === 'pending' && st.total > 0 && <span className="text-gray-400">{st.unfiled} unfiled</span>}
      {overdue && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
          <AlertTriangle size={11} /> Overdue
        </span>
      )}
    </div>
  )
}

function MarkBtn({ label, busy, done, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={busy || done}
      title={done ? `${label} already filed` : `Mark ${label} filed for the whole quarter`}
      className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {done ? <CheckCircle2 size={12} className="text-emerald-600" /> : busy ? <span className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /> : null}
      {label}
    </button>
  )
}

function StatusCard({ title, st, overdue, due }) {
  const badge = STATUS_BADGE[st.status]
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
        {st.status === 'partial' && <span className="text-xs text-gray-400">{st.closed} of {st.total} filed</span>}
        {overdue && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><AlertTriangle size={11} /> Overdue</span>}
      </div>
      <p className="text-xs text-gray-400 mt-2">Due {fmtDate(due)}</p>
    </div>
  )
}
