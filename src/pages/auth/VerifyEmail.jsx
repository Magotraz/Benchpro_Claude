import { useLocation, Link } from 'react-router-dom'
import { Mail } from 'lucide-react'

export default function VerifyEmail() {
  const { state } = useLocation()
  const email = state?.email ?? 'your email address'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <Mail size={28} className="text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Check your inbox</h2>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          We've sent a verification link to{' '}
          <span className="font-semibold text-gray-700">{email}</span>.
          Click the link in that email to activate your account.
        </p>
        <p className="mt-4 text-xs text-gray-400">
          Didn't receive it? Check your spam folder, or{' '}
          <Link to="/login" className="text-brand-600 hover:underline">go back to sign in</Link>.
        </p>
      </div>
    </div>
  )
}
