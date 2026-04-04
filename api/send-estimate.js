import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const TO_EMAIL   = 'HANIYA_FAHIM@HOTMAIL.COM';
const FROM_EMAIL = 'Advance Pristine Painting <onboarding@resend.dev>';

export default async function handler(req, res) {
  // CORS — allows your Firebase site to call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const {
    name, phone, email = 'Not provided',
    address, service, message,
    contactTime = 'Not specified',
    timeline    = 'Not specified',
    sentAt,
  } = req.body ?? {};

  // Server-side validation
  if (!name || !phone || !address || !service || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">

      <div style="background:#1e2d4a;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:22px;">🎨 New Estimate Request</h1>
        <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:14px;">
          Advance Pristine Painting &nbsp;·&nbsp; ${sentAt ?? 'Just now'}
        </p>
      </div>

      <div style="background:#fff;padding:28px 32px;border:1px solid #ddd8ce;border-top:none;">

        <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#d94f1e;margin:0 0 14px;">
          Contact Information
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr>
            <td style="padding:8px 0;color:#666;font-size:13px;width:150px;">Name</td>
            <td style="padding:8px 0;font-weight:600;">${name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;font-size:13px;">Phone</td>
            <td style="padding:8px 0;font-weight:600;">
              <a href="tel:${phone}" style="color:#d94f1e;text-decoration:none;">${phone}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;font-size:13px;">Email</td>
            <td style="padding:8px 0;font-weight:600;">
              ${email !== 'Not provided'
                ? `<a href="mailto:${email}" style="color:#d94f1e;text-decoration:none;">${email}</a>`
                : '<span style="color:#999;">Not provided</span>'}
            </td>
          </tr>
        </table>

        <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#d94f1e;margin:0 0 14px;">
          Project Details
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr>
            <td style="padding:8px 0;color:#666;font-size:13px;width:150px;">Address</td>
            <td style="padding:8px 0;font-weight:600;">${address}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;font-size:13px;">Service</td>
            <td style="padding:8px 0;font-weight:600;">${service}</td>
          </tr>
        </table>

        <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#d94f1e;margin:0 0 10px;">
          Notes
        </h2>
        <p style="background:#f8f6f2;border-left:3px solid #d94f1e;padding:14px 16px;border-radius:4px;margin:0 0 24px;font-size:14px;line-height:1.7;">
          ${message.replace(/\n/g, '<br>')}
        </p>

        <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#d94f1e;margin:0 0 14px;">
          Preferences
        </h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#666;font-size:13px;width:150px;">Best time to call</td>
            <td style="padding:8px 0;font-weight:600;">${contactTime}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;font-size:13px;">Start timeline</td>
            <td style="padding:8px 0;font-weight:600;">${timeline}</td>
          </tr>
        </table>

      </div>

      <div style="background:#f8f6f2;padding:14px 32px;border-radius:0 0 12px 12px;border:1px solid #ddd8ce;border-top:none;text-align:center;">
        <p style="margin:0;font-size:12px;color:#999;">
          Submitted via the estimate form on advancepristinepainting.com
        </p>
      </div>

    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      TO_EMAIL,
      subject: `🎨 New Estimate Request – ${name} (${service})`,
      html,
      ...(email !== 'Not provided' && { replyTo: email }),
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email', detail: error });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
