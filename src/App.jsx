import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { Spinner } from './components/Spinner'
import { ToastProvider } from './components/Toast'

// Auth pages
import { LoginPage }          from './pages/auth/LoginPage'
import { RegisterAdminPage }  from './pages/auth/RegisterAdminPage'
import { RegisterChildPage }  from './pages/auth/RegisterChildPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'

// Admin pages
import { AdminSetupPage }     from './pages/admin/AdminSetupPage'
import { AdminDashboard }     from './pages/admin/AdminDashboard'
import { AdminSettings }      from './pages/admin/AdminSettings'
import { AdminChildren }      from './pages/admin/AdminChildren'
import { AdminInvites }       from './pages/admin/AdminInvites'

// Child pages
import { ChildDashboard }     from './pages/child/ChildDashboard'

// Guest pages
import { GuestView }          from './pages/guest/GuestView'

function RequireAuth({ children, role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user || !profile) return <Navigate to="/login" replace />
  if (role && profile.role !== role) return <Navigate to={defaultRoute(profile.role)} replace />
  return children
}

function RequireSetup({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (profile?.role === 'admin' && !profile?.setupComplete) {
    return <Navigate to="/admin/setup" replace />
  }
  return children
}

function defaultRoute(role) {
  if (role === 'admin') return '/admin'
  if (role === 'child') return '/child'
  return '/guest'
}

function FullPageSpinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={32} />
    </div>
  )
}

function RootRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user || !profile) return <Navigate to="/login" replace />
  if (profile.role === 'admin' && !profile.setupComplete) return <Navigate to="/admin/setup" replace />
  return <Navigate to={defaultRoute(profile.role)} replace />
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Root */}
        <Route path="/" element={<RootRedirect />} />

        {/* Auth */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterAdminPage />} />
        <Route path="/register/child"  element={<RegisterChildPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Guest view — public, no auth needed */}
        <Route path="/view/:token" element={<GuestView />} />

        {/* Admin */}
        <Route path="/admin/setup" element={
          <RequireAuth role="admin"><AdminSetupPage /></RequireAuth>
        }/>
        <Route path="/admin" element={
          <RequireAuth role="admin"><RequireSetup><AdminDashboard /></RequireSetup></RequireAuth>
        }/>
        <Route path="/admin/settings" element={
          <RequireAuth role="admin"><RequireSetup><AdminSettings /></RequireSetup></RequireAuth>
        }/>
        <Route path="/admin/children" element={
          <RequireAuth role="admin"><RequireSetup><AdminChildren /></RequireSetup></RequireAuth>
        }/>
        <Route path="/admin/invites" element={
          <RequireAuth role="admin"><RequireSetup><AdminInvites /></RequireSetup></RequireAuth>
        }/>

        {/* Child */}
        <Route path="/child" element={
          <RequireAuth role="child"><ChildDashboard /></RequireAuth>
        }/>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  )
}
