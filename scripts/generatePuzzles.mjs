/**
 * generatePuzzles.mjs
 * Run with: node scripts/generatePuzzles.mjs
 *
 * Key design decisions:
 *  1. Each grid row is an INDEPENDENT array (Array.from factory, never Array.fill(row)).
 *  2. Grid copies always deep-clone via cloneGrid() — no spread-without-copy bugs.
 *  3. Sudoku-preserving transformations (digit permutation + row/col band swaps +
 *     optional transpose) guarantee every puzzle looks structurally different even
 *     when the same canonical base grid is found by the solver.
 *  4. Mulberry32 seeded PRNG — each puzzle generation call gets a UNIQUE seed
 *     (Date.now() XOR puzzle index × large prime) so pools are reproducibly diverse.
 *  5. Deduplication: fingerprint of values grid; fallback loop also deduplicates.
 *  6. Post-generation assertions confirm: no fully-filled puzzle, all puzzles unique.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'src', 'data', 'puzzles');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────
// Using a seeded PRNG lets us give each puzzle a unique, reproducible seed so
// that pool generation is diverse regardless of JS engine state.

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Core utilities ───────────────────────────────────────────────────────────

function shuffleWith(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cloneGrid(grid) {
  // Deep clone a 2-D array of numbers/booleans — each row is independent.
  return grid.map(row => [...row]);
}

function boxDims(size) {
  if (size === 4)  return [2, 2];
  if (size === 6)  return [2, 3];
  if (size === 9)  return [3, 3];
  if (size === 16) return [4, 4];
  return [3, 3];
}

// ─── Solver (backtracking + MRV heuristic) ────────────────────────────────────
// Works on a MUTABLE grid; caller is responsible for passing a clone when needed.

function solveGrid(grid, size, rng, limit = 1) {
  const [br, bc] = boxDims(size);
  const numBoxCols = size / bc;

  // Build bitmask state from whatever is already in the grid
  const rows  = Array(size).fill(0);
  const cols  = Array(size).fill(0);
  const boxes = Array(size).fill(0);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = grid[r][c];
      if (!v) continue;
      const bit = 1 << (v - 1);
      const bId = Math.floor(r / br) * numBoxCols + Math.floor(c / bc);
      rows[r] |= bit; cols[c] |= bit; boxes[bId] |= bit;
    }
  }

  let found = 0;

  function bt() {
    // MRV: pick the empty cell with the fewest legal candidates
    let bestR = -1, bestC = -1, bestCnt = size + 1;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] !== 0) continue;
        const bId = Math.floor(r / br) * numBoxCols + Math.floor(c / bc);
        const mask = rows[r] | cols[c] | boxes[bId];
        let cnt = 0;
        for (let n = 1; n <= size; n++) if (!(mask & (1 << (n - 1)))) cnt++;
        if (cnt === 0) return false; // dead end
        if (cnt < bestCnt) { bestCnt = cnt; bestR = r; bestC = c; }
      }
    }
    if (bestR === -1) { found++; return found >= limit; } // all cells filled

    const r = bestR, c = bestC;
    const bId = Math.floor(r / br) * numBoxCols + Math.floor(c / bc);
    const mask = rows[r] | cols[c] | boxes[bId];
    const candidates = [];
    for (let n = 1; n <= size; n++) if (!(mask & (1 << (n - 1)))) candidates.push(n);

    // Randomize candidate order when rng provided (solution generation);
    // leave in order for solution counting (deterministic = faster).
    if (rng) shuffleWith(candidates, rng);

    for (const n of candidates) {
      const bit = 1 << (n - 1);
      grid[r][c] = n;
      rows[r] |= bit; cols[c] |= bit; boxes[bId] |= bit;
      if (bt()) return true;
      grid[r][c] = 0;
      rows[r] &= ~bit; cols[c] &= ~bit; boxes[bId] &= ~bit;
    }
    return false;
  }

  bt();
  return found;
}

// Count distinct solutions (fast — exits at `limit`, default 2).
// Always passes a deep clone to the solver so the original is unchanged.
function countSolutions(grid, size, limit = 2) {
  const clone = cloneGrid(grid); // ← explicit deep clone, not spread
  return solveGrid(clone, size, null, limit);
}

// ─── Sudoku-preserving transformations ────────────────────────────────────────
// These operations keep every row/col/box constraint satisfied:
//   digit permutation, row swaps within a band, col swaps within a stack, transpose.

function applyTransformation(puzzle, size, rng) {
  const [br, bc] = boxDims(size);
  const numRowBands  = size / br;
  const numColStacks = size / bc;

  // 1. Digit permutation: map digit d → dMap[d]
  const digPerm = shuffleWith(Array.from({ length: size }, (_, i) => i + 1), rng);
  const dMap = [0, ...digPerm]; // index 0 unused; dMap[1..size] = new digit

  // 2. Row permutation: independently shuffle rows within each band
  const rowPerm = [];
  for (let b = 0; b < numRowBands; b++) {
    const band = shuffleWith(Array.from({ length: br }, (_, i) => b * br + i), rng);
    rowPerm.push(...band);
  }

  // 3. Col permutation: independently shuffle cols within each stack
  const colPerm = [];
  for (let s = 0; s < numColStacks; s++) {
    const stack = shuffleWith(Array.from({ length: bc }, (_, i) => s * bc + i), rng);
    colPerm.push(...stack);
  }

  // 4. Optional transpose (mirrors across diagonal — valid symmetry for square grids)
  const doTranspose = rng() < 0.5;

  function transformValues(grid) {
    // Apply row+col permutation and digit remap into a fresh 2-D array
    let g = rowPerm.map(r => colPerm.map(c => {
      const v = grid[r][c];
      return v === 0 ? 0 : dMap[v];
    }));
    if (doTranspose) {
      g = Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) => g[c][r])
      );
    }
    return g;
  }

  function transformBool(grid) {
    let g = rowPerm.map(r => colPerm.map(c => grid[r][c]));
    if (doTranspose) {
      g = Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) => g[c][r])
      );
    }
    return g;
  }

  return {
    values:   transformValues(puzzle.values),
    solution: transformValues(puzzle.solution),
    isClue:   transformBool(puzzle.isClue),
  };
}

// ─── Cell removal (zone-interleaved for spatial balance) ──────────────────────

function balancedRemovalOrder(size, rng) {
  const [br, bc] = boxDims(size);
  const numBoxes = (size / br) * (size / bc);
  const zones = Array.from({ length: numBoxes }, () => []);
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      zones[Math.floor(r / br) * (size / bc) + Math.floor(c / bc)].push([r, c]);
  zones.forEach(z => shuffleWith(z, rng));
  const zoneOrder = shuffleWith(Array.from({ length: numBoxes }, (_, i) => i), rng);
  const result = [];
  const maxLen = Math.max(...zones.map(z => z.length));
  for (let i = 0; i < maxLen; i++)
    for (const zi of zoneOrder)
      if (i < zones[zi].length) result.push(zones[zi][i]);
  return result;
}

// ─── Clue targets (givens remaining after removal) ────────────────────────────

const CLUE_TARGETS = {
  easy:   { 4: 8,  6: 18, 9: 50 },
  medium: { 4: 6,  6: 14, 9: 42 },
  hard:   { 4: 5,  6: 10, 9: 34 },
  expert: { 4: 4,  6: 8,  9: 27 },
  evil:   { 4: 4,  6: 7,  9: 22 },
};

// ─── Single puzzle generator ──────────────────────────────────────────────────

function generateOnePuzzle(size, difficulty, seed) {
  // Each puzzle gets a unique seed → fully independent random sequence.
  const rng = mulberry32(seed);

  for (let attempt = 0; attempt < 30; attempt++) {
    // ── Step 1: random complete solution ──────────────────────────────────
    // IMPORTANT: each row is a NEW independent array (not Array.fill(sharedRow))
    const grid = Array.from({ length: size }, () => Array(size).fill(0));
    solveGrid(grid, size, rng, 1); // fills grid in-place with random solution
    const solution = cloneGrid(grid); // deep clone — rows are independent

    // ── Step 2: dig out cells (uniqueness-checked) ────────────────────────
    const baseTarget = CLUE_TARGETS[difficulty]?.[size] ?? Math.round(size * size * 0.45);
    // Small ±1 jitter so adjacent levels feel different
    const jitter = Math.floor(rng() * 3) - 1; // -1, 0, or +1
    const target = Math.max(size === 4 ? 4 : Math.ceil(size / 2), baseTarget + jitter);

    // values starts as a full deep clone of solution; cells are zeroed one by one
    const values = cloneGrid(solution);
    // isClue: each row is an independent boolean array
    const isClue = Array.from({ length: size }, () => Array(size).fill(true));
    let removed = 0;

    for (const [r, c] of balancedRemovalOrder(size, rng)) {
      if (removed >= size * size - target) break;
      const saved = values[r][c];
      values[r][c] = 0;
      // countSolutions internally clones values before solving — no mutation
      if (countSolutions(values, size) !== 1) {
        values[r][c] = saved; // restore: removing this cell breaks uniqueness
        continue;
      }
      isClue[r][c] = false;
      removed++;
    }

    // Must have removed at least 80% of the intended cells; otherwise try again
    const minRemoval = Math.floor((size * size - target) * 0.8);
    if (removed < minRemoval) continue;

    // ── Step 3: structural variety via Sudoku-preserving transformation ───
    // Returns a brand-new object with independent array copies — no shared refs
    return applyTransformation({ values, solution, isClue }, size, rng);
  }

  // Recursion safety (should not normally be reached)
  return generateOnePuzzle(size, difficulty, seed + 1);
}

// ─── Pool generator with deduplication ───────────────────────────────────────

function fingerprint(values) {
  return values.map(r => r.join(',')).join('|');
}

function generatePool(size, difficulty, count) {
  const pool = [];
  const seen = new Set();
  const baseSeed = (Date.now() ^ (size * 999983)) >>> 0;

  let attempts = 0;
  while (pool.length < count && attempts < count * 15) {
    // Give each attempt a UNIQUE seed: base XOR (attempt × large prime)
    const seed = (baseSeed ^ (attempts * 1000003)) >>> 0;
    attempts++;

    const puzzle = generateOnePuzzle(size, difficulty, seed);
    const fp = fingerprint(puzzle.values);

    if (!seen.has(fp)) {
      seen.add(fp);
      pool.push(puzzle); // puzzle is a fresh object with independent arrays
      process.stdout.write('.');
    }
    // (duplicate fingerprint → silently discard, try again)
  }

  // Rare fallback — still deduplicates
  while (pool.length < count) {
    const seed = (baseSeed ^ ((attempts + pool.length) * 1000033)) >>> 0;
    const puzzle = generateOnePuzzle(size, difficulty, seed);
    const fp = fingerprint(puzzle.values);
    if (!seen.has(fp)) {
      seen.add(fp);
      pool.push(puzzle);
    }
    process.stdout.write('+');
  }

  return pool;
}

// ─── Post-generation validation ───────────────────────────────────────────────

function validatePool(pool, size, label) {
  let errors = 0;

  // 1. No puzzle is fully filled
  for (let i = 0; i < pool.length; i++) {
    const hasEmpty = pool[i].values.some(row => row.some(v => v === 0));
    if (!hasEmpty) {
      console.error(`  ✗ [${label}] puzzle #${i} is fully filled (no empty cells)!`);
      errors++;
    }
  }

  // 2. All puzzles are unique
  const fps = pool.map(p => fingerprint(p.values));
  const unique = new Set(fps);
  if (unique.size !== pool.length) {
    console.error(`  ✗ [${label}] ${pool.length - unique.size} duplicate(s) found!`);
    errors++;
  }

  // 3. Clue count sanity — no row/col is entirely given
  for (let i = 0; i < pool.length; i++) {
    const clueCount = pool[i].isClue.reduce((s, row) => s + row.filter(Boolean).length, 0);
    if (clueCount === size * size) {
      console.error(`  ✗ [${label}] puzzle #${i}: isClue all true (no blanks)`);
      errors++;
    }
  }

  // Stats
  const clueCounts = pool.map(p => p.isClue.reduce((s, row) => s + row.filter(Boolean).length, 0));
  const min = Math.min(...clueCounts), max = Math.max(...clueCounts);
  const avg = (clueCounts.reduce((a, b) => a + b, 0) / clueCounts.length).toFixed(1);

  if (errors === 0) {
    console.log(`  ✓ [${label}] all ${pool.length} puzzles valid — clues: ${min}–${max} (avg ${avg})`);
  } else {
    console.error(`  ✗ [${label}] ${errors} validation error(s)!`);
    process.exitCode = 1;
  }
}

// ─── Generation plan ──────────────────────────────────────────────────────────

const PUZZLES_PER_POOL = 30;

const PLAN = {
  mini: [
    { size: 4, difficulties: ['easy', 'medium', 'hard', 'expert', 'evil'] },
    { size: 6, difficulties: ['easy', 'medium', 'hard', 'expert', 'evil'] },
  ],
  classic: [
    { size: 9, difficulties: ['easy', 'medium', 'hard', 'expert', 'evil'] },
  ],
  image: [
    { size: 6, difficulties: ['easy', 'medium', 'hard', 'expert', 'evil'] },
    { size: 9, difficulties: ['easy', 'medium', 'hard', 'expert', 'evil'] },
  ],
};

function generateForMode(plan) {
  const result = {};
  for (const { size, difficulties } of plan) {
    result[size] = {};
    for (const diff of difficulties) {
      process.stdout.write(`  ${size}×${size} ${diff}: `);
      const pool = generatePool(size, diff, PUZZLES_PER_POOL);
      process.stdout.write(` (${pool.length})\n`);
      validatePool(pool, size, `${size}×${size} ${diff}`);
      result[size][diff] = pool;
    }
  }
  return result;
}

// ─── File writers ─────────────────────────────────────────────────────────────

function writeDataFile(modeName, data) {
  const outPath = path.join(OUT_DIR, `${modeName}.ts`);
  const json = JSON.stringify(data, null, 2);
  const ts = `// AUTO-GENERATED — do not edit by hand. Run: npm run generate
// Generated: ${new Date().toISOString()}
// ${PUZZLES_PER_POOL} puzzles per pool, all uniqueness-verified, no duplicates.
import type { PuzzleSet } from './types';

const data: PuzzleSet = ${json};

export default data;
`;
  fs.writeFileSync(outPath, ts, 'utf8');
  console.log(`  Written → ${outPath}\n`);
}

function writeTypesFile() {
  const outPath = path.join(OUT_DIR, 'types.ts');
  fs.writeFileSync(outPath, `// Shared types for pre-generated puzzle data
export interface PuzzleData {
  values: number[][];   // 0 = empty
  solution: number[][]; // complete solution
  isClue: boolean[][];  // true = given cell (shown to player)
}

// PuzzleSet[size][difficulty] = PuzzleData[]
export type PuzzleSet = Record<number, Record<string, PuzzleData[]>>;
`, 'utf8');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

writeTypesFile();

for (const [modeName, plan] of Object.entries(PLAN)) {
  console.log(`\n═══ Generating ${modeName} ═══`);
  const data = generateForMode(plan);
  writeDataFile(modeName, data);
}

console.log('Done!');
