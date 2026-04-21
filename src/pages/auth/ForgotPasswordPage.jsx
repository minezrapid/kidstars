import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { StarLogo } from '../../components/StarLogo'
import { Spinner } from '../../components/Spinner'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch {
      setError('Nu am găsit un cont cu acest email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-center" style={{ background: 'linear-gradient(135deg, var(--purple-50) 0%, var(--gray-50) 60%)' }}>
      <div className="max-w-sm fade-in">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <StarLogo size={56} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginTop: '0.75rem', color: 'var(--purple-800)' }}>
            Resetează parola
          </h1>
        </div>
        <div className="card card-lg">
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: '1rem' }}>📧</div>
              <h3 style={{ marginBottom: 8 }}>Email trimis!</h3>
              <p>Verifică inbox-ul pentru linkul de resetare.</p>
              <Link to="/login" className="btn btn-primary btn-full" style={{ marginTop: '1.25rem' }}>
                Înapoi la login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Email-ul contului tău</label>
                <input className="input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="parinte@email.com"
                  required autoFocus />
              </div>
              {error && <p style={{ fontSize: '0.875rem', color: '#E24B4A', textAlign: 'center' }}>{error}</p>}
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? <Spinner size={18} color="white" /> : 'Trimite link de resetare'}
              </button>
              <Link to="/login" style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--purple-600)', textDecoration: 'none' }}>
                ← Înapoi la login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
