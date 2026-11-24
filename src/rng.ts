// HouseBets House Games hilo (bundle hilo2), new engine "canonical", derived from the published spec only (E01, the
// server's GET /housegames/hilo2/fairness answer, read 12 and 13 Oct 2026, identical):
//   block_i = HMAC_SHA256(key = serverSeed as UTF-8, message = `${clientSeed}:${nonce}:${i}`), i = 0, 1, 2, …
//   the stream is block_0 ‖ block_1 ‖ … read 4 bytes at a time as big-endian u32s
//   a u32 >= 4294967248 (= 2^32 − 2^32 mod 52) is skipped; otherwise card = u32 mod 52 (id 0..51)
//   one nonce per round: the k-th card turned after the start card (by a guess or a skip) is stream card k − 1
// The start card is NOT from the stream (E01: the card shown when the bet is placed; the page sends it, E06).
import { createHmac, createHash } from 'node:crypto';

/** E01: "A u32 of 4294967248 or more (2^32 − 2^32 mod 52) is skipped". */
export const REJECT_AT = 4294967248;
export const CARDS = 52;

export function hmacBlock(serverSeed: string, clientSeed: string, nonce: number, block: number): Buffer {
  return createHmac('sha256', Buffer.from(serverSeed, 'utf8')).update(`${clientSeed}:${nonce}:${block}`).digest();
}

/** The first n stream cards of a round, and how many u32s were skipped on the way (the HILO-08 rejection census). */
export function streamCards(serverSeed: string, clientSeed: string, nonce: number, n: number): { cards: number[]; skipped: number } {
  const cards: number[] = []; let skipped = 0;
  for (let block = 0; cards.length < n; block++) {
    const h = hmacBlock(serverSeed, clientSeed, nonce, block);
    for (let o = 0; o < 32 && cards.length < n; o += 4) {
      const u = h.readUInt32BE(o);
      if (u >= REJECT_AT) skipped++; else cards.push(u % CARDS);
    }
  }
  return { cards, skipped };
}

/** The card map for one u32 (null = skipped). HILO-08 counts the preimages of every card id under THIS function. */
export const cardFromU = (u: number): number | null => (u >= REJECT_AT ? null : u % CARDS);

export const sha256Hex = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');
