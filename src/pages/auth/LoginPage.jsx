import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { StarLogo } from '../../components/StarLogo'
import { Spinner } from '../../components/Spinner'

export function LoginPage() {
  const { login, registerAdmin } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')

  // Login state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Register state
  const [regForm, setRegForm] = useState({ displayName: '', email: '', password: '', confirm: '' })
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const profile = await login(loginForm.email, loginForm.password)
      if (profile.role === 'admin') navigate(profile.setupComplete ? '/admin' : '/admin/setup')
      else if (profile.role === 'child') navigate('/child')
      else navigate('/')
    } catch (err) {
      setLoginError(err.code === 'auth/invalid-credential' ? 'Email sau parolă incorecte.' : 'A apărut o eroare.')
    } finally { setLoginLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setRegError('')
    if (regForm.password !== regForm.confirm) { setRegError('Parolele nu coincid.'); return }
    if (regForm.password.length < 6) { setRegError('Parola trebuie să aibă minim 6 caractere.'); return }
    setRegLoading(true)
    try {
      await registerAdmin(regForm.email, regForm.password, regForm.displayName)
      navigate('/admin/setup')
    } catch (err) {
      setRegError(err.code === 'auth/email-already-in-use' ? 'Acest email este deja înregistrat.' : 'A apărut o eroare.')
    } finally { setRegLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', background: 'linear-gradient(135deg, var(--purple-50) 0%, var(--gray-50) 60%)'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }} className="fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <StarLogo size={64} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginTop: '0.75rem', color: 'var(--purple-800)' }}>KidStars</h1>
          <p style={{ marginTop: 4, color: 'var(--gray-600)' }}>Recompense pentru copii grozavi ⭐</p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', background: 'var(--white)', borderRadius: 'var(--radius-full)',
          border: '1px solid var(--gray-200)', padding: 4, marginBottom: '1.25rem',
        }}>
          {[['login','Conectare'],['register','Înregistrare']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '9px', borderRadius: 'var(--radius-full)',
              border: 'none', cursor: 'pointer', transition: 'all .2s',
              background: tab === key ? 'var(--purple-600)' : 'transparent',
              color: tab === key ? 'white' : 'var(--gray-600)',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9375rem',
            }}>{label}</button>
          ))}
        </div>

        <div className="card card-lg">
          {/* LOGIN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input className={`input ${loginError ? 'error' : ''}`} type="email" autoFocus
                  value={loginForm.email} onChange={e => setLoginForm(f => ({...f, email: e.target.value}))}
                  placeholder="parinte@email.com" required />
              </div>
              <div className="input-group">
                <label className="input-label">Parolă</label>
                <input className={`input ${loginError ? 'error' : ''}`} type="password"
                  value={loginForm.password} onChange={e => setLoginForm(f => ({...f, password: e.target.value}))}
                  placeholder="••••••••" required />
              </div>
              {loginError && <p style={{ fontSize: '0.875rem', color: '#E24B4A', textAlign: 'center' }}>{loginError}</p>}
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loginLoading}>
                {loginLoading ? <Spinner size={18} color="white" /> : 'Conectează-te'}
              </button>
              <div style={{ textAlign: 'center' }}>
                <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--purple-600)', textDecoration: 'none' }}>
                  Ai uitat parola?
                </Link>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ background: 'var(--purple-50)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--purple-800)', lineHeight: 1.5 }}>
                Creezi un cont de <strong>administrator</strong> (părinte). Vei putea invita copiii după.
              </div>
              <div className="input-group">
                <label className="input-label">Numele tău</label>
                <input className="input" type="text" autoFocus
                  value={regForm.displayName} onChange={e => setRegForm(f => ({...f, displayName: e.target.value}))}
                  placeholder="Ex: Mama / Tata" required />
              </div>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input className="input" type="email"
                  value={regForm.email} onChange={e => setRegForm(f => ({...f, email: e.target.value}))}
                  placeholder="parinte@email.com" required />
              </div>
              <div className="input-group">
                <label className="input-label">Parolă</label>
                <input className="input" type="password"
                  value={regForm.password} onChange={e => setRegForm(f => ({...f, password: e.target.value}))}
                  placeholder="Minim 6 caractere" required />
              </div>
              <div className="input-group">
                <label className="input-label">Confirmă parola</label>
                <input className={`input ${regError.includes('Parole') ? 'error' : ''}`} type="password"
                  value={regForm.confirm} onChange={e => setRegForm(f => ({...f, confirm: e.target.value}))}
                  placeholder="Repetă parola" required />
              </div>
              {regError && <p style={{ fontSize: '0.875rem', color: '#E24B4A', textAlign: 'center' }}>{regError}</p>}
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={regLoading}>
                {regLoading ? <Spinner size={18} color="white" /> : 'Creează cont și continuă →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
