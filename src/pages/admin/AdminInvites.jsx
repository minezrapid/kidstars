import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { createInvite, createGuestLink, getAdminInvites, cancelInvite, getChildren } from '../../lib/firestore'
import { AdminLayout } from './AdminLayout'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'

const AGE_GROUPS = [
  { value: '3-6',   label: '🧸 3–6 ani' },
  { value: '7-10',  label: '🚀 7–10 ani' },
  { value: '11-14', label: '🎯 11–14 ani' },
  { value: '14-18', label: '🏆 14–18 ani' },
]

export function AdminInvites() {
  const { user } = useAuth()
  const toast = useToast()
  const [invites, setInvites] = useState([])
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [guestLinks, setGuestLinks] = useState([])
  const [creatingGuest, setCreatingGuest] = useState(false)
  const [form, setForm] = useState({ childId: '', childName: '', email: '', ageGroup: '7-10', gender: 'girl' })
  const BASE_URL = window.location.origin

  useEffect(() => { load() }, [user.uid])

  async function load() {
    const [inv, kids] = await Promise.all([getAdminInvites(user.uid), getChildren(user.uid)])
    setInvites(inv.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)))
    setChildren(kids)
    setGuestLinks(inv.filter(i => i.role === 'guest' && i.permanent))
    setLoading(false)
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!form.childName || !form.ageGroup) return
    setSending(true)
    try {
      // Use existing child or create placeholder
      const childId = form.childId || `${user.uid}_${Date.now()}`
      const token = await createInvite(user.uid, childId, {
        email: form.email, role: 'child',
        ageGroup: form.ageGroup, childName: form.childName, gender: form.gender,
      })
      const link = `${BASE_URL}/register/child?token=${token}`

      // Send email via our serverless function (no CORS issues)
      if (form.email) {
        try {
          const res = await fetch('/api/send-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: form.email, childName: form.childName, link }),
          })
          const data = await res.json().catch(() => ({}))
          if (data.warning) {
            toast('Link creat! Email-ul nu s-a trimis — copiază link-ul manual.', 'success')
          } else {
            toast('Invitație trimisă pe email! 📧', 'success')
          }
        } catch {
          toast('Link creat! Email-ul nu s-a trimis — copiază link-ul manual.', 'success')
        }
      } else {
        toast('Link creat! Copiază-l și trimite-l copilului.', 'success')
      }
      await load()
      setForm({ childId: '', childName: '', email: '', ageGroup: '7-10', gender: 'girl' })
    } catch (err) {
      toast('Eroare: ' + err.message, 'error')
    } finally { setSending(false) }
  }

  async function handleCancel(token) {
    if (!confirm('Anulezi această invitație?')) return
    await cancelInvite(token)
    toast('Invitație anulată.', 'success')
    await load()
  }

  async function handleResend(inv) {
    if (!inv.email) { toast('Nu există email pentru retrimitere.', 'error'); return }
    const link = `${BASE_URL}/register/child?token=${inv.token}`
    try {
      const res = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: inv.email, childName: inv.childName, link }),
      })
      if (res.ok) toast('Email retrimis! 📧', 'success')
      else toast('Eroare la retrimitere.', 'error')
    } catch { toast('Eroare la retrimitere.', 'error') }
  }

  async function handleGuestLink() {
    setCreatingGuest(true)
    try {
      const token = await createGuestLink(user.uid)
      toast('Link guest creat!', 'success')
      await load()
    } catch { toast('Eroare.', 'error') }
    finally { setCreatingGuest(false) }
  }

  function copyLink(link) { navigator.clipboard.writeText(link); toast('Link copiat! 📋', 'success') }

  return (
    <AdminLayout>
      <div className="fade-in">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--purple-800)' }}>Invitații</h1>
          <p style={{ marginTop: 4 }}>Invită copii sau creează link-uri de vizualizare.</p>
        </div>

        {/* Responsive grid - stacks on mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>

          {/* Invite child */}
          <div className="card card-lg">
            <h3 style={{ marginBottom: '0.25rem' }}>👦 Invită un copil</h3>
            <p style={{ fontSize: '0.8125rem', marginBottom: '1.25rem', color: 'var(--gray-600)' }}>
              Copilul primește un link de înregistrare.
            </p>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="input-group">
                <label className="input-label">Numele copilului *</label>
                <input className="input" value={form.childName} onChange={e => setForm(f=>({...f, childName: e.target.value}))} placeholder="Ex: Maria" required />
              </div>
              <div className="input-group">
                <label className="input-label">Gen</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['girl','👧 Fată'],['boy','👦 Băiat']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => setForm(f=>({...f,gender:v}))} style={{
                      flex: 1, padding: '8px', borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${form.gender===v ? 'var(--purple-600)' : 'var(--gray-200)'}`,
                      background: form.gender===v ? 'var(--purple-50)' : 'transparent',
                      fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                    }}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Email copil (opțional)</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(f=>({...f, email: e.target.value}))} placeholder="copil@exemplu.com" />
                <span className="input-hint">Fără email: copiezi link-ul manual.</span>
              </div>
              <div className="input-group">
                <label className="input-label">Grupă de vârstă *</label>
                <select className="input" value={form.ageGroup} onChange={e => setForm(f=>({...f, ageGroup: e.target.value}))}>
                  {AGE_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={sending}>
                {sending ? <Spinner size={16} color="white" /> : '✉️ Trimite invitație'}
              </button>
            </form>
          </div>

          {/* Guest link */}
          <div className="card card-lg">
            <h3 style={{ marginBottom: '0.25rem' }}>👁️ Link vizualizare</h3>
            <p style={{ fontSize: '0.8125rem', marginBottom: '1.25rem', color: 'var(--gray-600)' }}>
              Oricine cu acest link poate vedea progresul în mod read-only, fără înregistrare.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {guestLinks.map(gl => {
                const link = `${BASE_URL}/view/${gl.token}`
                return (
                  <div key={gl.token} style={{ background: 'var(--gray-100)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', wordBreak: 'break-all', fontFamily: 'monospace', marginBottom: 8 }}>{link}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => copyLink(link)}>📋 Copiază</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleCancel(gl.token)}>🗑 Șterge</button>
                    </div>
                  </div>
                )
              })}
              <button className="btn btn-ghost btn-full" onClick={handleGuestLink} disabled={creatingGuest}>
                {creatingGuest ? <Spinner size={16} /> : '🔗 Generează link nou'}
              </button>
            </div>
            <div style={{ marginTop: '0.875rem', padding: '9px 12px', background: 'var(--amber-50)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--amber-600)' }}>
              ⚠️ Link-ul este permanent — oricine îl are poate vedea datele.
            </div>
          </div>
        </div>

        {/* Invites list */}
        <h2 style={{ fontSize: '1.125rem', marginBottom: '0.875rem' }}>Invitații trimise</h2>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner size={28} /></div>
        ) : invites.filter(i => i.role === 'child').length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Nicio invitație trimisă.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invites.filter(i => i.role === 'child').map(inv => {
              const link = `${BASE_URL}/register/child?token=${inv.token}`
              return (
                <div key={inv.token} className="card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: 22 }}>{inv.gender === 'girl' ? '👧' : '👦'}</span>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{inv.childName}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>{inv.email || 'Fără email'} · {inv.ageGroup} ani</div>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-display)', flexShrink: 0,
                    background: inv.used ? 'var(--green-50)' : 'var(--amber-50)',
                    color: inv.used ? 'var(--green-800)' : 'var(--amber-600)',
                  }}>
                    {inv.used ? '✅ Acceptat' : '⏳ În așteptare'}
                  </span>
                  {!inv.used && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => copyLink(link)}>📋 Link</button>
                      {inv.email && <button className="btn btn-ghost btn-sm" onClick={() => handleResend(inv)}>🔄 Retrimite</button>}
                      <button className="btn btn-danger btn-sm" onClick={() => handleCancel(inv.token)}>✕ Anulează</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
