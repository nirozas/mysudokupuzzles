/**
 * Loads a pre-generated puzzle from the static data files.
 * Returns null if the mode uses on-demand generation.
 */
import type { GridState } from '../../types';
import type { PuzzleData } from './types';

// Lazy imports — Vite will bundle only what's used
const loaders: Record<string, () => Promise<{ default: any }>> = {
  mini:    () => import('./mini'),
  classic: () => import('./classic'),
  image:   () => import('./image'),
};

// Map volume difficulty label → data key
const VOLUME_DIFF_MAP: Record<string, Record<string, string>> = {
  mini: {
    'mini-very-easy': 'easy',
    'mini-easy':      'easy',
    'mini-medium':    'medium',
    'mini-hard':      'hard',
    'mini-devil':     'evil',
  },
  classic: {
    'classic-very-easy': 'easy',
    'classic-easy':      'medium',
    'classic-medium':    'hard',
    'classic-hard':      'expert',
    'classic-devil':     'evil',
  },
  image: {
    'image-very-easy':    'easy',
    'image-easy':         'medium',
    'image-medium':       'hard',
    'image-hard':         'expert',
    'image-devil':        'evil',
    'image-very-easy-9x9':'easy',
    'image-easy-9x9':     'medium',
    'image-medium-9x9':   'hard',
    'image-hard-9x9':     'expert',
    'image-devil-9x9':    'evil',
  },
};

// Volume ID → grid size
const VOLUME_SIZE_MAP: Record<string, number> = {
  'mini-very-easy': 4,
  'mini-easy':      6,
  'mini-medium':    4, // mixed: id 41-50=4, 51-60=6
  'mini-hard':      4,
  'mini-devil':     4,
  'classic-very-easy': 9,
  'classic-easy':      9,
  'classic-medium':    9,
  'classic-hard':      9,
  'classic-devil':     9,
  'image-very-easy':   6,
  'image-easy':        6,
  'image-medium':      6,
  'image-hard':        6,
  'image-devil':       6,
  'image-very-easy-9x9': 9,
  'image-easy-9x9':      9,
  'image-medium-9x9':    9,
  'image-hard-9x9':      9,
  'image-devil-9x9':     9,
};

function getModeKey(volId: string): string | null {
  if (volId.startsWith('mini'))    return 'mini';
  if (volId.startsWith('classic')) return 'classic';
  if (volId.startsWith('image'))   return 'image';
  return null;
}

function puzzleToGridState(p: PuzzleData): GridState {
  const size = p.values.length;
  return {
    size,
    values: p.values.map(r => [...r]),
    solution: p.solution.map(r => [...r]),
    isClue: p.isClue.map(r => [...r]),
    pencilMarks: Array.from({ length: size }, () =>
      Array.from({ length: size }, () => new Set<number>())
    ),
  };
}

/**
 * Returns a pre-generated GridState or null (fall through to on-demand).
 * levelId is 1-based.
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

  const diffMap = VOLUME_DIFF_MAP[modeKey];
  if (!diffMap) return null;

  const diff = diffMap[volId];
  if (!diff) return null;

  // Determine actual size
  let actualSize = VOLUME_SIZE_MAP[volId] ?? size;

  // Mini medium/hard/devil have mixed sizes based on levelId
  if (volId === 'mini-medium') {
    actualSize = levelId <= 10 ? 4 : 6;
  } else if (volId === 'mini-hard') {
    actualSize = levelId <= 10 ? 4 : 6;
  } else if (volId === 'mini-devil') {
    actualSize = levelId <= 10 ? 4 : 6;
  }

  const pool: PuzzleData[] | undefined = data[actualSize]?.[diff];
  if (!pool || pool.length === 0) return null;

  // Deterministically pick puzzle by levelId (mod pool length for variety)
  const idx = (levelId - 1) % pool.length;
  return puzzleToGridState(pool[idx]);
}

export function isPregenMode(volId: string): boolean {
  return getModeKey(volId) !== null;
}
