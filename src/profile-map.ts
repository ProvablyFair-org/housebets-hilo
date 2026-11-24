// The HILO profile's 32 checks (id, name, layer, kind, policy), generated from the framework's public profile games/hilo/profile.public.json
// (profileVersion 1.0.2-public, framework 1.1, sha256 59fd68d12a105a6606a84b4173a87bfb03252c2a1d6811b3e54bfc5cc1b16234). Regenerate rather than edit.
export type Policy = 'HARD_FAIL' | 'FLAG' | 'INFORMATIONAL' | 'GRADED' | 'RELEASE_GATE';
export interface ProfileCheck { id: string; name: string; layer: string; kind: 'verifier-step' | 'package-check'; policy: Policy }
export const PROFILE_SHA256 = '59fd68d12a105a6606a84b4173a87bfb03252c2a1d6811b3e54bfc5cc1b16234';
export const PROFILE_VERSION = "1.0.2-public";
/** The framework profile itself, vendored byte for byte (sha256 == PROFILE_SHA256, cited in MANIFEST.md). verify
 *  reads it at run time and holds PROFILE below to it: a check id missing here or carrying another policy is INCOMPLETE (exit 3). */
export const PROFILE_VENDORED = 'profile/hilo.profile.json';
export const PROFILE: readonly ProfileCheck[] = [
  { id: "HILO-01", name: "Seed hash integrity", layer: "S1", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-02", name: "Forward commitment chain", layer: "S1", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-03", name: "Hash consistency within epoch", layer: "S1", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-04", name: "Nonce continuity", layer: "S1", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-05", name: "Population & epoch size (G-BIND)", layer: "S1", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-06", name: "Client-seed influence & Phase D recomputation", layer: "S1", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-07", name: "Card-stream recomputation", layer: "S2", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-08", name: "Draw bias bound", layer: "S2", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-09", name: "RNG reference vectors", layer: "S2", kind: "package-check", policy: "GRADED" },
  { id: "HILO-10", name: "Guess resolution & round sequence", layer: "S2", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-11", name: "Payout arithmetic", layer: "S3", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-12", name: "Bet-size invariance (Phase C)", layer: "S3", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-13", name: "Multiplier formula & provenance", layer: "S3", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-14", name: "Multiplier monotonicity & bounds", layer: "S3", kind: "verifier-step", policy: "FLAG" },
  { id: "HILO-15", name: "Start-card, side & depth coverage", layer: "S3", kind: "verifier-step", policy: "FLAG" },
  { id: "HILO-16", name: "Wallet / balance reconciliation", layer: "S3", kind: "verifier-step", policy: "FLAG" },
  { id: "HILO-17", name: "Multi-guess parity", layer: "S3", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-18", name: "Anti-circularity (win probability)", layer: "S4", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-19", name: "Effective RTP vs claim", layer: "S4", kind: "verifier-step", policy: "FLAG" },
  { id: "HILO-20", name: "Simulation Pass 1 (fresh seeds)", layer: "S4", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-21", name: "Simulation Pass 2 (cherry-pick)", layer: "S4", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-22", name: "Live-sample fit", layer: "S4", kind: "verifier-step", policy: "INFORMATIONAL" },
  { id: "HILO-23", name: "S5 fairness-integrity matrix", layer: "S5", kind: "package-check", policy: "GRADED" },
  { id: "HILO-24", name: "Player-verifier parity", layer: "S6", kind: "package-check", policy: "GRADED" },
  { id: "HILO-25", name: "Player check path documented", layer: "S6", kind: "package-check", policy: "GRADED" },
  { id: "HILO-26", name: "Dataset & config pins", layer: "S7", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-27", name: "Artifacts of record", layer: "S7", kind: "verifier-step", policy: "HARD_FAIL" },
  { id: "HILO-28", name: "Fresh-clone reproduction", layer: "S7", kind: "package-check", policy: "RELEASE_GATE" },
  { id: "HILO-29", name: "Mutation battery", layer: "S7", kind: "package-check", policy: "GRADED" },
  { id: "HILO-30", name: "Disclosure register & evidence appendix", layer: "S7", kind: "package-check", policy: "GRADED" },
  { id: "HILO-31", name: "Start-card carry-over", layer: "S1", kind: "verifier-step", policy: "FLAG" },
  { id: "HILO-32", name: "Abandoned-round rule (24 h)", layer: "S3", kind: "verifier-step", policy: "FLAG" },
];
