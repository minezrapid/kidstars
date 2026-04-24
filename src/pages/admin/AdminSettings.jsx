import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getChildConfig, saveChildConfig, getChildren } from '../../lib/firestore'
import { DEMO_DATA } from '../../lib/demoData'
import { AdminLayout } from './AdminLayout'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'

const TABS = [
  { key: 'tasks1',    label: '🌅 Rutină zilnică' },
  { key: 'tasks2',    label: '✨ Comportament' },
  { key: 'penalties', label: '⚠️ Penalizări' },
  { key: 'rewards',   label: '🎁 Recompense' },
  { key: 'bonus',     label: '⚡ Bonusuri & Valori' },
]

function getDefaultConfig(ageGroup) {
  const demo = DEMO_DATA[ageGroup || '7-10']
  return JSON.parse(JSON.stringify(demo))
}

export function AdminSettings() {
  const { user } = useAuth()
  const toast = useToast()
  const [children, setChildren] = useState([])
  const [selectedChildId, setSelectedChildId] = useState(null)
  const [configs, setConfigs] = useState({}) // {childId: config}
  const [activeTab, setActiveTab] = useState('tasks1')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const kids = await getChildren(user.uid)
        setChildren(kids)
        if (kids.length === 0) { setLoading(false); return }

        // Load config for ALL children at once
        const allConfigs = {}
        await Promise.all(kids.map(async kid => {
          let cfg = await getChildConfig(user.uid, kid.id)
          if (!cfg) cfg = getDefaultConfig(kid.ageGroup) // fallback to demo
          allConfigs[kid.id] = cfg
        }))
        setConfigs(allConfigs)
        setSelectedChildId(kids[0].id)
      } catch (err) {
        toast('Eroare la încărcare: ' + err.message, 'error')
      }
      setLoading(false)
    }
    load()
  }, [user.uid])

  const config = selectedChildId ? configs[selectedChildId] : null

  function updateConfig(updater) {
    if (!selectedChildId) return
    setConfigs(prev => ({ ...prev, [selectedChildId]: updater(prev[selectedChildId]) }))
  }

  function updateTask(listKey, i, field, value) {
    updateConfig(cfg => {
      const list = [...(cfg[listKey] || [])]
      list[i] = { ...list[i], [field]: field === 'pts' ? Math.max(1, parseInt(value) || 1) : value }
      return { ...cfg, [listKey]: list }
    })
  }
  function removeTask(listKey, i) {
    updateConfig(cfg => ({ ...cfg, [listKey]: (cfg[listKey] || []).filter((_, idx) => idx !== i) }))
  }
  function addTask(listKey) {
    updateConfig(cfg => ({ ...cfg, [listKey]: [...(cfg[listKey] || []), { id: `t_${Date.now()}`, name: '', pts: 3 }] }))
  }
  function updateReward(i, field, value) {
    updateConfig(cfg => {
      const list = [...(cfg.rewards || [])]
      list[i] = { ...list[i], [field]: field === 'pts' ? Math.max(1, parseInt(value) || 1) : value }
      return { ...cfg, rewards: list }
    })
  }
  function removeReward(i) {
    updateConfig(cfg => ({ ...cfg, rewards: (cfg.rewards || []).filter((_, idx) => idx !== i) }))
  }
  function addReward() {
    updateConfig(cfg => ({
      ...cfg,
      rewards: [...(cfg.rewards || []), { id: `r_${Date.now()}`, icon: '🎁', name: '', pts: 50, type: 'special', dailyLimit: null, weeklyLimit: null }]
    }))
  }

  async function handleSave() {
    if (!selectedChildId || !config) return
    setSaving(true)
    try {
      await saveChildConfig(user.uid, selectedChildId, config)
      toast('Salvat cu succes! ✅', 'success')
    } catch (err) {
      toast('Eroare la salvare: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  async function handleSaveAll() {
    setSaving(true)
    try {
      await Promise.all(Object.entries(configs).map(([childId, cfg]) => saveChildConfig(user.uid, childId, cfg)))
      toast('Toate configurările au fost salvate! ✅', 'success')
    } catch (err) {
      toast('Eroare: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <Spinner size={36} />
      </div>
    </AdminLayout>
  )

  if (children.length === 0) return (
    <AdminLayout>
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--gray-400)' }}>
        <div style={{ fontSize: 48, marginBottom: '1rem' }}>⚙️</div>
        <p style={{ fontSize: '1rem', marginBottom: 8 }}>Nu există copii configurați.</p>
        <p style={{ fontSize: '0.875rem' }}>Adaugă un copil din pagina Invitații.</p>
      </div>
    </AdminLayout>
  )

  const selectedChild = children.find(k => k.id === selectedChildId)

  return (
    <AdminLayout>
      <div className="fade-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--purple-800)' }}>Setări sarcini</h1>
            <p style={{ marginTop: 4 }}>Configurează sarcinile și recompensele pentru fiecare copil.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {children.length > 1 && (
              <button className="btn btn-ghost btn-sm" onClick={handleSaveAll} disabled={saving}>
                {saving ? <Spinner size={14} /> : '💾 Salvează toți'}
              </button>
            )}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !selectedChildId}>
              {saving ? <Spinner size={16} color="white" /> : '💾 Salvează'}
            </button>
          </div>
        </div>

        {/* Child selector tabs */}
        {children.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {children.map(kid => (
              <button key={kid.id} onClick={() => setSelectedChildId(kid.id)} style={{
                padding: '8px 16px', borderRadius: 'var(--radius-full)', cursor: 'pointer',
                border: `2px solid ${selectedChildId === kid.id ? 'var(--purple-600)' : 'var(--gray-200)'}`,
                background: selectedChildId === kid.id ? 'var(--purple-600)' : 'var(--white)',
                color: selectedChildId === kid.id ? 'white' : 'var(--gray-700)',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
              }}>
                <span>{kid.gender === 'girl' ? '👧' : '👦'}</span>
                {kid.childName}
              </button>
            ))}
          </div>
        )}

        {/* Current child indicator */}
        {selectedChild && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--purple-50)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: 24 }}>{selectedChild.gender === 'girl' ? '👧' : '👦'}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--purple-800)' }}>{selectedChild.childName}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--purple-600)' }}>{selectedChild.ageGroup} ani</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--purple-600)' }}>
              {config ? `${(config.tasks1||[]).length + (config.tasks2||[]).length} sarcini · ${(config.rewards||[]).length} recompense` : ''}
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '7px 14px', borderRadius: 'var(--radius-full)', cursor: 'pointer',
              border: `1.5px solid ${activeTab === t.key ? 'var(--purple-600)' : 'var(--gray-200)'}`,
              background: activeTab === t.key ? 'var(--purple-600)' : 'var(--white)',
              color: activeTab === t.key ? 'white' : 'var(--gray-600)',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem',
            }}>{t.label}</button>
          ))}
        </div>

        {!config && (
          <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner size={28} /></div>
        )}

        {/* Tab content */}
        {config && activeTab === 'tasks1' && (
          <TaskList title="Rutină zilnică" color="var(--green-600)"
            tasks={config.tasks1 || []}
            onUpdate={(i,f,v) => updateTask('tasks1',i,f,v)}
            onRemove={i => removeTask('tasks1',i)}
            onAdd={() => addTask('tasks1')} />
        )}
        {config && activeTab === 'tasks2' && (
          <TaskList title="Comportament" color="var(--purple-600)"
            tasks={config.tasks2 || []}
            onUpdate={(i,f,v) => updateTask('tasks2',i,f,v)}
            onRemove={i => removeTask('tasks2',i)}
            onAdd={() => addTask('tasks2')} />
        )}
        {config && activeTab === 'penalties' && (
          <TaskList title="Penalizări" color="#A32D2D"
            tasks={config.penalties || []}
            onUpdate={(i,f,v) => updateTask('penalties',i,f,v)}
            onRemove={i => removeTask('penalties',i)}
            onAdd={() => addTask('penalties')} />
        )}
        {config && activeTab === 'rewards' && (
          <div className="card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(config.rewards || []).map((r, i) => (
                <div key={r.id || i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 70px 100px 100px auto', gap: 8, alignItems: 'center' }}>
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
              <button className="btn btn-ghost btn-sm" onClick={addReward} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                + Adaugă recompensă
              </button>
            </div>
          </div>
        )}
        {config && activeTab === 'bonus' && (
          <div className="card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ marginBottom: '1rem', color: 'var(--gray-700)' }}>Bonusuri pentru completare totală</h3>
                {[
                  { key: 'bonus1', label: 'Bonus Rutină completă', color: 'var(--green-600)', desc: 'Acordat când toate sarcinile din Rutină sunt bifate' },
                  { key: 'bonus2', label: 'Bonus Comportament complet', color: 'var(--purple-600)', desc: 'Acordat când toate sarcinile de Comportament sunt bifate' },
                ].map(b => (
                  <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: b.color }}>{b.label}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 2 }}>{b.desc}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="number" value={config[b.key] || 0}
                        onChange={e => updateConfig(cfg => ({ ...cfg, [b.key]: parseInt(e.target.value) || 0 }))}
                        style={{ width: 70, padding: '8px 10px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '1rem', textAlign: 'center', fontWeight: 700 }} />
                      <span style={{ fontWeight: 700, color: 'var(--amber-400)', fontSize: '1.25rem' }}>⭐</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1.25rem' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--gray-700)' }}>Valoare monetară</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Valoare 1 stea în RON</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 2 }}>Folosit pentru afișarea echivalentului în bani</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="number" step="0.01" value={config.starValue || 0.10}
                      onChange={e => updateConfig(cfg => ({ ...cfg, starValue: parseFloat(e.target.value) || 0.10 }))}
                      style={{ width: 80, padding: '8px 10px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '1rem', textAlign: 'center' }} />
                    <span style={{ fontWeight: 700, color: 'var(--green-600)' }}>RON</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {children.length > 1 && (
            <button className="btn btn-ghost" onClick={handleSaveAll} disabled={saving}>
              {saving ? <Spinner size={16} /> : '💾 Salvează toți copiii'}
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !selectedChildId}>
            {saving ? <Spinner size={16} color="white" /> : `💾 Salvează pentru ${selectedChild?.childName || ''}`}
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
          <div key={t.id || i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="input" style={{ flex: 1, fontSize: '0.875rem', padding: '8px 12px' }}
              value={t.name} onChange={e => onUpdate(i, 'name', e.target.value)} placeholder="Descriere sarcină..." />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <input type="number" value={t.pts} min={1} onChange={e => onUpdate(i, 'pts', e.target.value)}
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
