#!/usr/bin/env node
/* ============================================================================
 *  HouseBets House Games (new engine) — HILO capture (live bundle hilo2)  ·  ProvablyFair.org
 *  REFERENCE COPY, published with the audit package (27 Oct 2026). Comments redacted for publication (names, quotes
 *  and internal paths removed); the code is unchanged. The as-run file (sha256 1f4fb06af749c5f57e3d1b57dd78c21ba433e49e3c4db907bcb6f7e612b108ef, recorded as
 *  meta.captureScript.sha256 in the five 13 Oct 2026 datasets of this package) is held privately; this copy is not that
 *  file. The 12 Oct 2026 file records the version of the script used that day (sha256 922f2782f5977043015e8296c42dcc9edcdc381dd94786f4a7dc569f787caa47); that copy was not kept.
 *  The capture ran inside the logged-in browser tab, bundled with its node: imports replaced by browser shims;
 *  crypto-shim.reference.js is the crypto one (randomBytes = window.crypto.getRandomValues). The imports
 *  below name the capture folder's layout; multistep-common.reference.mjs and hb-capture-lib.reference.mjs are their
 *  reference copies.
 *
 *  API from the game page's bundle platform-housegames-hilo2-game.js (sha256 2bb32f6a…):
 *    POST /housegames/hilo2/bet     {generation,amount,startCard,currency}      (the CLIENT chooses the start card, 0..51)
 *    POST /housegames/hilo2/action  {generation,roundId,seq,action}  action ∈ "hi" · "lo" · "skip" · "cashout"
 *    GET  /housegames/hilo2/game    (open round)
 *    GET  /housegames/provably_fair/rounds/hilo2/<roundId> → {gameRecordId} → GET /housegames/hilo2/game_detail/<id>
 *    GET  /housegames/seeds?gameType=hilo2 · POST /housegames/change_seed {gameType:"hilo2",clientSeed}
 *  The rig sends hi/lo only when options.hi.allowed / options.lo.allowed, skip only when options.skip, and a
 *  cash-out without a win only as a labelled negative test.
 *
 *  Run from this folder: same steps as the mines capture (refresh.curl from a launched Hilo tab, --probe, full, --resume,
 *  --check-open after 24 h).  Flags: --stake=0.02 --rotate-every=10 --delay=150 --plan=full|tiny --curl --outdir --origin(mock)
 *  Supplementary phases (written 12 Oct 2026; see multistep-common.mjs phaseSetup). Hilo has no auto
 *  mode, so its "k = 1" round is: bet, one guess, cash out if right.
 *    --plan=auto1 [--rounds=6500]  Phase A: one guess per round, side CSPRNG among the offered ones, start card CSPRNG
 *    --phase=C                     200 rounds, one guess on the likelier side (hi on a tie), cash-out, at 2.00
 *    --phase=D --client-seeds=a,b,c,d [--empty-seed-control]   4 epochs × 50 one-guess rounds under typed seeds
 *    --phase=E                     600 guess chains (2–10 correct guesses, some with skips), likelier side 80 %
 * ==========================================================================*/
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseArgs, checkOrigin, LIVE_ORIGIN, runCapture, makeEngine, makeClient, rint, shuffle, dig, now, writeJsonSafe, phaseSetup, PHASE_EPOCH } from '../multistep-common.mjs';
import { loadAuth } from '../reference/hb-capture-lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const { flag } = parseArgs();
let PH = null; try { PH = phaseSetup(flag); } catch (e) { console.error('FATAL:', e.message); process.exit(2); }   // null = default run
const STAKE = PH ? PH.stake : Number(flag('stake', 0.02));
const PLAN = PH ? PH.planName : String(flag('plan', 'full'));
const CURRENCY = 1;
const SLUG = 'hilo2';
const cfg = {
  game: 'hilo', apiSlug: SLUG, fairnessSlug: SLUG, schema: 'housebets-hilo2-capture-v1',
  scriptFile: 'rig/hilo/capture-hb-hilo.mjs', scriptSha: createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
  outDir: String(flag('outdir', join(HERE, 'outputs'))), seedPrefix: 'pfhilo', rotateEvery: PH ? PH.rotateEvery : Number(flag('rotate-every', PLAN === 'tiny' ? 2 : 10)),
  origin: checkOrigin(String(flag('origin', LIVE_ORIGIN))), curl: String(flag('curl', join(HERE, 'refresh.curl'))),
  stake: STAKE, delay: Number(flag('delay', 150)), resume: !!flag('resume', false), probe: !!flag('probe', false), planName: PLAN,
  crashAfter: flag('crash-after', null) == null ? null : Number(flag('crash-after')), crashMid: flag('crash-mid', null) == null ? null : Number(flag('crash-mid')),
  verifyScript: 'verify-hilo.py', log: (m) => console.log(m), activeOf: (j) => dig(j, 'game.active') === true,
  ...(PH ? { phase: PH.phase, ph: PH } : {}),
};

// ── plan ─────────────────────────────────────────────────────────────────────
//  rank = card % 13 (bundle `Xt`): 0 lowest … 12 highest. The start card is ours to choose (bundle: the client draws it
//  with crypto.getRandomValues % 52); every start card here is CSPRNG (crypto.randomInt), stored in the plan.
//  R: CSPRNG start card, target correct guesses and skip budget; in-round choices drawn at play time and logged.
//  C: one round per start rank 0..12 (CSPRNG suit block 0..3: card = block*13 + rank), guess, then as R with depth 2.
//  S: skip while skip is offered (≤ 50), then guess until settled (the 52-card / "deck" end).
//  N: cash out with no correct guess: directly, and after one skip (refusal expected).
const DEPTHS = [1, 1, 2, 2, 3, 3, 4, 5, 6, 8];
function plan() {
  const out = []; const add = (o) => out.push({ stakeUnits: 1, ...o });
  if (PLAN === 'tiny') {
    add({ phase: 'R', kind: 'regular', startCard: rint(0, 52), depth: 2, skipBudget: 1 });
    add({ phase: 'C', kind: 'rank', startCard: rint(0, 4) * 13 + 0, depth: 1, skipBudget: 0 });
    add({ phase: 'C', kind: 'rank', startCard: rint(0, 4) * 13 + 12, depth: 1, skipBudget: 0 });
    add({ phase: 'S', kind: 'skiplimit', startCard: rint(0, 52) });
    add({ phase: 'N', kind: 'negative', variant: 'cashout-first', startCard: rint(0, 52), depth: 1, skipBudget: 0 });
    return out;
  }
  for (let i = 0; i < 60; i++) add({ phase: 'R', kind: 'regular', startCard: rint(0, 52), depth: DEPTHS[rint(0, DEPTHS.length)], skipBudget: rint(0, 4) });
  for (let rank = 0; rank < 13; rank++) add({ phase: 'C', kind: 'rank', startCard: rint(0, 4) * 13 + rank, depth: 2, skipBudget: 0 });
  add({ phase: 'S', kind: 'skiplimit', startCard: rint(0, 52) });
  add({ phase: 'N', kind: 'negative', variant: 'cashout-first', startCard: rint(0, 52), depth: 1, skipBudget: 0 });
  add({ phase: 'N', kind: 'negative', variant: 'skip-then-cashout', startCard: rint(0, 52), depth: 1, skipBudget: 0 });
  const shuffled = shuffle(out);
  shuffled.push({ stakeUnits: 1, phase: 'O', kind: 'open', startCard: rint(0, 52) });
  return shuffled;
}

// ── phase plans (supplementary phases, written 12 Oct 2026) ──────────────────────────────────────────────────
//  guess1: bet, ONE guess (side CSPRNG among the offered ones), cash out if right · likely1: the same on the likelier side
//  (rank ≤ 6 → hi, else lo; hi on the rank-6 tie, as the published 24 h rule) · E: `regular` rounds with guessMode likely80
function phasePlan(PH, { log }) {
  const one = (phase, kind) => ({ stakeUnits: 1, phase, kind, startCard: rint(0, 52) });
  if (PH.phase === 'A') {
    const total = PH.rounds ?? 6500, plan = Array.from({ length: total }, () => one('A', 'guess1'));
    const ranks = {}; for (const x of plan) ranks[x.startCard % 13] = (ranks[x.startCard % 13] || 0) + 1;
    log(`Phase A plan: ${plan.length} one-guess rounds · start card CSPRNG (start ranks ${Math.min(...Object.values(ranks))}–${Math.max(...Object.values(ranks))} per rank) · ${plan.length / PHASE_EPOCH} epochs`);
    return { plan, info: { round: 'bet · one guess (CSPRNG side among the offered ones) · cash-out if right', startRanks: ranks } };
  }
  if (PH.phase === 'C') return { plan: Array.from({ length: 200 }, () => one('C', 'likely1')), info: { round: 'bet · one guess on the likelier side (hi on the rank-6 tie) · cash-out if right', winsFloor: 100 } };
  if (PH.phase === 'D') return { plan: Array.from({ length: PH.clientSeeds.length * PHASE_EPOCH }, () => one('D', 'guess1')), info: { round: 'as Phase A' } };
  // Phase E: E1 2–3 correct guesses ×200 · E2 4–6 ×200 · E3 7–10 ×150 · E4 2–5 with a skip budget 1–3 ×50
  const out = [], add = (sub, count, df, sf) => { for (let k = 0; k < count; k++) out.push({ stakeUnits: 1, phase: 'E', kind: 'regular', sub, startCard: rint(0, 52), depth: df(), skipBudget: sf(), guessMode: 'likely80' }); };
  add('E1', 200, () => rint(2, 4), () => 0); add('E2', 200, () => rint(4, 7), () => 0); add('E3', 150, () => rint(7, 11), () => 0); add('E4', 50, () => rint(2, 6), () => rint(1, 4));
  log(`Phase E plan: ${out.length} guess chains · target correct guesses 2–10 · likelier side 80 % (CSPRNG)`);
  return { plan: shuffle(out), info: { subPhases: 'E1 depth 2–3 ×200 · E2 4–6 ×200 · E3 7–10 ×150 · E4 2–5 with skips ×50', guessMode: 'likelier side when crypto.randomInt(0,100) < 80, else the other offered side' } };
}

// ── one round ────────────────────────────────────────────────────────────────
const g = (j) => dig(j, 'game') || {};
const curRank = (j) => { const c = g(j).cards || []; return c.length ? c[c.length - 1] % 13 : null; };
const offered = (j, side) => !!(g(j).options && g(j).options[side] && g(j).options[side].allowed);
/** CSPRNG guess among the sides the server offers; on rank 0 / 12 the likely side ("hi" on 0, "lo" on 12) 70 % */
const likelier = (r) => (r <= 6 ? 'hi' : 'lo');   // n(hi) = 13 − r (12 on 0) vs n(lo) = r + 1 (12 on 12): hi on the rank-6 tie
function chooseGuess(round, j) {
  const r = curRank(j), sides = ['hi', 'lo'].filter((s) => offered(j, s));
  if (!sides.length) return null;
  const x = rint(0, 100); let choice;
  if (sides.length === 1) choice = sides[0];
  else if (round.spec.guessMode === 'likely80') { const L = likelier(r); choice = x < 80 ? L : (L === 'hi' ? 'lo' : 'hi'); }   // Phase E only
  else if (r === 0) choice = x < 70 ? 'hi' : 'lo';
  else if (r === 12) choice = x < 70 ? 'lo' : 'hi';
  else choice = x < 50 ? 'hi' : 'lo';
  round.decisions.push({ at: now(), rank: r, offered: sides, draw: x, choice, source: 'crypto.randomInt(0,100)' });
  return choice;
}
async function bet(hb, E, round) {
  round.generation = randomUUID();   // bundle: q.generation() from the host's round tracker (format not in this bundle) — UUID here
  const r = await E.req(hb, round, 'POST', `/${SLUG}/bet`, { generation: round.generation, amount: STAKE, startCard: round.spec.startCard, currency: CURRENCY });
  round.roundId = g(r.json).roundId ?? null;
  return r.json;
}
// every action carries a FRESH generation: the server treats a repeated generation as a replay and answers
// with the cached state (12 Oct live: reveals with the bet's generation returned 200 with nothing opened)
const act = (hb, E, round, cur, action, opts) => E.req(hb, round, 'POST', `/${SLUG}/action`, { generation: randomUUID(), roundId: round.roundId, seq: g(cur).seq, action }, opts);

async function playRound(hb, E, round) {
  const s = round.spec; let j = await bet(hb, E, round); let skips = 0;
  const wins = () => g(j).wins ?? 0;
  const guess = async () => { const side = chooseGuess(round, j); if (!side) return false; j = (await act(hb, E, round, j, side)).json; return true; };
  if (s.kind === 'guess1' || s.kind === 'likely1') {   // phases A/C/D: one guess, then cash out if it was right
    const r = curRank(j), sides = ['hi', 'lo'].filter((x) => offered(j, x));
    let side = null;
    if (s.kind === 'likely1') side = sides.includes(likelier(r)) ? likelier(r) : sides[0] ?? null;
    else if (sides.length) { const k = rint(0, sides.length); side = sides[k]; round.decisions.push({ at: now(), rank: r, offered: sides, draw: k, choice: side, source: `crypto.randomInt(0,${sides.length})` }); }
    if (s.kind === 'likely1') round.decisions.push({ at: now(), rank: r, offered: sides, choice: side, why: 'likelier side (hi on the rank-6 tie)' });
    if (side) j = (await act(hb, E, round, j, side)).json;
    if (g(j).active && g(j).options?.cashout) j = (await act(hb, E, round, j, 'cashout')).json;
    round.outcome = g(j).active ? 'STILL ACTIVE' : `${g(j).outcome} · ${(g(j).cards || []).length} cards · ${wins()} correct`;
    return;
  }
  if (s.kind === 'negative') {
    if (s.variant === 'skip-then-cashout' && g(j).options?.skip) { j = (await act(hb, E, round, j, 'skip')).json; skips++; }
    const neg = await act(hb, E, round, j, 'cashout', { allowFail: true, negative: `cashout with no correct guess (${s.variant})` });
    round.negativeResult = { status: neg.status, refused: neg.status !== 200 };
    if (neg.status === 200) j = neg.json;
  }
  if (s.kind === 'skiplimit') {
    while (g(j).active && g(j).options?.skip && skips < 50) { j = (await act(hb, E, round, j, 'skip')).json; skips++; }
    round.skipsOffered = { skips, cards: (g(j).cards || []).length, skipStillOffered: !!g(j).options?.skip };
    while (g(j).active) { if (!(await guess())) break; }   // guess until settled: bust, capped or the deck end
  } else {
    while (g(j).active && wins() < (s.depth ?? 1)) {
      if (skips < (s.skipBudget ?? 0) && g(j).options?.skip && rint(0, 100) < 25) { round.decisions.push({ at: now(), choice: 'skip', rank: curRank(j), source: 'crypto.randomInt(0,100) < 25' }); j = (await act(hb, E, round, j, 'skip')).json; skips++; continue; }
      if (!(await guess())) break;
    }
  }
  if (g(j).active && g(j).options?.cashout) j = (await act(hb, E, round, j, 'cashout')).json;
  round.outcome = g(j).active ? 'STILL ACTIVE' : `${g(j).outcome} · ${(g(j).cards || []).length} cards · ${wins()} correct · ${skips} skips`;
}
async function activeRound(hb) { const r = await hb.get(`/${SLUG}/game`, { allowFail: true }); return r.status === 200 && g(r.json).active === true ? r.json : null; }
async function finishInterrupted(hb, E, round) {
  let j = round.activeAtResume; round.roundId = g(j).roundId;
  round.generation = round.requests.find((q) => q.body?.generation)?.body.generation ?? randomUUID();
  if (!g(j).options?.cashout) {
    const r = curRank(j); const side = r <= 6 ? 'hi' : 'lo';   // the likelier side
    round.decisions.push({ at: now(), why: 'resume: no win yet, likelier-side guess', rank: r, choice: side });
    j = (await act(hb, E, round, j, side)).json;
  }
  if (g(j).active) j = (await act(hb, E, round, j, 'cashout')).json;
  round.outcome = `finished at resume: ${g(j).outcome}`;
}
async function afterRound(hb, E, round) {
  if (!round.roundId) return;
  const a = await hb.get(`/provably_fair/rounds/${SLUG}/${round.roundId}`, { allowFail: true });
  round.detailLookup = { path: `/provably_fair/rounds/${SLUG}/${round.roundId}`, status: a.status, response: a.json };
  const rec = dig(a.json, 'gameRecordId', 'gameRecordID'); if (rec == null) return;
  const d = await hb.get(`/${SLUG}/game_detail/${rec}`, { allowFail: true });
  round.detail = { path: `/${SLUG}/game_detail/${rec}`, status: d.status, response: d.json };
}
async function openRound(hb, E, round) {
  for (let attempt = 0; attempt < 4; attempt++) {
    let j = await bet(hb, E, round);
    const r = curRank(j); j = (await act(hb, E, round, j, r <= 6 ? 'hi' : 'lo')).json;
    if (g(j).active) { round.outcome = 'left open after one correct guess'; return round; }
    round.outcome = 'lost before the open round could start'; await afterRound(hb, E, round); E.finishRound(round);
    round = await E.startRound(hb, round.planIdx, { ...round.spec, startCard: rint(0, 52) }, 'OPEN-retry');
  }
  return round;
}
const label = (r) => `${r.spec.kind} start=${r.spec.startCard} (rank ${r.spec.startCard % 13})${r.spec.depth ? ` depth=${r.spec.depth}` : ''} → ${r.outcome}`;
const G = { roundKey: (j) => dig(j, 'game.roundId') ?? null, plan, playRound, activeRound, finishInterrupted, afterRound, openRound, label, phasePlan,
  staticPaths: [`/limits/${SLUG}`, `/${SLUG}/fairness`] };

async function probe() {
  const E = makeEngine(cfg); const auth = loadAuth(cfg.curl);
  const hb = makeClient(auth, { origin: cfg.origin, game: SLUG, log: cfg.log }); await hb.refresh();
  E.ds.meta.planName = 'probe'; E.ds.meta.kind = 'probe';
  E.ds.meta.staticReads = {}; for (const p of G.staticPaths) { const r = await hb.get(p, { allowFail: true }); E.ds.meta.staticReads[p] = { status: r.status, json: r.json }; }
  let pair = await E.anchor(hb);
  const specs = [{ phase: 'P', kind: 'regular', startCard: rint(0, 52), depth: 1, skipBudget: 1 }, { phase: 'P', kind: 'regular', startCard: rint(0, 52), depth: 2, skipBudget: 0 }];
  E.ds.meta.plan = specs;
  for (let i = 0; i < specs.length; i++) { const round = await E.startRound(hb, i, specs[i], 'PROBE'); await playRound(hb, E, round); await afterRound(hb, E, round); E.finishRound(round); console.log(`  probe round ${i}: ${label(round)}`); }
  pair = await E.closePair(hb, pair);
  const file = join(cfg.outDir, `hilo-probe-${Date.now()}.json`); writeJsonSafe(file, E.ds);
  const first = E.ds.rounds[0].requests[0]?.response;
  console.log('\n── PROBE RESULT (fields observed, not judged) ──');
  console.log(`  bet response keys ${JSON.stringify(Object.keys(first || {}))} · game keys ${JSON.stringify(Object.keys(g(first)))} · options ${JSON.stringify(g(first).options || null)} · fairness ${JSON.stringify(g(first).fairness || null)}`);
  console.log(`  detail lookup ${E.ds.rounds[0].detailLookup?.status} → detail ${E.ds.rounds[0].detail?.status}`);
  console.log(`  anchor ${E.ds.preCapture.anchorOk} · commit ${E.ds.seeds[0].commitmentValid} · chain ${E.ds.seeds[0].chainLinkOk} · witness ${E.ds.seeds[0].clientSeedDrawnAfterCommitment.equalsEpochHash}`);
  console.log(`  probe file → ${file}\n  next: python3 -I verify-hilo.py ${file}`);
}

(cfg.probe ? probe() : runCapture(cfg, G)).catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
