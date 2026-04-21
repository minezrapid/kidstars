import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getAdminData, getChildState, saveChildState } from '../../lib/firestore'
import { StarLogo } from '../../components/StarLogo'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'

function getTodayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }
function getMonthKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}` }
function getWeekKey() { const d = new Date(); const jan = new Date(d.getFullYear(),0,1); const w = Math.ceil(((d-jan)/86400000+jan.getDay()+1)/7); return `${d.getFullYear()}-W${w}` }

const TABS = ['📋 Sarcini', '🎁 Recompense', '📈 Istoric']

export function ChildDashboard() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [adminData, setAdminData] = useState(null)
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)

  const adminId = profile?.adminId

  const load = useCallback(async () => {
    const [data, st] = await Promise.all([
      getAdminData(adminId),
      getChildState(adminId, user.uid),
    ])
    setAdminData(data)

    // Init or day-reset state
    let s = st || initState()
    s = resetIfNeeded(s)
    setState(s)
    setLoading(false)
  }, [adminId, user.uid])

  useEffect(() => { if (adminId) load() }, [load, adminId])

  function initState() {
    return {
      stars: 0, done: {}, history: [],
      bonus1Given: false, bonus2Given: false,
      penaltiesApplied: [], extraPoints: [],
      earnedMonth: 0, spentMonth: 0, spentToday: 0, spentTotal: 0, spentLv1: 0,
      todayKey: getTodayKey(), monthKey: getMonthKey(), weekKey: getWeekKey(),
      dailyCounts: {}, weeklyCounts: {},
    }
  }

  function resetIfNeeded(s) {
    let changed = false
    if (s.todayKey !== getTodayKey()) {
      s = { ...s, done: {}, bonus1Given: false, bonus2Given: false, penaltiesApplied: [], spentToday: 0, dailyCounts: {}, todayKey: getTodayKey() }
      changed = true
    }
    if (s.weekKey !== getWeekKey()) { s = { ...s, weeklyCounts: {}, weekKey: getWeekKey() }; changed = true }
    if (s.monthKey !== getMonthKey()) { s = { ...s, earnedMonth: 0, spentMonth: 0, spentLv1: 0, spentTotal: 0, monthKey: getMonthKey() }; changed = true }
    return s
  }

  function addHist(s, desc, pts) {
    const now = new Date()
    const time = now.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) + ', ' + now.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
    const h = [...(s.history || []), { desc, pts, time }]
    return { ...s, history: h.slice(-150) }
  }

  async function persist(newState) {
    setState(newState)
    setSaving(true)
    try { await saveChildState(adminId, user.uid, newState) }
    catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  function toggleTask(taskId) {
    const allTasks = [...(adminData.tasks1 || []), ...(adminData.tasks2 || [])]
    const task = allTasks.find(t => t.id === taskId)
    if (!task) return
    let s = { ...state, done: { ...state.done } }

    if (s.done[taskId]) {
      s.done[taskId] = false
      s.stars = Math.max(0, s.stars - task.pts)
      s.earnedMonth = Math.max(0, s.earnedMonth - task.pts)
      s = addHist(s, 'Anulat: ' + task.name, -task.pts)
      s = checkBonus(s, adminData)
    } else {
      s.done[taskId] = true
      s.stars += task.pts
      s.earnedMonth += task.pts
      s = addHist(s, task.name, task.pts)
      s = checkBonus(s, adminData)
    }
    persist(s)
  }

  function checkBonus(s, data) {
    const tasks1Done = (data.tasks1 || []).every(t => s.done[t.id])
    const tasks2Done = (data.tasks2 || []).every(t => s.done[t.id])
    const b1 = data.bonus1 || 0
    const b2 = data.bonus2 || 0

    if (tasks1Done && !s.bonus1Given) {
      s = { ...s, bonus1Given: true, stars: s.stars + b1, earnedMonth: s.earnedMonth + b1 }
      s = addHist(s, 'Bonus Rutină completă!', b1)
    } else if (!tasks1Done && s.bonus1Given) {
      s = { ...s, bonus1Given: false, stars: Math.max(0, s.stars - b1), earnedMonth: Math.max(0, s.earnedMonth - b1) }
      s = addHist(s, 'Bonus Rutină anulat', -b1)
    }
    if (tasks2Done && !s.bonus2Given) {
      s = { ...s, bonus2Given: true, stars: s.stars + b2, earnedMonth: s.earnedMonth + b2 }
      s = addHist(s, 'Bonus Comportament!', b2)
    } else if (!tasks2Done && s.bonus2Given) {
      s = { ...s, bonus2Given: false, stars: Math.max(0, s.stars - b2), earnedMonth: Math.max(0, s.earnedMonth - b2) }
      s = addHist(s, 'Bonus Comportament anulat', -b2)
    }
    return s
  }

  function redeemReward(reward) {
    if (state.stars < reward.pts) { toast('Nu ai destule stele! ⭐', 'error'); return }
    const dailyUsed = state.dailyCounts?.[reward.id] || 0
    if (reward.dailyLimit && dailyUsed >= reward.dailyLimit) { toast('Limita zilnică atinsă!', 'error'); return }
    const weeklyUsed = state.weeklyCounts?.[reward.id] || 0
    if (reward.weeklyLimit && weeklyUsed >= reward.weeklyLimit) { toast('Limita săptămânală atinsă!', 'error'); return }

    let s = {
      ...state,
      stars: state.stars - reward.pts,
      spentMonth: state.spentMonth + reward.pts,
      spentTotal: state.spentTotal + reward.pts,
      spentToday: state.spentToday + reward.pts,
      dailyCounts: { ...state.dailyCounts, [reward.id]: dailyUsed + 1 },
      weeklyCounts: { ...state.weeklyCounts, [reward.id]: weeklyUsed + 1 },
    }
    s = addHist(s, 'Răscumpărat: ' + reward.name, -reward.pts)
    persist(s)
    toast(`Felicitări! Ai obținut: ${reward.name} 🎉`, 'success')
  }

  async function handleLogout() { await logout(); navigate('/login') }

  if (loading || !adminData || !state) return (
    <div className="page-center"><Spinner size={36} /></div>
  )

  const tasks1 = adminData.tasks1 || []
  const tasks2 = adminData.tasks2 || []
  const rewards = adminData.rewards || []
  const starValue = adminData.starValue || 0.10
  const done1 = tasks1.filter(t => state.done[t.id]).length
  const done2 = tasks2.filter(t => state.done[t.id]).length

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: 'var(--gray-50)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        background: 'var(--white)', borderBottom: '1px solid var(--gray-200)',
        padding: '16px 16px 12px', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StarLogo size={36} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--purple-800)' }}>
                {profile?.childName || 'KidStars'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Contul meu</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.75rem', color: 'var(--purple-600)', lineHeight: 1 }}>
              {state.stars} ⭐
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>
              = {(state.stars * starValue).toFixed(2)} RON
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6 }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{
              flex: 1, padding: '7px 4px', borderRadius: 'var(--radius-full)',
              border: `1.5px solid ${tab === i ? 'var(--purple-600)' : 'var(--gray-200)'}`,
              background: tab === i ? 'var(--purple-600)' : 'transparent',
              color: tab === i ? 'white' : 'var(--gray-600)',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* ── TAB: SARCINI ── */}
        {tab === 0 && (
          <div className="fade-in">
            <TaskGroup label="Rutină zilnică" color="var(--green-600)" emoji="🌅"
              tasks={tasks1} done={state.done} onToggle={toggleTask}
              count={done1} total={tasks1.length}
              bonus={adminData.bonus1} bonusGiven={state.bonus1Given} />
            <div style={{ marginTop: 16 }}>
              <TaskGroup label="Comportament" color="var(--purple-600)" emoji="✨"
                tasks={tasks2} done={state.done} onToggle={toggleTask}
                count={done2} total={tasks2.length}
                bonus={adminData.bonus2} bonusGiven={state.bonus2Given} />
            </div>
            {saving && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Spinner size={18} />
              </div>
            )}
          </div>
        )}

        {/* ── TAB: RECOMPENSE ── */}
        {tab === 1 && (
          <div className="fade-in">
            <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
              Ai <strong style={{ color: 'var(--purple-600)', fontFamily: 'var(--font-display)' }}>{state.stars} ⭐</strong> disponibile.
              Alege o recompensă!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rewards.map(r => {
                const canAfford = state.stars >= r.pts
                const dailyUsed = state.dailyCounts?.[r.id] || 0
                const weeklyUsed = state.weeklyCounts?.[r.id] || 0
                const dailyBlocked = r.dailyLimit && dailyUsed >= r.dailyLimit
                const weeklyBlocked = r.weeklyLimit && weeklyUsed >= r.weeklyLimit
                const blocked = dailyBlocked || weeklyBlocked
                return (
                  <div key={r.id} style={{
                    background: 'var(--white)', border: `1px solid ${!canAfford || blocked ? 'var(--gray-200)' : 'var(--purple-100)'}`,
                    borderRadius: 'var(--radius-lg)', padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    opacity: blocked ? 0.55 : 1,
                  }}>
                    <span style={{ fontSize: 26, flexShrink: 0 }}>{r.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9375rem' }}>{r.name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginTop: 2 }}>
                        {r.pts} ⭐
                        {r.dailyLimit && ` · ${dailyUsed}/${r.dailyLimit} azi`}
                        {r.weeklyLimit && ` · ${weeklyUsed}/${r.weeklyLimit} săpt`}
                      </div>
                    </div>
                    <button
                      onClick={() => redeemReward(r)}
                      disabled={!canAfford || blocked}
                      className="btn btn-primary btn-sm"
                      style={{ flexShrink: 0, opacity: !canAfford || blocked ? 0.4 : 1 }}>
                      {blocked ? 'Limitat' : 'Obține'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── TAB: ISTORIC ── */}
        {tab === 2 && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.25rem' }}>
              {[
                { label: 'Câștigate luna aceasta', value: state.earnedMonth + ' ⭐', color: 'var(--green-600)' },
                { label: 'Folosite luna aceasta', value: state.spentMonth + ' ⭐', color: '#A32D2D' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: '0.875rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[...state.history].reverse().slice(0, 50).map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-900)' }}>{h.desc}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>{h.time}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9375rem', flexShrink: 0, marginLeft: 12, color: h.pts > 0 ? 'var(--green-600)' : h.pts < 0 ? '#A32D2D' : 'var(--gray-400)' }}>
                    {h.pts > 0 ? '+' : ''}{h.pts !== 0 ? h.pts : '↩'}
                  </span>
                </div>
              ))}
              {state.history.length === 0 && <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--gray-400)' }}>Nicio activitate încă.</p>}
            </div>
          </div>
        )}
      </div>

      {/* Bottom logout */}
      <div style={{ position: 'fixed', bottom: 16, right: 16 }}>
        <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ background: 'var(--white)', boxShadow: 'var(--shadow-sm)' }}>
          🚪 Ieși
        </button>
      </div>
    </div>
  )
}

function TaskGroup({ label, color, emoji, tasks, done, onToggle, count, total, bonus, bonusGiven }) {
  const pct = total > 0 ? Math.round(count / total * 100) : 0
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color, fontSize: '0.9375rem' }}>{emoji} {label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>{count}/{total}</span>
          <div style={{ width: 48, height: 6, background: 'var(--gray-100)', borderRadius: 3 }}>
            <div style={{ height: '100%', borderRadius: 3, background: pct === 100 ? 'var(--green-600)' : color, width: pct + '%', transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {tasks.map((t, i) => {
          const isDone = !!done[t.id]
          return (
            <button key={t.id} onClick={() => onToggle(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', textAlign: 'left',
              background: isDone ? (color === 'var(--green-600)' ? 'var(--green-50)' : 'var(--purple-50)') : 'transparent',
              border: 'none', borderBottom: i < tasks.length - 1 ? '1px solid var(--gray-100)' : 'none',
              cursor: 'pointer', transition: 'background 0.15s', width: '100%',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${isDone ? color : 'var(--gray-200)'}`,
                background: isDone ? color : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 12, transition: 'all 0.15s',
              }}>
                {isDone && '✓'}
              </div>
              <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: isDone ? 600 : 400, color: isDone ? color : 'var(--gray-900)' }}>{t.name}</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: isDone ? color : 'var(--gray-400)', flexShrink: 0 }}>+{t.pts}⭐</span>
            </button>
          )
        })}
      </div>
      {bonus > 0 && (
        <div style={{
          padding: '9px 14px', background: bonusGiven ? (color === 'var(--green-600)' ? 'var(--green-50)' : 'var(--purple-50)') : 'var(--gray-50)',
          borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: bonusGiven ? color : 'var(--gray-400)', fontFamily: 'var(--font-display)' }}>
            🏆 Bonus complet {bonusGiven ? '— obținut!' : `(${count}/${total})`}
          </span>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: bonusGiven ? color : 'var(--gray-400)' }}>+{bonus}⭐</span>
        </div>
      )}
    </div>
  )
}
