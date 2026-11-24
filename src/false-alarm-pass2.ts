// HILO-21 Pass 2 — the false-alarm rate of its rule on honest data, DECLARED here and re-checkable with `npm run false-alarm:pass2`.
// The SCORED rule rejects when the per-slot STANDARDISED early-window return of every played slot of every revealed seed (each
// round's first guess, src/simulate.ts playedSlots over src/loader.ts ALL_DATASETS) — each slot's return minus its exact mean,
// ÷ its exact sd, summed and ÷ √slots; for a guess on n ranks that term is (win − n/13)/√((n/13)(1 − n/13)) — has a one-sided
// normal lower-tail p below its level, 0.008 (SIM_PASS2_STD_ALPHA; at 0.01 the rule's false-alarm rate on the Phase A slots was
// above the 1 % cap, which is why the level is 0.008). The payout-weighted (pooled) rule scored until 14 Oct 2026 on the Phase A
// slots is declared too, so its printed figure stays checkable. Both sums are skewed (n = 1 pays 12.87× at chance 1/13), so
// the true lower tail at the normal 1 % point can differ from 1 %. No closed form; this is a plain Monte Carlo over the played
// slots (fixed seed, xoshiro128** generator), the rate the share of replicates the rule rejects.
import { load, ALL_DATASETS } from './loader.ts';
import { multiplier8 } from './rules.ts';
import { normalLowerTailP } from './stats.ts';
import { SIM_PASS2_ALPHA, SIM_PASS2_STD_ALPHA, SIM_PASS2_STATISTIC } from './sim-config.ts';
import { playedSlots } from './simulate.ts';
import { stripReplays } from './rounds.ts';

export const PASS2_FALSE_ALARM = Object.freeze({
  rate: 0.00836,
  standardError: 0.000204,
  replicates: 200_000,
  seed: 20261013,
  level: SIM_PASS2_STD_ALPHA,
  slots: 7777,
  method: 'plain Monte Carlo over the played slots of every revealed seed (win ~ Bernoulli(n/13)), the per-slot standardised rule applied to each replicate',
  statistic: SIM_PASS2_STATISTIC,
});
/** The same standardised rule at 0.01 on the 6,500 Phase A slots: the calibration that set the level to 0.008 (above the 1 %
 *  cap at 0.01). */
export const PASS2_FALSE_ALARM_STD_AT_001 = Object.freeze({ rate: 0.01013, standardError: 0.000224, replicates: 200_000, seed: 20261013, level: 0.01 });
/** The payout-weighted (pooled) rule scored until 14 Oct 2026 on the Phase A slots (declared 13 Oct; same replicates and seed). */
export const PASS2_FALSE_ALARM_POOLED = Object.freeze({
  rate: 0.00915,
  standardError: 0.000213,
  replicates: 200_000,
  seed: 20261013,
  method: 'plain Monte Carlo over the played Phase A one-guess slots (win ~ Bernoulli(n/13), return = multiplier8([n]) on a win), the pooled rule applied to each replicate',
});

/** The n of every played slot: every revealed seed of every dataset, or the Phase A seeds alone. */
const slotNs = (phaseAOnly = false): number[] => ALL_DATASETS.filter(([k]) => !phaseAOnly || k === 'A').flatMap(([, f]) => { const d = load(f); stripReplays(d); return [...playedSlots(d).values()].flat().map((s) => s.n); });

function xoshiro(seed: number) {
  let a = seed >>> 0, b = 0x9e3779b9, c = 0x243f6a88, d = 0xb7e15162;
  return (): number => {
    const r = (Math.imul(Math.imul(b, 5) << 7 | Math.imul(b, 5) >>> 25, 9)) >>> 0;
    const t = b << 9; c ^= a; d ^= b; b ^= c; a ^= d; c ^= t; d = (d << 11) | (d >>> 21);
    return r / 4294967296;
  };
}

/** The scored (per-slot standardised) rule. */
export function simulatePass2FalseAlarm(replicates: number, seed: number, level = SIM_PASS2_STD_ALPHA, phaseAOnly = false) {
  const p = Float64Array.from(slotNs(phaseAOnly), (n) => n / 13);
  const up = Float64Array.from(p, (q) => (1 - q) / Math.sqrt(q * (1 - q))), down = Float64Array.from(p, (q) => -q / Math.sqrt(q * (1 - q)));
  const root = Math.sqrt(p.length), rnd = xoshiro(seed);
  let rej = 0;
  for (let r = 0; r < replicates; r++) {
    let s = 0; for (let i = 0; i < p.length; i++) s += rnd() < p[i] ? up[i] : down[i];
    if (normalLowerTailP(s / root) < level) rej++;
  }
  const rate = rej / replicates;
  return { rate: Number(rate.toFixed(5)), standardError: Number(Math.sqrt(rate * (1 - rate) / replicates).toPrecision(3)), replicates, seed, slots: p.length };
}

/** The payout-weighted (pooled) rule scored until 14 Oct 2026 on the Phase A slots (unchanged from its 13 Oct declaration). */
export function simulatePass2FalseAlarmPooled(replicates: number, seed: number) {
  const ns = slotNs(true);
  const p = Float64Array.from(ns, (n) => n / 13);
  const m = Float64Array.from(ns, (n) => Number(multiplier8([n])) / 1e8);
  let mean = 0, v = 0; for (let i = 0; i < p.length; i++) { mean += m[i] * p[i]; v += m[i] * m[i] * p[i] * (1 - p[i]); }
  const sd = Math.sqrt(v), rnd = xoshiro(seed);
  let rej = 0;
  for (let r = 0; r < replicates; r++) {
    let s = 0; for (let i = 0; i < p.length; i++) if (rnd() < p[i]) s += m[i];
    if (normalLowerTailP((s - mean) / sd) < SIM_PASS2_ALPHA) rej++;
  }
  const rate = rej / replicates;
  return { rate: Number(rate.toFixed(5)), standardError: Number(Math.sqrt(rate * (1 - rate) / replicates).toPrecision(3)), replicates, seed, slots: p.length };
}

if (process.argv[1] && /false-alarm-pass2\.ts$/.test(process.argv[1])) {
  const r = simulatePass2FalseAlarm(PASS2_FALSE_ALARM.replicates, PASS2_FALSE_ALARM.seed);
  const same = r.rate === PASS2_FALSE_ALARM.rate && r.standardError === PASS2_FALSE_ALARM.standardError && r.slots === PASS2_FALSE_ALARM.slots;
  console.log(`scored (per-slot standardised) at ${SIM_PASS2_STD_ALPHA}:`, JSON.stringify(r), same ? '== the declaration' : '!= the declaration: update PASS2_FALSE_ALARM');
  const q = simulatePass2FalseAlarmPooled(PASS2_FALSE_ALARM_POOLED.replicates, PASS2_FALSE_ALARM_POOLED.seed);
  const sameQ = q.rate === PASS2_FALSE_ALARM_POOLED.rate && q.standardError === PASS2_FALSE_ALARM_POOLED.standardError;
  console.log('pooled (Phase A, scored until 14 Oct):', JSON.stringify(q), sameQ ? '== the declaration' : '!= the declaration: update PASS2_FALSE_ALARM_POOLED');
  const c = simulatePass2FalseAlarm(PASS2_FALSE_ALARM_STD_AT_001.replicates, PASS2_FALSE_ALARM_STD_AT_001.seed, 0.01, true);
  const sameC = c.rate === PASS2_FALSE_ALARM_STD_AT_001.rate && c.standardError === PASS2_FALSE_ALARM_STD_AT_001.standardError;
  console.log('scored rule at 0.01 on the Phase A slots (the calibration behind the 0.008 level):', JSON.stringify(c), sameC ? '== the declaration' : '!= the declaration');
  process.exitCode = same && sameQ && sameC ? 0 : 1;
}
