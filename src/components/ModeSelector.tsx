import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { getVolumesForMode } from '../data/volumes';
import type { VolumeDef, LevelDef } from '../data/volumes';
import type { GameMode } from '../types';
import { useGameStore } from '../store/gameStore';
import { Play, Check, Grid, Image as ImageIcon, Snowflake, LayoutGrid, LayoutTemplate, X, ChevronLeft, Hexagon, Hash, Triangle, Box } from 'lucide-react';

interface ModeSelectorProps {
  onStart: () => void;
}

const getIconForMode = (mode: string, size = 14) => {
  if (mode === 'image') return <ImageIcon size={size} className="text-purple-400" />;
  if (mode === 'ice-breaker') return <Snowflake size={size} className="text-cyan-400" />;
  if (mode.includes('samurai') || mode === 'combo') return <LayoutTemplate size={size} className="text-amber-400" />;
  if (mode === 'irregular') return <LayoutGrid size={size} className="text-pink-400" />;
  if (mode === 'killer') return <Hash size={size} className="text-red-400" />;
  if (mode === 'diagonal') return <X size={size} className="text-blue-400" />;
  if (mode === 'monster') return <Grid size={size} className="text-emerald-400" />;
  if (mode === 'mini') return <Grid size={size} className="text-yellow-400" />;
  if (mode === 'odd-even') return <Hexagon size={size} className="text-teal-400" />;
  if (mode === 'triangle') return <Triangle size={size} className="text-orange-400" />;
  if (mode === 'cubic') return <Box size={size} className="text-blue-500" />;
  return <Grid size={size} className="text-indigo-400" />;
};

const MODE_CARDS: { id: GameMode; title: string; color: string }[] = [
  { id: 'mini', title: 'Mini Sudoku', color: 'from-yellow-500/20 to-orange-600/20 border-yellow-500' },
  { id: 'image', title: 'Image Sudoku', color: 'from-purple-500/20 to-violet-600/20 border-purple-500' },
  { id: 'classic', title: 'Classic Sudoku', color: 'from-indigo-500/20 to-blue-600/20 border-indigo-500' },
  { id: 'monster', title: 'Monster Sudoku', color: 'from-emerald-500/20 to-teal-600/20 border-emerald-500' },
  { id: 'killer', title: 'Killer Sudoku', color: 'from-red-500/20 to-rose-600/20 border-red-500' },
  { id: 'irregular', title: 'Irregular Sudoku', color: 'from-pink-500/20 to-fuchsia-600/20 border-pink-500' },
  { id: 'diagonal', title: 'Diagonal Sudoku', color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500' },
  { id: 'odd-even', title: 'Odd/Even Sudoku', color: 'from-teal-500/20 to-emerald-600/20 border-teal-500' },
  { id: 'ice-breaker', title: 'Ice-Breaker', color: 'from-sky-500/20 to-cyan-600/20 border-sky-500' },
  { id: 'combo', title: 'Combo 2-Grid', color: 'from-amber-500/20 to-orange-600/20 border-amber-500' },
  { id: 'samurai3', title: 'Samurai 3-Grid', color: 'from-orange-500/20 to-red-600/20 border-orange-500' },
  { id: 'samurai4', title: 'Samurai 4-Grid', color: 'from-rose-500/20 to-pink-600/20 border-rose-500' },
  { id: 'samurai', title: 'Samurai 5-Grid', color: 'from-fuchsia-500/20 to-purple-600/20 border-fuchsia-500' },
  { id: 'triangle', title: 'Triangle Sudoku', color: 'from-orange-400/20 to-red-500/20 border-orange-400' },
  { id: 'cubic', title: 'Cubic Sudoku', color: 'from-blue-500/20 to-indigo-600/20 border-blue-500' },
];

const renderPuzzlePreview = (mode: GameMode) => {
  // A helper to draw a simple 9x9 grid
  const drawGrid = (opacity = "opacity-100", highlightClass = "") => (
    <div className={`grid grid-cols-9 gap-0 w-full h-full border-2 border-white/40 ${opacity}`}>
      {Array.from({ length: 81 }).map((_, i) => {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const isThickBottom = row % 3 === 2 && row !== 8;
        const isThickRight = col % 3 === 2 && col !== 8;
        return (
          <div 
            key={i} 
            className={`
              border-white/10 border-[0.5px] flex items-center justify-center text-[8px] font-bold text-white/50
              ${isThickBottom ? 'border-b-white/40 border-b-[1.5px]' : ''}
              ${isThickRight ? 'border-r-white/40 border-r-[1.5px]' : ''}
              ${highlightClass}
            `}
          >
            {Math.random() > 0.8 ? Math.floor(Math.random() * 9) + 1 : ''}
          </div>
        );
      })}
    </div>
  );

  if (mode === 'classic') {
    return <div className="w-32 h-32 bg-white/5 p-1 rounded shadow-inner">{drawGrid()}</div>;
  }
  
  if (mode === 'mini') {
    return (
      <div className="w-24 h-24 bg-white/5 p-1 rounded shadow-inner grid grid-cols-6 border-2 border-white/40">
        {Array.from({ length: 36 }).map((_, i) => (
          <div key={i} className="border-white/10 border-[0.5px] flex items-center justify-center text-[10px] text-white/50">
            {Math.random() > 0.7 ? Math.floor(Math.random() * 6) + 1 : ''}
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'monster') {
    return <div className="w-32 h-32 bg-white/5 p-1 rounded shadow-inner">{drawGrid("opacity-70")}</div>; // Simplified representation
  }

  if (mode === 'killer') {
    return (
      <div className="w-32 h-32 bg-white/5 p-1 rounded shadow-inner relative">
        {drawGrid("opacity-30")}
        {/* Fake killer cages */}
        <div className="absolute top-2 left-2 w-10 h-6 border-2 border-dashed border-red-400/70 bg-red-500/10 rounded flex items-start p-0.5"><span className="text-[6px] text-red-300">12</span></div>
        <div className="absolute top-8 left-2 w-6 h-10 border-2 border-dashed border-blue-400/70 bg-blue-500/10 rounded flex items-start p-0.5"><span className="text-[6px] text-blue-300">8</span></div>
        <div className="absolute bottom-4 right-4 w-10 h-10 border-2 border-dashed border-green-400/70 bg-green-500/10 rounded flex items-start p-0.5"><span className="text-[6px] text-green-300">21</span></div>
      </div>
    );
  }

  if (mode === 'irregular') {
    const getIrrId = (r: number, c: number) => {
      // Create a "zig-zag" pattern for the preview
      const base = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      if (r === 2 && c >= 3 && c <= 5) return 1;
      if (r === 3 && c >= 0 && c <= 2) return 3;
      if (r === 5 && c >= 6 && c <= 8) return 5;
      if (r === 6 && c >= 3 && c <= 5) return 7;
      return base;
    };

    const colors = [
      'bg-pink-500/30', 'bg-purple-500/30', 'bg-indigo-500/30', 
      'bg-blue-500/30', 'bg-cyan-500/30', 'bg-teal-500/30', 
      'bg-emerald-500/30', 'bg-green-500/30', 'bg-amber-500/30'
    ];

    return (
      <div className="w-32 h-32 bg-white/5 p-1 rounded shadow-inner">
        <div className="grid grid-cols-9 grid-rows-9 w-full h-full border-2 border-white/40">
          {Array.from({ length: 81 }).map((_, i) => {
            const r = Math.floor(i / 9);
            const c = i % 9;
            const id = getIrrId(r, c);
            const sameRight = c < 8 && getIrrId(r, c + 1) === id;
            const sameDown = r < 8 && getIrrId(r + 1, c) === id;

            return (
              <div 
                key={i} 
                className={`
                  border-[0.2px] border-white/5 ${colors[id % colors.length]}
                  ${!sameRight && c !== 8 ? 'border-r-white/40 border-r-[1.5px]' : ''}
                  ${!sameDown && r !== 8 ? 'border-b-white/40 border-b-[1.5px]' : ''}
                `}
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (mode === 'ice-breaker') {
    return (
      <div className="w-32 h-32 bg-white/5 p-1 rounded shadow-inner relative">
        {drawGrid()}
        <div className="absolute top-4 left-4 w-6 h-6 bg-cyan-400/30 border border-cyan-300 backdrop-blur-sm flex items-center justify-center"><Snowflake size={12} className="text-cyan-200" /></div>
        <div className="absolute bottom-8 right-6 w-6 h-6 bg-cyan-400/30 border border-cyan-300 backdrop-blur-sm flex items-center justify-center"><Snowflake size={12} className="text-cyan-200" /></div>
      </div>
    );
  }

  if (mode === 'samurai') {
    return (
      <div className="relative w-32 h-32">
        <div className="absolute top-1 left-1 w-12 h-12 bg-white/10 border border-white/40 shadow-lg" />
        <div className="absolute top-1 right-1 w-12 h-12 bg-white/10 border border-white/40 shadow-lg" />
        <div className="absolute bottom-1 left-1 w-12 h-12 bg-white/10 border border-white/40 shadow-lg" />
        <div className="absolute bottom-1 right-1 w-12 h-12 bg-white/10 border border-white/40 shadow-lg" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 border-2 border-white/60 shadow-xl backdrop-blur-sm" />
      </div>
    );
  }

  if (mode === 'samurai4') {
    return (
      <div className="relative w-32 h-32">
        <div className="absolute top-2 left-[50%] -translate-x-1/2 w-12 h-12 bg-white/10 border border-white/40 shadow-lg" />
        <div className="absolute bottom-2 left-[50%] -translate-x-1/2 w-12 h-12 bg-white/10 border border-white/40 shadow-lg" />
        <div className="absolute top-[50%] -translate-y-1/2 left-2 w-12 h-12 bg-white/10 border border-white/40 shadow-lg" />
        <div className="absolute top-[50%] -translate-y-1/2 right-2 w-12 h-12 bg-white/10 border border-white/40 shadow-lg" />
      </div>
    );
  }

  if (mode === 'combo') {
    return (
      <div className="relative w-32 h-32">
        <div className="absolute top-4 left-4 w-16 h-16 bg-white/10 border border-white/40 shadow-lg" />
        <div className="absolute bottom-4 right-4 w-16 h-16 bg-white/20 border border-white/60 shadow-lg backdrop-blur-sm" />
      </div>
    );
  }

  if (mode === 'diagonal') {
    return (
      <div className="w-32 h-32 bg-white/5 p-1 rounded shadow-inner">
        <div className={`grid grid-cols-9 gap-0 w-full h-full border-2 border-white/40 opacity-70`}>
          {Array.from({ length: 81 }).map((_, i) => {
            const row = Math.floor(i / 9);
            const col = i % 9;
            const isDiagonal = row === col || row + col === 8;
            return (
              <div 
                key={i} 
                className={`border-white/10 border-[0.5px] ${isDiagonal ? 'bg-blue-500/30' : ''}`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (mode === 'odd-even') {
    return (
      <div className="w-32 h-32 bg-white/5 p-1 rounded shadow-inner">
        <div className={`grid grid-cols-9 gap-0 w-full h-full border-2 border-white/40 opacity-70`}>
          {Array.from({ length: 81 }).map((_, i) => {
            const isCircle = i % 3 === 0;
            const isSquare = i % 5 === 0;
            return (
              <div key={i} className={`border-white/10 border-[0.5px] flex items-center justify-center p-[1px]`}>
                {isCircle && <div className="w-full h-full rounded-full border border-teal-400/60 bg-teal-400/20" />}
                {isSquare && !isCircle && <div className="w-full h-full rounded-sm border border-emerald-400/60 bg-emerald-400/20" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (mode === 'image') {
    return (
      <div className="w-32 h-32 bg-white/5 p-1 rounded shadow-inner grid grid-cols-6 border-2 border-white/40">
        {Array.from({ length: 36 }).map((_, i) => (
          <div key={i} className="border-white/10 border-[0.5px] flex items-center justify-center text-[10px] text-white/50">
            {i % 7 === 0 && <span className="text-purple-400">★</span>}
            {i % 11 === 0 && <span className="text-pink-400">♥</span>}
            {i % 13 === 0 && <span className="text-yellow-400">●</span>}
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'samurai3') {
    return (
      <div className="relative w-32 h-32">
        <div className="absolute top-2 left-2 w-12 h-12 bg-white/10 border border-white/40 shadow-lg" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 border-2 border-white/60 shadow-xl backdrop-blur-sm" />
        <div className="absolute bottom-2 right-2 w-12 h-12 bg-white/10 border border-white/40 shadow-lg" />
      </div>
    );
  }

  if (mode === 'triangle') {
    return (
      <div className="w-24 h-24 relative flex items-center justify-center opacity-80">
        <div className="absolute w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-b-[60px] border-b-orange-500/40" />
        <div className="absolute w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-t-[60px] border-t-orange-500/40 mt-10" />
      </div>
    );
  }

  if (mode === 'cubic') {
    return (
      <div className="w-20 h-20 relative opacity-80">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40px] h-[40px] bg-blue-400/30 transform rotate-45 skew-x-[15deg] skew-y-[15deg] border border-blue-300" />
        <div className="absolute top-[28px] left-[10px] w-[40px] h-[40px] bg-indigo-500/30 transform rotate-[15deg] skew-x-[-30deg] border border-indigo-300" />
        <div className="absolute top-[28px] right-[10px] w-[40px] h-[40px] bg-blue-600/30 transform rotate-[-15deg] skew-x-[30deg] border border-blue-400" />
      </div>
    );
  }

  // Fallback icon representation for others
  return (
    <div className="w-24 h-24 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center shadow-lg">
      {getIconForMode(mode, 48)}
    </div>
  );
};

const ModeSelector: React.FC<ModeSelectorProps> = ({ onStart }) => {
  const startGame = useGameStore(state => state.startGame);
  // Optional: If progress isn't in your store yet, default it to an empty object
  // outside the hook to maintain reference stability, or select it properly if added.
  const progress: Record<string, boolean> = (useGameStore(state => (state as any).progress) || {});
  
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  
  // Volumes are generated dynamically when a mode is selected
  const volumes = selectedMode ? getVolumesForMode(selectedMode) : [];
  const [activeVolumeId, setActiveVolumeId] = useState<string>('');

  const activeVolume = volumes.find(v => v.id === activeVolumeId) || volumes[0];

  const handleLevelClick = (level: LevelDef) => {
    startGame(level.mode, level.difficulty, level.size);
    onStart();
  };

  const getSolvedCount = (volId: string) => {
    const vol = volumes.find(v => v.id === volId);
    if (!vol) return 0;
    let count = 0;
    vol.levels.forEach(l => {
      if (progress[`${volId}-${l.id}`]) count++;
    });
    return count;
  };

  if (!selectedMode) {
    return (
      <div className="w-full max-w-[1200px] flex flex-col items-center mt-12 mb-12">
        <motion.h1 
          className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2 drop-shadow-sm"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Select Puzzle Type
        </motion.h1>
        <motion.p 
          className="text-white/60 mb-10 text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Choose a Sudoku variant to see its puzzle volumes
        </motion.p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full px-4 max-w-7xl">
          {MODE_CARDS.map((card, i) => (
            <motion.button
              key={card.id}
              onClick={() => {
                setSelectedMode(card.id);
                const vols = getVolumesForMode(card.id);
                setActiveVolumeId(vols[0].id);
              }}
              className={`relative flex flex-col items-center p-6 rounded-3xl bg-[#1e1e22] border border-white/10 overflow-hidden hover:border-white/30 hover:scale-[1.02] active:scale-[0.98] transition-all group shadow-xl`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
            >
              {/* Colorful Top Accent */}
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.color.split(' ')[0]} ${card.color.split(' ')[1]}`} />
              
              <div className="w-full h-48 rounded-2xl bg-black/40 flex items-center justify-center mb-6 shadow-inner overflow-hidden relative">
                {/* Background ambient glow */}
                <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${card.color.split(' ')[0]} ${card.color.split(' ')[1]} blur-xl`} />
                <div className="z-10 transform group-hover:scale-105 transition-transform duration-500">
                  {renderPuzzlePreview(card.id)}
                </div>
              </div>
              
              <div className="w-full flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  {getIconForMode(card.id, 20)}
                </div>
                <h3 className="text-xl font-bold text-white text-left flex-1">
                  {card.title}
                </h3>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1000px] h-[80vh] min-h-[500px] flex rounded-2xl overflow-hidden glass-card border border-white/10 shadow-2xl mt-4">
      {/* ── Left Pane: Volumes ── */}
      <div className="w-[300px] bg-[#2d2d30] border-r border-white/5 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/5 bg-black/20 flex items-center gap-3">
          <button 
            onClick={() => setSelectedMode(null)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={20} className="text-white" />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight capitalize">{selectedMode.replace('-', ' ')}</h2>
            <div className="text-xs text-white/50">{volumes.length} volumes</div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
          {volumes.map(vol => {
            const isActive = vol.id === activeVolumeId;
            const solved = getSolvedCount(vol.id);
            const total = vol.levels.length;
            
            return (
              <button
                key={vol.id}
                onClick={() => setActiveVolumeId(vol.id)}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${
                  isActive ? 'bg-indigo-600/30 border border-indigo-500/50' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center relative overflow-hidden shrink-0 border border-white/10">
                  <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-blue-400 to-purple-600"></div>
                  {getIconForMode(selectedMode, 24)}
                  <div className="absolute top-0 left-0 bg-blue-500 text-[8px] font-bold px-1 rounded-br z-10 uppercase tracking-widest">Free</div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white truncate">{vol.title}</div>
                  <div className="text-xs text-white/40 mt-1 flex items-center gap-1">
                    <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden mt-0.5">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${(solved / total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-white/40 mt-1">{solved}/{total} puzzles solved</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right Pane: Puzzle List ── */}
      <div className="flex-1 bg-[#1e1e20] flex flex-col min-w-0 relative">
        <div className="p-6 border-b border-white/5 bg-[#252528] flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-2 border-white/10 shadow-lg">
            {getIconForMode(selectedMode, 32)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{activeVolume?.title}</h2>
            <div className="flex items-center gap-4 mt-2 text-xs text-white/60">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {activeVolume?.levels.length} New</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> 0 Saved</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {getSolvedCount(activeVolume?.id)} Solved</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 content-start">
          {activeVolume?.levels.map((level, idx) => {
            const isSolved = progress[`${activeVolume.id}-${level.id}`];
            
            return (
              <motion.button
                key={level.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => handleLevelClick(level)}
                className="flex flex-col items-center group text-left"
              >
                {/* Puzzle Preview Thumbnail */}
                <div className={`w-full aspect-square rounded-2xl bg-black/30 border-2 transition-all flex items-center justify-center relative overflow-hidden shadow-lg mb-3
                  ${isSolved ? 'border-emerald-500/50 hover:border-emerald-400' : 'border-white/5 hover:border-blue-400'}`}>
                  
                  {/* Subtle highlight on hover */}
                  <div className="absolute inset-0 bg-blue-400/0 group-hover:bg-blue-400/10 transition-colors z-10" />
                  
                  {/* The Preview */}
                  <div className="transform scale-[0.6] group-hover:scale-[0.65] transition-transform pointer-events-none">
                    {renderPuzzlePreview(level.mode)}
                  </div>
                  
                  {/* Checkmark overlay for solved */}
                  {isSolved && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md z-20">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                      <Play size={20} className="ml-1" fill="currentColor" />
                    </div>
                  </div>
                </div>

                {/* Level Details */}
                <div className="w-full flex items-center justify-between px-1">
                  <div>
                    <div className="font-bold text-white group-hover:text-blue-400 transition-colors">
                      Puzzle {level.id}
                    </div>
                    <div className="text-[11px] text-white/50 capitalize mt-0.5">
                      {level.size}x{level.size} {level.difficulty}
                    </div>
                  </div>
                  <div className="text-xs font-mono">
                    {isSolved ? <span className="text-emerald-400">Done</span> : null}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModeSelector;
