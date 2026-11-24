// HouseBets hilo — the simulation CENSUS (HILO-20 Pass 1, HILO-21 Pass 2). A pure function of src/sim-config.ts and the
// package's datasets: counts and exact sums only (integers / 1e-8 units), plus the lag-1 and runs statistics of the
// 2,000,000-card sequence (re-derived by the verifier, which re-runs this census in full). Pass 2 replays every revealed seed
// of every dataset (src/loader.ts ALL_DATASETS).
//   npm run simulate        rewrite outputs/simulation-results.json (the pinned artifact) and print its sha256
//   npm run simulate:run    write outputs/run/simulation-results.json (a regeneration, compared by scripts/fresh-copy-check.mjs)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { streamCards, sha256Hex } from './rng.ts';
import { wins, nOf, rankOf, multiplier8 } from './rules.ts';
import { ROOT, load, ALL_DATASETS } from './loader.ts';
import { RANK_LABELS, SIDES } from './spec.ts';
import { view, isView, stripReplays } from './rounds.ts';
import { PASS1_SEEDS, PASS1_NONCES, PASS1_CARDS_PER_NONCE, SIM_UNIFORMITY_BINS, RUNS_MID, pass1Seed, CLASS_ROUNDS, CLASS_SEEDS, CLASS_NONCES, classSeed,
  SIM_CONVERGENCE_MARKS, SIM_PASS2_NONCES, SIM_PASS2_EARLY_WINDOW_RULE, PASS2_SLOT_RULE, FRESH_SEED_RULE } from './sim-config.ts';
import type { Dataset, Side } from './types.ts';

/** One Pass 2 window. byN: per button n the window's [rounds, wins] — what the per-slot standardised return (HILO-21) is
 *  computed from. The Phase A epochs also carry the payout-weighted return printed for Phase A: ret8: Σ multiplier8 on wins;
 *  mean13: Σ multiplier8·n (÷13 → 1e-8 units); var169: Σ multiplier8²·n·(13−n) (÷169 → 1e-16 units). */
export interface Window { rounds: number; wins: number; byN: Record<string, [number, number]>; ret8?: string; mean13?: string; var169?: string }

export interface Census {
  design: Record<string, unknown>;
  pass1: { draws: number; skipped: number; bins: number[]; lag1: { n: number; sumXY: string; sumX: string; sumX2: string }; runs: { n: number; n1: number; runs: number; mid: number } };
  classes: { label: string; rank: number; side: Side; n: number; multiplier8: string; rounds: number; wins: number; marks: { n: number; wins: number }[] }[];
  pass2: { epochs: { set: string; epoch: number; seedHash: string; early: Window; ref: Window }[] };
}

const fresh = (label: string): string => sha256Hex(label);

/** One played slot: the round's FIRST guess — the rank it was made on, the side, its n winning ranks, and c, the index in the
 *  card stream of the card that judged it (the skips before it); `won` is the SERVED result of that guess, which the replay
 *  of the early window must reproduce. A later guess depends on the cards before it, so a round enters Pass 2 by its first. */
export interface Slot { nonce: number; rank: number; side: Side; n: number; c: number; won: boolean }

/** Every epoch's played slots in nonce order (PASS2_SLOT_RULE), keyed by the seed hash the server's answer names. */
export function playedSlots(ds: Dataset): Map<string, Slot[]> {
  const out = new Map<string, Slot[]>();
  for (const r of ds.rounds) {
    const v = view(r); if (!isView(v)) continue;
    const ev = v.final.events || []; const c = ev.findIndex((e) => e.type === 'guess'); if (c < 0) continue;
    const g = ev[c]; const h = String(v.final.fairness?.hashedServerSeed); const a = out.get(h) || []; out.set(h, a);
    a.push({ nonce: Number(v.final.fairness.nonce), rank: Number(g.onRank), side: g.side as Side, n: Number(g.n), c, won: g.win === true });
  }
  for (const a of out.values()) a.sort((x, y) => x.nonce - y.nonce);
  return out;
}

export function census(sets: readonly (readonly [string, Dataset])[], onProgress?: (s: string) => void): Census {
  // ── Pass 1: uniformity histogram over the 52 card ids, lag-1 sums (exact BigInt) and Wald–Wolfowitz runs about id 26
  const bins = new Array(SIM_UNIFORMITY_BINS).fill(0);
  let sx = 0n, sx2 = 0n, sxy = 0n, prev = -1, n = 0, n1 = 0, runs = 0, skipped = 0, lastAbove: boolean | null = null;
  for (let i = 0; i < PASS1_SEEDS; i++) {
    const { server, client } = pass1Seed(i); const S = fresh(server);
    for (let nonce = 1; nonce <= PASS1_NONCES; nonce++) {
      const st = streamCards(S, client, nonce, PASS1_CARDS_PER_NONCE); skipped += st.skipped;
      for (const c of st.cards) {
        bins[c]++;
        const K = BigInt(c); sx += K; sx2 += K * K; if (prev >= 0) sxy += BigInt(prev) * K; prev = c; n++;
        const above = c >= RUNS_MID; if (above) n1++; if (above !== lastAbove) { runs++; lastAbove = above; }
      }
    }
  }
  onProgress?.(`pass 1: ${n} cards`);

  // ── Classes: 26 (start rank × side), each on its own 1,000,000 fresh rounds
  const cls = [] as Census['classes'];
  for (let rank = 0; rank < 13; rank++) for (const side of SIDES) cls.push({ label: `${RANK_LABELS[rank]} ${side}`, rank, side, n: nOf(rank, side), multiplier8: String(multiplier8([nOf(rank, side)])), rounds: 0, wins: 0, marks: [] });
  for (const c of cls) for (let j = 0; j < CLASS_SEEDS; j++) {
    const { server, client } = classSeed(c.rank, c.side, j); const S = fresh(server);
    for (let nonce = 1; nonce <= CLASS_NONCES; nonce++) {
      const t = rankOf(streamCards(S, client, nonce, 1).cards[0]);
      c.rounds++; if (wins(c.rank, c.side, t)) c.wins++; if (SIM_CONVERGENCE_MARKS.includes(c.rounds)) c.marks.push({ n: c.rounds, wins: c.wins });
    }
  }
  onProgress?.(`classes: ${cls.length} × ${CLASS_ROUNDS} rounds`);

  // ── Pass 2: every revealed seed of every dataset × nonces 1..10,000; each nonce plays the seed's captured first guesses in
  // nonce order (the early window, nonces 1 … n, is the capture itself), cycled over the rest of the window
  const epochs: Census['pass2']['epochs'] = [];
  for (const [set, ds] of sets) {
    const slots = playedSlots(ds); const pooled = set === 'A';
    for (const sd of ds.seeds) {
      const played = slots.get(sd.hashedServerSeed) || []; if (!played.length) continue;
      if (pooled && played.some((s) => s.c !== 0)) throw new Error('the payout-weighted Phase A return is defined on one-guess rounds');
      const early = played.length;   // the early window is the captured nonces 1 … n of the seed (SIM_PASS2_EARLY_WINDOW_RULE)
      const z = () => ({ rounds: 0, wins: 0, ret: 0n, mean: 0n, v: 0n, by: new Map<number, [number, number]>() });
      const acc = { early: z(), ref: z() };
      for (let nonce = 1; nonce <= SIM_PASS2_NONCES; nonce++) {
        const s = played[(nonce - 1) % played.length];
        const nn = BigInt(s.n), m = multiplier8([s.n]);
        const w = wins(s.rank, s.side, rankOf(streamCards(sd.revealedServerSeed, sd.clientSeed, nonce, s.c + 1).cards[s.c]));
        const a = nonce <= early ? acc.early : acc.ref;
        a.rounds++; if (w) a.wins++;
        if (pooled) { if (w) a.ret += m; a.mean += m * nn; a.v += m * m * nn * (13n - nn); }
        const b = a.by.get(s.n) || [0, 0]; b[0]++; if (w) b[1]++; a.by.set(s.n, b);
      }
      const out = (a: ReturnType<typeof z>): Window => ({ rounds: a.rounds, wins: a.wins,
        byN: Object.fromEntries([...a.by.entries()].sort(([x], [y]) => x - y).map(([k, v]) => [String(k), v])),
        ...(pooled ? { ret8: String(a.ret), mean13: String(a.mean), var169: String(a.v) } : {}) });
      epochs.push({ set, epoch: Number(sd.epoch), seedHash: sd.hashedServerSeed, early: out(acc.early), ref: out(acc.ref) });
    }
  }
  onProgress?.(`pass 2: ${epochs.length} epochs × ${SIM_PASS2_NONCES}`);

  return {
    design: { freshSeedRule: FRESH_SEED_RULE,
      pass1: { seeds: PASS1_SEEDS, nonces: PASS1_NONCES, cardsPerNonce: PASS1_CARDS_PER_NONCE, bins: SIM_UNIFORMITY_BINS, runsAbove: `card id >= ${RUNS_MID}` },
      classes: { rounds: CLASS_ROUNDS, seeds: CLASS_SEEDS, marks: SIM_CONVERGENCE_MARKS, seedLabels: 'each class on its own seed labels (rank and side in the label); no round is shared' },
      pass2: { nonces: SIM_PASS2_NONCES, earlyWindow: SIM_PASS2_EARLY_WINDOW_RULE, slot: PASS2_SLOT_RULE, datasets: sets.map(([k]) => `${k}: ${ALL_DATASETS.find(([x]) => x === k)?.[1] ?? '?'}`),
        units: 'byN = per button n [rounds, wins]; Phase A epochs also carry the payout-weighted return: ret8 = sum of multipliers on wins in 1e-8 units; mean13 = sum multiplier8 × n (divide by 13 for 1e-8 units); var169 = sum multiplier8² × n × (13 − n) (divide by 169 for 1e-16 units)' } },
    pass1: { draws: n, skipped, bins, lag1: { n, sumXY: String(sxy), sumX: String(sx), sumX2: String(sx2) }, runs: { n, n1, runs, mid: RUNS_MID } },
    classes: cls,
    pass2: { epochs },
  };
}

export const censusText = (c: Census): string => JSON.stringify(c, null, 2) + '\n';

if (process.argv[1] && /simulate\.ts$/.test(process.argv[1])) {
  const t0 = Date.now();
  // repeated generation = replay: set aside as the verifier does before it builds the census (src/rounds.ts stripReplays)
  const c = census(ALL_DATASETS.map(([k, f]) => { const d = load(f); stripReplays(d); return [k, d] as const; }), (s) => console.log(`  ${s}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`));
  const text = censusText(c);
  const emit = process.env.PF_EMIT === '1';
  const dir = emit ? join(ROOT, 'outputs') : join(ROOT, 'outputs', 'run'); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'simulation-results.json'), text);
  console.log(`wrote ${emit ? 'outputs' : 'outputs/run'}/simulation-results.json sha256 ${createHash('sha256').update(text).digest('hex')}`);
}
