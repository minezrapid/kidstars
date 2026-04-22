import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getChildConfig, getChildState, saveChildState, getChildDoc } from '../../lib/firestore'
import { StarLogo } from '../../components/StarLogo'
import { Spinner } from '../../components/Spinner'
import { useToast } from '../../components/Toast'

function getTodayKey(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
function getMonthKey(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()}`}
function getWeekKey(){const d=new Date();const j=new Date(d.getFullYear(),0,1);const w=Math.ceil(((d-j)/86400000+j.getDay()+1)/7);return `${d.getFullYear()}-W${w}`}

const TABS = ['📋 Sarcini', '🎁 Recompense', '📈 Istoric']

export function ChildDashboard() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [config, setConfig] = useState(null)
  const [state, setState] = useState(null)
  const [childDoc, setChildDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)

  const adminId = profile?.adminId

  // Find the childId by looking at children collection via adminId+userId
  // The child's Firestore ID is stored in profile.childId (set at registration)
  const childId = profile?.childId

  const load = useCallback(async () => {
    if (!adminId || !childId) return
    const [cfg, st, cd] = await Promise.all([
      getChildConfig(adminId, childId),
      getChildState(adminId, childId),
      getChildDoc(childId),
    ])
    setConfig(cfg)
    setChildDoc(cd)
    let s = st || initState()
    s = resetIfNeeded(s)
    setState(s)
    setLoading(false)
  }, [adminId, childId])

  useEffect(() => { if (adminId && childId) load() }, [load])

  function initState() {
    return { stars:0, done:{}, history:[], bonus1Given:false, bonus2Given:false,
      penaltiesApplied:[], extraPoints:[], earnedMonth:0, spentMonth:0,
      spentToday:0, spentTotal:0, spentLv1:0,
      todayKey:getTodayKey(), monthKey:getMonthKey(), weekKey:getWeekKey(),
      dailyCounts:{}, weeklyCounts:{} }
  }
  function resetIfNeeded(s) {
    if (s.todayKey !== getTodayKey()) s = {...s, done:{}, bonus1Given:false, bonus2Given:false, penaltiesApplied:[], spentToday:0, dailyCounts:{}, todayKey:getTodayKey()}
    if (s.weekKey !== getWeekKey()) s = {...s, weeklyCounts:{}, weekKey:getWeekKey()}
    if (s.monthKey !== getMonthKey()) s = {...s, earnedMonth:0, spentMonth:0, spentLv1:0, spentTotal:0, monthKey:getMonthKey()}
    return s
  }
  function addHist(s, desc, pts) {
    const now = new Date()
    const time = now.toLocaleDateString('ro-RO',{day:'numeric',month:'short'})+', '+now.toLocaleTimeString('ro-RO',{hour:'2-digit',minute:'2-digit'})
    return {...s, history: [...(s.history||[]), {desc,pts,time}].slice(-150)}
  }
  async function persist(ns) {
    setState(ns); setSaving(true)
    try { await saveChildState(adminId, childId, ns) }
    catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  // CHILD CAN ONLY REDEEM REWARDS - tasks are view only
  function redeemReward(reward) {
    if (state.stars < reward.pts) { toast('Nu ai destule stele! ⭐', 'error'); return }
    const dailyUsed = state.dailyCounts?.[reward.id]||0
    const weeklyUsed = state.weeklyCounts?.[reward.id]||0
    if (reward.dailyLimit && dailyUsed >= reward.dailyLimit) { toast('Limita zilnică atinsă!', 'error'); return }
    if (reward.weeklyLimit && weeklyUsed >= reward.weeklyLimit) { toast('Limita săptămânală atinsă!', 'error'); return }
    let s = {...state,
      stars: state.stars - reward.pts,
      spentMonth: state.spentMonth + reward.pts,
      spentTotal: state.spentTotal + reward.pts,
      spentToday: state.spentToday + reward.pts,
      dailyCounts: {...state.dailyCounts, [reward.id]: dailyUsed+1},
      weeklyCounts: {...state.weeklyCounts, [reward.id]: weeklyUsed+1},
    }
    s = addHist(s, 'Răscumpărat: '+reward.name, -reward.pts)
    persist(s)
    toast(`Felicitări! Ai obținut: ${reward.name} 🎉`, 'success')
  }

  async function handleLogout() { await logout(); navigate('/login') }

  if (loading || !config || !state) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><Spinner size={36} /></div>

  const tasks1 = config.tasks1||[]
  const tasks2 = config.tasks2||[]
  const penalties = config.penalties||[]
  const rewards = config.rewards||[]
  const starValue = config.starValue||0.10
  const gender = childDoc?.gender || profile?.gender || 'girl'
  const childName = childDoc?.childName || profile?.childName || 'Tu'
  const avatar = gender === 'girl' ? '👧' : '👦'

  return (
    <div style={{maxWidth:480,margin:'0 auto',minHeight:'100vh',background:'var(--gray-50)',paddingBottom:80}}>
      {/* Header */}
      <div style={{background:'var(--white)',borderBottom:'1px solid var(--gray-200)',padding:'14px 16px 10px',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:42,height:42,borderRadius:'50%',background:'var(--purple-50)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{avatar}</div>
            <div>
              <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:'1rem',color:'var(--purple-800)'}}>{childName}</div>
              <div style={{fontSize:'0.75rem',color:'var(--gray-400)'}}>Contul meu</div>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:'1.75rem',color:'var(--purple-600)',lineHeight:1}}>{state.stars} ⭐</div>
            <div style={{fontSize:'0.75rem',color:'var(--gray-400)',marginTop:2}}>= {(state.stars*starValue).toFixed(2)} RON</div>
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          {TABS.map((t,i)=>(
            <button key={i} onClick={()=>setTab(i)} style={{
              flex:1,padding:'7px 4px',borderRadius:'var(--radius-full)',
              border:`1.5px solid ${tab===i?'var(--purple-600)':'var(--gray-200)'}`,
              background:tab===i?'var(--purple-600)':'transparent',
              color:tab===i?'white':'var(--gray-600)',
              fontFamily:'var(--font-display)',fontWeight:700,fontSize:'0.8125rem',cursor:'pointer',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{padding:16}}>
        {/* ── SARCINI: VIEW ONLY ── */}
        {tab===0 && (
          <div className="fade-in">
            <div style={{background:'var(--amber-50)',border:'1px solid var(--amber-400)',borderRadius:'var(--radius-md)',padding:'8px 12px',marginBottom:12,fontSize:'0.8125rem',color:'var(--amber-600)',display:'flex',alignItems:'center',gap:6}}>
              <span>👀</span> Sarcinile sunt completate de părinte/admin.
            </div>

            <ViewTaskGroup label="Rutină zilnică" color="var(--green-600)" emoji="🌅"
              tasks={tasks1} done={state.done} bonus={config.bonus1} bonusGiven={state.bonus1Given} />
            <div style={{marginTop:10}}>
              <ViewTaskGroup label="Comportament" color="var(--purple-600)" emoji="✨"
                tasks={tasks2} done={state.done} bonus={config.bonus2} bonusGiven={state.bonus2Given} />
            </div>

            {/* Penalizări view only */}
            {penalties.length > 0 && (
              <div style={{marginTop:10}}>
                <div style={{background:'var(--white)',border:'1px solid var(--gray-200)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
                  <div style={{padding:'10px 14px',borderBottom:'1px solid var(--gray-100)'}}>
                    <span style={{fontFamily:'var(--font-display)',fontWeight:700,color:'#A32D2D',fontSize:'0.9375rem'}}>⚠️ Penalizări</span>
                  </div>
                  {penalties.map((p,i)=>{
                    const applied = (state.penaltiesApplied||[]).filter(x=>x.id===p.id).length
                    return (
                      <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:applied?'#FBEAF0':'transparent',borderBottom:i<penalties.length-1?'1px solid var(--gray-100)':'none'}}>
                        <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${applied?'#A32D2D':'var(--gray-200)'}`,background:applied?'#A32D2D':'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:10,flexShrink:0}}>
                          {applied?'✗':''}
                        </div>
                        <span style={{flex:1,fontSize:'0.875rem',color:applied?'#A32D2D':'var(--gray-600)',fontWeight:applied?600:400}}>{p.name}</span>
                        <span style={{fontSize:'0.8125rem',fontWeight:700,color:applied?'#A32D2D':'var(--gray-300)',flexShrink:0}}>-{p.pts}⭐{applied>1?` (×${applied})`:''}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {saving && <div style={{textAlign:'center',marginTop:12}}><Spinner size={16}/></div>}
          </div>
        )}

        {/* ── RECOMPENSE ── */}
        {tab===1 && (
          <div className="fade-in">
            <p style={{marginBottom:'1rem',fontSize:'0.875rem'}}>
              Ai <strong style={{color:'var(--purple-600)',fontFamily:'var(--font-display)'}}>{state.stars} ⭐</strong> disponibile.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {rewards.map(r=>{
                const canAfford = state.stars >= r.pts
                const dailyUsed = state.dailyCounts?.[r.id]||0
                const weeklyUsed = state.weeklyCounts?.[r.id]||0
                const blocked = (r.dailyLimit&&dailyUsed>=r.dailyLimit)||(r.weeklyLimit&&weeklyUsed>=r.weeklyLimit)
                return (
                  <div key={r.id} style={{background:'var(--white)',border:`1px solid ${!canAfford||blocked?'var(--gray-200)':'var(--purple-100)'}`,borderRadius:'var(--radius-lg)',padding:'12px 14px',display:'flex',alignItems:'center',gap:12,opacity:blocked?0.55:1}}>
                    <span style={{fontSize:26,flexShrink:0}}>{r.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:'0.9375rem'}}>{r.name}</div>
                      <div style={{fontSize:'0.8125rem',color:'var(--gray-400)',marginTop:2}}>
                        {r.pts} ⭐{r.dailyLimit?` · ${dailyUsed}/${r.dailyLimit} azi`:''}
                        {r.weeklyLimit?` · ${weeklyUsed}/${r.weeklyLimit} săpt`:''}
                      </div>
                    </div>
                    <button onClick={()=>redeemReward(r)} disabled={!canAfford||blocked} className="btn btn-primary btn-sm"
                      style={{flexShrink:0,opacity:!canAfford||blocked?0.4:1}}>
                      {blocked?'Limitat':'Obține'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── ISTORIC ── */}
        {tab===2 && (
          <div className="fade-in">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:'1.25rem'}}>
              {[{label:'Câștigate luna aceasta',value:state.earnedMonth+' ⭐',color:'var(--green-600)'},{label:'Folosite luna aceasta',value:state.spentMonth+' ⭐',color:'#A32D2D'}].map(s=>(
                <div key={s.label} style={{background:'var(--white)',border:'1px solid var(--gray-200)',borderRadius:'var(--radius-md)',padding:'0.875rem',textAlign:'center'}}>
                  <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:'1.25rem',color:s.color}}>{s.value}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--gray-400)',marginTop:3}}>{s.label}</div>
                </div>
              ))}
            </div>
            {[...(state.history||[])].reverse().slice(0,50).map((h,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid var(--gray-100)'}}>
                <div>
                  <div style={{fontSize:'0.875rem',color:'var(--gray-900)'}}>{h.desc}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--gray-400)',marginTop:2}}>{h.time}</div>
                </div>
                <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:'0.9375rem',flexShrink:0,marginLeft:12,color:h.pts>0?'var(--green-600)':h.pts<0?'#A32D2D':'var(--gray-400)'}}>
                  {h.pts>0?'+':''}{h.pts!==0?h.pts:'↩'}
                </span>
              </div>
            ))}
            {(!state.history||state.history.length===0) && <p style={{textAlign:'center',padding:'2rem 0',color:'var(--gray-400)'}}>Nicio activitate încă.</p>}
          </div>
        )}
      </div>

      <div style={{position:'fixed',bottom:16,right:16}}>
        <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{background:'var(--white)',boxShadow:'var(--shadow-sm)'}}>
          🚪 Ieși
        </button>
      </div>
    </div>
  )
}

function ViewTaskGroup({ label, color, emoji, tasks, done, bonus, bonusGiven }) {
  const count = tasks.filter(t=>done[t.id]).length
  return (
    <div style={{background:'var(--white)',border:'1px solid var(--gray-200)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
      <div style={{padding:'10px 14px',borderBottom:'1px solid var(--gray-100)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontFamily:'var(--font-display)',fontWeight:700,color,fontSize:'0.9375rem'}}>{emoji} {label}</span>
        <span style={{fontSize:'0.8125rem',color:'var(--gray-400)'}}>{count}/{tasks.length}</span>
      </div>
      {tasks.map((t,i)=>{
        const isDone=!!done[t.id]
        return (
          <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:isDone?(color==='var(--green-600)'?'var(--green-50)':'var(--purple-50)'):'transparent',borderBottom:i<tasks.length-1?'1px solid var(--gray-100)':'none'}}>
            <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${isDone?color:'var(--gray-200)'}`,background:isDone?color:'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:10,flexShrink:0}}>
              {isDone&&'✓'}
            </div>
            <span style={{flex:1,fontSize:'0.9rem',color:isDone?color:'var(--gray-700)',fontWeight:isDone?600:400}}>{t.name}</span>
            <span style={{fontSize:'0.8125rem',fontWeight:700,color:isDone?color:'var(--gray-300)',flexShrink:0}}>+{t.pts}⭐</span>
          </div>
        )
      })}
      {bonus>0 && (
        <div style={{padding:'8px 14px',background:bonusGiven?(color==='var(--green-600)'?'var(--green-50)':'var(--purple-50)'):'var(--gray-50)',borderTop:'1px solid var(--gray-100)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:'0.8125rem',fontWeight:700,color:bonusGiven?color:'var(--gray-400)',fontFamily:'var(--font-display)'}}>🏆 Bonus {bonusGiven?'— obținut!':'complet'}</span>
          <span style={{fontWeight:700,fontSize:'0.875rem',color:bonusGiven?color:'var(--gray-300)'}}>+{bonus}⭐</span>
        </div>
      )}
    </div>
  )
}
