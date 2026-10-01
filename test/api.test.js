import { test } from 'node:test';
import assert from 'node:assert/strict';
import itunes from '../api/itunes.js';
import audius from '../api/audius.js';

function fakeRes() {
  return {
    statusCode: 200, headers: {}, body: undefined,
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    send(b) { this.body = b; return this; },
    json(o) { this.body = JSON.stringify(o); return this; },
  };
}

function withFetch(impl, fn) {
  const real = globalThis.fetch;
  globalThis.fetch = impl;
  return fn().finally(() => { globalThis.fetch = real; });
}

test('itunes proxy forwards only allowed params and adds song filters', () => withFetch(async (url) => {
  const u = new URL(url);
  assert.equal(u.origin + u.pathname, 'https://itunes.apple.com/search');
  assert.equal(u.searchParams.get('term'), 'happy reggae');
  assert.equal(u.searchParams.get('entity'), 'song');
  assert.equal(u.searchParams.get('evil'), null);
  return new Response(JSON.stringify({ results: [{ trackName: 'x' }] }), { status: 200 });
}, async () => {
  const res = fakeRes();
  await itunes({ query: { term: 'happy reggae', limit: '10', evil: '1' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body).results, [{ trackName: 'x' }]);
  assert.match(res.headers['cache-control'], /s-maxage/);
}));

test('itunes proxy rejects a missing term', async () => {
  const res = fakeRes();
  await itunes({ query: {} }, res);
  assert.equal(res.statusCode, 400);
});

test('upstream failure becomes 502', () => withFetch(async () => { throw new Error('down'); }, async () => {
  const res = fakeRes();
  await audius({ query: { query: 'calm' } }, res);
  assert.equal(res.statusCode, 502);
}));
