import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getChildren, getChildState, getAdminData } from '../../lib/firestore'
import { AdminLayout } from './AdminLayout'
import { Spinner } from '../../components/Spinner'

export function AdminChildren() {
  const { user } = useAuth()
  const [children, setChildren] = useState([])
  const [childStates, setChildStates] = useState({})
  const [adminData, setAdminData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [kids, data] = await Promise.all([getChildren(user.uid), getAdminData(user.uid)])
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

  if (loading) return <AdminLayout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size={36} /></div></AdminLayout>

  return (
    <AdminLayout>
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--purple-800)' }}>Copii</h1>
            <p style={{ marginTop: 4 }}>Urmărește progresul fiecărui copil.</p>
          </div>
          <Link to="/admin/invites" className="btn btn-primary">+ Invită copil</Link>
        </div>

        {children.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>👶</div>
            <p style={{ marginBottom: '1.25rem' }}>Niciun copil înregistrat încă.</p>
            <Link to="/admin/invites" className="btn btn-primary">Invită primul copil</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {children.map(kid => {
              const state = childStates[kid.id]
              const stars = state?.stars || 0
              const starValue = adminData?.starValue || 0.10
              const done = state?.done ? Object.values(state.done).filter(Boolean).length : 0
              const totalTasks = (adminData?.tasks1?.length || 0) + (adminData?.tasks2?.length || 0)
              const history = state?.history || []
              const recentHistory = [...history].reverse().slice(0, 5)

              return (
                <div key={kid.id} className="card card-lg">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--purple-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                      {kid.ageGroup === '3-6' ? '🧸' : kid.ageGroup === '7-10' ? '🚀' : kid.ageGroup === '11-14' ? '🎯' : '🏆'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem' }}>{kid.childName}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginTop: 2 }}>
                        {kid.ageGroup} ani · {kid.email}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--purple-600)', lineHeight: 1 }}>
                        {stars} ⭐
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginTop: 2 }}>
                        = {(stars * starValue).toFixed(2)} RON
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginBottom: 6 }}>Progres azi</div>
                      <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 4 }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          background: done === totalTasks && totalTasks > 0 ? 'var(--green-600)' : 'var(--purple-400)',
                          width: totalTasks ? `${Math.round(done / totalTasks * 100)}%` : '0%',
                          transition: 'width 0.4s',
                        }} />
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginTop: 4, fontWeight: 600 }}>
                        {done} / {totalTasks} sarcini completate
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginBottom: 6 }}>Luna aceasta</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
                        +{state?.earnedMonth || 0} ⭐ câștigate
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginTop: 2 }}>
                        -{state?.spentMonth || 0} ⭐ folosite
                      </div>
                    </div>
                  </div>

                  {recentHistory.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginBottom: 8 }}>Activitate recentă</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {recentHistory.map((h, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '4px 0', borderBottom: i < recentHistory.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                            <span style={{ color: 'var(--gray-600)' }}>{h.desc}</span>
                            <span style={{ fontWeight: 700, color: h.pts > 0 ? 'var(--green-600)' : h.pts < 0 ? '#A32D2D' : 'var(--gray-400)', flexShrink: 0, marginLeft: 8 }}>
                              {h.pts > 0 ? '+' : ''}{h.pts !== 0 ? h.pts : '↩'}
                            </span>
                          </div>
                        ))}
                      </div>
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
