import { pick, proxyJson } from './_proxy.js';

// GET /api/itunes?term=...&limit=... → Apple's free iTunes Search API (songs only).
export default async function handler(req, res) {
  const params = pick(req.query, { term: 200, limit: 2 });
  if (!params.get('term')) return res.status(400).json({ error: 'term is required' });
  params.set('media', 'music');
  params.set('entity', 'song');
  return proxyJson(res, `https://itunes.apple.com/search?${params}`);
}
