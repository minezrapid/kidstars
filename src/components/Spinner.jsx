export function Spinner({ size = 22, color = 'var(--purple-600)' }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size, height: size,
      borderRadius: '50%',
      border: `${size > 24 ? 3 : 2.5}px solid var(--purple-50)`,
      borderTopColor: color,
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}
