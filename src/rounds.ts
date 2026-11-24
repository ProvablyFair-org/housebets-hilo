// One hilo round, read the way the verifier needs it: the bet the capture sent, the server's settled game, the steps in
// between, and the decisions those steps record. Every field comes from the server's own answers in the dataset; the
// capture's labels (round.outcome, round.decisions) are never read.
import type { Dataset, Game, Req, Round, Seed } from './types.ts';
import { units8, type Decision } from './rules.ts';

export interface RoundView {
  r: Round;
  bet: Req;                     // POST /hilo2/bet, status 200
  final: Game;                  // the settled game (last answer with active false; for a server-finished round, game_detail)
  finalReq: Req | null;         // the request whose answer settled it (null when the server finished it)
  serverFinished: boolean;
  steps: Req[];                 // POST /hilo2/action answers, status 200, in order
  decisions: Decision[];        // from the settled game's events (+ 'cashout' when it settled as a cash-out)
  stake8: bigint;
  startCard: number;
  turned: number[];             // cards[1..]
}

export function view(r: Round): RoundView | { r: Round; error: string } {
  const reqs = r.requests || [];
  const bet = reqs.find((q) => q.path === '/hilo2/bet' && q.status === 200);
  if (!bet) return { r, error: 'no bet answer' };
  let finalReq: Req | null = null;
  for (let i = reqs.length - 1; i >= 0; i--) { const g = reqs[i].response?.game; if (reqs[i].status === 200 && g && g.active === false) { finalReq = reqs[i]; break; } }
  let final: Game | undefined = finalReq?.response.game, serverFinished = false;
  const det = r.detail?.response?.game;
  if (!final && r.closedByServer && det && det.active === false) { final = det; serverFinished = true; }
  if (!final) return { r, error: 'not settled in the dataset' };
  const steps = reqs.filter((q) => q.path === '/hilo2/action' && q.status === 200);
  const decisions: Decision[] = (final.events || []).map((e) => (e.type === 'skip' ? 'skip' : (e.side as Decision)));
  if (final.outcome === 'cashout') decisions.push('cashout');
  return { r, bet, final, finalReq, serverFinished, steps, decisions, stake8: units8(bet.body.amount), startCard: Number(bet.body.startCard), turned: (final.cards || []).slice(1) };
}

export const isView = (v: RoundView | { r: Round; error: string }): v is RoundView => !('error' in v);

/** The epoch seed a round was played on: the one whose committed hash the SERVER's answer names (never the rig's `pre`). */
export function seedIndex(ds: Dataset): Map<string, Seed> { return new Map(ds.seeds.map((s) => [s.hashedServerSeed, s])); }

/** Key-sorted JSON, so two answers compare by content and not by key order. */
const canon = (x: unknown): string => JSON.stringify(x, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v));

/** Repeated `generation` = replay (the server's idempotency key; port of the capture verifier's common/hbreplay.py strip).
 *  Walks every request of every round in capture order; a request whose body.generation an earlier request already used
 *  is moved out of round.requests into round.replays, so the game checks see only real actions. Each replay answered must
 *  carry exactly the stored answer (status and body); a replay with no status was never sent and is only counted.
 *  Mutates the loaded dataset in memory (never the file). */
export function stripReplays(ds: Dataset): { replays: number; identical: number; notSent: number } {
  const first = new Map<string, [number, string]>(); let replays = 0, identical = 0, notSent = 0;
  for (const r of ds.rounds) {
    const keep: Req[] = [], moved: Req[] = [];
    for (const q of r.requests || []) {
      const g = q.body?.generation;
      if (g && first.has(g)) {
        moved.push(q);
        if (q.status == null) { notSent++; continue; }
        replays++; const [st, body] = first.get(g)!; if (q.status === st && canon(q.response) === body) identical++;
        continue;
      }
      if (g && q.status != null) first.set(g, [q.status, canon(q.response)]);
      keep.push(q);
    }
    if (moved.length) { r.requests = keep; r.replays = moved; }
  }
  return { replays, identical, notSent };
}
