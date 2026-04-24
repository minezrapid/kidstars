export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    hasResendKey: !!process.env.RESEND_API_KEY,
    timestamp: new Date().toISOString()
  })
}
