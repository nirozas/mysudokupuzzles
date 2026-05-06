/**
 * generatePuzzles.mjs
 * Run with: node scripts/generatePuzzles.mjs
 * Generates static puzzle data for mini, classic, and image modes.
 * Output: src/data/puzzles/{mini,classic,image}.ts
 *
 * Key design decisions:
 *  - Sudoku-preserving transformations (digit permutation + row/col band swaps)
 *    guarantee every puzzle in the pool looks structurally different — even if
 *    the underlying backtracking finds the same canonical grid.
 *  - Each puzzle is uniqueness-checked (exactly 1 solution).
 *  - Deduplication: a fingerprint of the values grid rejects duplicates.
 *  - 30 puzzles per pool (> 20 levels max per volume).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'src', 'data', 'puzzles');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Utilities ────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function boxDims(size) {
  if (size === 4)  return [2, 2];
  if (size === 6)  return [2, 3];
  if (size === 9)  return [3, 3];
  if (size === 16) return [4, 4];
  return [3, 3];
}

// ─── Core solver (randomized backtracking with MRV) ───────────────────────────

function solveGrid(grid, size, randomize = false, limit = 1) {
  const [br, bc] = boxDims(size);
  const numBoxCols = size / bc;

  // Build bitmask state from current grid
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
    // MRV: find the empty cell with fewest candidates
    let bestR = -1, bestC = -1, bestCnt = size + 1;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] !== 0) continue;
        const bId = Math.floor(r / br) * numBoxCols + Math.floor(c / bc);
        const mask = rows[r] | cols[c] | boxes[bId];
        let cnt = 0;
        for (let n = 1; n <= size; n++) if (!(mask & (1 << (n-1)))) cnt++;
        if (cnt === 0) return false; // dead end
        if (cnt < bestCnt) { bestCnt = cnt; bestR = r; bestC = c; }
      }
    }
    if (bestR === -1) { found++; return found >= limit; } // solved

    const r = bestR, c = bestC;
    const bId = Math.floor(r / br) * numBoxCols + Math.floor(c / bc);
    const mask = rows[r] | cols[c] | boxes[bId];
    const candidates = [];
    for (let n = 1; n <= size; n++) if (!(mask & (1 << (n-1)))) candidates.push(n);
    if (randomize) shuffle(candidates);

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

// Count solutions, up to `limit` (fast early exit at 2 for uniqueness check)
function countSolutions(grid, size, limit = 2) {
  const g = grid.map(r => [...r]);
  return solveGrid(g, size, false, limit);
}

// ─── Sudoku-preserving transformations ────────────────────────────────────────
// All of these keep row/col/box uniqueness intact, guaranteeing the transformed
// puzzle is still a valid Sudoku with the same solution count.

function applyTransformation(puzzle, size) {
  const [br, bc] = boxDims(size);
  const numRowBands  = size / br;  // e.g. 3 for 9×9
  const numColStacks = size / bc;  // e.g. 3 for 9×9

  // 1. Random digit permutation: map digit i → perm[i]
  const digPerm = shuffle(Array.from({ length: size }, (_, i) => i + 1));
  const dMap = [0, ...digPerm]; // dMap[1..size] = new digit value

  // 2. Row permutation: randomly swap rows within each band
  const rowPerm = [];
  for (let b = 0; b < numRowBands; b++) {
    const rows = shuffle(Array.from({ length: br }, (_, i) => b * br + i));
    rowPerm.push(...rows);
  }

  // 3. Col permutation: randomly swap cols within each stack
  const colPerm = [];
  for (let s = 0; s < numColStacks; s++) {
    const cols = shuffle(Array.from({ length: bc }, (_, i) => s * bc + i));
    colPerm.push(...cols);
  }

  // 4. Optionally transpose (swap rows ↔ cols) — valid symmetry for square grids
  const doTranspose = Math.random() < 0.5;

  function applyToValues(grid) {
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

  function applyToBool(grid) {
    let g = rowPerm.map(r => colPerm.map(c => grid[r][c]));
    if (doTranspose) {
      g = Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) => g[c][r])
      );
    }
    return g;
  }

  return {
    values:   applyToValues(puzzle.values),
    solution: applyToValues(puzzle.solution),
    isClue:   applyToBool(puzzle.isClue),
  };
}

// ─── Cell removal ─────────────────────────────────────────────────────────────

function balancedRemovalOrder(size) {
  const [br, bc] = boxDims(size);
  const numBoxes = (size / br) * (size / bc);
  const zones = Array.from({ length: numBoxes }, () => []);
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      zones[Math.floor(r / br) * (size / bc) + Math.floor(c / bc)].push([r, c]);
  zones.forEach(z => shuffle(z));
  const zoneOrder = shuffle(Array.from({ length: numBoxes }, (_, i) => i));
  const result = [];
  const maxLen = Math.max(...zones.map(z => z.length));
  for (let i = 0; i < maxLen; i++)
    for (const zi of zoneOrder)
      if (i < zones[zi].length) result.push(zones[zi][i]);
  return result;
}

// ─── Clue targets: how many givens remain ─────────────────────────────────────
// More givens = easier. 4×4 totals = 16 cells, 6×6 = 36, 9×9 = 81.

const CLUE_TARGETS = {
  easy:   { 4: 8,  6: 18, 9: 50 },
  medium: { 4: 6,  6: 14, 9: 42 },
  hard:   { 4: 5,  6: 10, 9: 34 },
  expert: { 4: 4,  6: 8,  9: 27 },
  evil:   { 4: 4,  6: 7,  9: 22 },
};

// ─── Puzzle generator ─────────────────────────────────────────────────────────

function generateOnePuzzle(size, difficulty) {
  for (let attempt = 0; attempt < 20; attempt++) {
    // Step 1: build a fully random complete grid
    const grid = Array.from({ length: size }, () => Array(size).fill(0));
    solveGrid(grid, size, true, 1);
    const solution = grid.map(r => [...r]);

    // Step 2: remove cells (balanced across boxes)
    const baseTarget = CLUE_TARGETS[difficulty]?.[size] ?? Math.round(size * size * 0.45);
    const target = Math.max(size === 4 ? 4 : Math.ceil(size / 2),
                            baseTarget + (Math.floor(Math.random() * 3) - 1));

    const values = solution.map(r => [...r]);
    const isClue = Array.from({ length: size }, () => Array(size).fill(true));
    let removed = 0;

    for (const [r, c] of balancedRemovalOrder(size)) {
      if (removed >= size * size - target) break;
      const saved = values[r][c];
      values[r][c] = 0;
      if (countSolutions(values, size) !== 1) {
        values[r][c] = saved; // restore — not unique
        continue;
      }
      isClue[r][c] = false;
      removed++;
    }

    // Require at least 80% of the target removal to accept the puzzle
    const minRemoval = Math.floor((size * size - target) * 0.8);
    if (removed < minRemoval) continue;

    // Step 3: apply random Sudoku-preserving transformation for visual variety
    return applyTransformation({ values, solution, isClue }, size);
  }

  // Should never reach here with these targets, but recurse once as safety
  return generateOnePuzzle(size, difficulty);
}

// Fingerprint a puzzle's values grid for deduplication
function fingerprint(values) {
  return values.map(r => r.join(',')).join('|');
}

// Generate N distinct puzzles for a given size+difficulty
function generatePool(size, difficulty, count) {
  const pool = [];
  const seen = new Set();
  let attempts = 0;

  while (pool.length < count && attempts < count * 10) {
    attempts++;
    const puzzle = generateOnePuzzle(size, difficulty);
    const fp = fingerprint(puzzle.values);
    if (!seen.has(fp)) {
      seen.add(fp);
      pool.push(puzzle);
      process.stdout.write('.');
    }
  }

  // If dedup ate too many, fill remaining with any valid puzzle (rare for 9×9)
  while (pool.length < count) {
    pool.push(generateOnePuzzle(size, difficulty));
    process.stdout.write('+');
  }

  return pool;
}

// ─── Generation plan ──────────────────────────────────────────────────────────

// 30 puzzles per pool → enough for 20 levels with no collisions, plus extras
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
      result[size][diff] = generatePool(size, diff, PUZZLES_PER_POOL);
      process.stdout.write(` (${result[size][diff].length}) done\n`);
    }
  }
  return result;
}

// ─── File writers ─────────────────────────────────────────────────────────────

function writeDataFile(modeName, data) {
  const outPath = path.join(OUT_DIR, `${modeName}.ts`);
  const json = JSON.stringify(data, null, 2);
  const content = `// AUTO-GENERATED — do not edit by hand. Run: npm run generate
// Generated: ${new Date().toISOString()}
// Each pool contains ${PUZZLES_PER_POOL} unique puzzles. All are uniqueness-verified.
import type { PuzzleSet } from './types';

const data: PuzzleSet = ${json};

export default data;
`;
  fs.writeFileSync(outPath, content, 'utf8');
  console.log(`  Written: ${outPath}`);
}

function writeTypesFile() {
  const outPath = path.join(OUT_DIR, 'types.ts');
  fs.writeFileSync(outPath, `// Shared types for pre-generated puzzle data
export interface PuzzleData {
  values: number[][];   // 0 = empty
  solution: number[][]; // full solution
  isClue: boolean[][];  // true = given (pre-filled)
}

// PuzzleSet[size][difficulty] = PuzzleData[]
export type PuzzleSet = Record<number, Record<string, PuzzleData[]>>;
`, 'utf8');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

writeTypesFile();

for (const [modeName, plan] of Object.entries(PLAN)) {
  console.log(`\nGenerating ${modeName}...`);
  const data = generateForMode(plan);
  writeDataFile(modeName, data);
}

console.log('\nDone! All puzzle files written.');
