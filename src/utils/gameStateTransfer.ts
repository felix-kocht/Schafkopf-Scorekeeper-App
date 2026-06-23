import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { GameStateTransferData, Player, PreviousPlayer, Settings } from '../types';

const LEGACY_TRANSFER_PREFIX = 'schafkopf-scorekeeper:v1:';
const TRANSFER_PREFIX = 'sk2:';

type CompactPlayer = [
  name: string,
  score: number,
  yellowCard: 0 | 1,
  sittingOut: 0 | 1
];

type CompactPreviousPlayer = [
  name: string,
  finalScore: number,
  removedAt: string,
  scoreHistory?: number[],
  initialScore?: number
];

type CompactGameStateTransferData = [
  version: 2,
  exportedAt: string,
  players: CompactPlayer[],
  scores: number[][],
  previousPlayers: CompactPreviousPlayer[],
  settings: [minimumUnit: number, enableYellowCards: 0 | 1, redCardPenalty: number, zeroSumMode: 0 | 1]
];

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const isNumberArray = (value: unknown): value is number[] => {
  return Array.isArray(value) && value.every(isFiniteNumber);
};

const isPlayer = (value: unknown): value is Player => {
  return (
    isObject(value) &&
    typeof value.name === 'string' &&
    isFiniteNumber(value.score) &&
    typeof value.yellowCard === 'boolean' &&
    typeof value.sittingOut === 'boolean'
  );
};

const isPreviousPlayer = (value: unknown): value is PreviousPlayer => {
  return (
    isObject(value) &&
    typeof value.name === 'string' &&
    isFiniteNumber(value.finalScore) &&
    typeof value.removedAt === 'string' &&
    (value.scoreHistory === undefined || isNumberArray(value.scoreHistory)) &&
    (value.initialScore === undefined || isFiniteNumber(value.initialScore))
  );
};

const isSettings = (value: unknown): value is Settings => {
  return (
    isObject(value) &&
    isFiniteNumber(value.minimumUnit) &&
    typeof value.enableYellowCards === 'boolean' &&
    isFiniteNumber(value.redCardPenalty) &&
    typeof value.zeroSumMode === 'boolean'
  );
};

const isGameStateTransferData = (value: unknown): value is GameStateTransferData => {
  return (
    isObject(value) &&
    value.version === 1 &&
    typeof value.exportedAt === 'string' &&
    Array.isArray(value.players) &&
    value.players.every(isPlayer) &&
    Array.isArray(value.scores) &&
    value.scores.every(isNumberArray) &&
    Array.isArray(value.previousPlayers) &&
    value.previousPlayers.every(isPreviousPlayer) &&
    isSettings(value.settings)
  );
};

const booleanToBit = (value: boolean): 0 | 1 => value ? 1 : 0;

const bitToBoolean = (value: unknown): boolean => value === 1;

const compactGameState = (payload: GameStateTransferData): CompactGameStateTransferData => {
  return [
    2,
    payload.exportedAt,
    payload.players.map(player => [
      player.name,
      player.score,
      booleanToBit(player.yellowCard),
      booleanToBit(player.sittingOut),
    ]),
    payload.scores,
    payload.previousPlayers.map(player => {
      const compactPlayer: CompactPreviousPlayer = [
        player.name,
        player.finalScore,
        player.removedAt,
      ];

      if (player.scoreHistory !== undefined) {
        compactPlayer.push(player.scoreHistory);
      }

      if (player.initialScore !== undefined) {
        if (player.scoreHistory === undefined) {
          compactPlayer.push([]);
        }
        compactPlayer.push(player.initialScore);
      }

      return compactPlayer;
    }),
    [
      payload.settings.minimumUnit,
      booleanToBit(payload.settings.enableYellowCards),
      payload.settings.redCardPenalty,
      booleanToBit(payload.settings.zeroSumMode),
    ],
  ];
};

const expandCompactGameState = (payload: unknown): GameStateTransferData => {
  if (
    !Array.isArray(payload) ||
    payload.length !== 6 ||
    payload[0] !== 2 ||
    typeof payload[1] !== 'string' ||
    !Array.isArray(payload[2]) ||
    !Array.isArray(payload[3]) ||
    !Array.isArray(payload[4]) ||
    !Array.isArray(payload[5])
  ) {
    throw new Error('The game state QR code has an invalid format.');
  }

  const [version, exportedAt, players, scores, previousPlayers, settings] = payload;

  const expandedPayload: GameStateTransferData = {
    version: 1,
    exportedAt,
    players: players.map((player: unknown): Player => {
      if (
        !Array.isArray(player) ||
        player.length !== 4 ||
        typeof player[0] !== 'string' ||
        !isFiniteNumber(player[1])
      ) {
        throw new Error('The game state QR code has an invalid player format.');
      }

      return {
        name: player[0],
        score: player[1],
        yellowCard: bitToBoolean(player[2]),
        sittingOut: bitToBoolean(player[3]),
      };
    }),
    scores,
    previousPlayers: previousPlayers.map((player: unknown): PreviousPlayer => {
      if (
        !Array.isArray(player) ||
        player.length < 3 ||
        typeof player[0] !== 'string' ||
        !isFiniteNumber(player[1]) ||
        typeof player[2] !== 'string' ||
        (player[3] !== undefined && !isNumberArray(player[3])) ||
        (player[4] !== undefined && !isFiniteNumber(player[4]))
      ) {
        throw new Error('The game state QR code has an invalid previous player format.');
      }

      return {
        name: player[0],
        finalScore: player[1],
        removedAt: player[2],
        scoreHistory: player[3],
        initialScore: player[4],
      };
    }),
    settings: {
      minimumUnit: settings[0],
      enableYellowCards: bitToBoolean(settings[1]),
      redCardPenalty: settings[2],
      zeroSumMode: bitToBoolean(settings[3]),
    },
  };

  if (version !== 2 || !isGameStateTransferData(expandedPayload)) {
    throw new Error('The game state QR code has an invalid format.');
  }

  return expandedPayload;
};

const parseCompressedPayload = (compressedPayload: string): unknown => {
  const jsonPayload = decompressFromEncodedURIComponent(compressedPayload);

  if (!jsonPayload) {
    throw new Error('The game state QR code could not be read.');
  }

  return JSON.parse(jsonPayload);
};

export const createGameStatePayload = (gameState: Omit<GameStateTransferData, 'version' | 'exportedAt'>): string => {
  const payload: GameStateTransferData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...gameState,
  };

  return `${TRANSFER_PREFIX}${compressToEncodedURIComponent(JSON.stringify(compactGameState(payload)))}`;
};

export const parseGameStatePayload = (payload: string): GameStateTransferData => {
  if (payload.startsWith(TRANSFER_PREFIX)) {
    return expandCompactGameState(parseCompressedPayload(payload.slice(TRANSFER_PREFIX.length)));
  }

  if (!payload.startsWith(LEGACY_TRANSFER_PREFIX)) {
    throw new Error('This QR code is not a Schafkopf Scorekeeper game state.');
  }

  const parsedPayload = parseCompressedPayload(payload.slice(LEGACY_TRANSFER_PREFIX.length));

  if (!isGameStateTransferData(parsedPayload)) {
    throw new Error('The game state QR code has an invalid format.');
  }

  return parsedPayload;
};
