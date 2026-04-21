import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { StarLogo } from '../../components/StarLogo'
import { Spinner } from '../../components/Spinner'

export function RegisterAdminPage() {
  const { registerAdmin } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Parolele nu coincid.'); return }
    if (form.password.length < 6) { setError('Parola trebuie să aibă minim 6 caractere.'); return }
    setLoading(true)
    try {
      await registerAdmin(form.email, form.password, form.displayName)
      navigate('/admin/setup')
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('Acest email este deja înregistrat.')
      else setError('A apărut o eroare. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-center" style={{ background: 'linear-gradient(135deg, var(--purple-50) 0%, var(--gray-50) 60%)', padding: '2rem 1.5rem' }}>
      <div className="max-w-sm fade-in">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <StarLogo size={56} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginTop: '0.75rem', color: 'var(--purple-800)' }}>
            Cont administrator
          </h1>
          <p style={{ marginTop: 4 }}>Configurezi aplicația pentru copilul tău.</p>
        </div>

        <div className="card card-lg">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Numele tău</label>
              <input className="input" type="text" value={form.displayName}
                onChange={set('displayName')} placeholder="Ex: Mama / Tata" required autoFocus />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" type="email" value={form.email}
                onChange={set('email')} placeholder="parinte@email.com" required />
            </div>
            <div className="input-group">
              <label className="input-label">Parolă</label>
              <input className="input" type="password" value={form.password}
                onChange={set('password')} placeholder="Minim 6 caractere" required />
            </div>
            <div className="input-group">
              <label className="input-label">Confirmă parola</label>
              <input className={`input ${error.includes('Parolele') ? 'error' : ''}`}
                type="password" value={form.confirm}
                onChange={set('confirm')} placeholder="Repetă parola" required />
            </div>

            {error && <p style={{ fontSize: '0.875rem', color: '#E24B4A', textAlign: 'center' }}>{error}</p>}

            <div style={{
              background: 'var(--purple-50)', borderRadius: 'var(--radius-sm)',
              padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--purple-800)', lineHeight: 1.6
            }}>
              <strong>Contul admin</strong> îți permite să configurezi sarcinile,
              recompensele și să inviți copiii să se alăture.
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <Spinner size={18} color="white" /> : 'Creează cont și continuă →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
          Ai deja cont? <Link to="/login" style={{ color: 'var(--purple-600)', fontWeight: 700, textDecoration: 'none' }}>Conectează-te</Link>
        </p>
      </div>
    </div>
  )
}
