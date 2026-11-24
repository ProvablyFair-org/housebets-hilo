// What the verifier holds this package to, read at verify time from the pinned
// exhibits. HILO-26 checks every exhibit pin before anything calls these readers, and compares each constant src/spec.ts
// keeps (the button table, the published streams and payouts, the return text, rules[3] and rules[7], the start-card
// sentence, the wallet minimum and max win) with the value read here; a mismatch is a reproduction failure (exit 1).
//
// The RTP claim (every place the figure appears in our evidence):
//   E01 return           "99% at any cash-out depth, from any start card, on either side: …" — the fairness answer, the game
//                        settings the site loads (the hilo2 bundle fetches "/<game>/fairness" and hands the answer to
//                        setFairnessSpec, E06 excerpt); not seen rendered
//   E01 summary          the same "99% at any cash-out depth …" sentence
//   E06 rulesHiloReturn  "Every way of playing returns 99% (1% house edge, …)" — the rules panel text in the game's page
//                        code (the hilo2 bundle, which the live hilo page loads: script tag checked 10 Oct 2026); not seen
//                        rendered
//   E07 rulesHiloReturn  "Theoretical RTP before rounding and any payout cap: 99% (1% house edge, …). A capped payout can
//                        reduce the return. …" — the same rules panel key reworded on 16 Oct, in the live copy of the hilo2
//                        bundle fetched 19 Oct (last-modified 16 Oct 2026); not seen rendered
// The claim is held to the HIGHEST figure any place states, so raising it in any one place is a claim the rule tests.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './loader.ts';
import { parseRational, cmp, ratStr, type Rational } from './rtp-claim';

export const E01_FILE = 'evidence/E01-hilo2-fairness-spec-2026-10-13.json';
export const E02_FILE = 'evidence/E02-hilo2-limits-2026-10-13.json';
export const E06_FILE = 'evidence/E06-hilo2-bundle-start-card-2026-10-10.json';
export const E06_RETURN_KEY = 'rules panel, return (rulesHiloReturn, English)';
export const E06_START_KEY = 'rules panel, start card (rulesHiloStart, English)';
export const E07_FILE = 'evidence/E07-hilo2-rules-panel-live-2026-10-19.json';

const read = (rel: string): any => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
export interface Stated { place: string; text: string; figures: string[] }

/** Every return percentage a text states (a figure followed by "edge" or "house edge" is the edge, not a return), as exact n/d. */
export function percentsOf(text: string): string[] {
  return [...text.matchAll(/(\d+(?:\.\d+)?)\s?%(?!\s*(?:house )?edge)/g)].map((m) => { const r = parseRational(m[1]); return ratStr({ n: r.n, d: r.d * 100n }); });
}
const pct6 = (r: Rational): string => { const s = (r.n * 100n * 1000000n * 2n + r.d) / (2n * r.d); const t = s.toString().padStart(7, '0'); return `${t.slice(0, -6)}.${t.slice(-6)}`; };
/** The rules-panel string an E06 excerpt holds: `rulesHiloReturn:"…"` → the text between the quotes. */
const panelText = (excerpt: unknown): string => (String(excerpt ?? '').match(/^[A-Za-z]+:"(.*)"$/s) || [])[1] ?? '';

/** The flat RTP claim: every place the exhibits state a return figure, held to the highest. */
export function readPublishedClaim(): { ok: boolean; why: string[]; places: Stated[]; figure: string; figurePct: string } {
  const e01 = read(E01_FILE).answer, e06 = read(E06_FILE).excerpts ?? {};
  const places: Stated[] = [
    { place: 'E01 return', text: String(e01.return ?? '') },
    { place: 'E01 summary', text: (String(e01.summary ?? '').match(/\d+(?:\.\d+)?\s?% at any cash-out depth[^.]*/) || [''])[0] },
    { place: 'E06 rulesHiloReturn', text: panelText(e06[E06_RETURN_KEY]) },
    { place: 'E07 rulesHiloReturn', text: String(read(E07_FILE).rulesPanelEnglish?.rulesHiloReturn ?? '') },
  ].map((p) => ({ ...p, figures: p.text ? percentsOf(p.text) : [] }));
  const why = places.filter((p) => !p.figures.length).map((p) => `no figure in ${p.place}`);
  const all = places.flatMap((p) => p.figures).map((x) => parseRational(x));
  const top = all.length ? all.reduce((a, b) => (cmp(b, a) > 0 ? b : a)) : { n: 0n, d: 1n };
  return { ok: why.length === 0, why, places, figure: ratStr(top), figurePct: pct6(top) };
}

/** The parts of E01, E02 and E06 that src/spec.ts copies, as the exhibits state them. */
export function readPublishedSpec() {
  const e01 = read(E01_FILE).answer, w = read(E02_FILE).answer?.wallet ?? {}, e06 = read(E06_FILE).excerpts ?? {};
  const rules: string[] = (e01.rules ?? []).map(String);
  const startSentence = (String(e01.derivation ?? '').match(/The start card is not from the stream[^]*?any start card is worth the same\./) || [''])[0];
  return {
    buttons: (e01.buttons ?? []) as { rank: string; hi: string; hiN: number; lo: string; loN: number; hiFirst: string; loFirst: string }[],
    examples: (e01.examples ?? []) as { serverSeed: string; clientSeed: string; nonce: number; block0: string; cards: number[] }[],
    payouts: ((e01.payouts ?? []) as { ns: number[]; multiplier: string }[]).map((p) => ({ ns: p.ns, multiplier: p.multiplier })),
    returnText: String(e01.return ?? ''), abandonedRule: rules[7] ?? '', maxCards: Number((rules[3]?.match(/at most (\d+) cards/) || [])[1]),
    startSentence, minBet: String(w.minBet), maxWin: String(w.maxWin),
    panelStart: panelText(e06[E06_START_KEY]),
  };
}
