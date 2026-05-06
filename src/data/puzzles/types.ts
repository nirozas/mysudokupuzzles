// Shared types for pre-generated puzzle data
export interface PuzzleData {
  values: number[][];   // 0 = empty
  solution: number[][]; // full solution
  isClue: boolean[][];  // true = given (pre-filled)
}

// PuzzleSet[size][difficulty] = PuzzleData[]
export type PuzzleSet = Record<number, Record<string, PuzzleData[]>>;
