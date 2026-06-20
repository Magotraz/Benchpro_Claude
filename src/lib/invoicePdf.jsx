// HIREF tax-invoice PDF (Phase 6.3). Single-page, vector output via
// @react-pdf/renderer. Uses STORED computed values from the billing row — it
// never recomputes money.
import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import invoiceConfig from '../config/invoiceConfig'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Indian digit grouping, 2 decimals (e.g. 5,36,144.00). No currency symbol.
function fmtAmt(n) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(n) || 0)
}

// 'YYYY-MM-DD' → 'May-2026'
function monthTag(dateStr) {
  if (!dateStr) return ''
  const [y, m] = dateStr.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]}-${y}`
}

// 'YYYY-MM-DD' → '15 May 2026'
function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`
}

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 64, paddingHorizontal: 30, fontSize: 9, color: '#1f2937', fontFamily: 'Helvetica' },
  row: { flexDirection: 'row' },
  spread: { flexDirection: 'row', justifyContent: 'space-between' },

  logoText: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: '#4338ca', letterSpacing: 1 },
  logoImg: { width: 120, height: 46, objectFit: 'contain' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  invoiceNo: { fontSize: 10, textAlign: 'right', marginTop: 2, color: '#374151' },

  hr: { borderBottomWidth: 1, borderBottomColor: '#d1d5db', marginVertical: 10 },

  sellerName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  small: { fontSize: 9, lineHeight: 1.4 },
  bold: { fontFamily: 'Helvetica-Bold' },
  label: { fontSize: 8, color: '#6b7280', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },

  bankBox: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 3, padding: 7, width: 230 },
  bankRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  bankKey: { color: '#6b7280' },

  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 3 },

  // items table
  tHead: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#d1d5db' },
  tRow: { flexDirection: 'row', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#d1d5db' },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', padding: 4, color: '#374151' },
  td: { fontSize: 8.5, padding: 4 },
  cellBorder: { borderRightWidth: 1, borderColor: '#d1d5db' },
  stacked: { fontSize: 8.5 },
  stackedSub: { fontSize: 7, color: '#6b7280' },

  // column widths (sum ~ 535pt usable)
  cNum:  { width: '5%' },
  cDesc: { width: '30%' },
  cHsn:  { width: '12%' },
  cQty:  { width: '7%', textAlign: 'center' },
  cRate: { width: '13%', textAlign: 'right' },
  cIgst: { width: '12%', textAlign: 'right' },
  cCess: { width: '8%', textAlign: 'right' },
  cAmt:  { width: '13%', textAlign: 'right' },

  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  totals: { width: 230 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#374151', marginTop: 3 },
  grandLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  grandVal: { fontSize: 11, fontFamily: 'Helvetica-Bold' },

  exportNote: { marginTop: 12, padding: 7, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 3, fontSize: 8.5, lineHeight: 1.4 },

  footer: { position: 'absolute', left: 30, right: 30, bottom: 22, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#d1d5db', fontSize: 7.5, color: '#6b7280', textAlign: 'center', lineHeight: 1.4 },
})

function BankRow({ k, v }) {
  return (
    <View style={styles.bankRow}>
      <Text style={styles.bankKey}>{k}</Text>
      <Text style={styles.bold}>{v}</Text>
    </View>
  )
}

export function InvoiceDocument({ row, client, config = invoiceConfig }) {
  const overseas = !!(client?.is_overseas) || Number(row.gst_rate) === 0
  const useUSD   = overseas && config.overseasInvoiceCurrency === 'USD'
  const symbol   = useUSD ? '$' : 'Rs.'

  // STORED values only — no recompute.
  const taxable   = useUSD ? row.total_usd : row.inr_total
  const igstAmt   = overseas ? 0 : row.gst_amount
  const grandTotal = overseas ? taxable : row.total_invoice_value

  const placeOfSupply = overseas ? (client?.country || '—') : (client?.state || '—')
  const hsn = row.hsn_sac || client?.default_hsn_sac || '998513'

  const addressLines = (client?.billing_address || '').split('\n').filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.spread}>
          {config.logoSrc
            ? <Image src={config.logoSrc} style={styles.logoImg} />
            : <Text style={styles.logoText}>{config.logoText}</Text>}
          <View>
            <Text style={styles.title}>TAX INVOICE</Text>
            <Text style={styles.invoiceNo}>Invoice# {row.invoice_no || '—'}</Text>
          </View>
        </View>

        <View style={styles.hr} />

        {/* Seller + Banking */}
        <View style={styles.spread}>
          <View style={{ width: 260 }}>
            <Text style={styles.sellerName}>{config.seller.company}</Text>
            <Text style={styles.small}>{config.seller.contact}</Text>
            {config.seller.addressLines.map((l, i) => <Text key={i} style={styles.small}>{l}</Text>)}
            <Text style={[styles.small, styles.bold, { marginTop: 3 }]}>GSTIN {config.sellerGstin}</Text>
          </View>

          <View style={styles.bankBox}>
            <Text style={[styles.sectionTitle, { marginBottom: 5 }]}>Banking Details</Text>
            <BankRow k="Beneficiary"    v={config.bank.beneficiary} />
            <BankRow k="Bank Name"      v={config.bank.bankName} />
            <BankRow k="Bank Address"   v={config.bank.bankAddress} />
            <BankRow k="Account Number" v={config.bank.accountNumber} />
            <BankRow k="SWIFT"          v={config.bank.swift} />
            <BankRow k="IFSC"           v={config.bank.ifsc} />
          </View>
        </View>

        <View style={styles.hr} />

        {/* Bill To + Invoice Date */}
        <View style={styles.spread}>
          <View style={{ width: 320 }}>
            <Text style={styles.label}>Bill To:</Text>
            <Text style={[styles.small, styles.bold, { marginTop: 2 }]}>{client?.legal_name || client?.client_name || '—'}</Text>
            {addressLines.map((l, i) => <Text key={i} style={styles.small}>{l}</Text>)}
            <Text style={styles.small}>
              {[client?.city, client?.state, client?.country].filter(Boolean).join(', ')}
            </Text>
            {client?.gstin && <Text style={[styles.small, styles.bold, { marginTop: 2 }]}>GSTIN {client.gstin}</Text>}
          </View>
          <View>
            <Text style={styles.small}><Text style={styles.bold}>Invoice Date:</Text> {fmtDate(row.invoice_date)}</Text>
            <Text style={[styles.small, { marginTop: 4 }]}><Text style={styles.bold}>Place of Supply:</Text> {placeOfSupply}</Text>
          </View>
        </View>

        {/* Items table */}
        <View style={{ marginTop: 12 }}>
          <View style={styles.tHead}>
            <Text style={[styles.th, styles.cNum, styles.cellBorder]}>#</Text>
            <Text style={[styles.th, styles.cDesc, styles.cellBorder]}>Item Description</Text>
            <Text style={[styles.th, styles.cHsn, styles.cellBorder]}>HSN/SAC</Text>
            <Text style={[styles.th, styles.cQty, styles.cellBorder]}>Qty</Text>
            <Text style={[styles.th, styles.cRate, styles.cellBorder]}>Rate</Text>
            <Text style={[styles.th, styles.cIgst, styles.cellBorder]}>IGST</Text>
            <Text style={[styles.th, styles.cCess, styles.cellBorder]}>Cess</Text>
            <Text style={[styles.th, styles.cAmt]}>Amount</Text>
          </View>
          <View style={styles.tRow}>
            <Text style={[styles.td, styles.cNum, styles.cellBorder]}>1</Text>
            <Text style={[styles.td, styles.cDesc, styles.cellBorder]}>{row.contractor_name}</Text>
            <Text style={[styles.td, styles.cHsn, styles.cellBorder]}>{hsn}</Text>
            <Text style={[styles.td, styles.cQty, styles.cellBorder]}>1</Text>
            <Text style={[styles.td, styles.cRate, styles.cellBorder]}>{fmtAmt(taxable)}</Text>
            <View style={[styles.td, styles.cIgst, styles.cellBorder]}>
              <Text style={styles.stacked}>{fmtAmt(igstAmt)}</Text>
              <Text style={styles.stackedSub}>{overseas ? '0' : Math.round(Number(row.gst_rate) || 0)}</Text>
            </View>
            <View style={[styles.td, styles.cCess]}>
              <Text style={styles.stacked}>0.00</Text>
              <Text style={styles.stackedSub}>0</Text>
            </View>
            <Text style={[styles.td, styles.cAmt, { borderLeftWidth: 1, borderColor: '#d1d5db' }]}>{fmtAmt(taxable)}</Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsWrap}>
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text>Sub Total</Text>
              <Text>{symbol} {fmtAmt(taxable)}</Text>
            </View>
            {!overseas && (
              <View style={styles.totalRow}>
                <Text>IGST ({Math.round(Number(row.gst_rate) || 0)}%)</Text>
                <Text>{symbol} {fmtAmt(igstAmt)}</Text>
              </View>
            )}
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>TOTAL</Text>
              <Text style={styles.grandVal}>{symbol} {fmtAmt(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Export note (overseas / LUT) */}
        {overseas && (
          <View style={styles.exportNote}>
            <Text>
              Supply meant for export of services under LUT without payment of IGST. LUT ARN: {config.lutArn}
            </Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer} fixed>{config.footer}</Text>
      </Page>
    </Document>
  )
}

// Build + download the invoice PDF. Returns a promise.
export async function downloadInvoice(row, client, config = invoiceConfig) {
  const blob = await pdf(<InvoiceDocument row={row} client={client} config={config} />).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${row.contractor_name}_${monthTag(row.billing_month)}_Invoice.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
