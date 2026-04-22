export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, childName, link } = req.body
  if (!to || !childName || !link) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Resend API key not configured' })
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
        to,
        subject: `${childName} a fost invitat(ă) pe KidStars! ⭐`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <h1 style="color:#534AB7;font-size:28px;margin-bottom:8px;">KidStars ⭐</h1>
            <h2 style="color:#1A1A18;font-size:20px;">Bun venit, ${childName}!</h2>
            <p style="color:#5F5E5A;line-height:1.6;margin:16px 0;">
              Ai fost invitat(ă) să te alături KidStars — aplicația unde poți câștiga stele
              pentru sarcini zilnice și le poți transforma în recompense!
            </p>
            <a href="${link}" style="display:inline-block;margin:24px 0;background:#534AB7;color:white;
              text-decoration:none;padding:14px 28px;border-radius:50px;font-weight:700;font-size:16px;">
              Creează-mi contul →
            </a>
            <p style="color:#9B9992;font-size:13px;">Link-ul expiră în 7 zile.</p>
          </div>
        `,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Resend error' })
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
