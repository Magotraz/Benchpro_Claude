// Static HIREF tax-invoice data for the Billing → Generate Invoice PDF (Phase 6.3).
// No per-row/computed values here — those come from the billing_records row.

const invoiceConfig = {
  seller: {
    company: 'HIREF Technologies',
    contact: 'Sachin Magotra',
    addressLines: [
      '44, Ground Floor, Opp. Tehsil Office,',
      'Bishnah',
      'Jammu and Kashmir',
      'India',
    ],
  },
  sellerGstin: '01AOSPM4461P1ZE',

  bank: {
    beneficiary:   'HIREF Technologies',
    bankName:      'IndusInd Bank',
    bankAddress:   'Gupta Plaza, Bahu Plaza, Jammu - 180004',
    accountNumber: '251112121982',
    swift:         'INDBINBBXXX',
    ifsc:          'INDB0000156',
  },

  footer:
    'Prepared by: HIREF Technologies, 44, Ground Floor, Opp. Tehsil office Bishnah, Distt - Jammu (181132)\n' +
    'm: 9717169980 - 9622399980  Landline: 0191-4013521\n' +
    'email: apply@hiref.in  website: www.hiref.in',

  lutArn: 'REPLACE_WITH_LUT_ARN',      // Sachin will paste this
  overseasInvoiceCurrency: 'USD',      // "USD" or "INR"

  // No HIREF logo image asset exists in the repo yet (the landing page uses a
  // text wordmark). The PDF renders a styled text logo by default. To use a real
  // logo, set `logoSrc` to an imported image (PNG/JPG) and InvoicePDF will render
  // it instead of the text mark.
  logoText: 'HIREF',
  logoSrc:  null,
}

export default invoiceConfig
