export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { to, childName, link } = req.body || {}
  if (!to || !childName || !link) {
    return res.status(400).json({ error: 'Lipsesc câmpuri: to, childName, link' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Return success anyway - admin can copy link manually
    console.warn('RESEND_API_KEY not set - email not sent')
    return res.status(200).json({ ok: true, warning: 'Email not sent: RESEND_API_KEY missing' })
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
        subject: `${childName} a fost invitat(ă) pe KidStars! ⭐`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fafafa;">
            <div style="background:#534AB7;color:white;padding:20px 24px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:24px;">⭐ KidStars</h1>
            </div>
            <div style="background:white;padding:24px;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none;">
              <h2 style="color:#1A1A18;margin-top:0;">Bun venit, ${childName}! 👋</h2>
              <p style="color:#5F5E5A;line-height:1.6;">
                Ai fost invitat(ă) să te alături <strong>KidStars</strong> — aplicația unde poți câștiga
                stele pentru sarcini zilnice și le poți transforma în recompense!
              </p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${link}" style="background:#534AB7;color:white;text-decoration:none;
                  padding:14px 32px;border-radius:50px;font-weight:700;font-size:16px;display:inline-block;">
                  Creează-mi contul →
                </a>
              </div>
              <p style="color:#9B9992;font-size:13px;text-align:center;">
                Link-ul expiră în 7 zile. Dacă nu ai cerut această invitație, ignoră acest email.
              </p>
            </div>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error('Resend error:', err)
      return res.status(200).json({ ok: true, warning: 'Email failed: ' + (err.message || response.status) })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Send invite error:', err)
    // Don't fail the whole invite flow if email fails
    return res.status(200).json({ ok: true, warning: err.message })
  }
}
