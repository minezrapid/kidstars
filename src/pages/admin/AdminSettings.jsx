import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getAdminData, saveAdminData } from '../../lib/firestore'
import { AdminLayout } from './AdminLayout'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'

export function AdminSettings() {
  const { user } = useAuth()
  const toast = useToast()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('tasks1')

  useEffect(() => {
    getAdminData(user.uid).then(d => { setConfig(d); setLoading(false) })
  }, [user.uid])

  async function handleSave() {
    setSaving(true)
    try {
      await saveAdminData(user.uid, config)
      toast('Salvat cu succes! ✅', 'success')
    } catch {
      toast('Eroare la salvare.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function updateTask(listKey, i, field, value) {
    setConfig(c => {
      const list = [...c[listKey]]
      list[i] = { ...list[i], [field]: field === 'pts' ? Math.max(1, parseInt(value) || 1) : value }
      return { ...c, [listKey]: list }
    })
  }
  function removeTask(listKey, i) {
    setConfig(c => ({ ...c, [listKey]: c[listKey].filter((_, idx) => idx !== i) }))
  }
  function addTask(listKey) {
    setConfig(c => ({
      ...c,
      [listKey]: [...c[listKey], { id: `t_${Date.now()}`, name: '', pts: 3 }]
    }))
  }
  function updateReward(i, field, value) {
    setConfig(c => {
      const list = [...c.rewards]
      list[i] = { ...list[i], [field]: field === 'pts' ? Math.max(1, parseInt(value) || 1) : value }
      return { ...c, rewards: list }
    })
  }
  function removeReward(i) { setConfig(c => ({ ...c, rewards: c.rewards.filter((_, idx) => idx !== i) })) }
  function addReward() {
    setConfig(c => ({
      ...c,
      rewards: [...c.rewards, { id: `r_${Date.now()}`, icon: '🎁', name: '', pts: 50, type: 'special', dailyLimit: null, weeklyLimit: null }]
    }))
  }

  if (loading) return <AdminLayout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size={36} /></div></AdminLayout>

  const TABS = [
    { key: 'tasks1',    label: '📋 Rutină zilnică' },
    { key: 'tasks2',    label: '✨ Comportament' },
    { key: 'penalties', label: '⚠️ Penalizări' },
    { key: 'rewards',   label: '🎁 Recompense' },
    { key: 'bonus',     label: '⚡ Bonusuri' },
  ]

  return (
    <AdminLayout>
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--purple-800)' }}>Setări</h1>
            <p style={{ marginTop: 4 }}>Editează sarcini, recompense și valori.</p>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size={16} color="white" /> : '💾 Salvează'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '7px 14px', borderRadius: 'var(--radius-full)',
              border: `1.5px solid ${activeTab === t.key ? 'var(--purple-600)' : 'var(--gray-200)'}`,
              background: activeTab === t.key ? 'var(--purple-600)' : 'var(--white)',
              color: activeTab === t.key ? 'white' : 'var(--gray-600)',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tasks1 */}
        {activeTab === 'tasks1' && (
          <TaskList
            title="Rutină zilnică" color="var(--green-600)"
            tasks={config.tasks1}
            onUpdate={(i, f, v) => updateTask('tasks1', i, f, v)}
            onRemove={i => removeTask('tasks1', i)}
            onAdd={() => addTask('tasks1')}
          />
        )}

        {/* Tasks2 */}
        {activeTab === 'tasks2' && (
          <TaskList
            title="Comportament" color="var(--purple-600)"
            tasks={config.tasks2}
            onUpdate={(i, f, v) => updateTask('tasks2', i, f, v)}
            onRemove={i => removeTask('tasks2', i)}
            onAdd={() => addTask('tasks2')}
          />
        )}

        {/* Penalties */}
        {activeTab === 'penalties' && (
          <TaskList
            title="Penalizări" color="#A32D2D"
            tasks={config.penalties}
            onUpdate={(i, f, v) => updateTask('penalties', i, f, v)}
            onRemove={i => removeTask('penalties', i)}
            onAdd={() => addTask('penalties')}
          />
        )}

        {/* Rewards */}
        {activeTab === 'rewards' && (
          <div className="card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {config.rewards.map((r, i) => (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 70px 70px 70px auto', gap: 8, alignItems: 'center' }}>
                  <input style={{ padding: '6px 4px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '1.25rem', textAlign: 'center' }}
                    value={r.icon} onChange={e => updateReward(i, 'icon', e.target.value)} />
                  <input className="input" style={{ fontSize: '0.875rem', padding: '7px 10px' }}
                    value={r.name} onChange={e => updateReward(i, 'name', e.target.value)} placeholder="Nume recompensă" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <input type="number" value={r.pts} onChange={e => updateReward(i, 'pts', e.target.value)}
                      style={{ width: '100%', padding: '7px 6px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '0.875rem', textAlign: 'center' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', flexShrink: 0 }}>⭐</span>
                  </div>
                  <select value={r.dailyLimit || ''} onChange={e => updateReward(i, 'dailyLimit', e.target.value ? parseInt(e.target.value) : null)}
                    style={{ padding: '7px 6px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '0.8125rem' }}>
                    <option value="">Fără limită/zi</option>
                    <option value="1">Max 1/zi</option>
                    <option value="2">Max 2/zi</option>
                    <option value="3">Max 3/zi</option>
                  </select>
                  <select value={r.weeklyLimit || ''} onChange={e => updateReward(i, 'weeklyLimit', e.target.value ? parseInt(e.target.value) : null)}
                    style={{ padding: '7px 6px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '0.8125rem' }}>
                    <option value="">Fără limită/săpt</option>
                    <option value="1">Max 1/săpt</option>
                    <option value="2">Max 2/săpt</option>
                    <option value="3">Max 3/săpt</option>
                  </select>
                  <button onClick={() => removeReward(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E24B4A', fontSize: 20, lineHeight: 1, padding: '0 4px' }}>×</button>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={addReward} style={{ alignSelf: 'flex-start', marginTop: 4 }}>+ Adaugă recompensă</button>
            </div>
          </div>
        )}

        {/* Bonus */}
        {activeTab === 'bonus' && (
          <div className="card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {[
                { key: 'bonus1', label: 'Bonus Rutină completă (toate sarcinile din Rutină)', color: 'var(--green-600)' },
                { key: 'bonus2', label: 'Bonus Comportament complet (toate sarcinile de Comportament)', color: 'var(--purple-600)' },
              ].map(b => (
                <div key={b.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <label style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9375rem', color: b.color, flex: 1 }}>
                    {b.label}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="number" value={config[b.key]} onChange={e => setConfig(c => ({ ...c, [b.key]: parseInt(e.target.value) || 0 }))}
                      style={{ width: 70, padding: '8px 10px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '1rem', textAlign: 'center', fontWeight: 700 }} />
                    <span style={{ fontWeight: 700, color: 'var(--amber-400)' }}>⭐</span>
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Valoare 1 stea (în RON)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="number" step="0.01" value={config.starValue || 0.10}
                      onChange={e => setConfig(c => ({ ...c, starValue: parseFloat(e.target.value) || 0.10 }))}
                      style={{ width: 80, padding: '8px 10px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '1rem', textAlign: 'center' }} />
                    <span style={{ fontWeight: 700, color: 'var(--green-600)' }}>RON</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size={16} color="white" /> : '💾 Salvează modificările'}
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}

function TaskList({ title, color, tasks, onUpdate, onRemove, onAdd }) {
  return (
    <div className="card">
      <h3 style={{ color, marginBottom: '1rem' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="input" style={{ flex: 1, fontSize: '0.875rem', padding: '8px 12px' }}
              value={t.name} onChange={e => onUpdate(i, 'name', e.target.value)} placeholder="Descriere sarcină..." />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <input type="number" value={t.pts} onChange={e => onUpdate(i, 'pts', e.target.value)}
                style={{ width: 58, padding: '8px 6px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '0.875rem', textAlign: 'center', fontWeight: 700 }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--amber-400)', fontWeight: 700 }}>⭐</span>
              <button onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E24B4A', fontSize: 20, lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={onAdd} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
          + Adaugă
        </button>
      </div>
    </div>
  )
}
