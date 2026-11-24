# HouseBets Hilo — Consolidated Audit Overview (new engine)

**Release:** `v1.0.0` (the first public release) · **Audit ID:** PF-2026-HB04 · **Auditor:** ProvablyFair.org · **Framework:** 1.1

Audit report: https://audit.provablyfair.org/casino/housebets/games/hilo/overview · Repository:
https://github.com/ProvablyFair-org/housebets-hilo. The machine-readable release identity is in
[RELEASE-MANIFEST.json](RELEASE-MANIFEST.json).

Profile: the framework's `games/hilo/profile.public.json` 1.0.2-public: 1.0.0 as approved on 14 Oct 2026 (Methodology v1.1), with the generated status fields removed (1.0.1), that adoption recorded in the file (1.0.2), and its public form (1.0.2-public, internal notes removed), checks unchanged. Verdict of record: the
one `node verify.js` prints; on 27 Oct 2026 it is **PROVABLY FAIR — Conditional Pass** (23 of 24 scored checks PASS, 0
capture-origin FLAGs, 1 operator FLAG (HILO-31, the start card), 0 FAIL; see [Verification results](#verification-results)). HILO-14 and HILO-32 pass with their unwitnessed branches declared, as the profile's rules allow. The verdict is bound
to the profile's check list: a run in which any scored check did not record a status prints INCOMPLETE and exits 3.
Framework 1.1 (Methodology v1.1, 14 Oct 2026): RTP-CLAIM 1.2.0 is switched on, so an RTP figure overstated on the
house side is reported as **RTP FIGURE OVERSTATED** (exit 5), never NOT PROVABLY FAIR; exit codes under
[Reproduce the audit](#reproduce-the-audit).

## Contents

[Conclusion and scope](#conclusion-and-scope) · [Dataset and capture](#dataset-and-capture) ·
[Game and algorithm](#game-and-algorithm) · [Payouts and RTP](#payouts-and-rtp) ·
[Verification results](#verification-results) · [Player verifiers](#player-verifiers) · [Reproduce the audit](#reproduce-the-audit) · [Evidence](#evidence) ·
[Limitations and trust](#limitations-and-trust) · [Open questions for the profile owner](#open-questions-for-the-profile-owner) ·
[Release history](#release-history)

## Conclusion and scope

Every captured hilo round (7,777, on 12 and 13 Oct) recomputes exactly from its revealed server seed under the spec
HouseBets publishes: each turned card, each guess result, every intermediate value, the two buttons offered before every
guess (n, multiplier, value), the settled multiplier and the payout. Every round is in the platform's own bet history with
the same stake and payout. The card map is exactly uniform over the 52 cards (bias 0), and the published flat 99 % RTP
holds for every cash-out up to 4 right guesses (largest gap 7.06 × 10^-9, from cutting the multiplier to 8 decimals).
Pass 2, replaying every revealed seed of every dataset (163) over 10,000 nonces, each round by its first guess, finds no
significant deficit in the nonces played: the scored per-slot standardised return over the 7,777 played slots is at z 0.180,
one-sided p 0.5713 at level 0.008, a test that detects a uniform deficit of 2.45 pp per round at 80 % power.

Three things are disclosed rather than tested: the cap branches (max win, 52nd card) were not reached (DL-4); the 24 h
rule was witnessed on its cash-out branch only (DL-6); and the start card (DL-5). On the start card, one fact is MEASURED
on the operator side: the server deals from whatever start card the client sends (7,777 of 7,777 rounds; 7,630 of the 7,771
follow-on rounds started on a card that was not the previous round's last card, all accepted), so the start card is not
fixed by the seed pair. That opens a risk the "any start card is worth the same" argument does not cover: for 11 of 13
next ranks there is a start card on which the likelier-side guess loses, while with a start card independent of the next
card that guess wins 131/169 = 77.5 % (HILO-31). Independence rests on the page's code (E06: a crypto draw with a
`Math.random` fallback, or the previous round's last card, itself a committed stream card), not on the commitment. The
audited rounds are unaffected (the capture drew its own start cards). The game's rules panel tells the player "A round
starts on the card on top: the last card of the previous round, or a new one drawn by Skip before the bet. Every start card
is worth the same." (E06 `rulesHiloStart`); the server does not hold a round to the first sentence (the 7,630 accepted
start cards above). The page's carry-over was not exercised. Open question 6 was decided on 16 Oct 2026: the start card not
being committed by the seed pair is an operator-origin FLAG, so HILO-31 is an operator FLAG and the verdict is PROVABLY FAIR
— Conditional Pass.

**Theoretical RTP is 99.0000%** (to four decimals) at every cash-out up to 4 right guesses, for a start card independent of
the next card: across the 22,620 settings the exact RTP runs from 0.989999992941 to 0.990000000000, the gap being the
multiplier's cut to 8 decimals (HILO-19); these figures are before the payout is truncated to 1e-8. The observed return of the 6,500 Phase A rounds, 98.75%, illustrates variance
only.

The dataset comes from a single test account in a logged-in browser session. Apart from deliberate negative tests (an empty
client seed, E05; two cash-outs before any right guess, 12 Oct)
the capture sent no adversarial request to the API (DL-11); the fairness-integrity tests, run separately on HouseBets'
running service by ProvablyFair.org, are in the ProvablyFair.org report for this game, Section 5 (Fairness Integrity
Testing). No
external randomness beacon participates, so seed selection by the operator before commitment remains residual trust; Pass 2
found no evidence of it.

Scope: HouseBets House Games **hilo** on the October 2026 engine (`hilo2`, fairness version `canonical`), the USDT wallet,
both buttons on every start rank, skips and cash-outs. Not in scope: other House Games (their own packages), the security
of the platform, and anything a client-side capture cannot reach (server-side code, concurrency inside the server).

## Dataset and capture

| file | what | rounds | seeds |
|---|---|---|---|
| `data/housebets-hilo-phaseA-auto1-6500rounds.json` | **Phase A, primary**: 130 seed pairs of exactly 50 rounds at 0.02 USDT, 13 Oct 2026; bet, one guess on a side drawn by `crypto.randomInt` among the offered ones, cash out if right | 6,500 | 130 |
| `data/supplementary/housebets-hilo-phaseC-elevated-200rounds.json` | **Phase C**: one guess on the likelier side (hi on a tie of chances), at 2 = 100 × the Phase A stake, 13 Oct | 200 | 4 |
| `data/supplementary/housebets-hilo-phaseC-elevated-10usd-200rounds.json` | **Phase C, $10 set**: the same at 10, 13 Oct | 200 | 4 |
| `data/supplementary/housebets-hilo-phaseD-playerseeds-200rounds.json` | **Phase D**: as Phase A under one auditor-typed client seed per pair, plus the empty-seed control, 13 Oct | 200 | 4 |
| `data/supplementary/housebets-hilo-phaseE-multistep-600rounds.json` | **Phase E**: guess chains, 0 to 10 right guesses per round at settle (HILO-15 prints the distribution), 19 with skips, 13 Oct | 600 | 12 |
| `data/supplementary/housebets-hilo-full-77rounds-withopen.json` | **12 Oct capture**: regular rounds, one round per start rank, a 52-card skip-limit round, two negative tests, and the round left open for the 24 h rule; recomputed round by round, outside the epoch population (DL-3) | 77 | in HILO-01's 163 |

The capture ran inside a logged-in browser tab on an account opened for the audit, through the game's own API calls
(a redacted reference copy is in `capture/`; the as-run file is held privately). For every seed pair it read the pair, drew the client seed from
`node:crypto randomBytes(16)` after reading the hash (Phase D: the 4 typed seeds, chosen before the capture, DL-2), played 50 rounds, read the server's nonce
count, and rotated, which reveals the server seed. A pre-capture read anchors each chain before its first pair. Every
start card was drawn by `crypto.randomInt(0, 52)` and sent in the bet body. The first round of every pair (Phase A, C,
C $10, D), every Phase E round and most of the 12 Oct rounds were also read back from the server's round detail
(`game_detail`): 818 rounds in all, each equal to the settled game (HILO-11).

**Account identity (13 Oct 2026).** No field in this package carries the audit account's user id. The hilo answers the
capture recorded have no user-id field, and a search of every shipped file for the account's id finds 0 occurrences, so
nothing was replaced or redacted. The shipped datasets are byte-identical to the as-captured files (same sha256 as in the
HouseBets workshop).

**Every hilo bet of the account's 12–13 October capture is in this package.** E04's hilo rows sum to 7,777 rounds, the rounds
of this package's six files (HILO-16). E04 attributes the account's other entries to the other games' files and to 13
entries from 10 Oct, whose games E04 does not name: the statement above is about the capture, not about those 13 earlier bets. No same-engine hilo capture is held back.

## Game and algorithm

From HouseBets' published spec (E01, `GET /housegames/hilo2/fairness`, the same answer on 12 and 13 Oct):

- **Cards.** `block_i = HMAC-SHA256(key = serverSeed, message = "clientSeed:nonce:i")`; the blocks are read in order as
  big-endian u32s; a u32 of 4294967248 or more (2^32 − 2^32 mod 52) is skipped, otherwise the card is u32 mod 52; rank =
  card mod 13 (0 = A … 12 = K). The deck is infinite: every card is drawn independently, 1 in 13 per rank. One nonce per
  round: the k-th card turned after the start card is stream card k − 1. The four published streams recompute (HILO-09).
- **Start card.** "The start card is not from the stream — it is the card you see when you bet (it carries over from your
  last round, or a free skip before the bet drew it), and any start card is worth the same" (E01). The page draws it with
  `crypto.getRandomValues` mod 52 (falling back to `Math.floor(Math.random()*52)` if that throws), keeps it in local
  storage, carries the last card of a round over, and sends it in the bet body (E06, the live bundle). The server does not
  check it against anything (HILO-31; see the conclusion for the risk this opens).
- **Commitment.** The hashed server seed is `sha256` of the seed's UTF-8 text (163 of 163 revealed seeds, HILO-01); each
  pair also shows the hash of the next seed, and the chains link (HILO-02).
- **Buttons** (E01): on 2 … Q, Higher or same (13 − r ranks) | Lower or same (r + 1 ranks); on A, Higher (12) | Same (1);
  on K, Same (1) | Lower (12); a tie wins an "or same" guess. A wrong guess ends the round and pays nothing; a skip never
  changes the multiplier; a round shows at most 52 cards. A paid round can cash out after its first right guess.
- **Bias.** Below the skip threshold every card id has exactly 82,595,524 of the 2^32 values: the map is exactly uniform
  (HILO-08). No captured or simulated u32 reached the skip branch (DL-9).

## Payouts and RTP

- **Multiplier** (E01): after right guesses on n_1 … n_k winning ranks, 0.99 × Π 13 / n_i cut to 8 decimals. Held on 3,983
  of 3,983 winning rounds and on all 4,885 intermediate values after a right guess (HILO-13); the 26 published first-guess
  values (up to 12.87× on 1 rank) and the 7 published payout examples equal the formula.
- **Buttons offered.** Before every guess the page shows two buttons (`options.hi` / `options.lo`: n, multiplier, value).
  Recomputed from the card showing and the right guesses so far over the derived cards, never from a served n: 15,554 of
  15,554 buttons on bet answers and 9,926 of 9,926 on later answers (HILO-13).
- **Payout** = floor(stake × multiplier) at 1e-8 (E01 rules[6]); exact on all 7,777 rounds of the six files, and every
  amount the server sent is on the 1e-8 grid (HILO-11). On 16 settled rounds a single floor of stake × the exact
  0.99·Π 13/n would pay a different amount from the published two-step rule; the server follows the published rule.
- **Caps** (E01 rules[5]): a round never pays more than its max win above the stake (1,000,310.0961298 USDT, E02); a right
  guess reaching it, or a right guess on the 52nd card, cashes out. Neither was reached (DL-4). A capped chain would return
  less than 99 % (the cap cuts its pay), so the flat 99 % holds because a guess whose value would pass the max win is not
  offered: each served button carries `allowed` (true only while its value stays within the max win, HILO-13), and the page
  offers hi / lo only when it is true (E06 excerpt "button gate (iu)"). In the data that flag was seen only true (0 of the
  six datasets' buttons carry `allowed: false`), so the refusal itself is unwitnessed (DL-4).
- **RTP.** The figure appears in four places in our evidence: E01 `return` and `summary` (the fairness spec, the game
  settings the site loads: the hilo2 bundle fetches `/<game>/fairness` and keeps the answer as its settings, E06 excerpt
  "fairness request"), "99% at any cash-out depth, from any start card, on either side", and the rules panel text in the
  game's page code (E06 `rulesHiloReturn`, English), "Every way of playing returns 99% (1% house edge, charged once per
  round on the first right guess)". HouseBets reworded that line after the capture: the live copy of the same bundle (fetched
  19 Oct 2026, last-modified Fri, 16 Oct 2026 09:18:09 GMT) reads "Theoretical RTP before rounding and any payout cap: 99%
  (1% house edge, charged once per round on the first right guess). A capped payout can reduce the return." (E07
  `rulesHiloReturn`). None was seen rendered. The verifier reads all four from the exhibits when it runs and
  holds the table to the highest figure stated (99 %); nothing in `src/` copies it, and RTP-CLAIM 1.2.0 alone sets
  HILO-19's status for a house-side miss (exit 5). Exactly, the RTP of a cash-out is
  multiplier8(ns) × Π n_i / 13^k: across the 22,620 n-sequences up to depth 4 it runs from 0.989999992941 (four guesses on
  12 ranks) to 0.990000000000 (one guess on 1 rank), never above 0.99, before the payout is truncated to 1e-8. Under the framework rule RTP-CLAIM 1.2.0 (switched on, Methodology v1.1) the claim
  holds: 0 settings beyond the 0.1 pp band on the house side (`outputs/rtp-claim-table.json`, all 22,620 rows, HILO-19 PASS). Depth 1 is the 12 values of n, onto which the 26 (start rank, side) cells map. The payout's truncation to 1e-8 costs a minimum-stake (0.01000311) first
  guess at most 7.36 × 10^-7 of RTP.
- **Start card.** The 26 first-guess cells (13 start ranks × 2 sides) differ in exact RTP by at most 4.62 × 10^-9, so the
  claim "any start card is worth the same" holds to the 8-decimal cut — for a start card chosen independently of the
  stream. It does not cover a start card chosen with knowledge of the next card (HILO-31, DL-5).
- **Simulation.** 26 first-guess classes × 1,000,000 fresh rounds each, every class on its own seeds (26,000,000 rounds),
  land within 5·SE + 1e-4 of their exact RTP (worst 2.47 SE, A lo; HILO-20). The band's half-width runs from 1.529 × 10^-3 (A hi) to 1.725 × 10^-2 (A lo); in 4 of the 26
  classes it is wider than the 1 % house edge, so in those classes the band could not detect an edge of that size from
  this sample (HILO-20). Live-round returns are
  variance only; RTP evidence is the exact table and the simulation.
- **Observed return** (variance, not RTP evidence): Phase A 128.37756964 paid on 130 staked, **98.75%**; Phase C 420.62799988
  on 400 (105.16%), the $10 set 1,911.7289278 on 2,000 (95.59%), Phase D 4.33939994 on 4 (108.48%), Phase E 14.25307692 on 12
  (118.78%). A live sample of this size cannot confirm or reject a 1 % edge; the RTP evidence is the exact table and the
  simulation.

## Verification results

`node verify.js` runs the 32 checks of the HILO profile (`src/profile-map.ts`, generated from `games/hilo/profile.public.json` 1.0.2-public, sha256
`59fd68d12a105a6606a84b4173a87bfb03252c2a1d6811b3e54bfc5cc1b16234`, committed in the framework at 19f8dc7, 27 Oct 2026, the public form of 1.0.2 with every check's id, name, layer, kind, policy and rule unchanged, vendored byte for byte as `profile/hilo.profile.json`;
the step list is bound to it at run time, a check missing from `src/profile-map.ts` or relabelled there prints INCOMPLETE,
exit 3). 17 Nov 2026, Node 22: 23 of 24 scored checks PASS, 0 capture-origin FLAGs, 1
operator FLAG (HILO-31, the start card; open question 6), 0 FAIL; HILO-22 informational; package checks 7 of 7 PASS; verdict **PROVABLY FAIR — Conditional Pass**. The committed record and RELEASE-MANIFEST.json count 22 passes: they leave out HILO-27, the check that compares the record with the run. The full per-check output is
`outputs/verification-results.json`. That record holds every check of the run except HILO-27, HILO-28, HILO-29 and HILO-30, which attest the record itself: HILO-27 compares it with the run, HILO-28 and HILO-29 read the gate records (`outputs/fresh-copy.json`, `outputs/mutation-results.json`), which are bound to a code fingerprint that includes the record, and HILO-30 counts this run's scored passes, HILO-27 among them; verify prints those four and does not record them.

Status is the one `node verify.js` prints: PASS, FLAG (capture or operator origin), GAP (a package check not met), INFO
(informational, never in the verdict). Where a row holds two checks, the statuses are in the same order.

| check | status | result |
|---|---|---|
| HILO-01 seeds | PASS | 163/163 revealed seeds hash to their commitments (130 Phase A); pre-capture reveals 6/6 |
| HILO-02 chain | PASS | A 129/129 links, C, C $10 and D 3/3 each, E 11/11; every chain anchored before its first pair and ending on the pair active after the capture |
| HILO-03 / 04 | PASS · PASS | 130/130 pairs: one hash and client seed per pair; nonces exactly 1..50, N == the server's count; every round's nonce == the server's count before it + 1 (7,777/7,777); every server answer of a round (bet, each action, game_detail) carries the settled hash, client seed, version, nonce and round id, and the capture's own copies (round id, seed and hash read before the round, outcome label) agree: 7,777/7,777 |
| HILO-05 population | PASS | 6,500 / 130 / 130 × 50 against code constants; every supplementary set in whole pairs of 50 |
| HILO-06 client seed | PASS | a wrong client seed changes the first card of 6,363/6,500 rounds (137 matches, 125 expected at 1/52); Phase D 200/200 recompute; empty seed refused, HTTP 400 (E05) |
| HILO-07 cards | PASS | 7,777/7,777 rounds (6,500 Phase A): start card == the one sent, every turned card == the stream |
| HILO-09 (package) | PASS | E01's 4 published card streams and 7 payout examples recompute, and so does captured Phase A round 0; also `tests/rng.test.ts` |
| HILO-10 guesses | PASS | 8,661/8,661 guesses: served n and win == the published buttons; outcome == the replay 7,777/7,777; skips 96/96; the 52-card round and the two refused cash-outs of 12 Oct as published; 686 repeated-generation requests answered with the stored answer (DL-3) |
| HILO-11 / 13 | PASS · PASS | payouts 7,777/7,777; every amount on the 1e-8 grid 7,777/7,777; multipliers 3,983/3,983; intermediate values 4,885/4,885; buttons offered 15,554/15,554 on bet answers and 9,926/9,926 later; capture copy == the server's round record 7,776/7,776 (the server-finished round has none); round detail == settled game 818/818 |
| HILO-12 | PASS | Phase C 200/200 (166 wins) and the $10 set 200/200 (149 wins) recompute and pay by the base rule |
| HILO-14 | PASS | rises with every right guess 4,867/4,867; caps not reached, declared unwitnessed (DL-4), which the rule allows |
| HILO-15 | PASS | start ranks 457–540 each in Phase A, both sides on every rank (220–282 per cell); Phase E 261 rounds with ≥ 2 right guesses, 19 with skips |
| HILO-16 | PASS | 7,777/7,777 rounds (with the 12 Oct file) in the platform's bet history with the same stake, payout and status (E03); E04 checked by its numbers: 60 dataset rows sum to its TOTAL, the ledger line adds up (86,979 = 86,966 + 0 + 13), balance after − net + open == the command's --before 986.84718000; each of the 6 package files' rows (rounds, staked, paid) == the package's own sums; E04's hilo rows 7,777 == this package's rounds; the pass rests on that bet history and that account reconciliation: the comparison of consecutive balances the profile describes was not possible in this capture (DL-7) |
| HILO-17 | PASS | Phase E: every action on a fresh generation, intermediate values 960/960, payouts 600/600, every step's cards a prefix of the settled cards (7,777/7,777 in all files) |
| HILO-18 / 19 | PASS · PASS | win chance n/13 by enumeration on 26/26 cells; RTP claim holds (above) |
| HILO-20 | PASS | 2,000,000 cards: chi² 63.22 (df 51) p 0.1171, lag-1 z −0.971, runs z −0.284; 26/26 classes in tolerance (half-widths and the 4 classes wider than the edge above) |
| HILO-21 | PASS | every revealed seed of every dataset, 163 (A 130, C 4, C $10 4, D 4, E 12, 12 Oct 9), × 10,000 nonces, each nonce replaying a round the capture played on that seed by its first guess (24 of the 7,777 rounds skipped before it); scored per-slot standardised return over the 7,777 played slots: early-window z 0.180, p 0.5713 at level 0.008 (reference window z −0.014); per dataset, printed: A −0.315, C 1.854, C $10 −0.960, D 1.192, E 0.357, 12 Oct 0.339; the Phase A payout-weighted return scored until 14 Oct: z −0.137, p 0.4455; 67 Phase A pairs below expectation, 63 at or above; power: a 2.45 pp per-round RTP deficit at 80 % (DL-10) |
| HILO-22 (info) | INFO | 7,952 live cards: ranks chi² p 0.4261, card ids p 0.1962 |
| HILO-23 (package) | PASS | the S5 matrix below carries the framework's eight rows, ids and names in order, each with a result and what it is tied to; verify checks the ids and the names, not a count |
| HILO-24 (package) | PASS | `site-verifier/derive.js`, sha256 `3324e3a3f705e3d96be527176483363bdc6497fcb598822b6d5faa0af7667903`, generated from `src/rng.ts`: equals its pins (`src/artifact-pins.ts`, RELEASE-MANIFEST.json) and returns what `src/rng.ts` returns on all 7,777 captured rounds (77,935 calls, 0 differing results; [Player verifiers](#player-verifiers)) |
| HILO-25 (package) | PASS | README "Verify a bet": save the hash first, reveal, fields, commitment encoding, HMAC key encoding, the card stream with its block index, the start card, the buttons, the multiplier, and a script that recomputes a round |
| HILO-26 / 27 | PASS · PASS | 6 datasets, 7 exhibits and 3 artifacts match their pins; every constant `src/spec.ts` copies from E01, E02 and E06 (button table, streams, payouts, rules[3] and [7], start-card sentence, minimum and max win) == the exhibit, read at run time; regenerated census and RTP table == committed; verify.js is bundled from the sources on disk (a stale bundle fails HILO-27) |
| HILO-28 / 29 | PASS · PASS | read only the committed, RELEASE-MANIFEST-pinned records `outputs/fresh-copy.json` and `outputs/mutation-results.json`, each carrying the fingerprint of the code and data it ran against (`scripts/fingerprint.mjs`); a record that is missing, edited or unpinned prints FAIL and fails the verdict (exit 1); one from other code is a GAP. HILO-28: the fresh copy reproduces the verdict and its exit code, audit ID PF-2026-HB04; HILO-29: 56/56 mutations killed by their named check, 2/2 controls held |
| HILO-30 (package) | PASS | 11 declared-limitation rows, the load-bearing premises with "Could the data contradict it?", every exhibit E01…E07 listed by file name, and the count line above equal to the run |
| HILO-31 | FLAG (operator) | Open question 6, decided 16 Oct 2026. Measured, operator side: the server dealt from the start card sent in 7,777/7,777 rounds and accepted 7,630 non-carried start cards; for 11 of 13 next ranks a start card exists on which the likelier-side guess loses (131/169 = 77.5 % wins with an independent start card). The start card is not committed by the seed pair: an operator-origin FLAG. Not exercised: the page's carry-over (DL-5) |
| HILO-32 | PASS | the round left open on 12 Oct was cashed out by the server at its value 0.0234, 25h08m53s after its last decision (25h08m52s after the capture's leftOpen.at); the likelier-side branch not exercised, declared unwitnessed (DL-6), which the rule allows |

### False-alarm rates

Pass 1 uniformity screen 0.0033 (α/3, the 52 bins equal); edge bands ≤ 4.9 × 10^-7 each. Pass 2, the scored per-slot
standardised rule at level 0.008 over the 7,777 played slots of every revealed seed: 0.00836 ± 0.000204; on the 6,500
Phase A slots at 0.01 the same rule measured 0.01013 ± 0.000224, above the cap, which is why its level is 0.008 (DL-10); the
payout-weighted rule scored until 14 Oct on the Phase A slots, at 0.01: 0.00915 ± 0.000213 (`src/false-alarm-pass2.ts`;
`npm run false-alarm:pass2` prints all three, 200,000 replicates each). All scored rates are under the 1 % cap for a failing
step.

### Framework S5 matrix and offline checks

S5 level: the framework's fairness-integrity matrix.

<!-- S5-MATRIX:BEGIN -->
| Test ID | Category | What the framework tests | Result | Tied to |
|---|---|---|---|---|
| S5-1 | Replay protection | A completed bet ID cannot be replayed to duplicate a payout | Not tested | The row's control, the replay of a completed round with its payout, was exercised by no test of the report. Observed on another case, which does not close the row: HB-HILO-REPLAY-001, HB-HILO-IDEMP-001: two identical bet requests with one shared request key, sent in parallel, returned the same round with a single debit, and a bet abandoned by the client and retried with the same key returned that round with one stake debited; both re-sent a bet whose round was still open and counted the stake debit. Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: no replay of a completed round was sent on purpose. Observed only: 686 requests of the 12 Oct file repeated a generation already used (the capture's fault, before its fix) and the server answered each with exactly its stored answer (HILO-10, DL-3); every captured round settled once, with one payout (HILO-11, HILO-16). DL-11 |
| S5-2 | Input validation | Invalid, out-of-range or malformed parameters are rejected | Pass on part of its control (client-seed input only) | HB-HILO-SEED-001: Client seeds longer than 60 characters and a whitespace-only seed were rejected; seeds up to 60 characters were accepted. Not covered: tested on client-seed input only; bad values of the bet's own parameters were not sent here (stakes: S5-7). Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: the capture sent only valid stakes and buttons. Observed only: an empty client seed, sent once on purpose, was refused, HTTP 400 (E05); the server accepted every start card sent, 7,630 of them not the previous round's last card (HILO-31). DL-11 |
| S5-3 | Seed integrity under adversarial input | Server and client seed fields cannot be injected or overridden via the API | Pass | HB-HILO-MAXWIN-002: A bet carrying injected nonce, payout, multiplier, seed, win-chance, card, state, max-win and balance fields was rejected at validation, so nothing could be adopted; the control bet settled normally. Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: no injection was attempted. Observed only: every server answer of a round carries its pair's committed hash and client seed (HILO-03), and the 4 player-set Phase D seeds are the ones the cards recompute with (HILO-06). DL-11 |
| S5-4 | Cross-player isolation | One player's seeds, nonces or outcomes are not observable or influenced by another | Pass on 1 of 2 controls; 1 not tested | HB-HILO-AUTH-001: Bets carrying foreign and malformed user identifiers were rejected; the control bet stayed in the caller's own seed and balance chain and no bet was attributed to another account. Not covered: observation by another account was not tested; influence was tested from one account, by sending another account's identifier. Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: single test account (EC-9). DL-11 |
| S5-5 | Payout field integrity | Client-supplied payout or multiplier values are ignored by the server | Pass | HB-HILO-MAXWIN-002: A bet carrying injected nonce, payout, multiplier, seed, win-chance, card, state, max-win and balance fields was rejected at validation, so nothing could be adopted; the control bet settled normally. Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: the capture never sent a payout or multiplier field. Observed only: every payout equals floor(stake × the formula multiplier) at 1e-8 (HILO-11, HILO-13). DL-11 |
| S5-6 | Nonce sequence enforcement | Nonces cannot be forced, replayed or skipped via the API | Pass | HB-HILO-NONCE-001, HB-HILO-NONCE-002, HB-HILO-NONCE-003, HB-HILO-NONCE-004, HB-HILO-RACE-001, HB-HILO-MAXWIN-002: Bets carrying reused, skipped-ahead, zero, negative and overflow-sized nonces, or an injected nonce field, were rejected at validation and only the control and recovery bets advanced the nonce; under bursts of parallel bets accepted nonces were unique and in sequence. Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: no nonce was supplied by the client. Observed only: nonces run 1..50 in every Phase A pair, and each round's nonce is the server's count before it + 1 on 7,777/7,777 rounds (HILO-04). DL-11 |
| S5-7 | Parameter boundary enforcement | Bet amounts, configuration values and game parameters outside valid ranges are rejected | Pass on 1 of 2 controls; 1 not tested | HB-HILO-MAXWIN-001: Stakes far above the maximum, positive stakes below the minimum and negative stakes were rejected with a message quoting the limit, and no round opened. Not covered: no test sent a configuration value or game parameter outside a range. Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: no out-of-range stake was sent. Observed only: the cap branches (max win, the 52nd card) were not reached, and every served button carried `allowed: true` (HILO-14, DL-4). DL-11 |
| S5-8 | Game-specific state | For Hilo: guessing after a wrong guess, cashing out before a right guess | Pass on 1 of 2 controls; 1 not tested | HB-HILO-EXTRA-003: A cash-out attempted after skips alone, with no winning guess, was refused every time. Not covered: a guess sent after a wrong guess was not tested. Report, Section 5 (Fairness Integrity Testing). This package's own capture, separately: no guess after a loss was attempted. Observed only: a cash-out before any right guess, sent on purpose twice, was refused both times, HTTP 400 code 6, the round still open (HILO-10); every bust ends on a wrong guess paying 0 (HILO-10). DL-11 |
<!-- S5-MATRIX:END -->

Of the eight framework rows, **3 pass on every control the row names**, **4 pass on part of the controls they name** (S5-2,
S5-4, S5-7, S5-8: the row's status says how many of its controls were tested, and its evidence cell what was not) and **1
remains Not tested** (S5-1: no test replayed a completed round). The passing rows rest on fairness-integrity tests run separately on HouseBets' running service by
ProvablyFair.org; they are recorded in the ProvablyFair.org report for this game, Section 5 (Fairness Integrity Testing),
not in this package's data, so nothing in this package reproduces them. The matrix names 12 of that section's 29 tests: 10
under the row whose control they test and two (HB-HILO-REPLAY-001, HB-HILO-IDEMP-001) under S5-1 as observations on another case; the other 17 tests check controls outside these eight rows (2 of them recorded there
as fixed by HouseBets) and are in the report only. This package's own capture recorded normal play, deliberate negative
tests (an empty client seed; two cash-outs before any right guess) and requests its own fault repeated; it sent no other
adversarial request. The "Observed only" notes state what the captured data shows; none substitutes for the adversarial
test, and reproducing a test from this package needs a deliberate probe capture (DL-11).

The nine offline consistency checks are this audit's own ids, not the framework's S5 rows:

| Check | Category | What was tested | Result | Finding |
|---|---|---|---|---|
| EC-1 | Commitment integrity | Seed substitution: can a revealed seed be swapped for a better one that still matches the commitment? | Pass | 163/163 seeds hash to their commitments and every chain links in order from a pre-capture anchor; these are consistency checks, the timing rests on the capture's reads before each pair (P-1). HILO-01, HILO-02 |
| EC-2 | Player influence | Client-seed manipulation: does the client seed enter the derivation? | Pass | 6,363/6,500 first cards change under a wrong client seed (137 chance matches, 125 expected); Phase D 200/200 recompute under player-set seeds, 195/200 first cards differ from the previous seed's. HILO-06 |
| EC-3 | Payout integrity | Stake-conditional outcome: do the captured higher-stake rounds recompute and settle by the same rule as the base stake? | Pass | Phase C at 100 × the base stake and the $10 set (200 rounds each) recompute and pay by the same rule; the derivation takes no stake input. HILO-12 |
| EC-4 | Commitment integrity | Server-seed cherry-picking: can the operator pre-select seeds unfavourable for the early nonces? | Pass | Structural only for a client seed the player sets after the hash is shown, as the capture did on 159 of 163 pairs (P-1); the 4 Phase D client seeds were chosen before the capture (DL-2), so the structural argument does not cover those pairs, which are in the Pass 2 screen; who generates HouseBets' default client seed was not checked. Statistical: Pass 2 over all 163 revealed seeds × 10,000 nonces, each round by its first guess, scored per-slot standardised return z 0.180, p 0.5713, detection power 2.45 pp per round. Nothing here rules out selection across the capture as a whole. HILO-21, HILO-06 |
| EC-5 | Seed lifecycle | Seed-rotation race: can a rotation during an open round change its seed? | Not tested | Every round's answers carry the hash of the pair it was opened on (HILO-03), and the capture rotated only between rounds, so a rotation during an open round was not exercised |
| EC-6 | Payout integrity | Multiplier tampering: is any win or offered button at a multiplier other than the published formula's? | Pass | Recomputed from the derived cards and compared with the served values: 3,983/3,983 settled multipliers, 4,885/4,885 intermediate values, 15,554/15,554 buttons on bet answers and 9,926/9,926 later, payouts exact. HILO-13, HILO-11 |
| EC-7 | Nonce integrity | Nonce manipulation: are nonces skipped, reused or reordered? | Pass | 130/130 Phase A pairs run exactly 1..50 with the server's count equal to 50; every round's nonce is the server's count before it + 1, and every server answer of a round carries the same nonce. HILO-04 |
| EC-8 | RNG integrity | Range-mapping bias: does the u32-to-card map favour some cards? | Pass | Below 4294967248 every card id has 82,595,524 values; bias 0. HILO-08 |
| EC-9 | Scope limitation | Multi-account seed sharing | Not tested | Single test account |

## Player verifiers

The ProvablyFair.org verifier for HouseBets is at
[provablyfair.org/verify-bets/housebets](https://www.provablyfair.org/verify-bets/housebets). The module it runs for this
game ships in this release as `site-verifier/derive.js`, sha256
`3324e3a3f705e3d96be527176483363bdc6497fcb598822b6d5faa0af7667903`. The live verifier serves exactly these bytes.

**How the module is built.** `npm run build:site-verifier` (`scripts/build-site-verifier.mjs`, bun 1.3.9) bundles
`src/rng.ts` into one ES module with no import, which exports the same functions and constants under the same names
(`CARDS`, `REJECT_AT`, `cardFromU`, `hmacBlock`, `sha256Hex`, `streamCards`) and runs in a browser and in Node. `src/rng.ts`
takes SHA-256 and HMAC-SHA256 from Node; a browser page has no such module, so the build puts its own implementation of the
two inside the file. Nothing else differs from `src/rng.ts`. The same sources give the same bytes: the file's header carries
the sha256 of `src/rng.ts` and no date, host or path, the bun version is fixed, and
`node scripts/release-manifest.mjs --check` rebuilds the module in a throwaway folder and requires the shipped file to equal
the rebuild byte for byte.

**What HILO-24 checks, on every run.** The file on disk has the sha256 pinned in `src/artifact-pins.ts`
(`SITE_VERIFIER_PIN`) and in RELEASE-MANIFEST.json, and this document and the README quote it. The module is then loaded
from that file and run side by side with `src/rng.ts` on every captured round of the six shipped datasets (the rounds
HILO-07 recomputes), with the seed, client seed, nonce and card count of each round: 7,777 rounds and 163 revealed seeds,
77,935 calls over its four functions and two constants, 0 differing results. Two mutations cover the check
(`tests/mutations.json`): M24a changes the card formula inside the module (u mod 52 to u mod 51) and re-pins it everywhere,
so only the side-by-side run can catch it; M24b breaks the pin and leaves the module alone. To confirm the bytes a page
serves, compare the sha256 of the module it loads with the one above.

HouseBets' own verify screen was not tested against this package (DL-8).

## Reproduce the audit

`node verify.js` on Node 22, or `npm test` on Node 22.6 or later, with nothing installed. Re-generation of the artifacts of record:
`npm run simulate` (the census, `outputs/simulation-results.json`), `npm run rtp-claim:write` (the RTP table),
`npm run record` (the verification record) — each re-pinned in `src/artifact-pins.ts` (and `src/rtp-settings.ts`) in the
same change, then `npm run build:site-verifier` (rebuilds `site-verifier/derive.js` from `src/rng.ts` and writes its pin) and
`npm run build:standalone` (verify.js; HILO-27 refuses a bundle built from other sources, and a stale `verify.js` itself exits 4 with no verdict). `npm run
false-alarm:pass2` re-checks the Pass 2 false-alarm declarations. `npm run mutate` runs the mutation battery in throwaway
copies and writes the committed record `outputs/mutation-results.json`; `npm run gate:fresh` runs the package from a fresh
copy and writes `outputs/fresh-copy.json`; `npm run release-manifest` then pins both in RELEASE-MANIFEST.json (HILO-28/29
read only those pinned records). RELEASE-MANIFEST.json pins every file of the package except itself.

A release-gate record that is missing or is not the bytes RELEASE-MANIFEST.json pins fails the verdict (exit 1), and every
mutant copy reads the fresh-copy record, so the records are regenerated in this order: `npm run build:standalone`,
`npm run gate:fresh`, `npm run release-manifest`, `npm run mutate`, `npm run release-manifest`. HILO-24 reads the module's
pin from RELEASE-MANIFEST.json, so after a change of `src/rng.ts` these come first: `npm run build:site-verifier`,
`npm run release-manifest`.

`verify.js` is bundled by bun; the version that built it is written into its header and recorded in RELEASE-MANIFEST.json
as `toolchain.bun`. `node scripts/release-manifest.mjs --check` recomputes the manifest from the files on disk, rebuilds
`site-verifier/derive.js` from `src/rng.ts` (bun 1.3.9) and requires the shipped file to equal the rebuild, and prints
OK or STALE; on STALE it names the files that differ, and when `verify.js` is one of them it names the bun version that built
the release's bundle, the one that built the bundle on disk and this machine's. Another bun version can bundle the same
sources to different bytes (local names) with the same results, so a STALE that names only `verify.js` after a local rebuild
is that toolchain difference: compare the `VERDICT:` and `Reproduction` lines of `node verify.js` on both.

Exit codes of `node verify.js` / `npm run verify`, the same in all 11 HouseBets new-engine packages (the ranking of
RTP-CLAIM 1.2.0, `rtpClaimVerdict`): 0 PROVABLY FAIR — Full Pass · 2 PROVABLY FAIR — Conditional Pass · 5 RTP FIGURE
OVERSTATED · 3 INCOMPLETE · 1 NOT PROVABLY FAIR · 4 `verify.js` is a stale build of the sources beside it (no verdict). When
more than one applies: NOT PROVABLY FAIR > INCOMPLETE > RTP FIGURE OVERSTATED > Conditional Pass > Full Pass.

## Evidence

| exhibit | file | role |
|---|---|---|
| E01 | `evidence/E01-hilo2-fairness-spec-2026-10-13.json` | the server's published hilo spec (cards, start card, buttons, rules, multiplier, return, four streams, seven payouts), the same answer on 12 and 13 Oct |
| E02 | `evidence/E02-hilo2-limits-2026-10-13.json` | the limits answer: minimum stake 0.01000311 USDT, max win 1,000,310.0961298, wallet decimals 8 |
| E03 | `evidence/E03-hilo-bet-history-2026-10-13.json` | the platform's bet-history rows of all 7,777 rounds in the package |
| E04 | `evidence/E04-account-reconcile-2026-10-13.txt` | the whole account's reconciliation, the full output of the workshop's `python3 -I reconcile-full.py --ledger ledger/ledger-2026-10-13-final.json --before 986.84718000` (ends RECONCILED; the exhibit is the bare output, so the `--before` argument is held in `tests/verify.ts`, HILO-16): 60 capture files, 86,979 history entries = 86,966 captured rounds + 13 from 10 Oct, 0 unexplained |
| E05 | `evidence/E05-hilo-empty-seed-control-2026-10-13.json` | the server's answer to an empty client seed: refused, HTTP 400 |
| E06 | `evidence/E06-hilo2-bundle-start-card-2026-10-10.json` | the live page's bundle (`platform-housegames-hilo2-game.js`, sha256 `2bb32f6a…`, script tag on the hilo page checked 10 Oct 2026): how the start card is drawn (crypto `Uint32 mod 52`: 2^32 mod 52 = 48, so within about 1e-8 of uniform, not exactly; `Math.random` if crypto throws), carried over and sent; the rules panel's return and start-card texts (English, `rulesHiloReturn`, `rulesHiloStart`); the fairness request whose answer the page keeps as its settings; the hi / lo button gate on `allowed` |
| E07 | `evidence/E07-hilo2-rules-panel-live-2026-10-19.json` | every rules panel key (English) in the live copy of the hilo2 bundle, fetched 19 Oct 2026 (last-modified Fri, 16 Oct 2026 09:18:09 GMT, sha256 and etag recorded), with every key changed since the 10 Oct copy (rulesHiloReturn reworded; Min bet / Max bet lines replace the bet-range line) |

**Capture code (`capture/`, reference copy).** `capture-hb-hilo.reference.mjs` (the game's capture script), `multistep-common.reference.mjs`
and `hb-capture-lib.reference.mjs` (the modules it imports) and `crypto-shim.reference.js` (the browser stand-in for
`node:crypto` the in-tab capture ran with). Comments are redacted for publication (names, quotes and internal paths
removed); the code is unchanged. The as-run game script, sha256 `1f4fb06af749c5f57e3d1b57dd78c21ba433e49e3c4db907bcb6f7e612b108ef`, the value every 13 Oct
dataset records as `meta.captureScript.sha256`, is held privately; the shipped copy is not that file. The 12 Oct file
records the version of the script used on 12 Oct (`922f2782…`), whose copy was not kept. No hash of the three other files was recorded at
capture, so their as-run copies are not identified. The copies are pinned in RELEASE-MANIFEST.json.

`scripts/make-evidence.py` records the source path and sha256 of each exhibit; `scripts/make-live-rules.py` builds E07 from the
live bundle copy of 19 Oct and stops unless its reading reproduces the two rules keys E06 quotes from the 10 Oct copy.

## Limitations and trust

### Load-bearing premises

| ID | Premise | Why it holds | Could the data contradict it? |
|---|---|---|---|
| P-1 | Each commitment was shown before its rounds. On the 159 of 163 pairs whose client seed the capture drew (every pair outside Phase D), the seed was drawn after the commitment was read; the 4 Phase D client seeds were chosen before the capture (DL-2), and each of their commitments was read before the pair's first round | The capture read the hash, then drew the seed, then played; both times are logged per pair (the seed generator is the capture's own label, DL-2) | Partly: a commitment that did not match its revealed seed would fail HILO-01; the order of reads is the capture's record, not the server's |
| P-2 | E01 is the rule set players are held to | It is the server's own published answer, identical on 12 and 13 Oct | No: whether the page renders this text was not checked; a different page text would not show in the data |
| P-3 | The start card the server dealt from is the one the page showed | The server dealt from the card in the bet body in 7,777/7,777 rounds (HILO-31) | Only for this capture, which sent its own cards; what the page shows was not captured (DL-5) |
| P-4 | The account was used only by the capture | E04: the history holds the captured rounds and 13 earlier bets, nothing else | Yes: any other bet would be an unexplained history entry |

### Declared limitations register

| ID | Limitation | Effect | Closure / evidence |
|---|---|---|---|
| DL-1 | Commitment timing rests on the capture's reads (P-1) | Hash equality is a consistency check | — |
| DL-2 | Phase D client seeds are predictable strings chosen by the auditor (`provablyfair-1`, `provablyfair-2`, `player-seed-abc`, `1234567890`) | Phase D tests recomputation, not unpredictability | Phases A, C, C $10 and E client seeds are labelled by the capture as `node:crypto randomBytes(16) hex` (150/150); the check is a label match. A redacted reference copy of the capture code is in `capture/` (the client seed is `csprngClientSeed` in `hb-capture-lib.reference.mjs`: a prefix and `randomBytes(16)` in hex, in the browser `window.crypto.getRandomValues`, `crypto-shim.reference.js`); the as-run game script is held privately, so the shipped copy shows the code, not proof of what ran ([Evidence](#evidence)) |
| DL-3 | The 12 Oct file was captured before the rig's generation fix: 686 of its requests repeated a generation already used and the server answered each with exactly its stored answer (the generation is its idempotency key); 1 more was never sent. Its 9 seed pairs are not whole epochs of 50 | The repeats are set aside before the game checks, as the capture verifier does (HILO-10 checks the stored answers); the file is recomputed round by round; it is outside the HILO-05 whole-epoch population, and its 9 seed pairs and 77 played rounds are in the Pass 2 replay (HILO-21), the repeats set aside | The 13 Oct sets have 0 repeats and whole epochs |
| DL-4 | The cap branches (max win, a right guess on the 52nd card) were not reached | HILO-14 passes with the branches declared unwitnessed, as its rule allows; the published caps are taken from E01, not witnessed | Reaching the max win needs a multiplier above ×100,000 at a stake of at most 10 |
| DL-5 | The start card is not committed by the seed pair: the page chooses it and the server deals from the card sent (measured, operator side: 7,777/7,777 rounds; 7,630 non-carried start cards accepted). Risk: for 11 of 13 next ranks a start card exists on which the likelier-side guess loses (131/169 wins with an independent start card); independence comes from the page's code (E06), not from the commitment. The capture sent its own random cards, so the page's carry-over was not exercised | HILO-31 is an operator-origin FLAG (open question 6, decided 16 Oct 2026), so the verdict is Conditional Pass; the page's carry-over stays unexercised. The start rank changes the first-guess RTP by at most 4.62 × 10^-9 only when the start card is independent of the stream | Open question 6 below (decided) |
| DL-6 | The 24 h rule was witnessed on a round that could cash out; the "guess on the likelier side" branch was not | HILO-32 passes with the branch declared unwitnessed, as its rule allows | The round was still open at 24.012, 24.582 and 25.03 h and settled 25h08m53s after its last decision (open question 5) |
| DL-7 | The per-round balance field cannot be checked round to round: the mines and Hubie's Road captures ran during Phase A (13 Oct 15:00–18:22 UTC), so consecutive hilo answers interleave their settlements | Reconciliation uses the platform history (E03) and the account (E04) instead | E04 RECONCILED |
| DL-8 | The player-facing reveal path was observed in the API (the rotation's answer carries the previous seed), not on the rendered verify screen | README "Verify a bet" steps 1 and 2 are scoped to that: they name the API fields, not a place on the screen | — |
| DL-9 | The skip branch of the card map (u32 ≥ 4294967248, chance 1.12 × 10^-8 per u32) was never hit by a captured or simulated card | The branch is covered by the census over all 2^32 values and a unit test of the map's edges, not by a recomputed stream | — |
| DL-10 | Pass 2's scored statistic is, since 14 Oct, the per-slot standardised return of the played slots, and since 27 Oct its population is every round of every revealed seed, by its first guess (7,777 slots on 163 seeds), as the profile's -21 rule asks; until then it was the 6,500 Phase A slots. A round's later guesses depend on the cards before them and are not replayed. Both changes were made AFTER the earlier result was known: the switch from the payout-weighted return after that result, the widening after the Phase A result. All three are printed and all pass (standardised over every seed z 0.180, p 0.5713; Phase A alone z −0.315; payout-weighted Phase A z −0.137, p 0.4455), above 0.008 and 0.01 alike. At level 0.01 the standardised rule's false-alarm rate on the Phase A slots measured 0.01013 ± 0.000224, above the 1 % cap, so its level was set to 0.008 from that calibration alone, before the standardised live statistic was first computed; at 0.008 its rate over every slot is 0.00836 ± 0.000204. The order rests on the builder's session record, not on an artifact in the package | A uniform deficit is detectable at 2.45 pp per round at 80 % power | — |
| DL-11 | This package's capture sent no adversarial request to the API, so its data cannot reproduce a fairness-integrity test | The tests behind the S5 matrix were run separately on HouseBets' running service by ProvablyFair.org and are recorded in the ProvablyFair.org report for this game, Section 5 (Fairness Integrity Testing), not in this package: 7 of 8 rows Pass on them (3 on every control the row names, 4 on part), 1 remains Not tested (S5-1, where both tests re-sent a bet whose round was still open and not a completed round); single test account. The deliberate negative tests (an empty client seed, E05; two cash-outs before any right guess) and the requests the capture repeated are noted under S5-1, S5-2 and S5-8, and close no row | The S5 matrix under [Verification results](#verification-results) names the tests behind each row and states what the captured data shows. Reproducing a test from this package needs a deliberate probe capture |

## Open questions for the profile owner

The hilo profile was PROPOSED when these were written (13 Oct); on 14 Oct 2026 the cited version, 1.0.0, was approved as it stands (Methodology v1.1). These are the decisions it left open (numbered as in the 13 Oct profile note); 6 is decided.

- **2. Simulation floor.** The hilo reading of the Pass 1 floor used here: ≥ 2,000,000 cards plus ≥ 1,000,000 rounds per
  start rank × side.
- **3. Two elevated tiers in Phase C.** 100 × the base stake (2) and the $10 set, both scored under HILO-12.
- **5. The 24 h rule's timing.** The server finished the abandoned round 1h08m53s after the 24 h mark (from its last
  decision); the page gives no precision for "24 hours". HILO-32 reports the time and does not score it.
- **6. The start card.** It is not committed by the seed pair, and the server accepts any start card the client sends
  (measured). "Any start card is worth the same" holds only for a start card independent of the next card; for 11 of 13
  next ranks a chosen start card can make the likelier-side guess lose. Independence rests on the page's code (E06). Is
  that acceptable provably-fair design, and is the operator-side fact a capture FLAG, an operator FLAG or a PASS (DL-5)?
  The rules panel states the carry-over as a rule ("A round starts on the card on top: the last card of the previous round,
  or a new one drawn by Skip before the bet", E06 `rulesHiloStart`), and the server accepted 7,630 start cards that were not
  the previous round's last card. **Decided 16 Oct 2026:** the start card not being committed by the seed pair is an
  operator-origin FLAG. HILO-31 is an operator FLAG and the verdict is PROVABLY FAIR — Conditional Pass (exit 2).
- **7. Pass 2 level.** The scored standardised rule runs at 0.008 because at 0.01 its false-alarm rate is above the cap
  (DL-10). Either choice gives the same verdict here.

## Terms

**G-BIND:** the framework's population rule (HILO-05): the counts a dataset is checked against are code constants in
`src/loader.ts`, never the dataset's own header.

## Release history

**`v1.0.0`**: first public release, 24 Nov 2026. Verdict PROVABLY FAIR — Conditional Pass (the start card, open
question 6, decided 16 Oct 2026).

E04, the account's reconciliation, also lists 13 bets of 10 October 2026, placed before the capture; they are in no dataset
of this package.
