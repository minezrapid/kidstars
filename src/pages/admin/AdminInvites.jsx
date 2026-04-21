import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { createInvite, createGuestLink, getAdminInvites } from '../../lib/firestore'
import { AdminLayout } from './AdminLayout'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'

const AGE_GROUPS = [
  { value: '3-6',   label: '🧸 3–6 ani (Micul explorator)' },
  { value: '7-10',  label: '🚀 7–10 ani (Aventurierul)' },
  { value: '11-14', label: '🎯 11–14 ani (Campionul)' },
  { value: '14-18', label: '🏆 14–18 ani (Liderul)' },
]

export function AdminInvites() {
  const { user } = useAuth()
  const toast = useToast()
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [guestLink, setGuestLink] = useState('')
  const [creatingGuest, setCreatingGuest] = useState(false)

  const [form, setForm] = useState({ childName: '', email: '', ageGroup: '7-10' })

  const BASE_URL = window.location.origin

  useEffect(() => {
    loadInvites()
  }, [user.uid])

  async function loadInvites() {
    const inv = await getAdminInvites(user.uid)
    setInvites(inv.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
    setLoading(false)
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!form.childName || !form.ageGroup) return
    setSending(true)
    try {
      const token = await createInvite(user.uid, {
        email: form.email,
        role: 'child',
        ageGroup: form.ageGroup,
        childName: form.childName,
      })
      const link = `${BASE_URL}/register/child?token=${token}`

      // Send email via Resend API (called from client with VITE_ key)
      // In production move this to a Firebase Function for security
      if (form.email && import.meta.env.VITE_RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: form.email,
            subject: `${form.childName} a fost invitat(ă) pe KidStars! ⭐`,
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
                <h1 style="color: #534AB7; font-size: 28px; margin-bottom: 8px;">KidStars ⭐</h1>
                <h2 style="color: #1A1A18; font-size: 20px;">Bun venit, ${form.childName}!</h2>
                <p style="color: #5F5E5A; line-height: 1.6;">
                  Ai fost invitat(ă) să te alături KidStars — aplicația unde poți câștiga stele
                  pentru sarcini zilnice și le poți transforma în recompense!
                </p>
                <a href="${link}" style="
                  display: inline-block; margin: 24px 0;
                  background: #534AB7; color: white;
                  text-decoration: none; padding: 14px 28px;
                  border-radius: 50px; font-weight: 700; font-size: 16px;
                ">
                  Creează-mi contul →
                </a>
                <p style="color: #9B9992; font-size: 13px;">Link-ul expiră în 7 zile.</p>
              </div>
            `,
          }),
        })
      }

      await loadInvites()
      setForm({ childName: '', email: '', ageGroup: '7-10' })
      toast(form.email ? 'Invitație trimisă pe email! 📧' : 'Link creat! Copiază-l și trimite-l.', 'success')
    } catch {
      toast('Eroare la trimiterea invitației.', 'error')
    } finally {
      setSending(false)
    }
  }

  async function handleGuestLink() {
    setCreatingGuest(true)
    try {
      const token = await createGuestLink(user.uid)
      const link = `${BASE_URL}/view/${token}`
      setGuestLink(link)
      toast('Link guest creat!', 'success')
    } catch {
      toast('Eroare.', 'error')
    } finally {
      setCreatingGuest(false)
    }
  }

  function copyLink(link) {
    navigator.clipboard.writeText(link)
    toast('Link copiat! 📋', 'success')
  }

  return (
    <AdminLayout>
      <div className="fade-in">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--purple-800)' }}>Invitații</h1>
          <p style={{ marginTop: 4 }}>Invită copii sau creează link-uri de vizualizare.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Invite child */}
          <div className="card card-lg">
            <h3 style={{ marginBottom: '0.25rem' }}>👦 Invită un copil</h3>
            <p style={{ fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
              Copilul va primi un link de înregistrare cu acces la contul său.
            </p>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="input-group">
                <label className="input-label">Numele copilului *</label>
                <input className="input" value={form.childName} onChange={e => setForm(f => ({ ...f, childName: e.target.value }))}
                  placeholder="Ex: Maria" required />
              </div>
              <div className="input-group">
                <label className="input-label">Email copil (opțional)</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="maria@exemplu.com" />
                <span className="input-hint">Dacă adaugi emailul, trimitem invitația automat.</span>
              </div>
              <div className="input-group">
                <label className="input-label">Grupă de vârstă *</label>
                <select className="input" value={form.ageGroup} onChange={e => setForm(f => ({ ...f, ageGroup: e.target.value }))}>
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
            <h3 style={{ marginBottom: '0.25rem' }}>👁️ Link vizualizare (guest)</h3>
            <p style={{ fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
              Oricine cu acest link poate vedea progresul copilului în mod read-only,
              fără să se înregistreze.
            </p>
            {guestLink ? (
              <div>
                <div style={{
                  background: 'var(--gray-100)', borderRadius: 'var(--radius-md)',
                  padding: '10px 14px', fontSize: '0.8125rem', wordBreak: 'break-all',
                  color: 'var(--gray-600)', marginBottom: '0.75rem', fontFamily: 'monospace',
                }}>
                  {guestLink}
                </div>
                <button className="btn btn-secondary btn-full" onClick={() => copyLink(guestLink)}>
                  📋 Copiază link
                </button>
              </div>
            ) : (
              <button className="btn btn-ghost btn-full" onClick={handleGuestLink} disabled={creatingGuest}>
                {creatingGuest ? <Spinner size={16} /> : '🔗 Generează link guest'}
              </button>
            )}
            <div style={{
              marginTop: '1rem', padding: '10px 14px',
              background: 'var(--amber-50)', borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem', color: 'var(--amber-600)', lineHeight: 1.5,
            }}>
              ⚠️ Link-ul este permanent și poate fi distribuit oricui. Dacă vrei să îl dezactivezi,
              contactează-ne sau sterge-l din Firebase Console.
            </div>
          </div>
        </div>

        {/* Invites list */}
        <div>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '0.875rem' }}>Invitații trimise</h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner size={28} /></div>
          ) : invites.filter(i => i.role === 'child').length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
              Nicio invitație trimisă încă.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {invites.filter(i => i.role === 'child').map(inv => {
                const link = `${BASE_URL}/register/child?token=${inv.token}`
                return (
                  <div key={inv.token} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{inv.childName}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginTop: 2 }}>
                        {inv.email || 'Fără email'} · {inv.ageGroup} ani
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-display)',
                      background: inv.used ? 'var(--green-50)' : 'var(--amber-50)',
                      color: inv.used ? 'var(--green-800)' : 'var(--amber-600)',
                    }}>
                      {inv.used ? '✅ Acceptat' : '⏳ În așteptare'}
                    </span>
                    {!inv.used && (
                      <button className="btn btn-ghost btn-sm" onClick={() => copyLink(link)}>
                        📋 Copiază link
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
