import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Clock, RotateCcw, Home } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ─── Confetti ──────────────────────────────────────────────────────────────────

function launchConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 180 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 6 + 3,
    d: Math.random() * 180,
    color: `hsl(${Math.random() * 360}, 80%, 65%)`,
    tilt: Math.random() * 10 - 10,
    tiltAngle: 0,
    tiltAngleIncremental: Math.random() * 0.07 + 0.05,
  }));

  let frame = 0;
  const max = 200;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
      ctx.stroke();

      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(frame / 10);
      p.tilt = Math.sin(p.tiltAngle) * 15;
    });
    frame++;
    if (frame < max) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

// ─── Win Overlay ──────────────────────────────────────────────────────────────

interface OverlayProps {
  onNewGame: () => void;
  onHome: () => void;
}

export const WinOverlay: React.FC<OverlayProps> = ({ onNewGame, onHome }) => {
  const { elapsedSeconds, difficulty, mode } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stars] = useState(() => {
    if (elapsedSeconds < 120) return 3;
    if (elapsedSeconds < 300) return 2;
    return 1;
  });

  useEffect(() => {
    if (canvasRef.current) {
      setTimeout(() => launchConfetti(canvasRef.current!), 300);
    }
  }, []);

  return (
    <>
      <canvas id="confetti-canvas" ref={canvasRef} />
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Card */}
        <motion.div
          className="relative z-10 glass-card p-8 max-w-sm w-full mx-4 text-center"
          initial={{ scale: 0.7, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.15 }}
        >
          {/* Trophy */}
          <motion.div
            className="text-6xl mb-4"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.3 }}
          >
            🏆
          </motion.div>

          <h2 className="text-3xl font-black text-white mb-1">Solved!</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            {mode.charAt(0).toUpperCase() + mode.slice(1)} — {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </p>

          {/* Stars */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: i <= stars ? 1 : 0.6, rotate: 0 }}
                transition={{ delay: 0.4 + i * 0.1, type: 'spring', stiffness: 350 }}
              >
                <Star
                  size={32}
                  className={i <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}
                />
              </motion.div>
            ))}
          </div>

          {/* Time */}
          <div className="flex items-center justify-center gap-2 mb-6 py-3 rounded-xl bg-[var(--bg-secondary)]">
            <Clock size={16} className="text-indigo-400" />
            <span className="font-mono font-bold text-xl text-white">{formatTime(elapsedSeconds)}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              id="btn-win-home"
              onClick={onHome}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                bg-[var(--bg-secondary)] border border-[var(--border-cell)] text-[var(--text-secondary)]
                hover:text-[var(--text-primary)] hover:border-[var(--border-box)] transition-all font-semibold text-sm"
              whileTap={{ scale: 0.96 }}
            >
              <Home size={15} /> Menu
            </motion.button>
            <motion.button
              id="btn-win-new"
              onClick={onNewGame}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm
                shadow-lg shadow-indigo-500/30"
              whileTap={{ scale: 0.96 }}
            >
              <RotateCcw size={15} /> Play Again
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

// ─── Pause Overlay ─────────────────────────────────────────────────────────────

interface PauseOverlayProps {
  onResume: () => void;
  onHome: () => void;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({ onResume, onHome }) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <motion.div
        className="relative z-10 glass-card p-8 max-w-xs w-full mx-4 text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      >
        <div className="text-5xl mb-4">⏸</div>
        <h2 className="text-2xl font-black text-white mb-6">Paused</h2>
        <div className="flex gap-3 flex-col">
          <motion.button
            id="btn-resume"
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600
              text-white font-bold shadow-lg shadow-indigo-500/30"
            whileTap={{ scale: 0.97 }}
          >
            ▶ Resume
          </motion.button>
          <motion.button
            id="btn-pause-home"
            onClick={onHome}
            className="w-full py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-cell)]
              text-[var(--text-secondary)] font-semibold text-sm hover:text-[var(--text-primary)] transition-all"
            whileTap={{ scale: 0.97 }}
          >
            ⌂ Main Menu
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Settings Overlay ─────────────────────────────────────────────────────────

interface SettingsOverlayProps {
  onClose: () => void;
}

export const SettingsOverlay: React.FC<SettingsOverlayProps> = ({ onClose }) => {
  const { showErrors, autoNotes, highlightSimilar, toggleShowErrors, toggleAutoNotes, toggleHighlightSimilar, revealBoard } = useGameStore();

  const toggles = [
    { id: 'setting-errors', label: 'Show Errors', desc: 'Highlight incorrect entries in red', value: showErrors, toggle: toggleShowErrors },
    { id: 'setting-autonotes', label: 'Auto-clear Notes', desc: 'Remove pencil marks when a number is placed', value: autoNotes, toggle: toggleAutoNotes },
    { id: 'setting-highlight', label: 'Highlight Similar', desc: 'Highlight all instances of selected number', value: highlightSimilar, toggle: toggleHighlightSimilar },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        className="relative z-10 glass-card p-6 max-w-sm w-full mx-4"
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-black text-[var(--text-primary)] mb-5">Settings</h2>

        <div className="flex flex-col gap-3 mb-6">
          {toggles.map(t => (
            <div key={t.id} className="flex items-center justify-between py-3 border-b border-[var(--border-cell)]">
              <div>
                <div className="font-semibold text-sm text-[var(--text-primary)]">{t.label}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">{t.desc}</div>
              </div>
              <motion.button
                id={t.id}
                onClick={t.toggle}
                className={`relative w-12 h-6 rounded-full transition-colors ${t.value ? 'bg-indigo-600' : 'bg-[var(--border-cell)]'}`}
                whileTap={{ scale: 0.92 }}
                aria-checked={t.value}
                role="switch"
              >
                <motion.div
                  className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow"
                  animate={{ x: t.value ? 24 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <motion.button
            id="btn-reveal-board"
            onClick={() => { revealBoard(); onClose(); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-amber-400
              border border-amber-600/40 bg-amber-600/10 hover:bg-amber-600/20 transition-all"
            whileTap={{ scale: 0.97 }}
          >
            💡 Reveal Board
          </motion.button>
          <motion.button
            id="btn-close-settings"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white
              bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20"
            whileTap={{ scale: 0.97 }}
          >
            Done
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
