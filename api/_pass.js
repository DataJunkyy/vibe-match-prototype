// Creator Pro pass: a small signed token the browser keeps after paying, so
// the paid endpoints can check it without a database. It names the Stripe
// subscription and expires after a week; the browser then trades it for a
// fresh one, which re-checks with Stripe that the subscription is still on.
import { createHmac, timingSafeEqual } from 'node:crypto';

const WEEK = 7 * 24 * 3600 * 1000;
const b64 = (s) => Buffer.from(s).toString('base64url');
const sign = (body, secret) => createHmac('sha256', `vibesong-pass:${secret}`).update(body).digest('base64url');

export function makePass(sub, secret, now = Date.now()) {
  const body = b64(JSON.stringify({ sub, exp: now + WEEK }));
  return `${body}.${sign(body, secret)}`;
}

// Returns { sub, exp, expired } for a genuine pass, or null.
export function readPass(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 500 || !secret) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const want = Buffer.from(sign(body, secret));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof sub !== 'string' || typeof exp !== 'number') return null;
    return { sub, exp, expired: now > exp };
  } catch {
    return null;
  }
}

export async function stripeGet(path, key) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { authorization: `Bearer ${key}` } });
  return res.ok ? res.json() : null;
}

export const subscriptionActive = (s) => Boolean(s && ['active', 'trialing'].includes(s.status));
