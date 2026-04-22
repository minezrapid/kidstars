import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { saveChildConfig, updateUserDoc, addChild } from '../../lib/firestore'
import { DEMO_DATA } from '../../lib/demoData'
import { StarLogo } from '../../components/StarLogo'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'

// Steps per child: name → age+gender → tasks → rewards → done
// After each child: "Add another?" screen

export function AdminSetupPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [step, setStep] = useState(0) // 0=welcome,1=child-name,2=age,3=tasks,4=rewards,5=add-another
  const [children, setChildren] = useState([]) // completed children configs
  const [saving, setSaving] = useState(false)

  // Current child being configured
  const [childName, setChildName] = useState('')
  const [gender, setGender] = useState('girl')
  const [ageGroup, setAgeGroup] = useState('')
  const [config, setConfig] = useState(null)

  function selectAgeGroup(g) {
    setAgeGroup(g)
    setConfig(JSON.parse(JSON.stringify(DEMO_DATA[g])))
  }

  function nextStep() { setStep(s => s + 1) }
  function prevStep() { setStep(s => Math.max(s - 1, 0)) }

  function finishChild() {
    setChildren(prev => [...prev, { childName, gender, ageGroup, config }])
    setStep(5) // "add another?" screen
  }

  function addAnother() {
    setChildName(''); setGender('girl'); setAgeGroup(''); setConfig(null)
    setStep(1)
  }

  async function finishSetup() {
    setSaving(true)
    try {
      for (const child of children) {
        const childId = await addChild(user.uid, { childName: child.childName, ageGroup: child.ageGroup, gender: child.gender })
        await saveChildConfig(user.uid, childId, child.config)
      }
      await updateUserDoc(user.uid, { setupComplete: true })
      await refreshProfile()
      toast('Configurare completă! 🎉', 'success')
      navigate('/admin')
    } catch {
      toast('Eroare la salvare.', 'error')
    } finally { setSaving(false) }
  }

  const totalSteps = 4 // name, age, tasks, rewards
  const currentStepInFlow = Math.max(0, step - 1) // step 1-4 maps to 0-3

  // ── Step 0: Welcome ──────────────────────────────────────
  if (step === 0) return (
    <Shell step={0} total={4} label="">
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ fontSize: 64, marginBottom: '1rem' }}>🌟</div>
        <h2 style={{ marginBottom: '0.75rem' }}>Bun venit în KidStars, {profile?.displayName}!</h2>
        <p style={{ color: 'var(--gray-600)', marginBottom: '2rem', lineHeight: 1.6 }}>
          Hai să configurăm aplicația. Vom adăuga primul copil și poți adăuga mai mulți ulterior.
        </p>
        <button className="btn btn-primary btn-lg" onClick={nextStep} style={{ minWidth: 220 }}>
          Hai să începem →
        </button>
      </div>
    </Shell>
  )

  // ── Step 1: Child name + gender ──────────────────────────
  if (step === 1) return (
    <Shell step={0} total={totalSteps} onBack={children.length === 0 ? prevStep : undefined} label="Copilul tău">
      <h2 style={{ marginBottom: '0.5rem' }}>
        {children.length === 0 ? 'Primul copil' : `Copilul ${children.length + 1}`}
      </h2>
      <p style={{ marginBottom: '1.5rem', color: 'var(--gray-600)' }}>Cum îl cheamă și care este genul?</p>

      <div className="input-group" style={{ marginBottom: '1.25rem' }}>
        <label className="input-label">Numele copilului</label>
        <input className="input" value={childName} onChange={e => setChildName(e.target.value)}
          placeholder="Ex: Maria, Andrei..." autoFocus />
      </div>

      <div className="input-group" style={{ marginBottom: '1.5rem' }}>
        <label className="input-label">Gen</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
          {[['girl','👧','Fetița'],['boy','👦','Băiețelul']].map(([val, emoji, label]) => (
            <button key={val} onClick={() => setGender(val)} style={{
              padding: '1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'center',
              border: `2px solid ${gender === val ? 'var(--purple-600)' : 'var(--gray-200)'}`,
              background: gender === val ? 'var(--purple-50)' : 'var(--white)',
              transition: 'all .15s',
            }}>
              <div style={{ fontSize: 32 }}>{emoji}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', marginTop: 4 }}>{label}</div>
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-primary btn-full btn-lg" onClick={nextStep} disabled={!childName.trim()}>
        Continuă →
      </button>
    </Shell>
  )

  // ── Step 2: Age group ────────────────────────────────────
  if (step === 2) return (
    <Shell step={1} total={totalSteps} onBack={prevStep} label="Vârsta">
      <h2 style={{ marginBottom: '0.5rem' }}>Câți ani are {childName}?</h2>
      <p style={{ marginBottom: '1.5rem', color: 'var(--gray-600)' }}>Selectăm sarcini și recompense potrivite vârstei.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.5rem' }}>
        {Object.entries(DEMO_DATA).map(([key, d]) => (
          <button key={key} onClick={() => selectAgeGroup(key)} style={{
            padding: '1.25rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'center',
            border: `2px solid ${ageGroup === key ? 'var(--purple-600)' : 'var(--gray-200)'}`,
            background: ageGroup === key ? 'var(--purple-50)' : 'var(--white)', transition: 'all .15s',
          }}>
            <div style={{ fontSize: 28, marginBottom: 5 }}>{d.emoji}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem' }}>{key} ani</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>{d.label.split('(')[0].trim()}</div>
          </button>
        ))}
      </div>
      <button className="btn btn-primary btn-full btn-lg" onClick={nextStep} disabled={!ageGroup}>
        Continuă →
      </button>
    </Shell>
  )

  // ── Step 3: Tasks ────────────────────────────────────────
  if (step === 3 && config) return (
    <Shell step={2} total={totalSteps} onBack={prevStep} label="Sarcini">
      <h2 style={{ marginBottom: '0.5rem' }}>Sarcini pentru {childName}</h2>
      <p style={{ marginBottom: '1rem', color: 'var(--gray-600)' }}>Template pre-completat. Editează orice dorești.</p>
      <div style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: 4 }}>
        <TaskEditor label="Rutină zilnică" color="var(--green-600)"
          tasks={config.tasks1} bonus={config.bonus1}
          onTasksChange={t => setConfig(c => ({...c, tasks1: t}))}
          onBonusChange={v => setConfig(c => ({...c, bonus1: v}))} />
        <div style={{ marginTop: 12 }}>
          <TaskEditor label="Comportament" color="var(--purple-600)"
            tasks={config.tasks2} bonus={config.bonus2}
            onTasksChange={t => setConfig(c => ({...c, tasks2: t}))}
            onBonusChange={v => setConfig(c => ({...c, bonus2: v}))} />
        </div>
        <div style={{ marginTop: 12 }}>
          <TaskEditor label="Penalizări" color="#A32D2D" isPenalty
            tasks={config.penalties}
            onTasksChange={t => setConfig(c => ({...c, penalties: t}))} />
        </div>
      </div>
      <button className="btn btn-primary btn-full btn-lg" onClick={nextStep} style={{ marginTop: '1rem' }}>
        Continuă →
      </button>
    </Shell>
  )

  // ── Step 4: Rewards ──────────────────────────────────────
  if (step === 4 && config) return (
    <Shell step={3} total={totalSteps} onBack={prevStep} label="Recompense">
      <h2 style={{ marginBottom: '0.5rem' }}>Recompense pentru {childName}</h2>
      <p style={{ marginBottom: '1rem', color: 'var(--gray-600)' }}>Ce poate obține cu stelele câștigate?</p>
      <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: 4 }}>
        <RewardEditor rewards={config.rewards} onRewardsChange={r => setConfig(c => ({...c, rewards: r}))} />
      </div>
      <button className="btn btn-primary btn-full btn-lg" onClick={finishChild} style={{ marginTop: '1rem' }}>
        Salvează {childName} →
      </button>
    </Shell>
  )

  // ── Step 5: Add another? ─────────────────────────────────
  if (step === 5) return (
    <Shell step={4} total={4} label="Gata!">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: '0.75rem' }}>
          {children[children.length - 1]?.gender === 'girl' ? '👧' : '👦'}
        </div>
        <h2 style={{ marginBottom: '0.5rem' }}>{children[children.length - 1]?.childName} a fost configurat(ă)!</h2>

        {children.length > 0 && (
          <div style={{ background: 'var(--purple-50)', borderRadius: 'var(--radius-md)', padding: '0.875rem', margin: '1rem 0', textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--purple-800)', fontSize: '0.875rem', marginBottom: 6 }}>
              Copii configurați ({children.length}):
            </div>
            {children.map((c, i) => (
              <div key={i} style={{ fontSize: '0.875rem', color: 'var(--purple-700)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span>{c.gender === 'girl' ? '👧' : '👦'}</span>
                <span>{c.childName}</span>
                <span style={{ color: 'var(--gray-400)' }}>· {c.ageGroup} ani</span>
              </div>
            ))}
          </div>
        )}

        <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Poți adăuga mai mulți copii acum sau oricând mai târziu din panoul de administrare.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-lg" onClick={addAnother}>
            + Adaugă alt copil
          </button>
          <button className="btn btn-primary btn-lg" onClick={finishSetup} disabled={saving}>
            {saving ? <Spinner size={18} color="white" /> : 'Intră în aplicație 🚀'}
          </button>
        </div>
      </div>
    </Shell>
  )

  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size={36} /></div>
}

function Shell({ step, total, onBack, label, children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '2rem 1.5rem', background: 'linear-gradient(135deg, var(--purple-50) 0%, var(--gray-50) 60%)'
    }}>
      <div style={{ width: '100%', maxWidth: 500 }} className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StarLogo size={36} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem', color: 'var(--purple-800)' }}>KidStars</span>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{
                width: i === step ? 24 : 8, height: 8, borderRadius: 4,
                background: i <= step ? 'var(--purple-600)' : 'var(--gray-200)', transition: 'all .3s',
              }} />
            ))}
          </div>
        </div>
        <div className="card card-lg">
          {children}
          {onBack && <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginTop: '0.75rem' }}>← Înapoi</button>}
        </div>
      </div>
    </div>
  )
}

function TaskEditor({ label, color, tasks, bonus, isPenalty, onTasksChange, onBonusChange }) {
  return (
    <div style={{ border: `1.5px solid ${color}30`, borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 4 }}>
      <div style={{ background: `${color}10`, padding: '7px 12px', borderBottom: `1px solid ${color}20`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color }}>{label}</span>
        {!isPenalty && onBonusChange && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 4 }}>
            Bonus:
            <input type="number" value={bonus} onChange={e => onBonusChange(parseInt(e.target.value)||0)}
              style={{ width: 44, padding: '2px 5px', border: '1px solid var(--gray-200)', borderRadius: 5, fontSize: '0.8125rem', textAlign: 'center' }} />⭐
          </span>
        )}
      </div>
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {tasks.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input className="input" style={{ flex: 1, padding: '6px 9px', fontSize: '0.8125rem' }}
              value={t.name} onChange={e => { const arr=[...tasks]; arr[i]={...t, name: e.target.value}; onTasksChange(arr) }}
              placeholder="Sarcină..." />
            <input type="number" value={t.pts} min={1}
              onChange={e => { const arr=[...tasks]; arr[i]={...t, pts: Math.max(1,parseInt(e.target.value)||1)}; onTasksChange(arr) }}
              style={{ width: 48, padding: '6px 5px', border: '1.5px solid var(--gray-200)', borderRadius: 7, fontSize: '0.8125rem', textAlign: 'center' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--amber-400)' }}>⭐</span>
            <button onClick={() => onTasksChange(tasks.filter((_,idx)=>idx!==i))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E24B4A', fontSize: 18, padding: '0 2px', lineHeight: 1 }}>×</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => onTasksChange([...tasks, {id:`t_${Date.now()}`, name:'', pts:3}])}
          style={{ alignSelf: 'flex-start', marginTop: 2, fontSize: '0.8125rem' }}>+ Adaugă</button>
      </div>
    </div>
  )
}

function RewardEditor({ rewards, onRewardsChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {rewards.map((r, i) => (
        <div key={r.id} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '8px 10px', background: 'var(--white)', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)' }}>
          <input style={{ width: 34, padding: '3px', border: '1px solid var(--gray-200)', borderRadius: 7, fontSize: '1.125rem', textAlign: 'center' }}
            value={r.icon} onChange={e => { const arr=[...rewards]; arr[i]={...r,icon:e.target.value}; onRewardsChange(arr) }} />
          <input className="input" style={{ flex: 1, padding: '6px 9px', fontSize: '0.8125rem' }}
            value={r.name} onChange={e => { const arr=[...rewards]; arr[i]={...r,name:e.target.value}; onRewardsChange(arr) }} placeholder="Recompensă" />
          <input type="number" value={r.pts} min={1}
            onChange={e => { const arr=[...rewards]; arr[i]={...r,pts:Math.max(1,parseInt(e.target.value)||1)}; onRewardsChange(arr) }}
            style={{ width: 56, padding: '6px 5px', border: '1.5px solid var(--gray-200)', borderRadius: 7, fontSize: '0.8125rem', textAlign: 'center' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--amber-400)' }}>⭐</span>
          <button onClick={() => onRewardsChange(rewards.filter((_,idx)=>idx!==i))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E24B4A', fontSize: 18, padding: '0 2px', lineHeight: 1 }}>×</button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => onRewardsChange([...rewards, {id:`r_${Date.now()}`,icon:'🎁',name:'',pts:50,type:'special',dailyLimit:null,weeklyLimit:null}])}
        style={{ alignSelf: 'flex-start' }}>+ Adaugă recompensă</button>
    </div>
  )
}
