import { Plus, Mail, Phone, Star } from 'lucide-react'

const candidates = [
  { id: 1,  name: 'Jane Doe',         role: 'Senior React Developer', email: 'jane@example.com',  phone: '+1 555-0101', rating: 5, status: 'Interviewing', avatar: 'JD' },
  { id: 2,  name: 'Alex Kumar',       role: 'DevOps Lead',             email: 'alex@example.com',  phone: '+1 555-0102', rating: 4, status: 'Shortlisted',  avatar: 'AK' },
  { id: 3,  name: 'Maria Garcia',     role: 'Product Manager',         email: 'maria@example.com', phone: '+1 555-0103', rating: 4, status: 'New',          avatar: 'MG' },
  { id: 4,  name: 'John Smith',       role: 'Data Scientist',          email: 'john@example.com',  phone: '+1 555-0104', rating: 3, status: 'Submitted',    avatar: 'JS' },
  { id: 5,  name: 'Priya Patel',      role: 'UX Designer',             email: 'priya@example.com', phone: '+1 555-0105', rating: 5, status: 'Offered',      avatar: 'PP' },
  { id: 6,  name: 'Chris Lee',        role: 'Backend Engineer',        email: 'chris@example.com', phone: '+1 555-0106', rating: 4, status: 'New',          avatar: 'CL' },
  { id: 7,  name: 'Sarah Johnson',    role: 'Full Stack Developer',    email: 'sarah@example.com', phone: '+1 555-0107', rating: 3, status: 'Rejected',     avatar: 'SJ' },
]

const statusColors = {
  New:          'bg-blue-100 text-blue-700',
  Shortlisted:  'bg-indigo-100 text-indigo-700',
  Interviewing: 'bg-amber-100 text-amber-700',
  Submitted:    'bg-purple-100 text-purple-700',
  Offered:      'bg-emerald-100 text-emerald-700',
  Rejected:     'bg-red-100 text-red-600',
}

export default function Candidates() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{candidates.length} candidates</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">
          <Plus size={16} /> Add Candidate
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {candidates.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold">
                  {c.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.role}</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status]}`}>
                {c.status}
              </span>
            </div>

            <div className="space-y-1.5 text-sm text-gray-500">
              <p className="flex items-center gap-2"><Mail size={13} /> {c.email}</p>
              <p className="flex items-center gap-2"><Phone size={13} /> {c.phone}</p>
            </div>

            <div className="mt-3 flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < c.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
