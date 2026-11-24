// Guess rule, multiplier and payout of HouseBets hilo (new engine), exact integer units, from the published spec (E01):
//   rank = card mod 13 (0 = A lowest … 12 = K highest); suit = card / 13
//   buttons (E01 "buttons" / rules[1]): 2 … Q: Higher or same (13 − r ranks) | Lower or same (r + 1 ranks);
//            A: Higher (12) | Same (1); K: Same (1) | Lower (12); a tie wins an "or same" guess
//   multiplier (E01 "multiplier"): after right guesses on cards where n_1 … n_k ranks win, 99/100 × Π 13/n_i cut to 8 decimals
//   payout (E01 "multiplier", rules[6]): floor(stake × multiplier) on the wallet's 1e-8 unit
//   caps (E01 rules[5]): a right guess that reaches the max win cashes the round out at that amount ("capped"),
//            and so does a right guess on the 52nd card ("deck"); a round shows at most 52 cards
// In 1e-8 units: multiplier8(ns) = floor(99·10^8 · 13^k / (100 · Π n_i)); payout8 = floor(stake8 · multiplier8 / 10^8).
import type { Side } from './types.ts';

export const rankOf = (card: number): number => card % 13;

/** Does a guess on `side` from rank r win when the next card has rank t? (E01 buttons; the bundle's replay R0/T0.) */
export function wins(r: number, side: Side, t: number): boolean {
  if (side === 'hi') return r === 0 ? t > 0 : r === 12 ? t === 12 : t >= r;
  return r === 12 ? t < 12 : r === 0 ? t === 0 : t <= r;
}

/** The number of winning ranks n for a guess on `side` from rank r (E01 hiN / loN). */
export const nOf = (r: number, side: Side): number => (side === 'hi' ? (r === 0 ? 12 : 13 - r) : (r === 12 ? 12 : r + 1));

/** The likelier side from rank r, hi on the rank-6 tie (E01 rules[7], the abandoned-round rule; Phase C plays it). */
export const likelierSide = (r: number): Side => (nOf(r, 'hi') >= nOf(r, 'lo') ? 'hi' : 'lo');

/** 99/100 × Π 13/n_i cut to 8 decimals, in 1e-8 units; 1.00000000 with no right guess. */
export function multiplier8(ns: readonly number[]): bigint {
  if (!ns.length) return 100000000n;
  let a = 99n * 100000000n, b = 100n;
  for (const n of ns) { a *= 13n; b *= BigInt(n); }
  return a / b;
}

/** floor(stake × multiplier) at 1e-8, both in 1e-8 units. */
export const payout8 = (stake8: bigint, mult8: bigint): bigint => (stake8 * mult8) / 100000000n;

/** A decimal number (as JSON gave it) to integer 1e-8 units, through its fixed 8-decimal form. */
export function units8(x: number | string): bigint {
  const s = typeof x === 'number' ? x.toFixed(8) : String(x);
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`not a decimal: ${s}`);
  const [i, f = ''] = s.replace('-', '').split('.');
  if (f.length > 8 && /[1-9]/.test(f.slice(8))) throw new Error(`more than 8 decimals: ${s}`);
  const v = BigInt(i) * 100000000n + BigInt((f + '00000000').slice(0, 8));
  return s.startsWith('-') ? -v : v;
}

export type Decision = Side | 'skip' | 'cashout';
export interface Replay { outcome: string; payout8: bigint; ns: number[]; error?: string; cardsShown: number }

/**
 * Replay a round from its start card, the turned cards and the decisions (the bundle's own replay R0, as published):
 * a wrong guess busts (pays 0); a right guess adds n to ns and, if the payout reaches stake + maxWin, settles "capped"
 * at that amount, or on the 52nd card settles "deck"; a skip turns a card and never changes the multiplier; a cash-out
 * pays floor(stake × multiplier8(ns)).
 */
export function replay(start: number, turned: readonly number[], decisions: readonly Decision[], stake8: bigint, cap8: bigint | null): Replay {
  const cards = [start]; const ns: number[] = []; let outcome = ''; let pay = 0n; let k = 0;
  for (const d of decisions) {
    if (outcome) return { outcome: '', payout8: 0n, ns, error: 'decision after the round settled', cardsShown: cards.length };
    if (d === 'cashout') {
      pay = ns.length ? payout8(stake8, multiplier8(ns)) : 0n;
      if (ns.length && cap8 !== null && cap8 > 0n && pay >= stake8 + cap8) pay = stake8 + cap8;
      outcome = 'cashout'; continue;
    }
    if (k >= turned.length) return { outcome: '', payout8: 0n, ns, error: 'more decisions than turned cards', cardsShown: cards.length };
    const b = cards[cards.length - 1], c = turned[k++]; cards.push(c);
    if (d === 'skip') continue;
    if (!wins(rankOf(b), d, rankOf(c))) { outcome = 'bust'; pay = 0n; continue; }
    ns.push(nOf(rankOf(b), d));
    const p = payout8(stake8, multiplier8(ns));
    if (cap8 !== null && cap8 > 0n && p >= stake8 + cap8) { outcome = 'capped'; pay = stake8 + cap8; }
    else if (cards.length >= 52) { outcome = 'deck'; pay = p; }
  }
  return { outcome, payout8: pay, ns, cardsShown: cards.length };
}
