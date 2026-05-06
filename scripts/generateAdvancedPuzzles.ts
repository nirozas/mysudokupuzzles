import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateGrid } from '../src/utils/sudokuGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'src', 'data', 'puzzles');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function fingerprint(values) {
  return values.map(r => r.join(',')).join('|');
}

const PUZZLES_PER_POOL = 30;

function generatePool(size, difficulty, mode, count) {
  const pool = [];
  const seen = new Set();
  let attempts = 0;

  while (pool.length < count && attempts < count * 15) {
    attempts++;
    // generateGrid returns GridState: { size, values, solution, isClue, irregularRegions, killerCages, ... }
    const gridState = generateGrid(size, difficulty, mode);
    
    // For killer sudoku without givens, fingerprint the cages, 
    // but here we do have givens according to the generator logic, so we fingerprint values.
    const fp = fingerprint(gridState.values) + (gridState.irregularRegions ? '|irreg' : '') + (gridState.killerCages ? '|killer' : '');
    
    if (!seen.has(fp)) {
      seen.add(fp);
      
      const puzzle = {
        values: gridState.values,
        solution: gridState.solution,
        isClue: gridState.isClue,
      };
      if (gridState.irregularRegions) puzzle.irregularRegions = gridState.irregularRegions;
      if (gridState.killerCages) puzzle.killerCages = gridState.killerCages;
      
      pool.push(puzzle);
      process.stdout.write('.');
    }
  }

  // Fallback if dedup eats too many
  while (pool.length < count) {
    const gridState = generateGrid(size, difficulty, mode);
    const puzzle = {
      values: gridState.values,
      solution: gridState.solution,
      isClue: gridState.isClue,
    };
    if (gridState.irregularRegions) puzzle.irregularRegions = gridState.irregularRegions;
    if (gridState.killerCages) puzzle.killerCages = gridState.killerCages;
    pool.push(puzzle);
    process.stdout.write('+');
  }

  return pool;
}

const PLAN = {
  irregular: [
    { size: 9, difficulties: ['easy', 'medium', 'hard', 'expert', 'evil'] },
  ],
  killer: [
    { size: 9, difficulties: ['easy', 'medium', 'hard', 'expert', 'evil'] },
  ],
};

function writeDataFile(modeName, data) {
  const outPath = path.join(OUT_DIR, `${modeName}.ts`);
  const json = JSON.stringify(data, null, 2);
  const ts = `// AUTO-GENERATED — do not edit by hand. Run: npm run generate
// Generated: ${new Date().toISOString()}
import type { PuzzleSet } from './types';

const data: PuzzleSet = ${json} as any;

export default data;
`;
  fs.writeFileSync(outPath, ts, 'utf8');
  console.log(`  Written → ${outPath}\n`);
}

for (const [modeName, plan] of Object.entries(PLAN)) {
  console.log(`\n═══ Generating ${modeName} ═══`);
  const data = {};
  for (const { size, difficulties } of plan) {
    data[size] = {};
    for (const diff of difficulties) {
      process.stdout.write(`  ${size}×${size} ${diff}: `);
      const pool = generatePool(size, diff, modeName, PUZZLES_PER_POOL);
      process.stdout.write(` (${pool.length})\n`);
      data[size][diff] = pool;
    }
  }
  writeDataFile(modeName, data);
}

console.log('Done!');
