// Shared types for pre-generated puzzle data
export interface PuzzleData {
  values: number[][];   // 0 = empty
  solution: number[][]; // complete solution
  isClue: boolean[][];  // true = given cell (shown to player)
  irregularRegions?: number[][];
  killerCages?: any[];
}

// PuzzleSet[size][difficulty] = PuzzleData[]
export type PuzzleSet = Record<number, Record<string, PuzzleData[]>>;
