import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { saveAdminData, updateUserDoc } from '../../lib/firestore'
import { DEMO_DATA } from '../../lib/demoData'
import { StarLogo } from '../../components/StarLogo'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'

const STEPS = ['Bun venit', 'Grupă de vârstă', 'Sarcini', 'Recompense', 'Finalizare']

export function AdminSetupPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [ageGroup, setAgeGroup] = useState('')
  const [useDemo, setUseDemo] = useState(null) // true = demo, false = custom
  const [config, setConfig] = useState(null)
  const [saving, setSaving] = useState(false)

  function selectDemo(group) {
    setAgeGroup(group)
    setConfig(JSON.parse(JSON.stringify(DEMO_DATA[group])))
  }

  function nextStep() { setStep(s => Math.min(s + 1, STEPS.length - 1)) }
  function prevStep() { setStep(s => Math.max(s - 1, 0)) }

  async function finish() {
    setSaving(true)
    try {
      await saveAdminData(user.uid, config)
      await updateUserDoc(user.uid, { setupComplete: true, ageGroup })
      await refreshProfile()
      toast('Configurare completă! Bun venit în KidStars! 🎉', 'success')
      navigate('/admin')
    } catch {
      toast('Eroare la salvare. Încearcă din nou.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Step 0: Welcome ───────────────────────────────────────
  if (step === 0) return (
    <SetupShell step={step} total={STEPS.length}>
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ fontSize: 64, marginBottom: '1rem' }}>🌟</div>
        <h2 style={{ marginBottom: '0.75rem' }}>Bun venit în KidStars, {profile?.displayName}!</h2>
        <p style={{ marginBottom: '2rem', maxWidth: 380, margin: '0 auto 2rem' }}>
          Hai să configurăm aplicația în câteva minute.
          Poți folosi un template gata făcut sau să pornești de la zero.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 320, margin: '0 auto' }}>
          <button className="btn btn-primary btn-lg" onClick={() => { setUseDemo(true); nextStep() }}>
            ⚡ Folosește un template demo
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => { setUseDemo(false); nextStep() }}>
            ✏️ Configurez de la zero
          </button>
        </div>
      </div>
    </SetupShell>
  )

  // ── Step 1: Age group ─────────────────────────────────────
  if (step === 1) return (
    <SetupShell step={step} total={STEPS.length} onBack={prevStep}>
      <h2 style={{ marginBottom: '0.5rem' }}>Câți ani are copilul?</h2>
      <p style={{ marginBottom: '1.5rem' }}>Selectează grupa de vârstă pentru a primi sarcini și recompense potrivite.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.5rem' }}>
        {Object.entries(DEMO_DATA).map(([key, d]) => (
          <button key={key} onClick={() => selectDemo(key)} style={{
            padding: '1.25rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            border: `2px solid ${ageGroup === key ? 'var(--purple-600)' : 'var(--gray-200)'}`,
            background: ageGroup === key ? 'var(--purple-50)' : 'var(--white)',
            textAlign: 'center', transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>{d.emoji}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-900)' }}>
              {key} ani
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: 2 }}>{d.label.split('(')[0].trim()}</div>
          </button>
        ))}
      </div>
      <button className="btn btn-primary btn-full btn-lg" onClick={nextStep} disabled={!ageGroup}>
        Continuă →
      </button>
    </SetupShell>
  )

  // ── Step 2: Tasks preview + edit ─────────────────────────
  if (step === 2 && config) return (
    <SetupShell step={step} total={STEPS.length} onBack={prevStep}>
      <h2 style={{ marginBottom: '0.5rem' }}>Sarcini zilnice</h2>
      <p style={{ marginBottom: '1.25rem' }}>Editează sau adaugă sarcini pentru copilul tău.</p>

      <TaskEditor
        label="Rutină zilnică" color="var(--green-600)"
        tasks={config.tasks1} bonus={config.bonus1}
        onTasksChange={t => setConfig(c => ({ ...c, tasks1: t }))}
        onBonusChange={v => setConfig(c => ({ ...c, bonus1: v }))}
      />
      <div style={{ marginTop: 16 }}>
        <TaskEditor
          label="Comportament" color="var(--purple-600)"
          tasks={config.tasks2} bonus={config.bonus2}
          onTasksChange={t => setConfig(c => ({ ...c, tasks2: t }))}
          onBonusChange={v => setConfig(c => ({ ...c, bonus2: v }))}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <TaskEditor
          label="Comportament greșit (penalizări)" color="#A32D2D"
          tasks={config.penalties} isPenalty
          onTasksChange={t => setConfig(c => ({ ...c, penalties: t }))}
        />
      </div>

      <button className="btn btn-primary btn-full btn-lg" onClick={nextStep} style={{ marginTop: '1.5rem' }}>
        Continuă →
      </button>
    </SetupShell>
  )

  // ── Step 3: Rewards ───────────────────────────────────────
  if (step === 3 && config) return (
    <SetupShell step={step} total={STEPS.length} onBack={prevStep}>
      <h2 style={{ marginBottom: '0.5rem' }}>Recompense</h2>
      <p style={{ marginBottom: '1.25rem' }}>Editează recompensele pe care copilul le poate obține.</p>
      <RewardEditor
        rewards={config.rewards}
        onRewardsChange={r => setConfig(c => ({ ...c, rewards: r }))}
      />
      <button className="btn btn-primary btn-full btn-lg" onClick={nextStep} style={{ marginTop: '1.5rem' }}>
        Continuă →
      </button>
    </SetupShell>
  )

  // ── Step 4: Finish ────────────────────────────────────────
  if (step === 4) return (
    <SetupShell step={step} total={STEPS.length} onBack={prevStep}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ marginBottom: '0.75rem' }}>Totul e pregătit!</h2>
        <p style={{ marginBottom: '2rem', maxWidth: 380, margin: '0 auto 2rem' }}>
          Configurarea este completă. Acum poți invita copilul să se alăture
          și să înceapă să câștige stele.
        </p>
        <div style={{
          background: 'var(--purple-50)', borderRadius: 'var(--radius-md)',
          padding: '1rem', marginBottom: '1.5rem', textAlign: 'left', fontSize: '0.875rem',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--purple-800)', marginBottom: 8 }}>
            Rezumat configurare:
          </div>
          {config && <>
            <div>✅ {config.tasks1.length} sarcini de rutină zilnică (bonus: +{config.bonus1} ⭐)</div>
            <div>✅ {config.tasks2.length} sarcini de comportament (bonus: +{config.bonus2} ⭐)</div>
            <div>✅ {config.penalties.length} penalizări configurate</div>
            <div>✅ {config.rewards.length} recompense disponibile</div>
          </>}
        </div>
        <button className="btn btn-primary btn-full btn-lg" onClick={finish} disabled={saving}>
          {saving ? <Spinner size={20} color="white" /> : 'Intră în aplicație 🚀'}
        </button>
      </div>
    </SetupShell>
  )

  return <div className="page-center"><Spinner size={36} /></div>
}

// ── SUB-COMPONENTS ────────────────────────────────────────────

function SetupShell({ step, total, onBack, children }) {
  return (
    <div className="page-center" style={{ background: 'linear-gradient(135deg, var(--purple-50) 0%, var(--gray-50) 60%)', padding: '2rem 1.5rem', alignItems: 'flex-start' }}>
      <div className="max-w-md fade-in" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StarLogo size={36} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem', color: 'var(--purple-800)' }}>KidStars</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{
                width: i === step ? 24 : 8, height: 8, borderRadius: 4,
                background: i <= step ? 'var(--purple-600)' : 'var(--gray-200)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>
        <div className="card card-lg">
          {children}
          {onBack && (
            <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginTop: '0.75rem' }}>
              ← Înapoi
            </button>
          )}
        </div>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--gray-400)' }}>
          Pasul {step + 1} din {total}
        </p>
      </div>
    </div>
  )
}

function TaskEditor({ label, color, tasks, bonus, isPenalty, onTasksChange, onBonusChange }) {
  function updateTask(i, field, value) {
    const t = [...tasks]
    t[i] = { ...t[i], [field]: field === 'pts' ? Math.max(1, parseInt(value) || 1) : value }
    onTasksChange(t)
  }
  function removeTask(i) { onTasksChange(tasks.filter((_, idx) => idx !== i)) }
  function addTask() {
    onTasksChange([...tasks, { id: `t_${Date.now()}`, name: '', pts: 3 }])
  }

  return (
    <div style={{ border: `1.5px solid ${color}22`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div style={{ background: `${color}12`, padding: '8px 14px', borderBottom: `1px solid ${color}22` }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color }}>{label}</span>
        {!isPenalty && onBonusChange && (
          <span style={{ float: 'right', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
            Bonus complet:{' '}
            <input type="number" value={bonus} onChange={e => onBonusChange(parseInt(e.target.value) || 0)}
              style={{ width: 50, padding: '2px 6px', border: '1px solid var(--gray-200)', borderRadius: 6, fontSize: '0.8125rem', textAlign: 'center' }}
            /> ⭐
          </span>
        )}
      </div>
      <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="input" style={{ flex: 1, padding: '7px 10px', fontSize: '0.875rem' }}
              value={t.name} onChange={e => updateTask(i, 'name', e.target.value)}
              placeholder="Descriere sarcină..." />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <input type="number" value={t.pts} onChange={e => updateTask(i, 'pts', e.target.value)}
                style={{ width: 52, padding: '7px 8px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '0.875rem', textAlign: 'center' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>⭐</span>
              <button onClick={() => removeTask(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E24B4A', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
            </div>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addTask} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
          + Adaugă
        </button>
      </div>
    </div>
  )
}

function RewardEditor({ rewards, onRewardsChange }) {
  function updateReward(i, field, value) {
    const r = [...rewards]
    r[i] = { ...r[i], [field]: field === 'pts' ? Math.max(1, parseInt(value) || 1) : value }
    onRewardsChange(r)
  }
  function removeReward(i) { onRewardsChange(rewards.filter((_, idx) => idx !== i)) }
  function addReward() {
    onRewardsChange([...rewards, { id: `r_${Date.now()}`, icon: '🎁', name: '', pts: 50, type: 'special', dailyLimit: null, weeklyLimit: null }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rewards.map((r, i) => (
        <div key={r.id} style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '10px 12px', background: 'var(--white)',
          border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
        }}>
          <input style={{ width: 38, padding: '4px', border: '1px solid var(--gray-200)', borderRadius: 8, fontSize: '1.25rem', textAlign: 'center' }}
            value={r.icon} onChange={e => updateReward(i, 'icon', e.target.value)} />
          <input className="input" style={{ flex: 1, padding: '7px 10px', fontSize: '0.875rem' }}
            value={r.name} onChange={e => updateReward(i, 'name', e.target.value)} placeholder="Nume recompensă" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <input type="number" value={r.pts} onChange={e => updateReward(i, 'pts', e.target.value)}
              style={{ width: 62, padding: '7px 8px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '0.875rem', textAlign: 'center' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>⭐</span>
            <button onClick={() => removeReward(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E24B4A', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={addReward} style={{ alignSelf: 'flex-start' }}>
        + Adaugă recompensă
      </button>
    </div>
  )
}
