import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { updatePassword } from '@/lib/api'
import { toast } from 'sonner'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await updatePassword(password)
      toast.success('Password updated successfully')
      navigate('/dashboard')
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #001f3f 0%, #003366 100%)' }}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 p-8" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3 mb-8 text-white">
          <img src="/tz-coat-of-arms.png" alt="" className="h-8 w-8 object-contain" />
          <span className="font-bold">ExamHub <span style={{ color: 'var(--gold)' }}>Tanzania</span></span>
        </div>
        <h2 className="text-xl font-bold text-white mb-6">Set new password</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">New password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Confirm password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30" />
          </div>
          <button onClick={handle} disabled={loading}
            className="w-full rounded-xl py-3.5 font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'var(--green)' }}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </button>
        </div>
      </div>
    </div>
  )
}
