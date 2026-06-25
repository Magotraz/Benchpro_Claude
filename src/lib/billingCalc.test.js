import { describe, it, expect } from 'vitest'
import { calcBilling } from './billingCalc'

// These tests LOCK the current calcBilling behavior. Expected values were taken
// from the actual implementation output — do not "fix" them to match intuition;
// if calcBilling changes intentionally, update these to the new real output.

describe('calcBilling — hourly', () => {
  it('hourly + USD: days, hours, USD, and INR via conversion', () => {
    const r = calcBilling({
      calc_basis: 'hourly', rate_currency: 'USD',
      total_days: 22, non_billable_days: 2, daily_hours: 8,
      hourly_rate_usd: 30, conversion_rate: 83, gst_rate: 18, tds_rate: 10,
    })
    expect(r.billable_days).toBe(20)
    expect(r.total_hours).toBe(160)        // 20 days * 8h
    expect(r.total_usd).toBe(4800)         // 160 * 30
    expect(r.inr_total).toBe(398400)       // 4800 * 83
    expect(r.error).toBe('')
  })

  it('hourly + INR: no conversion; inr_total direct; total_usd null', () => {
    const r = calcBilling({
      calc_basis: 'hourly', rate_currency: 'INR',
      total_days: 20, non_billable_days: 0, daily_hours: 8,
      hourly_rate_usd: 500, gst_rate: 18, tds_rate: 10,
    })
    expect(r.total_usd).toBeNull()
    expect(r.total_hours).toBe(160)
    expect(r.inr_total).toBe(80000)        // 160 * 500, no conversion
  })
})

describe('calcBilling — fixed_hours (days-insensitive)', () => {
  const overseas = {
    calc_basis: 'fixed_hours', rate_currency: 'USD',
    fixed_hours: 160, hourly_rate_usd: 35, conversion_rate: 83,
    gst_rate: 0, tds_rate: 0,
  }

  it('units = fixed_hours; 160 * 35 = 5600 USD; inr = 5600 * conversion', () => {
    const r = calcBilling({ ...overseas, total_days: 30, non_billable_days: 5 })
    expect(r.total_hours).toBe(160)
    expect(r.total_usd).toBe(5600)
    expect(r.inr_total).toBe(464800)       // 5600 * 83
  })

  it('changing total_days / non_billable_days does NOT change the amount', () => {
    const a = calcBilling({ ...overseas, total_days: 30, non_billable_days: 5 })
    const b = calcBilling({ ...overseas, total_days: 10, non_billable_days: 8 })
    expect(b.total_usd).toBe(a.total_usd)
    expect(b.inr_total).toBe(a.inr_total)
    expect(b.total_usd).toBe(5600)
  })
})

describe('calcBilling — fixed_monthly (flat)', () => {
  it('flat fee; non_billable_days do NOT reduce it', () => {
    const base = {
      calc_basis: 'fixed_monthly', rate_currency: 'INR',
      monthly_fee_inr: 150000, total_days: 30, gst_rate: 18, tds_rate: 10,
    }
    const withNb   = calcBilling({ ...base, non_billable_days: 10 })
    const withoutNb = calcBilling({ ...base, non_billable_days: 0 })
    expect(withNb.inr_total).toBe(150000)
    expect(withoutNb.inr_total).toBe(150000)
    expect(withNb.total_hours).toBeNull()
    expect(withNb.total_usd).toBeNull()
  })
})

describe('calcBilling — prorated', () => {
  it('monthly_fee * billable_days / working_days (rounded)', () => {
    const r = calcBilling({
      calc_basis: 'prorated', rate_currency: 'INR',
      monthly_fee_inr: 150000, total_days: 22, non_billable_days: 2,
      working_days: 22, gst_rate: 18, tds_rate: 10,
    })
    expect(r.billable_days).toBe(20)
    expect(r.inr_total).toBe(136364)       // round(150000 * 20 / 22)
    expect(r.error).toBe('')
  })

  it('working_days 0 → inr_total 0 + validation message (no crash)', () => {
    const r = calcBilling({
      calc_basis: 'prorated', rate_currency: 'INR',
      monthly_fee_inr: 150000, total_days: 22, non_billable_days: 2,
      working_days: 0, gst_rate: 18, tds_rate: 10,
    })
    expect(r.inr_total).toBe(0)
    expect(r.error).toBe('Working days must be greater than 0 to prorate the monthly fee.')
  })

  it('working_days null/undefined → same guarded behavior', () => {
    const r = calcBilling({
      calc_basis: 'prorated', rate_currency: 'INR',
      monthly_fee_inr: 150000, total_days: 22, non_billable_days: 2,
      gst_rate: 18, tds_rate: 10,
    })
    expect(r.inr_total).toBe(0)
    expect(r.error).toMatch(/Working days must be greater than 0/)
  })
})

describe('calcBilling — tax relationships', () => {
  it('gst/tds derive from inr_total; invoice & bank_transfer chain', () => {
    const r = calcBilling({
      calc_basis: 'hourly', rate_currency: 'USD',
      total_days: 22, non_billable_days: 2, daily_hours: 8,
      hourly_rate_usd: 30, conversion_rate: 83, gst_rate: 18, tds_rate: 10,
    })
    expect(r.gst_amount).toBe(Math.round(0.18 * r.inr_total))            // 71712
    expect(r.tds_amount).toBe(Math.round(0.10 * r.inr_total))            // 39840
    expect(r.total_invoice_value).toBe(r.inr_total + r.gst_amount)       // 470112
    expect(r.bank_transfer).toBe(r.total_invoice_value - r.tds_amount)   // 430272
  })
})

describe('calcBilling — overseas 0% / 0%', () => {
  it('gst 0, tds 0; invoice_value == inr_total == bank_transfer', () => {
    const r = calcBilling({
      calc_basis: 'fixed_hours', rate_currency: 'USD',
      fixed_hours: 160, hourly_rate_usd: 35, conversion_rate: 83,
      gst_rate: 0, tds_rate: 0,
    })
    expect(r.gst_amount).toBe(0)
    expect(r.tds_amount).toBe(0)
    expect(r.total_invoice_value).toBe(r.inr_total)
    expect(r.bank_transfer).toBe(r.inr_total)
    expect(r.inr_total).toBe(464800)
  })
})

describe('calcBilling — rounding (all money is whole numbers)', () => {
  it('rounds a case that would otherwise produce decimals', () => {
    // base = 3 * 33.33 = 99.99 → round → 100 USD; inr = 100 * 80 = 8000
    const r = calcBilling({
      calc_basis: 'fixed_hours', rate_currency: 'USD',
      fixed_hours: 3, hourly_rate_usd: 33.33, conversion_rate: 80,
      gst_rate: 18, tds_rate: 10,
    })
    expect(r.total_usd).toBe(100)
    expect(r.inr_total).toBe(8000)
    expect(r.gst_amount).toBe(1440)
    expect(r.tds_amount).toBe(800)
    for (const v of [r.total_usd, r.inr_total, r.gst_amount, r.tds_amount, r.total_invoice_value, r.bank_transfer]) {
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('prorated rounds inr_total and the derived taxes to whole numbers', () => {
    const r = calcBilling({
      calc_basis: 'prorated', rate_currency: 'INR',
      monthly_fee_inr: 150000, total_days: 22, non_billable_days: 2,
      working_days: 22, gst_rate: 18, tds_rate: 10,
    })
    expect(r.inr_total).toBe(136364)
    expect(r.gst_amount).toBe(24546)
    expect(r.tds_amount).toBe(13636)
    expect(r.total_invoice_value).toBe(160910)
    expect(r.bank_transfer).toBe(147274)
  })
})
