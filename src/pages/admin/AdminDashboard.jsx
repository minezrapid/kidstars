import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getChildren, getChildState, getChildConfig } from '../../lib/firestore'
import { AdminLayout } from './AdminLayout'
import { Spinner } from '../../components/Spinner'

export function AdminDashboard() {
  const { user, profile } = useAuth()
  const [adminData, setAdminData] = useState(null)
  const [children, setChildren] = useState([])
  const [childStates, setChildStates] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const kids = await getChildren(user.uid)
      // Get config from first child for stats display
      const data = kids.length > 0 ? await getChildConfig(user.uid, kids[0].id) : null
      setAdminData(data)
      setChildren(kids)
      const states = {}
      await Promise.all(kids.map(async kid => {
        const s = await getChildState(user.uid, kid.id)
        if (s) states[kid.id] = s
      }))
      setChildStates(states)
      setLoading(false)
    }
    load()
  }, [user.uid])

  if (loading) return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <Spinner size={36} />
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout>
      <div className="fade-in">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--purple-800)' }}>
            Bună ziua, {profile?.displayName}! 👋
          </h1>
          <p style={{ marginTop: 4 }}>Iată un sumar al activității de azi.</p>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12, marginBottom: '2rem' }}>
          <StatCard label="Copii înregistrați" value={children.length} icon="👦" />
          <StatCard label="Sarcini configurate" value={(adminData?.tasks1?.length || 0) + (adminData?.tasks2?.length || 0)} icon="📋" />
          <StatCard label="Recompense active" value={adminData?.rewards?.length || 0} icon="🎁" />
        </div>

        {/* Children list */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
            <h2 style={{ fontSize: '1.125rem' }}>Copiii tăi</h2>
            <Link to="/admin/invites" className="btn btn-secondary btn-sm">+ Invită copil</Link>
          </div>

          {children.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: 40, marginBottom: '0.75rem' }}>👶</div>
              <p style={{ marginBottom: '1rem' }}>Nu ai invitat niciun copil încă.</p>
              <Link to="/admin/invites" className="btn btn-primary">Invită primul copil</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {children.map(kid => {
                const state = childStates[kid.id]
                const stars = state?.stars || 0
                const done = state?.done ? Object.values(state.done).filter(Boolean).length : 0
                const totalTasks = (adminData?.tasks1?.length || 0) + (adminData?.tasks2?.length || 0)
                return (
                  <div key={kid.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'var(--purple-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, flexShrink: 0,
                    }}>
                      {kid.gender === 'girl' ? '👧' : '👦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>{kid.childName}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginTop: 2 }}>
                        {kid.ageGroup} ani · {done}/{totalTasks} sarcini azi
                      </div>
                      <div style={{ height: 5, background: 'var(--gray-100)', borderRadius: 3, marginTop: 6 }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          background: done === totalTasks ? 'var(--green-600)' : 'var(--purple-400)',
                          width: totalTasks ? `${Math.round(done / totalTasks * 100)}%` : '0%',
                          transition: 'width 0.4s',
                        }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--purple-600)' }}>
                        {stars} ⭐
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>stele total</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '0.875rem' }}>Acțiuni rapide</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 10 }}>
            {[
              { to: '/admin/settings', icon: '⚙️', label: 'Editează sarcini și recompense' },
              { to: '/admin/invites',  icon: '✉️',  label: 'Trimite invitație copil' },
              { to: '/admin/children', icon: '👀', label: 'Vezi profilurile copiilor' },
            ].map(q => (
              <Link key={q.to} to={q.to} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '1.25rem 1rem', textAlign: 'center', textDecoration: 'none',
                background: 'var(--white)', border: '1px solid var(--gray-200)',
                borderRadius: 'var(--radius-lg)', color: 'var(--gray-900)',
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem',
                transition: 'all 0.15s',
              }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--purple-400)'}
                 onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--gray-200)'}>
                <span style={{ fontSize: 28 }}>{q.icon}</span>
                {q.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function StatCard({ label, value, icon }) {
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--gray-200)',
      borderRadius: 'var(--radius-md)', padding: '1rem',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--purple-800)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  )
}
