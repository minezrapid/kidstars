export default function handler(req, res) {
  const hasKey = !!(process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY)
  res.status(200).json({
    ok: true,
    hasResendKey: hasKey,
    keyName: process.env.RESEND_API_KEY ? 'RESEND_API_KEY' : process.env.VITE_RESEND_API_KEY ? 'VITE_RESEND_API_KEY (found, works)' : 'none',
    timestamp: new Date().toISOString()
  })
}
