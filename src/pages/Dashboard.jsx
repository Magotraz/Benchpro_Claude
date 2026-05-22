import { Briefcase, Users, FileText, ReceiptText, TrendingUp, Clock } from 'lucide-react'

const stats = [
  { label: 'Active Jobs',      value: '24',  change: '+3',  icon: Briefcase,   color: 'bg-indigo-50 text-indigo-600' },
  { label: 'Candidates',       value: '187', change: '+12', icon: Users,       color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Submissions',      value: '56',  change: '+7',  icon: FileText,    color: 'bg-amber-50 text-amber-600' },
  { label: 'Open Quotations',  value: '9',   change: '+1',  icon: ReceiptText, color: 'bg-rose-50 text-rose-600' },
]

const recentActivity = [
  { action: 'New candidate applied',  detail: 'Jane Doe → Senior React Developer',  time: '5m ago' },
  { action: 'Submission sent',        detail: 'John Smith → TechCorp Inc.',          time: '1h ago' },
  { action: 'Job posted',             detail: 'Full Stack Engineer @ Acme Ltd',      time: '2h ago' },
  { action: 'Quotation approved',     detail: 'Q-2024-009 · $12,000',               time: '4h ago' },
  { action: 'Candidate shortlisted',  detail: 'Alex Kumar → DevOps Lead',            time: '6h ago' },
]

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map(({ label, value, change, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                <TrendingUp size={11} /> {change} this week
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Recent Activity</h2>
          <button className="text-sm text-brand-600 hover:underline">View all</button>
        </div>
        <ul className="divide-y divide-gray-100">
          {recentActivity.map(({ action, detail, time }) => (
            <li key={detail} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">{action}</p>
                <p className="text-xs text-gray-400 truncate">{detail}</p>
              </div>
              <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                <Clock size={11} /> {time}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
