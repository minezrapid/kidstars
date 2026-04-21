import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg, type = 'default', duration = 2800) => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'error' ? '#A32D2D' : t.type === 'success' ? '#27500A' : '#1A1A18',
            color: 'white',
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem',
            padding: '10px 20px', borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-md)', whiteSpace: 'nowrap',
            animation: 'toastIn 0.25s ease',
          }}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
