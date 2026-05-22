import { Plus, ArrowRight } from 'lucide-react'

const submissions = [
  { id: 'SUB-001', candidate: 'Jane Doe',      job: 'Senior React Developer', company: 'TechCorp Inc.',     date: '2026-05-20', status: 'Pending Review' },
  { id: 'SUB-002', candidate: 'John Smith',    job: 'Data Scientist',         company: 'DataViz Corp',      date: '2026-05-19', status: 'Interview Scheduled' },
  { id: 'SUB-003', candidate: 'Alex Kumar',    job: 'DevOps Engineer',        company: 'Acme Ltd',          date: '2026-05-18', status: 'Offer Extended' },
  { id: 'SUB-004', candidate: 'Maria Garcia',  job: 'Product Manager',        company: 'StartupXYZ',        date: '2026-05-17', status: 'Pending Review' },
  { id: 'SUB-005', candidate: 'Priya Patel',   job: 'UX Designer',            company: 'Creative Studio',   date: '2026-05-15', status: 'Rejected' },
  { id: 'SUB-006', candidate: 'Chris Lee',     job: 'Backend Engineer (Go)',  company: 'FinTech Solutions',  date: '2026-05-14', status: 'Placed' },
]

const statusColors = {
  'Pending Review':       'bg-amber-100 text-amber-700',
  'Interview Scheduled':  'bg-blue-100 text-blue-700',
  'Offer Extended':       'bg-indigo-100 text-indigo-700',
  'Placed':               'bg-emerald-100 text-emerald-700',
  'Rejected':             'bg-red-100 text-red-600',
}

export default function Submissions() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{submissions.length} submissions</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">
          <Plus size={16} /> New Submission
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">ID</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Candidate</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 hidden md:table-cell">Position</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 hidden lg:table-cell">Date</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {submissions.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-5 py-4 font-mono text-xs text-gray-400">{s.id}</td>
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-800">{s.candidate}</p>
                  <p className="text-xs text-gray-400">{s.company}</p>
                </td>
                <td className="px-5 py-4 hidden md:table-cell text-gray-600">{s.job}</td>
                <td className="px-5 py-4 hidden lg:table-cell text-gray-400 text-xs">{s.date}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status]}`}>
                    {s.status}
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
