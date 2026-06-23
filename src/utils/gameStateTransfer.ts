import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { GameStateTransferData, Player, PreviousPlayer, Settings } from '../types';

const TRANSFER_PREFIX = 'schafkopf-scorekeeper:v1:';

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

export const createGameStatePayload = (gameState: Omit<GameStateTransferData, 'version' | 'exportedAt'>): string => {
  const payload: GameStateTransferData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...gameState,
  };

  return `${TRANSFER_PREFIX}${compressToEncodedURIComponent(JSON.stringify(payload))}`;
};

export const parseGameStatePayload = (payload: string): GameStateTransferData => {
  if (!payload.startsWith(TRANSFER_PREFIX)) {
    throw new Error('This QR code is not a Schafkopf Scorekeeper game state.');
  }

  const compressedPayload = payload.slice(TRANSFER_PREFIX.length);
  const jsonPayload = decompressFromEncodedURIComponent(compressedPayload);

  if (!jsonPayload) {
    throw new Error('The game state QR code could not be read.');
  }

  const parsedPayload: unknown = JSON.parse(jsonPayload);

  if (!isGameStateTransferData(parsedPayload)) {
    throw new Error('The game state QR code has an invalid format.');
  }

  return parsedPayload;
};
