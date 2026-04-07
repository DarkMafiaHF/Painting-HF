export default function handler(req, res) {
  const { password } = req.body;

  if (password === process.env.ADMIN_PASSWORD) {
    return res.json({
      success: true,
      token: process.env.ADMIN_SECRET
    });
  }

  res.json({ success: false });
}