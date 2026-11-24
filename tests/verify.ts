// HouseBets House Games hilo (new engine hilo2, canonical) — verification suite: the 32 checks of the HILO profile
// (src/profile-map.ts, generated from the framework's games/hilo/profile.json 1.0.0, Framework 1.1). Run: npm run verify (Node 22, no install).
// Status by policy: HARD_FAIL → PASS | FAIL; FLAG → PASS | FLAG (origin operator or capture); INFORMATIONAL → INFO;
// GRADED / RELEASE_GATE (package checks) → PASS | GAP, reported, not in the verdict — except a release-gate record
// (outputs/fresh-copy.json, outputs/mutation-results.json) that is missing or not the bytes RELEASE-MANIFEST.json pins: FAIL,
// and the verdict is NOT PROVABLY FAIR. A step that throws is scored FAIL, never skipped (step(), below).
// Verdict, ranked as RTP-CLAIM 1.2.0's rtpClaimVerdict: any FAIL → NOT PROVABLY FAIR (exit 1) > a scored check with no status
// from this run → INCOMPLETE (exit 3; never a pass) > HILO-19 OVERSTATED → RTP FIGURE OVERSTATED (exit 5, Methodology
// v1.1) > an operator-origin FLAG → Conditional Pass (exit 2) > Full Pass (exit 0). A stale verify.js → exit 4, no verdict.
// A capture-origin FLAG is disclosed with a limitation row and is verdict-neutral (policy decided 2026-09-17).
// verify writes only outputs/run/ and never rewrites a pinned artifact.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, load, sha256File, sha256Bytes, readJson, PRIMARY_FILE, PRIMARY_SHA256, PHASE_C_FILE, PHASE_C_SHA256, PHASE_C10_FILE, PHASE_C10_SHA256,
  PHASE_D_FILE, PHASE_D_SHA256, PHASE_E_FILE, PHASE_E_SHA256, OPEN_FILE, OPEN_SHA256, EVIDENCE_PINS, EXPECTED_ROUNDS, EXPECTED_SEEDS,
  EXPECTED_EPOCHS, EXPECTED_EPOCH_SIZE, EXPECTED_PHASE_C_ROUNDS, EXPECTED_PHASE_C10_ROUNDS, EXPECTED_PHASE_D_ROUNDS, EXPECTED_PHASE_E_ROUNDS,
  PHASE_A_STAKE, PHASE_C_STAKE, PHASE_C10_STAKE, PHASE_D_SEEDS, NONCE_BASE, START_RANK_FLOOR, PHASE_E_MIN_DEPTH, OPEN_ROUND_ID, ALL_DATASETS } from '../src/loader.ts';
import { streamCards, cardFromU, REJECT_AT, CARDS, sha256Hex } from '../src/rng.ts';
import * as RNG from '../src/rng.ts';
import { wins, nOf, rankOf, multiplier8, payout8, units8, replay, likelierSide } from '../src/rules.ts';
import { BUTTONS, SPEC_STREAMS, SPEC_PAYOUTS, MAX_CARDS, MIN_STAKE, MAX_WIN, ABANDONED_RULE, START_CARD_TEXT, SIDES } from '../src/spec.ts';
import { readPublishedClaim, readPublishedSpec } from '../src/claims.ts';
import { view, isView, stripReplays, type RoundView } from '../src/rounds.ts';
import { PROFILE, PROFILE_SHA256, PROFILE_VERSION, PROFILE_VENDORED, type Policy } from '../src/profile-map.ts';
import { census, censusText, playedSlots, type Census, type Slot } from '../src/simulate.ts';
import { SIM_UNIFORMITY_DRAWS, SIM_UNIFORMITY_BINS, CLASS_ROUNDS, EDGE_SIGMAS, EDGE_BUFFER, ALPHA_SCREEN, SIM_PASS2_NONCES,
  SIM_PASS2_ALPHA, SIM_PASS2_STD_ALPHA, SIM_PASS2_STATISTIC, FLOOR_UNIFORMITY_DRAWS, FLOOR_CLASS_ROUNDS, FLOOR_CLASSES, FLOOR_PASS2_NONCES, RUNS_MID, classSeed } from '../src/sim-config.ts';
import { chiSquaredPValue, runsStatisticFromCounts, twoSidedNormalP, normalLowerTailP, normalQuantile } from '../src/stats.ts';
import { edgeBandFalseAlarm, uniformityScreenFalseAlarm, FAIL_FALSE_ALARM_CAP, fmtRate } from '../src/false-alarm.ts';
import { PASS2_FALSE_ALARM, PASS2_FALSE_ALARM_POOLED, PASS2_FALSE_ALARM_STD_AT_001 } from '../src/false-alarm-pass2.ts';
import { runRtpClaimGate, RTP_MAX_DEPTH } from '../src/rtp-settings.ts';
import { RTP_CLAIM_RULE_ENFORCED, rtpClaimVerdict } from '../src/rtp-claim';
import { ARTIFACT_PINS, AUDIT_ID, SITE_VERIFIER_PIN } from '../src/artifact-pins.ts';
import { loadSiteModule, replay as replaySide, exportNames, type Probe } from '../src/site-verifier.ts';
import { fieldDiff, beyondTolerance } from '../src/diff.ts';
import type { Dataset, Seed, Side } from '../src/types.ts';
import { codeFingerprint, sourceFingerprint, bundledSourceFingerprint } from '../scripts/fingerprint.mjs';

type Status = 'PASS' | 'FAIL' | 'FLAG' | 'INFO' | 'GAP' | 'NOTRUN' | 'OVERSTATED';
interface Row { id: string; name: string; policy: Policy; status: Status; origin?: 'operator' | 'capture'; detail: string }
const rows: Row[] = [];
// ═══ A step that throws is scored, never skipped ═══
// Every check below runs inside step(). An exception in a step (a file missing, a dataset field null or absent) marks the
// check(s) that step scores FAIL, with the error in the detail, and the next step still runs. A shared input that cannot be
// computed (input()) becomes a value that throws on first use and names itself, so every step that reads it fails on its own
// row. Any such error makes the verdict NOT PROVABLY FAIR (exit 1). An exception outside every step still prints every row,
// each check it left unscored as FAIL, and exits 1.
const RUN_ERRORS: string[] = [];
const TAINT = new Map<string, string>();
const errText = (e: unknown): string => { const x = e as { code?: string; name?: string; message?: string } | null; return `${x?.code ?? x?.name ?? 'Error'}: ${String(x?.message ?? e).split('\n')[0]}`; };
function step(ids: string[], fn: () => void): void {
  try { fn(); } catch (e) {
    const why = errText(e); RUN_ERRORS.push(`${ids.join(', ') || 'a shared computation'}: ${why}`);
    for (const id of ids) if (!TAINT.has(id)) TAINT.set(id, why);
  }
}
function input<T>(name: string, fn: () => T, ...fallback: [T?]): T {
  try { return fn(); } catch (e) {
    const why = errText(e); RUN_ERRORS.push(`input ${name}: ${why}`);
    // a boolean condition that cannot be computed is false (it fails the check it feeds); any other input is poisoned
    if (fallback.length) return fallback[0] as T;
    const poison = (): never => { throw new Error(`input ${name} could not be computed (${why})`); };
    return new Proxy(function () {}, { get: poison, apply: poison, construct: poison, has: poison, ownKeys: poison, getOwnPropertyDescriptor: poison }) as unknown as T;
  }
}
function failRow(id: string, detail: string): void {
  const r = rows.find((x) => x.id === id);
  if (r) { const was = `${r.status}: ${r.detail}`; r.status = 'FAIL'; delete r.origin; r.detail = `${detail} (recorded before the error: ${was})`; }
  else { const p = prof(id); rows.push({ id, name: p.name, policy: p.policy, status: 'FAIL', detail }); }
}
/** Called first in finish(): every check whose step threw becomes FAIL. */
function applyTaint(): void {
  for (const [id, why] of TAINT) failRow(id, `NOT SCORED, the step threw ${why} (an input it reads is missing or malformed); scored FAIL, never skipped`);
  TAINT.clear();
}
/** A release-gate record (outputs/fresh-copy.json, outputs/mutation-results.json) that is missing, not pinned, or not the
 *  bytes RELEASE-MANIFEST.json pins for it: its check is FAIL, and the verdict fails (extraFails). A record that matches its
 *  pin but reports a shortfall stays a GAP. */
function pinFail(id: string, why: string): void {
  const d = `FAIL: the release-gate record is not the one RELEASE-MANIFEST.json pins (${why}); a deleted or edited record fails the verdict`;
  const r = rows.find((x) => x.id === id);
  if (r) { r.status = 'FAIL'; delete r.origin; r.detail = `${d}; ${r.detail}`; }
  else { const p = prof(id); rows.push({ id, name: p.name, policy: p.policy, status: 'FAIL', detail: d }); }
}
/** Verdict-bearing failures outside the scored HARD_FAIL / FLAG rows: a FAIL on a package check (a release-gate record that
 *  is missing or differs from its RELEASE-MANIFEST.json pin) and any run error. */
const extraFails = (): number => rows.filter((r) => r.status === 'FAIL' && r.policy !== 'HARD_FAIL' && r.policy !== 'FLAG').length + RUN_ERRORS.length;
process.on('uncaughtException', (e) => {
  try {
    const why = errText(e); RUN_ERRORS.push(`the run stopped outside any step: ${why}`);
    for (const c of PROFILE) if (!rows.some((r) => r.id === c.id) && !TAINT.has(c.id)) TAINT.set(c.id, `${why}; the run stopped before this check`);
    finish();
  } catch (e2) { console.log(`VERDICT: NOT PROVABLY FAIR — the verifier stopped: ${errText(e)}; ${errText(e2)}`); }
  process.exit(1);
});
/** Lines printed under a step's row (never part of the record): HILO-19 prints the RTP-CLAIM gate's own lines. */
const extraLines = new Map<string, string[]>();
// The step list is bound to the framework profile the MANIFEST cites, vendored byte for byte (PROFILE_VENDORED, its
// sha256 == PROFILE_SHA256). Every check of that profile must be in src/profile-map.ts with the same policy, and no other:
// a check missing or relabelled (e.g. a scored check made INFORMATIONAL) gives INCOMPLETE, exit 3, never a pass.
type PB = { ok: boolean; present: boolean; pinned: boolean; cited: boolean; checks: { id: string; name: string; policy: Policy }[]; missing: string[]; relabelled: string[]; extra: string[] };
let pbMemo: PB | null = null;
function profileBinding(): PB {
  if (pbMemo) return pbMemo;
  const f = join(ROOT, PROFILE_VENDORED), raw = existsSync(f) ? readFileSync(f) : null;
  let checks: PB['checks'] = [];
  try { checks = raw ? JSON.parse(raw.toString('utf8')).checks.map((c: any) => ({ id: String(c.id), name: String(c.name), policy: c.policy as Policy })) : []; } catch { checks = []; }
  const man = existsSync(join(ROOT, 'MANIFEST.md')) ? readFileSync(join(ROOT, 'MANIFEST.md'), 'utf8') : '';
  const pinned = !!raw && sha256Bytes(raw) === PROFILE_SHA256, cited = man.includes(PROFILE_SHA256);
  const missing = checks.filter((c) => !PROFILE.some((p) => p.id === c.id)).map((c) => c.id);
  const relabelled = checks.flatMap((c) => { const p = PROFILE.find((x) => x.id === c.id); return p && p.policy !== c.policy ? [`${c.id} ${c.policy} → ${p.policy}`] : []; });
  const extra = PROFILE.filter((p) => !checks.some((c) => c.id === p.id)).map((p) => p.id);
  return (pbMemo = { ok: !!raw && pinned && cited && checks.length > 0 && !missing.length && !relabelled.length && !extra.length, present: !!raw, pinned, cited, checks, missing, relabelled, extra });
}
/** The check list of record: the vendored framework profile, or src/profile-map.ts if it cannot be read (INCOMPLETE then). */
const profileChecks = (): { id: string; name: string; policy: Policy }[] => { const pb = profileBinding(); return pb.checks.length ? pb.checks : [...PROFILE]; };
const prof = (id: string) => { const p = PROFILE.find((c) => c.id === id) ?? profileBinding().checks.find((c) => c.id === id); if (!p) throw new Error(`no profile check ${id}`); return p; };
/** Record a check by its profile policy. `ok` false → FAIL / FLAG / GAP; INFORMATIONAL is always INFO. */
function record(id: string, ok: boolean, detail: string, origin: 'operator' | 'capture' = 'operator') {
  const p = prof(id); let status: Status;
  if (p.policy === 'INFORMATIONAL') status = 'INFO';
  else if (p.policy === 'HARD_FAIL') status = ok ? 'PASS' : 'FAIL';
  else if (p.policy === 'FLAG') status = ok ? 'PASS' : 'FLAG';
  else status = ok ? 'PASS' : 'GAP';
  rows.push({ id, name: p.name, policy: p.policy, status, ...(status === 'FLAG' ? { origin } : {}), detail });
}
/** RTP-CLAIM 1.2.0 (Methodology v1.1; src/rtp-claim-switch.ts ON): the -19 status. `ok` carries the step's own
 *  conditions besides the rule (the exact derivation, the claim read from the exhibits): if one fails, the profile's policy
 *  applies as before. With those clean the rule decides: PASS, or OVERSTATED for a house-side miss of the published figure
 *  (verdict RTP FIGURE OVERSTATED, exit 5 — never NOT PROVABLY FAIR, the draws are checked by the other steps). A committed
 *  RTP table that does not equal this run's is a reproduction failure: FAIL, whatever the rule says. */
function recordRtpClaim(id: string, ok: boolean, gate: { status: 'INFO' | 'PASS' | 'OVERSTATED' | 'FAIL'; tableMatches: boolean }, detail: string) {
  const p = prof(id);
  if (!gate.tableMatches || gate.status === 'FAIL') { rows.push({ id, name: p.name, policy: p.policy, status: 'FAIL', detail }); return; }
  if (!ok) { record(id, false, detail); return; }
  rows.push({ id, name: p.name, policy: p.policy, status: gate.status, detail });
}
/** A FLAG check whose only shortfall is a branch the capture did not exercise: a capture-origin FLAG (verdict-neutral). */
const captureFlag = (id: string, detail: string) => { const p = prof(id); rows.push({ id, name: p.name, policy: p.policy, status: 'FLAG', origin: 'capture', detail }); };
const pct = (a: number, b: number) => `${a}/${b}`;
/** The scored check list the verdict is bound to — every HARD_FAIL and FLAG check of the profile, each recorded exactly once. */
const EXPECTED_SCORED = profileChecks().filter((c) => c.policy === 'HARD_FAIL' || c.policy === 'FLAG').map((c) => c.id);   // from the vendored profile
const EXPECTED_STEPS = EXPECTED_SCORED.length;   // compared with the executed scored-check count in finish() (scored.length vs EXPECTED_STEPS)
const t0 = Date.now();

// ═══ HILO-26 dataset & config pins — before anything reads the data ═══
const dataPins: [string, string][] = [[PRIMARY_FILE, PRIMARY_SHA256], [PHASE_C_FILE, PHASE_C_SHA256], [PHASE_C10_FILE, PHASE_C10_SHA256],
  [PHASE_D_FILE, PHASE_D_SHA256], [PHASE_E_FILE, PHASE_E_SHA256], [OPEN_FILE, OPEN_SHA256]];
const pinBad = [...dataPins, ...EVIDENCE_PINS].filter(([f, h]) => sha256File(f) !== h);
// verify reads E01 itself. Every constant src/spec.ts copies from E01, E02 or E06 must equal
// the pinned exhibit, read here, before any step runs (a mismatch is a reproduction failure, exit 1); the RTP figure is not
// copied at all (HILO-19 reads it from E01 and the rules panel)
const pub = pinBad.length ? null : readPublishedSpec(), pubClaim = pinBad.length ? null : readPublishedClaim();
const J = (x: unknown) => JSON.stringify(x);
const specParts: [string, boolean][] = !pub || !pubClaim ? [] : [
  ['button table', J(pub.buttons) === J(BUTTONS)], ['published streams', J(pub.examples) === J(SPEC_STREAMS)], ['published payouts', J(pub.payouts) === J(SPEC_PAYOUTS)],
  ['rules[7] (abandoned round)', pub.abandonedRule === ABANDONED_RULE], ['rules[3] (52 cards)', pub.maxCards === MAX_CARDS],
  ['start-card sentence', pub.startSentence === START_CARD_TEXT], ['E02 minimum and max win', pub.minBet === MIN_STAKE && pub.maxWin === MAX_WIN],
  ['a return figure in each place (E01 return, E06 rulesHiloReturn, E07 rulesHiloReturn)', pubClaim.ok],
];
const specOk = specParts.length > 0 && specParts.every(([, ok]) => ok);
record('HILO-26', pinBad.length === 0 && specOk, pinBad.length ? `mismatch: ${pinBad.map(([f]) => f).join(', ')} — abort before any step`
  : `${dataPins.length} datasets + ${EVIDENCE_PINS.length} evidence exhibits match their sha256 pinned in src/loader.ts; the constants src/spec.ts copies from the exhibits equal the pinned exhibits, read now: ${specParts.map(([k, ok]) => `${k} ${ok}`).join(', ')}`);
if (pinBad.length || !specOk) { finish(); process.exit(1); }

const A = input('A', () => (load(PRIMARY_FILE))), C = input('C', () => (load(PHASE_C_FILE))), C10 = input('C10', () => (load(PHASE_C10_FILE))), D = input('D', () => (load(PHASE_D_FILE))), E = input('E', () => (load(PHASE_E_FILE))), O = input('O', () => (load(OPEN_FILE)));
// repeated generation = replay (the 12 Oct file was captured before the rig's fix): set aside before any step reads a round
const RP = input('RP', () => ({ A: stripReplays(A), C: stripReplays(C), C10: stripReplays(C10), D: stripReplays(D), E: stripReplays(E), O: stripReplays(O) }));
const limits = input('limits', () => (readJson('evidence/E02-hilo2-limits-2026-10-13.json').answer));
const cap8Default = input('cap8Default', () => (units8(limits.wallet.maxWin)));

/** The per-round recompute core, shared by every dataset (A, C, C $10, D, E). Never reads the capture's labels. */
interface Tally {
  n: number; views: RoundView[]; viewErr: string[]; seedMissing: number; start: number; seedLink: number; nonce: number; stream: number; skipped: number;
  evCards: number; evLogged: number; evN: number; evWin: number; guesses: number; replayOk: number; outcome: number; pay: number; settledWins: number; mult: number;
  rungs: number; rungOk: number; rungUp: number; rungUpN: number; skips: number; skipOk: number; prefix: number; copies: number; copyN: number; detail: number; detailN: number;
  stakeOk: number; maxCards: number; bustEnds: number; busts: number; floorDiff: number; served8: bigint; outcomes: Record<string, number>; bad: string[];
  agree: number; agreeN: number; labels: number; grid: number; offerBet: number; offerBetOk: number; offerLater: number; offerLaterOk: number;
}
function recompute(ds: Dataset): Tally {
  const byHash = new Map(ds.seeds.map((s) => [s.hashedServerSeed, s]));
  const T: Tally = { n: 0, views: [], viewErr: [], seedMissing: 0, start: 0, seedLink: 0, nonce: 0, stream: 0, skipped: 0, evCards: 0, evLogged: 0, evN: 0, evWin: 0, guesses: 0,
    replayOk: 0, outcome: 0, pay: 0, settledWins: 0, mult: 0, rungs: 0, rungOk: 0, rungUp: 0, rungUpN: 0, skips: 0, skipOk: 0, prefix: 0, copies: 0, copyN: 0, detail: 0, detailN: 0,
    stakeOk: 0, maxCards: 0, bustEnds: 0, busts: 0, floorDiff: 0, served8: 0n, outcomes: {}, bad: [], agree: 0, agreeN: 0, labels: 0, grid: 0, offerBet: 0, offerBetOk: 0, offerLater: 0, offerLaterOk: 0 };
  for (const r of ds.rounds) {
    T.n++;
    const v = view(r); if (!isView(v)) { T.viewErr.push(`round ${r.idx}: ${v.error}`); continue; }
    T.views.push(v);
    const G = v.final, f = G.fairness || ({} as any);
    const s = byHash.get(f.hashedServerSeed); if (!s || !s.revealedServerSeed) { T.seedMissing++; T.bad.push(`round ${r.idx}: no revealed seed for ${String(f.hashedServerSeed).slice(0, 12)}`); continue; }
    if (G.startCard === v.startCard && G.cards[0] === v.startCard) T.start++; else T.bad.push(`round ${r.idx}: start ${G.startCard}/${G.cards[0]} vs sent ${v.startCard}`);
    if (f.version === 'canonical' && f.clientSeed === s.clientSeed && f.hashedServerSeed === s.hashedServerSeed) T.seedLink++; else T.bad.push(`round ${r.idx}: answer seeds differ from the epoch`);
    if (Number(f.nonce) === (r.pre?.nonceBefore ?? -1) + 1) T.nonce++; else T.bad.push(`round ${r.idx}: nonce ${f.nonce} vs server nonce before + 1 = ${(r.pre?.nonceBefore ?? NaN) + 1}`);
    // Every server answer of the round (bet, each action, game_detail; replays already set aside) carries the settled
    // fairness block (version, hash, client seed, nonce) and round id the recompute uses; the capture's own copies (round id,
    // the client seed and hash it read before the round, its outcome label) == the server's. A forged answer anywhere fails.
    {
      const answers = [...(r.requests || []).filter((q) => q.status === 200 && q.response?.game).map((q) => q.response.game), ...(r.detail?.response?.game ? [r.detail.response.game] : [])];
      const fb = (x: any) => JSON.stringify([x?.fairness?.version, x?.fairness?.hashedServerSeed, x?.fairness?.clientSeed, x?.fairness?.nonce, x?.roundId]);
      T.agreeN++; if (answers.every((x) => fb(x) === fb(G))) T.agree++; else T.bad.push(`round ${r.idx}: a server answer's fairness block or round id differs from the settled one`);
      const lab = /^(?:finished at resume: )?(\w+)(?: · (\d+) cards · (\d+) correct(?: · (\d+) skips)?)?$/.exec(String(r.outcome ?? ''));
      const ev0 = G.events || []; const right = ev0.filter((e) => e.type === 'guess' && e.win).length, sk = ev0.filter((e) => e.type === 'skip').length;
      const labelOk = v.serverFinished ? true : !!lab && lab[1] === G.outcome && (lab[2] === undefined || (Number(lab[2]) === G.cards.length && Number(lab[3]) === right && Number(lab[4] ?? 0) === sk));
      if ((r.roundId == null || r.roundId === G.roundId) && (r.pre?.clientSeed == null || r.pre.clientSeed === f.clientSeed) && r.pre?.hashedServerSeed === f.hashedServerSeed && labelOk) T.labels++;
      else T.bad.push(`round ${r.idx}: capture copies (${r.roundId} ${r.outcome}) differ from the server's answer`);
    }
    // Every amount sent and served on the platform's 1e-8 grid (an off-grid value is never rounded onto it)
    {
      const onGrid = (x: unknown) => x === undefined || x === null || (typeof x === 'number' && Number.isFinite(x) && Number(x.toFixed(8)) === x) || (typeof x === 'string' && /^-?\d+(\.\d{1,8})?$/.test(x));
      const amounts: unknown[] = [v.bet.body.amount];
      for (const q of [...(r.requests || []), ...(r.detail ? [r.detail] : [])]) { if (q.status !== 200 || !q.response) continue; const x: any = q.response, g: any = x.game;
        amounts.push(x.balance, x.round?.stake, x.round?.payout, x.round?.delta, x.round?.balance);
        if (g) amounts.push(g.stake, g.payout, g.value, g.multiplier, g.maxWin, g.options?.hi?.value, g.options?.hi?.multiplier, g.options?.lo?.value, g.options?.lo?.multiplier); }
      if (amounts.every(onGrid)) T.grid++; else T.bad.push(`round ${r.idx}: off-grid amount ${JSON.stringify(amounts.filter((x) => !onGrid(x)))}`);
    }
    const st = streamCards(s.revealedServerSeed, s.clientSeed, Number(f.nonce), v.turned.length); T.skipped += st.skipped;
    const derived = st.cards;
    if (derived.length === v.turned.length && derived.every((c, i) => c === v.turned[i])) T.stream++; else T.bad.push(`round ${r.idx}: shown ${v.turned} derived ${derived}`);
    const ev = G.events || [];
    if (ev.length === v.turned.length && ev.every((e, i) => e.card === v.turned[i])) T.evCards++; else T.bad.push(`round ${r.idx}: events[t].card != cards[t+1]`);
    const logged = v.steps.map((q) => q.body.action).filter((a: string) => a !== 'cashout');
    if (JSON.stringify(ev.map((e) => (e.type === 'skip' ? 'skip' : e.side))) === JSON.stringify(logged)) T.evLogged++; else T.bad.push(`round ${r.idx}: events != the logged actions`);
    // every guess event: the served n and win flag against the published table over the DERIVED cards
    const dc = [v.startCard, ...derived];
    ev.forEach((e, t) => { if (e.type !== 'guess') return; T.guesses++;
      const pr = rankOf(dc[t]), nr = rankOf(dc[t + 1] ?? -1);
      if (e.n === nOf(pr, e.side as Side)) T.evN++; else T.bad.push(`round ${r.idx} step ${t}: served n ${e.n} vs table ${nOf(pr, e.side as Side)}`);
      if (e.win === wins(pr, e.side as Side, nr)) T.evWin++; else T.bad.push(`round ${r.idx} step ${t}: served win ${e.win} vs rule`); });
    T.maxCards = Math.max(T.maxCards, G.cards.length);
    const cap8 = G.maxWin != null ? units8(G.maxWin) : cap8Default;
    const rp = replay(v.startCard, derived, v.decisions, v.stake8, cap8);
    if (!rp.error) T.replayOk++; else { T.bad.push(`round ${r.idx}: replay ${rp.error}`); continue; }
    T.outcomes[G.outcome || '?'] = (T.outcomes[G.outcome || '?'] || 0) + 1;
    if (G.outcome === rp.outcome) T.outcome++; else T.bad.push(`round ${r.idx}: outcome ${G.outcome} vs replay ${rp.outcome}`);
    if (units8(G.payout) === rp.payout8) T.pay++; else T.bad.push(`round ${r.idx}: payout ${G.payout} vs ${rp.payout8}e-8`);
    if (rp.outcome === 'bust') { T.busts++; const li = ev.length - 1; if (ev[li]?.type === 'guess' && ev[li].win === false && units8(G.payout) === 0n) T.bustEnds++; }
    if (rp.ns.length && rp.outcome !== 'bust') {
      T.settledWins++; if (units8(G.multiplier) === multiplier8(rp.ns)) T.mult++; else T.bad.push(`round ${r.idx}: multiplier ${G.multiplier} vs ${multiplier8(rp.ns)}e-8`);
      T.served8 += units8(G.multiplier);
      let prodN = 1n, pow13 = 1n; for (const x of rp.ns) { prodN *= BigInt(x); pow13 *= 13n; }
      const oneFloor = (v.stake8 * 99n * pow13) / (100n * prodN);
      if ((G.outcome === 'cashout' || G.outcome === 'deck') && oneFloor !== rp.payout8) T.floorDiff++;
    }
    if (units8(G.stake) === v.stake8) T.stakeOk++; else T.bad.push(`round ${r.idx}: settled stake ${G.stake} vs sent ${v.bet.body.amount}`);
    // per-step answers: rungs (every open step after a right guess), skips, prefix invariance
    let prevMult = v.bet.response?.game?.multiplier, prevRung = 0n, prefixOk = true;
    for (const q of v.steps) {
      const g = q.response?.game; if (!g) continue;
      if (q.body.action === 'skip') { T.skips++; if (g.multiplier === prevMult) T.skipOk++; else T.bad.push(`round ${r.idx}: skip changed the multiplier ${prevMult} → ${g.multiplier}`); }
      prevMult = g.multiplier;
      if (g.active === true && (g.wins || 0) >= 1) {
        const nk = (g.events || []).map((x: any, t: number) => (x.type === 'guess' && t < dc.length ? nOf(rankOf(dc[t]), x.side) : null)).filter((x: any) => x !== null) as number[];
        const mu = multiplier8(nk); T.rungs++;
        if ((g.events || []).length < dc.length && units8(g.multiplier) === mu && units8(g.value) === payout8(v.stake8, mu)) T.rungOk++; else T.bad.push(`round ${r.idx}: rung ${g.multiplier}/${g.value} vs ${mu}`);
        if (q.body.action !== 'skip') { T.rungUpN++; if (mu > prevRung) T.rungUp++; else T.bad.push(`round ${r.idx}: rung did not rise`); }
        prevRung = mu;
      }
    }
    for (const q of r.requests) { const g = q.response?.game; if (q.status === 200 && g && Array.isArray(g.cards)) prefixOk = prefixOk && g.cards.every((c: number, i: number) => c === G.cards[i]); }
    // The two buttons the player reads before every guess (options.hi / options.lo: n, multiplier, value) against the
    // published table and formula — n from the card showing and the side, the multiplier from the n of every right guess so far
    // over the DERIVED cards (never a served n), the value floor(stake × multiplier)
    for (const q of r.requests) {
      const g = q.response?.game; if (q.status !== 200 || !g || g.active !== true) continue;
      const shown = g.cards.length - 1; const evs = g.events || [];
      const nsSoFar = evs.map((e: any, t: number) => (e.type === 'guess' && e.win && t < dc.length ? nOf(rankOf(dc[t]), e.side) : null)).filter((x: any) => x !== null) as number[];
      for (const side of SIDES) {
        const o = g.options?.[side]; if (!o) continue;
        const n = nOf(rankOf(dc[shown]), side); const mu = multiplier8([...nsSoFar, n]);
        const ok = shown < dc.length && o.n === n && units8(o.multiplier) === mu && units8(o.value) === payout8(v.stake8, mu) && (o.allowed === undefined || o.allowed === (payout8(v.stake8, mu) - v.stake8 <= cap8));
        if (q.path === '/hilo2/bet') { T.offerBet++; if (ok) T.offerBetOk++; } else { T.offerLater++; if (ok) T.offerLaterOk++; }
        if (!ok) T.bad.push(`round ${r.idx}: offered ${side} ${JSON.stringify(o)} vs n ${n}, ×${mu}e-8`);
      }
      if (!!g.options?.cashout !== ((g.wins || 0) >= 1)) T.bad.push(`round ${r.idx}: cash-out offered ${g.options?.cashout} with ${g.wins} right guesses`);
    }
    if (prefixOk) T.prefix++; else T.bad.push(`round ${r.idx}: a step's cards are not a prefix of the settled cards`);
    const rec = v.finalReq?.response?.round;
    if (rec) { T.copyN++; if (rec.roundId === G.roundId && rec.roundId === r.roundId && units8(rec.stake) === v.stake8 && units8(rec.payout) === units8(G.payout)) T.copies++; else T.bad.push(`round ${r.idx}: round record != game`); }
    const det = r.detail?.response?.game;
    if (det && !v.serverFinished) { T.detailN++; if (JSON.stringify(det.cards) === JSON.stringify(G.cards) && JSON.stringify(det.events) === JSON.stringify(G.events) && det.outcome === G.outcome && units8(det.payout) === units8(G.payout) && det.fairness?.nonce === f.nonce) T.detail++; else T.bad.push(`round ${r.idx}: game_detail differs`); }
  }
  return T;
}
const TA = input('TA', () => (recompute(A))), TC = input('TC', () => (recompute(C))), TC10 = input('TC10', () => (recompute(C10))), TD = input('TD', () => (recompute(D))), TE = input('TE', () => (recompute(E))), TO = input('TO', () => (recompute(O)));
const ALL: [string, Tally][] = input('ALL', () => ([['A', TA], ['C', TC], ['C $10', TC10], ['D', TD], ['E', TE], ['12 Oct', TO]]));
const sum = (k: keyof Tally) => ALL.reduce((s, [, t]) => s + (t[k] as number), 0);
const clean = (t: Tally) => t.viewErr.length === 0 && t.seedMissing === 0 && t.bad.length === 0;

// ═══ HILO-05 population & epoch size (G-BIND) ═══
step(['HILO-05'], () => {
  const perEpoch = (d: Dataset) => { const m = new Map<string, number>(); for (const r of d.rounds) { const v = view(r); if (isView(v)) m.set(v.final.fairness.hashedServerSeed, (m.get(v.final.fairness.hashedServerSeed) || 0) + 1); } return m; };
  const pa = perEpoch(A); const sizesOk = [...pa.values()].every((n) => n === EXPECTED_EPOCH_SIZE);
  const supp = [[C, EXPECTED_PHASE_C_ROUNDS], [C10, EXPECTED_PHASE_C10_ROUNDS], [D, EXPECTED_PHASE_D_ROUNDS], [E, EXPECTED_PHASE_E_ROUNDS]] as const;
  const suppOk = supp.every(([d, n]) => d.rounds.length === n && [...perEpoch(d).values()].every((x) => x === EXPECTED_EPOCH_SIZE) && d.seeds.length === n / EXPECTED_EPOCH_SIZE);
  const ok = A.rounds.length === EXPECTED_ROUNDS && A.seeds.length === EXPECTED_SEEDS && pa.size === EXPECTED_EPOCHS && sizesOk && suppOk;
  record('HILO-05', ok, `Phase A ${A.rounds.length} rounds / ${A.seeds.length} seeds / ${pa.size} epochs (by the server's hash), every epoch ${EXPECTED_EPOCH_SIZE}: ${sizesOk}; supplementary C ${C.rounds.length}, C $10 ${C10.rounds.length}, D ${D.rounds.length}, E ${E.rounds.length}, each in whole epochs of ${EXPECTED_EPOCH_SIZE}: ${suppOk} — against src/loader.ts constants, never meta`);
});

// ═══ HILO-01 seed hash integrity (every revealed seed of every dataset, the pre-capture pairs and the 12 Oct file) ═══
step(['HILO-01'], () => {
  const all = [...A.seeds, ...C.seeds, ...C10.seeds, ...D.seeds, ...E.seeds, ...O.seeds];
  const ok = all.filter((s) => sha256Hex(s.revealedServerSeed) === s.hashedServerSeed).length;
  const pre = [A, C, C10, D, E, O].map((d) => d.preCapture).filter((p) => p && p.revealedServerSeed);
  const preOk = pre.filter((p) => sha256Hex(p.revealedServerSeed) === p.hashedServerSeed).length;
  const primOk = A.seeds.filter((s) => sha256Hex(s.revealedServerSeed) === s.hashedServerSeed).length;
  const unverifiable = sum('seedMissing');
  record('HILO-01', ok === all.length && primOk === EXPECTED_SEEDS && preOk === pre.length && unverifiable === 0, `sha256(utf8(revealed)) == committed: ${pct(primOk, EXPECTED_SEEDS)} Phase A seeds, ${pct(ok, all.length)} across A, C, C $10, D, E and the 12 Oct file; pre-capture reveals ${pct(preOk, pre.length)}; ${unverifiable} rounds on an unrevealed seed`);
});

// ═══ HILO-02 forward commitment chain, anchored before epoch 0 ═══
step(['HILO-02'], () => {
  const chainOf = (d: Dataset) => { let n = 0; for (let i = 0; i + 1 < d.seeds.length; i++) if (d.seeds[i].hashedNextServerSeed === d.seeds[i + 1].hashedServerSeed) n++; return n; };
  const anchor = (d: Dataset) => !!d.preCapture && d.preCapture.hashedNextServerSeed === d.seeds[0].hashedServerSeed;
  const end = (d: Dataset) => { const post = d.meta.postCapture?.activePair; return !!post && d.seeds[d.seeds.length - 1].hashedNextServerSeed === post.hashedServerSeed; };
  const per = [['A', A], ['C', C], ['C $10', C10], ['D', D], ['E', E]].map(([k, d]: any) => ({ k, n: chainOf(d), of: d.seeds.length - 1, anchor: anchor(d), end: end(d) }));
  const ok = per.every((p) => p.n === p.of && p.anchor && p.end) && per[0].n === EXPECTED_SEEDS - 1;
  record('HILO-02', ok, per.map((p) => `${p.k} ${p.n}/${p.of} links, anchor ${p.anchor}, end → pair active after the capture ${p.end}`).join('; '));
});

// ═══ HILO-03 hash consistency within epoch ═══
step(['HILO-03'], () => {
  let ok = 0;
  for (const s of A.seeds) { const vs = TA.views.filter((v) => v.final.fairness.hashedServerSeed === s.hashedServerSeed); if (vs.length === EXPECTED_EPOCH_SIZE && vs.every((v) => v.final.fairness.clientSeed === s.clientSeed && v.bet.response?.game?.fairness?.hashedServerSeed === s.hashedServerSeed)) ok++; }
  record('HILO-03', ok === EXPECTED_EPOCHS && sum('seedLink') === sum('n') && sum('agree') === sum('agreeN') && sum('labels') === sum('agreeN') && sum('agreeN') === sum('n'), `${pct(ok, EXPECTED_EPOCHS)} Phase A epochs: every round's bet and settled answers carry the epoch's server-seed hash and client seed; all datasets ${pct(sum('seedLink'), sum('n'))} rounds; every server answer of a round (bet, each action, game_detail; replays set aside) carries the settled hash, client seed, version, nonce and round id the recompute uses: ${pct(sum('agree'), sum('agreeN'))} rounds (A, C, C $10, D, E, 12 Oct); the capture's own copies (round id, client seed and hash read before the round, outcome label) == the server's answer: ${pct(sum('labels'), sum('agreeN'))}`);
});

// ═══ HILO-04 nonce continuity ═══
step(['HILO-04'], () => {
  let ok = 0; const bad: string[] = [];
  for (const s of A.seeds) {
    const ns = TA.views.filter((v) => v.final.fairness.hashedServerSeed === s.hashedServerSeed).map((v) => Number(v.final.fairness.nonce)).sort((a, b) => a - b);
    if (ns.length === EXPECTED_EPOCH_SIZE && ns.every((n, i) => n === NONCE_BASE + i) && ns.length === Number(s.serverNonceAtRotation)) ok++; else bad.push(String(s.epoch));
  }
  record('HILO-04', ok === EXPECTED_EPOCHS && sum('nonce') === sum('n') && sum('agree') === sum('n'), `${pct(ok, EXPECTED_EPOCHS)} Phase A epochs: round nonces exactly ${NONCE_BASE}..${EXPECTED_EPOCH_SIZE}, once each, no gap, repeat or reorder, N == the server's nonce read at rotation${bad.length ? `; bad epochs ${bad.join(',')}` : ''}; every round's nonce == the server nonce read before it + 1: ${pct(sum('nonce'), sum('n'))}; every server answer of a round carries the settled nonce (with HILO-03): ${pct(sum('agree'), sum('n'))}`);
});

// ═══ HILO-07 card-stream recomputation ═══
step(['HILO-07'], () => { record('HILO-07', clean(TA) && TA.stream === TA.n && TA.start === TA.n && TA.n === EXPECTED_ROUNDS && ALL.every(([, t]) => t.stream === t.n && t.start === t.n),
  `turned card k == stream card k − 1 (E01: HMAC-SHA256 stream, big-endian u32, skip ≥ ${REJECT_AT}, card = u32 mod 52) on Phase A ${pct(TA.stream, TA.n)} rounds; start card == the bet's startCard == cards[0] ${pct(TA.start, TA.n)}; C ${pct(TC.stream, TC.n)}, C $10 ${pct(TC10.stream, TC10.n)}, D ${pct(TD.stream, TD.n)}, E ${pct(TE.stream, TE.n)}, 12 Oct ${pct(TO.stream, TO.n)}; coverage ${TA.n} == expectedRounds; 0 skipped rounds${TA.bad.length ? ' — ' + TA.bad.slice(0, 3).join('; ') : ''}`); });

// ═══ HILO-08 draw bias bound: the card map censused over all 2^32 values of u ═══
step(['HILO-08'], () => {
  // cardFromU is u mod 52 below REJECT_AT and skip above: the preimages of card c are c, c+52, … < REJECT_AT.
  const counts = new Array(CARDS).fill(0).map((_, c) => Math.floor((REJECT_AT - 1 - c) / CARDS) + 1);
  const equal = counts.every((x) => x === counts[0]), total = counts.reduce((s, x) => s + x, 0);
  const edges = cardFromU(REJECT_AT - 1) === (REJECT_AT - 1) % CARDS && cardFromU(REJECT_AT) === null && cardFromU(2 ** 32 - 1) === null;
  // the pinned census only supplies the printed skip count; a missing census is HILO-20's FAIL, not this check's
  const cenText = (existsSync(join(ROOT, 'outputs', 'simulation-results.json')) ? readFileSync(join(ROOT, 'outputs', 'simulation-results.json'), 'utf8') : null);
  const cen = cenText === null ? null : JSON.parse(cenText);
  const runSkips = sum('skipped');
  record('HILO-08', equal && total === REJECT_AT && REJECT_AT === 2 ** 32 - (2 ** 32 % CARDS) && edges, `2^32 mod 52 = ${2 ** 32 % CARDS}, so the skip threshold 2^32 − 48 = ${REJECT_AT} (E01); below it every card id 0..51 has exactly ${counts[0].toLocaleString('en')} preimages (sum ${total} == ${REJECT_AT}): exactly uniform, bias 0; map edges checked: ${edges}; rejection census of the run: ${runSkips} u32 skipped while recomputing the ${sum('n')} captured rounds, ${cen ? `${cen.pass1.skipped} in the ${cen.pass1.draws.toLocaleString('en')}-card simulation` : 'none read from the pinned census, which is missing (HILO-20)'} (expected rate 48/2^32 = ${(48 / 2 ** 32).toExponential(2)})`);
});

// ═══ HILO-09 RNG reference vectors (E01 published examples + captured rounds) ═══
step(['HILO-09'], () => {
  const v = SPEC_STREAMS.filter((x) => JSON.stringify(streamCards(x.serverSeed, x.clientSeed, x.nonce, 8).cards) === JSON.stringify(x.cards)).length;
  const pv = SPEC_PAYOUTS.filter((p) => multiplier8(p.ns) === BigInt(Math.round(Number(p.multiplier) * 1e8))).length;
  const r0 = TA.views[0], s0 = A.seeds.find((s) => s.hashedServerSeed === r0.final.fairness.hashedServerSeed)!;
  const capOk = JSON.stringify(streamCards(s0.revealedServerSeed, s0.clientSeed, r0.final.fairness.nonce, r0.turned.length).cards) === JSON.stringify(r0.turned);
  record('HILO-09', v === SPEC_STREAMS.length && pv === SPEC_PAYOUTS.length && capOk, `the ${SPEC_STREAMS.length} published card streams (E01 "examples", 8 cards each) ${pct(v, SPEC_STREAMS.length)}; the ${SPEC_PAYOUTS.length} published payout examples ${pct(pv, SPEC_PAYOUTS.length)}; captured Phase A round idx ${r0.r.idx} (start ${r0.startCard}, turned ${r0.turned.join(' ')}) recomputes: ${capOk}; also tests/rng.test.ts`);
});

// ═══ HILO-10 guess resolution & round sequence ═══
/** The 12 Oct file's two rule probes, read from the server's answers: the 52-card limit (a round of 50 skips) and a
 *  cash-out before any right guess (refused). Every 12 Oct round is also in the per-round recompute (set '12 Oct'). */
function probes12Oct() {
  const out = { limit: false, limitDetail: 'no 52-card round in the 12 Oct file', neg: 0, negOk: 0, negSettled: 0 };
  const seedOf = (h: string) => O.seeds.find((s) => s.hashedServerSeed === h);
  for (const r of O.rounds) {
    const v = view(r); if (!isView(v)) continue;
    const s = seedOf(v.final.fairness.hashedServerSeed); if (!s) continue;
    const derived = streamCards(s.revealedServerSeed, s.clientSeed, Number(v.final.fairness.nonce), v.turned.length).cards;
    const rp = replay(v.startCard, derived, v.decisions, v.stake8, units8(v.final.maxWin ?? MAX_WIN));
    const settledOk = JSON.stringify(derived) === JSON.stringify(v.turned) && v.final.outcome === rp.outcome && units8(v.final.payout) === rp.payout8;
    if (v.final.cards.length === MAX_CARDS) {
      const before = v.steps.map((q) => q.response.game).filter((g: any) => g.active === true).pop();
      const skips = v.final.events.filter((e) => e.type === 'skip').length;
      out.limit = settledOk && before?.cards.length === MAX_CARDS - 1 && before?.options?.skip === false && v.final.events.length === MAX_CARDS - 1;
      out.limitDetail = `12 Oct round ${r.roundId.slice(0, 8)}…: ${skips} skips, then with ${before?.cards.length} cards showing the server no longer offered a skip (options.skip ${before?.options?.skip}); the guess turned card ${v.final.cards.length}, outcome ${v.final.outcome}; its ${derived.length} turned cards (${Math.ceil(derived.length * 4 / 32)} HMAC blocks) recompute: ${JSON.stringify(derived) === JSON.stringify(v.turned)}`;
    }
    for (const q of r.requests) if (q.negativeTest) { out.neg++; if (q.status === 400 && q.response?.game?.active === true && (q.response?.game?.wins ?? 0) === 0) out.negOk++; if (settledOk) out.negSettled++; }
  }
  return out;
}
const P12 = input('P12', () => (probes12Oct()));
step(['HILO-10'], () => {
  const ok = RP.O.identical === RP.O.replays && P12.limit && P12.neg > 0 && P12.negOk === P12.neg && P12.negSettled === P12.neg && ALL.every(([, t]) => t.evN === t.guesses && t.evWin === t.guesses && t.outcome === t.n - t.viewErr.length && t.bustEnds === t.busts && t.skipOk === t.skips && t.evCards === t.n && t.evLogged === t.n) && Math.max(...ALL.map(([, t]) => t.maxCards)) <= MAX_CARDS;
  record('HILO-10', ok, `every guess over the DERIVED cards: served n == the button table (E01) ${pct(sum('evN'), sum('guesses'))}, served win == the published rule (a tie wins an "or same" guess) ${pct(sum('evWin'), sum('guesses'))}; outcome == the replay (bust / cashout / capped / deck) ${pct(sum('outcome'), sum('n'))}; every bust ends on a wrong guess paying 0 ${pct(sum('bustEnds'), sum('busts'))}; skips leave the multiplier unchanged ${pct(sum('skipOk'), sum('skips'))}; events == the cards turned ${pct(sum('evCards'), sum('n'))} and == the actions sent ${pct(sum('evLogged'), sum('n'))}; most cards in a round ${Math.max(...ALL.map(([, t]) => t.maxCards))} (≤ ${MAX_CARDS}); requests that repeated a generation (the server's idempotency key) set aside as replays: ${RP.O.replays} in the 12 Oct file, each answered with exactly the stored answer ${pct(RP.O.identical, RP.O.replays)}, ${RP.O.notSent} never sent; A–E ${RP.A.replays + RP.C.replays + RP.C10.replays + RP.D.replays + RP.E.replays}; ${P12.limitDetail}; a cash-out before any right guess (E01 rules[4]) refused with HTTP 400, round still open: ${pct(P12.negOk, P12.neg)}, and those rounds then settled by the replay ${pct(P12.negSettled, P12.neg)}`);
});

// ═══ HILO-11 payout arithmetic ═══
step(['HILO-11'], () => {
  const ok = ALL.every(([, t]) => t.pay === t.n && t.copies === t.copyN && t.detail === t.detailN && t.stakeOk === t.n && t.grid === t.n) && TA.copyN === TA.n;
  record('HILO-11', ok, `payout == floor(stake × multiplier8) at 1e-8 (E01 "multiplier", rules[6]) on the replay over the derived cards: ${ALL.map(([k, t]) => `${k} ${pct(t.pay, t.n)}`).join(', ')}; capture copy == the server's own round record (roundId, stake, payout) ${pct(sum('copies'), sum('copyN'))}; game_detail == the settled game (cards, events, outcome, payout, nonce) ${pct(sum('detail'), sum('detailN'))}; settled stake == stake sent ${pct(sum('stakeOk'), sum('n'))}; every amount sent and served on the 1e-8 grid (an off-grid value fails, it is never rounded onto the grid) ${pct(sum('grid'), sum('n'))} rounds; rounds where one floor of stake × the exact 0.99·Π13/n would pay differently from the published two-step rule: ${sum('floorDiff')} (observation: the spec cuts the multiplier, then floors the payout)`);
});

// ═══ HILO-12 bet-size invariance (Phase C at 100 × the Phase A stake, and the $10 set) ═══
step(['HILO-12'], () => {
  const chk = (d: Dataset, t: Tally, stake: string) => {
    const stakeOk = t.views.every((v) => v.stake8 === units8(stake) && units8(v.final.stake) === units8(stake) && (!v.finalReq?.response?.round || units8(v.finalReq.response.round.stake) === units8(stake)));
    const sideOk = t.views.every((v) => { const g = v.final.events.find((e) => e.type === 'guess'); return !!g && g.side === likelierSide(rankOf(v.startCard)); });
    const w = t.views.filter((v) => v.final.outcome !== 'bust' && units8(v.final.payout) > 0n).length;
    return { stakeOk, sideOk, w, ok: clean(t) && t.n === d.rounds.length && t.stream === t.n && t.pay === t.n && t.mult === t.settledWins && stakeOk && sideOk && w >= 100 };
  };
  const a = chk(C, TC, PHASE_C_STAKE), b = chk(C10, TC10, PHASE_C10_STAKE);
  const tierOk = units8(PHASE_C_STAKE) === 100n * units8(PHASE_A_STAKE);
  record('HILO-12', a.ok && b.ok && tierOk, `Phase C ${C.rounds.length} rounds at ${PHASE_C_STAKE} (= 100 × the Phase A stake ${PHASE_A_STAKE}: ${tierOk}), one guess on the likelier side ${a.sideOk}: cards ${pct(TC.stream, TC.n)}, payouts ${pct(TC.pay, TC.n)}, multipliers ${pct(TC.mult, TC.settledWins)}, stake as sent, settled and recorded ${a.stakeOk}, ${a.w} elevated wins (≥ 100); $10 set ${C10.rounds.length} rounds at ${PHASE_C10_STAKE}: cards ${pct(TC10.stream, TC10.n)}, payouts ${pct(TC10.pay, TC10.n)}, multipliers ${pct(TC10.mult, TC10.settledWins)}, stake ${b.stakeOk}, ${b.w} wins (≥ 100); same rule as base stake`);
});

// ═══ HILO-13 multiplier formula & provenance ═══
step(['HILO-13'], () => {
  const cells = BUTTONS.flatMap((b, r) => [[r, 'hi', b.hiN, b.hiFirst], [r, 'lo', b.loN, b.loFirst]] as const);
  const cellOk = cells.filter(([r, s, n, first]) => nOf(r, s) === n && multiplier8([n]) === units8(first)).length;
  const pv = SPEC_PAYOUTS.filter((p) => multiplier8(p.ns) === units8(p.multiplier)).length;
  const offersOk = ALL.every(([, t]) => t.offerBetOk === t.offerBet && t.offerLaterOk === t.offerLater) && sum('offerBet') > 0;
  const ok = ALL.every(([, t]) => t.mult === t.settledWins && t.rungOk === t.rungs) && cellOk === 26 && pv === SPEC_PAYOUTS.length && offersOk;
  record('HILO-13', ok, `settled multiplier == 99/100 × Π 13/n_i cut to 8 decimals (E01 "multiplier") ${pct(sum('mult'), sum('settledWins'))} winning rounds; every open step after a right guess: multiplier and value == the formula over the derived cards ${pct(sum('rungOk'), sum('rungs'))}; the published first-guess values hiFirst / loFirst (E01 buttons) == the formula ${pct(cellOk, 26)}; the published payout examples ${pct(pv, SPEC_PAYOUTS.length)}; the two buttons shown before every guess (options.hi / options.lo: n == the table for the card showing, multiplier == 99/100 × Π 13/n over the right guesses so far and the button's n, value == floor(stake × it), allowed iff that value stays within the max win) on the bet answer ${pct(sum('offerBetOk'), sum('offerBet'))} buttons and on later answers ${pct(sum('offerLaterOk'), sum('offerLater'))} (A, C, C $10, D, E, 12 Oct); the derivation reads n from the published table, never an operator odds field (the served n is only compared, HILO-10)`);
});

// ═══ HILO-14 multiplier monotonicity & bounds ═══
step(['HILO-14'], () => {
  const violations = sum('rungUpN') - sum('rungUp') + (sum('skips') - sum('skipOk'));
  const capped = ALL.some(([, t]) => (t.outcomes['capped'] || 0) > 0), deck = ALL.some(([, t]) => (t.outcomes['deck'] || 0) > 0);
  const detail = `multiplier rises with every right guess ${pct(sum('rungUp'), sum('rungUpN'))} steps; a skip leaves it unchanged ${pct(sum('skipOk'), sum('skips'))}; caps (E01 rules[5]): a right guess reaching the max win (${MAX_WIN} above the stake, E02) settles "capped": witnessed ${!!capped}; a right guess on the 52nd card settles "deck": witnessed ${deck}`;
  if (violations) record('HILO-14', false, detail + `; ${violations} violations`);
  // The HILO-14 rule (profile): "… the published caps hold …; a cap branch not witnessed in data is declared unwitnessed; a
  // violation is disclosed, not failed". Declared unwitnessed is the rule's own route, so PASS with the branches declared
  // (DL-4)
  else if (!capped || !deck) record('HILO-14', true, detail + ` — the cap branches were not reached (at a stake of at most 10 the max win needs a multiplier above ×100,000; no round of A–E turned more than ${Math.max(...ALL.slice(0, 5).map(([, t]) => t.maxCards)) - 1} cards after the start card, and the one 52-card round, 12 Oct, ended on a wrong guess, HILO-10); declared unwitnessed (DL-4), as the rule allows: PASS with the branches declared`);
  else record('HILO-14', true, detail);
});

// ═══ HILO-15 start-card, side & depth coverage ═══
step(['HILO-15'], () => {
  const per = new Map<string, number>(), perRank = new Array(13).fill(0);
  for (const v of TA.views) { const g = v.final.events.find((e) => e.type === 'guess'); if (!g) continue; const rk = rankOf(v.startCard); perRank[rk]++; per.set(`${rk}:${g.side}`, (per.get(`${rk}:${g.side}`) || 0) + 1); }
  const ranksOk = perRank.every((n) => n >= START_RANK_FLOOR), sidesOk = [...Array(13).keys()].every((r) => (per.get(`${r}:hi`) || 0) > 0 && (per.get(`${r}:lo`) || 0) > 0);
  const depth = new Map<number, number>(); let withSkip = 0; const cashDepths = new Set<number>();
  for (const v of TE.views) { const w = v.final.events.filter((e) => e.type === 'guess' && e.win).length; depth.set(w, (depth.get(w) || 0) + 1); if (v.final.events.some((e) => e.type === 'skip')) withSkip++; if (v.final.outcome === 'cashout') cashDepths.add(w); }
  const deep = [...depth.entries()].filter(([w]) => w >= PHASE_E_MIN_DEPTH).reduce((s, [, n]) => s + n, 0);
  const eOk = deep > 0 && withSkip > 0 && cashDepths.size >= 3;
  const detail = `Phase A start ranks ${perRank.join('/')} (each ≥ ${START_RANK_FLOOR}: ${ranksOk}), both sides guessed on every rank: ${sidesOk} (per rank × side ${Math.min(...per.values())}–${Math.max(...per.values())}); Phase E right guesses per round ${JSON.stringify(Object.fromEntries([...depth.entries()].sort((a, b) => a[0] - b[0])))}, ${deep} rounds with ≥ ${PHASE_E_MIN_DEPTH}, ${withSkip} with skips, cash-outs after ${[...cashDepths].sort((a, b) => a - b).join(', ')} right guesses`;
  if (ranksOk && sidesOk && eOk) record('HILO-15', true, detail); else captureFlag('HILO-15', detail + ' — a coverage shortfall of the capture plan');
});

// ═══ HILO-16 wallet / balance reconciliation (the platform's bet history, E03; the account reconciliation, E04) ═══
step(['HILO-16'], () => {
  const e3 = readJson('evidence/E03-hilo-bet-history-2026-10-13.json'); const led = new Map<string, any>(e3.rows.map((r: any) => [r.id, r]));
  let n = 0, ok = 0;
  for (const d of [A, C, C10, D, E, O]) for (const r of d.rounds) {
    n++; const v = view(r); if (!isView(v)) continue; const x = led.get(r.roundId);
    if (x && units8(x.stake) === v.stake8 && units8(x.payout) === units8(v.final.payout) && x.game === 'housegames-hilo' && x.status === (units8(v.final.payout) > 0n ? 'won' : 'lost')) ok++;
  }
  // E04 is checked by its NUMBERS, not by the shape of a line. Exact decimals (1e-8 units) throughout.
  const e4 = readFileSync(join(ROOT, 'evidence', 'E04-account-reconcile-2026-10-13.txt'), 'utf8');
  const d8 = (t: string): bigint => { const m = /^([+-]?)(\d+)(?:\.(\d{1,8}))?$/.exec(t); if (!m) throw new Error(`E04: not an 8-dp decimal: ${t}`); const x = BigInt(m[2]) * 100000000n + BigInt((m[3] || '').padEnd(8, '0')); return m[1] === '-' ? -x : x; };
  const e4rows = [...e4.matchAll(/^(\S+\.json)\s+(\d+)\s+(\S+)\s+(\S+)\s+([+-]\S+)$/gm)].map((m) => ({ file: m[1], rounds: Number(m[2]), staked: d8(m[3]), paid: d8(m[4]), net: d8(m[5]) }));
  const tot = /^TOTAL\s+(\d+)\s+(\S+)\s+(\S+)\s+([+-]\S+)$/m.exec(e4);
  const ledL = /^ledger: (\d+) entries = (\d+) captured rounds matched exactly \+ (\d+) open \+ (\d+) from 10 Oct; unexplained (\d+)$/m.exec(e4);
  const after = /^wallet cash balance after \(server, 8 dp\): (\S+)/m.exec(e4);
  const bal = /^balance before = after - net (\S+) \+ open stakes (\S+) = (\S+)$/m.exec(e4);
  // E04 is the bare output (no header line), so the --before argument of the command (H2, MANIFEST#evidence) is held here
  const argBefore = /--before (\S+)`/.exec(e4) ?? [null, '986.84718000'];
  const arith = !!tot && !!ledL && !!after && !!bal && !!argBefore && /\nRECONCILED\n?$/.test(e4)
    && e4rows.every((x) => x.paid - x.staked === x.net)
    && e4rows.reduce((a, x) => a + x.rounds, 0) === Number(tot[1]) && e4rows.reduce((a, x) => a + x.staked, 0n) === d8(tot[2]) && e4rows.reduce((a, x) => a + x.paid, 0n) === d8(tot[3]) && d8(tot[3]) - d8(tot[2]) === d8(tot[4])
    && Number(ledL[1]) === Number(ledL[2]) + Number(ledL[3]) + Number(ledL[4]) && Number(ledL[2]) === Number(tot[1]) && Number(ledL[5]) === 0
    && d8(bal[1]) === d8(tot[4]) && d8(after[1]) - d8(bal[1]) + d8(bal[2]) === d8(bal[3]) && d8(bal[3]) === d8(argBefore[1]);
  // each package file's row (rounds, staked, paid) == the package's own count and sums from the file (every round settles in its record)
  const files: [string, string, Dataset, Tally][] = [['A', PRIMARY_FILE, A, TA], ['C', PHASE_C_FILE, C, TC], ['C $10', PHASE_C10_FILE, C10, TC10], ['D', PHASE_D_FILE, D, TD], ['E', PHASE_E_FILE, E, TE], ['12 Oct', OPEN_FILE, O, TO]];
  const fileRows = files.map(([k, f, d, t]) => { const e = e4rows.find((x) => x.file.endsWith('/' + f.split('/').pop()));
    const st = t.views.reduce((a, x) => a + x.stake8, 0n), pd = t.views.reduce((a, x) => a + units8(x.final.payout), 0n);
    return { k, nr: d.rounds.length, ok: !!e && t.views.length === d.rounds.length && e.rounds === d.rounds.length && e.staked === st && e.paid === pd }; });
  const sums = fileRows.filter((x) => x.ok).length;
  const gameRows = e4rows.filter((x) => /housebets-hilo-/.test(x.file)); const gameE4 = gameRows.reduce((a, x) => a + x.rounds, 0); const gamePkg = fileRows.reduce((a, x) => a + x.nr, 0);
  record('HILO-16', ok === n && e3.rows.length === n && arith && sums === files.length && gameRows.length === files.length && gameE4 === gamePkg,
    `every hilo round of the package (A, C, C $10, D, E and the 12 Oct file) is in the platform's bet history with the same stake, payout and won/lost status: ${pct(ok, n)} (E03, ${e3.rows.length} rows); E04 checked by its numbers: ${e4rows.length} dataset rows sum to the TOTAL row (${tot?.[1]} rounds, staked and paid exact to 1e-8, each row's net == paid − staked), the ledger line adds up (${ledL?.[1]} entries = ${ledL?.[2]} captured + ${ledL?.[3]} open + ${ledL?.[4]} from 10 Oct, captured == TOTAL, unexplained ${ledL?.[5]}), and balance after ${after?.[1]} − net ${bal?.[1]} + open stakes ${bal?.[2]} == ${bal?.[3]} == the command's --before input ${argBefore[1]}: ${arith}; each of the package's ${files.length} files' row (rounds, staked, paid) == the package's own count and sums from the file: ${pct(sums, files.length)}; E04's hilo rows: ${gameRows.length}, ${gameE4} rounds == the ${gamePkg} rounds of this package's files: ${gameE4 === gamePkg}; the per-round balance field is not used (other games were captured at the same time, MANIFEST.md DL-7)`);
});

// ═══ HILO-17 multi-guess parity (Phase E) ═══
step(['HILO-17'], () => {
  const multi = TE.views.filter((v) => v.final.events.filter((e) => e.type === 'guess' && e.win).length >= 2).length;
  const ok = RP.E.replays === 0 && RP.E.notSent === 0 && clean(TE) && TE.rungOk === TE.rungs && TE.prefix === TE.n && TE.skipOk === TE.skips && TE.pay === TE.n && multi > 0 && TE.n === EXPECTED_PHASE_E_ROUNDS;
  record('HILO-17', ok, `Phase E ${TE.n} guess chains, every action on a fresh generation (${RP.E.replays} replays): every intermediate value after a right guess == the formula at that depth ${pct(TE.rungOk, TE.rungs)}; every cash-out and payout == the replay ${pct(TE.pay, TE.n)}; every step's cards are a prefix of the settled cards ${pct(TE.prefix, TE.n)} (the sequence is fixed before the first guess); skips never change the multiplier ${pct(TE.skipOk, TE.skips)}; ${multi} rounds with ≥ 2 right guesses; all datasets: prefix ${pct(sum('prefix'), sum('n'))}`);
});

// ═══ HILO-18 anti-circularity: the win chance from the 13 ranks and the rule alone ═══
step(['HILO-18'], () => {
  let ok = 0; for (let r = 0; r < 13; r++) for (const s of SIDES) { const w = [...Array(13).keys()].filter((t) => wins(r, s, t)).length; if (w === nOf(r, s) && w === (s === 'hi' ? BUTTONS[r].hiN : BUTTONS[r].loN)) ok++; }
  // negative control: corrupt the first turned card of Phase A round 0 → the stream check and the replay reject it
  const v = TA.views[0], s = A.seeds.find((x) => x.hashedServerSeed === v.final.fairness.hashedServerSeed)!;
  const derived = streamCards(s.revealedServerSeed, s.clientSeed, v.final.fairness.nonce, v.turned.length).cards;
  const forged = [(v.turned[0] + 13) % 52, ...v.turned.slice(1)];
  const rejected = JSON.stringify(derived) !== JSON.stringify(forged);
  record('HILO-18', ok === 26 && rejected, `enumeration over the 13 ranks under the published rule: the count of winning next ranks == n == the button table (E01) for ${pct(ok, 26)} (rank, side) cells, so a guess on n ranks wins with chance n/13 (E01 "cards": 1 in 13 per rank); no operator win-chance field is read; negative control: round idx ${v.r.idx} with its first turned card moved one rank (${v.turned[0]} → ${forged[0]}) is rejected by the stream recomputation: ${rejected}`);
});

// ═══ HILO-19 effective RTP vs claim (RTP-CLAIM 1.2.0 table, exact; enforced) ═══
const gate = input('gate', () => (runRtpClaimGate())); const rtp = input('rtp', () => (gate.result));
step(['HILO-19'], () => { extraLines.set('HILO-19', gate.lines); });   // the rule's own lines, printed under the step
step(['HILO-19'], () => {
  const toF = (s: string) => { const [n, d] = s.split('/').map(BigInt); return Number(n * 10n ** 15n / d) / 1e15; };
  const lo = toF(rtp.trueMin.rtpExact), hi = toF(rtp.trueMax.rtpExact);
  const firstCells = BUTTONS.flatMap((b, r) => SIDES.map((s) => { const n = nOf(r, s); return { cell: `${b.rank} ${s}`, rtp: Number(multiplier8([n]) * BigInt(n)) / (1e8 * 13) }; }));
  const fMin = firstCells.reduce((a, b) => (b.rtp < a.rtp ? b : a)), fMax = firstCells.reduce((a, b) => (b.rtp > a.rtp ? b : a));
  const stake8 = units8(MIN_STAKE); let worstTrunc = 0;
  for (let n = 1; n <= 12; n++) { const m = multiplier8([n]); const exact = Number(stake8 * m) / 1e8, fl = Number(payout8(stake8, m)); const loss = (exact - fl) * (n / 13) / Number(stake8); if (loss > worstTrunc) worstTrunc = loss; }
  // the profile's own condition (a cell above the claim beyond the band is a FLAG); a house-side miss is the rule's alone
  const ok = rtp.playerFavourable === 0;   // the rule's outcome and the committed table: recordRtpClaim
  const pc = readPublishedClaim(); const claimNum = Number(pc.figurePct) / 100;
  recordRtpClaim('HILO-19', ok, gate, `${rtp.settings} settings (every n-sequence up to depth ${RTP_MAX_DEPTH}; depth 1 = the 12 values of n, onto which the 26 start rank × side cells map): derived RTP ${lo.toFixed(12)} (${rtp.trueMin.setting}) … ${hi.toFixed(12)} (${rtp.trueMax.setting}) vs the flat claim read from the exhibits now, the highest figure stated: ${pc.places.map((p) => `${p.place} ${p.figures.map((f) => { const [a, b] = f.split('/').map(Number); return `${+(a / b * 100).toFixed(6)} %`; }).join(', ')}`).join('; ')} → ${pc.figurePct} %: largest gap ${(claimNum - lo).toExponential(2)}, from cutting the multiplier to 8 decimals; first-guess cells ${fMin.rtp.toFixed(12)} (${fMin.cell}) … ${fMax.rtp.toFixed(12)} (${fMax.cell}); deeper than ${RTP_MAX_DEPTH} the cut costs < 1e-8·Π n_i/13^k (below 0.99, never above); the committed table keeps all ${rtp.rows.length} rows (complete: ${rtp.rowsComplete}); ${rtp.houseSideFailures} house-side beyond the 0.1 pp band, ${rtp.playerFavourable} player-favourable → RTP-CLAIM ${rtp.outcome} (rule ${rtp.rule} ${rtp.ruleVersion.split(' ')[0]}, enforced ${RTP_CLAIM_RULE_ENFORCED}: ${gate.status}); payout truncation to 1e-8 at the ${MIN_STAKE} minimum stake costs at most ${worstTrunc.toExponential(2)} of RTP on a first guess (disclosed); committed table matches: ${gate.tableMatches}`);
});

// ═══ HILO-20 / HILO-21 the simulation, re-run in full and compared with the pinned census ═══
/** '' when the pinned census ships; else the words the census checks print (and censusSame is false: FAIL). */
function censusMissing(): string { return existsSync(join(ROOT, 'outputs', 'simulation-results.json')) ? '' : ' (outputs/simulation-results.json is MISSING: the re-run has nothing to equal, FAIL)'; }
let cen: Census; let censusSame = false;
step(['HILO-20'], () => {
  cen = census([['A', A], ['C', C], ['C $10', C10], ['D', D], ['E', E], ['12 Oct', O]]);   // Pass 2 replays every revealed seed of every dataset (labels as src/loader.ts ALL_DATASETS)
  const committed = (existsSync(join(ROOT, 'outputs', 'simulation-results.json')) ? readFileSync(join(ROOT, 'outputs', 'simulation-results.json'), 'utf8') : null);
  censusSame = censusText(cen) === committed;
  mkdirSync(join(ROOT, 'outputs', 'run'), { recursive: true });
  writeFileSync(join(ROOT, 'outputs', 'run', 'simulation-results.json'), censusText(cen));
});
step(['HILO-20'], () => {
  const p1 = cen.pass1; const exp = p1.draws / SIM_UNIFORMITY_BINS;
  const chi2 = p1.bins.reduce((s, o) => s + (o - exp) ** 2 / exp, 0), pChi = chiSquaredPValue(chi2, SIM_UNIFORMITY_BINS - 1);
  const n = p1.lag1.n, sx = Number(BigInt(p1.lag1.sumX)), sx2 = Number(BigInt(p1.lag1.sumX2)), sxy = Number(BigInt(p1.lag1.sumXY));
  const mean = sx / n, varr = sx2 / n - mean * mean, r1 = (sxy / (n - 1) - mean * mean) / varr, z1 = r1 * Math.sqrt(n), pLag = twoSidedNormalP(z1);
  const runs = runsStatisticFromCounts(p1.runs.runs, p1.runs.n1, p1.runs.n), pRuns = twoSidedNormalP(runs.z);
  const screens = pChi >= ALPHA_SCREEN && pLag >= ALPHA_SCREEN && pRuns >= ALPHA_SCREEN;
  const cls = cen.classes.map((c) => {
    const pw = c.n / 13, m = Number(BigInt(c.multiplier8)) / 1e8, rtpE = Number(BigInt(c.multiplier8) * BigInt(c.n)) / (1e8 * 13);
    const rtpS = (c.wins * m) / c.rounds, se = Math.sqrt(pw * (1 - pw)) * m / Math.sqrt(c.rounds);
    return { label: c.label, rtpS, rtpE, se, ok: Math.abs(rtpS - rtpE) <= EDGE_SIGMAS * se + EDGE_BUFFER && c.rounds >= FLOOR_CLASS_ROUNDS, fa: edgeBandFalseAlarm(c.rounds, pw, m, rtpE).rate };
  });
  const allCells = new Set(cen.classes.map((c) => `${c.rank}:${c.side}`)).size === FLOOR_CLASSES;
  const ownSeeds = new Set(cen.classes.flatMap((c) => [classSeed(c.rank, c.side, 0).server, classSeed(c.rank, c.side, 0).client])).size === 2 * FLOOR_CLASSES;   // no two classes on one seed label
  const depth = p1.draws === SIM_UNIFORMITY_DRAWS && p1.draws >= FLOOR_UNIFORMITY_DRAWS && ownSeeds && cen.classes.length === FLOOR_CLASSES && cen.classes.every((c) => c.rounds === CLASS_ROUNDS && c.rounds >= FLOOR_CLASS_ROUNDS);
  const uFa = uniformityScreenFalseAlarm(CARDS, SIM_UNIFORMITY_BINS, p1.draws, ALPHA_SCREEN);
  const ok = censusSame && screens && cls.every((c) => c.ok) && allCells && depth;
  const halves = cls.map((c) => ({ label: c.label, half: EDGE_SIGMAS * c.se + EDGE_BUFFER }));
  const hMin = halves.reduce((a, b) => (b.half < a.half ? b : a)), hMax = halves.reduce((a, b) => (b.half > a.half ? b : a)); const wide = halves.filter((h) => h.half > 0.01).length;
  record('HILO-20', ok, `census re-run in full == the pinned outputs/simulation-results.json byte for byte: ${censusSame}${censusMissing()}; ${p1.draws.toLocaleString('en')} fresh cards over the 52 ids: chi² ${chi2.toFixed(2)} (df ${SIM_UNIFORMITY_BINS - 1}) p ${pChi.toFixed(4)}, lag-1 r ${r1.toExponential(2)} z ${z1.toFixed(3)} p ${pLag.toFixed(4)}, runs about id ${RUNS_MID} z ${runs.z.toFixed(3)} p ${pRuns.toFixed(4)} (each ≥ α/3 = ${ALPHA_SCREEN.toFixed(4)}: ${screens}); ${cls.filter((c) => c.ok).length}/${cls.length} first-guess classes (13 start ranks × 2 sides, ${CLASS_ROUNDS.toLocaleString('en')} rounds each, every class on its own seeds: ${ownSeeds}; ${(cls.length * CLASS_ROUNDS).toLocaleString('en')} rounds in all) within 5·SE + 1e-4 of the exact RTP; worst |Δ|/SE ${Math.max(...cls.map((c) => Math.abs(c.rtpS - c.rtpE) / c.se)).toFixed(2)} (${cls.reduce((a, b) => (Math.abs(b.rtpS - b.rtpE) / b.se > Math.abs(a.rtpS - a.rtpE) / a.se ? b : a)).label}); band: |RTP_sim − RTP_exact| ≤ ${EDGE_SIGMAS}·SE + ${EDGE_BUFFER}, SE = σ/√n per class, half-width ${hMin.half.toExponential(3)} (${hMin.label}) … ${hMax.half.toExponential(3)} (${hMax.label}); ${wide} of ${cls.length} classes have a half-width wider than the 1 % house edge; false-alarm rates: uniformity ${fmtRate(uFa.rate)}, worst class ${fmtRate(Math.max(...cls.map((c) => c.fa)))}`);
});
step(['HILO-21'], () => {
  const ep = cen.pass2.epochs; const epA = ep.filter((e) => e.set === 'A');
  // the payout-weighted (pooled) return of the Phase A epochs, scored until 14 Oct 2026 on Phase A only; printed, not scored
  let R = 0n, M = 0n, V = 0n, nn = 0; for (const e of epA) { R += BigInt(e.early.ret8!); M += BigInt(e.early.mean13!); V += BigInt(e.early.var169!); nn += e.early.rounds; }
  const z = (Number(R) - Number(M) / 13) / Math.sqrt(Number(V) / 169), p = normalLowerTailP(z);
  let Rr = 0n, Mr = 0n, Vr = 0n; for (const e of epA) { Rr += BigInt(e.ref.ret8!); Mr += BigInt(e.ref.mean13!); Vr += BigInt(e.ref.var169!); }
  const zRef = (Number(Rr) - Number(Mr) / 13) / Math.sqrt(Number(Vr) / 169);
  // the SCORED statistic, over every played slot of every revealed seed (each round's first guess): each slot's return minus
  // its exact mean, ÷ its exact sd, summed and ÷ √slots; for a guess on n ranks the multiplier cancels: (win − n/13)/√((n/13)(1 − n/13))
  const std = (es: Census['pass2']['epochs'], w: 'early' | 'ref') => { let t = 0, k = 0, byOk = true;
    for (const e of es) { let r = 0, wn0 = 0, ret = 0n; for (const [ns, [rounds, wn]] of Object.entries(e[w].byN)) { const q = Number(ns) / 13; t += (wn - rounds * q) / Math.sqrt(q * (1 - q)); k += rounds; r += rounds; wn0 += wn; ret += BigInt(wn) * multiplier8([Number(ns)]); }
      if (r !== e[w].rounds || wn0 !== e[w].wins || (e[w].ret8 !== undefined && ret !== BigInt(e[w].ret8!))) byOk = false; }
    const zz = t / Math.sqrt(k); return { z: zz, p: normalLowerTailP(zz), n: k, byOk }; };
  const sEarly = std(ep, 'early'), sRef = std(ep, 'ref');
  const perSet = ALL_DATASETS.map(([k]) => ({ k, seeds: ep.filter((e) => e.set === k).length, ...std(ep.filter((e) => e.set === k), 'early') }));
  const below = epA.filter((e) => Number(BigInt(e.early.ret8!)) < Number(BigInt(e.early.mean13!)) / 13).length;
  // the early window is the capture itself: every revealed seed with captured rounds has an epoch; its captured rounds are
  // nonces 1 … n with no gap; its early window is exactly those n nonces and its wins per n == the SERVED first-guess results
  const sets: [string, Dataset][] = [['A', A], ['C', C], ['C $10', C10], ['D', D], ['E', E], ['12 Oct', O]];
  const byKey = new Map(ep.map((e) => [`${e.set}|${e.seedHash}`, e])); const allSlots: Slot[] = [];
  let revealed = 0, withRounds = 0, windowOk = 0, contiguous = 0, skipFirst = 0; const missing: string[] = [];
  for (const [k, d] of sets) { const slots = playedSlots(d);
    for (const s of d.seeds) { revealed++; const pl = slots.get(s.hashedServerSeed); if (!pl?.length) continue; withRounds++; allSlots.push(...pl); skipFirst += pl.filter((x) => x.c > 0).length;
      if (pl.every((x, i) => x.nonce === i + 1)) contiguous++;
      const e = byKey.get(`${k}|${s.hashedServerSeed}`); if (!e) { missing.push(`${k} epoch ${s.epoch}`); continue; }
      const cap = new Map<string, [number, number]>(); for (const x of pl) { const c = cap.get(String(x.n)) || [0, 0]; c[0]++; if (x.won) c[1]++; cap.set(String(x.n), c); }
      if (e.early.rounds === pl.length && e.early.rounds + e.ref.rounds === SIM_PASS2_NONCES && cap.size === Object.keys(e.early.byN).length
        && [...cap].every(([c, [r, w]]) => e.early.byN[c]?.[0] === r && e.early.byN[c]?.[1] === w)) windowOk++; } }
  const roundsAll = sets.reduce((a, [, d]) => a + d.rounds.length, 0);
  // Phase A: the early window's payout-weighted return must equal the sum of the served multipliers on Phase A wins
  const served = TA.served8, earlyAll = R;
  const firstN = allSlots.map((x) => x.n);
  const minN = Math.min(...firstN), atMin = firstN.filter((x) => x === minN).length, topMult = (Number(multiplier8([minN])) / 1e8).toFixed(2);
  const sd = Math.sqrt(Number(V) / 169) / 1e8;
  const zPow = -normalQuantile(SIM_PASS2_STD_ALPHA) + normalQuantile(0.8);
  // power of the scored statistic: a uniform per-round RTP deficit d moves every slot's standardised term by d/σ_i (σ_i its
  // return sd per unit stake), so z moves by d·Σ(1/σ_i)/√slots; 80 % power at the scored level needs zPow
  let inv = 0; for (const x of firstN) { const q = x / 13, m = Number(multiplier8([x])) / 1e8; inv += 1 / (m * Math.sqrt(q * (1 - q))); }
  const powStd = zPow * Math.sqrt(firstN.length) / inv * 100;
  const deficitPooled = ((-normalQuantile(SIM_PASS2_ALPHA) + normalQuantile(0.8)) * sd) / nn * 100;
  const depthOk = SIM_PASS2_NONCES >= FLOOR_PASS2_NONCES && epA.length === EXPECTED_SEEDS && epA.every((e) => e.early.rounds === EXPECTED_EPOCH_SIZE);
  const faOk = PASS2_FALSE_ALARM.rate <= FAIL_FALSE_ALARM_CAP && PASS2_FALSE_ALARM.statistic === SIM_PASS2_STATISTIC && PASS2_FALSE_ALARM.level === SIM_PASS2_STD_ALPHA && PASS2_FALSE_ALARM.slots === sEarly.n;
  const ok = censusSame && depthOk && served === earlyAll && sEarly.byOk && sRef.byOk && ep.length === withRounds && missing.length === 0 && contiguous === withRounds && windowOk === withRounds
    && allSlots.length === sEarly.n && sEarly.p >= SIM_PASS2_STD_ALPHA && faOk;
  record('HILO-21', ok, `${censusMissing() ? `census${censusMissing()}; ` : ''}${ep.length} revealed seeds × ${SIM_PASS2_NONCES.toLocaleString('en')} nonces: every revealed seed of every dataset (${perSet.map((x) => `${x.k} ${x.seeds}`).join(', ')}; ${withRounds} of the ${revealed} revealed seeds carry captured rounds); early window = the nonces the capture played on the seed (1..${EXPECTED_EPOCH_SIZE} on a 13 Oct pair, 1..n on a 12 Oct pair), reference = the rest of 1..${SIM_PASS2_NONCES.toLocaleString('en')}; each nonce replays a round the capture played on that seed by its FIRST guess (the rank it was made on and its side, judged by the stream card at that guess's place; ${skipFirst} of the ${allSlots.length} rounds skipped before it; a later guess depends on the cards before it and is not replayed); scored statistic (${SIM_PASS2_STATISTIC}, src/sim-config.ts; switched from the payout-weighted return on 14 Oct, AFTER that result was known — both printed): each played slot's return minus its exact mean ÷ its exact sd, summed and ÷ √slots, over the ${sEarly.n} early-window slots (one per captured round: ${roundsAll}), every one scored (the largest first-guess multiplier is ${topMult}× on n = ${minN}, ${atMin} slots): z ${sEarly.z.toFixed(3)}, one-sided p ${sEarly.p.toFixed(4)} (≥ ${SIM_PASS2_STD_ALPHA}, the level set from the false-alarm calibration: ${sEarly.p >= SIM_PASS2_STD_ALPHA}); reference window z ${sRef.z.toFixed(3)}; per dataset, printed, not scored: ${perSet.map((x) => `${x.k} z ${x.z.toFixed(3)} (${x.n} slots)`).join(', ')}; per-n census counts sum to the window totals and returns: ${sEarly.byOk && sRef.byOk}; every seed's captured rounds are nonces 1..n with no gap: ${pct(contiguous, withRounds)}; early window == the served first-guess results, n by n: ${pct(windowOk, withRounds)} seeds${missing.length ? ` (no epoch for ${missing.join(', ')})` : ''}; the payout-weighted return of the Phase A epochs (scored until 14 Oct at ${SIM_PASS2_ALPHA}, printed): early z ${z.toFixed(3)}, p ${p.toFixed(4)}, reference z ${zRef.toFixed(3)}; ${below} Phase A epochs below expectation, ${epA.length - below} at or above; Phase A early window == the captured served multipliers: ${served === earlyAll}; detection power of the scored statistic: a ${powStd.toFixed(2)} pp per-round RTP deficit at 80 % (the Phase A payout-weighted return's ${deficitPooled.toFixed(2)} pp); false-alarm rate of the scored rule ${PASS2_FALSE_ALARM.rate} ± ${PASS2_FALSE_ALARM.standardError} at ${SIM_PASS2_STD_ALPHA} over the ${PASS2_FALSE_ALARM.slots} played slots (== this run's ${sEarly.n}: ${PASS2_FALSE_ALARM.slots === sEarly.n}; on the 6,500 Phase A slots at 0.01 it was ${PASS2_FALSE_ALARM_STD_AT_001.rate} ± ${PASS2_FALSE_ALARM_STD_AT_001.standardError}, above the cap: the reason for the 0.008 level), of the Phase A payout-weighted rule ${PASS2_FALSE_ALARM_POOLED.rate} ± ${PASS2_FALSE_ALARM_POOLED.standardError} at ${SIM_PASS2_ALPHA} (src/false-alarm-pass2.ts, npm run false-alarm:pass2; cap ${FAIL_FALSE_ALARM_CAP})`);
});

// ═══ HILO-22 live-sample fit (INFORMATIONAL) ═══
step(['HILO-22'], () => {
  const cards = [...TA.views, ...TE.views].flatMap((v) => v.turned);
  const ranks = new Array(13).fill(0); for (const c of cards) ranks[rankOf(c)]++;
  const e = cards.length / 13, chi2 = ranks.reduce((s, o) => s + (o - e) ** 2 / e, 0), pChi = chiSquaredPValue(chi2, 12);
  const ids = new Array(52).fill(0); for (const c of cards) ids[c]++;
  const e52 = cards.length / 52, chi52 = ids.reduce((s, o) => s + (o - e52) ** 2 / e52, 0), p52 = chiSquaredPValue(chi52, 51);
  record('HILO-22', true, `${cards.length} captured turned cards (Phase A + E): ranks chi² ${chi2.toFixed(2)} (df 12) p ${pChi.toFixed(4)}; card ids chi² ${chi52.toFixed(2)} (df 51) p ${p52.toFixed(4)} — informational (a sample of this size has little power and never bears the verdict)`);
});

// ═══ HILO-31 start-card carry-over ═══
step(['HILO-31'], () => {
  // the server starts each round on the card the client sent (E06: the page sends S.startCard); carry-over is the page's
  // behaviour, so count how many rounds of the capture started on a card that was NOT the previous round's last card
  let same = 0, n = 0, notCarried = 0, prevLast: number | null = null;
  const ids = new Set<number>();
  for (const [, t] of ALL) { prevLast = null; for (const v of [...t.views].sort((a, b) => a.r.idx - b.r.idx)) { n++; ids.add(v.startCard); if (v.final.startCard === v.startCard && v.final.cards[0] === v.startCard) same++; if (prevLast !== null && v.startCard !== prevLast) notCarried++; prevLast = v.final.cards[v.final.cards.length - 1]; } }
  const firstCells = BUTTONS.flatMap((b, r) => SIDES.map((s) => Number(multiplier8([nOf(r, s)]) * BigInt(nOf(r, s))) / (1e8 * 13)));
  const spread = Math.max(...firstCells) - Math.min(...firstCells);
  const e6 = readJson('evidence/E06-hilo2-bundle-start-card-2026-10-10.json');
  const panelStart = pub!.panelStart;   // the rule the rules panel shows the player (E06 rulesHiloStart)
  // the risk an uncommitted start card opens, enumerated over E01's buttons and the published rule: for which next ranks t is
  // there a start rank r on which the likelier-side guess loses, and how often does that guess win with r independent of t
  const R13 = [...Array(13).keys()];
  const exposed = R13.filter((t) => R13.some((r) => !wins(r, likelierSide(r), t))).length;
  const likelyWins = R13.reduce((a, r) => a + R13.filter((t) => wins(r, likelierSide(r), t)).length, 0);
  const detail = `MEASURED, operator side: the server started every round on the start card the client sent (bet body startCard == settled startCard == cards[0]): ${pct(same, n)}; ${ids.size}/52 start card ids used; ${notCarried} of the ${n - ALL.length} rounds after the first of each dataset started on a card that was not the previous round's last card, and the server accepted them all — the start card is not fixed by the seed pair, and the carry-over (E01 "derivation") is the page's behaviour, not enforced by the server (E06: ${Object.keys(e6.excerpts).length} bundle excerpts — the page draws, carries over and sends the card); the risk this opens, enumerated over E01's buttons and rule: for ${exposed} of 13 next ranks there is a start card on which the likelier-side guess loses, while with a start card independent of the next card that guess wins ${likelyWins}/169 = ${(100 * likelyWins / 169).toFixed(1)} %; "any start card is worth the same" (the 26 first-guess cells' exact RTP spread ${spread.toExponential(2)}, HILO-19) holds only for a start card chosen independently of the stream — that independence rests on the page's code (E06: a crypto draw with a Math.random fallback, or the previous round's last card, itself a committed stream card), not on the commitment; the audited rounds are unaffected (the capture drew its start cards itself); the rules panel tells the player (E06 rulesHiloStart): "${panelStart}"; the server accepted ${notCarried} start cards that were not the previous round's last card (operator side, measured), so it does not hold a round to that published rule; a Skip draw is made in the page (E06 "free skip (ip)"), not by the server`;
  // open question 6, decided 16 Oct 2026: the start card not being committed by the seed pair
  // is an OPERATOR-origin FLAG, so the verdict is at best a Conditional Pass
  if (same !== n) record('HILO-31', false, detail);
  else record('HILO-31', false, detail + ' — OPERATOR-origin FLAG (open question 6, decided 16 Oct 2026): the start card is not committed by the seed pair; declared DL-5; whether the page shows the previous round\'s last card was not exercised (the capture sent start cards drawn with crypto.randomInt(0, 52), rig/hilo/capture-hb-hilo.mjs)', 'operator');
});

// ═══ HILO-32 abandoned-round rule (24 h), on the round left open 12 Oct ═══
step(['HILO-32'], () => {
  const lo = O.meta.leftOpen; const r = O.rounds.find((x) => x.roundId === OPEN_ROUND_ID);
  const v = r ? view(r) : null; const checks = O.meta.openChecks || [];
  let detail = 'the left-open round is not in the 12 Oct file'; let ok = false; let lateBy = '?';
  if (v && isView(v) && r) {
    const s = O.seeds.find((x) => x.hashedServerSeed === v.final.fairness.hashedServerSeed);
    const left = r.requests.filter((q) => q.status === 200 && q.response?.game?.active === true).map((q) => q.response.game);
    const L = left[left.length - 1];
    const derived = s ? streamCards(s.revealedServerSeed, s.clientSeed, Number(v.final.fairness.nonce), v.turned.length).cards : [];
    const rp = replay(v.startCard, derived, v.decisions, v.stake8, units8(v.final.maxWin ?? MAX_WIN));
    const canCash = !!L?.options?.cashout;
    const lastAt = [...r.requests].filter((q) => q.status === 200).pop()!.at!;   // the last decision, the anchor mines and road use
    const hours = (Date.parse(v.final.settledAt!) - Date.parse(lastAt)) / 3.6e6, hoursMeta = (Date.parse(v.final.settledAt!) - Date.parse(lo.at)) / 3.6e6;
    const hms = (h: number) => `${Math.floor(h)}h${String(Math.floor((h % 1) * 60)).padStart(2, '0')}m${String(Math.round(((h * 60) % 1) * 60)).padStart(2, '0')}s`;
    const cashOk = v.serverFinished && canCash && v.final.outcome === 'cashout' && units8(v.final.payout) === units8(L.value) && units8(v.final.payout) === rp.payout8 && JSON.stringify(derived) === JSON.stringify(v.turned) && v.final.cards.length === L.cards.length;
    const checksOk = checks.length > 0 && checks.slice(0, -1).every((c: any) => c.stillActive && c.hoursSinceLeft >= 24) && checks[checks.length - 1].stillActive === false;
    ok = cashOk && checksOk && hours >= 24 && !!s && sha256Hex(s.revealedServerSeed) === s.hashedServerSeed;
    detail = `published rule (E01 rules[7]): "${ABANDONED_RULE}"; round ${r.roundId.slice(0, 8)}… last decision ${lastAt} (the capture's leftOpen.at ${lo.at}) with ${L?.wins} right guess, cash-out allowed ${canCash}, value ${L?.value}; still active at ${checks.slice(0, -1).map((c: any) => c.hoursSinceLeft).join(', ')} h, not at ${checks[checks.length - 1]?.hoursSinceLeft} h; the server settled it ${v.final.settledAt} (${hms(hours)} after the last decision; ${hms(hoursMeta)} after leftOpen.at), outcome ${v.final.outcome}, payout ${v.final.payout} == its value when left == the replay over the cards recomputed from the revealed seed: ${cashOk}`;
    lateBy = hms(hours - 24);
  }
  if (!ok) record('HILO-32', false, detail);
  // The HILO-32 rule (profile): the abandoned round is revealed and recomputed, "its settlement equals the published branch",
  // the time is printed, and "a branch not exercised is declared unwitnessed". The witnessed branch settled by the rule and the
  // other is declared, so PASS; a settlement against the rule FAILs
  else record('HILO-32', true, `${detail} — the branch "otherwise the card showing is guessed on its likelier side (hi on a tie of chances) and, if the guess is right, the round is cashed out" was not exercised by the capture: declared unwitnessed (DL-6), as the rule allows: PASS with the branch declared; the close came ${lateBy} after the 24 hours, reported as observed (the profile sets no bound on it)`);
});

// ═══ HILO-06 client-seed influence, Phase D recomputation, client-seed generator ═══
step(['HILO-06'], () => {
  let changed = 0;
  for (const v of TA.views) { const s = A.seeds.find((x) => x.hashedServerSeed === v.final.fairness.hashedServerSeed)!; if (streamCards(s.revealedServerSeed, s.clientSeed + '#wrong', v.final.fairness.nonce, 1).cards[0] !== v.turned[0]) changed++; }
  const coll = TA.views.length - changed, lam = TA.views.length / 52, collBound = lam + 5 * Math.sqrt(lam) + 5;
  const seedsInOrder = D.seeds.map((s) => s.clientSeed);
  const playerSet = PHASE_D_SEEDS.every((x, i) => seedsInOrder[i] === x) && new Set(seedsInOrder).size >= 2 && D.seeds.every((s) => /^player-set/.test(s.clientSeedSource));
  let dChanged = 0;   // rule 23b: under the previous epoch's client seed the same nonces give other cards
  for (const v of TD.views) { const i = D.seeds.findIndex((x) => x.hashedServerSeed === v.final.fairness.hashedServerSeed); const s = D.seeds[i]; const prev = i === 0 ? D.preCapture?.clientSeed : D.seeds[i - 1].clientSeed; if (prev && streamCards(s.revealedServerSeed, prev, v.final.fairness.nonce, 1).cards[0] !== v.turned[0]) dChanged++; }
  const dBound = TD.views.length / 52 + 5 * Math.sqrt(TD.views.length / 52) + 5;
  const gen = [...A.seeds, ...C.seeds, ...C10.seeds, ...E.seeds].map((s) => s.clientSeedSource);
  const csprng = gen.every((g) => g === 'node:crypto randomBytes(16) hex');
  const esc = readJson('evidence/E05-hilo-empty-seed-control-2026-10-13.json').record;
  const ok = changed > 0 && coll <= collBound && clean(TD) && TD.stream === TD.n && TD.pay === TD.n && playerSet && dChanged >= TD.n - dBound && csprng && esc.status === 400 && esc.accepted === false;
  record('HILO-06', ok, `a wrong client seed changes the first turned card of ${pct(changed, TA.views.length)} Phase A rounds (${coll} chance matches, expected ${lam.toFixed(2)} at 1/52, bound ${collBound.toFixed(2)}); Phase D: player-set seeds ${JSON.stringify(seedsInOrder)} (predictable by design, disclosed DL-2), cards ${pct(TD.stream, TD.n)} and payouts ${pct(TD.pay, TD.n)} recompute, ${pct(dChanged, TD.n)} first cards change vs the previous client seed; A, C, C $10 and E client seeds LABELLED by the capture as 'node:crypto randomBytes(16) hex' on ${pct(gen.filter((g) => g === 'node:crypto randomBytes(16) hex').length, gen.length)} seeds (a label match; a redacted reference copy of the capture code is in capture/, the as-run game script is held privately, DL-2); empty-seed control: server refused, HTTP ${esc.status} (E05)`);
});

// ═══ Package checks: HILO-23, 24, 25, 27, 28, 29, 30 ═══
const manifest = input('manifest', () => (existsSync(join(ROOT, 'MANIFEST.md')) ? readFileSync(join(ROOT, 'MANIFEST.md'), 'utf8') : ''));
const readme = input('readme', () => (existsSync(join(ROOT, 'README.md')) ? readFileSync(join(ROOT, 'README.md'), 'utf8') : ''));
// The framework's standardized fairness-integrity matrix: the eight rows S5-1 … S5-8 by id AND name, in the methodology's
// order (the PLINKO profile, whose -23 check this one shares, names them). Where the vendored profile names them too, its
// list must be this one. A row renamed, reordered, added or dropped is a GAP, not only a missing status.
const S5_FRAMEWORK_ROWS = input('S5_FRAMEWORK_ROWS', () => (['Replay protection', 'Input validation', 'Seed integrity under adversarial input', 'Cross-player isolation',
  'Payout field integrity', 'Nonce sequence enforcement', 'Parameter boundary enforcement', 'Game-specific state']));
step(['HILO-23'], () => {
  const blk = /<!-- S5-MATRIX:BEGIN -->\n([\s\S]*?)\n<!-- S5-MATRIX:END -->/.exec(manifest);
  const cells = (blk ? blk[1].split('\n').filter((l) => /^\| S5-/.test(l)) : []).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  const rowsOk = cells.length === S5_FRAMEWORK_ROWS.length && S5_FRAMEWORK_ROWS.every((n, i) => cells[i][0] === `S5-${i + 1}` && cells[i][1] === n);
  const results = cells.map((c) => (/^(Pass|Flag|Hard Fail|Not tested)\b/.exec(c[3] ?? '') || [])[1] ?? null);
  const statusOk = cells.length > 0 && results.every((r) => r !== null), tiedOk = cells.every((c) => (c[4] ?? '').length > 0);
  const asserts = String((readJson(PROFILE_VENDORED).checks || []).find((c: any) => c.id === 'HILO-23')?.asserts ?? '');
  const named = /S5-1 … S5-8 \(([^)]*)\)/.exec(asserts); const profNames = named ? named[1].split(', ') : null;
  const profOk = !profNames || JSON.stringify(profNames) === JSON.stringify(S5_FRAMEWORK_ROWS.map((x) => x.toLowerCase()));
  // the printed tally separates a row that passes on every control it names from one that passes on part of them and from
  // one that is Not tested (a status that starts "Pass on" is a partial pass)
  const s5cov = (st: string[]) => { const full = st.filter((s) => /^Pass\b/.test(s) && !/^Pass on\b/.test(s)).length, part = st.filter((s) => /^Pass on\b/.test(s)).length, nt = st.filter((s) => /^Not tested\b/.test(s)).length, fl = st.filter((s) => /^Flag\b/.test(s)).length, hf = st.filter((s) => /^Hard Fail\b/.test(s)).length;
    return `${full} Pass on every control the row names, ${part} Pass on part of the controls it names, ${nt} Not tested${fl ? `, ${fl} Flag` : ''}${hf ? `, ${hf} Hard Fail` : ''}`; };
  const off = cells.map((c) => `${c[0]} ${c[1]}`).filter((x, i) => x !== `S5-${i + 1} ${S5_FRAMEWORK_ROWS[i]}`);
  record('HILO-23', !!blk && rowsOk && statusOk && tiedOk && profOk, `MANIFEST.md S5-MATRIX block: ${blk ? cells.length : 'no'} rows; ids and names == the framework's eight, in order (${S5_FRAMEWORK_ROWS.map((n, i) => `S5-${i + 1} ${n}`).join(', ')}): ${rowsOk}${off.length ? ` (differ: ${off.join('; ')})` : ''}; each result Pass / Flag / Hard Fail / Not tested: ${statusOk} (${s5cov(cells.map((c) => c[3] ?? ''))}); each tied to a check, capture or limitation: ${tiedOk}; the vendored profile ${profNames ? `names the rows: ${profOk}` : 'states the ids only (the shared PLINKO-23 text names the rows)'}`);
});
// -24: the site-verifier module (site-verifier/derive.js, generated from src/rng.ts by scripts/build-site-verifier.mjs).
// Two legs, both needed. The pins: the file on disk has the sha256 of SITE_VERIFIER_PIN (src/artifact-pins.ts) and of its
// RELEASE-MANIFEST.json entry, and MANIFEST.md and README.md quote that sha256. The replay: the module is loaded from that
// file (never bundled into verify.js), must export what src/rng.ts exports, and every function is run side by side with
// src/rng.ts on every captured round of the six shipped datasets (the rounds HILO-07 recomputes), with the inputs HILO-07
// uses: the epoch's revealed seed, the client seed and nonce of the server's settled answer, and the number of cards the
// round turned. One differing result fails the check. The pins alone would pass a module that derives something else and
// was re-pinned; the replay alone would pass a file nobody pinned.
const SITE = await loadSiteModule(ROOT, SITE_VERIFIER_PIN[0]);
step(['HILO-24'], () => {
  const [file, pin] = SITE_VERIFIER_PIN;
  const relPin: string | null = (() => { try { return readJson('RELEASE-MANIFEST.json').files?.[file] ?? null; } catch { return null; } })();
  const pinOk = SITE.sha256 !== null && SITE.sha256 === pin, relOk = SITE.sha256 !== null && SITE.sha256 === relPin;
  const cited = SITE.sha256 !== null && manifest.includes(SITE.sha256) && readme.includes(SITE.sha256);
  const names = exportNames(RNG), exportsOk = !!SITE.mod && JSON.stringify(exportNames(SITE.mod)) === JSON.stringify(names);
  const sets = [A, C, C10, D, E, O];
  function* probes(): Generator<Probe> {
    yield ['CARDS', (m) => m.CARDS];
    yield ['REJECT_AT', (m) => m.REJECT_AT];
    for (const d of sets) {
      for (const s of d.seeds) if (s.revealedServerSeed) yield ['sha256Hex', (m) => m.sha256Hex(s.revealedServerSeed)];
      const byHash = new Map(d.seeds.map((s) => [s.hashedServerSeed, s]));
      for (const r of d.rounds) {
        const v = view(r); if (!isView(v)) continue;
        const f = v.final.fairness || ({} as any); const s = byHash.get(f.hashedServerSeed); if (!s || !s.revealedServerSeed) continue;
        const nonce = Number(f.nonce);
        yield ['hmacBlock', (m) => m.hmacBlock(s.revealedServerSeed, s.clientSeed, nonce, 0)];
        const h = RNG.hmacBlock(s.revealedServerSeed, s.clientSeed, nonce, 0);
        for (let o = 0; o < 32; o += 4) { const u = h.readUInt32BE(o); yield ['cardFromU', (m) => m.cardFromU(u)]; }
        yield ['streamCards', (m) => m.streamCards(s.revealedServerSeed, s.clientSeed, nonce, v.turned.length)];
      }
    }
  }
  const rounds = sets.reduce((n, d) => n + d.rounds.length, 0);
  const rp = exportsOk ? replaySide(RNG, SITE.mod!, probes()) : null;
  const covered = rp ? names.filter((n) => rp.byLabel[n] > 0).length : 0;
  const replayOk = !!rp && rp.differences === 0 && rp.byLabel.streamCards === rounds && rounds === sum('n')
    && rounds - O.rounds.length === EXPECTED_ROUNDS + EXPECTED_PHASE_C_ROUNDS + EXPECTED_PHASE_C10_ROUNDS + EXPECTED_PHASE_D_ROUNDS + EXPECTED_PHASE_E_ROUNDS && covered === names.length;
  record('HILO-24', pinOk && relOk && cited && exportsOk && replayOk, `${file} (generated from src/rng.ts by scripts/build-site-verifier.mjs): ${SITE.sha256 === null ? 'missing' : `sha256 ${SITE.sha256}`}; == SITE_VERIFIER_PIN in src/artifact-pins.ts: ${pinOk}; == its RELEASE-MANIFEST.json pin: ${relOk}; quoted in MANIFEST.md and README.md: ${cited}; ${SITE.mod ? `the module loaded from that file exports what src/rng.ts exports (${names.join(', ')}): ${exportsOk}` : `the module did not load (${SITE.error})`}; ${rp ? `run side by side with src/rng.ts on every captured round of the ${sets.length} shipped datasets (A, C, C $10, D, E and the 12 Oct file): ${rounds} rounds, ${rp.calls} calls (${Object.entries(rp.byLabel).map(([k, v]) => `${k} ${v}`).join(', ')}; ${covered}/${names.length} exports exercised), ${rp.differences} differing result${rp.differences === 1 ? '' : 's'}${rp.first ? ` (first: ${rp.first})` : ''}` : 'not replayed'}`);
});
step(['HILO-25'], () => {
  const need = ['Verify a bet', 'Save the hashed server seed before you bet', 'rotate', 'sha256', 'not the 32 bytes', 'HMAC-SHA256', 'block b = floor(i / 8)', '4294967248', 'mod 52', 'start card', 'Higher or same', '13 / n', 'node verify-round.mjs'];
  const has = need.filter((w) => readme.includes(w));
  record('HILO-25', has.length === need.length, `README.md "Verify a bet" carries the save-the-hash-first step, where the seed is revealed, the fields, the commitment encoding, the HMAC key encoding (the seed's text, not hex-decoded), the card stream (block index, skip threshold, card = u32 mod 52), the start card, the buttons, the multiplier and a script that recomputes a round: ${has.length}/${need.length} markers${has.length < need.length ? ` (missing: ${need.filter((w) => !has.includes(w)).join(', ')})` : ''}`);
});
const artifactBad = input('artifactBad', () => (ARTIFACT_PINS.filter(([f, h]) => !existsSync(join(ROOT, f)) || sha256File(f) !== h)));
step(['HILO-27'], () => {
  const gi = existsSync(join(ROOT, '.gitignore')) ? readFileSync(join(ROOT, '.gitignore'), 'utf8') : '';
  const unignored = ARTIFACT_PINS.every(([f]) => gi.includes('!' + f));
  const noMeta = ARTIFACT_PINS.every(([f]) => existsSync(join(ROOT, f)) && !/"(runAt|generatedAt|timestamp|hostname|nodeVersion)"/.test(readFileSync(join(ROOT, f), 'utf8')));
  const cf = join(ROOT, 'outputs', 'verification-results.json');
  const recDiffs = existsSync(cf) ? beyondTolerance(fieldDiff(JSON.parse(readFileSync(cf, 'utf8')), recordOf())).length : -1;
  // verify.js is bundled from tests/verify.ts and src/; it must name the fingerprint of the sources on disk (a stale bundle is refused)
  const srcFp = sourceFingerprint(ROOT), bundleFp = bundledSourceFingerprint(ROOT); const bundleOk = bundleFp === srcFp;
  record('HILO-27', artifactBad.length === 0 && unignored && noMeta && censusSame && gate.tableMatches && recDiffs === 0 && bundleOk,
    `${ARTIFACT_PINS.length - artifactBad.length}/${ARTIFACT_PINS.length} artifacts match the sha256 pinned in src/artifact-pins.ts${artifactBad.length ? ` (mismatch: ${artifactBad.map(([f]) => f).join(', ')})` : ''}; un-ignored by name in .gitignore: ${unignored}; no run metadata: ${noMeta}; census regenerated == committed: ${censusSame}${censusMissing()}; RTP table regenerated == committed: ${gate.tableMatches}; committed verification record == this run's, field by field: ${recDiffs === 0}${recDiffs > 0 ? ` (${recDiffs} fields differ)` : recDiffs < 0 ? ' (no committed record)' : ''}; verify.js bundled from the sources on disk (fingerprint ${srcFp.slice(0, 12)}…, header ${bundleFp ? bundleFp.slice(0, 12) + '…' : 'none'}): ${bundleOk}; verify writes only outputs/run/`);
});
// HILO-28 and HILO-29 read COMMITTED records (outputs/fresh-copy.json, outputs/mutation-results.json), written by
// npm run gate:fresh / npm run mutate, pinned in RELEASE-MANIFEST.json, each carrying the fingerprint of the code and data it ran
// against (scripts/fingerprint.mjs). A record that is missing, unpinned, edited, or from other code is rejected (GAP).
const CODE_FP = input('CODE_FP', () => (codeFingerprint(ROOT)));
const relMan = input('relMan', () => (existsSync(join(ROOT, 'RELEASE-MANIFEST.json')) ? JSON.parse(readFileSync(join(ROOT, 'RELEASE-MANIFEST.json'), 'utf8')) : null));
const pinnedRecord = (rel: string) => { const p = join(ROOT, rel); if (!existsSync(p)) return { rec: null, why: 'no committed record' };
  const pinned = relMan?.files?.[rel]; const now = sha256File(rel);
  if (!pinned) return { rec: null, why: 'not pinned in RELEASE-MANIFEST.json' }; if (pinned !== now) return { rec: null, why: 'sha256 differs from its RELEASE-MANIFEST.json pin' };
  const rec = JSON.parse(readFileSync(p, 'utf8')); if (rec.codeSha256 !== CODE_FP) return { rec: null, why: `ran against other code or data (fingerprint ${String(rec.codeSha256).slice(0, 12)}…, now ${CODE_FP.slice(0, 12)}…)` };
  return { rec, why: '' }; };
step(['HILO-28'], () => {
  const { rec: fc, why } = pinnedRecord('outputs/fresh-copy.json');
  // a PROVABLY FAIR verdict is exit 0 or 2 (Conditional Pass since open question 6 was decided, 16 Oct 2026); the standalone ends the same way
  const ok = !!fc && (fc.exit === 0 || fc.exit === 2) && fc.rngTestsExit === 0 && fc.standaloneExit === fc.exit && fc.verdict === fc.standaloneVerdict && /^PROVABLY FAIR/.test(fc.verdict) && fc.reproduced === true && fc.beyondTolerance === 0 && fc.pinnedUnchanged === true && AUDIT_ID !== null;
  record('HILO-28', ok, fc ? `committed fresh-copy record (npm run gate:fresh, Node ${fc.node}, fingerprint == this code and data, pinned in RELEASE-MANIFEST.json): exit ${fc.exit}, standalone exit ${fc.standaloneExit}, verdict "${fc.verdict}", reproduced ${fc.reproduced}, regeneration vs committed ${fc.beyondTolerance} fields beyond tolerance, pinned artifacts unchanged ${fc.pinnedUnchanged}; audit ID ${AUDIT_ID ?? 'NOT ASSIGNED (pending, assigned by ProvablyFair.org)'}` : `fresh-copy record rejected: ${why}; audit ID ${AUDIT_ID ?? 'not assigned (pending, assigned by ProvablyFair.org)'}`);
  if (!fc && !why.startsWith('ran against other code')) pinFail('HILO-28', why);   // missing, unpinned or edited: FAIL, verdict-bearing (a record of other code stays a GAP)
});
step(['HILO-29'], () => {
  const { rec: mr, why } = pinnedRecord('outputs/mutation-results.json');
  const reg = JSON.parse(readFileSync(join(ROOT, 'tests', 'mutations.json'), 'utf8')).mutations.map((m: any) => m.id);
  const scoredIds = profileChecks().filter((c) => c.policy === 'HARD_FAIL' || c.policy === 'FLAG').map((c) => c.id);
  const regFull = JSON.parse(readFileSync(join(ROOT, 'tests', 'mutations.json'), 'utf8')).mutations as { id: string; kills: string; class?: string; control?: boolean; expectVerdict?: string; expectExit?: number | number[] }[];
  const all: any[] = mr?.results ?? [], res = all.filter((r) => !r.control), ctl = all.filter((r) => r.control);
  // "killed" (and a control's "held") is re-derived from each row's baseline, status, verdict and exit, never
  // taken from the row's own flag; a row whose flag disagrees makes the record inconsistent
  const decl = (id: string) => regFull.find((m) => m.id === id);
  const exitOk = (r: any) => { const e = decl(r.id)?.expectExit; return e === undefined || [].concat(e as any).includes(r.exit); };
  const verdictOk = (r: any) => { const v = decl(r.id)?.expectVerdict; return !v || String(r.verdict).startsWith(v); };
  const derivedKill = (r: any) => r.status !== 'MISSING' && r.status !== 'ERROR' && r.baseline !== 'MISSING' && r.status !== r.baseline && verdictOk(r) && exitOk(r);
  const derivedHeld = (r: any) => r.status === r.baseline && verdictOk(r) && exitOk(r);
  const consistent = !!mr && JSON.stringify(mr.registry) === JSON.stringify(reg) && mr.total === res.length && Array.isArray(mr.results) && all.length === reg.length
    && JSON.stringify(all.map((r: any) => r.id).sort()) === JSON.stringify([...reg].sort()) && mr.killed === res.filter((r: any) => r.killed).length
    && all.every((r) => !!decl(r.id) && r.kills === decl(r.id)!.kills && !!r.control === !!decl(r.id)!.control)
    && res.every((r) => r.killed === derivedKill(r)) && ctl.every((r) => r.held === derivedHeld(r));   // results are sorted by id, the registry is in file order
  const uncovered = mr ? scoredIds.filter((id) => !res.some((r: any) => r.kills === id && derivedKill(r))) : scoredIds;
  const cls = (c: string) => regFull.filter((m) => m.class === c).map((m) => m.id);
  const classKilled = (c: string) => cls(c).length > 0 && cls(c).every((id) => res.some((r) => r.id === id && derivedKill(r)));
  const ctlHeld = ctl.filter((r) => derivedHeld(r)).length;
  const ok = consistent && mr.killed === mr.total && uncovered.length === 0 && classKilled('deleted-step') && classKilled('rtp-overstated') && classKilled('profile-binding') && classKilled('operator-flag') && ctl.length > 0 && ctlHeld === ctl.length;
  record('HILO-29', ok, mr ? `committed mutation record (npm run mutate, fingerprint == this code and data, pinned in RELEASE-MANIFEST.json; registry, counts and every row's killed / held re-derived from its baseline, status, verdict and exit: ${consistent}): ${res.filter((r) => derivedKill(r)).length}/${res.length} mutations killed by their named check; scored checks with no killing mutation: ${uncovered.join(', ') || 'none'}; deleted-step ${cls('deleted-step').join(', ') || 'none'} killed: ${classKilled('deleted-step')}; RTP figure overstated, exit 5 ${cls('rtp-overstated').join(', ') || 'none'} killed: ${classKilled('rtp-overstated')}; step list unbound from the profile ${cls('profile-binding').join(', ') || 'none'} killed: ${classKilled('profile-binding')}; operator FLAG, exit 2 ${cls('operator-flag').join(', ') || 'none'} killed: ${classKilled('operator-flag')}; controls that must not move their check held ${ctlHeld}/${ctl.length}` : `mutation record rejected: ${why}`);
  if (!mr && !why.startsWith('ran against other code')) pinFail('HILO-29', why);   // missing, unpinned or edited: FAIL, verdict-bearing (a record of other code stays a GAP)
});
step(['HILO-30'], () => {
  const dl = (manifest.match(/^\| DL-\d+ \|/gm) || []).length;
  const prem = /Could the data contradict it\?/.test(manifest);
  const ev = EVIDENCE_PINS.every(([f]) => manifest.includes(f.split('/').pop()!));
  // the MANIFEST's count line ("N of M scored checks PASS, K capture-origin FLAGs") must equal this run's counts
  const sc = rows.filter((r) => (r.policy === 'HARD_FAIL' || r.policy === 'FLAG') && r.status !== 'NOTRUN');
  const runPass = sc.filter((r) => r.status === 'PASS').length, runCap = sc.filter((r) => r.status === 'FLAG' && r.origin === 'capture').length;
  const cl = /(\d+) of (\d+) scored checks PASS, (\d+) capture-origin FLAGs?/.exec(manifest);
  const countOk = !!cl && Number(cl[1]) === runPass && Number(cl[2]) === EXPECTED_STEPS && Number(cl[3]) === runCap;
  record('HILO-30', dl > 0 && prem && ev && countOk, `MANIFEST.md: ${dl} declared-limitation rows; load-bearing premises with "Could the data contradict it?": ${prem}; every exhibit E01…E${String(EVIDENCE_PINS.length).padStart(2, '0')} listed by file name: ${ev}; its count line ${cl ? `"${cl[0]}"` : 'not found'} == this run (${runPass} of ${EXPECTED_STEPS} PASS, ${runCap} capture-origin FLAGs): ${countOk}`);
});

finish();

/** The verification record: every scored check except HILO-27 (the check that compares the record with this run) and the
 *  informational check. Built the same way for HILO-27 and for outputs/run/. */
function recordOf() {
  const order = (id: string) => Number(id.split('-')[1]);
  // every package check (GRADED / RELEASE_GATE) is recorded too, except HILO-28, HILO-29, HILO-30: they attest this record itself
  // (HILO-28 and HILO-29 read gate records bound to sources that pin it; HILO-30 counts the scored PASS rows, HILO-27 among them), so verify prints them and does not record them
  const pkgRows = rows.filter((r) => (r.policy === 'GRADED' || r.policy === 'RELEASE_GATE') && !['HILO-28', 'HILO-29', 'HILO-30'].includes(r.id));
  // The placeholder rows (NOTRUN, added by finish()) stay out of the record, so a record regenerated from a run with a step
  // missing equals the one -27 builds mid-run; the missing ids are carried by the verdict
  const recRows = rows.filter((r) => (r.policy === 'HARD_FAIL' || r.policy === 'FLAG') && r.id !== 'HILO-27' && r.status !== 'NOTRUN').sort((a, b) => order(a.id) - order(b.id));
  const rf = recRows.filter((r) => r.status === 'FAIL').length, ro = recRows.filter((r) => r.status === 'FLAG' && r.origin === 'operator').length;
  const missing = notRun().filter((id) => id !== 'HILO-27');   // the record excludes HILO-27, which is recorded after it is first built
  const recVerdict = rtpClaimVerdict({ fails: rf, complete: missing.length === 0, overstated: recRows.some((r) => r.status === 'OVERSTATED'), opFlags: ro }).verdict;
  return { suite: 'housebets-hilo', profileSha256: PROFILE_SHA256, verdict: recVerdict,
    summary: { passes: recRows.filter((r) => r.status === 'PASS').length, fails: rf, overstated: recRows.filter((r) => r.status === 'OVERSTATED').length, operatorFlags: ro, captureFlags: recRows.filter((r) => r.status === 'FLAG' && r.origin === 'capture').length, packageChecks: pkgRows.length, excluded: ['HILO-27'] },
    steps: [...recRows.concat(rows.filter((r) => r.policy === 'INFORMATIONAL').sort((a, b) => order(a.id) - order(b.id))), ...pkgRows].sort((a, b) => order(a.id) - order(b.id)).map((r) => ({ id: r.id, status: r.status, origin: r.origin ?? null, detail: r.detail })) };
}

/** The scored checks (HARD_FAIL + FLAG) the profile lists that this run did not record exactly once. */
function notRun(): string[] {
  return EXPECTED_SCORED.filter((id) => rows.filter((r) => r.id === id && r.status !== 'NOTRUN').length !== 1);
}
function finish() {
  applyTaint();
  const order = (id: string) => Number(id.split('-')[1]);
  // The verdict is bound to the profile's check list. A scored check with no row (step deleted, skipped, aborted) — or with
  // more than one — is printed as NOTRUN, the verdict is INCOMPLETE and the exit is non-zero; it can never print a PASS verdict.
  const missing = notRun();
  for (const id of missing) if (!rows.some((r) => r.id === id)) { const p = prof(id); rows.push({ id, name: p.name, policy: p.policy, status: 'NOTRUN', detail: 'this run recorded no status for this scored check' }); }
  rows.sort((a, b) => order(a.id) - order(b.id));
  const scored = rows.filter((r) => (r.policy === 'HARD_FAIL' || r.policy === 'FLAG') && r.status !== 'NOTRUN');
  const fails = scored.filter((r) => r.status === 'FAIL').length;
  const opFlags = scored.filter((r) => r.status === 'FLAG' && r.origin === 'operator').length;
  const over = scored.filter((r) => r.status === 'OVERSTATED').length;
  const capFlags = scored.filter((r) => r.status === 'FLAG' && r.origin === 'capture').length;
  const passes = scored.filter((r) => r.status === 'PASS').length;
  const pb = profileBinding();
  const complete = missing.length === 0 && scored.length === EXPECTED_STEPS && pb.ok;   // and the step list bound to the vendored profile
  // RTP-CLAIM 1.2.0 ranking (rtpClaimVerdict): NOT PROVABLY FAIR (1) > INCOMPLETE (3) > RTP FIGURE OVERSTATED (5) > Conditional (2) > Full (0)
  const v = rtpClaimVerdict({ fails: fails + extraFails(), complete, overstated: over > 0, opFlags });   // + FAILs outside the scored rows and run errors
  const verdict = v.verdict === 'INCOMPLETE' ? `INCOMPLETE — ${missing.length ? `scored checks not run: ${missing.join(', ')}` : 'the step list does not match the vendored profile'}` : v.verdict;
  const pkg = rows.filter((r) => r.policy === 'GRADED' || r.policy === 'RELEASE_GATE');
  console.log(`HouseBets House Games hilo (new engine hilo2) — verification (profile HILO ${PROFILE_VERSION} ${PROFILE_SHA256.slice(0, 12)}…, ${rows.length} checks)`);
  for (const r of rows) { console.log(`  ${r.id.padEnd(8)} ${(r.status + (r.origin === 'capture' ? '*' : '')).padEnd(6)} ${r.policy.padEnd(13)} ${r.name.padEnd(46)} ${r.detail}`); for (const l of extraLines.get(r.id) ?? []) console.log(`      ${l}`); }
  console.log(`  (* capture-origin FLAG: disclosed, verdict-neutral)`);
  console.log(`scored checks (HARD_FAIL + FLAG): ${passes} PASS, ${fails} FAIL, ${over} OVERSTATED, ${opFlags} operator FLAG, ${capFlags} capture FLAG of ${scored.length} run (profile: ${EXPECTED_STEPS} scored checks${missing.length ? `; NOT RUN: ${missing.join(', ')}` : ''}); informational ${rows.filter((r) => r.status === 'INFO').length}; package checks ${pkg.filter((r) => r.status === 'PASS').length}/${pkg.length} PASS (${pkg.filter((r) => r.status === 'GAP').map((r) => r.id).join(', ') || 'no gaps'})`);
  console.log(`profile binding: ${PROFILE_VENDORED} ${pb.present ? 'present' : 'ABSENT'}, sha256 == the pin ${PROFILE_SHA256.slice(0, 12)}… ${pb.pinned}, that sha256 cited in MANIFEST.md ${pb.cited}; ${pb.checks.length} checks; src/profile-map.ts missing ${pb.missing.join(', ') || 'none'}, relabelled ${pb.relabelled.join(', ') || 'none'}, not in the profile ${pb.extra.join(', ') || 'none'}: ${pb.ok ? 'bound' : 'NOT BOUND — INCOMPLETE'}`);
  const failOutside = rows.filter((r) => r.status === 'FAIL' && r.policy !== 'HARD_FAIL' && r.policy !== 'FLAG').map((r) => r.id);
  if (failOutside.length) console.log(`FAIL outside the scored checks (verdict-bearing): ${failOutside.join(', ')}`);
  if (RUN_ERRORS.length) console.log(`run errors (${RUN_ERRORS.length}; any one fails the verdict): ${RUN_ERRORS.join(' | ')}`);
  console.log(`VERDICT: ${verdict}`);
  // the run record (outputs/run/ only) and its comparison with the committed record (HILO-27 requires them equal)
  const rec = recordOf();
  mkdirSync(join(ROOT, 'outputs', 'run'), { recursive: true });
  writeFileSync(join(ROOT, 'outputs', 'run', 'verification-results.json'), JSON.stringify(rec, null, 2) + '\n');
  const cf = join(ROOT, 'outputs', 'verification-results.json');
  if (existsSync(cf)) {
    const diffs = beyondTolerance(fieldDiff(JSON.parse(readFileSync(cf, 'utf8')), rec));
    console.log(`Reproduction vs the committed artifact on Node ${process.versions.node}: ${diffs.length === 0 ? 'REPRODUCED (outputs/verification-results.json)' : `DIFFERS (${diffs.length} fields, e.g. ${diffs.slice(0, 2).map((d: any) => d.path).join(', ')})`}`);
  }
  console.log(`runtime ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exitCode = v.exit;
}
