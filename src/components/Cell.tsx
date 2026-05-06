import React from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useEffect } from 'react';
import { Star, Moon, PawPrint, Droplet, Square, Heart, Leaf, Sun, Clover, Snowflake } from 'lucide-react';

interface CellProps {
  row: number;
  col: number;
  value: number;
  isClue: boolean;
  pencilMarks: Set<number>;
  isSelected: boolean;
  isRelated: boolean;
  isHighlighted: boolean;
  isConflict: boolean;
  size: number;
  cellSize: number;
  regionColor?: string;
  isBoxRight: boolean;
  isBoxBottom: boolean;
  cageInfo?: { isTopLeft: boolean; sum: number; color: string; isSelected?: boolean };
  cageBorders?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  oddEvenType?: 'odd' | 'even' | 'any';
  isDiagonal?: boolean;
  isImageMode?: boolean;
  isFrozen?: boolean;
  irregularBorders?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  onClick: () => void;
}

const cellVariants = {
  hidden: { scale: 0.6, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 320, damping: 22 },
  },
};

const numberVariants = {
  initial: { scale: 0.5, opacity: 0 },
  animate: {
    scale: 1, opacity: 1,
    transition: { type: 'spring' as const, stiffness: 500, damping: 22 },
  },
};

const Cell: React.FC<CellProps> = ({
  row, col, value, isClue, pencilMarks,
  isSelected, isRelated, isHighlighted, isConflict,
  size, cellSize, regionColor,
  isBoxRight, isBoxBottom,
  cageInfo, cageBorders, irregularBorders, oddEvenType, isDiagonal, isImageMode, isFrozen,
  onClick,
}) => {
  const controls = useAnimation();

  useEffect(() => {
    if (isConflict && value !== 0 && !isClue) {
      controls.start({
        x: [-4, 4, -3, 3, -2, 2, 0],
        transition: { duration: 0.4, ease: 'easeInOut' },
      });
    }
  }, [isConflict, value, isClue]);  // eslint-disable-line react-hooks/exhaustive-deps

  const fontSize =
    size <= 4  ? (cellSize >= 70 ? '1.6rem' : '1.3rem') :
    size <= 6  ? (cellSize >= 64 ? '1.4rem' : '1.1rem') :
    size <= 9  ? (cellSize >= 55 ? '1.25rem' : '1rem') :
    '0.8rem';

  const classes = [
    'sudoku-cell',
    isClue                             ? 'is-clue'        : '',
    isSelected                         ? 'is-selected'    : '',
    isRelated && !isSelected           ? 'is-related'     : '',
    isHighlighted && !isSelected && !isRelated ? 'is-highlighted' : '',
    isConflict && !isSelected          ? 'is-conflict'    : '',
    !isClue && value > 0 && !isConflict ? 'is-user'       : '',
    oddEvenType === 'odd'              ? 'is-odd-even-odd'  : '',
    oddEvenType === 'even'             ? 'is-odd-even-even' : '',
    isDiagonal                         ? 'diagonal-cell-main' : '',
    isBoxRight                         ? 'box-border-right'  : '',
    isBoxBottom                        ? 'box-border-bottom' : '',
  ].filter(Boolean).join(' ');

  const bgOverride =
    regionColor && !irregularBorders && !isSelected && !isRelated && !isHighlighted
      ? regionColor
      : undefined;

  const showPencil = value === 0 && pencilMarks.size > 0;

  const renderValue = (val: number) => {
    if (!isImageMode) return val;
    const icons = {
      1: <Star size={fontSize} fill="currentColor" />,
      2: <Moon size={fontSize} fill="currentColor" />,
      3: <PawPrint size={fontSize} fill="currentColor" />,
      4: <Droplet size={fontSize} fill="currentColor" />,
      5: <Square size={fontSize} fill="currentColor" />,
      6: <Heart size={fontSize} fill="currentColor" />,
      7: <Leaf size={fontSize} fill="currentColor" />,
      8: <Sun size={fontSize} fill="currentColor" />,
      9: <Clover size={fontSize} fill="currentColor" />,
    };
    return icons[val as keyof typeof icons] || val;
  };

  return (
    <motion.div
      className={classes}
      style={{
        width: cellSize,
        height: cellSize,
        fontSize,
        backgroundColor: bgOverride,
      }}
      variants={cellVariants}
      animate={controls}
      onClick={() => { if (!isFrozen) onClick(); }}
      tabIndex={isClue || isFrozen ? -1 : 0}
      role="gridcell"
      aria-label={`R${row + 1}C${col + 1}${value ? ` = ${value}` : ''}`}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isFrozen) onClick(); }}
    >
      {/* Frozen Block */}
      {isFrozen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-cyan-200/50 backdrop-blur-[2px] border-[1.5px] border-cyan-400/80" style={{ borderRadius: '2px' }}>
          <div className="w-full h-full bg-gradient-to-br from-white/40 to-transparent absolute inset-0"></div>
          <Snowflake size={Math.max(12, cellSize/2.5)} className="text-white/80 drop-shadow-md relative z-10" />
        </div>
      )}

      {/* Irregular Region Borders (Image 2 style: Thick Black + Neon Glow) */}
      {irregularBorders && (
        <>
          {/* Neon Inner Glow */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0.5,
              borderTop: irregularBorders.top ? `3.5px solid ${regionColor}` : 'none',
              borderBottom: irregularBorders.bottom ? `3.5px solid ${regionColor}` : 'none',
              borderLeft: irregularBorders.left ? `3.5px solid ${regionColor}` : 'none',
              borderRight: irregularBorders.right ? `3.5px solid ${regionColor}` : 'none',
              filter: 'blur(1.2px) brightness(1.5)',
              zIndex: 4,
              pointerEvents: 'none',
              opacity: 0.8
            }}
          />
          {/* Thick Solid Black Border */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: -0.5,
              borderTop: irregularBorders.top ? '3.5px solid #000' : 'none',
              borderBottom: irregularBorders.bottom ? '3.5px solid #000' : 'none',
              borderLeft: irregularBorders.left ? '3.5px solid #000' : 'none',
              borderRight: irregularBorders.right ? '3.5px solid #000' : 'none',
              zIndex: 5,
              pointerEvents: 'none'
            }}
          />
        </>
      )}

      {/* Killer cage thick filled background and outer borders */}
      {cageInfo && cageBorders && cageInfo.isSelected && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 1,
            backgroundColor: `${cageInfo.color}35`, // 20% opacity fill
            borderTop: cageBorders.top ? `3px solid ${cageInfo.color}88` : 'none',
            borderBottom: cageBorders.bottom ? `3px solid ${cageInfo.color}88` : 'none',
            borderLeft: cageBorders.left ? `3px solid ${cageInfo.color}88` : 'none',
            borderRight: cageBorders.right ? `3px solid ${cageInfo.color}88` : 'none',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* Killer cage dashed border for unselected */}
      {cageInfo && cageBorders && !cageInfo.isSelected && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 2,
            borderTop: cageBorders.top ? `2px dashed ${cageInfo.color}` : 'none',
            borderBottom: cageBorders.bottom ? `2px dashed ${cageInfo.color}` : 'none',
            borderLeft: cageBorders.left ? `2px dashed ${cageInfo.color}` : 'none',
            borderRight: cageBorders.right ? `2px dashed ${cageInfo.color}` : 'none',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* Killer cage sum label */}
      {cageInfo?.isTopLeft && (
        <span 
          className="killer-cage-label" 
          style={{ 
            color: cageInfo.color, 
            fontSize: '11.5px', 
            fontWeight: 900, 
            background: 'var(--bg-primary)',
            padding: '1px 4px',
            borderRadius: '4px',
            boxShadow: `0 1px 4px rgba(0,0,0,0.3)`,
            border: `1.5px solid ${cageInfo.color}`,
            zIndex: 10
          }} 
          aria-hidden
        >
          {cageInfo.sum}
        </span>
      )}

      {/* Cell value */}
      {value !== 0 ? (
        <motion.span
          key={`v-${row}-${col}-${value}`}
          variants={numberVariants}
          initial="initial"
          animate="animate"
          style={{ position: 'relative', zIndex: 2, lineHeight: 1 }}
        >
          {renderValue(value)}
        </motion.span>
      ) : showPencil ? (
        <PencilGrid marks={pencilMarks} size={size} cellSize={cellSize} isImageMode={isImageMode} />
      ) : null}
    </motion.div>
  );
};

// ─── Pencil mark sub-grid ─────────────────────────────────────────────────────

interface PencilGridProps {
  marks: Set<number>;
  size: number;
  cellSize: number;
  isImageMode?: boolean;
}

const PencilGrid: React.FC<PencilGridProps> = ({ marks, size, cellSize, isImageMode }) => {
  const cols = size <= 4 ? 2 : size <= 6 ? 2 : 3;
  const rows = size <= 4 ? 2 : size <= 6 ? 3 : 3;
  const count = cols * rows;
  const nums = Array.from({ length: Math.min(size, count) }, (_, i) => i + 1);
  const markSize = Math.max(7, Math.floor(cellSize / (size <= 6 ? 3.5 : 4.5)));

  const renderMark = (val: number) => {
    if (!isImageMode) return val;
    const icons = {
      1: <Star size={markSize} fill="currentColor" />,
      2: <Moon size={markSize} fill="currentColor" />,
      3: <PawPrint size={markSize} fill="currentColor" />,
      4: <Droplet size={markSize} fill="currentColor" />,
      5: <Square size={markSize} fill="currentColor" />,
      6: <Heart size={markSize} fill="currentColor" />,
      7: <Leaf size={markSize} fill="currentColor" />,
      8: <Sun size={markSize} fill="currentColor" />,
      9: <Clover size={markSize} fill="currentColor" />,
    };
    return icons[val as keyof typeof icons] || val;
  };

  return (
    <div
      className="pencil-grid"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
    >
      {nums.map(n => (
        <span
          key={n}
          className="pencil-mark"
          style={{ fontSize: markSize, opacity: marks.has(n) ? 0.82 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-hidden={!marks.has(n)}
        >
          {marks.has(n) ? renderMark(n) : ''}
        </span>
      ))}
    </div>
  );
};

export default React.memo(Cell);
