import { Plus, MapPin, Clock, Users } from 'lucide-react'

const jobs = [
  { id: 1, title: 'Senior React Developer',   company: 'TechCorp Inc.',    location: 'Remote',       type: 'Full-time', candidates: 14, status: 'Active',  posted: '2d ago' },
  { id: 2, title: 'DevOps Engineer',           company: 'Acme Ltd',         location: 'New York, NY', type: 'Full-time', candidates: 8,  status: 'Active',  posted: '3d ago' },
  { id: 3, title: 'Product Manager',           company: 'StartupXYZ',       location: 'San Francisco',type: 'Full-time', candidates: 22, status: 'Active',  posted: '5d ago' },
  { id: 4, title: 'Data Scientist',            company: 'DataViz Corp',     location: 'Remote',       type: 'Contract',  candidates: 6,  status: 'On Hold', posted: '1w ago' },
  { id: 5, title: 'UX Designer',               company: 'Creative Studio',  location: 'Austin, TX',   type: 'Full-time', candidates: 18, status: 'Active',  posted: '1w ago' },
  { id: 6, title: 'Backend Engineer (Go)',     company: 'FinTech Solutions', location: 'Remote',       type: 'Full-time', candidates: 10, status: 'Closed',  posted: '2w ago' },
]

const statusColors = {
  Active:   'bg-emerald-100 text-emerald-700',
  'On Hold': 'bg-amber-100 text-amber-700',
  Closed:   'bg-gray-100 text-gray-500',
}

export default function Jobs() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{jobs.length} jobs found</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">
          <Plus size={16} /> Post Job
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Job Title</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 hidden md:table-cell">Location</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 hidden lg:table-cell">Type</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 hidden sm:table-cell">Candidates</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500 hidden xl:table-cell">Posted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-800">{job.title}</p>
                  <p className="text-xs text-gray-400">{job.company}</p>
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <span className="flex items-center gap-1 text-gray-500">
                    <MapPin size={13} /> {job.location}
                  </span>
                </td>
                <td className="px-5 py-4 hidden lg:table-cell text-gray-500">{job.type}</td>
                <td className="px-5 py-4 hidden sm:table-cell">
                  <span className="flex items-center gap-1 text-gray-500">
                    <Users size={13} /> {job.candidates}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status]}`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-5 py-4 hidden xl:table-cell">
                  <span className="flex items-center gap-1 text-gray-400 text-xs">
                    <Clock size={11} /> {job.posted}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
