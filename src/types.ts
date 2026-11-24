// Shapes of the HouseBets new-engine hilo capture (schema housebets-hilo2-capture-v1, rig rig/hilo/capture-hb-hilo.mjs).
// Only the fields the verifier reads are typed; the dataset carries every request and answer of every round.

export type Side = 'hi' | 'lo';

/** One request the capture sent, with the server's answer. */
export interface Req {
  path: string;                 // '/hilo2/bet' | '/hilo2/action' | other
  status: number;
  at?: string;
  body: any;                    // bet: {generation, amount, startCard, currency}; action: {generation, roundId, seq, action}
  response: any;                // {game: Game, balance?, round?}
  negativeTest?: string;
}

/** The server's game object (bet / action answers, game_detail). */
export interface Game {
  roundId: string;
  active: boolean;
  stake: number | string;
  maxWin?: number | string;
  startCard: number;
  cards: number[];
  events: { type: 'guess' | 'skip'; side?: Side; card: number; n?: number; win?: boolean; onRank?: number }[];
  wins: number;
  multiplier: number | string;
  value: number | string;
  options?: { hi?: any; lo?: any; skip?: boolean; cashout?: boolean };
  outcome?: string;             // 'cashout' | 'bust' | 'capped' | 'deck' (settled)
  payout: number | string;
  fairness: { version: string; hashedServerSeed: string; clientSeed: string; nonce: number };
  createdAt?: string;
  settledAt?: string;
}

export interface Round {
  idx: number;
  planIdx: number;
  phase: string;
  spec: { kind: string; startCard: number; [k: string]: unknown };
  pre: { seedId: number; clientSeed: string; hashedServerSeed: string; hashedNextServerSeed: string; nonceBefore: number };
  requests: Req[];
  decisions?: unknown[];
  detail?: { path: string; status: number; response: { game: Game } };
  roundId: string;
  outcome: string;              // the capture's own label (never read by a scored step)
  closedByServer?: boolean;
  replays?: unknown[];
}

export interface Seed {
  seedId: number;
  epoch: number;
  clientSeed: string;
  clientSeedSource: string;
  hashedServerSeed: string;
  hashedNextServerSeed: string;
  revealedServerSeed: string;
  nonceStart: number;
  serverNonceAtRotation: number;
}

export interface Dataset {
  meta: any;
  preCapture: any;
  seeds: Seed[];
  rounds: Round[];
}
