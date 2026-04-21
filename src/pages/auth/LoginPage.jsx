import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/Toast'
import { StarLogo } from '../../components/StarLogo'
import { Spinner } from '../../components/Spinner'

export function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const profile = await login(email, password)
      if (profile.role === 'admin') {
        navigate(profile.setupComplete ? '/admin' : '/admin/setup')
      } else if (profile.role === 'child') {
        navigate('/child')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.code === 'auth/invalid-credential'
        ? 'Email sau parolă incorecte.'
        : 'A apărut o eroare. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-center" style={{ background: 'linear-gradient(135deg, var(--purple-50) 0%, var(--gray-50) 60%)' }}>
      <div className="max-w-sm fade-in">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <StarLogo size={64} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginTop: '0.75rem', color: 'var(--purple-800)' }}>
            KidStars
          </h1>
          <p style={{ marginTop: 4 }}>Bine ai revenit! Conectează-te la contul tău.</p>
        </div>

        <div className="card card-lg">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                className={`input ${error ? 'error' : ''}`}
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="parinte@email.com" required autoFocus
              />
            </div>
            <div className="input-group">
              <label className="input-label">Parolă</label>
              <input
                className={`input ${error ? 'error' : ''}`}
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
              />
            </div>

            {error && <p style={{ fontSize: '0.875rem', color: '#E24B4A', textAlign: 'center' }}>{error}</p>}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <Spinner size={18} color="white" /> : 'Conectează-te'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--purple-600)', textDecoration: 'none' }}>
              Ai uitat parola?
            </Link>
          </div>
        </div>

        <div className="divider" style={{ margin: '1.25rem 0' }}>sau</div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '0.75rem' }}>Nu ai cont de administrator?</p>
          <Link to="/register" className="btn btn-secondary btn-full">
            Creează cont admin gratuit
          </Link>
        </div>
      </div>
    </div>
  )
}
