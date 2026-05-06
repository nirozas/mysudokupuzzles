import type { GameMode, GridSize, Difficulty } from '../types';

export interface LevelDef {
  id: number;
  mode: GameMode;
  size: GridSize;
  difficulty: Difficulty;
  label: string;
}

export interface VolumeDef {
  id: string;
  title: string;
  levels: LevelDef[];
}

export function getVolumesForMode(mode: string): VolumeDef[] {
  // All volumes have been deleted per user request.
  return [];
}
