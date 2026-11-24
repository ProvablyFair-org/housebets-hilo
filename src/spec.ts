// The game as HouseBets publishes it — the only source of every declared number this package holds the data to.
//   E01  GET /housegames/hilo2/fairness (the server's answer to the capture; identical on 12 and 13 Oct 2026)
//   E02  GET /housegames/limits/hilo2 (min/max bet, max win, wallet decimals; identical on 12 and 13 Oct 2026)
//   E06  the hilo2 game bundle the live page loads (start-card draw and carry-over, the bet body)
// Nothing here is read from the captured rounds. A number that is not in E01, E02 or E06 is not declared. HILO-26
// compares every constant below that copies an exhibit with the pinned exhibit before any step runs (a mismatch is exit 1).
import type { Side } from './types.ts';

/** E01 "cards": suit = id / 13, rank = id mod 13 (0 = A lowest … 12 = K highest); 1 in 13 per rank (infinite deck). */
export const RANKS = 13;
export const RANK_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

/** E01 "buttons": per rank, the hi / lo button labels, their winning-rank counts and their first-guess multipliers. */
export const BUTTONS: readonly { rank: string; hi: string; hiN: number; lo: string; loN: number; hiFirst: string; loFirst: string }[] = [
  { rank: 'A', hi: 'Higher', hiN: 12, lo: 'Same', loN: 1, hiFirst: '1.07250000', loFirst: '12.87000000' },
  { rank: '2', hi: 'Higher or same', hiN: 12, lo: 'Lower or same', loN: 2, hiFirst: '1.07250000', loFirst: '6.43500000' },
  { rank: '3', hi: 'Higher or same', hiN: 11, lo: 'Lower or same', loN: 3, hiFirst: '1.17000000', loFirst: '4.29000000' },
  { rank: '4', hi: 'Higher or same', hiN: 10, lo: 'Lower or same', loN: 4, hiFirst: '1.28700000', loFirst: '3.21750000' },
  { rank: '5', hi: 'Higher or same', hiN: 9, lo: 'Lower or same', loN: 5, hiFirst: '1.43000000', loFirst: '2.57400000' },
  { rank: '6', hi: 'Higher or same', hiN: 8, lo: 'Lower or same', loN: 6, hiFirst: '1.60875000', loFirst: '2.14500000' },
  { rank: '7', hi: 'Higher or same', hiN: 7, lo: 'Lower or same', loN: 7, hiFirst: '1.83857142', loFirst: '1.83857142' },
  { rank: '8', hi: 'Higher or same', hiN: 6, lo: 'Lower or same', loN: 8, hiFirst: '2.14500000', loFirst: '1.60875000' },
  { rank: '9', hi: 'Higher or same', hiN: 5, lo: 'Lower or same', loN: 9, hiFirst: '2.57400000', loFirst: '1.43000000' },
  { rank: '10', hi: 'Higher or same', hiN: 4, lo: 'Lower or same', loN: 10, hiFirst: '3.21750000', loFirst: '1.28700000' },
  { rank: 'J', hi: 'Higher or same', hiN: 3, lo: 'Lower or same', loN: 11, hiFirst: '4.29000000', loFirst: '1.17000000' },
  { rank: 'Q', hi: 'Higher or same', hiN: 2, lo: 'Lower or same', loN: 12, hiFirst: '6.43500000', loFirst: '1.07250000' },
  { rank: 'K', hi: 'Same', hiN: 1, lo: 'Lower', loN: 12, hiFirst: '12.87000000', loFirst: '1.07250000' },
];

/** E01 "examples": the published card streams (8 cards each) and the first HMAC block of each. */
export const SPEC_STREAMS = [
  { serverSeed: 'housebets-demo-server-seed-0001', clientSeed: 'demo-client', nonce: 1, block0: 'b6d4152534824db861a00c024857364f8aadd13f1cb8886c33d590e4f6afd484', cards: [17, 32, 50, 27, 27, 40, 4, 16] },
  { serverSeed: 'housebets-demo-server-seed-0001', clientSeed: 'demo-client', nonce: 2, block0: 'd1702cc1dcc9afb3f34f7688eceb8a696d5591f4b0d0067f68b3813c137889f5', cards: [29, 3, 40, 13, 28, 19, 16, 37] },
  { serverSeed: 'housebets-demo-server-seed-0001', clientSeed: 'demo-client', nonce: 3, block0: 'edf6c897e59ef77db0f9f385f8124ebf95a9dd32fd0a670a742e26c85d6b3663', cards: [27, 9, 45, 51, 30, 50, 16, 11] },
  { serverSeed: '5a1f7d2c9e4b8a3f6d0c2b5e8f1a4d7c0b3e6f9a2d5c8b1e4f7a0d3c6b9e2f5a', clientSeed: 'housebets', nonce: 1, block0: 'a00c215b420dc9363ba9bdfa6f03cb9f88278f8fab2a291091874d14eda374da', cards: [51, 18, 34, 39, 19, 32, 28, 38] },
] as const;

/** E01 "payouts": winning-rank sequences and their multipliers (at a stake of 1). */
export const SPEC_PAYOUTS: readonly { ns: readonly number[]; multiplier: string }[] = [
  { ns: [12], multiplier: '1.07250000' }, { ns: [1], multiplier: '12.87000000' }, { ns: [7], multiplier: '1.83857142' },
  { ns: [7, 7], multiplier: '3.41448979' }, { ns: [7, 7, 7], multiplier: '6.34119533' }, { ns: [12, 12, 12, 12, 12], multiplier: '1.47722186' },
  { ns: [1, 1], multiplier: '167.31000000' },
];

/** E01 "return" and the RTP figure are not copied here: HILO-19 reads them from E01 and the
 *  rules panel (E06) at run time (src/claims.ts). */

/** E01 rules[3]: "a round shows at most 52 cards (the start card and 51 more)". */
export const MAX_CARDS = 52;

/** E01 rules[7], the abandoned-round rule, verbatim. */
export const ABANDONED_RULE = 'a round left without a decision for 24 hours is finished by the server: a round that can cash out is cashed out at its value; otherwise the card showing is guessed on its likelier side (hi on a tie of chances) and, if the guess is right, the round is cashed out';

/** E01 "derivation", the start-card sentence verbatim. */
export const START_CARD_TEXT = 'The start card is not from the stream — it is the card you see when you bet (it carries over from your last round, or a free skip before the bet drew it), and any start card is worth the same.';

/** E02 wallet: the audited wallet (USDT, currency 1) — minimum stake, max win above the stake, 8 decimals. */
export const MIN_STAKE = '0.01000311';
export const MAX_WIN = '1000310.0961298';
export const WALLET_DECIMALS = 8;

/** The commitment encoding: sha256 of the server seed's UTF-8 text, lowercase hex (HILO-01). */
export const COMMITMENT_ENCODING = 'sha256(utf8(serverSeed)) as lowercase hex';

export const SIDES: readonly Side[] = ['hi', 'lo'];
