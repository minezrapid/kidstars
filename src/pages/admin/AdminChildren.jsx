import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getChildren, getChildState, getChildConfig, saveChildState, saveChildConfig, resetChildState, getChildDoc } from '../../lib/firestore'
import { AdminLayout } from './AdminLayout'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'

function getTodayKey(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
function getYesterdayKey(){const d=new Date(Date.now()-86400000);return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
function getMonthKey(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()}`}
function getWeekKey(){const d=new Date();const j=new Date(d.getFullYear(),0,1);const w=Math.ceil(((d-j)/86400000+j.getDay()+1)/7);return `${d.getFullYear()}-W${w}`}
function formatDate(d){return d.toLocaleDateString('ro-RO',{weekday:'long',day:'numeric',month:'long'})}

const RESET_PASSWORD = 'reseteaza'

export function AdminChildren() {
  const { user } = useAuth()
  const toast = useToast()
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedChild, setSelectedChild] = useState(null) // childId

  useEffect(() => { loadChildren() }, [user.uid])

  async function loadChildren() {
    const kids = await getChildren(user.uid)
    setChildren(kids)
    setLoading(false)
  }

  if (loading) return <AdminLayout><div style={{display:'flex',justifyContent:'center',paddingTop:'4rem'}}><Spinner size={36}/></div></AdminLayout>

  if (selectedChild) return (
    <AdminLayout>
      <ChildAdminView adminId={user.uid} childId={selectedChild} onBack={()=>setSelectedChild(null)} />
    </AdminLayout>
  )

  return (
    <AdminLayout>
      <div className="fade-in">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'2rem'}}>
          <div>
            <h1 style={{fontSize:'1.75rem',color:'var(--purple-800)'}}>Copii</h1>
            <p style={{marginTop:4}}>Selectează un copil pentru a vedea tabloul lui complet.</p>
          </div>
          <Link to="/admin/invites" className="btn btn-primary">+ Invită copil</Link>
        </div>

        {children.length===0 ? (
          <div className="card" style={{textAlign:'center',padding:'3rem 1rem',color:'var(--gray-400)'}}>
            <div style={{fontSize:48,marginBottom:'1rem'}}>👶</div>
            <p style={{marginBottom:'1.25rem'}}>Niciun copil înregistrat.</p>
            <Link to="/admin/invites" className="btn btn-primary">Invită primul copil</Link>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
            {children.map(kid=>(
              <button key={kid.id} onClick={()=>setSelectedChild(kid.id)} style={{
                background:'var(--white)',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius-lg)',
                padding:'1.5rem 1rem',textAlign:'center',cursor:'pointer',transition:'all .15s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--purple-400)';e.currentTarget.style.background='var(--purple-50)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--gray-200)';e.currentTarget.style.background='var(--white)'}}>
                <div style={{fontSize:48,marginBottom:8}}>{kid.gender==='girl'?'👧':'👦'}</div>
                <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:'1.125rem',color:'var(--purple-800)'}}>{kid.childName}</div>
                <div style={{fontSize:'0.8125rem',color:'var(--gray-400)',marginTop:3}}>{kid.ageGroup} ani</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// ── Full child admin view (like Eve's app but for admin) ──────────

function ChildAdminView({ adminId, childId, onBack }) {
  const toast = useToast()
  const [config, setConfig] = useState(null)
  const [state, setState] = useState(null)
  const [childDoc, setChildDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState(0)
  const [showYesterdayModal, setShowYesterdayModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [pwdInput, setPwdInput] = useState('')
  const [pwdError, setPwdError] = useState(false)

  useEffect(()=>{ loadData() },[childId])

  async function loadData() {
    const [cfg, st, cd] = await Promise.all([getChildConfig(adminId, childId), getChildState(adminId, childId), getChildDoc(childId)])
    setConfig(cfg)
    setChildDoc(cd)
    let s = st || initState()
    if (s.todayKey !== getTodayKey()) s={...s,done:{},bonus1Given:false,bonus2Given:false,penaltiesApplied:[],spentToday:0,dailyCounts:{},todayKey:getTodayKey()}
    if (s.weekKey !== getWeekKey()) s={...s,weeklyCounts:{},weekKey:getWeekKey()}
    if (s.monthKey !== getMonthKey()) s={...s,earnedMonth:0,spentMonth:0,spentLv1:0,spentTotal:0,monthKey:getMonthKey()}
    setState(s)
    setLoading(false)
  }

  function initState(){
    return {stars:0,done:{},history:[],bonus1Given:false,bonus2Given:false,penaltiesApplied:[],extraPoints:[],
      earnedMonth:0,spentMonth:0,spentToday:0,spentTotal:0,spentLv1:0,
      todayKey:getTodayKey(),monthKey:getMonthKey(),weekKey:getWeekKey(),dailyCounts:{},weeklyCounts:{},
      yesterdayDone:{},yesterdayKey:'',dailyHistory:{}}
  }

  function addHist(s, desc, pts) {
    const now=new Date()
    const time=now.toLocaleDateString('ro-RO',{day:'numeric',month:'short'})+', '+now.toLocaleTimeString('ro-RO',{hour:'2-digit',minute:'2-digit'})
    return {...s,history:[...(s.history||[]),{desc,pts,time}].slice(-200)}
  }

  async function persist(ns){
    setState(ns); setSaving(true)
    try { await saveChildState(adminId, childId, ns) }
    catch { toast('Eroare la salvare.','error') }
    finally { setSaving(false) }
  }

  function checkBonus(s) {
    const tasks1=config.tasks1||[]; const tasks2=config.tasks2||[]
    const b1=config.bonus1||0; const b2=config.bonus2||0
    const all1=tasks1.every(t=>s.done[t.id]); const all2=tasks2.every(t=>s.done[t.id])
    if(all1&&!s.bonus1Given){s={...s,bonus1Given:true,stars:s.stars+b1,earnedMonth:s.earnedMonth+b1};s=addHist(s,'Bonus Rutină completă!',b1)}
    else if(!all1&&s.bonus1Given){s={...s,bonus1Given:false,stars:Math.max(0,s.stars-b1),earnedMonth:Math.max(0,s.earnedMonth-b1)};s=addHist(s,'Bonus Rutină anulat',-b1)}
    if(all2&&!s.bonus2Given){s={...s,bonus2Given:true,stars:s.stars+b2,earnedMonth:s.earnedMonth+b2};s=addHist(s,'Bonus Comportament!',b2)}
    else if(!all2&&s.bonus2Given){s={...s,bonus2Given:false,stars:Math.max(0,s.stars-b2),earnedMonth:Math.max(0,s.earnedMonth-b2)};s=addHist(s,'Bonus Comportament anulat',-b2)}
    return s
  }

  function toggleTask(taskId) {
    const allTasks=[...(config.tasks1||[]),...(config.tasks2||[])]
    const task=allTasks.find(t=>t.id===taskId); if(!task) return
    let s={...state,done:{...state.done}}
    if(s.done[taskId]){
      s.done[taskId]=false; s.stars=Math.max(0,s.stars-task.pts); s.earnedMonth=Math.max(0,s.earnedMonth-task.pts)
      s=addHist(s,'Anulat: '+task.name,-task.pts); s=checkBonus(s); toast('-'+task.pts+' stele')
    } else {
      s.done[taskId]=true; s.stars+=task.pts; s.earnedMonth+=task.pts
      s=addHist(s,task.name,task.pts); s=checkBonus(s); toast('+'+task.pts+' stele! ⭐','success')
    }
    persist(s)
  }

  function applyPenalty(penalty) {
    let s={...state}
    s.stars=Math.max(0,s.stars-penalty.pts); s.earnedMonth=Math.max(0,s.earnedMonth-penalty.pts)
    s.penaltiesApplied=[...(s.penaltiesApplied||[]),{id:penalty.id,name:penalty.name,pts:penalty.pts,time:Date.now()}]
    s=addHist(s,'⚠️ Penalizare: '+penalty.name,-penalty.pts)
    persist(s); toast('-'+penalty.pts+' stele (penalizare)','error')
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
    if(pwdInput!==RESET_PASSWORD){setPwdError(true);return}
    setShowResetModal(false); setPwdInput(''); setPwdError(false)
    const ns=initState()
    setState(ns); saveChildState(adminId,childId,ns).then(()=>toast('Date resetate!','success'))
  }

  async function deleteHistory() {
    if(!confirm('Stergi tot istoricul? Stelele rămân.')) return
    let s={...state, history:[]}
    s=addHist(s,'Istoric șters de admin',0)
    persist(s); toast('Istoric șters.')
  }

  if(loading||!config||!state) return <div style={{display:'flex',justifyContent:'center',paddingTop:'3rem'}}><Spinner size={32}/></div>

  const gender=childDoc?.gender||'girl'
  const childName=childDoc?.childName||'Copil'
  const avatar=gender==='girl'?'👧':'👦'
  const starValue=config.starValue||0.10
  const tasks1=config.tasks1||[]; const tasks2=config.tasks2||[]; const penalties=config.penalties||[]; const rewards=config.rewards||[]
  const done1=tasks1.filter(t=>state.done[t.id]).length; const done2=tasks2.filter(t=>state.done[t.id]).length

  const TABS=['📋 Sarcini','⚠️ Penalizări','🎁 Recompense','📈 Istoric']

  return (
    <div className="fade-in">
      {/* Back + header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:'1.5rem'}}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Toți copiii</button>
        <div style={{display:'flex',alignItems:'center',gap:12,flex:1}}>
          <div style={{fontSize:36}}>{avatar}</div>
          <div>
            <h1 style={{fontSize:'1.5rem',color:'var(--purple-800)'}}>{childName}</h1>
            <p style={{marginTop:2}}>{childDoc?.ageGroup} ani</p>
          </div>
          <div style={{marginLeft:'auto',textAlign:'right'}}>
            <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:'2rem',color:'var(--purple-600)',lineHeight:1}}>{state.stars} ⭐</div>
            <div style={{fontSize:'0.8125rem',color:'var(--gray-400)'}}>= {(state.stars*starValue).toFixed(2)} RON</div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:'flex',gap:6,marginBottom:'1.25rem',flexWrap:'wrap'}}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{
            padding:'7px 14px',borderRadius:'var(--radius-full)',cursor:'pointer',
            border:`1.5px solid ${tab===i?'var(--purple-600)':'var(--gray-200)'}`,
            background:tab===i?'var(--purple-600)':'var(--white)',
            color:tab===i?'white':'var(--gray-600)',
            fontFamily:'var(--font-display)',fontWeight:600,fontSize:'0.875rem',
          }}>{t}</button>
        ))}
      </div>

      {/* ── SARCINI (admin can toggle) ── */}
      {tab===0 && (
        <div>
          {/* Rutina */}
          <TaskGroup label="Rutină zilnică" color="var(--green-600)" emoji="🌅"
            tasks={tasks1} done={state.done} count={done1}
            bonus={config.bonus1} bonusGiven={state.bonus1Given}
            onToggle={toggleTask} isAdmin />
          <div style={{marginTop:12}}>
            <TaskGroup label="Comportament" color="var(--purple-600)" emoji="✨"
              tasks={tasks2} done={state.done} count={done2}
              bonus={config.bonus2} bonusGiven={state.bonus2Given}
              onToggle={toggleTask} isAdmin />
          </div>

          {/* Yesterday + Reset */}
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowYesterdayModal(true)}>← Puncte pentru ieri</button>
            <button className="btn btn-danger btn-sm" onClick={()=>setShowResetModal(true)}>⚠️ Resetare zi</button>
            {saving && <Spinner size={16}/>}
          </div>

          {/* Yesterday modal */}
          {showYesterdayModal && (
            <YesterdayModal config={config} state={state} onSave={ns=>{persist(ns);setShowYesterdayModal(false)}} onClose={()=>setShowYesterdayModal(false)} />
          )}

          {/* Reset modal */}
          {showResetModal && (
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
              <div className="card card-lg" style={{maxWidth:360,width:'100%'}}>
                <h3 style={{marginBottom:8}}>⚠️ Resetare date</h3>
                <p style={{marginBottom:12,fontSize:'0.875rem'}}>Introdu parola pentru a reseta ziua curentă a lui {childName}.</p>
                <input className={`input ${pwdError?'error':''}`} type="password" value={pwdInput} onChange={e=>{setPwdInput(e.target.value);setPwdError(false)}} placeholder="Parolă..." onKeyDown={e=>e.key==='Enter'&&tryReset()} autoFocus />
                {pwdError && <p style={{fontSize:'0.8125rem',color:'#E24B4A',marginTop:4}}>Parolă incorectă.</p>}
                <div style={{display:'flex',gap:8,marginTop:12}}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>{setShowResetModal(false);setPwdInput('');setPwdError(false)}}>Anulează</button>
                  <button className="btn btn-danger btn-sm" onClick={tryReset}>↺ Resetează ziua</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PENALIZĂRI ── */}
      {tab===1 && (
        <div>
          <p style={{marginBottom:'1rem',fontSize:'0.875rem',color:'var(--gray-600)'}}>Apasă pe o penalizare pentru a o aplica.</p>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {penalties.map(p=>{
              const count=(state.penaltiesApplied||[]).filter(x=>x.id===p.id).length
              return (
                <div key={p.id} style={{background:count?'#FBEAF0':'var(--white)',border:`1px solid ${count?'#EBA8C0':'var(--gray-200)'}`,borderRadius:'var(--radius-md)',padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'var(--font-display)',fontWeight:600,color:count?'#72243E':'var(--gray-900)'}}>{p.name}</div>
                    {count>0 && <div style={{fontSize:'0.8125rem',color:'#A32D2D',marginTop:2}}>Aplicat × {count}</div>}
                  </div>
                  <span style={{fontWeight:700,color:'#A32D2D',flexShrink:0}}>-{p.pts}⭐</span>
                  <button className="btn btn-danger btn-sm" onClick={()=>applyPenalty(p)}>Aplică</button>
                </div>
              )
            })}
          </div>
          {(state.penaltiesApplied||[]).length>0 && (
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

      {/* ── RECOMPENSE ── */}
      {tab===2 && (
        <div>
          {rewards.map(r=>{
            const dailyUsed=state.dailyCounts?.[r.id]||0; const weeklyUsed=state.weeklyCounts?.[r.id]||0
            const blocked=(r.dailyLimit&&dailyUsed>=r.dailyLimit)||(r.weeklyLimit&&weeklyUsed>=r.weeklyLimit)
            return (
              <div key={r.id} style={{background:'var(--white)',border:'1px solid var(--gray-200)',borderRadius:'var(--radius-md)',padding:'10px 14px',display:'flex',alignItems:'center',gap:10,marginBottom:8,opacity:blocked?0.55:1}}>
                <span style={{fontSize:22,flexShrink:0}}>{r.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'var(--font-display)',fontWeight:600}}>{r.name}</div>
                  <div style={{fontSize:'0.8125rem',color:'var(--gray-400)'}}>
                    {r.pts}⭐{r.dailyLimit?` · ${dailyUsed}/${r.dailyLimit}/zi`:''}
                  </div>
                </div>
                <span style={{fontSize:'0.8125rem',color:blocked?'#A32D2D':state.stars>=r.pts?'var(--green-600)':'var(--gray-400)',fontWeight:600}}>
                  {blocked?'Limitat':state.stars>=r.pts?'✓ Disponibil':'Insuficient'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── ISTORIC ── */}
      {tab===3 && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:'1.25rem'}}>
            {[{l:'Câștigate luna',v:state.earnedMonth+' ⭐',c:'var(--green-600)'},{l:'Folosite luna',v:state.spentMonth+' ⭐',c:'#A32D2D'},{l:'Total stele',v:state.stars+' ⭐',c:'var(--purple-600)'}].map(s=>(
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
    </div>
  )
}

function TaskGroup({ label, color, emoji, tasks, done, count, bonus, bonusGiven, onToggle, isAdmin }) {
  return (
    <div style={{background:'var(--white)',border:'1px solid var(--gray-200)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
      <div style={{padding:'10px 14px',borderBottom:'1px solid var(--gray-100)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontFamily:'var(--font-display)',fontWeight:700,color,fontSize:'0.9375rem'}}>{emoji} {label}</span>
        <span style={{fontSize:'0.8125rem',color:'var(--gray-400)'}}>{count}/{tasks.length}</span>
      </div>
      {tasks.map((t,i)=>{
        const isDone=!!done[t.id]
        return (
          <button key={t.id} onClick={()=>isAdmin&&onToggle(t.id)} style={{
            display:'flex',alignItems:'center',gap:12,padding:'11px 14px',width:'100%',textAlign:'left',
            background:isDone?(color==='var(--green-600)'?'var(--green-50)':'var(--purple-50)'):'transparent',
            border:'none',borderBottom:i<tasks.length-1?'1px solid var(--gray-100)':'none',
            cursor:isAdmin?'pointer':'default',transition:'background .15s',
          }}>
            <div style={{width:22,height:22,borderRadius:'50%',flexShrink:0,border:`2px solid ${isDone?color:'var(--gray-200)'}`,background:isDone?color:'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:12,transition:'all .15s'}}>
              {isDone&&'✓'}
            </div>
            <span style={{flex:1,fontSize:'0.9rem',fontWeight:isDone?600:400,color:isDone?color:'var(--gray-900)'}}>{t.name}</span>
            <span style={{fontSize:'0.8125rem',fontWeight:700,color:isDone?color:'var(--gray-400)',flexShrink:0}}>+{t.pts}⭐</span>
          </button>
        )
      })}
      {bonus>0&&(
        <div style={{padding:'9px 14px',background:bonusGiven?(color==='var(--green-600)'?'var(--green-50)':'var(--purple-50)'):'var(--gray-50)',borderTop:'1px solid var(--gray-100)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:'0.8125rem',fontWeight:700,color:bonusGiven?color:'var(--gray-400)',fontFamily:'var(--font-display)'}}>🏆 Bonus {bonusGiven?'— obținut!':'complet'}</span>
          <span style={{fontWeight:700,fontSize:'0.875rem',color:bonusGiven?color:'var(--gray-300)'}}>+{bonus}⭐</span>
        </div>
      )}
    </div>
  )
}

function YesterdayModal({ config, state, onSave, onClose }) {
  const [lockedDone, setLockedDone] = useState({})
  const [newDone, setNewDone] = useState({})
  const [pwdOk, setPwdOk] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwdErr, setPwdErr] = useState(false)

  function unlock() {
    if(pwd!==RESET_PASSWORD){setPwdErr(true);return}
    // Load yesterday saved state
    const yKey=getYesterdayKey()
    const saved=(state.dailyHistory&&state.dailyHistory[yKey])?state.dailyHistory[yKey]:null
    setLockedDone(saved?(Object.fromEntries(Object.entries(saved.done||{}).filter(([,v])=>v))):{})
    setNewDone({})
    setPwdOk(true)
  }

  function toggle(id) {
    if(lockedDone[id]) return
    setNewDone(prev=>({...prev,[id]:!prev[id]}))
  }

  function save() {
    const yKey=getYesterdayKey()
    const yDate=formatDate(new Date(Date.now()-86400000))
    const allTasks=[...(config.tasks1||[]),...(config.tasks2||[])]
    const prevSaved=(state.dailyHistory&&state.dailyHistory[yKey])?state.dailyHistory[yKey]:null
    const prevDone=prevSaved?(prevSaved.done||{}):{};const prevB1=!!(prevSaved?.bonus1);const prevB2=!!(prevSaved?.bonus2)
    let s={...state}; let total=0
    allTasks.forEach(t=>{
      if(newDone[t.id]&&!prevDone[t.id]&&!lockedDone[t.id]){s.stars+=t.pts;s.earnedMonth+=t.pts;total+=t.pts;s=Object.assign({},s);s.history=[...(s.history||[]),{desc:`[Ieri — ${yDate}] ${t.name}`,pts:t.pts,time:new Date().toLocaleDateString('ro-RO',{day:'numeric',month:'short'})}].slice(-200)}
    })
    const allSel={...lockedDone,...newDone}
    const nb1=(config.tasks1||[]).every(t=>allSel[t.id]);const nb2=(config.tasks2||[]).every(t=>allSel[t.id])
    if(nb1&&!prevB1){s.stars+=(config.bonus1||0);s.earnedMonth+=(config.bonus1||0);total+=(config.bonus1||0)}
    if(nb2&&!prevB2){s.stars+=(config.bonus2||0);s.earnedMonth+=(config.bonus2||0);total+=(config.bonus2||0)}
    const finalDone=Object.fromEntries(Object.entries(allSel).filter(([,v])=>v))
    s.dailyHistory={...(s.dailyHistory||{}),[yKey]:{done:finalDone,bonus1:nb1,bonus2:nb2}}
    s.yesterdayDone=finalDone; s.yesterdayKey=yKey
    onSave(s)
  }

  const allTasks=[...(config.tasks1||[]),...(config.tasks2||[])]

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div className="card card-lg" style={{maxWidth:420,width:'100%',maxHeight:'85vh',overflowY:'auto'}}>
        <h3 style={{marginBottom:8}}>← Puncte pentru ieri</h3>
        {!pwdOk ? (
          <>
            <p style={{fontSize:'0.875rem',marginBottom:12,color:'var(--gray-600)'}}>Introdu parola pentru a accesa sarcinile de ieri.</p>
            <input className={`input ${pwdErr?'error':''}`} type="password" value={pwd} onChange={e=>{setPwd(e.target.value);setPwdErr(false)}} placeholder="Parolă..." onKeyDown={e=>e.key==='Enter'&&unlock()} autoFocus />
            {pwdErr&&<p style={{fontSize:'0.8125rem',color:'#E24B4A',marginTop:4}}>Parolă incorectă.</p>}
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Anulează</button>
              <button className="btn btn-primary btn-sm" onClick={unlock}>Continuă →</button>
            </div>
          </>
        ) : (
          <>
            <p style={{fontSize:'0.8125rem',marginBottom:12,color:'var(--gray-600)'}}>
              🔒 = bifat ieri (needitabil). Poți bifa ce a mai lipsit.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:12}}>
              {allTasks.map(t=>{
                const isLocked=!!lockedDone[t.id]; const isNew=!!newDone[t.id]; const isDone=isLocked||isNew
                return (
                  <button key={t.id} onClick={()=>toggle(t.id)} style={{
                    display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:'var(--radius-md)',
                    background:isDone?'var(--green-50)':'var(--white)',border:`1px solid ${isDone?'var(--green-600)':'var(--gray-200)'}`,
                    cursor:isLocked?'default':'pointer',textAlign:'left',width:'100%',
                  }}>
                    <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${isDone?'var(--green-600)':'var(--gray-200)'}`,background:isDone?'var(--green-600)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:10,flexShrink:0}}>
                      {isDone&&(isLocked?'🔒':'✓')}
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
