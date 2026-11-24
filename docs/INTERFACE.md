# Module interface the audit package uses (written by the auditor, not from the casino)

`src/rng.ts` and `src/rules.ts` (TypeScript, strict, Node `crypto` only, no dependencies) export exactly these names; the
simulation (`src/simulate.ts`) and `tests/verify.ts` take the game's algorithm from them and from nothing else.
Semantics come from [ALGORITHM.md](ALGORITHM.md); this file only fixes names, types and the package's own conventions.
Cards are ids 0..51 as HouseBets numbers them (E01 `cards`: rank = id mod 13, 0 = A … 12 = K). Amounts are bigint 1e-8
units. `Side` is `'hi' | 'lo'` (`src/types.ts`).

```ts
// src/rng.ts
export const REJECT_AT: number;   // 4294967248 = 2^32 − (2^32 mod 52); a u32 at or above it is skipped
export const CARDS: number;       // 52
// One HMAC-SHA256 block: key = serverSeed as UTF-8, message = `${clientSeed}:${nonce}:${block}`.
export function hmacBlock(serverSeed: string, clientSeed: string, nonce: number, block: number): Buffer;
// The first n stream cards of a round (turned card k = stream card k − 1), and how many u32s were skipped.
export function streamCards(serverSeed: string, clientSeed: string, nonce: number, n: number): { cards: number[]; skipped: number };
// The card for one u32, or null when it is skipped. HILO-08 censuses it over all 2^32 values.
export const cardFromU: (u: number) => number | null;
// The commitment: SHA-256 of the seed's UTF-8 text, lowercase hex.
export const sha256Hex: (s: string) => string;

// src/rules.ts
export const rankOf: (card: number) => number;                                   // card mod 13
export function wins(r: number, side: Side, t: number): boolean;               // the button rule; a tie wins "or same"
export const nOf: (r: number, side: Side) => number;                             // winning ranks n of a guess (E01 hiN / loN)
export const likelierSide: (r: number) => Side;                                  // hi on the rank-6 tie (the 24 h rule)
export function multiplier8(ns: readonly number[]): bigint;                      // floor(99·10^8·13^k / (100·Π n_i))
export const payout8: (stake8: bigint, mult8: bigint) => bigint;                 // floor(stake × multiplier) at 1e-8
export function units8(x: number | string): bigint;                              // a JSON decimal to 1e-8 units
export type Decision = Side | 'skip' | 'cashout';
export interface Replay { outcome: string; payout8: bigint; ns: number[]; error?: string; cardsShown: number }
// A whole round from its start card, the turned cards and the decisions: bust / cashout / capped / deck and the payout.
export function replay(start: number, turned: readonly number[], decisions: readonly Decision[], stake8: bigint, cap8: bigint | null): Replay;
```
The start card is an input, never derived: the stream starts with the first card turned after it. The verdict never reads
an operator field to decide an outcome: `cards`, `events`, `options`, `outcome`, `multiplier` and `payout` are compared
with these functions' results, never used as inputs.
