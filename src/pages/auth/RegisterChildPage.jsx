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
      if (!token) {
        setInviteError('Link invalid. Cere un nou link de la administrator.')
        setInviteLoading(false)
        return
      }
      try {
        const inv = await getInvite(token)
        if (!inv) { setInviteError('Link-ul nu este valid sau a expirat.'); setInviteLoading(false); return }
        if (inv.used) { setInviteError('Acest link a fost deja folosit. Cere un nou link.'); setInviteLoading(false); return }
        if (inv.expiresAt?.toDate && inv.expiresAt.toDate() < new Date()) {
          setInviteError('Link-ul a expirat. Cere un nou link de la administrator.')
          setInviteLoading(false)
          return
        }
        setInvite(inv)
        // Pre-fill email but keep editable in case there's a conflict
        setForm(f => ({ ...f, email: inv.email || '' }))
      } catch(e) {
        setInviteError('Eroare la încărcarea invitației: ' + e.message)
      }
      setInviteLoading(false)
    }
    loadInvite()
  }, [token])

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.email) { setError('Introdu o adresă de email.'); return }
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
      // Link userId to children doc
      if (invite.childId && userCred?.uid) {
        try { await updateChildDoc(invite.childId, { userId: userCred.uid }) }
        catch(e) { console.warn('Could not link userId:', e) }
      }
      await markInviteUsed(token)
      navigate('/child')
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Există deja un cont cu acest email. Încearcă alt email sau accesează pagina de login.',
        'auth/invalid-email': 'Adresa de email nu este validă.',
        'auth/weak-password': 'Parola este prea slabă. Încearcă una mai lungă.',
        'auth/network-request-failed': 'Eroare de rețea. Verifică conexiunea la internet.',
      }
      setError(msgs[err.code] || 'A apărut o eroare. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  if (inviteLoading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Spinner size={36}/>
    </div>
  )

  if (inviteError) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
      <div style={{ maxWidth:400, width:'100%', textAlign:'center' }} className="fade-in">
        <StarLogo size={56}/>
        <div className="card card-lg" style={{ marginTop:'1.5rem' }}>
          <div style={{ fontSize:40, marginBottom:'0.75rem' }}>😕</div>
          <p style={{ color:'#E24B4A', fontWeight:600, marginBottom:'1rem' }}>{inviteError}</p>
          <Link to="/login" className="btn btn-ghost btn-full">Mergi la pagina de login</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      padding:'2rem 1.5rem', background:'linear-gradient(135deg, var(--green-50) 0%, var(--gray-50) 60%)'
    }}>
      <div style={{ maxWidth:420, width:'100%' }} className="fade-in">
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <StarLogo size={56}/>
          <div style={{ fontSize:48, marginTop:'0.75rem' }}>{invite.gender==='girl'?'👧':'👦'}</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.75rem', marginTop:'0.5rem', color:'var(--purple-800)' }}>
            Bun venit, {invite.childName}!
          </h1>
          <p style={{ marginTop:4, color:'var(--gray-600)' }}>Creează-ți contul pentru a începe să câștigi stele. ⭐</p>
        </div>

        <div style={{ background:'var(--green-50)', borderRadius:'var(--radius-md)', padding:'12px 16px', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:10, fontSize:'0.875rem', color:'var(--green-800)' }}>
          <span style={{ fontSize:20 }}>🎉</span>
          <span>Ai fost invitat(ă) de administrator să te alături KidStars!</span>
        </div>

        <div className="card card-lg">
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" type="email" value={form.email} onChange={set('email')}
                placeholder="email@exemplu.com" required autoFocus={!invite.email}/>
              {invite.email && (
                <span className="input-hint">Pre-completat de administrator. Poți modifica dacă e necesar.</span>
              )}
            </div>
            <div className="input-group">
              <label className="input-label">Parolă secretă</label>
              <input className="input" type="password" value={form.password} onChange={set('password')}
                placeholder="Alege o parolă secretă (minim 6 caractere)" required/>
            </div>
            <div className="input-group">
              <label className="input-label">Confirmă parola</label>
              <input className={`input ${error.includes('Parolele')?'error':''}`}
                type="password" value={form.confirm} onChange={set('confirm')}
                placeholder="Repetă parola" required/>
            </div>
            {error && (
              <div style={{ background:'#FCEBEB', border:'1px solid #EBA8C0', borderRadius:'var(--radius-sm)', padding:'10px 14px', fontSize:'0.875rem', color:'#A32D2D' }}>
                {error}
                {error.includes('deja un cont') && (
                  <div style={{ marginTop:6 }}>
                    <Link to="/login" style={{ color:'var(--purple-600)', fontWeight:600, textDecoration:'none' }}>
                      → Mergi la pagina de login
                    </Link>
                  </div>
                )}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <Spinner size={18} color="white"/> : 'Creează contul meu ⭐'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
