import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Loader2, Save, LogOut } from 'lucide-react'
import { getCurrentUser, updateUserProfile, signOut, listSchools } from '@/lib/api'
import type { User } from '@/lib/types'
import { ROLE_LABEL } from '@/lib/types'
import { toast } from 'sonner'

export function ProfilePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [schools, setSchools] = useState<{ id: string; name: string; region: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCurrentUser().then(u => {
      setUser(u); setName(u?.name ?? ''); setBio(u?.bio ?? ''); setPhone(u?.phone ?? ''); setSchoolId(u?.school_id ?? '')
    })
    listSchools().then(s => setSchools((s ?? []) as { id: string; name: string; region: string }[]))
  }, [])

  const save = async () => {
    if (!user) return
    setSaving(true)
    try {
      const updated = await updateUserProfile(user.id, { name, bio, phone, school_id: schoolId || null })
      setUser(updated)
      toast.success('Profile updated')
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  const logout = async () => {
    await signOut()
    localStorage.removeItem('eh_uid')
    navigate('/')
  }

  if (!user) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin" /></div>

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-hero text-white">
        <div className="mx-auto max-w-2xl px-4 py-6 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-white/70 hover:text-white text-sm">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="text-lg font-bold">My Profile</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-20 w-20 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg" style={{ background: 'var(--navy)' }}>
              {user.name[0]?.toUpperCase()}
            </div>
            <button className="absolute bottom-0 right-0 h-7 w-7 rounded-full flex items-center justify-center shadow border-2 border-white" style={{ background: 'var(--green)' }}>
              <Camera className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
          <div>
            <p className="font-bold text-lg">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border mt-1 bg-primary/10 text-primary border-primary/20">{ROLE_LABEL[user.role]}</span>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Personal details</h2>
          {[
            { label: 'Full Name', value: name, set: setName, type: 'text' },
            { label: 'Phone', value: phone, set: setPhone, type: 'tel' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-sm font-medium mb-1.5">{f.label}</label>
              <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium mb-1.5">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          {user.role !== 'super_admin' && (  // students and teachers can set their school
            <div>
              <label className="block text-sm font-medium mb-1.5">School</label>
              <select value={schoolId} onChange={e => setSchoolId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">— Independent / No school —</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name} — {s.region}</option>)}
              </select>
            </div>
          )}
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--green)' }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>

        {/* Danger zone */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-800 mb-3">Account</h2>
          <button onClick={logout} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
