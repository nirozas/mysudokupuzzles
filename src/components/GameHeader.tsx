import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Timer, Pause, Play, Eye, EyeOff, Sun, Moon, Settings, Home } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

function formatTime(s: number): string {
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

interface GameHeaderProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  onNewGame: () => void;
  onSettings: () => void;
}



const GameHeader: React.FC<GameHeaderProps> = ({ theme, onThemeToggle, onNewGame, onSettings }) => {
  const {
    elapsedSeconds, isPaused, isStarted, isComplete,
    togglePause, tick, showErrors, toggleShowErrors,
  } = useGameStore();

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isStarted && !isPaused && !isComplete) {
      tickRef.current = setInterval(() => tick(), 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [isStarted, isPaused, isComplete, tick]);

  return (
    <header
      className="relative z-20 w-full flex items-center justify-between px-5 py-3 gap-3"
      style={{
        background: theme === 'dark'
          ? 'rgba(8, 14, 29, 0.85)'
          : 'rgba(240, 244, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col">
          <h1 className="text-lg font-black tracking-tight shimmer-text leading-none select-none">
            My Sudoku
          </h1>
        </div>
      </div>

      {/* ── Timer (center) ── */}
      <div className="flex items-center justify-center gap-2">
        {isStarted && (
          <motion.div
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl glass-card"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <Timer size={13} className="text-[var(--accent-indigo)] shrink-0" />
            <span
              className="timer-display text-sm font-black text-[var(--text-primary)]"
              style={{ minWidth: '56px', textAlign: 'center' }}
            >
              {isPaused ? '– – : – –' : formatTime(elapsedSeconds)}
            </span>
            <motion.button
              id="btn-pause"
              onClick={togglePause}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-0.5 rounded"
              whileTap={{ scale: 0.82 }}
              aria-label={isPaused ? 'Resume game' : 'Pause game'}
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center gap-1">
        {isStarted && (
          <IconBtn
            id="btn-show-errors"
            onClick={toggleShowErrors}
            label={showErrors ? 'Hide Errors' : 'Show Errors'}
            active={showErrors}
          >
            {showErrors ? <Eye size={16} /> : <EyeOff size={16} />}
          </IconBtn>
        )}
        <IconBtn id="btn-new-game" onClick={onNewGame} label="Main Menu">
          <Home size={16} />
        </IconBtn>
        <IconBtn id="btn-settings" onClick={onSettings} label="Settings">
          <Settings size={16} />
        </IconBtn>
        <IconBtn id="btn-theme" onClick={onThemeToggle} label="Toggle Theme">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconBtn>
      </div>
    </header>
  );
};

const IconBtn: React.FC<{
  id: string;
  onClick: () => void;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}> = ({ id, onClick, label, active, children }) => (
  <motion.button
    id={id}
    onClick={onClick}
    className={`p-2 rounded-xl transition-all ${
      active
        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-transparent'
    }`}
    whileTap={{ scale: 0.85 }}
    aria-label={label}
    title={label}
  >
    {children}
  </motion.button>
);

export default GameHeader;
