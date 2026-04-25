export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodă nepermisă' })

  const { to, childName, loginUrl } = req.body || {}
  if (!to || !childName || !loginUrl) {
    return res.status(400).json({ error: 'Lipsesc câmpuri: to, childName, loginUrl' })
  }

  const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY
  if (!apiKey) {
    return res.status(200).json({ ok: true, warning: 'no-key' })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [to],
        subject: `${childName} — Link de conectare KidStars ⭐`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fafafa;">
            <div style="background:#534AB7;color:white;padding:20px 24px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:24px;">⭐ KidStars</h1>
            </div>
            <div style="background:white;padding:24px;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none;">
              <h2 style="color:#1A1A18;margin-top:0;">Salut, ${childName}! 👋</h2>
              <p style="color:#5F5E5A;line-height:1.6;">
                Iată link-ul de conectare la contul tău <strong>KidStars</strong>.
                Folosește emailul și parola cu care te-ai înregistrat.
              </p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${loginUrl}" style="background:#534AB7;color:white;text-decoration:none;
                  padding:14px 32px;border-radius:50px;font-weight:700;font-size:16px;display:inline-block;">
                  Conectează-te →
                </a>
              </div>
              <p style="color:#9B9992;font-size:13px;text-align:center;">
                Dacă ai uitat parola, poți reseta de pe pagina de login.
              </p>
            </div>
          </div>
        `,
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return res.status(200).json({ ok: true, warning: data.message || 'send-failed' })
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(200).json({ ok: true, warning: err.message })
  }
}
