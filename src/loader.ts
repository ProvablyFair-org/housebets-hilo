// Dataset pins and the population of record, stated as CODE next to the pin (the framework's G-BIND rule: a dataset
// that agrees with its own header proves nothing; the scored steps compare against these constants, never meta).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import type { Dataset } from './types.ts';

/** The package root: the nearest folder above this module holding package.json "housebets-hilo-audit" (works from src/
 *  under Node and from the bundled verify.js at the root). */
function findRoot(): string {
  let d = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const p = join(d, 'package.json');
    if (existsSync(p) && /"name":\s*"housebets-hilo-audit"/.test(readFileSync(p, 'utf8'))) return d;
    d = dirname(d);
  }
  throw new Error('package root not found');
}
export const ROOT = findRoot();
export const DATA = join(ROOT, 'data');

// Phase A primary: 6,500 one-guess rounds in 130 epochs of exactly 50, captured 13 Oct 2026 15:00–18:2xZ (as captured, unsplit)
export const PRIMARY_FILE = 'housebets-hilo-phaseA-auto1-6500rounds.json';
export const PRIMARY_SHA256 = '63346862413fd87e3d5a5122b0a5950bf58f0af91c4e7e414158a6ec8cd8de1e';
// Supplementary phases (13 Oct 2026), each its own dataset and evidence id
export const PHASE_C_FILE = 'supplementary/housebets-hilo-phaseC-elevated-200rounds.json';
export const PHASE_C_SHA256 = 'afaf45474c9e36415bedff44a375777fcb4d16e9055c02d4c5a8b4bad3e73cfb';
export const PHASE_C10_FILE = 'supplementary/housebets-hilo-phaseC-elevated-10usd-200rounds.json';
export const PHASE_C10_SHA256 = '3bd577d2f06498b63d4b74f0c5172373322e5f5323e93575f1f19bae8c127073';
export const PHASE_D_FILE = 'supplementary/housebets-hilo-phaseD-playerseeds-200rounds.json';
export const PHASE_D_SHA256 = 'a7ec3386bf3e7d2b988aadc4f120fd1c422a5218b535884922e2d9072e1af70f';
export const PHASE_E_FILE = 'supplementary/housebets-hilo-phaseE-multistep-600rounds.json';
export const PHASE_E_SHA256 = '4d48ad83d699f2f57f8195998510f5cc82593a00cb91f3d3f151bb6c5f4c1dcc';
// The 12 Oct capture with its 24 h check (the round left open 12 Oct 13:45:30Z and finished by the server): HILO-32 only
export const OPEN_FILE = 'supplementary/housebets-hilo-full-77rounds-withopen.json';
export const OPEN_SHA256 = '192d39dc7ca28d75c62c98955e9a6a06e76489cc9622862c111279b4ca4e943a';
/** Every dataset of the package with the label the verifier prints for it. Pass 2 (HILO-21) replays every revealed seed of
 *  every one of them. */
export const ALL_DATASETS: readonly (readonly [string, string])[] = [['A', PRIMARY_FILE], ['C', PHASE_C_FILE], ['C $10', PHASE_C10_FILE],
  ['D', PHASE_D_FILE], ['E', PHASE_E_FILE], ['12 Oct', OPEN_FILE]];

/** Evidence exhibits (all pinned, scripts/make-evidence.py; listed in MANIFEST.md#evidence). */
export const EVIDENCE_PINS: readonly (readonly [string, string])[] = [
  ['evidence/E01-hilo2-fairness-spec-2026-10-13.json', '9d0262970825f62d6fe5a1d884156d6316caf032e31f2dfe774a293a1af8550c'],
  ['evidence/E02-hilo2-limits-2026-10-13.json', 'd94b0e96a7636929fb54bcfa4d272a8bd358a2969dcdb1af05f25e3e9766adaf'],
  ['evidence/E03-hilo-bet-history-2026-10-13.json', '7ddd13bf28821cec4c76668a9638d5bcac66a0d2587da9546ee38a2698a8a374'],
  ['evidence/E04-account-reconcile-2026-10-13.txt', 'edbda5cf5231e917b212f3d075550f2470f667b343d35365424d02b52b94df39'],
  ['evidence/E05-hilo-empty-seed-control-2026-10-13.json', '1e9e108d56a16a41503553c42d6b02352487b8340496b2e61b4be86190af34f7'],
  ['evidence/E06-hilo2-bundle-start-card-2026-10-10.json', 'd215e49ad3d350ec15c483b8698c7b1fa7d1d63b59dbd0ed370fd64bc2f18876'],
  ['evidence/E07-hilo2-rules-panel-live-2026-10-19.json', 'c84309e8c72c0c22800e8256a0ace65b9c0d27f4abe3c3098fbf729cee757855'],
];

// The population of record (G-BIND)
export const EXPECTED_ROUNDS = 6500;
export const EXPECTED_SEEDS = 130;
export const EXPECTED_EPOCHS = 130;
export const EXPECTED_EPOCH_SIZE = 50;
export const EXPECTED_PHASE_C_ROUNDS = 200;     // 4 epochs × 50, one guess on the likelier side, stake 2.00 (100 × the Phase A stake)
export const EXPECTED_PHASE_C10_ROUNDS = 200;   // 4 epochs × 50, the same, stake 10 (the $10 set)
export const EXPECTED_PHASE_D_ROUNDS = 200;     // 4 epochs × 50, one player-set client seed per epoch
export const EXPECTED_PHASE_E_ROUNDS = 600;     // 12 epochs × 50, guess chains (multi-step)
export const PHASE_A_STAKE = '0.02';            // the rig's base stake (≥ the E02 minimum 0.01000311)
export const PHASE_C_STAKE = '2';               // 100 × PHASE_A_STAKE
export const PHASE_C10_STAKE = '10';
export const PHASE_D_SEEDS = ['provablyfair-1', 'provablyfair-2', 'player-seed-abc', '1234567890'] as const;
export const NONCE_BASE = 1;   // HouseBets nonces start at 1 on a fresh pair (every epoch of the capture)
/** HILO-15 floor: Phase A ≥ 50 rounds per start rank (profile HILO-15), both sides guessed on every rank. */
export const START_RANK_FLOOR = 50;
/** Phase E plan (rig/hilo/capture-hb-hilo.mjs --phase=E): guess chains of 2–10 right guesses, some with skips. */
export const PHASE_E_MIN_DEPTH = 2;
/** The left-open round of the 12 Oct capture (HILO-32). */
export const OPEN_ROUND_ID = '5aa3dc11-999d-44ea-86b6-b60cc3ea62de';

export const sha256Bytes = (b: Buffer | string): string => createHash('sha256').update(b).digest('hex');
export const sha256File = (rel: string): string => sha256Bytes(readFileSync(join(ROOT, rel.startsWith('evidence/') || rel.startsWith('outputs/') ? rel : join('data', rel))));
export const load = (rel: string): Dataset => JSON.parse(readFileSync(join(DATA, rel), 'utf8')) as Dataset;
export const readJson = (rel: string): any => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
