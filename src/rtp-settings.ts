// RTP-CLAIM wiring — HouseBets hilo: the per-setting exact RTP table and the claim it is held to.
// The rule is src/rtp-claim.ts, a byte-identical copy of the framework's core/rtp-claim.ts (conformance C-13 compares the
// SHA-256), version 1.2.0. The switch src/rtp-claim-switch.ts is ON (Methodology v1.1, 14 Oct 2026): the -19 check is
// scored; a house-side miss is OVERSTATED and the verdict RTP FIGURE OVERSTATED (exit 5), never NOT PROVABLY FAIR, and no other
// test of the -19 step can pre-empt it. The claim's source names the places it appears, from the rule's six (game
// page, fairness page, help page, bet panel, rules, game settings): the fairness answer (E01) is the game settings the site
// loads, because the hilo2 bundle requests "/<game>/fairness" and keeps the answer as its settings (E06 excerpt "fairness
// request"); the rules panel text is in the same bundle (E06 excerpt rulesHiloReturn; reworded on 16 Oct, E07 rulesHiloReturn in
// the live copy of 19 Oct). Scoped to the hilo
// bundle (the dice bundle, for one, has no "/fairness" literal).
//
// SETTINGS. A cash-out after k right guesses on cards where n_1 … n_k of the 13 ranks win (E01 "multiplier"). Its RTP
// depends on the n-sequence only — not on the start card, the side or the suit — so every (start rank, side, depth) cell
// of the profile maps onto an n-sequence: depth 1 is the 12 values of n, onto which the 26 first-guess cells (start rank ×
// side, E01 buttons hiN/loN) map, and every sequence of n in 1 … 12 up to depth 4 is enumerated (12 + 144 + 1,728 + 20,736 =
// 22,620 settings). Every row is kept in the committed table (the profile asks the table published).
// EXACT RTP. P(all k right) = Π n_i / 13^k (E01 "cards": every card drawn independently, 1 in 13 per rank) × the settled
// multiplier multiplier8(ns) = floor(99·10^8 · 13^k / (100 · Π n_i)) (HILO-13: every right guess of the capture), in
// 1e-8 units: RTP = multiplier8(ns) · Π n_i / (10^8 · 13^k). Integer arithmetic.
// Deeper than 4: multiplier8 cuts at most 1e-8 below 0.99 · Π 13/n_i, so the RTP is at most 1e-8 · Π n_i/13^k below 0.99
// at every depth (printed by HILO-19; not enumerated).
// CLAIM. Read at verify time from the pinned exhibits by src/claims.ts, never from a
// constant: E01 "return" and "summary" ("99% at any cash-out depth, from any start card, on either side") and the rules panel (E06
// rulesHiloReturn, "Every way of playing returns 99% …"), flat, held to the highest figure stated. Not scored here: the
// truncation of each payout to the wallet's 1e-8 unit (E01 rules[6]), which depends on the stake (MANIFEST.md#payouts).
//   npm run rtp-claim:write    rewrite outputs/rtp-claim-table.json and print its SHA-256 to pin
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { RtpClaimAccumulator, rtpClaimTable, rtpClaimGate } from './rtp-claim';
import type { RtpClaim, RtpClaimResult, RtpClaimGate } from './rtp-claim';
import { multiplier8 } from './rules.ts';
import { readPublishedClaim } from './claims.ts';
import { ROOT } from './loader.ts';

/** The claim, built from the exhibits when it is called (verify calls it after HILO-26 has checked their pins). */
export function rtpClaimOf(): RtpClaim {
  const c = readPublishedClaim();
  const where: Record<string, string> = {
    'E01 return': 'in the game settings the site loads, the fairness spec (E01 "return", GET /housegames/hilo2/fairness, which the hilo2 game bundle requests and keeps as its settings, E06; not seen rendered)',
    'E01 summary': 'and in its summary (E01 "summary")',
    'E06 rulesHiloReturn': 'in the rules, the rules panel text in the game\'s page code (E06 rulesHiloReturn, English, the hilo2 bundle the live hilo page loads; not seen rendered)',
    'E07 rulesHiloReturn': 'and its 16 Oct rewording in the live copy of that bundle (E07 rulesHiloReturn, fetched 19 Oct 2026, last-modified 16 Oct 2026; not seen rendered)',
  };
  return { kind: 'flat', rtp: c.figure, source: `HouseBets hilo: ${c.places.map((p) => `${where[p.place] ?? p.place} "${p.text.length > 140 ? p.text.slice(0, 137) + '…' : p.text}"`).join('; ')}; held to the highest figure stated` };
}
export const RTP_MAX_DEPTH = 4;
export const RTP_CLAIM_TABLE = join(ROOT, 'outputs', 'rtp-claim-table.json');
/** SHA-256 of the committed table — re-pin with the run that rewrote it (npm run rtp-claim:write). */
export const RTP_CLAIM_TABLE_SHA256 = '600b70bb61d3f58827f2412588850bdc33974e4b4c864d851d4dcd65d1c44d77';

/** Every n-sequence (n_i in 1 … 12) of length 1 … maxDepth, in lexicographic order per depth. */
export function* nSequences(maxDepth: number): Generator<number[]> {
  for (let k = 1; k <= maxDepth; k++) {
    const ns = new Array(k).fill(1);
    for (;;) {
      yield ns.slice();
      let i = k - 1; while (i >= 0 && ns[i] === 12) { ns[i] = 1; i--; }
      if (i < 0) break; ns[i]++;
    }
  }
}

export function computeRtpClaim(): RtpClaimResult {
  const acc = new RtpClaimAccumulator(rtpClaimOf(), { retainRows: 'all' });
  for (const ns of nSequences(RTP_MAX_DEPTH)) {
    let prodN = 1n, pow13 = 1n; for (const n of ns) { prodN *= BigInt(n); pow13 *= 13n; }
    acc.add(() => `n = ${ns.join('·')}`, multiplier8(ns) * prodN, 100000000n * pow13, `depth ${ns.length}`);
  }
  return acc.result();
}

export function rtpClaimTableText(r: RtpClaimResult): string {
  return rtpClaimTable(r, {
    package: 'housebets/hilo', game: 'hilo',
    settingSpace: 'a cash-out after k right guesses on n_1 … n_k winning ranks, every n in 1 … 12, depth 1 … 4 (22,620 settings = 12 + 144 + 1,728 + 20,736; depth 1 = the 12 values of n, onto which the 26 start rank × side cells map)',
    rtpMethod: 'exact rational: Π n_i / 13^k × floor(99·10^8·13^k / (100·Π n_i)) / 10^8, the settled multiplier cut to 8 decimals',
  });
}

export function runRtpClaimGate(): RtpClaimGate {
  const r = computeRtpClaim();
  return rtpClaimGate(r, rtpClaimTableText(r), RTP_CLAIM_TABLE, RTP_CLAIM_TABLE_SHA256);
}

if (process.argv[1] && /rtp-settings\.ts$/.test(process.argv[1])) {
  const text = rtpClaimTableText(computeRtpClaim());
  writeFileSync(RTP_CLAIM_TABLE, text);
  console.log(`wrote outputs/rtp-claim-table.json sha256 ${createHash('sha256').update(text).digest('hex')}`);
}
