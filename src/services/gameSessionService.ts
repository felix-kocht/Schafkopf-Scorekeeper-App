import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseServices } from '../lib/firebase';
import { GameSessionState, OnlineGameSession, Player, PreviousPlayer, Settings } from '../types';

interface StoredGameSession {
  joinCode: string;
  state: GameSessionState;
}

interface FirestoreIndexedList<T> {
  length: number;
  items: Record<string, T>;
}

interface FirestoreRoundScores {
  values: number[];
}

interface FirestoreGameSessionState {
  players: Player[];
  scores: FirestoreIndexedList<FirestoreRoundScores>;
  previousPlayers: FirestoreIndexedList<PreviousPlayer>;
  settings: Settings;
}

const sessionsCollection = 'gameSessions';
const joinCodesCollection = 'gameSessionJoinCodes';

const normalizeJoinCode = (joinCode: string) => joinCode.trim().replace(/\s+/g, '').toUpperCase();

const createJoinCode = () => {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
};

const waitForAuthUser = async () => {
  const { auth } = getFirebaseServices();

  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  return new Promise<string | null>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      user => {
        unsubscribe();
        resolve(user?.uid ?? null);
      },
      reject
    );
  });
};

const getCurrentUid = async () => {
  const { auth } = getFirebaseServices();
  const existingUid = await waitForAuthUser();

  if (existingUid) {
    return existingUid;
  }

  const credential = await signInAnonymously(auth);
  return credential.user.uid;
};

const sanitizePreviousPlayer = (player: PreviousPlayer): PreviousPlayer => {
  const sanitizedPlayer: PreviousPlayer = {
    name: player.name,
    finalScore: player.finalScore,
    removedAt: player.removedAt,
  };

  if (player.scoreHistory !== undefined) {
    sanitizedPlayer.scoreHistory = player.scoreHistory;
  }

  if (player.initialScore !== undefined) {
    sanitizedPlayer.initialScore = player.initialScore;
  }

  return sanitizedPlayer;
};

const sanitizeState = (state: GameSessionState): GameSessionState => ({
  players: state.players.map((player): Player => ({
    name: player.name,
    score: player.score,
    yellowCard: player.yellowCard,
    sittingOut: player.sittingOut,
  })),
  scores: state.scores.map(roundScores => roundScores.map(score => score)),
  previousPlayers: state.previousPlayers.map(sanitizePreviousPlayer),
  settings: {
    minimumUnit: state.settings.minimumUnit,
    enableYellowCards: state.settings.enableYellowCards,
    redCardPenalty: state.settings.redCardPenalty,
    zeroSumMode: state.settings.zeroSumMode,
  },
});

const createIndexedList = <T,>(items: T[]): FirestoreIndexedList<T> => ({
  length: items.length,
  items: items.reduce<Record<string, T>>((indexedItems, item, index) => {
    indexedItems[index.toString()] = item;
    return indexedItems;
  }, {}),
});

const toFirestoreState = (state: GameSessionState): FirestoreGameSessionState => {
  const sanitizedState = sanitizeState(state);

  return {
    players: sanitizedState.players,
    scores: createIndexedList(
      sanitizedState.scores.map((roundScores): FirestoreRoundScores => ({
        values: roundScores,
      }))
    ),
    previousPlayers: createIndexedList(sanitizedState.previousPlayers),
    settings: sanitizedState.settings,
  };
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const isNumberArray = (value: unknown): value is number[] => {
  return Array.isArray(value) && value.every(isFiniteNumber);
};

const isNonNegativeInteger = (value: unknown): value is number => {
  return Number.isInteger(value) && Number(value) >= 0;
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

const isFirestoreRoundScores = (value: unknown): value is FirestoreRoundScores => {
  return (
    isObject(value) &&
    isNumberArray(value.values)
  );
};

const isFirestoreIndexedList = <T,>(
  value: unknown,
  isItem: (item: unknown) => item is T
): value is FirestoreIndexedList<T> => {
  if (!isObject(value) || !isNonNegativeInteger(value.length) || !isObject(value.items)) {
    return false;
  }

  for (let index = 0; index < value.length; index += 1) {
    if (!isItem(value.items[index.toString()])) {
      return false;
    }
  }

  return true;
};

const readIndexedList = <T,>(list: FirestoreIndexedList<T>): T[] => {
  return Array.from({ length: list.length }, (_, index) => list.items[index.toString()]);
};

const readStoredScores = (value: unknown): number[][] => {
  if (Array.isArray(value) && value.every(isNumberArray)) {
    return value.map(roundScores => roundScores.map(score => score));
  }

  if (isFirestoreIndexedList(value, isFirestoreRoundScores)) {
    return readIndexedList(value).map(roundScores => roundScores.values.map(score => score));
  }

  throw new Error('Online session has an invalid score format.');
};

const readStoredPreviousPlayers = (value: unknown): PreviousPlayer[] => {
  if (Array.isArray(value) && value.every(isPreviousPlayer)) {
    return value.map(sanitizePreviousPlayer);
  }

  if (isFirestoreIndexedList(value, isPreviousPlayer)) {
    return readIndexedList(value).map(sanitizePreviousPlayer);
  }

  throw new Error('Online session has an invalid previous player format.');
};

const readStoredState = (value: unknown): GameSessionState => {
  if (!isObject(value)) {
    throw new Error('Online session has an invalid format.');
  }

  if (!Array.isArray(value.players) || !value.players.every(isPlayer) || !isSettings(value.settings)) {
    throw new Error('Online session has an invalid format.');
  }

  return sanitizeState({
    players: value.players,
    scores: readStoredScores(value.scores),
    previousPlayers: readStoredPreviousPlayers(value.previousPlayers),
    settings: value.settings,
  });
};

const getStoredSession = (data: unknown): StoredGameSession => {
  if (!isObject(data) || typeof data.joinCode !== 'string') {
    throw new Error('Online session has an invalid format.');
  }

  return {
    joinCode: data.joinCode,
    state: readStoredState(data.state),
  };
};

const createUniqueJoinCode = async () => {
  const { db } = getFirebaseServices();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const joinCode = createJoinCode();
    const existingJoinCode = await getDoc(doc(db, joinCodesCollection, joinCode));

    if (!existingJoinCode.exists()) {
      return joinCode;
    }
  }

  throw new Error('Could not create a unique join code.');
};

export const createGameSession = async (state: GameSessionState): Promise<OnlineGameSession> => {
  const { db } = getFirebaseServices();
  const uid = await getCurrentUid();
  const sessionRef = doc(collection(db, sessionsCollection));
  const memberRef = doc(db, sessionsCollection, sessionRef.id, 'members', uid);
  const joinCode = await createUniqueJoinCode();
  const joinCodeRef = doc(db, joinCodesCollection, joinCode);
  const batch = writeBatch(db);

  batch.set(sessionRef, {
    joinCode,
    createdByUid: uid,
    updatedByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    revision: 1,
    state: toFirestoreState(state),
  });
  batch.set(memberRef, {
    role: 'owner',
    joinedAt: serverTimestamp(),
  });
  batch.set(joinCodeRef, {
    sessionId: sessionRef.id,
    createdByUid: uid,
    createdAt: serverTimestamp(),
  });

  await batch.commit();

  return { id: sessionRef.id, joinCode };
};

export const joinGameSession = async (joinCode: string): Promise<{
  session: OnlineGameSession;
  state: GameSessionState;
}> => {
  const { db } = getFirebaseServices();
  const uid = await getCurrentUid();
  const normalizedJoinCode = normalizeJoinCode(joinCode);
  const joinCodeSnapshot = await getDoc(doc(db, joinCodesCollection, normalizedJoinCode));

  if (!joinCodeSnapshot.exists()) {
    throw new Error('No online session found for this code.');
  }

  const joinCodeData = joinCodeSnapshot.data();
  const sessionId = typeof joinCodeData.sessionId === 'string' ? joinCodeData.sessionId : '';

  if (!sessionId) {
    throw new Error('Online session code is invalid.');
  }

  await setDoc(doc(db, sessionsCollection, sessionId, 'members', uid), {
    role: 'editor',
    joinedAt: serverTimestamp(),
  }, { merge: true });

  const sessionSnapshot = await getDoc(doc(db, sessionsCollection, sessionId));

  if (!sessionSnapshot.exists()) {
    throw new Error('Online session no longer exists.');
  }

  const storedSession = getStoredSession(sessionSnapshot.data());

  return {
    session: {
      id: sessionSnapshot.id,
      joinCode: storedSession.joinCode,
    },
    state: storedSession.state,
  };
};

export const getGameSession = async (sessionId: string): Promise<{
  session: OnlineGameSession;
  state: GameSessionState;
}> => {
  const { db } = getFirebaseServices();

  await getCurrentUid();

  const sessionSnapshot = await getDoc(doc(db, sessionsCollection, sessionId));

  if (!sessionSnapshot.exists()) {
    throw new Error('Online session no longer exists.');
  }

  const storedSession = getStoredSession(sessionSnapshot.data());

  return {
    session: {
      id: sessionSnapshot.id,
      joinCode: storedSession.joinCode,
    },
    state: storedSession.state,
  };
};

export const updateGameSessionState = async (sessionId: string, state: GameSessionState) => {
  const uid = await getCurrentUid();
  const { db } = getFirebaseServices();

  await updateDoc(doc(db, sessionsCollection, sessionId), {
    state: toFirestoreState(state),
    revision: increment(1),
    updatedAt: serverTimestamp(),
    updatedByUid: uid,
  });
};

export const subscribeToGameSession = (
  sessionId: string,
  onState: (state: GameSessionState, session: OnlineGameSession) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  const { db } = getFirebaseServices();
  let unsubscribe: Unsubscribe | null = null;
  let didUnsubscribe = false;

  void getCurrentUid()
    .then(() => {
      if (didUnsubscribe) return;

      unsubscribe = onSnapshot(
        doc(db, sessionsCollection, sessionId),
        snapshot => {
          if (!snapshot.exists()) {
            onError(new Error('Online session no longer exists.'));
            return;
          }

          try {
            const storedSession = getStoredSession(snapshot.data());
            onState(storedSession.state, {
              id: snapshot.id,
              joinCode: storedSession.joinCode,
            });
          } catch (error) {
            onError(error instanceof Error ? error : new Error('Online session could not be read.'));
          }
        },
        error => {
          onError(error);
        }
      );
    })
    .catch(error => {
      if (!didUnsubscribe) {
        onError(error instanceof Error ? error : new Error('Firebase sign-in failed.'));
      }
    });

  return () => {
    didUnsubscribe = true;
    unsubscribe?.();
  };
};
