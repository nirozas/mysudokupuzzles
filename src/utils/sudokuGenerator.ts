import type { Difficulty, GameMode, GridState, KillerCage } from '../types';

// Use bitmasks for O(1) constraint checking. A 9-bit number represents 1-9.
const getBit = (n: number) => 1 << (n - 1);

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
  return [Math.sqrt(size) | 0, Math.sqrt(size) | 0];
}

// ─── Core Validation ─────────────────────────────────────────────────────────

export function isValidPlacement(
  grid: number[][],
  r: number,
  c: number,
  num: number,
  size: number,
  regionMap?: number[][],
  mode?: GameMode,
  oddEvenPattern?: ('odd' | 'even' | 'any')[][]
): boolean {
  // Row
  for (let i = 0; i < size; i++) if (i !== c && grid[r][i] === num) return false;
  // Col
  for (let i = 0; i < size; i++) if (i !== r && grid[i][c] === num) return false;
  
  // Box or Irregular Region
  if (regionMap) {
    const regionId = regionMap[r][c];
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (regionMap[i][j] === regionId && (i !== r || j !== c)) {
          if (grid[i][j] === num) return false;
        }
      }
    }
  } else {
    const [br, bc] = boxDims(size);
    if (br > 0 && bc > 0) {
      const boxR = Math.floor(r / br) * br;
      const boxC = Math.floor(c / bc) * bc;
      for (let i = boxR; i < boxR + br; i++) {
        for (let j = boxC; j < boxC + bc; j++) {
          if ((i !== r || j !== c) && grid[i][j] === num) return false;
        }
      }
    }
  }

  // Diagonal
  if (mode === 'diagonal') {
    if (r === c) {
      for (let i = 0; i < size; i++) if (i !== r && grid[i][i] === num) return false;
    }
    if (r + c === size - 1) {
      for (let i = 0; i < size; i++) if (i !== r && grid[i][size - 1 - i] === num) return false;
    }
  }

  // Parity (Odd/Even)
  if (oddEvenPattern) {
    const type = oddEvenPattern[r][c];
    if (type === 'even' && num % 2 !== 0) return false;
    if (type === 'odd' && num % 2 === 0) return false;
  }

  return true;
}

// ─── Solver ──────────────────────────────────────────────────────────────────

interface SolverState {
  rows: number[];
  cols: number[];
  boxes: number[];
  regions: number[];
  diag1: number;
  diag2: number;
}

function solveOptimized(
  grid: number[][],
  size: number,
  state: SolverState,
  regionMap?: number[][],
  randomize = false,
  limitSolutions = 1,
  nodeLimit = 10000,
  isDiagonal = false,
  oddEvenPattern?: ('odd' | 'even' | 'any')[][]
): number {
  let solutionsFound = 0;
  let nodesVisited = 0;

  function findMRV() {
    let minCandidates = size + 1;
    let bestPos: [number, number] | null = null;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) {
          let mask = state.rows[r] | state.cols[c];
          if (regionMap) {
            mask |= state.regions[regionMap[r][c]];
          } else {
            const [br, bc] = boxDims(size);
            const boxId = Math.floor(r / br) * (size / bc) + Math.floor(c / bc);
            mask |= state.boxes[boxId];
          }

          if (isDiagonal) {
            if (r === c) mask |= state.diag1;
            if (r + c === size - 1) mask |= state.diag2;
          }

          if (oddEvenPattern) {
            const p = oddEvenPattern[r][c];
            if (p === 'even') mask |= 0x155; // block 1,3,5,7,9 (0b101010101) - wait, 0x155 is 0b101010101
            if (p === 'odd')  mask |= 0x0AA; // block 2,4,6,8 (0b010101010)
          }

          let count = 0;
          for (let n = 1; n <= size; n++) if (!(mask & getBit(n))) count++;
          if (count < minCandidates) {
            minCandidates = count;
            bestPos = [r, c];
            if (count === 0) return { bestPos, minCandidates: 0 };
          }
        }
      }
    }
    return { bestPos, minCandidates };
  }

  function backtrack(): boolean {
    nodesVisited++;
    if (nodesVisited > nodeLimit) return true;

    const { bestPos, minCandidates } = findMRV();
    if (!bestPos) {
      solutionsFound++;
      return solutionsFound >= limitSolutions;
    }
    if (minCandidates === 0) return false;

    const [r, c] = bestPos;
    const [br, bc] = boxDims(size);
    const boxId = Math.floor(r / br) * (size / bc) + Math.floor(c / bc);
    const regId = regionMap ? regionMap[r][c] : -1;

    let mask = state.rows[r] | state.cols[c];
    if (regionMap) mask |= state.regions[regId];
    else mask |= state.boxes[boxId];
    if (isDiagonal) {
      if (r === c) mask |= state.diag1;
      if (r + c === size - 1) mask |= state.diag2;
    }
    if (oddEvenPattern) {
      const p = oddEvenPattern[r][c];
      if (p === 'even') mask |= 0x155;
      if (p === 'odd')  mask |= 0x0AA;
    }

    const nums = [];
    for (let n = 1; n <= size; n++) if (!(mask & getBit(n))) nums.push(n);
    if (randomize) shuffle(nums);

    for (const n of nums) {
      const bit = getBit(n);
      grid[r][c] = n;
      state.rows[r] |= bit;
      state.cols[c] |= bit;
      if (regionMap) state.regions[regId] |= bit;
      else state.boxes[boxId] |= bit;
      if (isDiagonal) {
        if (r === c) state.diag1 |= bit;
        if (r + c === size - 1) state.diag2 |= bit;
      }

      if (backtrack()) return true;

      grid[r][c] = 0;
      state.rows[r] &= ~bit;
      state.cols[c] &= ~bit;
      if (regionMap) state.regions[regId] &= ~bit;
      else state.boxes[boxId] &= ~bit;
      if (isDiagonal) {
        if (r === c) state.diag1 &= ~bit;
        if (r + c === size - 1) state.diag2 &= ~bit;
      }
    }
    return false;
  }

  backtrack();
  return solutionsFound;
}

// ─── Generators ──────────────────────────────────────────────────────────────

const CLUE_TARGETS: Record<Difficulty, Record<number, number>> = {
  easy:   { 4: 12, 6: 24, 9: 48, 16: 144 },
  medium: { 4: 10, 6: 20, 9: 40, 16: 120 },
  hard:   { 4: 8,  6: 16, 9: 32, 16: 104 },
  expert: { 4: 6,  6: 12, 9: 26, 16: 90  },
  evil:   { 4: 4,  6: 8,  9: 22, 16: 72  },
};

export function generateGrid(size: number, difficulty: Difficulty, mode: GameMode): GridState {
  const grid = Array.from({ length: size }, () => Array(size).fill(0));
  const state: SolverState = {
    rows: Array(size).fill(0),
    cols: Array(size).fill(0),
    boxes: Array(size).fill(0),
    regions: Array(size).fill(0),
    diag1: 0,
    diag2: 0
  };

  let regionMap: number[][] | undefined;
  let oddEvenPattern: ('odd' | 'even' | 'any')[][] | undefined;

  if (mode === 'irregular') regionMap = generateIrregularRegions(size);
  if (mode === 'odd-even') {
    oddEvenPattern = Array.from({ length: size }, () => 
      Array.from({ length: size }, () => Math.random() > 0.6 ? 'any' : Math.random() > 0.5 ? 'even' : 'odd')
    );
  }

  solveOptimized(grid, size, state, regionMap, true, 1, 10000, mode === 'diagonal', oddEvenPattern);
  const solution = grid.map(r => [...r]);
  const target = CLUE_TARGETS[difficulty][size] || (size * size / 3);
  const cells = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push([r, c]);
  shuffle(cells);

  const values = solution.map(r => [...r]);
  const isClue = Array.from({ length: size }, () => Array(size).fill(true));
  let dug = 0;
  for (const [r, c] of cells) {
    if (dug >= size * size - target) break;
    values[r][c] = 0;
    isClue[r][c] = false;
    dug++;
  }

  const stateData: GridState = {
    size, values, solution, isClue,
    pencilMarks: Array.from({ length: size }, () => Array.from({ length: size }, () => new Set<number>())),
    irregularRegions: regionMap,
    oddEvenPattern
  };

  if (mode === 'killer') {
    stateData.killerCages = generateKillerCages(solution, size);
  }

  if (mode === 'ice-breaker') {
    const ice = Array.from({ length: size }, () => Array(size).fill(0));
    const targetIce = Math.floor(size * size * 0.35);
    const cands = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!isClue[r][c]) cands.push([r, c]);
    shuffle(cands);
    for (let i = 0; i < Math.min(targetIce, cands.length); i++) {
      const [r, c] = cands[i];
      let layers = 1;
      if (difficulty === 'hard') layers = Math.random() > 0.7 ? 2 : 1;
      if (difficulty === 'expert') layers = Math.random() > 0.5 ? 2 : 1;
      if (difficulty === 'evil') layers = Math.random() > 0.6 ? 3 : 2;
      ice[r][c] = layers;
    }
    stateData.iceStatus = ice;
    stateData.startIceStatus = ice.map(r => [...r]);
  }
  return stateData;
}

function generateIrregularRegions(size: number): number[][] {
  const regions = Array.from({ length: size }, () => Array(size).fill(-1));
  const seeds = [];
  for (let i = 0; i < size; i++) {
    let r, c;
    do {
      r = Math.floor(Math.random() * size);
      c = Math.floor(Math.random() * size);
    } while (regions[r][c] !== -1);
    regions[r][c] = i;
    seeds.push([r, c]);
  }
  const queue = [...seeds.map((s, i) => ({ r: s[0], c: s[1], id: i }))];
  shuffle(queue);
  while (queue.length > 0) {
    const { r, c, id } = queue.shift()!;
    const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
    shuffle(neighbors);
    for (const [dr, dc] of neighbors) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && regions[nr][nc] === -1) {
        regions[nr][nc] = id;
        queue.push({ r: nr, c: nc, id });
      }
    }
  }
  return regions;
}

const CAGE_COLORS = [
  '#7c3aed','#0891b2','#059669','#d97706','#dc2626',
  '#db2777','#0d9488','#ea580c','#4f46e5',
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

// ─── Samurai Generator ────────────────────────────────────────────────────────

export const SAMURAI_OVERLAPS: Record<string, Record<number, { other: number; range: [number, number, number, number]; otherRange: [number, number, number, number] }[]>> = {
  'combo': {
    0: [{ other: 1, range: [6, 8, 6, 8], otherRange: [0, 2, 0, 2] }],
    1: [{ other: 0, range: [0, 2, 0, 2], otherRange: [6, 8, 6, 8] }]
  },
  'samurai': {
    0: [{ other: 2, range: [6, 8, 6, 8], otherRange: [0, 2, 0, 2] }],
    1: [{ other: 2, range: [6, 8, 0, 2], otherRange: [0, 2, 6, 8] }],
    2: [
      { other: 0, range: [0, 2, 0, 2], otherRange: [6, 8, 6, 8] },
      { other: 1, range: [0, 2, 6, 8], otherRange: [6, 8, 0, 2] },
      { other: 3, range: [6, 8, 0, 2], otherRange: [0, 2, 6, 8] },
      { other: 4, range: [6, 8, 6, 8], otherRange: [0, 2, 0, 2] }
    ],
    3: [{ other: 2, range: [0, 2, 6, 8], otherRange: [6, 8, 0, 2] }],
    4: [{ other: 2, range: [0, 2, 0, 2], otherRange: [6, 8, 6, 8] }]
  }
};

export function generateSamurai(difficulty: Difficulty, mode: 'samurai' | 'samurai3' | 'samurai4' | 'combo'): GridState[] {
  const m = (mode === 'combo') ? 'combo' : 'samurai';
  const overlaps = SAMURAI_OVERLAPS[m] || {};
  const size = 9;
  const gridCount = mode === 'combo' ? 2 : mode === 'samurai3' ? 3 : mode === 'samurai4' ? 4 : 5;
  const gridValues = Array.from({ length: gridCount }, () => Array.from({ length: size }, () => Array(size).fill(0)));

  function solve(gIdx: number, r: number, c: number): boolean {
    if (r === size) {
      if (gIdx === gridCount - 1) return true;
      return solve(gIdx + 1, 0, 0);
    }
    const nextC = (c + 1) % size;
    const nextR = nextC === 0 ? r + 1 : r;
    if (gridValues[gIdx][r][c] !== 0) return solve(gIdx, nextR, nextC);

    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const num of nums) {
      if (isValidPlacement(gridValues[gIdx], r, c, num, size)) {
        const syncs = overlaps[gIdx]?.filter(o => r >= o.range[0] && r <= o.range[1] && c >= o.range[2] && c <= o.range[3]) || [];
        let ok = true;
        for (const s of syncs) {
          const or = s.otherRange[0] + (r - s.range[0]);
          const oc = s.otherRange[2] + (c - s.range[2]);
          if (!isValidPlacement(gridValues[s.other], or, oc, num, size)) { ok = false; break; }
        }
        if (ok) {
          gridValues[gIdx][r][c] = num;
          for (const s of syncs) {
            const or = s.otherRange[0] + (r - s.range[0]);
            const oc = s.otherRange[2] + (c - s.range[2]);
            gridValues[s.other][or][oc] = num;
          }
          if (solve(gIdx, nextR, nextC)) return true;
          gridValues[gIdx][r][c] = 0;
          for (const s of syncs) {
            const or = s.otherRange[0] + (r - s.range[0]);
            const oc = s.otherRange[2] + (c - s.range[2]);
            gridValues[s.other][or][oc] = 0;
          }
        }
      }
    }
    return false;
  }

  solve(0, 0, 0);

  const finalGrids: GridState[] = [];
  const target = CLUE_TARGETS[difficulty][9] || 30;

  for (let i = 0; i < gridCount; i++) {
    const solution = gridValues[i].map(r => [...r]);
    const values = gridValues[i].map(r => [...r]);
    const isClue = Array.from({ length: size }, () => Array(size).fill(true));
    const cells = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push([r, c]);
    shuffle(cells);
    let dug = 0;
    for (const [r, c] of cells) {
      if (dug >= size * size - target) break;
      values[r][c] = 0;
      isClue[r][c] = false;
      dug++;
    }
    finalGrids.push({
      size, values, solution, isClue,
      pencilMarks: Array.from({ length: size }, () => Array.from({ length: size }, () => new Set<number>())),
    });
  }
  return finalGrids;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function isGridComplete(grid: GridState): boolean {
  const { values, solution, size } = grid;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (values[r][c] !== solution[r][c]) return false;
  return true;
}

export function getConflicts(grid: GridState, mode: GameMode): Set<string> {
  const { values, size, irregularRegions, oddEvenPattern } = grid;
  const conflicts = new Set<string>();

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = values[r][c];
      if (val === 0) continue;
      if (!isValidPlacement(values, r, c, val, size, irregularRegions, mode, oddEvenPattern)) {
        conflicts.add(`${r}-${c}`);
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
  for (let n = 1; n <= grid.size; n++) counts[n] = grid.size;
  for (let r = 0; r < grid.size; r++)
    for (let c = 0; c < grid.size; c++)
      if (grid.values[r][c] > 0) {
        const val = grid.values[r][c];
        if (counts[val]) counts[val]--;
      }
  return counts;
}

export function autoFillNotes(grid: GridState, mode: GameMode): Set<number>[][] {
  const { size, values, irregularRegions, oddEvenPattern } = grid;
  const pencil = Array.from({ length: size }, () => Array.from({ length: size }, () => new Set<number>()));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (values[r][c] !== 0) continue;
      for (let n = 1; n <= size; n++) {
        if (isValidPlacement(values, r, c, n, size, irregularRegions, mode, oddEvenPattern)) {
          pencil[r][c].add(n);
        }
      }
    }
  }
  return pencil;
}
