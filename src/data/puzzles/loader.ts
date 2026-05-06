/**
 * Loads a pre-generated puzzle from the static data files.
 * Returns null if the mode uses on-demand generation.
 *
 * Selection strategy: randomly pick from the pool each time startGame is called.
 * This means two plays of "Level 3 Easy" may get different puzzles from the pool —
 * all guaranteed valid and unique — giving a fresh feel without on-demand generation.
 */
import type { GridState } from '../../types';
import type { PuzzleData } from './types';

// Lazy imports — Vite bundles only what's used
const loaders: Record<string, () => Promise<{ default: any }>> = {
  mini:      () => import('./mini'),
  classic:   () => import('./classic'),
  image:     () => import('./image'),
  irregular: () => import('./irregular'),
  killer:    () => import('./killer'),
  monster:   () => import('./monster'),
};

// Maps volumeId → difficulty key used in the data files
const VOLUME_DIFF_MAP: Record<string, string> = {
  // Mini
  'mini-very-easy': 'easy',
  'mini-easy':      'medium',
  'mini-medium':    'hard',
  'mini-hard':      'expert',
  'mini-devil':     'evil',
  // Classic
  'classic-very-easy': 'easy',
  'classic-easy':      'medium',
  'classic-medium':    'hard',
  'classic-hard':      'expert',
  'classic-devil':     'evil',
  // Image 6×6
  'image-very-easy':   'easy',
  'image-easy':        'medium',
  'image-medium':      'hard',
  'image-hard':        'expert',
  'image-devil':       'evil',
  // Image 9×9
  'image-very-easy-9x9': 'easy',
  'image-easy-9x9':      'medium',
  'image-medium-9x9':    'hard',
  'image-hard-9x9':      'expert',
  'image-devil-9x9':     'evil',
  // Irregular
  'irregular-very-easy': 'easy',
  'irregular-easy':      'medium',
  'irregular-medium':    'hard',
  'irregular-hard':      'expert',
  'irregular-devil':     'evil',
  // Killer
  'killer-very-easy': 'easy',
  'killer-easy':      'medium',
  'killer-medium':    'hard',
  'killer-hard':      'expert',
  'killer-devil':     'evil',
  // Monster
  'monster-very-easy': 'easy',
  'monster-easy':      'medium',
  'monster-medium':    'hard',
  'monster-hard':      'expert',
  'monster-devil':     'evil',
};

// Maps volumeId → grid size
const VOLUME_SIZE_MAP: Record<string, number> = {
  // Mini uses 4×4 for very-easy, 6×6 for easy, mixed for medium/hard/devil
  'mini-very-easy': 4,
  'mini-easy':      6,
  'mini-medium':    6,   // all 6×6 to avoid confusion
  'mini-hard':      6,
  'mini-devil':     6,
  // Classic 9×9
  'classic-very-easy': 9,
  'classic-easy':      9,
  'classic-medium':    9,
  'classic-hard':      9,
  'classic-devil':     9,
  // Image 6×6
  'image-very-easy':   6,
  'image-easy':        6,
  'image-medium':      6,
  'image-hard':        6,
  'image-devil':       6,
  // Image 9×9
  'image-very-easy-9x9': 9,
  'image-easy-9x9':      9,
  'image-medium-9x9':    9,
  'image-hard-9x9':      9,
  'image-devil-9x9':     9,
  // Irregular 9x9
  'irregular-very-easy': 9,
  'irregular-easy':      9,
  'irregular-medium':    9,
  'irregular-hard':      9,
  'irregular-devil':     9,
  // Killer 9x9
  'killer-very-easy': 9,
  'killer-easy':      9,
  'killer-medium':    9,
  'killer-hard':      9,
  'killer-devil':     9,
  // Monster 16x16
  'monster-very-easy': 16,
  'monster-easy':      16,
  'monster-medium':    16,
  'monster-hard':      16,
  'monster-devil':     16,
};

function getModeKey(volId: string): string | null {
  if (volId.startsWith('mini'))      return 'mini';
  if (volId.startsWith('classic'))   return 'classic';
  if (volId.startsWith('image'))     return 'image';
  if (volId.startsWith('irregular')) return 'irregular';
  if (volId.startsWith('killer'))    return 'killer';
  if (volId.startsWith('monster'))   return 'monster';
  return null;
}

function puzzleToGridState(p: PuzzleData): GridState {
  const size = p.values.length;
  const state: GridState = {
    size,
    values:   p.values.map(r => [...r]),
    solution: p.solution.map(r => [...r]),
    isClue:   p.isClue.map(r => [...r]),
    pencilMarks: Array.from({ length: size }, () =>
      Array.from({ length: size }, () => new Set<number>())
    ),
  };
  
  if (p.irregularRegions) {
    state.irregularRegions = p.irregularRegions.map(r => [...r]);
  }
  
  if (p.killerCages) {
    // structuredClone or JSON parse to deep clone cages
    state.killerCages = JSON.parse(JSON.stringify(p.killerCages));
  }
  
  return state;
}

/**
 * Returns a pre-generated GridState or null (falls through to on-demand).
 * Randomly picks from the 30-puzzle pool so each play feels fresh.
 */
export async function loadPregenPuzzle(
  volId: string,
  levelId: number,
  size: number
): Promise<GridState | null> {
  const modeKey = getModeKey(volId);
  if (!modeKey) return null;

  const loader = loaders[modeKey];
  if (!loader) return null;

  const mod = await loader();
  const data = mod.default;

  const diff = VOLUME_DIFF_MAP[volId];
  if (!diff) return null;

  const actualSize = VOLUME_SIZE_MAP[volId] ?? size;

  const pool: PuzzleData[] | undefined = data[actualSize]?.[diff];
  if (!pool || pool.length === 0) return null;

  const idx = Math.floor(Math.random() * pool.length);
  return puzzleToGridState(pool[idx]);
}

export function isPregenMode(volId: string): boolean {
  return getModeKey(volId) !== null;
}
