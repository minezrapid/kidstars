import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getInvite, markInviteUsed, updateChildDoc } from '../../lib/firestore'
import { StarLogo } from '../../components/StarLogo'
import { Spinner } from '../../components/Spinner'

export function RegisterChildPage() {
  const { registerChild } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [invite, setInvite] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(true)
  const [inviteError, setInviteError] = useState('')
  const [form, setForm] = useState({ email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadInvite() {
      if (!token) { setInviteError('Link invalid. Cere un nou link de la administrator.'); setInviteLoading(false); return }
      const inv = await getInvite(token)
      if (!inv) { setInviteError('Link-ul nu este valid sau a expirat.'); setInviteLoading(false); return }
      if (inv.used) { setInviteError('Acest link a fost deja folosit.'); setInviteLoading(false); return }
      if (inv.expiresAt && inv.expiresAt.toDate && inv.expiresAt.toDate() < new Date()) {
        setInviteError('Link-ul a expirat. Cere un nou link.'); setInviteLoading(false); return
      }
      setInvite(inv)
      setForm(f => ({ ...f, email: inv.email || '' }))
      setInviteLoading(false)
    }
    loadInvite()
  }, [token])

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Parolele nu coincid.'); return }
    if (form.password.length < 6) { setError('Parola trebuie să aibă minim 6 caractere.'); return }
    setLoading(true)
    try {
      const userCred = await registerChild(form.email, form.password, {
        displayName: invite.childName,
        childName: invite.childName,
        ageGroup: invite.ageGroup,
        adminId: invite.adminId,
        childId: invite.childId || null,
        gender: invite.gender || 'girl',
      })

      // Link userId to the children doc so admin can find this child
      if (invite.childId) {
        try {
          await updateChildDoc(invite.childId, { userId: userCred.uid })
        } catch (err) {
          console.warn('Could not link userId to childDoc:', err)
        }
      }

      await markInviteUsed(token)
      navigate('/child')
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('Acest email este deja înregistrat.')
      else setError('A apărut o eroare. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  if (inviteLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size={36} /></div>

  if (inviteError) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }} className="fade-in">
        <StarLogo size={56} />
        <div className="card card-lg" style={{ marginTop: '1.5rem' }}>
          <p style={{ color: '#E24B4A', fontWeight: 600 }}>{inviteError}</p>
          <Link to="/login" className="btn btn-ghost btn-full" style={{ marginTop: '1rem' }}>Mergi la login</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1.5rem', background: 'linear-gradient(135deg, var(--green-50) 0%, var(--gray-50) 60%)'
    }}>
      <div style={{ maxWidth: 420, width: '100%' }} className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <StarLogo size={56} />
          <div style={{ fontSize: 48, marginTop: '0.75rem' }}>{invite.gender === 'girl' ? '👧' : '👦'}</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginTop: '0.5rem', color: 'var(--purple-800)' }}>
            Bun venit, {invite.childName}!
          </h1>
          <p style={{ marginTop: 4, color: 'var(--gray-600)' }}>Creează-ți contul pentru a începe să câștigi stele.</p>
        </div>

        <div style={{ background: 'var(--green-50)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: 'var(--green-800)' }}>
          <span style={{ fontSize: 20 }}>🎉</span>
          <span>Ai fost invitat(ă) să te alături KidStars!</span>
        </div>

        <div className="card card-lg">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" type="email" value={form.email} onChange={set('email')}
                placeholder="email@exemplu.com" required autoFocus={!invite.email}
                readOnly={!!invite.email} style={invite.email ? { background: 'var(--gray-100)', color: 'var(--gray-600)' } : {}} />
              {invite.email && <span className="input-hint">Email setat de administrator</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Parolă secretă</label>
              <input className="input" type="password" value={form.password} onChange={set('password')}
                placeholder="Alege o parolă secretă" required />
            </div>
            <div className="input-group">
              <label className="input-label">Confirmă parola</label>
              <input className={`input ${error.includes('Parole') ? 'error' : ''}`}
                type="password" value={form.confirm} onChange={set('confirm')}
                placeholder="Repetă parola" required />
            </div>
            {error && <p style={{ fontSize: '0.875rem', color: '#E24B4A', textAlign: 'center' }}>{error}</p>}
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <Spinner size={18} color="white" /> : 'Creează contul meu ⭐'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
