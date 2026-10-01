import { pick, proxyJson } from './_proxy.js';

// GET /api/audius?query=... → Audius free track search.
export default async function handler(req, res) {
  const params = pick(req.query, { query: 200 });
  if (!params.get('query')) return res.status(400).json({ error: 'query is required' });
  params.set('app_name', 'VibeMatchPrototype');
  return proxyJson(res, `https://api.audius.co/v1/tracks/search?${params}`);
}
