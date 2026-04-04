const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ── REPLACE THIS ─────────────────────────────────
const TO_EMAIL = 'HANIYA_FAHIM@HOTMAIL.COM';
const FROM_EMAIL = 'Advance Pristine Painting <onboarding@resend.dev>';
// ─────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS headers so Firebase-hosted site can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, phone, email, address, service, message, contactTime, timeline, sentAt } = req.body;

  if (!name || !phone || !address || !service || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #1e2d4a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">🎨 New Estimate Request</h1>
        <p style="color: rgba(255,255,255,0.6); margin: 6px 0 0; font-size: 14px;">Advance Pristine Painting · ${sentAt}</p>
      </div>
      <div style="background: #fff; padding: 28px 32px; border: 1px solid #ddd8ce; border-top: none;">
        <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #d94f1e; margin: 0 0 16px;">Contact Information</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr><td style="padding: 8px 0; color: #666; font-size: 13px; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${name}</td></tr>
          <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Phone</td><td style="padding: 8px 0; font-weight: 600;"><a href="tel:${phone}" style="color: #d94f1e;">${phone}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Email</td><td style="padding: 8px 0; font-weight: 600;">${email !== 'Not provided' ? `<a href="mailto:${email}" style="color: #d94f1e;">${email}</a>` : 'Not provided'}</td></tr>
        </table>
        <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #d94f1e; margin: 0 0 16px;">Project Details</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr><td style="padding: 8px 0; color: #666; font-size: 13px; width: 140px;">Address</td><td style="padding: 8px 0; font-weight: 600;">${address}</td></tr>
          <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Service</td><td style="padding: 8px 0; font-weight: 600;">${service}</td></tr>
        </table>
        <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #d94f1e; margin: 0 0 10px;">Notes</h2>
        <p style="background: #f8f6f2; border-left: 3px solid #d94f1e; padding: 14px 16px; border-radius: 4px; margin: 0 0 24px; font-size: 14px; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
        <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #d94f1e; margin: 0 0 16px;">Preferences</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666; font-size: 13px; width: 140px;">Best time to call</td><td style="padding: 8px 0; font-weight: 600;">${contactTime}</td></tr>
          <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Start timeline</td><td style="padding: 8px 0; font-weight: 600;">${timeline}</td></tr>
        </table>
      </div>
      <div style="background: #f8f6f2; padding: 16px 32px; border-radius: 0 0 12px 12px; border: 1px solid #ddd8ce; border-top: none; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #999;">Sent via the estimate form on advancepristinepainting.com</p>
      </div>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      subject: `🎨 New Estimate Request – ${name} (${service})`,
      html,
      ...(email !== 'Not provided' && { replyTo: email }),
    });

    if (error) return res.status(500).json({ error: 'Failed to send email' });
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}