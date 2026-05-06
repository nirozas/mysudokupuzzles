import React from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
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
  isDiag1?: boolean;
  isDiag2?: boolean;
  isImageMode?: boolean;
  iceLayers?: number;
  startIceLayers?: number;
  solutionValue?: number;
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
  cageInfo, cageBorders, irregularBorders, oddEvenType, isDiag1, isDiag2, isImageMode, iceLayers, startIceLayers, solutionValue,
  onClick,
}) => {
  const controls = useAnimation();
  const prevIce = React.useRef(iceLayers);

  useEffect(() => {
    if (prevIce.current !== undefined && iceLayers !== undefined && iceLayers < prevIce.current && iceLayers > 0) {
      // Crack animation
      controls.start({
        scale: [1, 0.96, 1],
        rotate: [-2, 2, -1, 1, 0],
        transition: { duration: 0.3, ease: 'easeInOut' }
      });
    }
    prevIce.current = iceLayers;
  }, [iceLayers, controls]);

  useEffect(() => {
    if (isConflict && value !== 0 && !isClue) {
      // Parity Clash check
      const isParityConflict = oddEvenType === 'even' ? value % 2 !== 0 : oddEvenType === 'odd' ? value % 2 === 0 : false;
      
      if (isParityConflict) {
        controls.start({
          scale: [1, 1.15, 1],
          backgroundColor: ['rgba(239, 68, 68, 0)', 'rgba(239, 68, 68, 0.4)', 'rgba(239, 68, 68, 0)'],
          transition: { duration: 0.5, ease: 'easeOut' },
        });
      } else {
        controls.start({
          x: [-4, 4, -3, 3, -2, 2, 0],
          transition: { duration: 0.4, ease: 'easeInOut' },
        });
      }
    }
  }, [isConflict, value, isClue, oddEvenType, controls]);

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
    isDiag1 || isDiag2                 ? 'diagonal-cell'    : '',
    isBoxRight                         ? 'box-border-right'  : '',
    isBoxBottom                        ? 'box-border-bottom' : '',
  ].filter(Boolean).join(' ');

  const bgOverride =
    regionColor && !isSelected && !isRelated && !isHighlighted
      ? regionColor + '22'
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
      onClick={() => { if (!iceLayers) onClick(); }}
      tabIndex={isClue || (iceLayers && iceLayers > 0) ? -1 : 0}
      role="gridcell"
      aria-label={`R${row + 1}C${col + 1}${value ? ` = ${value}` : ''}`}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !iceLayers) onClick(); }}
    >
      {/* Icy Slots Overlay */}
      <AnimatePresence>
        {iceLayers && iceLayers > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ 
              scale: 1.5, 
              opacity: 0, 
              rotate: 15,
              filter: 'blur(10px)',
              transition: { duration: 0.6, ease: 'easeIn' }
            }}
            className={`absolute inset-0 z-20 flex items-center justify-center backdrop-blur-md border-[1.5px] border-white/40 shadow-inner overflow-hidden transition-colors duration-700 ${
              iceLayers === 3 ? 'bg-cyan-700/60' : 
              iceLayers === 2 ? 'bg-cyan-400/40' : 
              'bg-cyan-100/25'
            }`} 
            style={{ borderRadius: '2px' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
            <Snowflake 
              size={Math.max(12, cellSize/2.5)} 
              className="text-white drop-shadow-[0_2px_4px_rgba(0,180,216,0.5)] relative z-10 animate-pulse" 
            />
            {(startIceLayers !== undefined && startIceLayers - iceLayers >= 1) && (
              <div className="absolute inset-0 z-11 pointer-events-none opacity-40">
                <div className="w-full h-full border-t border-l border-white/60 -rotate-12 translate-x-1 translate-y-1" />
                <div className="w-full h-full border-b border-r border-white/60 rotate-12 -translate-x-1 -translate-y-1" />
              </div>
            )}
            {(startIceLayers !== undefined && startIceLayers - iceLayers >= 2) && (
              <div className="absolute inset-0 z-11 pointer-events-none opacity-60">
                <div className="w-full h-full border-t border-r border-white/80 rotate-45 translate-x-2 -translate-y-2" />
                <div className="w-full h-full border-b border-l border-white/80 rotate-45 -translate-x-2 translate-y-2" />
              </div>
            )}
            {iceLayers >= 2 && (
              <div className="absolute inset-0 z-5 pointer-events-none opacity-20 bg-[radial-gradient(circle,rgba(255,255,255,0.4)_1px,transparent_1px)] bg-[size:4px_4px]" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Irregular Region Borders */}
      {irregularBorders && (
        <>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0.5,
              borderTop: irregularBorders.top ? `3.5px solid ${regionColor ?? '#1a1a2e'}` : 'none',
              borderBottom: irregularBorders.bottom ? `3.5px solid ${regionColor ?? '#1a1a2e'}` : 'none',
              borderLeft: irregularBorders.left ? `3.5px solid ${regionColor ?? '#1a1a2e'}` : 'none',
              borderRight: irregularBorders.right ? `3.5px solid ${regionColor ?? '#1a1a2e'}` : 'none',
              filter: 'blur(1.2px) brightness(1.5)',
              zIndex: 4,
              pointerEvents: 'none',
              opacity: 0.8
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: -0.5,
              borderTop: irregularBorders.top ? '3.5px solid #0f0f1a' : 'none',
              borderBottom: irregularBorders.bottom ? '3.5px solid #0f0f1a' : 'none',
              borderLeft: irregularBorders.left ? '3.5px solid #0f0f1a' : 'none',
              borderRight: irregularBorders.right ? '3.5px solid #0f0f1a' : 'none',
              zIndex: 5,
              pointerEvents: 'none'
            }}
          />
        </>
      )}

      {/* Killer cage thick filled background */}
      {cageInfo && cageBorders && cageInfo.isSelected && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 1,
            backgroundColor: `${cageInfo.color}35`,
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

      {/* Cell value or Icy Hint */}
      {(value !== 0 || (iceLayers && iceLayers > 0)) ? (
        <motion.span
          key={`v-${row}-${col}-${value}-${iceLayers}`}
          variants={numberVariants}
          initial="initial"
          animate="animate"
          style={{ 
            position: 'relative', 
            zIndex: 2, 
            lineHeight: 1,
            color: (iceLayers && iceLayers > 0) ? 'var(--text-secondary)' : undefined,
            opacity: (iceLayers && iceLayers > 0) ? 0.6 : 1,
            filter: (iceLayers && iceLayers > 0) ? 'grayscale(0.5)' : 'none',
          }}
        >
          {value !== 0 ? renderValue(value) : renderValue(solutionValue || 0)}
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
