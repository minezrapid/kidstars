import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getChildren, getChildState, getChildConfig, saveChildState, getChildDoc, resetChildState } from '../../lib/firestore'
import { DEMO_DATA } from '../../lib/demoData'
import { AdminLayout } from './AdminLayout'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'

function getTodayKey(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
function getYesterdayKey(){const d=new Date(Date.now()-86400000);return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
function getMonthKey(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()}`}
function getWeekKey(){const d=new Date();const j=new Date(d.getFullYear(),0,1);const w=Math.ceil(((d-j)/86400000+j.getDay()+1)/7);return `${d.getFullYear()}-W${w}`}
function fmtYesterday(){return new Date(Date.now()-86400000).toLocaleDateString('ro-RO',{weekday:'long',day:'numeric',month:'long'})}

const RESET_PASSWORD = 'reseteaza'

export function AdminChildren() {
  const { user } = useAuth()
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    getChildren(user.uid).then(kids => {
      setChildren(kids)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user.uid])

  if (loading) return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size={36} /></div>
    </AdminLayout>
  )

  if (selectedId) return (
    <AdminLayout>
      <ChildDailyView adminId={user.uid} childId={selectedId} onBack={() => setSelectedId(null)} />
    </AdminLayout>
  )

  return (
    <AdminLayout>
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--purple-800)' }}>Copii</h1>
            <p style={{ marginTop: 4 }}>Monitorizează activitatea zilnică a copiilor.</p>
          </div>
          <Link to="/admin/invites" className="btn btn-primary">+ Invită copil</Link>
        </div>

        {children.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>👶</div>
            <p style={{ marginBottom: '1.25rem' }}>Niciun copil înregistrat.</p>
            <Link to="/admin/invites" className="btn btn-primary">Invită primul copil</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {children.map(kid => (
              <ChildCard key={kid.id} kid={kid} adminId={user.uid} onClick={() => setSelectedId(kid.id)} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function ChildCard({ kid, adminId, onClick }) {
  const [state, setState] = useState(null)
  const [config, setConfig] = useState(null)

  useEffect(() => {
    Promise.all([getChildState(adminId, kid.id), getChildConfig(adminId, kid.id)]).then(([st, cfg]) => {
      setState(st)
      setConfig(cfg)
    }).catch(() => {})
  }, [kid.id, adminId])

  const totalTasks = ((config?.tasks1||[]).length + (config?.tasks2||[]).length)
  const doneTasks = state ? Object.values(state.done||{}).filter(Boolean).length : 0
  const stars = state?.stars || 0
  const pct = totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0

  return (
    <button onClick={onClick} style={{
      background: 'var(--white)', border: '1.5px solid var(--gray-200)',
      borderRadius: 'var(--radius-lg)', padding: '1.5rem 1rem',
      textAlign: 'center', cursor: 'pointer', transition: 'all .15s', width: '100%',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple-400)'; e.currentTarget.style.background = 'var(--purple-50)' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.background = 'var(--white)' }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>{kid.gender === 'girl' ? '👧' : '👦'}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--purple-800)' }}>{kid.childName}</div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginTop: 2, marginBottom: 10 }}>{kid.ageGroup} ani</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--purple-600)' }}>{stars} ⭐</div>
      {totalTasks > 0 && (
        <>
          <div style={{ height: 5, background: 'var(--gray-100)', borderRadius: 3, marginTop: 8 }}>
            <div style={{ height: '100%', borderRadius: 3, background: pct === 100 ? 'var(--green-600)' : 'var(--purple-400)', width: pct + '%', transition: 'width .4s' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 4 }}>{doneTasks}/{totalTasks} sarcini azi</div>
        </>
      )}
    </button>
  )
}

// ── Daily view for a single child ─────────────────────────────

function ChildDailyView({ adminId, childId, onBack }) {
  const toast = useToast()
  const [config, setConfig] = useState(null)
  const [state, setState] = useState(null)
  const [childDoc, setChildDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('tasks')
  const [showYesterdayModal, setShowYesterdayModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetPwd, setResetPwd] = useState('')
  const [resetPwdErr, setResetPwdErr] = useState(false)

  useEffect(() => { loadData() }, [childId])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [cfg, st, cd] = await Promise.all([
        getChildConfig(adminId, childId),
        getChildState(adminId, childId),
        getChildDoc(childId),
      ])
      if (!cfg) {
        // Use demo config if none saved yet
        const ageGroup = cd?.ageGroup || '7-10'
        setConfig(JSON.parse(JSON.stringify(DEMO_DATA[ageGroup])))
      } else {
        setConfig(cfg)
      }
      setChildDoc(cd)
      let s = st || initState()
      s = resetIfNeeded(s)
      setState(s)
    } catch (err) {
      setError('Eroare la încărcare: ' + err.message)
    }
    setLoading(false)
  }

  function initState() {
    return { stars:0, done:{}, history:[], bonus1Given:false, bonus2Given:false,
      penaltiesApplied:[], extraPoints:[], earnedMonth:0, spentMonth:0,
      spentToday:0, spentTotal:0, spentLv1:0,
      todayKey:getTodayKey(), monthKey:getMonthKey(), weekKey:getWeekKey(),
      dailyCounts:{}, weeklyCounts:{}, yesterdayDone:{}, yesterdayKey:'', dailyHistory:{} }
  }
  function resetIfNeeded(s) {
    if (!s) return initState()
    if (s.todayKey !== getTodayKey()) s = {...s, done:{}, bonus1Given:false, bonus2Given:false, penaltiesApplied:[], spentToday:0, dailyCounts:{}, todayKey:getTodayKey()}
    if ((s.weekKey||'') !== getWeekKey()) s = {...s, weeklyCounts:{}, weekKey:getWeekKey()}
    if ((s.monthKey||'') !== getMonthKey()) s = {...s, earnedMonth:0, spentMonth:0, spentLv1:0, spentTotal:0, monthKey:getMonthKey()}
    return s
  }
  function addHist(s, desc, pts) {
    const now = new Date()
    const time = now.toLocaleDateString('ro-RO',{day:'numeric',month:'short'})+', '+now.toLocaleTimeString('ro-RO',{hour:'2-digit',minute:'2-digit'})
    return {...s, history:[...(s.history||[]),{desc,pts,time}].slice(-200)}
  }
  async function persist(ns) {
    setState(ns); setSaving(true)
    try { await saveChildState(adminId, childId, ns) }
    catch (e) { toast('Eroare la salvare: ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  function checkBonus(s) {
    const t1=config.tasks1||[], t2=config.tasks2||[], b1=config.bonus1||0, b2=config.bonus2||0
    const all1=t1.every(t=>s.done[t.id]), all2=t2.every(t=>s.done[t.id])
    if(all1&&!s.bonus1Given){s={...s,bonus1Given:true,stars:s.stars+b1,earnedMonth:s.earnedMonth+b1};s=addHist(s,'Bonus Rutină completă! 🎉',b1)}
    else if(!all1&&s.bonus1Given){s={...s,bonus1Given:false,stars:Math.max(0,s.stars-b1),earnedMonth:Math.max(0,s.earnedMonth-b1)};s=addHist(s,'Bonus Rutină anulat',-b1)}
    if(all2&&!s.bonus2Given){s={...s,bonus2Given:true,stars:s.stars+b2,earnedMonth:s.earnedMonth+b2};s=addHist(s,'Bonus Comportament! 🎉',b2)}
    else if(!all2&&s.bonus2Given){s={...s,bonus2Given:false,stars:Math.max(0,s.stars-b2),earnedMonth:Math.max(0,s.earnedMonth-b2)};s=addHist(s,'Bonus Comportament anulat',-b2)}
    return s
  }

  function toggleTask(taskId) {
    const all=[...(config.tasks1||[]),...(config.tasks2||[])]
    const task=all.find(t=>t.id===taskId); if(!task) return
    let s={...state,done:{...state.done}}
    if(s.done[taskId]){
      s.done[taskId]=false; s.stars=Math.max(0,s.stars-task.pts); s.earnedMonth=Math.max(0,s.earnedMonth-task.pts)
      s=addHist(s,'Anulat: '+task.name,-task.pts); s=checkBonus(s)
      toast('-'+task.pts+' stele')
    } else {
      s.done[taskId]=true; s.stars+=task.pts; s.earnedMonth+=task.pts
      s=addHist(s,task.name,task.pts); s=checkBonus(s)
      toast('+'+task.pts+' stele! ⭐','success')
    }
    persist(s)
  }

  function applyPenalty(p) {
    let s={...state}
    s.stars=Math.max(0,s.stars-p.pts); s.earnedMonth=Math.max(0,s.earnedMonth-p.pts)
    s.penaltiesApplied=[...(s.penaltiesApplied||[]),{id:p.id,name:p.name,pts:p.pts,time:Date.now()}]
    s=addHist(s,'⚠️ Penalizare: '+p.name,-p.pts)
    persist(s); toast('-'+p.pts+' stele (penalizare)','error')
  }

  function undoPenalty(idx) {
    const pen=(state.penaltiesApplied||[])[idx]; if(!pen) return
    let s={...state}
    s.stars+=pen.pts; s.earnedMonth+=pen.pts
    s.penaltiesApplied=s.penaltiesApplied.filter((_,i)=>i!==idx)
    s=addHist(s,'↩ Penalizare anulată: '+pen.name,pen.pts)
    persist(s); toast('Penalizare anulată.')
  }

  function tryReset() {
    if(resetPwd !== RESET_PASSWORD){setResetPwdErr(true);return}
    setShowResetModal(false); setResetPwd(''); setResetPwdErr(false)
    const ns=initState()
    setState(ns)
    saveChildState(adminId,childId,ns).then(()=>toast('Date resetate!','success')).catch(()=>toast('Eroare la resetare.','error'))
  }

  function deleteHistory() {
    if(!confirm('Ștergi tot istoricul? Stelele rămân.')) return
    let s={...state,history:[]}
    s=addHist(s,'Istoric șters de admin',0)
    persist(s); toast('Istoric șters.')
  }

  if (loading) return <div style={{display:'flex',justifyContent:'center',paddingTop:'3rem'}}><Spinner size={32}/></div>

  if (error) return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{marginBottom:'1rem'}}>← Toți copiii</button>
      <div style={{background:'#FCEBEB',borderRadius:'var(--radius-md)',padding:'1rem',color:'#A32D2D'}}>
        <strong>Eroare:</strong> {error}
        <br/><small>Verifică că regulile Firestore permit accesul și că există o configurare pentru acest copil.</small>
      </div>
      <button className="btn btn-secondary btn-sm" onClick={loadData} style={{marginTop:'0.75rem'}}>🔄 Reîncearcă</button>
    </div>
  )

  const tasks1=config?.tasks1||[], tasks2=config?.tasks2||[], penalties=config?.penalties||[]
  const done1=tasks1.filter(t=>state.done[t.id]).length
  const done2=tasks2.filter(t=>state.done[t.id]).length
  const starValue=config?.starValue||0.10
  const gender=childDoc?.gender||'girl'
  const childName=childDoc?.childName||'Copil'
  const TABS=[{k:'tasks',l:'📋 Sarcini'},{k:'penalties',l:'⚠️ Penalizări'},{k:'history',l:'📈 Istoric'}]

  return (
    <div className="fade-in">
      {/* Back + header */}
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{marginBottom:'1rem'}}>← Toți copiii</button>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:'1.5rem',flexWrap:'wrap'}}>
        <div style={{fontSize:40}}>{gender==='girl'?'👧':'👦'}</div>
        <div style={{flex:1}}>
          <h1 style={{fontSize:'1.5rem',color:'var(--purple-800)',margin:0}}>{childName}</h1>
          <p style={{margin:'2px 0 0',fontSize:'0.875rem'}}>{childDoc?.ageGroup} ani</p>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:'2rem',color:'var(--purple-600)',lineHeight:1}}>{state.stars} ⭐</div>
          <div style={{fontSize:'0.8125rem',color:'var(--gray-400)'}}>= {(state.stars*starValue).toFixed(2)} RON</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:'1.25rem',flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            padding:'7px 16px',borderRadius:'var(--radius-full)',cursor:'pointer',
            border:`1.5px solid ${tab===t.k?'var(--purple-600)':'var(--gray-200)'}`,
            background:tab===t.k?'var(--purple-600)':'var(--white)',
            color:tab===t.k?'white':'var(--gray-600)',
            fontFamily:'var(--font-display)',fontWeight:600,fontSize:'0.875rem',
          }}>{t.l}</button>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={()=>setShowYesterdayModal(true)}>← Ieri</button>
        <button className="btn btn-danger btn-sm" onClick={()=>setShowResetModal(true)}>⚠️ Resetare</button>
        {saving && <Spinner size={16}/>}
      </div>

      {/* ── SARCINI ── */}
      {tab==='tasks' && (
        <div>
          <TaskGroup label="Rutină zilnică" color="var(--green-600)" emoji="🌅"
            tasks={tasks1} done={state.done} count={done1}
            bonus={config?.bonus1} bonusGiven={state.bonus1Given} onToggle={toggleTask} />
          <div style={{marginTop:12}}>
            <TaskGroup label="Comportament" color="var(--purple-600)" emoji="✨"
              tasks={tasks2} done={state.done} count={done2}
              bonus={config?.bonus2} bonusGiven={state.bonus2Given} onToggle={toggleTask} />
          </div>
          <div style={{marginTop:10,padding:'8px 12px',background:'var(--purple-50)',borderRadius:'var(--radius-md)',fontSize:'0.8125rem',color:'var(--purple-700)'}}>
            💡 Pentru a modifica sarcinile, mergi la <Link to="/admin/settings" style={{color:'var(--purple-600)',fontWeight:600}}>Setări</Link>.
          </div>
        </div>
      )}

      {/* ── PENALIZĂRI ── */}
      {tab==='penalties' && (
        <div>
          <p style={{marginBottom:'1rem',fontSize:'0.875rem',color:'var(--gray-600)'}}>Apasă pe o penalizare pentru a o aplica copilului.</p>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {penalties.length===0 && <p style={{color:'var(--gray-400)',textAlign:'center',padding:'2rem'}}>Nicio penalizare configurată. Adaugă din <Link to="/admin/settings">Setări</Link>.</p>}
            {penalties.map(p=>{
              const count=(state.penaltiesApplied||[]).filter(x=>x.id===p.id).length
              return (
                <div key={p.id} style={{background:count?'#FBEAF0':'var(--white)',border:`1px solid ${count?'#EBA8C0':'var(--gray-200)'}`,borderRadius:'var(--radius-md)',padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'var(--font-display)',fontWeight:600,color:count?'#72243E':'var(--gray-900)'}}>{p.name}</div>
                    {count>0&&<div style={{fontSize:'0.8125rem',color:'#A32D2D',marginTop:2}}>Aplicat × {count}</div>}
                  </div>
                  <span style={{fontWeight:700,color:'#A32D2D',flexShrink:0}}>-{p.pts}⭐</span>
                  <button className="btn btn-danger btn-sm" onClick={()=>applyPenalty(p)}>Aplică</button>
                </div>
              )
            })}
          </div>
          {(state.penaltiesApplied||[]).length>0&&(
            <div style={{marginTop:'1.25rem'}}>
              <h3 style={{marginBottom:'0.75rem',fontSize:'1rem'}}>Penalizări aplicate azi</h3>
              {(state.penaltiesApplied||[]).map((pen,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'#FBEAF0',borderRadius:'var(--radius-md)',marginBottom:6}}>
                  <span style={{flex:1,fontSize:'0.875rem',color:'#72243E'}}>{pen.name}</span>
                  <span style={{color:'#A32D2D',fontWeight:700}}>-{pen.pts}⭐</span>
                  <button className="btn btn-ghost btn-sm" onClick={()=>undoPenalty(i)}>↩ Anulează</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ISTORIC ── */}
      {tab==='history' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:'1.25rem'}}>
            {[{l:'Câștigate luna',v:state.earnedMonth+' ⭐',c:'var(--green-600)'},{l:'Folosite luna',v:state.spentMonth+' ⭐',c:'#A32D2D'},{l:'Total disponibil',v:state.stars+' ⭐',c:'var(--purple-600)'}].map(s=>(
              <div key={s.l} style={{background:'var(--white)',border:'1px solid var(--gray-200)',borderRadius:'var(--radius-md)',padding:'0.875rem',textAlign:'center'}}>
                <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:'1.25rem',color:s.c}}>{s.v}</div>
                <div style={{fontSize:'0.75rem',color:'var(--gray-400)',marginTop:3}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:8}}>
            <button className="btn btn-danger btn-sm" onClick={deleteHistory}>🗑 Șterge istoric</button>
          </div>
          {[...(state.history||[])].reverse().slice(0,80).map((h,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--gray-100)',fontSize:'0.875rem'}}>
              <div>
                <div style={{color:'var(--gray-900)'}}>{h.desc}</div>
                <div style={{fontSize:'0.75rem',color:'var(--gray-400)',marginTop:1}}>{h.time}</div>
              </div>
              <span style={{fontWeight:700,color:h.pts>0?'var(--green-600)':h.pts<0?'#A32D2D':'var(--gray-400)',flexShrink:0,marginLeft:12}}>
                {h.pts>0?'+':''}{h.pts!==0?h.pts:'↩'}
              </span>
            </div>
          ))}
          {(!state.history||state.history.length===0)&&<p style={{textAlign:'center',color:'var(--gray-400)',padding:'2rem 0'}}>Nicio activitate.</p>}
        </div>
      )}

      {/* Yesterday Modal */}
      {showYesterdayModal&&(
        <YesterdayModal config={config} state={state}
          onSave={ns=>{persist(ns);setShowYesterdayModal(false)}}
          onClose={()=>setShowYesterdayModal(false)} />
      )}

      {/* Reset Modal */}
      {showResetModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div className="card card-lg" style={{maxWidth:360,width:'100%'}}>
            <h3 style={{marginBottom:8}}>⚠️ Resetare zi curentă</h3>
            <p style={{fontSize:'0.875rem',marginBottom:12,color:'var(--gray-600)'}}>
              Șterge bifele zilei de azi pentru {childName}. Stelele acumulate rămân.
            </p>
            <input className={`input ${resetPwdErr?'error':''}`} type="password" value={resetPwd}
              onChange={e=>{setResetPwd(e.target.value);setResetPwdErr(false)}}
              placeholder="Parolă de resetare..." autoFocus
              onKeyDown={e=>e.key==='Enter'&&tryReset()} />
            {resetPwdErr&&<p style={{fontSize:'0.8125rem',color:'#E24B4A',marginTop:4}}>Parolă incorectă.</p>}
            <p style={{fontSize:'0.75rem',color:'var(--gray-400)',marginTop:6}}>Parola implicită: <code>reseteaza</code></p>
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>{setShowResetModal(false);setResetPwd('');setResetPwdErr(false)}}>Anulează</button>
              <button className="btn btn-danger btn-sm" onClick={tryReset}>↺ Resetează ziua</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskGroup({ label, color, emoji, tasks, done, count, bonus, bonusGiven, onToggle }) {
  return (
    <div style={{background:'var(--white)',border:'1px solid var(--gray-200)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
      <div style={{padding:'10px 14px',borderBottom:'1px solid var(--gray-100)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontFamily:'var(--font-display)',fontWeight:700,color,fontSize:'0.9375rem'}}>{emoji} {label}</span>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:'0.8125rem',color:'var(--gray-400)'}}>{count}/{tasks.length}</span>
          <div style={{width:48,height:6,background:'var(--gray-100)',borderRadius:3}}>
            <div style={{height:'100%',borderRadius:3,background:count===tasks.length&&tasks.length>0?'var(--green-600)':color,width:tasks.length?Math.round(count/tasks.length*100)+'%':'0%',transition:'width .3s'}}/>
          </div>
        </div>
      </div>
      {tasks.map((t,i)=>{
        const isDone=!!done[t.id]
        return (
          <button key={t.id} onClick={()=>onToggle(t.id)} style={{
            display:'flex',alignItems:'center',gap:12,padding:'11px 14px',width:'100%',textAlign:'left',
            background:isDone?(color==='var(--green-600)'?'var(--green-50)':'var(--purple-50)'):'transparent',
            border:'none',borderBottom:i<tasks.length-1?'1px solid var(--gray-100)':'none',
            cursor:'pointer',transition:'background .15s',
          }}>
            <div style={{width:22,height:22,borderRadius:'50%',flexShrink:0,border:`2px solid ${isDone?color:'var(--gray-200)'}`,background:isDone?color:'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:12,transition:'all .15s'}}>
              {isDone&&'✓'}
            </div>
            <span style={{flex:1,fontSize:'0.9rem',fontWeight:isDone?600:400,color:isDone?color:'var(--gray-900)'}}>{t.name}</span>
            <span style={{fontSize:'0.8125rem',fontWeight:700,color:isDone?color:'var(--gray-400)',flexShrink:0}}>+{t.pts}⭐</span>
          </button>
        )
      })}
      {(bonus>0)&&(
        <div style={{padding:'9px 14px',background:bonusGiven?(color==='var(--green-600)'?'var(--green-50)':'var(--purple-50)'):'var(--gray-50)',borderTop:'1px solid var(--gray-100)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:'0.8125rem',fontWeight:700,color:bonusGiven?color:'var(--gray-400)',fontFamily:'var(--font-display)'}}>🏆 Bonus {bonusGiven?'— obținut!':'complet'}</span>
          <span style={{fontWeight:700,fontSize:'0.875rem',color:bonusGiven?color:'var(--gray-300)'}}>+{bonus}⭐</span>
        </div>
      )}
    </div>
  )
}

function YesterdayModal({ config, state, onSave, onClose }) {
  const [locked, setLocked] = useState({})
  const [newDone, setNewDone] = useState({})
  const [unlocked, setUnlocked] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwdErr, setPwdErr] = useState(false)

  function unlock() {
    if(pwd!==RESET_PASSWORD){setPwdErr(true);return}
    const yKey=getYesterdayKey()
    const saved=state.dailyHistory?.[yKey]
    const savedDone=saved?Object.fromEntries(Object.entries(saved.done||{}).filter(([,v])=>v)):{}
    setLocked(savedDone); setNewDone({}); setUnlocked(true)
  }

  function toggle(id) {
    if(locked[id]) return
    setNewDone(prev=>({...prev,[id]:!prev[id]}))
  }

  function save() {
    const yKey=getYesterdayKey()
    const yDate=fmtYesterday()
    const allTasks=[...(config?.tasks1||[]),...(config?.tasks2||[])]
    const prevSaved=state.dailyHistory?.[yKey]
    const prevDone=prevSaved?.done||{}, prevB1=!!prevSaved?.bonus1, prevB2=!!prevSaved?.bonus2
    let s={...state}; let total=0
    allTasks.forEach(t=>{
      if(newDone[t.id]&&!prevDone[t.id]&&!locked[t.id]){
        s.stars+=t.pts; s.earnedMonth+=t.pts; total+=t.pts
        s={...s,history:[...(s.history||[]),{desc:`[Ieri — ${yDate}] ${t.name}`,pts:t.pts,time:new Date().toLocaleDateString('ro-RO',{day:'numeric',month:'short'})}].slice(-200)}
      }
    })
    const allSel={...locked,...newDone}
    const nb1=(config?.tasks1||[]).every(t=>allSel[t.id])
    const nb2=(config?.tasks2||[]).every(t=>allSel[t.id])
    if(nb1&&!prevB1){s.stars+=(config?.bonus1||0);s.earnedMonth+=(config?.bonus1||0);total+=(config?.bonus1||0)}
    if(nb2&&!prevB2){s.stars+=(config?.bonus2||0);s.earnedMonth+=(config?.bonus2||0);total+=(config?.bonus2||0)}
    const finalDone=Object.fromEntries(Object.entries(allSel).filter(([,v])=>v))
    s.dailyHistory={...(s.dailyHistory||{}),[yKey]:{done:finalDone,bonus1:nb1,bonus2:nb2}}
    s.yesterdayDone=finalDone; s.yesterdayKey=yKey
    onSave(s)
  }

  const allTasks=[...(config?.tasks1||[]),...(config?.tasks2||[])]

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div className="card card-lg" style={{maxWidth:440,width:'100%',maxHeight:'85vh',overflowY:'auto'}}>
        <h3 style={{marginBottom:8}}>← Puncte pentru ieri</h3>
        <p style={{fontSize:'0.875rem',marginBottom:12,color:'var(--gray-600)'}}>{fmtYesterday()}</p>
        {!unlocked?(
          <>
            <input className={`input ${pwdErr?'error':''}`} type="password" value={pwd}
              onChange={e=>{setPwd(e.target.value);setPwdErr(false)}} placeholder="Parolă..." autoFocus
              onKeyDown={e=>e.key==='Enter'&&unlock()} />
            {pwdErr&&<p style={{fontSize:'0.8125rem',color:'#E24B4A',marginTop:4}}>Parolă incorectă.</p>}
            <p style={{fontSize:'0.75rem',color:'var(--gray-400)',marginTop:6}}>Parola implicită: <code>reseteaza</code></p>
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Anulează</button>
              <button className="btn btn-primary btn-sm" onClick={unlock}>Continuă →</button>
            </div>
          </>
        ):(
          <>
            <p style={{fontSize:'0.8125rem',marginBottom:10,color:'var(--amber-600)',background:'var(--amber-50)',padding:'8px 12px',borderRadius:'var(--radius-sm)'}}>
              🔒 Bifele de ieri sunt needitabile. Poți adăuga task-urile lipsă.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:12}}>
              {allTasks.map(t=>{
                const isLocked=!!locked[t.id], isNew=!!newDone[t.id], isDone=isLocked||isNew
                return (
                  <button key={t.id} onClick={()=>toggle(t.id)} style={{
                    display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:'var(--radius-md)',
                    background:isDone?'var(--green-50)':'var(--white)',border:`1px solid ${isDone?'var(--green-600)':'var(--gray-200)'}`,
                    cursor:isLocked?'default':'pointer',textAlign:'left',width:'100%',
                  }}>
                    <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${isDone?'var(--green-600)':'var(--gray-200)'}`,background:isDone?'var(--green-600)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:10,flexShrink:0}}>
                      {isLocked?'🔒':isDone?'✓':''}
                    </div>
                    <span style={{flex:1,fontSize:'0.875rem',color:isDone?'var(--green-800)':'var(--gray-700)',fontWeight:isDone?600:400}}>{t.name}</span>
                    <span style={{fontSize:'0.8125rem',fontWeight:700,color:isDone?'var(--green-600)':'var(--gray-400)'}}>+{t.pts}⭐</span>
                  </button>
                )
              })}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Închide</button>
              <button className="btn btn-primary btn-sm" onClick={save}>✓ Salvează</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
