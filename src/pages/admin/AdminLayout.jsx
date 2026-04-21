import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { StarLogo } from '../../components/StarLogo'

const NAV = [
  { to: '/admin',          icon: '🏠', label: 'Acasă',      exact: true },
  { to: '/admin/children', icon: '👦', label: 'Copii' },
  { to: '/admin/invites',  icon: '✉️',  label: 'Invitații' },
  { to: '/admin/settings', icon: '⚙️',  label: 'Setări' },
]

export function AdminLayout({ children }) {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* Sidebar desktop */}
      <aside style={{
        width: 220, background: 'var(--white)', borderRight: '1px solid var(--gray-200)',
        display: 'flex', flexDirection: 'column', padding: '1.25rem 0',
        position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
      }} className="sidebar-desktop">
        <div style={{ padding: '0 1.25rem 1.25rem', borderBottom: '1px solid var(--gray-100)', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StarLogo size={36} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--purple-800)' }}>KidStars</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Admin</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', fontSize: '0.9375rem', fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--purple-800)' : 'var(--gray-600)',
                background: isActive ? 'var(--purple-50)' : 'transparent',
                fontFamily: 'var(--font-display)',
                transition: 'all 0.15s',
              })}>
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--gray-100)', marginTop: '0.75rem' }}>
          <div style={{ padding: '8px 12px', marginBottom: 4 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--gray-900)', fontFamily: 'var(--font-display)' }}>{profile?.displayName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 1 }}>{profile?.email}</div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm btn-full" style={{ justifyContent: 'flex-start', gap: 8 }}>
            🚪 Deconectează-te
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, padding: '2rem', maxWidth: 900 }}>
        {children}
      </main>

      <style>{`
        @media (max-width: 680px) {
          .sidebar-desktop { display: none !important; }
        }
      `}</style>
    </div>
  )
}
