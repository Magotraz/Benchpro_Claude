import { useState } from 'react'
import { Plus, Building2, Pencil, Trash2, Globe2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/Modal'

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

const EMPTY = {
  client_name: '', legal_name: '', billing_address: '', city: '', state: '',
  country: 'India', gstin: '', is_overseas: false, default_hsn_sac: '998513',
}

// Admin-only client master for the Billing module. `clients` + `onChanged` are
// owned by the parent so the record form's dropdown stays in sync after edits.
export default function BillingClients({ clients, onChanged }) {
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function openCreate() { setForm(EMPTY); setEditingId(null); setError(''); setModal(true) }

  function openEdit(c) {
    setForm({
      client_name:     c.client_name ?? '',
      legal_name:      c.legal_name ?? '',
      billing_address: c.billing_address ?? '',
      city:            c.city ?? '',
      state:           c.state ?? '',
      country:         c.country ?? 'India',
      gstin:           c.gstin ?? '',
      is_overseas:     !!c.is_overseas,
      default_hsn_sac: c.default_hsn_sac ?? '998513',
    })
    setEditingId(c.id); setError(''); setModal(true)
  }

  function setField(key) { return (e) => setForm(f => ({ ...f, [key]: e.target.value })) }

  async function save(e) {
    e.preventDefault(); setError(''); setSaving(true)
    const payload = {
      client_name:     form.client_name.trim(),
      legal_name:      form.legal_name.trim(),       // NOT NULL
      billing_address: form.billing_address.trim(),  // NOT NULL
      city:            form.city.trim() || null,
      state:           form.state.trim(),            // NOT NULL
      country:         form.country.trim() || 'India',
      gstin:           form.gstin.trim() || null,
      is_overseas:     form.is_overseas,
      default_hsn_sac: form.default_hsn_sac.trim() || '998513',
    }
    let err
    if (editingId) {
      ({ error: err } = await supabase.from('billing_clients').update(payload).eq('id', editingId))
    } else {
      ({ error: err } = await supabase.from('billing_clients').insert(payload))
    }
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false); setModal(false); onChanged?.()
  }

  async function remove(c) {
    if (!window.confirm(`Delete client "${c.client_name}"? Billing records keep their stored client name but lose the link.`)) return
    const { error: err } = await supabase.from('billing_clients').delete().eq('id', c.id)
    if (err) { setError(err.message); return }
    onChanged?.()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-gray-500">{clients.length} client{clients.length === 1 ? '' : 's'}</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={16} /> New Client
        </button>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-14">
          <Building2 size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No clients yet</p>
          <button onClick={openCreate} className="mt-4 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">New Client</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                {['Client', 'Legal Name', 'Location', 'GSTIN', 'Type', 'HSN/SAC'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.client_name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.legal_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{[c.city, c.state, c.country].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.gstin || '—'}</td>
                  <td className="px-4 py-3">
                    {c.is_overseas
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700"><Globe2 size={11} /> Overseas</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Domestic</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.default_hsn_sac || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} title="Edit" className="p-1.5 text-gray-400 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => remove(c)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={editingId ? 'Edit Client' : 'New Client'} onClose={() => setModal(false)} wide>
          {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Client Name (short) <span className="text-red-500">*</span></label>
                <input required value={form.client_name} onChange={setField('client_name')} placeholder="Synechron" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Legal Name <span className="text-red-500">*</span></label>
                <input required value={form.legal_name} onChange={setField('legal_name')} placeholder="Synechron Technologies Pvt. Ltd." className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Billing Address <span className="text-red-500">*</span></label>
                <textarea required rows={2} value={form.billing_address} onChange={setField('billing_address')} placeholder="Street, area…" className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input value={form.city} onChange={setField('city')} placeholder="Bhubaneswar" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>State <span className="text-red-500">*</span></label>
                <input required value={form.state} onChange={setField('state')} placeholder="Odisha" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <input value={form.country} onChange={setField('country')} placeholder="India" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>GSTIN</label>
                <input value={form.gstin} onChange={setField('gstin')} placeholder="22AAAAA0000A1Z5" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Default HSN/SAC</label>
                <input value={form.default_hsn_sac} onChange={setField('default_hsn_sac')} placeholder="998513" className={inputCls} />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={form.is_overseas} onChange={e => setForm(f => ({ ...f, is_overseas: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm font-medium text-gray-700">Overseas client (export, 0% GST/TDS)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Client'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
