import React, { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { GridState } from '../types';
import { getConflicts } from '../utils/sudokuGenerator';
import Cell from './Cell';

interface BoardProps {
  grid: GridState;
  gridIndex?: number;
  isFocused?: boolean;
}

function boxDims(size: number): [number, number] {
  if (size === 4) return [2, 2];
  if (size === 6) return [2, 3];
  if (size === 9) return [3, 3];
  if (size === 16) return [4, 4];
  return [3, 3];
}

const REGION_COLORS = [
  'rgba(99,102,241,0.08)',  // indigo
  'rgba(6,182,212,0.08)',   // cyan
  'rgba(16,185,129,0.08)',  // emerald
  'rgba(245,158,11,0.08)',  // amber
  'rgba(239,68,68,0.08)',   // red
  'rgba(168,85,247,0.08)',  // purple
  'rgba(59,130,246,0.08)',  // blue
  'rgba(236,72,153,0.08)',  // pink
  'rgba(20,184,166,0.08)',  // teal
];

const VIBRANT_REGION_COLORS = [
  '#6366f1', '#06b6d4', '#10b881', '#f59e0b', '#ef4444', '#a855f7', '#3b82f6', '#ec4899', '#14b8a6'
];

const Board: React.FC<BoardProps> = ({ grid, gridIndex = 0, isFocused = true }) => {
  const {
    selectedCell, showErrors, highlightSimilar,
    mode, selectCell, activeGridIndex,
  } = useGameStore();

  const { size, values, isClue, pencilMarks, irregularRegions, killerCages, oddEvenPattern } = grid;
  const [br, bc] = boxDims(size);

  const conflicts = useMemo(() =>
    showErrors ? getConflicts(grid, mode) : new Set<string>(),
    [grid, mode, showErrors]
  );

  const selectedVal = useMemo(() => {
    if (!selectedCell || (gridIndex !== undefined && selectedCell.gridIndex !== gridIndex)) return 0;
    return values[selectedCell.row]?.[selectedCell.col] ?? 0;
  }, [selectedCell, values, gridIndex]);

  // Build cage membership map
  const cageMap = useMemo(() => {
    const map = new Map<string, { cageId: number; isTopLeft: boolean; sum: number; color: string }>();
    if (killerCages) {
      for (const cage of killerCages) {
        const minR = Math.min(...cage.cells.map(([r]) => r));
        const minC = Math.min(...cage.cells.filter(([r]) => r === minR).map(([, c]) => c));
        for (const [r, c] of cage.cells) {
          map.set(`${r}-${c}`, {
            cageId: cage.id,
            isTopLeft: r === minR && c === minC,
            sum: cage.sum,
            color: cage.color ?? '#7c3aed',
          });
        }
      }
    }
    return map;
  }, [killerCages]);

  const selectedCageId = useMemo(() => {
    if (!selectedCell || mode !== 'killer') return null;
    return cageMap.get(`${selectedCell.row}-${selectedCell.col}`)?.cageId ?? null;
  }, [selectedCell, cageMap, mode]);

  const cellSize = useMemo(() => {
    if (size === 4) return 80;
    if (size === 6) return 72;
    if (size === 9) return 58;
    if (size === 16) return 40;
    return 58;
  }, [size]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!isFocused) return;
    selectCell({ row, col, gridIndex });
  }, [selectCell, gridIndex, isFocused]);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.012, delayChildren: 0.05 },
    },
  };

  const isOnDiagonal = (r: number, c: number) => {
    if (mode !== 'diagonal') return false;
    return r === c || r + c === size - 1;
  };

  return (
    <motion.div
      className="sudoku-grid"
      style={{
        gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${size}, ${cellSize}px)`,
        width: `${size * cellSize + 4}px`,
        opacity: isFocused ? 1 : 0.45,
        transition: 'opacity 0.3s ease',
      }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {values.map((row, r) =>
        row.map((val, c) => {
          const key = `${r}-${c}`;
          const isSelected =
            selectedCell?.row === r &&
            selectedCell?.col === c &&
            selectedCell?.gridIndex === gridIndex;

          const isRelated = !isSelected && selectedCell?.gridIndex === gridIndex && (
            selectedCell?.row === r ||
            selectedCell?.col === c ||
            (
              Math.floor(r / br) === Math.floor((selectedCell?.row ?? -1) / br) &&
              Math.floor(c / bc) === Math.floor((selectedCell?.col ?? -1) / bc)
            )
          );

          const isHighlighted =
            highlightSimilar &&
            !isSelected &&
            selectedVal > 0 &&
            val === selectedVal;

          const isConflict = conflicts.has(key);
          const isWrong = showErrors && val !== 0 && !isClue[r][c] && val !== grid.solution[r][c];

          const regionId = irregularRegions?.[r]?.[c] ?? (
            Math.floor(r / br) * (size / bc) + Math.floor(c / bc)
          );

          // Box border logic
          const isBoxRight = mode !== 'irregular' && (c + 1) % bc === 0 && c !== size - 1;
          const isBoxBottom = mode !== 'irregular' && (r + 1) % br === 0 && r !== size - 1;

          const irregularBorders = mode === 'irregular' ? {
            top: r === 0 || irregularRegions?.[r-1]?.[c] !== irregularRegions?.[r]?.[c],
            bottom: r === size - 1 || irregularRegions?.[r+1]?.[c] !== irregularRegions?.[r]?.[c],
            left: c === 0 || irregularRegions?.[r]?.[c-1] !== irregularRegions?.[r]?.[c],
            right: c === size - 1 || irregularRegions?.[r]?.[c+1] !== irregularRegions?.[r]?.[c],
          } : undefined;

          const cageInfo = cageMap.get(key);
          const oddEvenType = oddEvenPattern?.[r]?.[c];
          const onDiagonal = isOnDiagonal(r, c);

          let cageInfoWithSelect = undefined;
          let cageBorders;
          if (cageInfo) {
            cageInfoWithSelect = {
              ...cageInfo,
              isSelected: cageInfo.cageId === selectedCageId,
            };
            const sameUp = r > 0 && cageMap.get(`${r-1}-${c}`)?.cageId === cageInfo.cageId;
            const sameDown = r < size - 1 && cageMap.get(`${r+1}-${c}`)?.cageId === cageInfo.cageId;
            const sameLeft = c > 0 && cageMap.get(`${r}-${c-1}`)?.cageId === cageInfo.cageId;
            const sameRight = c < size - 1 && cageMap.get(`${r}-${c+1}`)?.cageId === cageInfo.cageId;
            cageBorders = {
              top: !sameUp,
              bottom: !sameDown,
              left: !sameLeft,
              right: !sameRight
            };
          }

          return (
            <Cell
              key={key}
              row={r}
              col={c}
              value={val}
              isClue={isClue[r][c]}
              pencilMarks={pencilMarks[r][c]}
              isSelected={isSelected}
              isRelated={isRelated}
              isHighlighted={isHighlighted}
              isConflict={isConflict || isWrong}
              size={size}
              cellSize={cellSize}
              regionColor={mode === 'irregular' ? VIBRANT_REGION_COLORS[regionId % VIBRANT_REGION_COLORS.length] : undefined}
              isBoxRight={isBoxRight}
              isBoxBottom={isBoxBottom}
              cageInfo={cageInfoWithSelect}
              cageBorders={cageBorders}
              irregularBorders={irregularBorders}
              oddEvenType={oddEvenType}
              isDiagonal={onDiagonal}
              isImageMode={mode === 'image'}
              isFrozen={grid.frozenCells?.[r]?.[c]}
              onClick={() => handleCellClick(r, c)}
            />
          );
        })
      )}
    </motion.div>
  );
};

export default React.memo(Board);
