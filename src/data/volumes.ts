import type { GameMode, GridSize, Difficulty } from '../types';

export interface LevelDef {
  id: number;
  mode: GameMode;
  size: GridSize;
  difficulty: Difficulty;
  label: string;
}

export interface VolumeDef {
  id: string;
  title: string;
  levels: LevelDef[];
}

function generateLevels(startId: number, count: number, mode: GameMode, size: GridSize, difficulty: Difficulty, label: string): LevelDef[] {
  return Array.from({ length: count }, (_, i) => ({
    id: startId + i,
    mode,
    size,
    difficulty,
    label: `${label} ${size}x${size}`
  }));
}

export function getVolumesForMode(mode: string): VolumeDef[] {
  // Custom Volumes for Mini Mode
  if (mode === 'mini') {
    return [
      {
        id: 'mini-very-easy',
        title: 'Very Easy',
        levels: generateLevels(1, 20, 'mini', 4, 'easy', 'Level')
      },
      {
        id: 'mini-easy',
        title: 'Easy',
        levels: generateLevels(21, 20, 'mini', 6, 'easy', 'Level')
      },
      {
        id: 'mini-medium',
        title: 'Medium',
        levels: [
          ...generateLevels(41, 10, 'mini', 4, 'medium', 'Level'),
          ...generateLevels(51, 10, 'mini', 6, 'medium', 'Level')
        ]
      },
      {
        id: 'mini-hard',
        title: 'Hard',
        levels: [
          ...generateLevels(61, 10, 'mini', 4, 'hard', 'Level'),
          ...generateLevels(71, 10, 'mini', 6, 'hard', 'Level')
        ]
      },
      {
        id: 'mini-devil',
        title: 'Devil',
        levels: [
          ...generateLevels(81, 10, 'mini', 4, 'evil', 'Level'),
          ...generateLevels(91, 10, 'mini', 6, 'evil', 'Level')
        ]
      }
    ];
  }

  // Custom Volumes for Classic Mode
  if (mode === 'classic') {
    return [
      {
        id: 'classic-very-easy',
        title: 'Very Easy',
        levels: generateLevels(1, 20, 'classic', 9, 'easy', 'Level')
      },
      {
        id: 'classic-easy',
        title: 'Easy',
        levels: generateLevels(21, 20, 'classic', 9, 'medium', 'Level')
      },
      {
        id: 'classic-medium',
        title: 'Medium',
        levels: generateLevels(41, 20, 'classic', 9, 'hard', 'Level')
      },
      {
        id: 'classic-hard',
        title: 'Hard',
        levels: generateLevels(61, 20, 'classic', 9, 'expert', 'Level')
      },
      {
        id: 'classic-devil',
        title: 'Devil',
        levels: generateLevels(81, 20, 'classic', 9, 'evil', 'Level')
      }
    ];
  }

  // Custom Volumes for Monster Mode
  if (mode === 'monster') {
    return [
      {
        id: 'monster-very-easy',
        title: 'Very Easy',
        levels: generateLevels(1, 20, 'monster', 16, 'easy', 'Level')
      },
      {
        id: 'monster-easy',
        title: 'Easy',
        levels: generateLevels(21, 20, 'monster', 16, 'medium', 'Level')
      },
      {
        id: 'monster-medium',
        title: 'Medium',
        levels: generateLevels(41, 20, 'monster', 16, 'hard', 'Level')
      },
      {
        id: 'monster-hard',
        title: 'Hard',
        levels: generateLevels(61, 20, 'monster', 16, 'expert', 'Level')
      },
      {
        id: 'monster-devil',
        title: 'Devil',
        levels: generateLevels(81, 20, 'monster', 16, 'evil', 'Level')
      }
    ];
  }

  // Custom Volumes for Killer Mode
  if (mode === 'killer') {
    return [
      {
        id: 'killer-very-easy',
        title: 'Very Easy',
        levels: generateLevels(1, 20, 'killer', 9, 'easy', 'Level')
      },
      {
        id: 'killer-easy',
        title: 'Easy',
        levels: generateLevels(21, 20, 'killer', 9, 'medium', 'Level')
      },
      {
        id: 'killer-medium',
        title: 'Medium',
        levels: generateLevels(41, 20, 'killer', 9, 'hard', 'Level')
      },
      {
        id: 'killer-hard',
        title: 'Hard',
        levels: generateLevels(61, 20, 'killer', 9, 'expert', 'Level')
      },
      {
        id: 'killer-devil',
        title: 'Devil',
        levels: generateLevels(81, 20, 'killer', 9, 'evil', 'Level')
      }
    ];
  }

  // Custom Volumes for Irregular Mode
  if (mode === 'irregular') {
    return [
      {
        id: 'irregular-very-easy',
        title: 'Very Easy',
        levels: generateLevels(1, 20, 'irregular', 9, 'easy', 'Level')
      },
      {
        id: 'irregular-easy',
        title: 'Easy',
        levels: generateLevels(21, 20, 'irregular', 9, 'medium', 'Level')
      },
      {
        id: 'irregular-medium',
        title: 'Medium',
        levels: generateLevels(41, 20, 'irregular', 9, 'hard', 'Level')
      },
      {
        id: 'irregular-hard',
        title: 'Hard',
        levels: generateLevels(61, 20, 'irregular', 9, 'expert', 'Level')
      },
      {
        id: 'irregular-devil',
        title: 'Devil',
        levels: generateLevels(81, 20, 'irregular', 9, 'evil', 'Level')
      }
    ];
  }

  // Common sizes based on mode
  let size: GridSize = 9;
  if (mode === 'image') size = 6;

  if (mode === 'triangle' || mode === 'cubic') {
    return [
      {
        id: 'vol-1',
        title: 'Volume 1',
        levels: generateLevels(1, 20, mode as GameMode, size, 'easy', 'Level')
      },
      {
        id: 'vol-2',
        title: 'Volume 2',
        levels: generateLevels(21, 20, mode as GameMode, size, 'medium', 'Level')
      },
      {
        id: 'vol-3',
        title: 'Volume 3',
        levels: generateLevels(41, 20, mode as GameMode, size, 'hard', 'Level')
      }
    ];
  }

  return [
    {
      id: 'very-easy',
      title: 'Very Easy Starters',
      levels: generateLevels(1, 20, mode as GameMode, size, 'easy', 'Level')
    },
    {
      id: 'easy',
      title: 'Easy Starters',
      levels: generateLevels(21, 20, mode as GameMode, size, 'easy', 'Level')
    },
    {
      id: 'medium',
      title: 'Medium Puzzles',
      levels: generateLevels(41, 30, mode as GameMode, size, 'medium', 'Level')
    },
    {
      id: 'hard',
      title: 'Hard Challenges',
      levels: generateLevels(71, 30, mode as GameMode, size, 'hard', 'Level')
    }
  ];
}
