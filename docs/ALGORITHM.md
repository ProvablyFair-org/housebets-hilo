# HouseBets Hilo: algorithm specification

Written 21 Oct 2026 for the ProvablyFair.org audit of HouseBets House Games **Hilo** on the engine HouseBets serves since
October 2026 (bundle and API slug `hilo2`, fairness version `canonical`).

HouseBets publishes this game's algorithm. This document restates it as one implementable specification and records,
for every step, where it comes from and what the capture measured. It is not a clean-room reconstruction: the steps are
the ones HouseBets publishes, and every formula below is the one this package computes (`src/rng.ts`, `src/rules.ts`).
Every step names its source:

- **PAGE**: HouseBets' own published text. E01 is the server's fairness answer, `GET /housegames/hilo2/fairness`
  (`evidence/E01-hilo2-fairness-spec-2026-10-13.json`, the same answer on 12 and 13 Oct 2026). E06 holds excerpts of the
  hilo2 page bundle of 10 Oct 2026 (the start card, the rules panel); E07 is the rules panel in the live bundle of
  16 Oct 2026. E02 holds the wallet limits.
- **CODE**: this package's implementation of the step, `src/rng.ts` or `src/rules.ts`.
- **DATA**: the scored check of `node verify.js` that holds the step against the captured rounds (HILO-xx). The capture
  is 7,777 rounds in six files: Phase A, C, C $10, D, E of 13 Oct 2026 and the 12 Oct 2026 file; see
  [MANIFEST.md](../MANIFEST.md#dataset-and-capture).

---

## 1. Inputs and commitment

### 1.1 Inputs

| Input | Form | Source |
|---|---|---|
| `serverSeed` | text string, secret until the pair is rotated; 64 lowercase hex characters in every captured pair | PAGE: E01 `derivation` ("key = serverSeed"). DATA: 163 revealed seeds (HILO-01) |
| `clientSeed` | text string set by the player | PAGE: E01 `derivation`. DATA: capture seeds, and four auditor-typed seeds in Phase D (HILO-06) |
| `nonce` | integer ≥ 1; 1 on the first round of a fresh pair, +1 per round; **one nonce per round** | PAGE: E01 `derivation`. DATA: each round's nonce = the server's count before it + 1 on 7,777 / 7,777 rounds (HILO-04) |
| start card | card id 0 … 51, **not from the stream**: the card showing when the bet is placed | PAGE: E01 `derivation`; E06 (the page draws it and sends it in the bet body). See §2.4 |
| decisions | per card: guess `hi`, guess `lo`, skip, or cash out | PAGE: E01 `rules[0]`, `rules[4]` |
| `stake` | decimal on the wallet's 1e-8 grid | PAGE: E01 `rules[6]`; E02 limits |

**Cards.** Card id 0 … 51: suit = ⌊id / 13⌋ (0 ♠, 1 ♥, 2 ♦, 3 ♣), rank = id mod 13 (0 = A lowest … 12 = K highest). The
deck is infinite: every card is drawn independently, 1 in 13 for each rank (PAGE: E01 `cards`; CODE `rankOf`).

### 1.2 Commitment

```
commitment = lowercase_hex( SHA-256( UTF-8(serverSeed) ) )
```

- SOURCE: CODE `sha256Hex` (`src/rng.ts`).
- DATA: 163 / 163 revealed seeds hash to the commitment shown before their rounds (HILO-01); each pair also shows the hash
  of the next seed, and the chains link (HILO-02). Every server answer of a round carries the settled hash, client seed,
  version, nonce and round id (HILO-03).

---

## 2. Card stream derivation

### Step 1: HMAC blocks

```
block(b) = HMAC-SHA256( key = UTF-8(serverSeed), message = UTF-8(clientSeed + ":" + dec(nonce) + ":" + dec(b)) )
stream   = block(0) ‖ block(1) ‖ …   read 4 bytes at a time as unsigned 32-bit BIG-ENDIAN integers u
```

- SOURCE: PAGE E01 `derivation`; CODE `hmacBlock`, `streamCards` (`src/rng.ts`).

### Step 2: u to a card, with rejection

```
REJECT_AT = 2^32 − (2^32 mod 52) = 4294967296 − 48 = 4294967248
card(u)   = skipped                if u ≥ REJECT_AT
            u mod 52               otherwise
```

Stream card j (j = 0, 1, …) is the j-th card that is not skipped.

- SOURCE: PAGE E01 `derivation` ("A u32 of 4294967248 or more (2^32 − 2^32 mod 52) is skipped; otherwise the card is u32
  mod 52"); CODE `REJECT_AT`, `cardFromU`, `streamCards` (`src/rng.ts`).
- Below the threshold every card id has exactly 82,595,524 of the 2^32 values of u: the map is exactly uniform, bias 0
  (HILO-08, a census over all 2^32 values). A u is skipped with chance 48 / 2^32 ≈ 1.12 × 10^-8; no captured or simulated
  u reached the skip branch (DL-9).

### Step 3: the turned cards

```
turned card k (k = 1, 2, …) = stream card k − 1          # every card turned after the start card, by a guess or a skip
```

A round shows at most 52 cards: the start card and 51 more (PAGE: E01 `rules[3]`).

- SOURCE: PAGE E01 `derivation` ("One nonce per round: the k-th card turned after the start card (by a guess or a skip) is
  stream card k − 1").
- DATA: turned card k equals stream card k − 1 on Phase A 6,500 / 6,500, C 200 / 200, C $10 200 / 200, D 200 / 200,
  E 600 / 600 and 12 Oct 77 / 77 rounds (HILO-07). E01's four published streams recompute, block 0 included (HILO-09).
- The stream depends only on (serverSeed, clientSeed, nonce). Every Phase E step's cards are a prefix of the settled cards,
  600 / 600: the sequence is fixed before the first decision (HILO-17).

### 2.4 The start card

The start card is not drawn from the stream. E01: "it is the card you see when you bet (it carries over from your last
round, or a free skip before the bet drew it), and any start card is worth the same". The page draws it with
`crypto.getRandomValues` mod 52, keeps it in local storage, carries the last card of a round over, and sends it in the bet
body (E06). The server starts every round on the card the client sent: 7,777 / 7,777 rounds, and 7,630 of the 7,771
rounds after the first of each dataset started on a card that was not the previous round's last card (HILO-31).

Because the seed pair does not commit the start card, its independence from the next card rests on the page's code, not
on the commitment. This is the operator-origin FLAG HILO-31 (decided 16 Oct 2026), and the reason the verdict is
**PROVABLY FAIR — Conditional Pass** (MANIFEST.md, open question 6; DL-5).

---

## 3. Guesses, multiplier and payout

### 3.1 Buttons and the win rule

For the card showing, of rank r:

```
r = 0 (A):        hi = "Higher" (n 12)           lo = "Same" (n 1)
r = 1 … 11:       hi = "Higher or same" (n 13 − r)   lo = "Lower or same" (n r + 1)
r = 12 (K):       hi = "Same" (n 1)              lo = "Lower" (n 12)

hi wins on next rank t ⇔ (r = 0: t > 0)  (r = 12: t = 12)  (otherwise t ≥ r)
lo wins on next rank t ⇔ (r = 12: t < 12) (r = 0: t = 0)   (otherwise t ≤ r)
```

n is the number of the 13 ranks on which the guess wins; a tie wins an "or same" guess.

- SOURCE: PAGE E01 `buttons`, `rules[1]`; CODE `wins`, `nOf` (`src/rules.ts`).
- DATA: over the derived cards, the served n equals the button table on 8,661 / 8,661 guesses and the served win equals
  the rule on 8,661 / 8,661 (HILO-10); the count of winning next ranks equals n in all 26 (rank, side) cells, so a guess on
  n ranks wins with chance n/13 (HILO-18).

### 3.2 Round flow

- A wrong guess ends the round and pays nothing. A skip turns the next card and never changes the multiplier; a skip always
  leaves a card to guess on (PAGE: E01 `rules[2]`, `rules[3]`).
- A paid round can cash out after its first right guess; a free ($0) round once a card has been turned (PAGE: E01
  `rules[4]`).
- CODE: `replay` (`src/rules.ts`). DATA: the outcome (bust / cashout / capped / deck) equals the replay on 7,777 / 7,777
  rounds; every bust ends on a wrong guess paying 0, 3,794 / 3,794 (HILO-10).

### 3.3 Multiplier

```
multiplier8(n_1 … n_k) = floor( 99 · 10^8 · 13^k / (100 · Π n_i) )        # in 1e-8 units: 99/100 × Π 13/n_i, cut to 8 decimals
multiplier8()          = 1.00000000                                      # no right guess yet
```

- SOURCE: PAGE E01 `multiplier` ("99/100 × Π 13 / n_i, cut to 8 decimals"); CODE `multiplier8` (`src/rules.ts`).
- The 1 % edge is charged once, on the first right guess; every later guess is priced fair (PAGE: E01 `return`).
- DATA: settled multiplier on 3,983 / 3,983 winning rounds and every open step after a right guess, 4,885 / 4,885; the 26
  published first-guess values `hiFirst` / `loFirst` (HILO-13). Before every guess the page shows two buttons with n,
  multiplier and value; recomputed from the derived cards: 15,554 / 15,554 on bet answers and 9,926 / 9,926 on later
  answers (HILO-13).

### 3.4 Payout

```
payout8 = floor( stake8 × multiplier8 / 10^8 )        # rounded down once to 1e-8
loss: payout = 0
```

- SOURCE: PAGE E01 `multiplier` ("a stake is paid floor(stake × multiplier)"), `rules[6]`; CODE `payout8`, `units8`
  (`src/rules.ts`).
- DATA: exact on all 7,777 rounds of the six files (HILO-11). The two-step rule (cut the multiplier to 8 decimals, then
  floor the product) is what the server does: on 16 settled rounds a single floor of stake × the exact 0.99·Π 13/n would pay
  a different amount (MANIFEST.md, Payouts and RTP).

### 3.5 Caps

```
after a right guess:  if payout8 ≥ stake8 + maxWin8:  settle "capped", pay stake + maxWin
                      else if 52 cards are showing:  settle "deck", pay payout8
```

A round never pays more than its max win above the stake; a right guess on the 52nd card also cashes the round out
(PAGE: E01 `rules[5]`; `maxWin` 1000310.0961298 USDT, E02). CODE: `replay` (`src/rules.ts`). Neither branch was reached
(HILO-14 passes with them declared; DL-4). Each served button carries `allowed`, true only while its value stays within the max
win, and the page offers a guess only when it is true (E06); in the data it was only ever true (DL-4).

### 3.6 Return

```
RTP(n_1 … n_k) = multiplier8(n_1 … n_k) × Π n_i / 13^k          # chance of k right guesses × what they pay
```

Exactly 0.99 before the 8-decimal cut. Across the 22,620 n-sequences up to depth 4 the cut RTP runs from 0.989999992941
(four guesses on 12 ranks) to 0.990000000000 (one guess on 1 rank), never above 0.99, before the payout is truncated to 1e-8 (HILO-19,
`outputs/rtp-claim-table.json`). The 26 first-guess cells differ in exact RTP by at most 4.62 × 10^-9, so "any start card is
worth the same" holds to the 8-decimal cut for a start card chosen independently of the stream (§2.4).

### 3.7 Idle rounds

A round left without a decision for 24 hours is finished by the server: a round that can cash out is cashed out at its
value; otherwise the card showing is guessed on its likelier side (hi on a tie of chances) and, if the guess is right, the
round is cashed out (PAGE: E01 `rules[7]`; CODE `likelierSide`). DATA: one round, the "can cash out" branch, settled
25 h 08 m 53 s after its last decision; the "likelier side" branch was not exercised (HILO-32 passes with it declared; DL-6).

### 3.8 Fields an implementation must not read

`cards`, `events` (`n`, `win`), `options`, `outcome`, `state`, `multiplier`, `value`, `payout` are the operator's claims,
to be checked. The derivation reads only `serverSeed`, `clientSeed`, `nonce`, the start card, the decisions in order and
the stake.

---

## 4. Source per step (summary)

| Step | Source | Evidence |
|---|---|---|
| Inputs: server seed, client seed, nonce (one per round) | PAGE | E01 `derivation` |
| Nonce starts at 1, +1 per round | DATA | 7,777 / 7,777 (HILO-04) |
| Commitment SHA-256 of the seed's UTF-8 text, hex | CODE + DATA | 163 / 163 (HILO-01) |
| HMAC-SHA256, key = seed text, message `clientSeed:nonce:b`; u = 4 bytes big-endian | PAGE + CODE | E01 `derivation`; E01 block 0 (HILO-09) |
| skip u ≥ 4294967248, card = u mod 52 | PAGE + CODE + DATA | census: 82,595,524 preimages per id, bias 0 (HILO-08) |
| turned card k = stream card k − 1 | PAGE + DATA | every round of the six files (HILO-07) |
| Start card from the client, not the stream | PAGE + DATA | 7,777 / 7,777 accepted (HILO-31 operator FLAG) |
| Buttons and the "or same" tie rule | PAGE + CODE + DATA | 8,661 / 8,661 guesses (HILO-10); 26 / 26 cells (HILO-18) |
| multiplier = 99/100 × Π 13/n_i cut to 8 decimals | PAGE + CODE + DATA | 3,983 / 3,983 settles, 4,885 / 4,885 steps (HILO-13) |
| payout = floor(stake × multiplier8) | PAGE + CODE + DATA | 7,777 / 7,777 (HILO-11) |
| Max win and 52nd-card caps | PAGE + CODE | declared, not reached (HILO-14, DL-4) |
| RTP ≤ 0.99, 0.99 before the cut | PAGE + CODE | 22,620 sequences (HILO-19) |
| 24-hour rule | PAGE + DATA | one round, "can cash out" branch (HILO-32, DL-6) |

---

## 5. Test vectors

Computed on 21 Oct 2026 with this package's own `src/rng.ts` and `src/rules.ts` (§7). Cards are ids 0 … 51; "rank" is
id mod 13 (0 = A … 12 = K).

**V1: E01's published streams** (PAGE, E01 `examples`; block 0 and the first 8 stream cards equal the published ones on
all four, 0 u skipped)
```
serverSeed housebets-demo-server-seed-0001  clientSeed demo-client
    nonce 1  block 0 b6d4152534824db861a00c024857364f8aadd13f1cb8886c33d590e4f6afd484  cards 17 32 50 27 27 40 4 16
    nonce 2  block 0 d1702cc1dcc9afb3f34f7688eceb8a696d5591f4b0d0067f68b3813c137889f5  cards 29 3 40 13 28 19 16 37
    nonce 3  block 0 edf6c897e59ef77db0f9f385f8124ebf95a9dd32fd0a670a742e26c85d6b3663  cards 27 9 45 51 30 50 16 11
serverSeed 5a1f7d2c9e4b8a3f6d0c2b5e8f1a4d7c0b3e6f9a2d5c8b1e4f7a0d3c6b9e2f5a  clientSeed housebets
    nonce 1  block 0 a00c215b420dc9363ba9bdfa6f03cb9f88278f8fab2a291091874d14eda374da  cards 51 18 34 39 19 32 28 38
```

**V2: E01's published payouts** (PAGE, E01 `payouts`, stake 1; `multiplier8` equals the published value on all seven)
```
ns 12            1.07250000     ns 7,7          3.41448979
ns 1            12.87000000     ns 7,7,7        6.34119533
ns 7             1.83857142     ns 12×5         1.47722186
ns 1,1         167.31000000
```
The 13 rows of E01 `buttons` (hiN, loN, hiFirst, loFirst) all equal `nOf` and `multiplier8([n])` (13 / 13).

**V3: round `544ff1bf-b7af-4e1d-a9bc-2736b093f186`** (Phase A, first round, one guess, win)
```
serverSeed  3a094df694deff9df44638eb56f960f3ae855ba39faae6c2dd0b90c6b2f0ebd4
commitment  5015a6f5de18a751a106fae6e0458f1828973186d37804dbabebf6a25ee83961   (= the hash in the round's fairness block)
clientSeed  pfhilostartdd16ca2138ee5d4ba20c7b893782ed58   nonce 1   stake 0.02
block 0     b912baad14abe262df58cd2e4642640b7a4fd2a9ee5763badcb63c42a70fbf4a   u(0) 3105012397 → card 45
start card 28 (rank 2, a "3")   guess hi: "Higher or same", n 11
turned card 45 (rank 6) ≥ rank 2 → win   multiplier8([11]) 1.17000000 (served 1.17)
cash out    payout floor(0.02 × 1.17) = 0.0234 (served 0.0234)
```

**V4: round `58e9cba3-14a1-4b85-82d7-03aafc7ac69b`** (Phase A, same pair, nonce 3, loss)
```
clientSeed  pfhilostartdd16ca2138ee5d4ba20c7b893782ed58   nonce 3   stake 0.02
block 0     e3fecaa9c86cd88a291ea1b30bf708e55185e12a4bab775ce3f2afa912ec2f6e   u(0) 3825126057 → card 25
start card 47 (rank 8, a "9")   guess lo: "Lower or same", n 9
turned card 25 (rank 12, K) > rank 8 → bust   payout 0 (served outcome "bust", payout 0)
```

**V5: round `e195c9a5-a162-41c4-b920-ec8d3b2b912a`** (Phase E, five right guesses, then cash out)
```
serverSeed  5e962fb3d9f7c24ab2e654feb6a8b7ecae5ef8bcd8daa75f7def1af08657325c
commitment  f89bb81e03853b1f0033057cbdf31025b0a370d5264ff57d611e8a3f072dc745
clientSeed  pfhilostart78e7c2d2a3c6ff0cf1672cb69dcb498d   nonce 18   stake 0.02
block 0     a9d34b676cf8cb9e01a920d01c1b701fd0c1e402ce0f6ea7f2629e2257949289   u(0) 2849196903
stream      7 42 16 43 46   (= served cards after the start card)
start 39 (A)  hi n 12 → 7 (rank 7) win;  lo n 8 → 42 (rank 3) win;  hi n 10 → 16 (rank 3, tie) win;
              hi n 10 → 43 (rank 4) win;  hi n 9 → 46 (rank 7) win
multiplier8([12, 8, 10, 10, 9]) 4.25439895 (served 4.25439895)   payout 0.08508797 (served 0.08508797)
```

**V6: round `cb1ae967-27ad-41f2-848f-ae8be8701fd1`** (Phase E, a right guess, two skips, then a bust)
```
serverSeed  c8f9815d64d7c5809034e54ced1d5ad07a8408c647df4e1fe9d7662c484e2913
commitment  4d78e9aee1bcfa67c97490658685f3b08b5da571f8a99992e1b8cba097b84d8e
clientSeed  pfhiloe1a102010f05879441b2db682e640103   nonce 48   stake 0.02
block 0     dfa9b0a8ec24e2d35229f192144467f222087384eb304272ed0588df0ccdb97a   u(0) 3752439976
stream      12 15 50 2   (= served cards after the start card)
start 24 (Q)  hi n 2 → 12 (K) win, multiplier8([2]) 6.43500000;  skip → 15;  skip → 50 (Q);  hi n 2 → 2 (rank 2) lose
bust        payout 0 (served outcome "bust", payout 0); the skips left the multiplier at 6.43500000
```

---

## 6. Open points

- **O1: the start card.** It is not committed by the seed pair; the server deals from the card the client sends (§2.4,
  HILO-31 operator FLAG, DL-5).
- **O2: the skip branch.** No captured or simulated u reached 4294967248; the branch is covered by the census over all
  2^32 values and a unit test of the map's edges (DL-9).
- **O3: caps.** Neither the max-win cap nor the 52nd-card settle was reached; `allowed` was only seen true (HILO-14,
  DL-4).
- **O4: idle rounds.** The 24-hour rule was witnessed once, on the "can cash out" branch (HILO-32, declared; DL-6).
- **O5: the rendered verify screen.** The reveal path (the rotation's answer carries the previous server seed) was observed
  in the API, not on the rendered verify screen (DL-8).
- **O6: client-seed encoding beyond ASCII.** UTF-8 is what the code uses; every captured client seed is ASCII.

---

## 7. Reproduction of the vectors

From the package directory, Node 22.6 or later: the vectors in §5 are the output of `hmacBlock`, `streamCards`, `sha256Hex`
(`src/rng.ts`) and `nOf`, `multiplier8`, `payout8`, `replay` (`src/rules.ts`) on the inputs shown, with the served values
read from the round's settled answer in `data/`. `npm test` recomputes every captured round the same way (HILO-07,
HILO-10, HILO-11, HILO-13); `node verify.js` is the same suite as one file.

## 8. Sources

E01, E02, E06 and E07 in `evidence/`; this package's `src/rng.ts`, `src/rules.ts`; the scored record
`outputs/verification-results.json`; the datasets in `data/` (V3–V6).
