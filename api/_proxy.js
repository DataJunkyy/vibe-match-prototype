// Shared helper for the music-service proxies. The browser calls these
// same-origin endpoints, so no cross-origin or ad-blocker issues, and the
// free services are only ever asked for the few parameters we allow.

export async function proxyJson(res, url) {
  try {
    const upstream = await fetch(url, { headers: { accept: 'application/json' } });
    const body = await upstream.text();
    res.setHeader('content-type', 'application/json; charset=utf-8');
    // Song search results barely change; let Vercel's edge cache them for a day.
    res.setHeader('cache-control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(upstream.ok ? 200 : 502).send(upstream.ok ? body : JSON.stringify({ error: 'upstream', status: upstream.status }));
  } catch (err) {
    res.status(502).json({ error: 'unreachable' });
  }
}

export function pick(query, allowed) {
  const out = new URLSearchParams();
  for (const [key, max] of Object.entries(allowed)) {
    const v = query[key];
    if (typeof v === 'string' && v.length && v.length <= max) out.set(key, v);
  }
  return out;
}
