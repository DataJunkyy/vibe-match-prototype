import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePass, readPass, subscriptionActive } from '../api/_pass.js';
import { parseReply, buildPrompt } from '../api/_ai.js';

test('a pass round-trips and expires after a week', () => {
  const t = makePass('sub_123', 'sk_test', 0);
  assert.deepEqual(readPass(t, 'sk_test', 1000), { sub: 'sub_123', exp: 604800000, expired: false });
  assert.equal(readPass(t, 'sk_test', 604800001).expired, true);
});

test('a forged or tampered pass is refused', () => {
  const t = makePass('sub_123', 'sk_test', 0);
  assert.equal(readPass(t, 'other_key'), null);
  const [, mac] = t.split('.');
  const body = Buffer.from(JSON.stringify({ sub: 'sub_999', exp: 9e15 })).toString('base64url');
  assert.equal(readPass(`${body}.${mac}`, 'sk_test'), null);
  assert.equal(readPass('junk', 'sk_test'), null);
  assert.equal(readPass(t, undefined), null);
});

test('only active or trialing subscriptions count', () => {
  assert.equal(subscriptionActive({ status: 'active' }), true);
  assert.equal(subscriptionActive({ status: 'trialing' }), true);
  assert.equal(subscriptionActive({ status: 'canceled' }), false);
  assert.equal(subscriptionActive(null), false);
});

test('AI reply is parsed and cleaned', () => {
  const r = parseReply('Sure! {"mood":"calm","summary":"Slow and golden.","songs":[{"title":"Sunset Lover","artist":"Petit Biscuit","why":"Dreamy and warm.","caption":"dreamy, warm synths"},{"title":"","artist":"x"}]}');
  assert.deepEqual(r, { mood: 'calm', summary: 'Slow and golden.', songs: [{ title: 'Sunset Lover', artist: 'Petit Biscuit', why: 'Dreamy and warm.', caption: '[dreamy, warm synths]' }] });
});

test('unreadable or odd AI replies are handled', () => {
  assert.equal(parseReply('no json here'), null);
  assert.equal(parseReply('{"songs":[]}'), null);
  assert.equal(parseReply('{"mood":"spooky","songs":[{"title":"a","artist":"b"}]}').mood, 'calm');
});

test('prompt carries the scene and length', () => {
  assert.match(buildPrompt('beach drone', 15).user, /beach drone[\s\S]*15 seconds/);
});
