module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const {
    visitedAt = "Just now",
    referrer = "Direct / Unknown",
    userAgent = "Unknown",
  } = req.body || {};

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
      <div style="background:#1e2d4a;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:22px;">👀 New Visitor on Your Site</h1>
        <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:14px;">
          Advance Pristine Painting &nbsp;·&nbsp; ${visitedAt}
        </p>
      </div>
      <div style="background:#fff;padding:28px 32px;border:1px solid #ddd8ce;border-top:none;">
        <p style="font-size:15px;margin:0 0 20px;color:#444;">
          Someone just spent <strong>5+ seconds</strong> on your estimate page — they're likely a real potential customer.
        </p>
        <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#d94f1e;margin:0 0 14px;">Visit Details</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#666;font-size:13px;width:150px;">Time</td>
            <td style="padding:8px 0;font-weight:600;">${visitedAt}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;font-size:13px;">Came from</td>
            <td style="padding:8px 0;font-weight:600;">${referrer}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;font-size:13px;">Device</td>
            <td style="padding:8px 0;font-weight:600;font-size:12px;color:#555;">${userAgent}</td>
          </tr>
        </table>
      </div>
      <div style="background:#f8f6f2;padding:14px 32px;border-radius:0 0 12px 12px;border:1px solid #ddd8ce;border-top:none;text-align:center;">
        <p style="margin:0;font-size:12px;color:#999;">Visitor ping from advancepristinepainting.com · They haven't submitted the form yet</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Advance Pristine Painting <onboarding@resend.dev>",
        to: ["pristinepaintingokc@gmail.com"],
        subject: `👀 New Visitor – ${visitedAt}`,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      return res.status(500).json({ error: "Failed to send email", detail: data });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
};
