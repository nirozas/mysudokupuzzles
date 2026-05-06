import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Pen, Eraser, Lightbulb, RefreshCw, RotateCcw, RotateCw, Wand2, Star, Moon, PawPrint, Droplet, Square, Heart, Leaf, Sun, Clover } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { getRemainingCounts } from '../utils/sudokuGenerator';

const Keypad: React.FC = () => {
  const {
    grid, mode, samuraiGrids, activeGridIndex,
    inputMode, lockedNumber, size,
    setInputMode, toggleLockNumber, placeNumber, clearCell,
    revealCell, undo, redo, historyIndex, history, fillAutoNotes,
    hintsRemaining,
  } = useGameStore();

  const activeGrid = mode === 'samurai' ? samuraiGrids[activeGridIndex] : grid;
  const remaining = activeGrid ? getRemainingCounts(activeGrid) : {};

  const gridSize = activeGrid?.size ?? size;
  const numbers = Array.from({ length: gridSize }, (_, i) => i + 1);

  const handleNumber = useCallback((n: number) => {
    if (lockedNumber === n) {
      toggleLockNumber(n);
    } else {
      placeNumber(n);
    }
  }, [lockedNumber, toggleLockNumber, placeNumber]);

  const handleLongPress = useCallback((n: number) => {
    toggleLockNumber(n);
  }, [toggleLockNumber]);

  // Compact layout for 16x16
  const isLarge = gridSize > 9;
  const cols = isLarge ? 8 : gridSize <= 6 ? 3 : gridSize;

  const renderValue = (val: number) => {
    if (mode !== 'image') return val;
    const icons = {
      1: <Star size={isLarge ? 16 : 24} fill="currentColor" />,
      2: <Moon size={isLarge ? 16 : 24} fill="currentColor" />,
      3: <PawPrint size={isLarge ? 16 : 24} fill="currentColor" />,
      4: <Droplet size={isLarge ? 16 : 24} fill="currentColor" />,
      5: <Square size={isLarge ? 16 : 24} fill="currentColor" />,
      6: <Heart size={isLarge ? 16 : 24} fill="currentColor" />,
      7: <Leaf size={isLarge ? 16 : 24} fill="currentColor" />,
      8: <Sun size={isLarge ? 16 : 24} fill="currentColor" />,
      9: <Clover size={isLarge ? 16 : 24} fill="currentColor" />,
    };
    return icons[val as keyof typeof icons] || val;
  };

  return (
    <div className="flex flex-col gap-3 w-full select-none">
      {/* Mode toggle row */}
      <div className="flex gap-2">
        <button
          id="toggle-pen"
          onClick={() => setInputMode('pen')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all
            ${inputMode === 'pen'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-indigo-600/10 border border-[var(--border-cell)]'
            }`}
          aria-pressed={inputMode === 'pen'}
        >
          <Pen size={15} />
          Pen
        </button>
        <button
          id="toggle-pencil"
          onClick={() => setInputMode('pencil')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all
            ${inputMode === 'pencil'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-amber-500/10 border border-[var(--border-cell)]'
            }`}
          aria-pressed={inputMode === 'pencil'}
        >
          <Pencil size={15} />
          Notes
        </button>
      </div>

      {/* Number pad */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {numbers.map(n => {
          const rem = remaining[n] ?? 0;
          const complete = rem <= 0;
          const isLocked = lockedNumber === n;

          return (
            <motion.button
              key={n}
              id={`keypad-${n}`}
              className={`keypad-btn ${isLocked ? 'locked' : ''} ${complete ? 'complete' : ''}`}
              style={{
                height: isLarge ? '44px' : '62px',
                fontSize: isLarge ? '1rem' : '1.5rem',
              }}
              onClick={() => handleNumber(n)}
              onDoubleClick={() => handleLongPress(n)}
              disabled={complete && !isLocked}
              whileTap={{ scale: 0.92 }}
              aria-label={`Number ${n}, ${rem} remaining`}
            >
              <span style={{ transform: 'scaleX(1.5)', display: 'inline-block' }}>
                {renderValue(n)}
              </span>
              {!complete && (
                <span className="badge">{rem}</span>
              )}
              {complete && (
                <motion.span
                  className="badge complete"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  ✓
                </motion.span>
              )}
              {isLocked && (
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-indigo-400 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-4 gap-2">
        <ActionBtn
          id="btn-erase"
          icon={<Eraser size={18} />}
          label="Erase"
          onClick={clearCell}
          color="slate"
        />
        <ActionBtn
          id="btn-undo"
          icon={<RotateCcw size={18} />}
          label="Undo"
          onClick={undo}
          disabled={historyIndex <= 0}
          color="slate"
        />
        <ActionBtn
          id="btn-redo"
          icon={<RotateCw size={18} />}
          label="Redo"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          color="slate"
        />
        <ActionBtn
          id="btn-hint"
          icon={<Lightbulb size={18} />}
          label={`Hint (${hintsRemaining})`}
          onClick={revealCell}
          disabled={hintsRemaining <= 0}
          color="amber"
        />
      </div>

      {/* Auto-notes button */}
      <motion.button
        id="btn-autonotes"
        onClick={fillAutoNotes}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm
          bg-[var(--bg-secondary)] border border-[var(--border-cell)] text-[var(--text-secondary)]
          hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
        whileTap={{ scale: 0.97 }}
      >
        <Wand2 size={15} />
        Auto-fill Notes
      </motion.button>
    </div>
  );
};

interface ActionBtnProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color?: 'slate' | 'amber' | 'red' | 'emerald';
}

const colorMap = {
  slate: 'hover:border-slate-400 hover:text-slate-300 hover:bg-slate-400/10',
  amber: 'hover:border-amber-400 hover:text-amber-300 hover:bg-amber-400/10',
  red:   'hover:border-red-400 hover:text-red-300 hover:bg-red-400/10',
  emerald: 'hover:border-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10',
};

const ActionBtn: React.FC<ActionBtnProps> = ({ id, icon, label, onClick, disabled, color = 'slate' }) => (
  <motion.button
    id={id}
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-xs font-medium
      bg-[var(--bg-secondary)] border border-[var(--border-cell)] text-[var(--text-secondary)]
      disabled:opacity-30 disabled:cursor-not-allowed transition-all
      ${colorMap[color]}`}
    whileTap={{ scale: disabled ? 1 : 0.93 }}
    aria-label={label}
  >
    {icon}
    <span>{label}</span>
  </motion.button>
);

export default Keypad;
