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

// ─── Uniqueness check ───────────────────────────────────────────────────────
// Fast solver that counts solutions up to `limit`. Exits early at limit.
function countSolutions(
  grid: number[][],
  size: number,
  regionMap?: number[][],
  isDiagonal = false,
  limit = 2
): number {
  // Build bitmask state from current grid
  const [br, bc] = boxDims(size);
  const rows = Array(size).fill(0);
  const cols = Array(size).fill(0);
  const boxes = Array(size).fill(0);
  const regions = Array(size).fill(0);
  let diag1 = 0, diag2 = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = grid[r][c];
      if (v === 0) continue;
      const bit = 1 << (v - 1);
      rows[r] |= bit; cols[c] |= bit;
      if (regionMap) regions[regionMap[r][c]] |= bit;
      else boxes[Math.floor(r/br)*(size/bc)+Math.floor(c/bc)] |= bit;
      if (isDiagonal) { if (r===c) diag1|=bit; if (r+c===size-1) diag2|=bit; }
    }
  }
  let found = 0;
  function bt(): void {
    if (found >= limit) return;
    let bestR = -1, bestC = -1, bestCount = size + 1;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] !== 0) continue;
        let mask = rows[r] | cols[c];
        if (regionMap) mask |= regions[regionMap[r][c]];
        else mask |= boxes[Math.floor(r/br)*(size/bc)+Math.floor(c/bc)];
        if (isDiagonal) { if (r===c) mask|=diag1; if (r+c===size-1) mask|=diag2; }
        let cnt = 0; for (let n=1;n<=size;n++) if (!(mask&(1<<(n-1)))) cnt++;
        if (cnt < bestCount) { bestCount=cnt; bestR=r; bestC=c; }
        if (cnt === 0) return;
      }
    }
    if (bestR === -1) { found++; return; }
    const r = bestR, c = bestC;
    const boxId = Math.floor(r/br)*(size/bc)+Math.floor(c/bc);
    const regId = regionMap ? regionMap[r][c] : -1;
    for (let n = 1; n <= size; n++) {
      const bit = 1 << (n-1);
      let mask = rows[r]|cols[c];
      if (regionMap) mask|=regions[regId]; else mask|=boxes[boxId];
      if (isDiagonal){if(r===c)mask|=diag1;if(r+c===size-1)mask|=diag2;}
      if (mask & bit) continue;
      grid[r][c]=n; rows[r]|=bit; cols[c]|=bit;
      if(regionMap)regions[regId]|=bit; else boxes[boxId]|=bit;
      if(isDiagonal){if(r===c)diag1|=bit;if(r+c===size-1)diag2|=bit;}
      bt();
      grid[r][c]=0; rows[r]&=~bit; cols[c]&=~bit;
      if(regionMap)regions[regId]&=~bit; else boxes[boxId]&=~bit;
      if(isDiagonal){if(r===c)diag1&=~bit;if(r+c===size-1)diag2&=~bit;}
      if (found >= limit) return;
    }
  }
  bt();
  return found;
}

// ─── Generators ──────────────────────────────────────────────────────────────

// Clue targets: how many givens remain after removal.
// Calibrated so Easy is accessible (many givens spread around) and
// Evil is truly minimal (few givens, uniqueness enforced).
const CLUE_TARGETS: Record<Difficulty, Record<number, number>> = {
  easy:   { 4: 14, 6: 26, 9: 45, 16: 150 },
  medium: { 4: 12, 6: 22, 9: 36, 16: 128 },
  hard:   { 4: 9,  6: 17, 9: 30, 16: 108 },
  expert: { 4: 7,  6: 13, 9: 25, 16: 92  },
  evil:   { 4: 5,  6: 9,  9: 22, 16: 76  },
};

// Build a removal order that interleaves cells from all regions/boxes so
// that givens end up spatially distributed across the whole grid.
// We split the grid into (br x bc) zones, shuffle within each zone, then
// interleave zone queues round-robin — this prevents clumping on one side.
function balancedRemovalOrder(size: number): [number, number][] {
  const [br, bc] = (() => {
    if (size === 4) return [2, 2];
    if (size === 6) return [2, 3];
    if (size === 9) return [3, 3];
    return [4, 4];
  })();
  const numBoxes = (size / br) * (size / bc);
  const zones: [number, number][][] = Array.from({ length: numBoxes }, () => []);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const boxId = Math.floor(r / br) * (size / bc) + Math.floor(c / bc);
      zones[boxId].push([r, c]);
    }
  }
  zones.forEach(z => shuffle(z));
  // Also shuffle zone order to vary which box gets priority
  const zoneOrder = shuffle(Array.from({ length: numBoxes }, (_, i) => i));
  const result: [number, number][] = [];
  let maxLen = Math.max(...zones.map(z => z.length));
  for (let i = 0; i < maxLen; i++) {
    for (const zi of zoneOrder) {
      if (i < zones[zi].length) result.push(zones[zi][i]);
    }
  }
  return result;
}

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

  // Solve the grid FIRST (unconstrained for odd-even, constrained for diagonal)
  solveOptimized(grid, size, state, regionMap, true, 1, 10000, mode === 'diagonal');
  const solution = grid.map(r => [...r]);

  if (mode === 'odd-even') {
    // Derive parity from the solved grid. ~35% of cells become 'any' so the
    // puzzle isn't completely trivial. Pattern is always satisfiable.
    oddEvenPattern = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => {
        if (Math.random() < 0.35) return 'any';
        return solution[r][c] % 2 === 0 ? 'even' : 'odd';
      })
    );
  }

  // Jitter target ±2 for variety between puzzles of same difficulty
  const baseTarget = CLUE_TARGETS[difficulty][size] || Math.round(size * size * 0.45);
  const jitter = Math.floor(Math.random() * 5) - 2; // -2..+2
  const target = Math.max(size + 1, baseTarget + jitter);

  // Removal order: interleaved across zones for spatial distribution
  const cells = balancedRemovalOrder(size);

  const values = solution.map(r => [...r]);
  const isClue = Array.from({ length: size }, () => Array(size).fill(true));
  let dug = 0;
  for (const [r, c] of cells) {
    if (dug >= size * size - target) break;
    const saved = values[r][c];
    values[r][c] = 0;
    // Uniqueness check (only for 9×9 and below — 16×16 too slow)
    if (size <= 9 && countSolutions(values.map(row => [...row]), size, regionMap, mode === 'diagonal') !== 1) {
      values[r][c] = saved;
      continue;
    }
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
  const MAX_RETRIES = 100;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const regionMap = Array.from({ length: size }, () => Array(size).fill(-1));
    const regionSizes = Array(size).fill(0);

    // Latin-square seeding: seed i goes in row i, col (i*3 + floor(i/3)) % size
    const seedPositions: [number, number][] = [];
    const usedCells = new Set<string>();
    let seedsOk = true;

    for (let i = 0; i < size; i++) {
      const r = i;
      let c = (i * 3 + Math.floor(i / 3)) % size;
      // Jitter if collision
      let tries = 0;
      while (usedCells.has(`${r}-${c}`) && tries < size) {
        c = (c + 1) % size;
        tries++;
      }
      if (usedCells.has(`${r}-${c}`)) { seedsOk = false; break; }
      usedCells.add(`${r}-${c}`);
      regionMap[r][c] = i;
      regionSizes[i] = 1;
      seedPositions.push([r, c]);
    }
    if (!seedsOk) continue;

    // BFS expansion — interleave all regions fairly
    // Queue entries: { r, c, id }
    interface QEntry { r: number; c: number; id: number }
    const queues: QEntry[][] = seedPositions.map(([r, c], id) => [{ r, c, id }]);
    const DIRS: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    let totalFilled = size; // seeds already placed
    const totalCells = size * size;

    while (totalFilled < totalCells) {
      let anyProgress = false;
      // Round-robin across regions
      const order = shuffle(Array.from({ length: size }, (_, i) => i));
      for (const id of order) {
        if (regionSizes[id] >= size) continue;
        // Try to expand region `id`
        shuffle(queues[id]);
        let expanded = false;
        const nextQueue: QEntry[] = [];
        for (const entry of queues[id]) {
          if (expanded) { nextQueue.push(entry); continue; }
          const dirs = shuffle([...DIRS]);
          for (const [dr, dc] of dirs) {
            const nr = entry.r + dr, nc = entry.c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && regionMap[nr][nc] === -1) {
              regionMap[nr][nc] = id;
              regionSizes[id]++;
              totalFilled++;
              queues[id].push({ r: nr, c: nc, id });
              expanded = true;
              anyProgress = true;
              break;
            }
          }
          nextQueue.push(entry);
        }
        queues[id] = nextQueue;
      }
      if (!anyProgress) break; // stuck — retry
    }

    // Validate
    if (totalFilled !== totalCells) continue;
    if (regionSizes.some(s => s !== size)) continue;

    // Connectivity check for each region via BFS
    let allConnected = true;
    for (let id = 0; id < size; id++) {
      const cells: [number, number][] = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (regionMap[r][c] === id) cells.push([r, c]);

      const visited = new Set<string>();
      const bfsQueue: [number, number][] = [cells[0]];
      visited.add(`${cells[0][0]}-${cells[0][1]}`);
      while (bfsQueue.length) {
        const [cr, cc] = bfsQueue.shift()!;
        for (const [dr, dc] of DIRS) {
          const nr = cr + dr, nc = cc + dc;
          const key = `${nr}-${nc}`;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && regionMap[nr][nc] === id && !visited.has(key)) {
            visited.add(key);
            bfsQueue.push([nr, nc]);
          }
        }
      }
      if (visited.size !== size) { allConnected = false; break; }
    }
    if (!allConnected) continue;

    return regionMap;
  }

  // Absolute fallback: standard 3×3 box regions
  const fallback = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) =>
      Math.floor(r / 3) * 3 + Math.floor(c / 3)
    )
  );
  return fallback;
}

// 6 visually distinct cage colors for graph-coloring
const CAGE_COLORS = [
  '#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#a855f7',
];

// Precomputed valid sum range per cage size: min=n(n+1)/2, max=n(19-n)/2
function cageSumValid(n: number, sum: number): boolean {
  const minS = (n * (n + 1)) / 2;
  const maxS = (n * (19 - n)) / 2;
  return sum >= minS && sum <= maxS;
}

function generateKillerCages(solution: number[][], size: number): KillerCage[] {
  const DIRS: [number,number][] = [[0,1],[0,-1],[1,0],[-1,0]];
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const cages: KillerCage[] = [];
  let id = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (visited[r][c]) continue;
      // Target size 2-5 cells
      const maxSize = Math.floor(Math.random() * 4) + 2;
      const cells: [number, number][] = [];
      const frontier: [number, number][] = [[r, c]];

      while (frontier.length && cells.length < maxSize) {
        const idx = Math.floor(Math.random() * frontier.length);
        const [cr, cc] = frontier.splice(idx, 1)[0];
        if (visited[cr][cc]) continue;
        // Tentatively add — check sum validity if this completes the cage
        const tentativeCells = [...cells, [cr, cc] as [number,number]];
        const tentativeSum = tentativeCells.reduce((s,[row,col]) => s+solution[row][col], 0);
        if (!cageSumValid(tentativeCells.length, tentativeSum)) {
          // Sum would be out of range — skip this cell
          continue;
        }
        visited[cr][cc] = true;
        cells.push([cr, cc]);
        for (const [dr,dc] of shuffle([...DIRS])) {
          const nr=cr+dr, nc=cc+dc;
          if (nr>=0&&nr<size&&nc>=0&&nc<size&&!visited[nr][nc]) frontier.push([nr,nc]);
        }
      }

      if (cells.length === 0) { visited[r][c]=true; continue; } // safety
      const sum = cells.reduce((s,[row,col])=>s+solution[row][col],0);
      cages.push({ id, sum, cells, color: '' }); // color assigned below
      id++;
    }
  }

  // Graph-coloring: assign colors so no two adjacent cages share a color
  const cellCageId = Array.from({length:size},()=>Array(size).fill(-1));
  cages.forEach((cage,i) => cage.cells.forEach(([r,c])=>{ cellCageId[r][c]=i; }));

  const adj: Set<number>[] = Array.from({length:cages.length},()=>new Set<number>());
  const DIRSQ: [number,number][] = [[0,1],[0,-1],[1,0],[-1,0]];
  cages.forEach((cage,i) => {
    for (const [r,c] of cage.cells) {
      for (const [dr,dc] of DIRSQ) {
        const nr=r+dr,nc=c+dc;
        if(nr>=0&&nr<size&&nc>=0&&nc<size&&cellCageId[nr][nc]!==-1&&cellCageId[nr][nc]!==i)
          adj[i].add(cellCageId[nr][nc]);
      }
    }
  });
  const assigned: number[] = Array(cages.length).fill(-1);
  for (let i=0;i<cages.length;i++) {
    const usedColors = new Set(Array.from(adj[i]).map(j=>assigned[j]).filter(x=>x>=0));
    let color = 0;
    while (usedColors.has(color)) color++;
    assigned[i] = color % CAGE_COLORS.length;
    cages[i].color = CAGE_COLORS[assigned[i]];
  }

  return cages;
}

// ─── Samurai Generator ────────────────────────────────────────────────────────

export const SAMURAI_OVERLAPS: Record<string, Record<number, { other: number; range: [number, number, number, number]; otherRange: [number, number, number, number] }[]>> = {
  'combo': {
    0: [{ other: 1, range: [6, 8, 6, 8], otherRange: [0, 2, 0, 2] }],
    1: [{ other: 0, range: [0, 2, 0, 2], otherRange: [6, 8, 6, 8] }]
  },
  'combo3x6': {
    0: [{ other: 1, range: [6, 8, 3, 8], otherRange: [0, 2, 0, 5] }],
    1: [{ other: 0, range: [0, 2, 0, 5], otherRange: [6, 8, 3, 8] }]
  },
'combo6x3': {
    0: [{ other: 1, range: [3, 8, 6, 8], otherRange: [0, 5, 0, 2] }],
    1: [{ other: 0, range: [0, 5, 0, 2], otherRange: [3, 8, 6, 8] }]
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

export function generateSamurai(difficulty: Difficulty, mode: 'samurai' | 'samurai3' | 'samurai4' | 'combo'): { grids: GridState[], mode: string } {
  let m: string = mode;
  if (mode === 'combo') {
    const variants = ['combo', 'combo3x6', 'combo6x3'];
    m = variants[Math.floor(Math.random() * variants.length)];
  }

  // ── Combo (2-grid) path — keep existing overlap-sync logic ───────────────
  if (mode === 'combo') {
    const overlaps = SAMURAI_OVERLAPS[m] || {};
    const size = 9;
    const gridValues = Array.from({ length: 2 }, () => Array.from({ length: size }, () => Array(size).fill(0)));
    function solveCombo(gIdx: number, r: number, c: number): boolean {
      if (r === size) { if (gIdx === 1) return true; return solveCombo(1, 0, 0); }
      const nextC = (c + 1) % size, nextR = nextC === 0 ? r + 1 : r;
      if (gridValues[gIdx][r][c] !== 0) return solveCombo(gIdx, nextR, nextC);
      for (const num of shuffle([1,2,3,4,5,6,7,8,9])) {
        if (!isValidPlacement(gridValues[gIdx], r, c, num, size)) continue;
        const syncs = (overlaps[gIdx] || []).filter((o: any) => r >= o.range[0] && r <= o.range[1] && c >= o.range[2] && c <= o.range[3]);
        let ok = true;
        for (const s of syncs) {
          const or = s.otherRange[0] + (r - s.range[0]), oc = s.otherRange[2] + (c - s.range[2]);
          if (!isValidPlacement(gridValues[s.other], or, oc, num, size)) { ok = false; break; }
        }
        if (!ok) continue;
        gridValues[gIdx][r][c] = num;
        for (const s of syncs) { gridValues[s.other][s.otherRange[0]+(r-s.range[0])][s.otherRange[2]+(c-s.range[2])] = num; }
        if (solveCombo(gIdx, nextR, nextC)) return true;
        gridValues[gIdx][r][c] = 0;
        for (const s of syncs) { gridValues[s.other][s.otherRange[0]+(r-s.range[0])][s.otherRange[2]+(c-s.range[2])] = 0; }
      }
      return false;
    }
    solveCombo(0, 0, 0);
    const target = CLUE_TARGETS[difficulty][9] || 30;
    return {
      mode: m,
      grids: gridValues.map(gv => {
        const solution = gv.map(r => [...r]);
        const values = gv.map(r => [...r]);
        const isClue = Array.from({ length: 9 }, () => Array(9).fill(true));
        const cells: [number,number][] = [];
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cells.push([r,c]);
        shuffle(cells);
        let dug = 0;
        for (const [r,c] of cells) {
          if (dug >= 81 - target) break;
          values[r][c] = 0; isClue[r][c] = false; dug++;
        }
        return { size: 9, values, solution, isClue, pencilMarks: Array.from({length:9},()=>Array.from({length:9},()=>new Set<number>())) };
      })
    };
  }

  // ── Unified 21×21 master grid for samurai / samurai3 / samurai4 ───────────
  const MASTER = 21;
  const S = 9;

  let origins: [number,number][];
  let gridCount: number;
  if (mode === 'samurai') {
    origins = [[0,0],[0,12],[6,6],[12,0],[12,12]]; gridCount = 5;
  } else if (mode === 'samurai3') {
    origins = [[0,0],[6,6],[12,12]]; gridCount = 3;
  } else {
    origins = [[6,0],[0,6],[12,6],[6,12]]; gridCount = 4;
  }

  const master = Array.from({ length: MASTER }, () => Array(MASTER).fill(0));
  const cellGrids: number[][][] = Array.from({ length: MASTER }, () =>
    Array.from({ length: MASTER }, () => [])
  );
  for (let gi = 0; gi < gridCount; gi++) {
    const [or, oc] = origins[gi];
    for (let r = 0; r < S; r++) for (let c = 0; c < S; c++)
      cellGrids[or+r][oc+c].push(gi);
  }

  const rowBit = Array.from({length: gridCount}, () => Array(S).fill(0));
  const colBit = Array.from({length: gridCount}, () => Array(S).fill(0));
  const boxBit = Array.from({length: gridCount}, () => Array(S).fill(0));

  function canPlace(mr: number, mc: number, n: number): boolean {
    const bit = 1 << (n - 1);
    for (const gi of cellGrids[mr][mc]) {
      const [or, oc] = origins[gi];
      const lr = mr - or, lc = mc - oc;
      if (rowBit[gi][lr] & bit) return false;
      if (colBit[gi][lc] & bit) return false;
      if (boxBit[gi][Math.floor(lr/3)*3+Math.floor(lc/3)] & bit) return false;
    }
    return true;
  }

  function place(mr: number, mc: number, n: number) {
    const bit = 1 << (n - 1);
    master[mr][mc] = n;
    for (const gi of cellGrids[mr][mc]) {
      const [or, oc] = origins[gi];
      const lr = mr - or, lc = mc - oc;
      rowBit[gi][lr] |= bit;
      colBit[gi][lc] |= bit;
      boxBit[gi][Math.floor(lr/3)*3+Math.floor(lc/3)] |= bit;
    }
  }

  function unplace(mr: number, mc: number, n: number) {
    const bit = 1 << (n - 1);
    master[mr][mc] = 0;
    for (const gi of cellGrids[mr][mc]) {
      const [or, oc] = origins[gi];
      const lr = mr - or, lc = mc - oc;
      rowBit[gi][lr] &= ~bit;
      colBit[gi][lc] &= ~bit;
      boxBit[gi][Math.floor(lr/3)*3+Math.floor(lc/3)] &= ~bit;
    }
  }

  for (let gi = 0; gi < gridCount; gi++) {
    const [or, oc] = origins[gi];
    for (let box = 0; box < 3; box++) {
      const br = or + box*3, bc = oc + box*3;
      let hasOverlap = false;
      for (let dr = 0; dr < 3 && !hasOverlap; dr++)
        for (let dc = 0; dc < 3 && !hasOverlap; dc++)
          if (cellGrids[br+dr][bc+dc].length > 1) hasOverlap = true;
      if (hasOverlap) continue;
      const nums = shuffle([1,2,3,4,5,6,7,8,9]);
      let ni = 0;
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++)
        place(br+dr, bc+dc, nums[ni++]);
    }
  }

  const activeCells: [number,number][] = [];
  for (let r = 0; r < MASTER; r++)
    for (let c = 0; c < MASTER; c++)
      if (cellGrids[r][c].length > 0) activeCells.push([r,c]);

  function solveMaster(idx: number): boolean {
    if (idx === activeCells.length) return true;
    const [mr, mc] = activeCells[idx];
    if (master[mr][mc] !== 0) return solveMaster(idx + 1);
    for (const n of shuffle([1,2,3,4,5,6,7,8,9])) {
      if (canPlace(mr, mc, n)) {
        place(mr, mc, n);
        if (solveMaster(idx + 1)) return true;
        unplace(mr, mc, n);
      }
    }
    return false;
  }

  solveMaster(0);

  const target = CLUE_TARGETS[difficulty][9] || 30;
  const finalGrids: GridState[] = origins.map(([or, oc]) => {
    const solution = Array.from({length:S}, (_, r) => Array.from({length:S}, (_, c) => master[or+r][oc+c]));
    const values = solution.map(r => [...r]);
    const isClue = Array.from({length:S}, () => Array(S).fill(true));
    const cells: [number,number][] = [];
    for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) cells.push([r,c]);
    shuffle(cells);
    let dug = 0;
    for (const [r, c] of cells) {
      if (dug >= S * S - target) break;
      values[r][c] = 0; isClue[r][c] = false; dug++;
    }
    return {
      size: S, values, solution, isClue,
      pencilMarks: Array.from({length:S}, () => Array.from({length:S}, () => new Set<number>())),
    };
  });

  return { grids: finalGrids, mode: m };
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
