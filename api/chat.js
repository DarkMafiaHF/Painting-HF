// api/chat.js — Advance Pristine Painting Chatbot API
// Uses Upstash Redis for persistent storage of leads + Q&A
//
// ENV VARS NEEDED:
//   GEMINI_API_KEY       — from aistudio.google.com
//   ADMIN_KEY            — password you chose for the admin panel
//   RESEND_API_KEY       — already have this
//   REDIS_URL            — auto-added by Upstash
//   KV_REST_API_TOKEN    — auto-added by Upstash

const BASE_SYSTEM = `You are a friendly assistant for Advance Pristine Painting, a professional painting company in Oklahoma City.
Your job is to answer questions from potential customers and help them understand our services.

About us:
- Business: Advance Pristine Painting
- Phone: 405-900-1000
- Email: Pristinepaintingokc@gmail.com
- Tagline: "Pristine Painting With Pristine Results!"
- We offer free estimates with no obligation

Services we offer:
- Interior Painting
- Exterior Painting
- Interior & Exterior combined
- Commercial Painting
- Cabinet Painting / Refinishing
- Deck / Fence Staining

Guidelines:
- Be warm, friendly, and concise. Keep replies to 2-4 sentences max.
- Always mention the free estimate offer when relevant.
- If someone asks to book, schedule, or get a quote, encourage them to fill out the estimate form on the page or call 405-900-1000.
- If you don't know something specific, say you'll have someone from the team follow up.
- After answering 1-2 questions, naturally offer to collect their name and email so the team can follow up.
- Never make up specific prices. Always recommend a free estimate for accurate pricing.`;

// ── Upstash Redis helpers ─────────────────────────────────────────────────
async function kvGet(key) {
  const res = await fetch(`${process.env.REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value) {
  await fetch(`${process.env.REDIS_URL}/set/${key}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value: JSON.stringify(value) }),
  });
}

// ── Build system prompt with custom Q&A ───────────────────────────────────
async function buildSystemPrompt() {
  try {
    const qa = await kvGet("qa_items");
    if (!qa || !qa.length) return BASE_SYSTEM;
    const qaBlock = qa
      .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
      .join("\n\n");
    return `${BASE_SYSTEM}\n\nCustom Q&A from the business owner:\n${qaBlock}`;
  } catch {
    return BASE_SYSTEM;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action;
  const isAdmin = req.headers["x-admin-key"] === process.env.ADMIN_KEY;

  // ── GET leads ────────────────────────────────────────────────────────────
  if (req.method === "GET" && action === "leads") {
    if (!isAdmin) return res.status(401).json({ error: "Unauthorized" });
    const leads = (await kvGet("leads")) || [];
    return res.status(200).json({ leads: leads.slice().reverse() });
  }

  // ── GET Q&A ──────────────────────────────────────────────────────────────
  if (req.method === "GET" && action === "qa") {
    if (!isAdmin) return res.status(401).json({ error: "Unauthorized" });
    const qa = (await kvGet("qa_items")) || [];
    return res.status(200).json({ qa });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Save Q&A ──────────────────────────────────────────────────────────────
  if (action === "save-qa") {
    if (!isAdmin) return res.status(401).json({ error: "Unauthorized" });
    const { qa } = req.body || {};
    if (!Array.isArray(qa)) return res.status(400).json({ error: "qa array required" });
    await kvSet("qa_items", qa);
    return res.status(200).json({ success: true });
  }

  // ── Mark lead as replied ──────────────────────────────────────────────────
  if (action === "mark-replied") {
    if (!isAdmin) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.body || {};
    const leads = (await kvGet("leads")) || [];
    const updated = leads.map((l) => (l.id === id ? { ...l, status: "replied" } : l));
    await kvSet("leads", updated);
    return res.status(200).json({ success: true });
  }

  // ── Save lead ─────────────────────────────────────────────────────────────
  if (action === "save-lead") {
    const { name, email, summary, messages } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: "Name and email required" });

    const lead = {
      id: Date.now().toString(),
      name,
      email,
      summary: summary || "Chat inquiry",
      messages: messages || [],
      createdAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
      status: "new",
    };

    const leads = (await kvGet("leads")) || [];
    leads.push(lead);
    await kvSet("leads", leads);

    try {
      const msgHtml = (messages || [])
        .map((m) => `<tr>
          <td style="padding:6px 0;color:${m.role === "user" ? "#1e2d4a" : "#666"};font-size:13px;vertical-align:top;width:60px;">
            ${m.role === "user" ? "Visitor" : "Bot"}
          </td>
          <td style="padding:6px 0;font-size:13px;">${m.content}</td>
        </tr>`)
        .join("");

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Advance Pristine Painting <onboarding@resend.dev>",
          to: ["pristinepaintingokc@gmail.com"],
          reply_to: email,
          subject: `New Chat Lead - ${name}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#1e2d4a;padding:24px 32px;border-radius:12px 12px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:20px;">New Chat Lead</h1>
              <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:13px;">Advance Pristine Painting - ${lead.createdAt}</p>
            </div>
            <div style="background:#fff;padding:28px 32px;border:1px solid #ddd8ce;border-top:none;">
              <p style="margin:0 0 4px;"><strong>${name}</strong></p>
              <p style="margin:0 0 20px;"><a href="mailto:${email}" style="color:#d94f1e;">${email}</a></p>
              <table style="width:100%;border-collapse:collapse;">${msgHtml}</table>
            </div>
          </div>`,
        }),
      });
    } catch (e) {
      console.error("Email error:", e);
    }

    return res.status(200).json({ success: true, id: lead.id });
  }

  // ── AI chat (Gemini Flash) ────────────────────────────────────────────────
  if (action === "message") {
    const { messages } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    try {
      const systemPrompt = await buildSystemPrompt();

      const history = messages.slice(-10).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const validHistory = [];
      let lastRole = null;
      for (const msg of history) {
        if (msg.role !== lastRole) {
          validHistory.push(msg);
          lastRole = msg.role;
        }
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: validHistory,
            generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        console.error("Gemini error:", data);
        return res.status(500).json({ error: "AI error" });
      }

      const reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't process that. Please call us at 405-900-1000!";

      return res.status(200).json({ reply });
    } catch (err) {
      console.error("Chat error:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  }

  return res.status(400).json({ error: "Unknown action" });
};