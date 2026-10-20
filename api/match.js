import { readPass } from './_pass.js';
import { buildPrompt, parseReply } from './_ai.js';

// POST /api/match { scene, seconds, pass } → Claude's song picks for a video scene.
// Creator Pro only. Off until ANTHROPIC_API_KEY is set in Vercel.
const MODEL = 'claude-haiku-5-5';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI matching is not switched on' });

  const { scene, seconds, pass } = req.body || {};
  const p = readPass(pass, process.env.STRIPE_SECRET_KEY);
  if (!p) return res.status(402).json({ error: 'Creator Pro needed' });
  if (p.expired) return res.status(401).json({ error: 'pass expired' });
  if (typeof scene !== 'string' || !scene.trim() || scene.length > 500) return res.status(400).json({ error: 'describe the scene in up to 500 characters' });
  const len = Math.max(1, Math.min(Number(seconds) || 30, 3600));

  const { system, user } = buildPrompt(scene.trim(), len);
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 900, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!upstream.ok) return res.status(502).json({ error: 'ai', status: upstream.status });
    const data = await upstream.json();
    const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    const result = parseReply(text);
    return result ? res.json(result) : res.status(502).json({ error: 'ai reply unreadable' });
  } catch {
    return res.status(502).json({ error: 'ai unreachable' });
  }
}
