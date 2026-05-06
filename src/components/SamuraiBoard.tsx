import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import Board from './Board';

// Samurai 5-grid layout positions (relative units)
// Grid positions in a 3x3 super-grid:
// [0,0]=top-left  [0,2]=top-right
// [1,1]=center
// [2,0]=btm-left  [2,2]=btm-right

// Positions and labels are calculated dynamically based on mode

const SamuraiBoard: React.FC = () => {
  const { samuraiGrids, activeGridIndex, setActiveGrid, mode } = useGameStore();
  const [zoom, setZoom] = useState(0.55);

  if (!samuraiGrids.length) return null;

  const cellSize = 42; 
  const gridPx = 9 * cellSize + 4; 
  const gridOffset = gridPx - Math.floor(cellSize * 3); // 3-cell overlap

  let pos: { x: number, y: number }[] = [];
  let labels: string[] = [];
  let canvasW = 0;
  let canvasH = 0;

  if (mode === 'combo') {
    pos = [
      { x: 0, y: 0 },
      { x: gridOffset, y: gridOffset }
    ];
    labels = ['Top Left', 'Bottom Right'];
    canvasW = gridPx + gridOffset;
    canvasH = gridPx + gridOffset;
  } else if (mode === 'samurai3') {
    pos = [
      { x: 0, y: 0 },
      { x: gridOffset, y: gridOffset },
      { x: gridOffset * 2, y: gridOffset * 2 }
    ];
    labels = ['Top Left', 'Center', 'Bottom Right'];
    canvasW = gridPx + gridOffset * 2;
    canvasH = gridPx + gridOffset * 2;
  } else if (mode === 'samurai4') {
    pos = [
      { x: gridOffset, y: 0 },           // Top Center
      { x: 0, y: gridOffset },           // Left Center
      { x: gridOffset * 2, y: gridOffset }, // Right Center
      { x: gridOffset, y: gridOffset * 2 }  // Bottom Center
    ];
    labels = ['Top', 'Left', 'Right', 'Bottom'];
    canvasW = gridPx + gridOffset * 2;
    canvasH = gridPx + gridOffset * 2;
  } else {
    // 5-grid
    pos = [
      { x: 0,           y: 0           }, // TL
      { x: gridOffset * 2, y: 0   }, // TR
      { x: gridOffset, y: gridOffset }, // Center
      { x: 0,           y: gridOffset * 2 }, // BL
      { x: gridOffset * 2, y: gridOffset * 2 }, // BR
    ];
    labels = ['Top Left', 'Top Right', 'Center', 'Bottom Left', 'Bottom Right'];
    canvasW = gridPx + gridOffset * 2;
    canvasH = gridPx + gridOffset * 2;
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Grid tab selector */}
      <div className="flex gap-2 flex-wrap justify-center">
        {labels.map((label, i) => (
          <motion.button
            key={i}
            id={`samurai-tab-${i}`}
            onClick={() => setActiveGrid(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
              ${activeGridIndex === i
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-cell)] hover:border-indigo-500'
              }`}
            whileTap={{ scale: 0.93 }}
          >
            {label}
          </motion.button>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setZoom(z => Math.max(0.3, z - 0.05))}
          className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-cell)] text-[var(--text-secondary)] flex items-center justify-center hover:border-indigo-500 transition-all font-bold text-sm"
          aria-label="Zoom out"
        >−</button>
        <span className="text-xs text-[var(--text-secondary)] font-mono min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(z => Math.min(1.2, z + 0.05))}
          className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-cell)] text-[var(--text-secondary)] flex items-center justify-center hover:border-indigo-500 transition-all font-bold text-sm"
          aria-label="Zoom in"
        >+</button>
        <button
          onClick={() => setZoom(0.55)}
          className="px-3 h-7 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-cell)] text-[var(--text-secondary)] text-xs hover:border-indigo-500 transition-all"
          aria-label="Reset zoom"
        >Reset</button>
      </div>

      {/* Samurai canvas */}
      <div
        className="overflow-auto max-w-full"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        <motion.div
          style={{
            position: 'relative',
            width: `${canvasW}px`,
            height: `${canvasH}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            marginBottom: `${(canvasH * zoom) - canvasH}px`,
          }}
          animate={{ scale: zoom }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        >
          {samuraiGrids.map((grid, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                left: `${pos[i].x}px`,
                top: `${pos[i].y}px`,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 250, damping: 24 }}
            >
              {/* Focus ring on active grid */}
              {activeGridIndex === i && (
                <motion.div
                  className="absolute -inset-2 rounded-xl border-2 border-indigo-500 pointer-events-none z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ boxShadow: '0 0 24px rgba(99,102,241,0.3)' }}
                />
              )}
              <Board
                grid={grid}
                gridIndex={i}
                isFocused={activeGridIndex === i}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      <p className="text-xs text-[var(--text-secondary)] text-center opacity-70">
        Double-tap a number on the keypad to lock it · Click a grid tab to focus it
      </p>
    </div>
  );
};

export default SamuraiBoard;
