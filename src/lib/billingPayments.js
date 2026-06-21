// Payment-tracking logic for the Billing module (Phase 6.2a).
// Uses STORED row money values — never recomputes tax/calc. Each row is tracked
// in its OWN currency (INR or USD); INR and USD are never combined.
import invoiceConfig from '../config/invoiceConfig'

const round0 = n => Math.round(Number(n) || 0)

// A row is overseas/export when its linked client is overseas, or gst_rate is 0.
export function isOverseas(row, client) {
  return !!(client && client.is_overseas) || Number(row.gst_rate) === 0
}

// "Expected" collectible for a row, in the row's own currency.
//   domestic/INR        -> bank_transfer (net of TDS)
//   overseas, USD-billed -> total_usd
//   overseas, INR-billed -> inr_total
export function expectedFor(row, client, config = invoiceConfig) {
  if (isOverseas(row, client)) {
    if (config.overseasInvoiceCurrency === 'USD') {
      return { amount: round0(row.total_usd), currency: 'USD' }
    }
    return { amount: round0(row.inr_total), currency: 'INR' }
  }
  return { amount: round0(row.bank_transfer), currency: 'INR' }
}

// expected / received / outstanding (whole numbers) + the row's currency.
export function outstandingFor(row, client, config = invoiceConfig) {
  const { amount, currency } = expectedFor(row, client, config)
  const received = round0(row.amount_received)
  return { expected: amount, received, outstanding: Math.max(0, amount - received), currency }
}

// Derived payment status from amount_received vs expected.
export function derivePaymentStatus(amountReceived, expected) {
  const ar = Number(amountReceived) || 0
  if (ar <= 0) return 'pending'
  if (ar < expected) return 'partial'
  return 'received'
}

// Whole days since the invoice date (null if no invoice_date).
export function ageDays(invoiceDate, today = new Date()) {
  if (!invoiceDate) return null
  const inv = new Date(`${invoiceDate}T00:00:00`)
  return Math.floor((today - inv) / 86400000)
}

// Overdue: not fully received AND more than 30 days since invoice_date.
export function isOverdue(row, today = new Date()) {
  if (row.payment_status === 'received') return false
  const age = ageDays(row.invoice_date, today)
  return age != null && age > 30
}

// Ageing bucket label from age in days.
export function ageingBucket(age) {
  if (age == null) return '—'
  if (age <= 30) return 'Current'
  if (age <= 60) return '31-60'
  if (age <= 90) return '61-90'
  return '90+'
}

export const PAYMENT_BADGE = {
  pending:  { cls: 'bg-amber-100 text-amber-700',     label: 'Pending' },
  partial:  { cls: 'bg-blue-100 text-blue-700',       label: 'Partial' },
  received: { cls: 'bg-emerald-100 text-emerald-700', label: 'Received' },
}

export const fmtMoney = (n, currency) =>
  new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Number(n) || 0)
