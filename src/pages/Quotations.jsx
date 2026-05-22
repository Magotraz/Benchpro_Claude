import { Plus, ArrowRight, DollarSign } from 'lucide-react'

const quotations = [
  { id: 'Q-2026-001', client: 'TechCorp Inc.',      role: 'Senior React Developer', amount: '$18,000', fee: '$5,400',  date: '2026-05-20', status: 'Pending' },
  { id: 'Q-2026-002', client: 'Acme Ltd',            role: 'DevOps Engineer',        amount: '$15,000', fee: '$4,500',  date: '2026-05-18', status: 'Approved' },
  { id: 'Q-2026-003', client: 'StartupXYZ',          role: 'Product Manager',        amount: '$20,000', fee: '$6,000',  date: '2026-05-17', status: 'Sent' },
  { id: 'Q-2026-004', client: 'DataViz Corp',         role: 'Data Scientist',         amount: '$22,000', fee: '$6,600',  date: '2026-05-15', status: 'Approved' },
  { id: 'Q-2026-005', client: 'Creative Studio',      role: 'UX Designer',            amount: '$12,000', fee: '$3,600',  date: '2026-05-14', status: 'Declined' },
  { id: 'Q-2026-006', client: 'FinTech Solutions',    role: 'Backend Engineer',       amount: '$25,000', fee: '$7,500',  date: '2026-05-10', status: 'Invoiced' },
]

const statusColors = {
  Pending:  'bg-amber-100 text-amber-700',
  Sent:     'bg-blue-100 text-blue-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Invoiced: 'bg-indigo-100 text-indigo-700',
  Declined: 'bg-red-100 text-red-600',
}

const totalFees = quotations
  .filter((q) => q.status === 'Approved' || q.status === 'Invoiced')
  .reduce((sum, q) => sum + parseFloat(q.fee.replace(/[$,]/g, '')), 0)

export default function Quotations() {
  return (
    <div className="space-y-5">
      {/* Summary card */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl p-5 text-white flex items-center justify-between">
        <div>
          <p className="text-indigo-200 text-sm">Approved Revenue (MTD)</p>
          <p className="text-3xl font-bold mt-1">${totalFees.toLocaleString()}</p>
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
          <DollarSign size={24} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{quotations.length} quotations</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">
          <Plus size={16} /> New Quotation
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Quote ID</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Client</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 hidden md:table-cell">Role</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 hidden lg:table-cell">Salary</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 hidden sm:table-cell">Fee</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quotations.map((q) => (
              <tr key={q.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-5 py-4 font-mono text-xs text-gray-400">{q.id}</td>
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-800">{q.client}</p>
                  <p className="text-xs text-gray-400">{q.date}</p>
                </td>
                <td className="px-5 py-4 hidden md:table-cell text-gray-600">{q.role}</td>
                <td className="px-5 py-4 hidden lg:table-cell text-gray-600">{q.amount}</td>
                <td className="px-5 py-4 hidden sm:table-cell font-semibold text-gray-800">{q.fee}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[q.status]}`}>
                    {q.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <ArrowRight size={15} className="text-gray-300 inline" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
