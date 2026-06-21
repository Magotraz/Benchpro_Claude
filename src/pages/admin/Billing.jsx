import { useEffect, useMemo, useState } from 'react'
import { Plus, Receipt, Pencil, CopyPlus, Trash2, FileDown, ListChecks, Building2, Wallet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { calcBilling } from '../../lib/billingCalc'
import { downloadInvoice } from '../../lib/invoicePdf'
import { expectedFor, derivePaymentStatus, PAYMENT_BADGE, fmtMoney } from '../../lib/billingPayments'
import Modal from '../../components/Modal'
import BillingClients from './BillingClients'
import BillingPayments from './BillingPayments'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CONTRACT_LABELS = {
  hourly:           'Hourly',
  fixed_monthly:    'Fixed Monthly',
  monthly_prorated: 'Monthly (Prorated)',
}

const EMPTY = {
  contractor_name: '', client_id: '', client_name: '', billing_month: '', contract_type: 'hourly',
  bill_currency: 'USD',
  total_days: '', non_billable_days: '0', working_days: '',
  daily_hours: '', hourly_rate_usd: '', conversion_rate: '', monthly_fee_inr: '',
  gst_rate: '18', tds_rate: '10', hsn_sac: '998513',
  invoice_no: '', invoice_date: '', gstr1_filed_date: '', gstr3b_status: 'pending',
  payment_status: 'pending', amount_received: '', received_date: '', notes: '',
}

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

// 'YYYY-MM-DD' or 'YYYY-MM' → 'Jun 2026' (no Date() to avoid timezone drift)
function formatMonth(dateStr) {
  if (!dateStr) return '—'
  const [y, m] = dateStr.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`
}

// 'YYYY-MM' → next month 'YYYY-MM'
function nextMonth(monthStr) {
  if (!monthStr) return ''
  const [y, m] = monthStr.split('-').map(Number)
  const d = new Date(y, m, 1) // m is 1-based; (m) gives the following month at index m
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function toNum(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

const fmtINR = v => (v === null || v === undefined) ? '—'
  : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
const fmtUSD = v => (v === null || v === undefined) ? '—'
  : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
const fmtNum = v => (v === null || v === undefined || v === '') ? '—' : String(v)
const fmtDate = v => v ? new Date(v).toLocaleDateString('en-IN') : '—'

const BADGE = {
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-emerald-100 text-emerald-700',
}

export default function Billing() {
  const { user } = useAuth()
  const [view, setView]       = useState('records') // 'records' | 'clients'
  const [records, setRecords] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [generatingId, setGeneratingId] = useState(null)
  const [error, setError]     = useState('')
  const [fMonth, setFMonth]   = useState('')
  const [fClient, setFClient] = useState('')

  useEffect(() => { load(); loadClients() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('billing_records')
      .select('*')
      .order('billing_month', { ascending: false })
      .order('client_name', { ascending: true })
    setRecords(data ?? [])
    setLoading(false)
  }

  async function loadClients() {
    const { data } = await supabase
      .from('billing_clients')
      .select('*')
      .order('client_name', { ascending: true })
    setClients(data ?? [])
  }

  const clientById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])

  function openCreate() {
    setForm(EMPTY); setEditingId(null); setError(''); setModal(true)
  }

  function openEdit(r) {
    setForm({
      contractor_name: r.contractor_name ?? '',
      client_id:       r.client_id ?? '',
      client_name:     r.client_name ?? '',
      billing_month:   r.billing_month ? r.billing_month.slice(0, 7) : '',
      contract_type:   r.contract_type,
      bill_currency:   r.bill_currency,
      total_days:        r.total_days ?? '',
      non_billable_days: r.non_billable_days ?? 0,
      working_days:      r.working_days ?? '',
      daily_hours:       r.daily_hours ?? '',
      hourly_rate_usd:   r.hourly_rate_usd ?? '',
      conversion_rate:   r.conversion_rate ?? '',
      monthly_fee_inr:   r.monthly_fee_inr ?? '',
      gst_rate:          r.gst_rate ?? 18,
      tds_rate:          r.tds_rate ?? 10,
      hsn_sac:           r.hsn_sac ?? '998513',
      invoice_no:        r.invoice_no ?? '',
      invoice_date:      r.invoice_date ?? '',
      gstr1_filed_date:  r.gstr1_filed_date ?? '',
      gstr3b_status:     r.gstr3b_status ?? 'pending',
      payment_status:    r.payment_status ?? 'pending',
      amount_received:   r.amount_received ?? '',
      received_date:     r.received_date ?? '',
      notes:             r.notes ?? '',
    })
    setEditingId(r.id); setError(''); setModal(true)
  }

  // Clone into a NEW record for next month; reset per-cycle fields.
  function duplicate(r) {
    setForm({
      contractor_name: r.contractor_name ?? '',
      client_id:       r.client_id ?? '',
      client_name:     r.client_name ?? '',
      billing_month:   nextMonth(r.billing_month ? r.billing_month.slice(0, 7) : ''),
      contract_type:   r.contract_type,
      bill_currency:   r.bill_currency,
      // kept rates
      daily_hours:     r.daily_hours ?? '',
      hourly_rate_usd: r.hourly_rate_usd ?? '',
      monthly_fee_inr: r.monthly_fee_inr ?? '',
      working_days:    r.working_days ?? '',
      gst_rate:        r.gst_rate ?? 18,
      tds_rate:        r.tds_rate ?? 10,
      hsn_sac:         r.hsn_sac ?? '998513',
      // reset per-cycle
      total_days:        '',
      non_billable_days: '0',
      conversion_rate:   '',
      invoice_no:        '',
      invoice_date:      '',
      gstr1_filed_date:  '',
      gstr3b_status:     'pending',
      payment_status:    'pending',
      amount_received:   '',
      received_date:     '',
      notes:             '',
    })
    setEditingId(null); setError(''); setModal(true)
  }

  async function remove(r) {
    if (!window.confirm(`Delete billing record for ${r.contractor_name} — ${formatMonth(r.billing_month)}? This cannot be undone.`)) return
    const { error: err } = await supabase.from('billing_records').delete().eq('id', r.id)
    if (err) { setError(err.message); return }
    setRecords(prev => prev.filter(x => x.id !== r.id))
  }

  function setField(key) { return (e) => setForm(f => ({ ...f, [key]: e.target.value })) }

  function onContractTypeChange(e) {
    const ct = e.target.value
    setForm(f => ({ ...f, contract_type: ct, bill_currency: ct === 'hourly' ? 'USD' : 'INR' }))
  }

  // Selecting a client stores client_id + display name and defaults the tax
  // rates / HSN by the client's type. All remain editable afterwards.
  function onClientChange(e) {
    const id = e.target.value
    const c  = clientById[id]
    setForm(f => ({
      ...f,
      client_id:   id,
      client_name: c?.client_name ?? '',
      gst_rate:    c ? (c.is_overseas ? '0' : '18') : f.gst_rate,
      tds_rate:    c ? (c.is_overseas ? '0' : '10') : f.tds_rate,
      hsn_sac:     c?.default_hsn_sac ?? f.hsn_sac ?? '998513',
    }))
  }

  function openClientManager() { setModal(false); setView('clients') }

  // Whether a stored row can produce an invoice (linked client; domestic needs GSTIN).
  function invoiceState(r) {
    const c = r.client_id ? clientById[r.client_id] : null
    if (!c) return { ok: false }
    const overseas = c.is_overseas || Number(r.gst_rate) === 0
    if (!overseas && !c.gstin) return { ok: false }
    return { ok: true, client: c }
  }

  async function generate(r) {
    const { ok, client } = invoiceState(r)
    if (!ok) return
    setGeneratingId(r.id); setError('')
    try {
      await downloadInvoice(r, client)
    } catch (err) {
      setError(`Failed to generate invoice: ${err.message}`)
    } finally {
      setGeneratingId(null)
    }
  }

  const computed = useMemo(() => calcBilling(form), [form])

  // Derived payment status from amount_received vs expected (replaces the manual
  // payment_status dropdown). Expected uses the LIVE computed values + client type.
  const formClient   = form.client_id ? clientById[form.client_id] : null
  const formExpected = expectedFor(
    { gst_rate: form.gst_rate, total_usd: computed.total_usd, inr_total: computed.inr_total, bank_transfer: computed.bank_transfer },
    formClient,
  )
  const derivedStatus = derivePaymentStatus(form.amount_received, formExpected.amount)

  async function save(e) {
    e.preventDefault(); setError('')
    const c = calcBilling(form)
    if (c.error) { setError(c.error); return }

    const exp = expectedFor(
      { gst_rate: form.gst_rate, total_usd: c.total_usd, inr_total: c.inr_total, bank_transfer: c.bank_transfer },
      formClient,
    )
    const arNum = Number(form.amount_received) || 0
    if (arNum > 0 && !form.received_date) {
      setError('Enter the received date for the recorded payment.'); return
    }
    setSaving(true)

    const payload = {
      contractor_name:   form.contractor_name,
      client_id:         form.client_id || null,
      client_name:       form.client_name,
      hsn_sac:           (form.hsn_sac && form.hsn_sac.trim()) || '998513',  // NOT NULL
      billing_month:     form.billing_month ? `${form.billing_month}-01` : null,
      contract_type:     form.contract_type,
      bill_currency:     form.bill_currency,
      total_days:        toNum(form.total_days),
      non_billable_days: toNum(form.non_billable_days) ?? 0,
      working_days:      toNum(form.working_days),
      daily_hours:       toNum(form.daily_hours),
      hourly_rate_usd:   toNum(form.hourly_rate_usd),
      conversion_rate:   toNum(form.conversion_rate),
      monthly_fee_inr:   toNum(form.monthly_fee_inr),
      gst_rate:          toNum(form.gst_rate) ?? 18,
      tds_rate:          toNum(form.tds_rate) ?? 10,
      billable_days:        c.billable_days,
      total_hours:          c.total_hours,
      total_usd:            c.total_usd,
      inr_total:            c.inr_total,
      gst_amount:           c.gst_amount,
      tds_amount:           c.tds_amount,
      total_invoice_value:  c.total_invoice_value,
      bank_transfer:        c.bank_transfer,
      invoice_no:        form.invoice_no || null,
      invoice_date:      form.invoice_date || null,
      gstr1_filed_date:  form.gstr1_filed_date || null,
      gstr3b_status:     form.gstr3b_status,
      payment_status:    derivePaymentStatus(form.amount_received, exp.amount),
      amount_received:   toNum(form.amount_received),
      received_date:     form.received_date || null,
      notes:             form.notes || null,
    }

    let err
    if (editingId) {
      ({ error: err } = await supabase.from('billing_records').update(payload).eq('id', editingId))
    } else {
      payload.created_by = user.id
      ;({ error: err } = await supabase.from('billing_records').insert(payload))
    }
    if (err) { setError(err.message); setSaving(false); return }
    setModal(false); setSaving(false); load()
  }

  // ── Filters + sort ──────────────────────────────────────────────
  const monthOptions = useMemo(
    () => [...new Set(records.map(r => r.billing_month).filter(Boolean))].sort().reverse(),
    [records],
  )
  const clientOptions = useMemo(
    () => [...new Set(records.map(r => r.client_name).filter(Boolean))].sort(),
    [records],
  )
  const visible = records.filter(r =>
    (!fMonth  || r.billing_month === fMonth) &&
    (!fClient || r.client_name === fClient),
  )

  const isHourly   = form.contract_type === 'hourly'
  const isProrated = form.contract_type === 'monthly_prorated'
  const showFee    = form.contract_type === 'fixed_monthly' || isProrated

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setView('records')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'records' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ListChecks size={15} /> Records
          </button>
          <button
            onClick={() => setView('payments')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'payments' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Wallet size={15} /> Payments
          </button>
          <button
            onClick={() => setView('clients')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'clients' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Building2 size={15} /> Clients
          </button>
        </div>
        {view === 'records' && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus size={16} /> New Record
          </button>
        )}
      </div>

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {view === 'clients' && <BillingClients clients={clients} onChanged={loadClients} />}

      {view === 'payments' && <BillingPayments records={records} clients={clients} />}

      {/* Filters */}
      {view === 'records' && (
      <>
      {records.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <select value={fMonth} onChange={e => setFMonth(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">All months</option>
            {monthOptions.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
          </select>
          <select value={fClient} onChange={e => setFClient(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">All clients</option>
            {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(fMonth || fClient) && (
            <button onClick={() => { setFMonth(''); setFClient('') }} className="text-sm text-gray-500 hover:text-gray-700">Clear filters</button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-14">
          <Receipt size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No billing records yet</p>
          <button onClick={openCreate} className="mt-4 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">New Record</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                {['Contractor', 'Client', 'Month', 'Type', 'Cur', 'Bill Days', 'Hours', 'Rate (USD)', 'Conv', 'Total USD', 'INR Total', 'GST %', 'GST Amt', 'TDS %', 'TDS Amt', 'Invoice Val', 'Bank Transfer', 'Invoice #', 'Inv Date', 'GSTR1', 'GSTR3B', 'Payment'].map(h => (
                  <th key={h} className="px-3 py-3 font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map(r => {
                const usd = r.bill_currency === 'USD'
                const inv = invoiceState(r)
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium text-gray-800">{r.contractor_name}</td>
                    <td className="px-3 py-3 text-gray-600">{r.client_name}</td>
                    <td className="px-3 py-3 text-gray-600">{formatMonth(r.billing_month)}</td>
                    <td className="px-3 py-3 text-gray-500">{CONTRACT_LABELS[r.contract_type] ?? r.contract_type}</td>
                    <td className="px-3 py-3 text-gray-500">{r.bill_currency}</td>
                    <td className="px-3 py-3 text-gray-600">{fmtNum(r.billable_days)}</td>
                    <td className="px-3 py-3 text-gray-600">{usd ? fmtNum(r.total_hours) : '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{usd ? fmtUSD(r.hourly_rate_usd) : '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{usd ? fmtNum(r.conversion_rate) : '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{usd ? fmtUSD(r.total_usd) : '—'}</td>
                    <td className="px-3 py-3 font-semibold text-gray-800">{fmtINR(r.inr_total)}</td>
                    <td className="px-3 py-3 text-gray-500">{fmtNum(r.gst_rate)}%</td>
                    <td className="px-3 py-3 text-gray-600">{fmtINR(r.gst_amount)}</td>
                    <td className="px-3 py-3 text-gray-500">{fmtNum(r.tds_rate)}%</td>
                    <td className="px-3 py-3 text-gray-600">{fmtINR(r.tds_amount)}</td>
                    <td className="px-3 py-3 font-semibold text-gray-800">{fmtINR(r.total_invoice_value)}</td>
                    <td className="px-3 py-3 text-gray-600">{fmtINR(r.bank_transfer)}</td>
                    <td className="px-3 py-3 text-gray-500">{r.invoice_no || '—'}</td>
                    <td className="px-3 py-3 text-gray-500">{fmtDate(r.invoice_date)}</td>
                    <td className="px-3 py-3 text-gray-500">{fmtDate(r.gstr1_filed_date)}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${r.gstr3b_status === 'filed' ? BADGE.green : BADGE.amber}`}>
                        {r.gstr3b_status === 'filed' ? 'Filed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${(PAYMENT_BADGE[r.payment_status] ?? PAYMENT_BADGE.pending).cls}`}>
                        {(PAYMENT_BADGE[r.payment_status] ?? PAYMENT_BADGE.pending).label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => generate(r)}
                          disabled={!inv.ok || generatingId === r.id}
                          title={inv.ok ? 'Generate Invoice' : 'Link a client (with GSTIN for domestic) to generate an invoice.'}
                          className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400 disabled:cursor-not-allowed"
                        >
                          {generatingId === r.id
                            ? <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block" />
                            : <FileDown size={14} />}
                        </button>
                        <button onClick={() => openEdit(r)} title="Edit" className="p-1.5 text-gray-400 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => duplicate(r)} title="Duplicate to next month" className="p-1.5 text-gray-400 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"><CopyPlus size={14} /></button>
                        <button onClick={() => remove(r)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}

      {modal && (
        <Modal title={editingId ? 'Edit Billing Record' : 'New Billing Record'} onClose={() => setModal(false)} wide>
          {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Contractor Name <span className="text-red-500">*</span></label>
                <input required value={form.contractor_name} onChange={setField('contractor_name')} placeholder="Jane Doe" className={inputCls} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Client <span className="text-red-500">*</span></label>
                  <button type="button" onClick={openClientManager} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Manage clients</button>
                </div>
                <select required value={form.client_id} onChange={onClientChange} className={inputCls}>
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Billing Month <span className="text-red-500">*</span></label>
                <input required type="month" value={form.billing_month} onChange={setField('billing_month')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contract Type <span className="text-red-500">*</span></label>
                <select value={form.contract_type} onChange={onContractTypeChange} className={inputCls}>
                  <option value="hourly">Hourly (USD)</option>
                  <option value="fixed_monthly">Fixed Monthly (INR)</option>
                  <option value="monthly_prorated">Monthly Prorated (INR)</option>
                </select>
              </div>

              {/* Contract-type-specific inputs */}
              {showFee && (
                <div>
                  <label className={labelCls}>Monthly Fee (INR) <span className="text-red-500">*</span></label>
                  <input required type="number" step="0.01" value={form.monthly_fee_inr} onChange={setField('monthly_fee_inr')} placeholder="150000" className={inputCls} />
                </div>
              )}

              <div>
                <label className={labelCls}>Total Days</label>
                <input type="number" value={form.total_days} onChange={setField('total_days')} placeholder="30" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>
                  Non-billable Days
                  {form.contract_type === 'fixed_monthly' && <span className="text-gray-400 font-normal"> (recorded only)</span>}
                </label>
                <input type="number" value={form.non_billable_days} onChange={setField('non_billable_days')} placeholder="0" className={inputCls} />
              </div>

              {isProrated && (
                <div>
                  <label className={labelCls}>Working Days <span className="text-red-500">*</span></label>
                  <input required type="number" value={form.working_days} onChange={setField('working_days')} placeholder="22" className={inputCls} />
                </div>
              )}

              {isHourly && (
                <>
                  <div>
                    <label className={labelCls}>Daily Hours</label>
                    <input type="number" step="0.01" value={form.daily_hours} onChange={setField('daily_hours')} placeholder="8" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Hourly Rate (USD)</label>
                    <input type="number" step="0.01" value={form.hourly_rate_usd} onChange={setField('hourly_rate_usd')} placeholder="25" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Conversion Rate (USD→INR)</label>
                    <input type="number" step="0.0001" value={form.conversion_rate} onChange={setField('conversion_rate')} placeholder="83.50" className={inputCls} />
                  </div>
                </>
              )}

              {/* Tax dropdowns — always shown */}
              <div>
                <label className={labelCls}>GST Rate</label>
                <select value={form.gst_rate} onChange={setField('gst_rate')} className={inputCls}>
                  <option value="18">18%</option>
                  <option value="0">0%</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>TDS Rate</label>
                <select value={form.tds_rate} onChange={setField('tds_rate')} className={inputCls}>
                  <option value="10">10%</option>
                  <option value="0">0%</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>HSN/SAC</label>
                <input value={form.hsn_sac} onChange={setField('hsn_sac')} placeholder="998513" className={inputCls} />
              </div>
            </div>

            {/* Live computed block */}
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
              {computed.error && (
                <p className="text-sm text-amber-700 mb-2">{computed.error}</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                <Computed label="Billable Days" value={fmtNum(computed.billable_days)} />
                <Computed label="Total Hours"   value={computed.total_hours === null ? '—' : fmtNum(computed.total_hours)} />
                <Computed label="Total USD"     value={computed.total_usd === null ? '—' : fmtUSD(computed.total_usd)} />
                <Computed label="INR Total"     value={fmtINR(computed.inr_total)} />
                <Computed label="GST Amount"    value={fmtINR(computed.gst_amount)} />
                <Computed label="TDS Amount"    value={fmtINR(computed.tds_amount)} />
                <Computed label="Invoice Value" value={fmtINR(computed.total_invoice_value)} strong />
                <Computed label="Bank Transfer" value={fmtINR(computed.bank_transfer)} strong />
              </div>
            </div>

            {/* Invoice + payment fields — always shown */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Invoice No.</label>
                <input value={form.invoice_no} onChange={setField('invoice_no')} placeholder="INV-2026-001" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Invoice Date</label>
                <input type="date" value={form.invoice_date} onChange={setField('invoice_date')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>GSTR1 Filed Date</label>
                <input type="date" value={form.gstr1_filed_date} onChange={setField('gstr1_filed_date')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>GSTR3B Status</label>
                <select value={form.gstr3b_status} onChange={setField('gstr3b_status')} className={inputCls}>
                  <option value="pending">Pending</option>
                  <option value="filed">Filed</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Amount Received ({formExpected.currency})</label>
                <input type="number" step="0.01" value={form.amount_received} onChange={setField('amount_received')} placeholder="0" className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">Expected: {fmtMoney(formExpected.amount, formExpected.currency)}</p>
              </div>
              <div>
                <label className={labelCls}>Received Date {Number(form.amount_received) > 0 && <span className="text-red-500">*</span>}</label>
                <input type="date" required={Number(form.amount_received) > 0} value={form.received_date} onChange={setField('received_date')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Payment Status (auto)</label>
                <div className="px-1 py-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PAYMENT_BADGE[derivedStatus].cls}`}>
                    {PAYMENT_BADGE[derivedStatus].label}
                  </span>
                </div>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Notes</label>
                <textarea rows={2} value={form.notes} onChange={setField('notes')} placeholder="Any additional notes…" className={`${inputCls} resize-none`} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              {editingId && (() => {
                const r = records.find(x => x.id === editingId)
                const inv = r ? invoiceState(r) : { ok: false }
                return (
                  <button
                    type="button"
                    onClick={() => r && generate(r)}
                    disabled={!r || !inv.ok || generatingId === editingId}
                    title={inv.ok ? 'Generate Invoice (uses saved values)' : 'Link a client (with GSTIN for domestic) to generate an invoice.'}
                    className="mr-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileDown size={15} /> Generate Invoice
                  </button>
                )
              })()}
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Record'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Computed({ label, value, strong }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={strong ? 'font-bold text-gray-800' : 'font-medium text-gray-700'}>{value}</p>
    </div>
  )
}
