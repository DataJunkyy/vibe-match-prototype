import { makePass, readPass, stripeGet, subscriptionActive } from './_pass.js';

// GET /api/creator                     → which paid features are switched on
// GET /api/creator?session_id=cs_...   → after Stripe checkout: a Creator Pro pass
// GET /api/creator?pass=...            → trade an old pass for a fresh one
export default async function handler(req, res) {
  const key = process.env.STRIPE_SECRET_KEY;
  const link = process.env.STRIPE_PAYMENT_LINK;
  res.setHeader('cache-control', 'no-store');
  const { session_id: sessionId, pass } = req.query;

  if (!sessionId && !pass) {
    return res.json({ ai: Boolean(process.env.ANTHROPIC_API_KEY), checkout: key && link ? link : null });
  }
  if (!key) return res.status(503).json({ error: 'payments are not switched on' });

  let subId = null;
  if (typeof sessionId === 'string' && /^cs_[\w]{1,200}$/.test(sessionId)) {
    const session = await stripeGet(`checkout/sessions/${sessionId}`, key);
    if (session && session.status === 'complete') subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  } else if (pass) {
    subId = readPass(pass, key)?.sub || null;
  }
  if (!subId || !/^sub_[\w]{1,200}$/.test(subId)) return res.status(402).json({ error: 'no active subscription' });

  const sub = await stripeGet(`subscriptions/${subId}`, key);
  if (!subscriptionActive(sub)) return res.status(402).json({ error: 'no active subscription' });
  return res.json({ pass: makePass(subId, key) });
}
