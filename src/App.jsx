import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Candidates from './pages/Candidates'
import Submissions from './pages/Submissions'
import Quotations from './pages/Quotations'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="candidates" element={<Candidates />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="quotations" element={<Quotations />} />
      </Route>
    </Routes>
  )
}
