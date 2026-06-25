// Single source of truth for billing math (Phase 6.1, reworked in 6.4a).
// Used by the billing form for live preview AND on save.
//
// Two INDEPENDENT levers (replace the old contract_type):
//   calc_basis    ∈ hourly | fixed_hours | fixed_monthly | prorated  (how the base amount is derived)
//   rate_currency ∈ USD | INR                                        (the unit the rate is in)
//
// Tax (gst_rate/tds_rate) and invoice currency are NOT derived from these.
//
// Rate field reuse (DB column names unchanged):
//   hourly / fixed_hours  → rate lives in hourly_rate_usd (an INR number when rate_currency=INR)
//   fixed_monthly / prorated → flat amount lives in monthly_fee_inr

// Money is rounded to whole numbers; each component is rounded BEFORE it feeds
// the next step so totals tie out exactly.
function roundMoney(n) {
  return Math.round(Number(n) || 0)
}

// Hours are not money — keep 2-decimal precision.
function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function num(v) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {object} input - raw form values (strings or numbers)
 * @returns {object} computed fields + optional `error` validation message
 */
export function calcBilling(input = {}) {
  const calcBasis    = input.calc_basis
  const rateCurrency = input.rate_currency === 'INR' ? 'INR' : 'USD'

  const totalDays    = num(input.total_days)
  const nonBillable  = num(input.non_billable_days)
  const billableDays = totalDays - nonBillable

  // `units` is the per-unit count (hours) for hourly/fixed_hours; `base` is the
  // amount in the rate's own currency before conversion.
  let units = null   // hours, when applicable
  let base  = 0      // amount in rate_currency
  let error = ''

  if (calcBasis === 'hourly') {
    const dailyHours = num(input.daily_hours)
    const rate       = num(input.hourly_rate_usd)
    units = round2(billableDays * dailyHours)
    base  = units * rate
  } else if (calcBasis === 'fixed_hours') {
    // Days-insensitive: total_days / non_billable_days never affect the amount.
    const rate = num(input.hourly_rate_usd)
    units = round2(num(input.fixed_hours))
    base  = units * rate
  } else if (calcBasis === 'fixed_monthly') {
    base = num(input.monthly_fee_inr)
  } else if (calcBasis === 'prorated') {
    const monthlyFee  = num(input.monthly_fee_inr)
    const workingDays = num(input.working_days)
    if (!workingDays) {
      error = 'Working days must be greater than 0 to prorate the monthly fee.'
      base  = 0
    } else {
      base = (monthlyFee * billableDays) / workingDays
    }
  }

  const isHourlyLike = calcBasis === 'hourly' || calcBasis === 'fixed_hours'

  let totalHours = null
  let totalUsd   = null
  let inrTotal   = 0

  if (rateCurrency === 'USD') {
    totalHours = isHourlyLike ? units : null
    totalUsd   = roundMoney(base)
    inrTotal   = roundMoney(totalUsd * num(input.conversion_rate))
  } else {
    // INR rate: no USD figure, no conversion.
    totalHours = isHourlyLike ? units : null
    totalUsd   = null
    inrTotal   = roundMoney(base)
  }

  const gstRate = num(input.gst_rate)
  const tdsRate = num(input.tds_rate)

  const gstAmount         = roundMoney((gstRate / 100) * inrTotal)
  const tdsAmount         = roundMoney((tdsRate / 100) * inrTotal)
  const totalInvoiceValue = inrTotal + gstAmount
  const bankTransfer      = totalInvoiceValue - tdsAmount

  return {
    billable_days:       billableDays,
    total_hours:         totalHours,
    total_usd:           totalUsd,
    inr_total:           inrTotal,
    gst_amount:          gstAmount,
    tds_amount:          tdsAmount,
    total_invoice_value: totalInvoiceValue,
    bank_transfer:       bankTransfer,
    error,
  }
}
