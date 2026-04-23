import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getInvite, getChildren, getChildState, getChildConfig } from '../../lib/firestore'
import { StarLogo } from '../../components/StarLogo'
import { Spinner } from '../../components/Spinner'

export function GuestView() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adminData, setAdminData] = useState(null)
  const [children, setChildren] = useState([])
  const [childStates, setChildStates] = useState({})
  const [selectedChild, setSelectedChild] = useState(null)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    async function load() {
      const invite = await getInvite(token)
      if (!invite || (!invite.permanent && invite.role !== 'guest')) {
        setError('Link invalid sau expirat.')
        setLoading(false)
        return
      }
      const adminId = invite.adminId
      const kids = await getChildren(adminId)
      setChildren(kids)
      // Load config from first child (guest view shows all children under same config)
      const data = kids.length > 0 ? await getChildConfig(adminId, kids[0].id) : null
      setAdminData(data)
      const states = {}
      await Promise.all(kids.map(async kid => {
        const s = await getChildState(adminId, kid.id)
        if (s) states[kid.id] = s
      }))
      setChildStates(states)
      if (kids.length > 0) setSelectedChild(kids[0].id)
      setLoading(false)
    }
    load()
  }, [token])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size={36} /></div>

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <StarLogo size={56} />
      <p style={{ color: '#E24B4A', fontWeight: 600 }}>{error}</p>
    </div>
  )

  const kid = children.find(k => k.id === selectedChild)
  const state = selectedChild ? childStates[selectedChild] : null
  const starValue = adminData?.starValue || 0.10
  const tasks1 = adminData?.tasks1 || []
  const tasks2 = adminData?.tasks2 || []

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: 'var(--gray-50)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--gray-200)', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StarLogo size={32} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--purple-800)' }}>KidStars</span>
          </div>
          <span style={{ fontSize: '0.75rem', background: 'var(--amber-50)', color: 'var(--amber-600)', padding: '3px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            👁️ Vizualizare
          </span>
        </div>

        {/* Child selector */}
        {children.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {children.map(k => (
              <button key={k.id} onClick={() => setSelectedChild(k.id)} style={{
                padding: '5px 12px', borderRadius: 'var(--radius-full)',
                border: `1.5px solid ${selectedChild === k.id ? 'var(--purple-600)' : 'var(--gray-200)'}`,
                background: selectedChild === k.id ? 'var(--purple-50)' : 'transparent',
                color: selectedChild === k.id ? 'var(--purple-800)' : 'var(--gray-600)',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
              }}>{k.childName}</button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['📋 Sarcini', '🎁 Recompense', '📈 Istoric'].map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{
              flex: 1, padding: '6px 4px', borderRadius: 'var(--radius-full)',
              border: `1.5px solid ${tab === i ? 'var(--purple-600)' : 'var(--gray-200)'}`,
              background: tab === i ? 'var(--purple-600)' : 'transparent',
              color: tab === i ? 'white' : 'var(--gray-600)',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Stars display */}
        {kid && state && (
          <div style={{
            background: 'var(--white)', border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem' }}>{kid.childName}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>{kid.ageGroup} ani</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2rem', color: 'var(--purple-600)', lineHeight: 1 }}>
                {state.stars} ⭐
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>= {(state.stars * starValue).toFixed(2)} RON</div>
            </div>
          </div>
        )}

        {/* Sarcini tab - view only */}
        {tab === 0 && state && (
          <div className="fade-in">
            {[
              { label: 'Rutină zilnică', tasks: tasks1, color: 'var(--green-600)', emoji: '🌅', bonus: adminData?.bonus1, bonusGiven: state.bonus1Given },
              { label: 'Comportament', tasks: tasks2, color: 'var(--purple-600)', emoji: '✨', bonus: adminData?.bonus2, bonusGiven: state.bonus2Given },
            ].map((g, gi) => (
              <div key={gi} style={{ marginBottom: 12, background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--gray-100)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: g.color, fontSize: '0.9375rem' }}>{g.emoji} {g.label}</span>
                </div>
                {g.tasks.map((t, i) => {
                  const isDone = !!state.done[t.id]
                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      background: isDone ? (gi === 0 ? 'var(--green-50)' : 'var(--purple-50)') : 'transparent',
                      borderBottom: i < g.tasks.length - 1 ? '1px solid var(--gray-100)' : 'none',
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${isDone ? g.color : 'var(--gray-200)'}`,
                        background: isDone ? g.color : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: 11,
                      }}>
                        {isDone && '✓'}
                      </div>
                      <span style={{ flex: 1, fontSize: '0.875rem', color: isDone ? g.color : 'var(--gray-600)', fontWeight: isDone ? 600 : 400 }}>{t.name}</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: isDone ? g.color : 'var(--gray-300)' }}>+{t.pts}⭐</span>
                    </div>
                  )
                })}
                {g.bonus > 0 && (
                  <div style={{ padding: '8px 14px', background: g.bonusGiven ? (gi === 0 ? 'var(--green-50)' : 'var(--purple-50)') : 'var(--gray-50)', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: g.bonusGiven ? g.color : 'var(--gray-400)', fontFamily: 'var(--font-display)' }}>
                      🏆 Bonus {g.bonusGiven ? '— obținut!' : 'complet'}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: g.bonusGiven ? g.color : 'var(--gray-300)' }}>+{g.bonus}⭐</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Recompense tab - view only, no button */}
        {tab === 1 && (
          <div className="fade-in">
            {(adminData?.rewards || []).map(r => (
              <div key={r.id} style={{
                background: 'var(--white)', border: '1px solid var(--gray-200)',
                borderRadius: 'var(--radius-md)', padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
              }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem' }}>{r.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginTop: 2 }}>{r.pts} ⭐</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
                  {state && state.stars >= r.pts ? '✅ Accesibil' : '⭐ Insuficient'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Istoric tab */}
        {tab === 2 && state && (
          <div className="fade-in">
            {[...state.history].reverse().slice(0, 40).map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                <div>
                  <div style={{ color: 'var(--gray-900)' }}>{h.desc}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 1 }}>{h.time}</div>
                </div>
                <span style={{ fontWeight: 700, color: h.pts > 0 ? 'var(--green-600)' : h.pts < 0 ? '#A32D2D' : 'var(--gray-400)', flexShrink: 0, marginLeft: 12 }}>
                  {h.pts > 0 ? '+' : ''}{h.pts !== 0 ? h.pts : '↩'}
                </span>
              </div>
            ))}
            {(!state.history || state.history.length === 0) && (
              <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '2rem 0' }}>Nicio activitate.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
