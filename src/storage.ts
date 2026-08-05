import AsyncStorage from '@react-native-async-storage/async-storage';

import type { HoleState } from './core/types';
import { emptyScorecard, type Scorecard } from './core/scoring';

const KEY = 'golf-notebook:v1';

export interface RoundSave {
  card: Scorecard;
  /** Index of the hole currently being played, 0-17. */
  holeIndex: number;
  /** Play in progress on that hole, if the round was interrupted mid-hole. */
  state: HoleState | null;
}

export interface SaveData {
  code: string;
  /** Keyed by course index within the notebook. */
  rounds: Record<string, RoundSave>;
}

export function newRound(): RoundSave {
  return { card: emptyScorecard(), holeIndex: 0, state: null };
}

export function newSave(code: string): SaveData {
  return { code, rounds: {} };
}

export async function loadSave(): Promise<SaveData | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveData;
    if (!parsed?.code || typeof parsed.code !== 'string') return null;
    return { code: parsed.code, rounds: parsed.rounds ?? {} };
  } catch {
    return null;
  }
}

export async function persistSave(data: SaveData): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // A failed save should never interrupt play.
  }
}
