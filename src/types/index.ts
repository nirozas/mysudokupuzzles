// ─── Core Types ───────────────────────────────────────────────────────────────

export type GameMode =
  | 'classic'
  | 'killer'
  | 'irregular'
  | 'diagonal'
  | 'odd-even'
  | 'samurai'
  | 'samurai3'
  | 'combo'
  | 'image'
  | 'ice-breaker'
  | 'monster'
  | 'samurai4'
  | 'triangle'
  | 'cubic'
  | 'mini';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'evil';

export type GridSize = 4 | 6 | 9 | 16;

export type InputMode = 'pen' | 'pencil';

// ─── Cell ─────────────────────────────────────────────────────────────────────

export interface CellPos {
  row: number;
  col: number;
  gridIndex?: number; // for samurai
}

export interface KillerCage {
  id: number;
  sum: number;
  cells: [number, number][];       // [row, col] pairs
  color?: string;
}

// ─── Grid State ───────────────────────────────────────────────────────────────

export interface GridState {
  size: number;
  values: number[][];              // 0 = empty
  solution: number[][];
  isClue: boolean[][];
  pencilMarks: Set<number>[][];
  irregularRegions?: number[][];   // region id per cell (0-8 for 9x9)
  killerCages?: KillerCage[];
  oddEvenPattern?: ('odd' | 'even' | 'any')[][];
  frozenCells?: boolean[][];       // legacy
  iceStatus?: number[][];          // current ice layers (0 = thawed)
  startIceStatus?: number[][];     // initial ice layers for cracking logic
}

// ─── History ──────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  values: number[][];
  pencilMarks: Set<number>[][];
}

// ─── Full Game State ──────────────────────────────────────────────────────────

export interface GameState {
  mode: GameMode;
  difficulty: Difficulty;
  size: GridSize;

  activeVolumeId: string | null;
  activeLevelId: number | null;

  // For classic / single-grid modes
  grid: GridState | null;

  // For samurai (multi-grid)
  samuraiGrids: GridState[];
  activeGridIndex: number;

  // UI state
  selectedCell: CellPos | null;
  inputMode: InputMode;
  lockedNumber: number | null;     // keypad lock
  showErrors: boolean;
  autoNotes: boolean;
  highlightSimilar: boolean;

  // Timer
  elapsedSeconds: number;
  isPaused: boolean;
  isComplete: boolean;
  isStarted: boolean;
  isGenerating: boolean;
  hintsRemaining: number;

  // Undo/Redo stacks (per-grid)
  history: HistoryEntry[];
  historyIndex: number;
  seenTutorials: Record<string, boolean>;
  progress: Record<string, boolean>;
}

// ─── Store Actions ────────────────────────────────────────────────────────────

export interface GameActions {
  startGame: (mode: GameMode, difficulty: Difficulty, size: GridSize, volId?: string, levelId?: number) => void;
  selectCell: (pos: CellPos | null) => void;
  placeNumber: (num: number) => void;
  clearCell: () => void;
  setInputMode: (mode: InputMode) => void;
  toggleLockNumber: (num: number) => void;
  undo: () => void;
  redo: () => void;
  togglePause: () => void;
  tick: () => void;
  toggleShowErrors: () => void;
  toggleAutoNotes: () => void;
  toggleHighlightSimilar: () => void;
  fillAutoNotes: () => void;
  revealCell: () => void;
  revealBoard: () => void;
  resetGame: () => void;
  setActiveGrid: (index: number) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  markTutorialSeen: (mode: string) => void;
}

export type Store = GameState & GameActions;
