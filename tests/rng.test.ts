// HILO-09 reference vectors: the published card streams and payout examples (E01), the skip boundary of the card map,
// and one captured round recomputed from its revealed seed. node --test tests/rng.test.ts (Node 22, nothing to install).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hmacBlock, streamCards, cardFromU, REJECT_AT } from '../src/rng.ts';
import { multiplier8, nOf, wins } from '../src/rules.ts';
import { SPEC_STREAMS, SPEC_PAYOUTS, BUTTONS } from '../src/spec.ts';
import { load, PRIMARY_FILE } from '../src/loader.ts';
import { view, isView } from '../src/rounds.ts';

test('E01 card streams: block 0 and the first 8 cards of the 4 published examples', () => {
  for (const v of SPEC_STREAMS) {
    assert.equal(hmacBlock(v.serverSeed, v.clientSeed, v.nonce, 0).toString('hex'), v.block0);
    assert.deepEqual(streamCards(v.serverSeed, v.clientSeed, v.nonce, 8).cards, [...v.cards]);
  }
});

test('E01 payout examples: multiplier8 of each published n-sequence', () => {
  for (const p of SPEC_PAYOUTS) assert.equal(multiplier8(p.ns), BigInt(Math.round(Number(p.multiplier) * 1e8)));
});

test('E01 buttons: n and first-guess multiplier of all 26 (rank, side) cells; n = the winning ranks among 13', () => {
  BUTTONS.forEach((b, r) => {
    assert.equal(nOf(r, 'hi'), b.hiN); assert.equal(nOf(r, 'lo'), b.loN);
    assert.equal(multiplier8([b.hiN]), BigInt(Math.round(Number(b.hiFirst) * 1e8)));
    assert.equal(multiplier8([b.loN]), BigInt(Math.round(Number(b.loFirst) * 1e8)));
    for (const s of ['hi', 'lo'] as const) assert.equal([...Array(13).keys()].filter((t) => wins(r, s, t)).length, nOf(r, s));
  });
});

test('the skip boundary of the card map: 2^32 − 2^32 mod 52 = 4294967248', () => {
  assert.equal(REJECT_AT, 2 ** 32 - (2 ** 32 % 52));
  assert.equal(cardFromU(REJECT_AT - 1), (REJECT_AT - 1) % 52);
  assert.equal(cardFromU(REJECT_AT), null);
  assert.equal(cardFromU(2 ** 32 - 1), null);
  assert.equal(cardFromU(0), 0);
});

test('a captured round recomputes: Phase A round 0 (its turned card from the revealed seed)', () => {
  const ds = load(PRIMARY_FILE); const v = view(ds.rounds[0]); assert.ok(isView(v));
  const s = ds.seeds.find((x) => x.hashedServerSeed === v.final.fairness.hashedServerSeed)!;
  assert.deepEqual(streamCards(s.revealedServerSeed, s.clientSeed, v.final.fairness.nonce, v.turned.length).cards, v.turned);
});
