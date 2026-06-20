// Single source of truth for billing math (Phase 6.1).
// Used by the billing form for live preview AND on save.
//
// Contract types:
//   hourly           → USD-based; inr_total = total_usd * conversion_rate
//   fixed_monthly    → flat INR fee, unaffected by non-billable days
//   monthly_prorated → INR fee prorated by billable_days / working_days

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
  const contractType = input.contract_type
  const totalDays    = num(input.total_days)
  const nonBillable  = num(input.non_billable_days)

  const billableDays = totalDays - nonBillable

  let totalHours = null
  let totalUsd   = null
  let inrTotal   = 0
  let error      = ''

  if (contractType === 'hourly') {
    const dailyHours = num(input.daily_hours)
    const rateUsd    = num(input.hourly_rate_usd)
    const conversion = num(input.conversion_rate)
    totalHours = round2(billableDays * dailyHours)
    totalUsd   = round2(totalHours * rateUsd)
    inrTotal   = round2(totalUsd * conversion)
  } else if (contractType === 'fixed_monthly') {
    // Flat fee — days do NOT change it.
    inrTotal = round2(num(input.monthly_fee_inr))
  } else if (contractType === 'monthly_prorated') {
    const monthlyFee  = num(input.monthly_fee_inr)
    const workingDays = num(input.working_days)
    if (!workingDays) {
      error    = 'Working days must be greater than 0 to prorate the monthly fee.'
      inrTotal = 0
    } else {
      inrTotal = round2((monthlyFee * billableDays) / workingDays)
    }
  }

  const gstRate = num(input.gst_rate)
  const tdsRate = num(input.tds_rate)

  const gstAmount         = round2((gstRate / 100) * inrTotal)
  const tdsAmount         = round2((tdsRate / 100) * inrTotal)
  const totalInvoiceValue = round2(inrTotal + gstAmount)
  const bankTransfer      = round2(totalInvoiceValue - tdsAmount)

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
