/**
 * generatePuzzles.mjs
 * Run with: node scripts/generatePuzzles.mjs
 * Generates static puzzle data for mini, classic, and image modes.
 * Output: src/data/puzzles/{mini,classic,image}.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'src', 'data', 'puzzles');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Core generator (self-contained) ─────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function boxDims(size) {
  if (size === 4) return [2, 2];
  if (size === 6) return [2, 3];
  if (size === 9) return [3, 3];
  if (size === 16) return [4, 4];
  return [3, 3];
}

function solveOptimized(grid, size, state, randomize = false, limitSolutions = 1, nodeLimit = 100000, isDiagonal = false) {
  let solutionsFound = 0;
  let nodesVisited = 0;
  const [br, bc] = boxDims(size);

  function findMRV() {
    let minCandidates = size + 1;
    let bestPos = null;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) {
          const boxId = Math.floor(r / br) * (size / bc) + Math.floor(c / bc);
          let mask = state.rows[r] | state.cols[c] | state.boxes[boxId];
          if (isDiagonal) {
            if (r === c) mask |= state.diag1;
            if (r + c === size - 1) mask |= state.diag2;
          }
          let count = 0;
          for (let n = 1; n <= size; n++) if (!(mask & (1 << (n - 1)))) count++;
          if (count < minCandidates) { minCandidates = count; bestPos = [r, c]; if (count === 0) return { bestPos, minCandidates: 0 }; }
        }
      }
    }
    return { bestPos, minCandidates };
  }

  function backtrack() {
    nodesVisited++;
    if (nodesVisited > nodeLimit) return true;
    const { bestPos, minCandidates } = findMRV();
    if (!bestPos) { solutionsFound++; return solutionsFound >= limitSolutions; }
    if (minCandidates === 0) return false;
    const [r, c] = bestPos;
    const [br2, bc2] = boxDims(size);
    const boxId = Math.floor(r / br2) * (size / bc2) + Math.floor(c / bc2);
    let mask = state.rows[r] | state.cols[c] | state.boxes[boxId];
    if (isDiagonal) { if (r === c) mask |= state.diag1; if (r + c === size - 1) mask |= state.diag2; }
    const nums = [];
    for (let n = 1; n <= size; n++) if (!(mask & (1 << (n - 1)))) nums.push(n);
    if (randomize) shuffle(nums);
    for (const n of nums) {
      const bit = 1 << (n - 1);
      grid[r][c] = n;
      state.rows[r] |= bit; state.cols[c] |= bit; state.boxes[boxId] |= bit;
      if (isDiagonal) { if (r === c) state.diag1 |= bit; if (r + c === size - 1) state.diag2 |= bit; }
      if (backtrack()) return true;
      grid[r][c] = 0;
      state.rows[r] &= ~bit; state.cols[c] &= ~bit; state.boxes[boxId] &= ~bit;
      if (isDiagonal) { if (r === c) state.diag1 &= ~bit; if (r + c === size - 1) state.diag2 &= ~bit; }
    }
    return false;
  }
  backtrack();
  return solutionsFound;
}

function countSolutions(grid, size, limit = 2) {
  const [br, bc] = boxDims(size);
  const rows = Array(size).fill(0);
  const cols = Array(size).fill(0);
  const boxes = Array(size).fill(0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = grid[r][c];
      if (!v) continue;
      const bit = 1 << (v - 1);
      rows[r] |= bit; cols[c] |= bit;
      boxes[Math.floor(r / br) * (size / bc) + Math.floor(c / bc)] |= bit;
    }
  }
  let found = 0;
  function bt() {
    if (found >= limit) return;
    let bestR = -1, bestC = -1, bestCnt = size + 1;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] !== 0) continue;
        const boxId = Math.floor(r / br) * (size / bc) + Math.floor(c / bc);
        let mask = rows[r] | cols[c] | boxes[boxId];
        let cnt = 0;
        for (let n = 1; n <= size; n++) if (!(mask & (1 << (n - 1)))) cnt++;
        if (cnt < bestCnt) { bestCnt = cnt; bestR = r; bestC = c; }
        if (cnt === 0) return;
      }
    }
    if (bestR === -1) { found++; return; }
    const r = bestR, c = bestC;
    const boxId = Math.floor(r / br) * (size / bc) + Math.floor(c / bc);
    for (let n = 1; n <= size; n++) {
      const bit = 1 << (n - 1);
      const mask = rows[r] | cols[c] | boxes[boxId];
      if (mask & bit) continue;
      grid[r][c] = n; rows[r] |= bit; cols[c] |= bit; boxes[boxId] |= bit;
      bt();
      grid[r][c] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[boxId] &= ~bit;
      if (found >= limit) return;
    }
  }
  bt();
  return found;
}

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

const CLUE_TARGETS = {
  easy:   { 4: 8,  6: 18, 9: 50, 16: 150 },
  medium: { 4: 6,  6: 14, 9: 42, 16: 128 },
  hard:   { 4: 4,  6: 10, 9: 34, 16: 108 },
  expert: { 4: 4,  6: 8,  9: 27, 16: 92  },
  evil:   { 4: 4,  6: 7,  9: 22, 16: 76  },
};

function generatePuzzle(size, difficulty) {
  let attempts = 0;
  while (attempts < 10) {
    attempts++;
    const grid = Array.from({ length: size }, () => Array(size).fill(0));
    const [br, bc] = boxDims(size);
    const state = {
      rows: Array(size).fill(0), cols: Array(size).fill(0),
      boxes: Array(size).fill(0), diag1: 0, diag2: 0
    };
    
    // Ensure we start with a random complete grid
    solveOptimized(grid, size, state, true, 1, 100000);
    const solution = grid.map(r => [...r]);

    const baseTarget = CLUE_TARGETS[difficulty][size] || Math.round(size * size * 0.45);
    const jitter = Math.floor(Math.random() * 3) - 1; // -1..+1 for smaller sizes
    const target = Math.max(size === 4 ? 4 : size, baseTarget + jitter);

    const cells = balancedRemovalOrder(size);
    const values = solution.map(r => [...r]);
    const isClue = Array.from({ length: size }, () => Array(size).fill(true));
    let dug = 0;

    for (const [r, c] of cells) {
      if (dug >= size * size - target) break;
      const saved = values[r][c];
      values[r][c] = 0;
      if (countSolutions(values.map(row => [...row]), size) !== 1) {
        values[r][c] = saved;
        continue;
      }
      isClue[r][c] = false;
      dug++;
    }

    // Ensure we actually removed enough cells for it to be a puzzle
    // For size 4, we want at least size*size/2 removed for easy, more for hard
    const minDug = Math.floor((size * size - target) * 0.8);
    if (dug >= minDug && dug > 0) {
      return { values, solution, isClue };
    }
    // Otherwise try again to get a better puzzle
  }
  
  // Fallback if we really can't dig enough (shouldn't happen with these targets)
  return generatePuzzle(size, difficulty); 
}

// ─── Generation plan ──────────────────────────────────────────────────────────

const PUZZLES_PER_VOLUME = 15; // per difficulty per size

const PLAN = {
  mini: [
    { size: 4, difficulties: ['easy', 'medium', 'hard', 'evil'] },
    { size: 6, difficulties: ['easy', 'medium', 'hard', 'evil'] },
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
      process.stdout.write(`  ${size}x${size} ${diff}: `);
      result[size][diff] = [];
      for (let i = 0; i < PUZZLES_PER_VOLUME; i++) {
        const puzzle = generatePuzzle(size, diff);
        result[size][diff].push(puzzle);
        process.stdout.write('.');
      }
      process.stdout.write(' done\n');
    }
  }
  return result;
}

function writeDataFile(modeName, data) {
  const outPath = path.join(OUT_DIR, `${modeName}.ts`);
  const json = JSON.stringify(data, null, 2);
  const content = `// AUTO-GENERATED — do not edit by hand. Run: node scripts/generatePuzzles.mjs
// Generated: ${new Date().toISOString()}
import type { PuzzleSet } from './types';

const data: PuzzleSet = ${json};

export default data;
`;
  fs.writeFileSync(outPath, content, 'utf8');
  console.log(`  Written: ${outPath}`);
}

// ─── Types file ───────────────────────────────────────────────────────────────

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
