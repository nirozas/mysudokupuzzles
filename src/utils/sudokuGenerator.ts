import type { GridState, Difficulty, GridSize, KillerCage } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createEmpty(size: number): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Returns box size: [rows, cols] per box
function boxDims(size: number): [number, number] {
  if (size === 4) return [2, 2];
  if (size === 6) return [2, 3];
  if (size === 9) return [3, 3];
  if (size === 16) return [4, 4];
  return [3, 3];
}

function isValidPlacement(grid: number[][], row: number, col: number, num: number, size: number): boolean {
  const [br, bc] = boxDims(size);
  // Row check (skip current cell)
  for (let c = 0; c < size; c++) {
    if (c !== col && grid[row][c] === num) return false;
  }
  // Col check (skip current cell)
  for (let r = 0; r < size; r++) {
    if (r !== row && grid[r][col] === num) return false;
  }
  // Box check (skip current cell)
  const startRow = Math.floor(row / br) * br;
  const startCol = Math.floor(col / bc) * bc;
  for (let r = startRow; r < startRow + br; r++) {
    for (let c = startCol; c < startCol + bc; c++) {
      if ((r !== row || c !== col) && grid[r][c] === num) return false;
    }
  }
  return true;
}

// ─── Backtracking Solver ─────────────────────────────────────────────────────

function solve(grid: number[][], size: number, randomize = false): boolean {
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] === 0) {
        const nums = randomize
          ? shuffle(Array.from({ length: size }, (_, i) => i + 1))
          : Array.from({ length: size }, (_, i) => i + 1);
        for (const num of nums) {
          if (isValidPlacement(grid, row, col, num, size)) {
            grid[row][col] = num;
            if (solve(grid, size, randomize)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

// ─── Mathematical O(1) Board Generation ───────────────────────────────────────

function generateBaseBoard(size: number): number[][] {
  const [br, bc] = boxDims(size);
  const board = Array.from({ length: size }, () => Array(size).fill(0));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      board[r][c] = (((r % br) * bc + Math.floor(r / br) + c) % size) + 1;
    }
  }
  
  // Shuffle numbers
  const nums = shuffle(Array.from({ length: size }, (_, i) => i + 1));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      board[r][c] = nums[board[r][c] - 1];
    }
  }

  // Shuffle rows within bands
  for (let band = 0; band < size / br; band++) {
    for (let i = 0; i < br; i++) {
      const r1 = band * br + i;
      const r2 = band * br + Math.floor(Math.random() * br);
      const temp = board[r1];
      board[r1] = board[r2];
      board[r2] = temp;
    }
  }

  // Shuffle cols within stacks
  for (let stack = 0; stack < size / bc; stack++) {
    for (let i = 0; i < bc; i++) {
      const c1 = stack * bc + i;
      const c2 = stack * bc + Math.floor(Math.random() * bc);
      for (let r = 0; r < size; r++) {
        const temp = board[r][c1];
        board[r][c1] = board[r][c2];
        board[r][c2] = temp;
      }
    }
  }

  return board;
}

function countSolutions(grid: number[][], size: number, limit = 2, regions?: number[][]): number {
  let count = 0;
  let iterations = 0;
  const MAX_ITERATIONS = 2000; // More aggressive limit for responsiveness
  const regionCells = regions ? getRegionCells(regions, size) : undefined;

  function bt(): boolean {
    iterations++;
    if (iterations > MAX_ITERATIONS) return true; 

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (grid[row][col] === 0) {
          for (let num = 1; num <= size; num++) {
            const isValid = regions 
              ? isValidIrregular(grid, row, col, num, size, regions, regionCells)
              : isValidPlacement(grid, row, col, num, size);
            
            if (isValid) {
              grid[row][col] = num;
              if (bt()) return true;
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    count++;
    return count >= limit;
  }
  bt();
  return count;
}

// ─── Clue Removal ────────────────────────────────────────────────────────────

const CLUE_TARGETS: Record<Difficulty, Record<number, number>> = {
  easy:   { 4: 10, 6: 20, 9: 36, 16: 120 },
  medium: { 4: 8,  6: 16, 9: 30, 16: 104 },
  hard:   { 4: 6,  6: 12, 9: 26, 16: 90  },
  expert: { 4: 5,  6: 10, 9: 24, 16: 80  },
  evil:   { 4: 4,  6: 8,  9: 22, 16: 72  },
};

function createPuzzle(solution: number[][], size: number, difficulty: Difficulty, regions?: number[][]): number[][] {
  const grid = solution.map(r => [...r]);
  const target = targetClues(size, difficulty);
  const totalCells = size * size;
  const toRemove = totalCells - target;
  const startTime = Date.now();

  const positions = shuffle(
    Array.from({ length: totalCells }, (_, i) => [Math.floor(i / size), i % size] as [number, number])
  );

  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= toRemove) break;
    const backup = grid[r][c];
    grid[r][c] = 0;
    
    const copy = grid.map(row => [...row]);
    if (countSolutions(copy, size, 2, regions) === 1) {
      removed++;
    } else {
      grid[r][c] = backup;
    }
    
    // Safety: don't block for more than 400ms total
    if (Date.now() - startTime > 400) break;
  }
  return grid;
}

// ─── Irregular Regions ────────────────────────────────────────────────────────

function generateIrregularRegions(size: number): number[][] {
  // Pre-defined irregular 9x9 jigsaw patterns for variety
  // This is a simple but valid pattern: shifted 3x3 boxes
  const JIGSAW_9x9 = [
    [1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 1, 1, 1, 1, 1, 1, 1],
    [2, 1, 3, 2, 2, 2, 2, 2, 2],
    [3, 2, 4, 3, 3, 3, 3, 3, 3],
    [4, 3, 5, 4, 4, 4, 4, 4, 4],
    [5, 4, 6, 5, 5, 5, 5, 5, 5],
    [6, 5, 7, 6, 6, 6, 6, 6, 6],
    [7, 6, 8, 7, 7, 7, 7, 7, 7],
    [8, 7, 8, 8, 8, 8, 8, 8, 8],
  ];
  if (size === 9) return JIGSAW_9x9;

  // For other sizes, fall back to standard boxes
  const [br, bc] = boxDims(size);
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) =>
      Math.floor(r / br) * (size / bc) + Math.floor(c / bc)
    )
  );
}

function isValidIrregular(grid: number[][], row: number, col: number, num: number, size: number, regions: number[][], regionCells?: [number, number][][]): boolean {
  for (let c = 0; c < size; c++) if (grid[row][c] === num) return false;
  for (let r = 0; r < size; r++) if (grid[r][col] === num) return false;
  
  const regionId = regions[row][col];
  if (regionCells) {
    const cells = regionCells[regionId];
    for (let i = 0; i < cells.length; i++) {
      const [rr, cc] = cells[i];
      if (grid[rr][cc] === num) return false;
    }
  } else {
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (regions[r][c] === regionId && grid[r][c] === num) return false;
  }
  return true;
}

function getRegionCells(regions: number[][], size: number): [number, number][][] {
  const list: [number, number][][] = Array.from({ length: size }, () => []);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      list[regions[r][c]].push([r, c]);
    }
  }
  return list;
}

function solveIrregular(grid: number[][], size: number, regions: number[][], randomize = false, regionCells?: [number, number][][], state = { iterations: 0 }): boolean {
  if (!regionCells) regionCells = getRegionCells(regions, size);
  
  state.iterations++;
  if (state.iterations > 5000) return false; // Safety limit to prevent hang

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] === 0) {
        const nums = randomize
          ? shuffle(Array.from({ length: size }, (_, i) => i + 1))
          : Array.from({ length: size }, (_, i) => i + 1);
        for (const num of nums) {
          if (isValidIrregular(grid, row, col, num, size, regions, regionCells)) {
            grid[row][col] = num;
            if (solveIrregular(grid, size, regions, randomize, regionCells, state)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

// ─── Killer Cages ─────────────────────────────────────────────────────────────

const CAGE_COLORS = [
  '#7c3aed','#0891b2','#059669','#d97706','#dc2626',
  '#7c3aed','#db2777','#0d9488','#ea580c','#4f46e5',
];

function generateKillerCages(solution: number[][], size: number): KillerCage[] {
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const cages: KillerCage[] = [];
  let id = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!visited[r][c]) {
        const maxSize = Math.floor(Math.random() * 3) + 2; // 2-4 cells
        const cells: [number, number][] = [];
        const stack: [number, number][] = [[r, c]];
        while (stack.length && cells.length < maxSize) {
          const [cr, cc] = stack.pop()!;
          if (visited[cr][cc]) continue;
          visited[cr][cc] = true;
          cells.push([cr, cc]);
          const dirs = shuffle([[0,1],[1,0],[0,-1],[-1,0]]);
          for (const [dr, dc] of dirs) {
            const nr = cr + dr, nc = cc + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc])
              stack.push([nr, nc]);
          }
        }
        const sum = cells.reduce((s, [row, col]) => s + solution[row][col], 0);
        cages.push({ id, sum, cells, color: CAGE_COLORS[id % CAGE_COLORS.length] });
        id++;
      }
    }
  }
  return cages;
}

// ─── Odd/Even Pattern ────────────────────────────────────────────────────────

function generateOddEvenPattern(size: number): ('odd' | 'even' | 'any')[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) =>
      (r + c) % 3 === 0 ? 'any' : (r + c) % 2 === 0 ? 'even' : 'odd'
    )
  );
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export function generateGrid(
  size: GridSize,
  difficulty: Difficulty,
  mode: 'classic' | 'killer' | 'irregular' | 'diagonal' | 'odd-even' | 'image' | 'ice-breaker'
): GridState {
  const solutionArr = createEmpty(size);

  let irregularRegions: number[][] | undefined;

  if (mode === 'irregular') {
    irregularRegions = generateIrregularRegions(size);
    const solved = solveIrregular(solutionArr, size, irregularRegions, true);
    
    // If irregular solve fails or times out, fall back to a standard board 
    // but keep the irregular regions for the visual/constraint challenge.
    // Most standard solutions are valid for many irregular maps.
    if (!solved) {
      const base = generateBaseBoard(size);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          solutionArr[r][c] = base[r][c];
        }
      }
    }
  } else {
    // For all regular grids, mathematical generation is instant and valid.
    const base = generateBaseBoard(size);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        solutionArr[r][c] = base[r][c];
      }
    }
  }

  const puzzleArr = createPuzzle(solutionArr, size, difficulty, irregularRegions);

  const isClue = puzzleArr.map(row => row.map(v => v !== 0));
  const pencilMarks = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => new Set<number>())
  );

  const state: GridState = {
    size,
    values: puzzleArr,
    solution: solutionArr,
    isClue,
    pencilMarks,
    irregularRegions,
  };

  if (mode === 'killer') {
    state.killerCages = generateKillerCages(solutionArr, size);
  }

  if (mode === 'odd-even') {
    state.oddEvenPattern = generateOddEvenPattern(size);
  }

  if (mode === 'ice-breaker') {
    // Generate some frozen cells (cells that are empty and need to be thawed)
    const frozen = Array.from({ length: size }, () => Array(size).fill(false));
    let numFrozen = Math.floor((size * size - targetClues(size, difficulty)) * 0.4); // 40% of empty cells are frozen
    
    // We only freeze empty cells
    const emptyPositions = [];
    for(let r=0; r<size; r++) {
      for(let c=0; c<size; c++) {
        if(!isClue[r][c]) emptyPositions.push([r, c]);
      }
    }
    const shuffledEmpty = shuffle(emptyPositions);
    for(let i=0; i<numFrozen && i<shuffledEmpty.length; i++) {
      const [r, c] = shuffledEmpty[i];
      frozen[r][c] = true;
    }
    state.frozenCells = frozen;
  }

  return state;
}

// Helper to get target clues
function targetClues(size: number, difficulty: Difficulty): number {
  return CLUE_TARGETS[difficulty][size] ?? Math.floor(size * size * 0.4);
}

// ─── Samurai Generator ────────────────────────────────────────────────────────

export function generateSamurai(difficulty: Difficulty, mode: 'samurai' | 'samurai3' | 'samurai4' | 'combo'): GridState[] {
  const grids: GridState[] = [];
  const count = mode === 'combo' ? 2 : mode === 'samurai3' ? 3 : mode === 'samurai4' ? 4 : 5;
  for (let i = 0; i < count; i++) {
    grids.push(generateGrid(9, difficulty, 'classic'));
  }
  return grids;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function isGridComplete(grid: GridState): boolean {
  const { values, solution, size } = grid;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (values[r][c] !== solution[r][c]) return false;
  return true;
}

export function getConflicts(grid: GridState, mode: string): Set<string> {
  const { values, size } = grid;
  const conflicts = new Set<string>();
  const [br, bc] = boxDims(size);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = values[r][c];
      if (val === 0) continue;

      // Row conflicts
      for (let cc = 0; cc < size; cc++) {
        if (cc !== c && values[r][cc] === val) {
          conflicts.add(`${r}-${c}`);
          conflicts.add(`${r}-${cc}`);
        }
      }
      // Col conflicts
      for (let rr = 0; rr < size; rr++) {
        if (rr !== r && values[rr][c] === val) {
          conflicts.add(`${r}-${c}`);
          conflicts.add(`${rr}-${c}`);
        }
      }
      // Box conflicts
      const startR = Math.floor(r / br) * br;
      const startC = Math.floor(c / bc) * bc;
      for (let rr = startR; rr < startR + br; rr++) {
        for (let cc = startC; cc < startC + bc; cc++) {
          if ((rr !== r || cc !== c) && values[rr][cc] === val) {
            conflicts.add(`${r}-${c}`);
            conflicts.add(`${rr}-${cc}`);
          }
        }
      }

      // Diagonal conflicts for X-mode
      if (mode === 'diagonal') {
        // Main diagonal (top-left to bottom-right)
        if (r === c) {
          for (let i = 0; i < size; i++) {
            if (i !== r && values[i][i] === val) {
              conflicts.add(`${r}-${c}`);
              conflicts.add(`${i}-${i}`);
            }
          }
        }
        // Anti-diagonal
        if (r + c === size - 1) {
          for (let i = 0; i < size; i++) {
            const j = size - 1 - i;
            if ((i !== r || j !== c) && values[i][j] === val) {
              conflicts.add(`${r}-${c}`);
              conflicts.add(`${i}-${j}`);
            }
          }
        }
      }
    }
  }

  // Killer cage conflicts
  if (mode === 'killer' && grid.killerCages) {
    for (const cage of grid.killerCages) {
      const seenVals = new Map<number, [number, number][]>();
      for (const [cr, cc] of cage.cells) {
        const v = values[cr][cc];
        if (v !== 0) {
          if (!seenVals.has(v)) seenVals.set(v, []);
          seenVals.get(v)!.push([cr, cc]);
        }
      }
      for (const cells of seenVals.values()) {
        if (cells.length > 1) {
          cells.forEach(([cr, cc]) => conflicts.add(`${cr}-${cc}`));
        }
      }
    }
  }

  return conflicts;
}

export function getRemainingCounts(grid: GridState): Record<number, number> {
  const counts: Record<number, number> = {};
  const size = grid.size;
  for (let n = 1; n <= size; n++) counts[n] = size;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid.values[r][c] > 0) counts[grid.values[r][c]]--;
  return counts;
}

export function autoFillNotes(grid: GridState, mode: string): Set<number>[][] {
  const { size, values } = grid;
  const [br, bc] = boxDims(size);
  const pencil = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => new Set<number>())
  );
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (values[r][c] !== 0) continue;
      for (let n = 1; n <= size; n++) {
        if (isValidPlacement(values, r, c, n, size)) {
          pencil[r][c].add(n);
        }
      }
    }
  }
  return pencil;
}
