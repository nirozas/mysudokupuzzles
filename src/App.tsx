import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './store/gameStore';
import GameHeader from './components/GameHeader';
import Board from './components/Board';
import SamuraiBoard from './components/SamuraiBoard';
import Keypad from './components/Keypad';
import ModeSelector from './components/ModeSelector';
import { WinOverlay, PauseOverlay, SettingsOverlay } from './components/Overlay';
import { TutorialOverlay } from './components/TutorialOverlay';

// ─── Keyboard hook ───────────────────────────────────────────────────────────

function useKeyboard() {
  const {
    selectedCell, selectCell, placeNumber, clearCell,
    setInputMode, inputMode, grid, mode,
    samuraiGrids, activeGridIndex, isStarted,
  } = useGameStore();

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (!isStarted) return;
      // Don't intercept when inside an input element
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      const activeGrid = (mode === 'samurai' || mode === 'samurai3' || mode === 'samurai4' || mode === 'combo') ? samuraiGrids[activeGridIndex] : grid;
      if (!activeGrid) return;
      const size = activeGrid.size;

      // Numbers 1–9
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= Math.min(size, 9)) {
        e.preventDefault();
        placeNumber(num);
        return;
      }

      // Arrow / WASD navigation
      const dirs: Record<string, [number, number]> = {
        ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
        w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1],
      };
      if (dirs[e.key]) {
        e.preventDefault();
        const [dr, dc] = dirs[e.key];
        const cur = selectedCell ?? { row: 0, col: 0, gridIndex: activeGridIndex };
        selectCell({
          row: Math.max(0, Math.min(size - 1, cur.row + dr)),
          col: Math.max(0, Math.min(size - 1, cur.col + dc)),
          gridIndex: activeGridIndex,
        });
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        setInputMode(inputMode === 'pen' ? 'pencil' : 'pen');
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        clearCell();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [selectedCell, selectCell, placeNumber, clearCell, setInputMode,
      inputMode, grid, mode, samuraiGrids, activeGridIndex, isStarted]);
}

// ─── Ambient background ──────────────────────────────────────────────────────

const AmbientBg: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
    {theme === 'dark' ? (
      <>
        <div style={{ position:'absolute', top:'-15%', left:'-8%', width:700, height:700, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(67,56,202,0.13) 0%, transparent 65%)', filter:'blur(48px)' }} />
        <div style={{ position:'absolute', bottom:'-12%', right:'-4%', width:600, height:600, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 65%)', filter:'blur(48px)' }} />
        <div style={{ position:'absolute', top:'35%', right:'25%', width:320, height:320, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 65%)', filter:'blur(40px)' }} />
      </>
    ) : (
      <>
        <div style={{ position:'absolute', top:'-10%', left:'-5%', width:600, height:600, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)', filter:'blur(48px)' }} />
        <div style={{ position:'absolute', bottom:'-8%', right:'0%', width:500, height:500, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 65%)', filter:'blur(40px)' }} />
      </>
    )}
  </div>
);

// ─── Mode info badge ─────────────────────────────────────────────────────────

const MODE_INFO: Record<string, { label: string; colorClass: string; desc: string }> = {
  classic:    { label: 'Classic',    colorClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',    desc: 'Fill 1–9 in every row, column & box' },
  killer:     { label: 'Killer',     colorClass: 'bg-red-500/10 text-red-300 border-red-500/20',              desc: 'Cages must sum correctly — no repeats' },
  irregular:  { label: 'Irregular',  colorClass: 'bg-purple-500/10 text-purple-300 border-purple-500/20',    desc: 'Jigsaw-shaped region constraints' },
  diagonal:   { label: 'Diagonal X', colorClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',          desc: 'Both main diagonals must also be 1–9' },
  'odd-even': { label: 'Odd/Even',   colorClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', desc: 'Marked cells must contain odd or even digits' },
  samurai:    { label: 'Samurai',    colorClass: 'bg-amber-500/10 text-amber-300 border-amber-500/20',       desc: '5 overlapping 9×9 grids' },
};

const ModeInfoBadge: React.FC<{ mode: string; size: number }> = ({ mode, size }) => {
  const info = MODE_INFO[mode] ?? MODE_INFO['classic'];
  return (
    <motion.div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm ${info.colorClass}`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <span className="font-bold">{info.label}</span>
      <span className="opacity-40">·</span>
      <span className="opacity-70 text-xs">{size}×{size}</span>
      <span className="opacity-40 hidden md:block">·</span>
      <span className="opacity-70 text-xs hidden md:block">{info.desc}</span>
    </motion.div>
  );
};

const KeyboardHint: React.FC = () => (
  <p className="text-[11px] text-[var(--text-secondary)] opacity-40 text-center tracking-wide select-none">
    Arrow keys · 1–9 to input · Space = notes toggle · Del = erase
  </p>
);

const OddEvenLegend: React.FC = () => (
  <motion.div 
    className="flex items-center gap-6 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-500/5"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.2 }}
  >
    <div className="flex items-center gap-2.5">
      <div className="w-4 h-4 rounded-full bg-slate-400/30 border border-slate-400/40 shadow-sm shadow-black/20"></div>
      <span className="text-xs text-[var(--text-primary)] opacity-90 font-bold tracking-wide">Circle = Odd (1, 3, 5, 7, 9)</span>
    </div>
    <div className="flex items-center gap-2.5">
      <div className="w-4 h-4 rounded-[3px] bg-slate-400/20 border border-slate-400/30 shadow-sm shadow-black/20"></div>
      <span className="text-xs text-[var(--text-primary)] opacity-90 font-bold tracking-wide">Square = Even (2, 4, 6, 8)</span>
    </div>
  </motion.div>
);

// ─── App ─────────────────────────────────────────────────────────────────────

type Screen = 'menu' | 'game';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('menu');
  const [theme, setTheme]   = useState<'dark' | 'light'>('dark');
  const [showSettings, setShowSettings] = useState(false);

  const {
    isComplete, isPaused, togglePause,
    grid, mode, samuraiGrids,
    setTheme: storeSetTheme,
    seenTutorials, markTutorialSeen, isGenerating
  } = useGameStore();

  const [showTutorial, setShowTutorial] = useState(false);

  // Show tutorial when a game starts and it hasn't been seen
  useEffect(() => {
    if (screen === 'game' && mode && !seenTutorials[mode]) {
      setShowTutorial(true);
      if (!isPaused) togglePause(); // pause game while tutorial is shown
    }
  }, [screen, mode, seenTutorials, isPaused, togglePause]);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
    markTutorialSeen(mode);
    if (isPaused) togglePause();
  }, [mode, markTutorialSeen, isPaused, togglePause]);

  useKeyboard();

  const handleThemeToggle = useCallback(() => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      storeSetTheme(next);
      return next;
    });
  }, [storeSetTheme]);

  const goHome    = useCallback(() => { setScreen('menu'); setShowSettings(false); }, []);
  const newGame   = useCallback(() => { setScreen('menu'); setShowSettings(false); }, []);
  const goToGame  = useCallback(() => setScreen('game'), []);

  const isMultiGrid = (mode === 'samurai' || mode === 'samurai3' || mode === 'samurai4' || mode === 'combo');
  const activeGrid = isMultiGrid ? (samuraiGrids[0] ?? null) : grid;

  const bgStyle: React.CSSProperties = {
    background: theme === 'dark'
      ? 'linear-gradient(150deg, #050b1a 0%, #080e1d 45%, #0c1225 100%)'
      : 'linear-gradient(150deg, #eef2ff 0%, #f0f4ff 45%, #ede9fe 100%)',
  };

  return (
    <div className="min-h-dvh flex flex-col" style={bgStyle}>
      <AmbientBg theme={theme} />

      {/* ── Header ── */}
      <GameHeader
        theme={theme}
        onThemeToggle={handleThemeToggle}
        onNewGame={newGame}
        onSettings={() => setShowSettings(true)}
      />

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.2), transparent)' }} />

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col relative z-0 overflow-x-hidden">
        <AnimatePresence mode="wait">

          {/* ════ MENU ════ */}
          {screen === 'menu' && (
            <motion.div
              key="menu"
              className="flex-1 flex items-start justify-center w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <ModeSelector onStart={goToGame} />
            </motion.div>
          )}

          {/* ════ GAME ════ */}
          {screen === 'game' && (
            <motion.div
              key="game"
              className="flex-1 flex flex-col lg:flex-row items-start justify-center gap-5 px-4 py-5 pb-10 max-w-[1120px] mx-auto w-full"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Board column */}
              <div className="flex-1 flex flex-col items-center gap-4 min-w-0">
                {isMultiGrid ? (
                  <SamuraiBoard />
                ) : activeGrid ? (
                  <>
                    <ModeInfoBadge mode={mode} size={activeGrid.size} />
                    {mode === 'odd-even' && <OddEvenLegend />}
                    <motion.div
                      className="overflow-auto max-w-full flex justify-center"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08, duration: 0.35 }}
                    >
                      <Board grid={activeGrid} gridIndex={0} isFocused />
                    </motion.div>
                    <KeyboardHint />
                  </>
                ) : null}
              </div>

              {/* Keypad column — sticky on large screens */}
              <div className="w-full lg:w-[354px] shrink-0 lg:sticky lg:top-5">
                <motion.div
                  className="glass-card p-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12, duration: 0.3 }}
                >
                  <Keypad />
                </motion.div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── Overlays ── */}
      <AnimatePresence>
        {isComplete && screen === 'game' && (
          <WinOverlay key="win" onNewGame={newGame} onHome={goHome} />
        )}
        {isPaused && !isComplete && screen === 'game' && (
          <PauseOverlay key="pause" onResume={togglePause} onHome={goHome} />
        )}
        {showSettings && (
          <SettingsOverlay key="settings" onClose={() => setShowSettings(false)} />
        )}
        {showTutorial && screen === 'game' && (
          <TutorialOverlay key="tutorial" initialMode={mode} onClose={closeTutorial} />
        )}
        {isGenerating && (
          <motion.div
            key="generating"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex flex-col items-center gap-6 p-10 glass-card border border-white/20 shadow-2xl scale-110">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Generating Puzzle</h2>
                <p className="text-indigo-200/60 text-sm font-medium animate-pulse">Designing your {mode} challenge...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
