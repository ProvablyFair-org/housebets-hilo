// HouseBets hilo — FROZEN SIMULATION DESIGN, single-sourced so the producer (src/simulate.ts) and the verifier
// (tests/verify.ts, HILO-20 / HILO-21) cannot pin different experiments. Every seed of the experiment is a fixed string,
// so the census (bin counts, win counts, per-epoch returns) is a deterministic function of this file and the datasets: a
// re-run reproduces it byte for byte; the verifier re-runs it in full and never trusts a statistic the artifact reports.

// ── The HILO profile's floors (games/hilo/profile.json HILO-20 / HILO-21, PROPOSED reading), held apart from the design
// so a cheaper design cannot lower them: the verifier compares the census against THESE, not the design's own constants.
export const FLOOR_UNIFORMITY_DRAWS = 2_000_000;    // ≥ 2M card draws
export const FLOOR_CLASS_ROUNDS = 1_000_000;        // ≥ 1M rounds per start rank × side
export const FLOOR_CLASSES = 26;                    // 13 start ranks × 2 sides
export const FLOOR_PASS2_NONCES = 10_000;

// ── Significance, family-wise: Pass 1 runs three screens (uniformity, lag-1, runs), each at α/3.
export const ALPHA = 0.01;
export const ALPHA_SCREENS = 3;
export const ALPHA_SCREEN = ALPHA / ALPHA_SCREENS;

// ── Pass 1, card uniformity + serial independence: 200 fresh seeds × nonces 1..1,250 × the first 8 stream cards of each
// nonce (stream cards 0..7, the cards a round turns first) = 2,000,000 cards, binned by card id (52 bins, df 51).
export const PASS1_SEEDS = 200;
export const PASS1_NONCES = 1_250;
export const PASS1_CARDS_PER_NONCE = 8;
export const SIM_UNIFORMITY_DRAWS = PASS1_SEEDS * PASS1_NONCES * PASS1_CARDS_PER_NONCE;   // 2,000,000 (HILO-20 floor)
export const SIM_UNIFORMITY_BINS = 52;
/** Runs are counted about the median card id: id ≥ 26 is "above" (exactly 26 of the 52 ids). */
export const RUNS_MID = 26;
export const pass1Seed = (i: number): { server: string; client: string } =>
  ({ server: `housebets-hilo-audit/sim/pass1/server/${i}`, client: `housebets-hilo-audit/sim/pass1/client/${i}` });

// ── Pass 1, RTP convergence per first-guess class: the 26 classes (start rank 0..12 × side hi/lo) are each played as a
// one-guess round on 1,000,000 fresh rounds of their own (100 seeds × nonces 1..10,000, the round's first stream card):
// 26,000,000 rounds in all, every class on its own seed labels, so no two classes share a round.
export const CLASS_ROUNDS = 1_000_000;
export const CLASS_SEEDS = 100;
export const CLASS_NONCES = CLASS_ROUNDS / CLASS_SEEDS;
export const classSeed = (rank: number, side: string, j: number): { server: string; client: string } =>
  ({ server: `housebets-hilo-audit/sim/class/rank-${rank}-${side}/server/${j}`, client: `housebets-hilo-audit/sim/class/rank-${rank}-${side}/client/${j}` });
/** Convergence marks per class (the chart and the convergence rows). */
export const SIM_CONVERGENCE_MARKS: readonly number[] = Object.freeze([10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000]);
/** Band tolerance per class: |RTP_sim − RTP_exact| ≤ 5·SE + 1e-4, SE = σ/√n (src/false-alarm.ts edgeBandFalseAlarm). */
export const EDGE_SIGMAS = 5;
export const EDGE_BUFFER = 1e-4;

// ── Pass 2, cherry-pick: every revealed seed of every dataset (src/loader.ts ALL_DATASETS: Phase A, C, C $10, D, E and the
// 12 Oct file) × nonces 1..10,000, as the HILO profile's -21 rule asks (MANIFEST DL-10). Early window = the nonces the capture played on the seed
// (1..50 on a 13 Oct pair, 1..n on a 12 Oct pair); reference window = the rest of 1..10,000. Each nonce plays a round the
// capture played on the seed, cycled, by its FIRST guess: the rank that guess was made on, its side, judged by the card at the
// same place in the stream (after the same skips). A later guess depends on the cards before it, so a round enters Pass 2 by
// its first guess only. The statistic is the per-slot standardised return: every slot's return minus its exact mean, ÷ its
// exact sd, summed and ÷ √slots; for a guess on n ranks the multiplier cancels, so each term is
// (win − n/13)/√((n/13)(1 − n/13)). The payout-weighted return of the Phase A epochs (the statistic scored until 14 Oct 2026,
// on Phase A only, at ALPHA) is still computed and printed; the switch to the standardised form was made after that result
// was known, so it is not pre-registered (MANIFEST DL-10). The largest first-guess multiplier is 12.87× (n = 1), so no slot
// needs excluding for power (src/false-alarm-pass2.ts declares the rule's false-alarm rate).
export const SIM_PASS2_STATISTIC = 'per-slot standardised return';
export const SIM_PASS2_EARLY_WINDOW_RULE = 'nonces 1 … n, n = the rounds the capture played on the seed';
export const PASS2_SLOT_RULE = "nonce i plays the (i − 1) mod n-th captured round of the seed in nonce order, by its first guess: the rank it was made on and its side, judged by the stream card at that guess's place (after the same skips); win iff the side wins on that card's rank";
/** The scored rule's level: 0.008, not α. At 0.01 the standardised rule's false-alarm rate measured 0.01013 ± 0.000224
 *  (npm run false-alarm:pass2), above the 1 % cap, so the level was set to 0.008 (as Hubie's Road's) on 14 Oct from that
 *  calibration alone, before the standardised live statistic was first computed (the pooled result was already known).
 *  SIM_PASS2_ALPHA (0.01) stays the level of the pooled rule, which is printed, not scored. */
export const SIM_PASS2_STD_ALPHA = 0.008;
export const SIM_PASS2_NONCES = 10_000;
export const SIM_PASS2_ALPHA = ALPHA;

/** The fresh-seed server seeds are the sha256 hex of these strings (64 hex chars, the platform's seed shape). */
export const FRESH_SEED_RULE = 'serverSeed = sha256(label) as lowercase hex; clientSeed = label';
