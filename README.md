# HouseBets Hilo — Provably Fair Audit

**Auditor:** [ProvablyFair.org](https://www.provablyfair.org) · **Audit ID:** PF-2026-HB04 · **Release:** `v1.0.0` · **Capture:** 12–13 October 2026

**Result: PROVABLY FAIR — Conditional Pass.** Every captured round, 7,777 on 12 and 13 October, recomputes exactly from
its revealed server seed under the spec HouseBets publishes: each turned card, each guess result, every intermediate value,
the two buttons offered before every guess, the settled multiplier and the payout. `node verify.js` runs the 24 scored
checks of the framework's HILO profile: 23 PASS, one operator-origin FLAG and zero fails; it exits 2. The operator FLAG is
HILO-31: the server deals from whatever start card the client sends, so the start card is not committed by the seed pair
(measured on 7,777 of 7,777 rounds; MANIFEST.md, DL-5). Two branches are declared, not measured, and their checks pass, as
the profile's rules allow: the cap branches (max win, the 52nd card) were not reached (HILO-14, DL-4), and the 24-hour rule
was witnessed on its cash-out branch only (HILO-32, DL-6).
HILO-16 (wallet reconciliation) passes on the platform's bet history and the account reconciliation; the comparison of consecutive balances the profile describes was not possible in this capture, because other games were captured on the same account at the same time (MANIFEST.md DL-7).

**Scope:** Live play on HouseBets House Games Hilo (the engine served since October 2026, `hilo2`, fairness version
`canonical`) from one test account in a logged-in browser session, 12–13 October 2026: both buttons on every start rank,
guess chains, skips and cash-outs, at stakes of 0.02, 2 and 10 USDT. Theoretical RTP is **99.0000%** (to four decimals) at
every cash-out up to 4 right guesses, for a start card independent of the next card and with every card of the stream
exactly 1 in 52 (the published map skips the 48 draws that would bias it, HILO-08): across the 22,620 settings it runs
from 0.989999992941 to 0.990000000000, the gap being the multiplier's cut to 8 decimals (HILO-19); these figures are before the payout is truncated to 1e-8. The observed return over
the 6,500 Phase A rounds is 98.75%: variance, not RTP evidence. No external randomness beacon participates, and apart from
deliberate negative tests (an empty client seed; two cash-outs before any right guess)
the capture sent no adversarial request to the API (DL-11); the fairness-integrity tests, run separately on HouseBets'
running service by ProvablyFair.org, are in the ProvablyFair.org report for this game, Section 5 (Fairness Integrity
Testing).

Audit report: https://audit.provablyfair.org/casino/housebets/games/hilo/overview · Repository:
https://github.com/ProvablyFair-org/housebets-hilo · The full write-up is [MANIFEST.md](MANIFEST.md); the verdict printed by
`node verify.js` is the verdict of record.

## What was verified

- **6,500 real rounds** placed on 13 Oct 2026 at 0.02 USDT, in 130 seed pairs of exactly 50 rounds: bet, one guess on a
  side drawn at random among the offered ones, cash out if right. Every round is recomputed from its revealed server seed:
  the turned card, the guess result, the multiplier and the payout, against HouseBets' published spec (E01).
- **Supplementary sets** (13 Oct 2026), each in whole seed pairs of 50: 200 rounds at 2 (100 × the Phase A stake) and
  200 at 10, one guess on the likelier side; 200 rounds under four client seeds typed by the auditor; 600 guess chains of
  up to 10 right guesses, 19 with skips.
- **The buttons offered before every guess** (n, multiplier, value) on every answer of every file, against the published
  table and formula.
- **The 12 Oct capture** (77 rounds, every one recomputed too): a round left open on purpose, which the server finished
  itself 25h08m53s after its last decision; a 52-card round; two refused cash-outs before any right guess.
- **Every round against the platform's own bet history** (E03) and the account's whole history (E04), checked by its
  numbers.
- **Simulation:** 2,000,000 fresh cards for uniformity, 1,000,000 fresh rounds on its own seeds for each of the 26 first guesses (13 start
  ranks × 2 sides), and every revealed seed of every dataset (163) replayed over 10,000 nonces, each round by its first
  guess, to test for seed cherry-picking (HILO-21; detection power in MANIFEST.md DL-10).
- **The start card** the server deals from: it is whatever the client sends, not fixed by the seed pair (measured); what
  that exposes and where the protection comes from is in MANIFEST.md (conclusion, DL-5). It is an operator-origin FLAG
  (HILO-31; MANIFEST.md open question 6, decided 16 Oct 2026).
- **The published 99 % RTP** (read by the verifier from the fairness spec E01 and the rules panel text E06, and its 16 Oct
  rewording E07, at run time) against the exact RTP of every cash-out up to 4 right guesses (22,620 settings, every row in
  `outputs/rtp-claim-table.json`).
- **Observed return** (variance, not RTP evidence): Phase A 128.37756964 paid on 130 staked, 98.75%.

## Run the audit

Nothing to install: `node verify.js` runs on Node 22, `npm test` (the TypeScript sources) on Node 22.6 or later:

```
node verify.js          # the standalone verifier (generated from tests/verify.ts by npm run build:standalone)
npm test                # the same suite from the TypeScript sources, plus the RNG reference vectors
```

Expected: `scored checks (HARD_FAIL + FLAG): 23 PASS, 0 FAIL, 0 OVERSTATED, 1 operator FLAG, 0 capture FLAG of 24 run (profile: 24 scored checks); informational 1; package checks 7/7 PASS (no gaps)`, then `VERDICT: PROVABLY FAIR — Conditional Pass`, `REPRODUCED`, exit 2.

`npm run mutate` runs the falsifiability battery (each mutation must change the status of the step it names from its
status in an unmutated copy; a step that aborts counts as not caught) and writes `outputs/mutation-results.json`;
`npm run gate:fresh` (run it in a disposable copy of the package: a passing run rewrites the pinned record
`outputs/fresh-copy.json`, which names the Node version, so on another Node 22 patch the rewritten record no longer equals its pin) re-runs the package from a fresh copy, compares the regenerated artifacts with the committed ones and
writes `outputs/fresh-copy.json`. Both records carry the fingerprint of the code and data they ran against and are pinned
in RELEASE-MANIFEST.json, which pins every file of the package except itself; `node scripts/release-manifest.mjs --check`
confirms every pinned file and rebuilds `site-verifier/derive.js` with bun 1.3.9, requiring the shipped file to equal the
rebuild. `verify` re-runs the whole simulation rather than trusting the stored results: 41 s on an Apple M2 Max (12 cores, Node 22.23.1), measured on 19 Nov 2026 at load average 8. A run in which any
scored check does not record a status, or whose step list does not match the vendored framework profile
(`profile/hilo.profile.json`), prints `VERDICT: INCOMPLETE` and exits 3.

## Verdict and exit codes

`node verify.js` (and `npm run verify`) ends with one `VERDICT:` line and its exit code. Framework 1.1; RTP-CLAIM 1.2.0 is
switched on (Methodology v1.1). This package: **PROVABLY FAIR — Conditional Pass, exit 2** (one operator-origin FLAG,
HILO-31, the start card). The codes and their order are the same in all 11 HouseBets new-engine packages:

| exit | verdict | when |
|---|---|---|
| 0 | PROVABLY FAIR — Full Pass | every scored check passes (a capture-origin FLAG is disclosed and does not move the verdict) |
| 2 | PROVABLY FAIR — Conditional Pass | an operator-origin FLAG, nothing worse |
| 5 | RTP FIGURE OVERSTATED | HILO-19: the published RTP figure (the highest of E01 and the rules panel, read at run time) is missed on the house side by more than 0.1 pp; the draws pass |
| 3 | INCOMPLETE | a scored check of the profile has no status from this run, or `src/profile-map.ts` does not match the vendored framework profile (a check missing or relabelled) |
| 1 | NOT PROVABLY FAIR | a scored check fails; or a step throws (a file missing, a dataset field null or absent: the checks it scores print FAIL with the error, the other steps still run); or a release-gate record (`outputs/fresh-copy.json`, `outputs/mutation-results.json`) is missing or is not the bytes RELEASE-MANIFEST.json pins (its check prints FAIL) |
| 4 | (no verdict) | `verify.js` was not built from the sources beside it; rebuild with `npm run build:standalone` |

When more than one applies: NOT PROVABLY FAIR > INCOMPLETE > RTP FIGURE OVERSTATED > Conditional Pass > Full Pass.

## Verify a bet

Check your round at [provablyfair.org/verify-bets/housebets](https://www.provablyfair.org/verify-bets/housebets); the
page runs `site-verifier/derive.js` from this release (sha256 `3324e3a3f705e3d96be527176483363bdc6497fcb598822b6d5faa0af7667903`).
HILO-24 runs that file side by side with `src/rng.ts` on every captured round (MANIFEST.md, Player verifiers). The steps
below, and the script after them, check a round by hand, without the page.

1. **Save the hashed server seed before you bet.** Before your first round on a seed pair, save the `hashedServerSeed` of
   your active pair. That saved copy is what shows the seed was fixed before your rounds: a match against a hash read after
   the rounds only shows consistency (hash equality), because a seed and hash made after the round would also match. This
   package reads the hash from the game's seed-pair answer; where the game's screen shows it was not captured (DL-8).
2. **Reveal the seed.** A round can only be checked once its server seed is revealed, which happens when you rotate the
   seed pair: the server's answer to the rotation (`POST /housegames/change_seed`) carries the previous server seed. That
   is how this capture obtained every seed; the game's rendered verify screen was not captured (DL-8).
3. **Collect the fields:** the revealed server seed, your client seed, the round's nonce (HouseBets nonces start at 1 on a
   fresh seed pair; one nonce per round), the start card, and your guesses and skips in order.
4. **Check the commitment:** `sha256` of the server seed's text (UTF-8), as lowercase hex, must equal the hashed server seed
   you saved in step 1.
5. **Recompute the cards.** The HMAC key is the server seed's **64-character hex text, encoded as UTF-8**, not the 32 bytes
   that text hex-decodes to; with a hex-decoded key, 134 of the 6,500 Phase A rounds give the served card, about the 1 in
   52 of chance. For block b = 0, 1, … compute `block_b = HMAC-SHA256(key = server seed, message = "clientSeed:nonce:b")`
   and concatenate them; each block yields 8 draws. Draw i (i = 0, 1, …) is bytes 4i..4i+3 of `block_0 ‖ block_1 ‖ …` read
   as a big-endian 32-bit integer u, so draw i comes from block b = floor(i / 8). Skip any u of 4294967248 or more;
   otherwise the card is `u mod 52` (rank = card mod 13, 0 = A … 12 = K). The first card turned after the start card is
   card 0 of this stream, the next is card 1, and so on; a guess and a skip each turn one card.
6. **The start card is not from the stream.** It is the card the page shows when you bet, and the page sends it with the
   bet. Check that the round's start card is the one you saw.
7. **Apply the published buttons** (E01): on ranks 2 … Q, "Higher or same" wins on 13 − r ranks and "Lower or same" on
   r + 1 (a tie wins); on an A, Higher (12 ranks) or Same (1); on a K, Same (1) or Lower (12). A wrong guess ends the round
   and pays nothing; a skip turns the next card and leaves the multiplier as it was.
8. **The multiplier** after right guesses on n_1 … n_k winning ranks is 0.99 × Π 13 / n_i, cut to 8 decimals; the payout is
   floor(stake × multiplier) at 0.00000001.

The script below does steps 4, 5, 7 and 8 for a round that was cashed out or lost on a guess (a round stopped by the max-win
cap, or finished by the server after 24 hours, is settled by the rules of MANIFEST.md, not by this script). Save it as a
`.mjs` file and run it with `node` (Node 18 or later, nothing to install). Its constants hold the worked example V5 of [docs/ALGORITHM.md](docs/ALGORITHM.md)
(round `e195c9a5-a162-41c4-b920-ec8d3b2b912a`, Phase E: start card 39, an A, then five right guesses); replace them with
your round's values. `'hi'` is the upper button (Higher or same; Higher on an A; Same on a K) and `'lo'` the lower one.

```javascript
// node verify-round.mjs — paste your round's values into the constants below
// serverSeedHashed: the hashed server seed you saved BEFORE your first round on this seed pair
import { createHash, createHmac } from 'node:crypto';
const serverSeed = '5e962fb3d9f7c24ab2e654feb6a8b7ecae5ef8bcd8daa75f7def1af08657325c';
const serverSeedHashed = 'f89bb81e03853b1f0033057cbdf31025b0a370d5264ff57d611e8a3f072dc745';
const clientSeed = 'pfhilostart78e7c2d2a3c6ff0cf1672cb69dcb498d', nonce = 18;
const startCard = 39;                               // the card shown when you bet; it is not from the stream
const decisions = ['hi', 'lo', 'hi', 'hi', 'hi'];   // your guesses and skips in order: 'hi', 'lo' or 'skip'
const served = [7, 42, 16, 43, 46];                 // the round's cards after the start card
const stake = '0.02', paid = '0.08508797';          // your stake and the payout you received, as the game shows them

const key = Buffer.from(serverSeed, 'utf8');   // the seed's 64-character text as UTF-8, NOT hex-decoded
const hashMatches = createHash('sha256').update(key).digest('hex') === serverSeedHashed;
const cards = [];
for (let b = 0; cards.length < decisions.length; b++) {   // u32 draw i reads bytes 4i..4i+3 of block_0 ‖ block_1 ‖ …: block b = floor(i / 8)
  const block = createHmac('sha256', key).update(`${clientSeed}:${nonce}:${b}`).digest();
  for (let o = 0; o < 32 && cards.length < decisions.length; o += 4) { const u = block.readUInt32BE(o); if (u < 4294967248) cards.push(u % 52); }
}
const rank = (c) => c % 13;                         // 0 = A … 12 = K
const wins = (r, side, t) => side === 'hi' ? (r === 0 ? t > 0 : r === 12 ? t === 12 : t >= r) : (r === 12 ? t < 12 : r === 0 ? t === 0 : t <= r);
const nOf = (r, side) => side === 'hi' ? (r === 0 ? 12 : 13 - r) : (r === 12 ? 12 : r + 1);
let current = startCard, alive = true; const ns = [];
decisions.forEach((d, k) => {
  if (!alive) return;
  if (d !== 'skip') { if (wins(rank(current), d, rank(cards[k]))) ns.push(nOf(rank(current), d)); else alive = false; }
  current = cards[k];
});
let num = 99n * 100000000n, den = 100n; for (const n of ns) { num *= 13n; den *= BigInt(n); }   // 0.99 × Π 13/n, cut to 8 decimals
const units = (s) => { const [i, f = ''] = String(s).split('.'); return BigInt(i) * 100000000n + BigInt((f + '00000000').slice(0, 8)); };   // 1e-8 units, no floating point
const mult8 = alive && ns.length ? num / den : 0n, pay8 = units(stake) * mult8 / 100000000n;   // payout = stake × multiplier, cut to 8 decimals
const f8 = (x) => `${x / 100000000n}.${String(x % 100000000n).padStart(8, '0')}`;
console.log(JSON.stringify({ hashMatches, cards, matches: JSON.stringify(cards) === JSON.stringify(served), rightGuesses: ns, alive, multiplier: mult8 ? f8(mult8) : '0', payout: f8(pay8), payoutMatches: pay8 === units(paid) }));
```

On the example it prints `{"hashMatches":true,"cards":[7,42,16,43,46],"matches":true,"rightGuesses":[12,8,10,10,9],"alive":true,"multiplier":"4.25439895","payout":"0.08508797","payoutMatches":true}`:
the served cards, five right guesses on 12, 8, 10, 10 and 9 ranks, the served multiplier 4.25439895, and the payout floor(0.02 × 4.25439895) = 0.08508797, equal to the payout
served (`payoutMatches`; a different amount paid would print `false`). `hashMatches: true` is hash equality with the value you pasted; paste the
one you saved before betting.

`src/rng.ts` and `src/rules.ts` are those steps in the package's code; [docs/ALGORITHM.md](docs/ALGORITHM.md) states the
algorithm step by step with its sources and test vectors, and [docs/INTERFACE.md](docs/INTERFACE.md) the module interface.

## Files and evidence

- [Phase A dataset](data/housebets-hilo-phaseA-auto1-6500rounds.json) — 6,500 rounds, SHA-256 `63346862413fd87e3d5a5122b0a5950bf58f0af91c4e7e414158a6ec8cd8de1e`.
- [Phase C](data/supplementary/housebets-hilo-phaseC-elevated-200rounds.json) — 200 rounds at 2, SHA-256 `afaf45474c9e36415bedff44a375777fcb4d16e9055c02d4c5a8b4bad3e73cfb`.
- [Phase C, $10 set](data/supplementary/housebets-hilo-phaseC-elevated-10usd-200rounds.json) — 200 rounds at 10, SHA-256 `3bd577d2f06498b63d4b74f0c5172373322e5f5323e93575f1f19bae8c127073`.
- [Phase D](data/supplementary/housebets-hilo-phaseD-playerseeds-200rounds.json) — 200 rounds under player-set seeds, SHA-256 `a7ec3386bf3e7d2b988aadc4f120fd1c422a5218b535884922e2d9072e1af70f`.
- [Phase E](data/supplementary/housebets-hilo-phaseE-multistep-600rounds.json) — 600 guess chains, SHA-256 `4d48ad83d699f2f57f8195998510f5cc82593a00cb91f3d3f151bb6c5f4c1dcc`.
- [12 Oct file](data/supplementary/housebets-hilo-full-77rounds-withopen.json) — 77 rounds, SHA-256 `192d39dc7ca28d75c62c98955e9a6a06e76489cc9622862c111279b4ca4e943a`.
- `docs/` the algorithm specification and module interface · `evidence/` E01–E07 · `profile/` the framework's HILO profile
  1.0.2-public (byte copy, sha256 checked by verify) · `capture/` a redacted reference copy of the capture code (the as-run
  script, sha256 `1f4fb06a…` in the 13 Oct datasets' meta, is held privately; MANIFEST.md#evidence) · `outputs/` the pinned simulation census, RTP table and verification record,
  and the committed mutation and fresh-copy records · `src/` the derivation · `tests/verify.ts` the 32 checks of the HILO
  profile 1.0.2-public · `scripts/` evidence extraction, mutation battery, fresh-copy gate, standalone build, release manifest,
  code fingerprint, site-verifier build · `site-verifier/derive.js` the ProvablyFair.org verifier module for this game,
  generated from `src/rng.ts`. Every dataset is pinned in `src/loader.ts` and checked by HILO-26. See MANIFEST.md#evidence.
- [Audit report](https://audit.provablyfair.org/casino/housebets/games/hilo/overview) · [Public repository](https://github.com/ProvablyFair-org/housebets-hilo) · [MIT license](LICENSE).

The release commit and tag are signed with the ProvablyFair.org release key (SSH,
`SHA256:gEujiJm2pRyq7lQsfYQfQ1r97H/J7GdaKHbOW8GtikY`), which the release manifest records.
