import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { saveChildConfig, updateUserDoc, addChild, saveAdminSettings } from '../../lib/firestore'
import { DEMO_DATA } from '../../lib/demoData'
import { StarLogo } from '../../components/StarLogo'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'

export function AdminSetupPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  // step 0=welcome, 1=passwords, 2=child-name, 3=age, 4=tasks, 5=rewards, 6=add-another
  const [step, setStep] = useState(0)
  const [children, setChildren] = useState([])
  const [saving, setSaving] = useState(false)

  // Admin passwords
  const [passwords, setPasswords] = useState({ resetDay: '', resetYesterday: '', confirmReset: '', confirmYesterday: '' })
  const [pwdErrors, setPwdErrors] = useState({})

  // Current child
  const [childName, setChildName] = useState('')
  const [gender, setGender] = useState('girl')
  const [ageGroup, setAgeGroup] = useState('')
  const [config, setConfig] = useState(null)

  function selectAgeGroup(g) {
    setAgeGroup(g)
    setConfig(JSON.parse(JSON.stringify(DEMO_DATA[g])))
  }

  function validatePasswords() {
    const errs = {}
    if (!passwords.resetDay || passwords.resetDay.length < 4) errs.resetDay = 'Minim 4 caractere'
    if (passwords.resetDay !== passwords.confirmReset) errs.confirmReset = 'Parolele nu coincid'
    if (!passwords.resetYesterday || passwords.resetYesterday.length < 4) errs.resetYesterday = 'Minim 4 caractere'
    if (passwords.resetYesterday !== passwords.confirmYesterday) errs.confirmYesterday = 'Parolele nu coincid'
    setPwdErrors(errs)
    return Object.keys(errs).length === 0
  }

  function finishChild() {
    setChildren(prev => [...prev, { childName, gender, ageGroup, config }])
    setStep(6)
  }

  function addAnother() {
    setChildName(''); setGender('girl'); setAgeGroup(''); setConfig(null)
    setStep(2)
  }

  async function finishSetup() {
    setSaving(true)
    try {
      // Save admin passwords
      await saveAdminSettings(user.uid, {
        resetDayPassword: passwords.resetDay,
        resetYesterdayPassword: passwords.resetYesterday,
      })
      // Save children configs
      for (const child of children) {
        const childId = await addChild(user.uid, { childName: child.childName, ageGroup: child.ageGroup, gender: child.gender })
        await saveChildConfig(user.uid, childId, child.config)
      }
      await updateUserDoc(user.uid, { setupComplete: true })
      await refreshProfile()
      toast('Configurare completă! 🎉', 'success')
      navigate('/admin')
    } catch(e) {
      toast('Eroare: ' + e.message, 'error')
    } finally { setSaving(false) }
  }

  const totalSteps = 5

  if (step === 0) return (
    <Shell step={0} total={totalSteps}>
      <div style={{ textAlign:'center', padding:'1rem 0' }}>
        <div style={{ fontSize:64, marginBottom:'1rem' }}>🌟</div>
        <h2 style={{ marginBottom:'0.75rem' }}>Bun venit în KidStars, {profile?.displayName}!</h2>
        <p style={{ color:'var(--gray-600)', marginBottom:'2rem', lineHeight:1.6 }}>
          Hai să configurăm aplicația. Durează doar câteva minute.
        </p>
        <button className="btn btn-primary btn-lg" onClick={() => setStep(1)} style={{ minWidth:220 }}>
          Hai să începem →
        </button>
      </div>
    </Shell>
  )

  if (step === 1) return (
    <Shell step={1} total={totalSteps} onBack={() => setStep(0)}>
      <h2 style={{ marginBottom:'0.5rem' }}>🔐 Setează parolele de protecție</h2>
      <p style={{ marginBottom:'1.5rem', color:'var(--gray-600)', fontSize:'0.9rem', lineHeight:1.5 }}>
        Aceste parole protejează acțiunile sensibile — resetarea zilei și adăugarea retroactivă de puncte.
        Alege parole pe care le ții minte, dar pe care copilul nu le ghicește.
      </p>

      <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
        <div style={{ background:'var(--green-50)', borderRadius:'var(--radius-md)', padding:'1rem', border:'1px solid var(--green-600)20' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--green-800)', marginBottom:'0.75rem' }}>
            ↺ Parola pentru "Resetare zi"
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div className="input-group">
              <label className="input-label">Parolă</label>
              <input className={`input ${pwdErrors.resetDay?'error':''}`} type="password"
                value={passwords.resetDay} onChange={e=>setPasswords(p=>({...p,resetDay:e.target.value}))}
                placeholder="Minim 4 caractere" autoFocus/>
              {pwdErrors.resetDay && <span className="input-error">{pwdErrors.resetDay}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Confirmă</label>
              <input className={`input ${pwdErrors.confirmReset?'error':''}`} type="password"
                value={passwords.confirmReset} onChange={e=>setPasswords(p=>({...p,confirmReset:e.target.value}))}
                placeholder="Repetă parola"/>
              {pwdErrors.confirmReset && <span className="input-error">{pwdErrors.confirmReset}</span>}
            </div>
          </div>
        </div>

        <div style={{ background:'var(--purple-50)', borderRadius:'var(--radius-md)', padding:'1rem', border:'1px solid var(--purple-100)' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--purple-800)', marginBottom:'0.75rem' }}>
            ← Parola pentru "Puncte pentru ieri"
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div className="input-group">
              <label className="input-label">Parolă</label>
              <input className={`input ${pwdErrors.resetYesterday?'error':''}`} type="password"
                value={passwords.resetYesterday} onChange={e=>setPasswords(p=>({...p,resetYesterday:e.target.value}))}
                placeholder="Minim 4 caractere"/>
              {pwdErrors.resetYesterday && <span className="input-error">{pwdErrors.resetYesterday}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Confirmă</label>
              <input className={`input ${pwdErrors.confirmYesterday?'error':''}`} type="password"
                value={passwords.confirmYesterday} onChange={e=>setPasswords(p=>({...p,confirmYesterday:e.target.value}))}
                placeholder="Repetă parola"/>
              {pwdErrors.confirmYesterday && <span className="input-error">{pwdErrors.confirmYesterday}</span>}
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn-primary btn-full btn-lg" onClick={() => { if(validatePasswords()) setStep(2) }} style={{ marginTop:'1.5rem' }}>
        Continuă →
      </button>
    </Shell>
  )

  if (step === 2) return (
    <Shell step={2} total={totalSteps} onBack={() => setStep(1)}>
      <h2 style={{ marginBottom:'0.5rem' }}>{children.length === 0 ? 'Primul copil' : `Copilul ${children.length + 1}`}</h2>
      <p style={{ marginBottom:'1.5rem', color:'var(--gray-600)' }}>Cum îl cheamă și care este genul?</p>
      <div className="input-group" style={{ marginBottom:'1.25rem' }}>
        <label className="input-label">Numele copilului</label>
        <input className="input" value={childName} onChange={e=>setChildName(e.target.value)} placeholder="Ex: Maria, Andrei..." autoFocus/>
      </div>
      <div className="input-group" style={{ marginBottom:'1.5rem' }}>
        <label className="input-label">Gen</label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:4 }}>
          {[['girl','👧','Fată'],['boy','👦','Băiat']].map(([val,emoji,label]) => (
            <button key={val} onClick={()=>setGender(val)} style={{
              padding:'1rem', borderRadius:'var(--radius-md)', cursor:'pointer', textAlign:'center',
              border:`2px solid ${gender===val?'var(--purple-600)':'var(--gray-200)'}`,
              background:gender===val?'var(--purple-50)':'var(--white)', transition:'all .15s',
            }}>
              <div style={{ fontSize:32 }}>{emoji}</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.9rem', marginTop:4 }}>{label}</div>
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-primary btn-full btn-lg" onClick={()=>setStep(3)} disabled={!childName.trim()}>
        Continuă →
      </button>
    </Shell>
  )

  if (step === 3) return (
    <Shell step={3} total={totalSteps} onBack={()=>setStep(2)}>
      <h2 style={{ marginBottom:'0.5rem' }}>Câți ani are {childName}?</h2>
      <p style={{ marginBottom:'1.5rem', color:'var(--gray-600)' }}>Selectăm sarcini potrivite vârstei.</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:'1.5rem' }}>
        {Object.entries(DEMO_DATA).map(([key, d]) => (
          <button key={key} onClick={()=>selectAgeGroup(key)} style={{
            padding:'1.25rem 0.75rem', borderRadius:'var(--radius-md)', cursor:'pointer', textAlign:'center',
            border:`2px solid ${ageGroup===key?'var(--purple-600)':'var(--gray-200)'}`,
            background:ageGroup===key?'var(--purple-50)':'var(--white)', transition:'all .15s',
          }}>
            <div style={{ fontSize:28, marginBottom:5 }}>{d.emoji}</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.875rem' }}>{key} ani</div>
            <div style={{ fontSize:'0.75rem', color:'var(--gray-500)', marginTop:2 }}>{d.label.split('(')[0].trim()}</div>
          </button>
        ))}
      </div>
      <button className="btn btn-primary btn-full btn-lg" onClick={()=>setStep(4)} disabled={!ageGroup}>Continuă →</button>
    </Shell>
  )

  if (step === 4 && config) return (
    <Shell step={3} total={totalSteps} onBack={()=>setStep(3)}>
      <h2 style={{ marginBottom:'0.5rem' }}>Sarcini pentru {childName}</h2>
      <p style={{ marginBottom:'1rem', color:'var(--gray-600)' }}>Template pre-completat. Editează orice dorești.</p>
      <div style={{ maxHeight:'52vh', overflowY:'auto', paddingRight:4, display:'flex', flexDirection:'column', gap:10 }}>
        <TaskEditor label="Rutină zilnică" color="var(--green-600)" tasks={config.tasks1} bonus={config.bonus1}
          onTasksChange={t=>setConfig(c=>({...c,tasks1:t}))} onBonusChange={v=>setConfig(c=>({...c,bonus1:v}))}/>
        <TaskEditor label="Comportament" color="var(--purple-600)" tasks={config.tasks2} bonus={config.bonus2}
          onTasksChange={t=>setConfig(c=>({...c,tasks2:t}))} onBonusChange={v=>setConfig(c=>({...c,bonus2:v}))}/>
        <TaskEditor label="Penalizări" color="#A32D2D" isPenalty tasks={config.penalties}
          onTasksChange={t=>setConfig(c=>({...c,penalties:t}))}/>
      </div>
      <button className="btn btn-primary btn-full btn-lg" onClick={()=>setStep(5)} style={{ marginTop:'1rem' }}>Continuă →</button>
    </Shell>
  )

  if (step === 5 && config) return (
    <Shell step={4} total={totalSteps} onBack={()=>setStep(4)}>
      <h2 style={{ marginBottom:'0.5rem' }}>Recompense pentru {childName}</h2>
      <p style={{ marginBottom:'1rem', color:'var(--gray-600)' }}>Ce poate obține cu stelele câștigate?</p>
      <div style={{ maxHeight:'50vh', overflowY:'auto', paddingRight:4 }}>
        <RewardEditor rewards={config.rewards} onRewardsChange={r=>setConfig(c=>({...c,rewards:r}))}/>
      </div>
      <button className="btn btn-primary btn-full btn-lg" onClick={finishChild} style={{ marginTop:'1rem' }}>
        Salvează {childName} →
      </button>
    </Shell>
  )

  if (step === 6) return (
    <Shell step={4} total={totalSteps}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:'0.75rem' }}>
          {children[children.length-1]?.gender==='girl'?'👧':'👦'}
        </div>
        <h2 style={{ marginBottom:'0.5rem' }}>{children[children.length-1]?.childName} a fost configurat(ă)!</h2>
        {children.length > 0 && (
          <div style={{ background:'var(--purple-50)', borderRadius:'var(--radius-md)', padding:'0.875rem', margin:'1rem 0', textAlign:'left' }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--purple-800)', fontSize:'0.875rem', marginBottom:6 }}>
              Copii configurați ({children.length}):
            </div>
            {children.map((c,i) => (
              <div key={i} style={{ fontSize:'0.875rem', color:'var(--purple-700)', display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                <span>{c.gender==='girl'?'👧':'👦'}</span>
                <span>{c.childName}</span>
                <span style={{ color:'var(--gray-400)' }}>· {c.ageGroup} ani</span>
              </div>
            ))}
          </div>
        )}
        <p style={{ color:'var(--gray-600)', fontSize:'0.875rem', marginBottom:'1.5rem', lineHeight:1.6 }}>
          Poți adăuga mai mulți copii acum sau mai târziu din panoul de administrare.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          <button className="btn btn-secondary btn-lg" onClick={addAnother}>+ Adaugă alt copil</button>
          <button className="btn btn-primary btn-lg" onClick={finishSetup} disabled={saving}>
            {saving ? <Spinner size={18} color="white"/> : 'Intră în aplicație 🚀'}
          </button>
        </div>
      </div>
    </Shell>
  )

  return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={36}/></div>
}

function Shell({ step, total, onBack, children }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'2rem 1.5rem', background:'linear-gradient(135deg, var(--purple-50) 0%, var(--gray-50) 60%)' }}>
      <div style={{ width:'100%', maxWidth:520 }} className="fade-in">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.75rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <StarLogo size={36}/>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.125rem', color:'var(--purple-800)' }}>KidStars</span>
          </div>
          <div style={{ display:'flex', gap:5 }}>
            {Array.from({length:total}).map((_,i) => (
              <div key={i} style={{ width:i===step?24:8, height:8, borderRadius:4, background:i<=step?'var(--purple-600)':'var(--gray-200)', transition:'all .3s' }}/>
            ))}
          </div>
        </div>
        <div className="card card-lg">
          {children}
          {onBack && <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginTop:'0.75rem' }}>← Înapoi</button>}
        </div>
      </div>
    </div>
  )
}

function TaskEditor({ label, color, tasks, bonus, isPenalty, onTasksChange, onBonusChange }) {
  return (
    <div style={{ border:`1.5px solid ${color}30`, borderRadius:'var(--radius-md)', overflow:'hidden' }}>
      <div style={{ background:`${color}10`, padding:'7px 12px', borderBottom:`1px solid ${color}20`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.875rem', color }}>{label}</span>
        {!isPenalty && onBonusChange && (
          <span style={{ fontSize:'0.8125rem', color:'var(--gray-600)', display:'flex', alignItems:'center', gap:4 }}>
            Bonus: <input type="number" value={bonus} onChange={e=>onBonusChange(parseInt(e.target.value)||0)}
              style={{ width:44, padding:'2px 5px', border:'1px solid var(--gray-200)', borderRadius:5, fontSize:'0.8125rem', textAlign:'center' }}/> ⭐
          </span>
        )}
      </div>
      <div style={{ padding:'8px 12px', display:'flex', flexDirection:'column', gap:5 }}>
        {tasks.map((t,i) => (
          <div key={t.id} style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input className="input" style={{ flex:1, padding:'6px 9px', fontSize:'0.8125rem' }}
              value={t.name} onChange={e=>{ const arr=[...tasks]; arr[i]={...t,name:e.target.value}; onTasksChange(arr) }} placeholder="Sarcină..."/>
            <input type="number" value={t.pts} min={1}
              onChange={e=>{ const arr=[...tasks]; arr[i]={...t,pts:Math.max(1,parseInt(e.target.value)||1)}; onTasksChange(arr) }}
              style={{ width:48, padding:'6px 5px', border:'1.5px solid var(--gray-200)', borderRadius:7, fontSize:'0.8125rem', textAlign:'center' }}/>
            <span style={{ fontSize:'0.75rem', color:'var(--amber-400)' }}>⭐</span>
            <button onClick={()=>onTasksChange(tasks.filter((_,idx)=>idx!==i))}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#E24B4A', fontSize:18, padding:'0 2px', lineHeight:1 }}>×</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={()=>onTasksChange([...tasks,{id:`t_${Date.now()}`,name:'',pts:3}])}
          style={{ alignSelf:'flex-start', marginTop:2, fontSize:'0.8125rem' }}>+ Adaugă</button>
      </div>
    </div>
  )
}

function RewardEditor({ rewards, onRewardsChange }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      {rewards.map((r,i) => (
        <div key={r.id} style={{ display:'flex', gap:6, alignItems:'center', padding:'8px 10px', background:'var(--white)', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius-md)' }}>
          <input style={{ width:34, padding:'3px', border:'1px solid var(--gray-200)', borderRadius:7, fontSize:'1.125rem', textAlign:'center' }}
            value={r.icon} onChange={e=>{ const arr=[...rewards]; arr[i]={...r,icon:e.target.value}; onRewardsChange(arr) }}/>
          <input className="input" style={{ flex:1, padding:'6px 9px', fontSize:'0.8125rem' }}
            value={r.name} onChange={e=>{ const arr=[...rewards]; arr[i]={...r,name:e.target.value}; onRewardsChange(arr) }} placeholder="Recompensă"/>
          <input type="number" value={r.pts} min={1}
            onChange={e=>{ const arr=[...rewards]; arr[i]={...r,pts:Math.max(1,parseInt(e.target.value)||1)}; onRewardsChange(arr) }}
            style={{ width:56, padding:'6px 5px', border:'1.5px solid var(--gray-200)', borderRadius:7, fontSize:'0.8125rem', textAlign:'center' }}/>
          <span style={{ fontSize:'0.75rem', color:'var(--amber-400)' }}>⭐</span>
          <button onClick={()=>onRewardsChange(rewards.filter((_,idx)=>idx!==i))}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#E24B4A', fontSize:18, padding:'0 2px', lineHeight:1 }}>×</button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={()=>onRewardsChange([...rewards,{id:`r_${Date.now()}`,icon:'🎁',name:'',pts:50,type:'special',dailyLimit:null,weeklyLimit:null}])}
        style={{ alignSelf:'flex-start' }}>+ Adaugă recompensă</button>
    </div>
  )
}
