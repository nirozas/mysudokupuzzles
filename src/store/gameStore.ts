import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Store, GameMode, Difficulty, GridSize, CellPos, InputMode, HistoryEntry } from '../types';
import {
  generateGrid,
  generateSamurai,
  isGridComplete,
  autoFillNotes,
} from '../utils/sudokuGenerator';

// ─── Theme Helper ─────────────────────────────────────────────────────────────

let themeState: 'dark' | 'light' = 'dark';

function applyTheme(theme: 'dark' | 'light') {
  themeState = theme;
  if (theme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
}

// ─── Deep clone helpers ───────────────────────────────────────────────────────

function cloneValues(v: number[][]): number[][] {
  return v.map(r => [...r]);
}

function clonePencil(p: Set<number>[][]): Set<number>[][] {
  return p.map(r => r.map(s => new Set(s)));
}

function snapshotHistory(values: number[][], pencil: Set<number>[][]): HistoryEntry {
  return { values: cloneValues(values), pencilMarks: clonePencil(pencil) };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<Store>()(
  persist(
    (set, get) => ({
      // ── Initial State ──────────────────────────────────────────────────────────
  mode: 'classic',
  difficulty: 'medium',
  size: 9,
  grid: null,
  samuraiGrids: [],
  activeGridIndex: 0,
  selectedCell: null,
  inputMode: 'pen',
  lockedNumber: null,
  showErrors: true,
  autoNotes: false,
  highlightSimilar: true,
  elapsedSeconds: 0,
  isPaused: false,
  isComplete: false,
  isStarted: false,
  hintsRemaining: 3,
  history: [],
  historyIndex: -1,
  activeVolumeId: null,
  activeLevelId: null,
  seenTutorials: {},
  progress: {},

  // ── Actions ────────────────────────────────────────────────────────────────

  startGame: (mode, difficulty, size, volId = null, levelId = null) => {
    let grid = null;
    let samuraiGrids: ReturnType<typeof generateSamurai> = [];

    if (mode === 'samurai') {
      samuraiGrids = generateSamurai(difficulty);
    } else {
      const genMode = mode as 'classic' | 'killer' | 'irregular' | 'diagonal' | 'odd-even';
      grid = generateGrid(size, difficulty, genMode);
    }

    const initial = grid
      ? [snapshotHistory(grid.values, grid.pencilMarks)]
      : [];

    set({
      mode,
      difficulty,
      size,
      activeVolumeId: volId,
      activeLevelId: levelId,
      grid,
      samuraiGrids,
      activeGridIndex: 0,
      selectedCell: null,
      inputMode: 'pen',
      lockedNumber: null,
      elapsedSeconds: 0,
      isPaused: false,
      isComplete: false,
      isStarted: true,
      hintsRemaining: 3,
      history: initial,
      historyIndex: 0,
    });
  },

  selectCell: (pos) => {
    const { lockedNumber, inputMode } = get();
    if (lockedNumber !== null && pos) {
      // Keypad-lock: auto-fill when clicking a cell
      const store = get();
      set({ selectedCell: pos });
      // Trigger place after setting cell
      setTimeout(() => get().placeNumber(lockedNumber), 0);
      return;
    }
    set({ selectedCell: pos });
  },

  placeNumber: (num) => {
    const state = get();
    const { selectedCell, grid, inputMode, autoNotes, mode, samuraiGrids, activeGridIndex, showErrors } = state;
    if (!selectedCell) return;

    const activeGrid = mode === 'samurai'
      ? samuraiGrids[activeGridIndex]
      : grid;
    if (!activeGrid) return;

    const { row, col } = selectedCell;
    if (activeGrid.isClue[row][col]) return;

    const newValues = cloneValues(activeGrid.values);
    const newPencil = clonePencil(activeGrid.pencilMarks);

    if (inputMode === 'pen') {
      // Toggle: placing same number removes it
      if (newValues[row][col] === num) {
        newValues[row][col] = 0;
      } else {
        newValues[row][col] = num;
        // Auto-clear notes in row/col/box
        if (autoNotes) {
          clearRelatedPencilMarks(newPencil, row, col, num, activeGrid.size);
        }
      }
      newPencil[row][col].clear();
    } else {
      // Pencil mode
      newValues[row][col] = 0;
      const marks = newPencil[row][col];
      if (marks.has(num)) marks.delete(num);
      else marks.add(num);
    }

    const updatedGrid = { ...activeGrid, values: newValues, pencilMarks: newPencil };
    const complete = isGridComplete(updatedGrid);

    // Push to history
    const { history, historyIndex } = state;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshotHistory(newValues, newPencil));

    if (complete && state.activeVolumeId && state.activeLevelId !== null) {
      set((s) => ({ progress: { ...s.progress, [`${s.activeVolumeId}-${s.activeLevelId}`]: true } }));
    }

    if (mode === 'samurai') {
      const newSamurai = [...samuraiGrids];
      newSamurai[activeGridIndex] = updatedGrid;
      set({ samuraiGrids: newSamurai, isComplete: complete, history: newHistory, historyIndex: newHistory.length - 1 });
    } else {
      set({ grid: updatedGrid, isComplete: complete, history: newHistory, historyIndex: newHistory.length - 1 });
    }
  },

  clearCell: () => {
    const { selectedCell, grid, mode, samuraiGrids, activeGridIndex } = get();
    if (!selectedCell) return;

    const activeGrid = mode === 'samurai' ? samuraiGrids[activeGridIndex] : grid;
    if (!activeGrid) return;

    const { row, col } = selectedCell;
    if (activeGrid.isClue[row][col]) return;

    const newValues = cloneValues(activeGrid.values);
    const newPencil = clonePencil(activeGrid.pencilMarks);
    newValues[row][col] = 0;
    newPencil[row][col].clear();

    const updatedGrid = { ...activeGrid, values: newValues, pencilMarks: newPencil };

    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshotHistory(newValues, newPencil));

    if (mode === 'samurai') {
      const newSamurai = [...samuraiGrids];
      newSamurai[activeGridIndex] = updatedGrid;
      set({ samuraiGrids: newSamurai, history: newHistory, historyIndex: newHistory.length - 1 });
    } else {
      set({ grid: updatedGrid, history: newHistory, historyIndex: newHistory.length - 1 });
    }
  },

  setInputMode: (mode) => set({ inputMode: mode }),

  toggleLockNumber: (num) => {
    const { lockedNumber } = get();
    set({ lockedNumber: lockedNumber === num ? null : num });
  },

  undo: () => {
    const { history, historyIndex, grid, mode, samuraiGrids, activeGridIndex } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];

    if (mode === 'samurai') {
      const newSamurai = [...samuraiGrids];
      newSamurai[activeGridIndex] = {
        ...newSamurai[activeGridIndex],
        values: cloneValues(prev.values),
        pencilMarks: clonePencil(prev.pencilMarks),
      };
      set({ samuraiGrids: newSamurai, historyIndex: historyIndex - 1, isComplete: false });
    } else if (grid) {
      set({
        grid: { ...grid, values: cloneValues(prev.values), pencilMarks: clonePencil(prev.pencilMarks) },
        historyIndex: historyIndex - 1,
        isComplete: false,
      });
    }
  },

  redo: () => {
    const { history, historyIndex, grid, mode, samuraiGrids, activeGridIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];

    if (mode === 'samurai') {
      const newSamurai = [...samuraiGrids];
      newSamurai[activeGridIndex] = {
        ...newSamurai[activeGridIndex],
        values: cloneValues(next.values),
        pencilMarks: clonePencil(next.pencilMarks),
      };
      set({ samuraiGrids: newSamurai, historyIndex: historyIndex + 1 });
    } else if (grid) {
      set({
        grid: { ...grid, values: cloneValues(next.values), pencilMarks: clonePencil(next.pencilMarks) },
        historyIndex: historyIndex + 1,
      });
    }
  },

  togglePause: () => set(s => ({ isPaused: !s.isPaused })),

  tick: () => set(s => (!s.isPaused && s.isStarted && !s.isComplete)
    ? { elapsedSeconds: s.elapsedSeconds + 1 }
    : {}
  ),

  toggleShowErrors: () => set(s => ({ showErrors: !s.showErrors })),
  toggleAutoNotes: () => set(s => ({ autoNotes: !s.autoNotes })),
  toggleHighlightSimilar: () => set(s => ({ highlightSimilar: !s.highlightSimilar })),
  
  markTutorialSeen: (mode: string) => set(s => ({
    seenTutorials: { ...s.seenTutorials, [mode]: true }
  })),

  fillAutoNotes: () => {
    const { grid, mode, samuraiGrids, activeGridIndex } = get();
    const activeGrid = mode === 'samurai' ? samuraiGrids[activeGridIndex] : grid;
    if (!activeGrid) return;

    const pencil = autoFillNotes(activeGrid, mode);
    const updatedGrid = { ...activeGrid, pencilMarks: pencil };

    if (mode === 'samurai') {
      const newSamurai = [...samuraiGrids];
      newSamurai[activeGridIndex] = updatedGrid;
      set({ samuraiGrids: newSamurai });
    } else {
      set({ grid: updatedGrid });
    }
  },

  revealCell: () => {
    const { selectedCell, grid, mode, samuraiGrids, activeGridIndex, hintsRemaining } = get();
    if (!selectedCell || hintsRemaining <= 0) return;

    const activeGrid = mode === 'samurai' ? samuraiGrids[activeGridIndex] : grid;
    if (!activeGrid) return;

    const { row, col } = selectedCell;
    if (activeGrid.isClue[row][col] || activeGrid.values[row][col] === activeGrid.solution[row][col]) return;

    const answer = activeGrid.solution[row][col];
    const newValues = cloneValues(activeGrid.values);
    const newPencil = clonePencil(activeGrid.pencilMarks);
    newValues[row][col] = answer;
    newPencil[row][col].clear();

    const updatedGrid = { ...activeGrid, values: newValues, pencilMarks: newPencil };
    const complete = isGridComplete(updatedGrid);

    if (complete && get().activeVolumeId && get().activeLevelId !== null) {
      set((s) => ({ progress: { ...s.progress, [`${s.activeVolumeId}-${s.activeLevelId}`]: true } }));
    }

    if (mode === 'samurai') {
      const newSamurai = [...samuraiGrids];
      newSamurai[activeGridIndex] = updatedGrid;
      set({ samuraiGrids: newSamurai, isComplete: complete, hintsRemaining: hintsRemaining - 1 });
    } else {
      set({ grid: updatedGrid, isComplete: complete, hintsRemaining: hintsRemaining - 1 });
    }
  },

  revealBoard: () => {
    const { grid, mode, samuraiGrids } = get();
    if (mode === 'samurai') {
      const revealed = samuraiGrids.map(g => ({
        ...g,
        values: g.solution.map(r => [...r]),
        pencilMarks: Array.from({ length: g.size }, () => Array.from({ length: g.size }, () => new Set<number>())),
      }));
      set({ samuraiGrids: revealed, isComplete: true });
    } else if (grid) {
      set({
        grid: {
          ...grid,
          values: grid.solution.map(r => [...r]),
          pencilMarks: Array.from({ length: grid.size }, () => Array.from({ length: grid.size }, () => new Set<number>())),
        },
        isComplete: true,
      });
    }
  },

  resetGame: () => {
    const { grid, samuraiGrids, mode } = get();
    if (mode === 'samurai') {
      const reset = samuraiGrids.map(g => ({
        ...g,
        values: g.isClue.map((row, r) => row.map((clue, c) => clue ? g.solution[r][c] : 0)),
        pencilMarks: Array.from({ length: g.size }, () => Array.from({ length: g.size }, () => new Set<number>())),
      }));
      set({ samuraiGrids: reset, isComplete: false, elapsedSeconds: 0, selectedCell: null, hintsRemaining: 3 });
    } else if (grid) {
      const reset = {
        ...grid,
        values: grid.isClue.map((row, r) => row.map((clue, c) => clue ? grid.solution[r][c] : 0)),
        pencilMarks: Array.from({ length: grid.size }, () => Array.from({ length: grid.size }, () => new Set<number>())),
      };
      set({ grid: reset, isComplete: false, elapsedSeconds: 0, selectedCell: null, hintsRemaining: 3 });
    }
  },

  setActiveGrid: (index) => set({ activeGridIndex: index, selectedCell: null }),

  setTheme: (theme) => { applyTheme(theme); },
    }),
    {
      name: 'sudoku-storage',
      partialize: (state) => ({ seenTutorials: state.seenTutorials, progress: state.progress }),
    }
  )
);

// ─── Helper ───────────────────────────────────────────────────────────────────

function clearRelatedPencilMarks(
  pencil: Set<number>[][],
  row: number,
  col: number,
  num: number,
  size: number
) {
  const [br, bc] = [Math.sqrt(size) | 0, Math.sqrt(size) | 0];
  const boxR = Math.floor(row / br) * br;
  const boxC = Math.floor(col / bc) * bc;

  for (let i = 0; i < size; i++) {
    pencil[row][i].delete(num);
    pencil[i][col].delete(num);
  }
  for (let r = boxR; r < boxR + br; r++)
    for (let c = boxC; c < boxC + bc; c++)
      pencil[r][c].delete(num);
}
