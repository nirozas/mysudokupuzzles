import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialOverlayProps {
  initialMode: string;
  onClose: () => void;
}

const TUTORIALS = [
  {
    id: 'classic',
    title: 'How to solve Classic Sudoku',
    text: 'Fill all empty squares so that the numbers 1 to 9 appear exactly once in every row, column, and 3x3 box.',
    puzzle: [
      [0, 1, 0, 0, 6, 0, 0, 5, 0],
      [3, 0, 0, 7, 0, 9, 0, 0, 1],
      [0, 0, 8, 0, 2, 0, 9, 0, 0],
      [0, 2, 0, 0, 0, 0, 0, 1, 0],
      [6, 0, 1, 0, 0, 0, 7, 0, 5],
      [0, 9, 0, 0, 0, 0, 0, 4, 0],
      [0, 0, 2, 0, 3, 0, 8, 0, 0],
      [7, 0, 0, 1, 0, 2, 0, 0, 4],
      [0, 3, 0, 0, 5, 0, 0, 2, 0],
    ],
    solution: [
      [2, 1, 9, 3, 6, 8, 4, 5, 7],
      [3, 6, 5, 7, 4, 9, 2, 8, 1],
      [4, 7, 8, 5, 2, 1, 9, 6, 3],
      [5, 2, 3, 9, 7, 4, 6, 1, 8],
      [6, 4, 1, 2, 8, 3, 7, 9, 5],
      [8, 9, 7, 6, 1, 5, 3, 4, 2],
      [1, 5, 2, 4, 3, 6, 8, 7, 9],
      [7, 8, 6, 1, 9, 2, 5, 3, 4],
      [9, 3, 4, 8, 5, 7, 1, 2, 6],
    ]
  },
  {
    id: 'diagonal',
    title: 'How to Solve Diagonal Sudoku',
    text: 'Fill all empty squares so that the numbers 1 to 9 appear exactly once in every row, column, 3x3 box, and the main diagonals.',
    puzzle: [
      [0, 6, 0, 8, 0, 4, 0, 9, 0],
      [2, 0, 0, 0, 0, 0, 0, 0, 7],
      [0, 5, 0, 6, 0, 7, 0, 8, 0],
      [1, 0, 4, 0, 0, 0, 7, 0, 8],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [8, 0, 7, 0, 0, 0, 3, 0, 5],
      [0, 1, 0, 3, 0, 8, 0, 7, 0],
      [3, 0, 0, 0, 0, 0, 0, 0, 6],
      [0, 8, 0, 9, 0, 5, 0, 4, 0],
    ],
    solution: [
      [7, 6, 3, 8, 2, 4, 5, 9, 1],
      [2, 4, 8, 5, 9, 1, 6, 3, 7],
      [9, 5, 1, 6, 3, 7, 2, 8, 4],
      [1, 3, 4, 2, 5, 9, 7, 6, 8],
      [5, 2, 6, 7, 8, 3, 4, 1, 9],
      [8, 9, 7, 4, 1, 6, 3, 2, 5],
      [4, 1, 5, 3, 6, 8, 9, 7, 2],
      [3, 7, 9, 1, 4, 2, 8, 5, 6],
      [6, 8, 2, 9, 7, 5, 1, 4, 3],
    ]
  },
  {
    id: 'irregular',
    title: 'How to Solve Irregular Sudoku',
    text: 'Fill all empty squares so that the numbers 1 to 9 appear exactly once in every row, column, and irregular shaped box.',
    puzzle: [
      [8, 0, 6, 0, 0, 5, 0, 0, 7],
      [0, 7, 3, 0, 2, 0, 0, 4, 0],
      [0, 0, 0, 0, 9, 6, 0, 8, 1],
      [6, 0, 8, 0, 0, 0, 0, 0, 0],
      [0, 5, 7, 0, 0, 0, 8, 2, 0],
      [0, 0, 0, 0, 0, 0, 6, 0, 2],
      [3, 8, 0, 7, 4, 0, 0, 0, 0],
      [0, 4, 0, 0, 8, 0, 2, 1, 0],
      [2, 0, 0, 3, 0, 0, 4, 0, 8],
    ],
    solution: [
      [8, 2, 6, 4, 1, 5, 3, 9, 7],
      [5, 7, 3, 6, 2, 8, 1, 4, 9],
      [4, 3, 5, 2, 9, 6, 7, 8, 1],
      [6, 9, 8, 1, 3, 2, 5, 7, 4],
      [1, 5, 7, 9, 6, 4, 8, 2, 3],
      [9, 1, 4, 8, 5, 7, 6, 3, 2],
      [3, 8, 2, 7, 4, 1, 9, 6, 5],
      [7, 4, 9, 5, 8, 3, 2, 1, 6],
      [2, 6, 1, 3, 7, 9, 4, 5, 8],
    ]
  },
  {
    id: 'odd-even',
    title: 'How to Solve OddEven Sudoku',
    text: 'Fill all empty squares so that the numbers 1 to 9 appear once in every row, column, and 3x3 box, and all shaded squares contain either odd or even numbers according to the given clues.',
    puzzle: [
      [0, 4, 2, 1, 9, 7, 8, 0, 0],
      [0, 8, 0, 0, 0, 0, 0, 1, 0],
      [0, 0, 2, 0, 0, 0, 5, 0, 0],
      [0, 0, 0, 0, 9, 0, 0, 0, 0],
      [0, 3, 0, 0, 8, 0, 0, 7, 0],
      [0, 0, 0, 0, 6, 0, 0, 0, 0],
      [0, 0, 6, 0, 0, 0, 4, 0, 0],
      [0, 9, 0, 0, 0, 0, 0, 6, 0],
      [0, 4, 3, 6, 5, 7, 8, 2, 0],
    ],
    solution: [
      [3, 5, 4, 2, 1, 9, 7, 8, 6],
      [7, 8, 9, 5, 4, 6, 2, 1, 3],
      [6, 1, 2, 8, 7, 3, 5, 9, 4],
      [8, 6, 7, 3, 9, 5, 1, 4, 2],
      [9, 3, 1, 4, 8, 2, 6, 7, 5],
      [4, 2, 5, 7, 6, 1, 9, 3, 8],
      [2, 7, 6, 9, 3, 8, 4, 5, 1],
      [5, 9, 8, 1, 2, 4, 3, 6, 7],
      [1, 4, 3, 6, 5, 7, 8, 2, 9],
    ]
  },
  {
    id: 'mega',
    title: 'How to Solve Mega Sudoku',
    text: 'Fill all empty squares so that the numbers 1 to 16 appear exactly once in every row, column, and 4x4 box.',
    puzzle: [], // simplified for mega, just text
    solution: []
  }
];

const MiniGrid: React.FC<{ data: number[][], isSolution?: boolean, type: string }> = ({ data, isSolution, type }) => {
  if (!data || data.length === 0) return <div className="w-40 h-40 bg-white/10 rounded flex items-center justify-center">16x16 Grid</div>;
  
  const size = data.length;
  const isMega = size === 16;
  const cellSize = isMega ? 12 : 24;

  return (
    <div 
      className="bg-white border-2 border-black grid"
      style={{
        gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${size}, ${cellSize}px)`,
        gap: '1px',
        backgroundColor: 'black'
      }}
    >
      {data.map((row, r) => 
        row.map((val, c) => {
          let bg = 'white';
          if (type === 'odd-even' && (r+c)%2 === 0) bg = '#e0e0e0';
          
          return (
            <div 
              key={`${r}-${c}`}
              className="flex items-center justify-center font-bold text-black"
              style={{
                backgroundColor: bg,
                fontSize: isMega ? '8px' : '12px'
              }}
            >
              {val !== 0 ? val : ''}
            </div>
          );
        })
      )}
    </div>
  );
};

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ initialMode, onClose }) => {
  const startIndex = Math.max(0, TUTORIALS.findIndex(t => t.id === initialMode || (initialMode.includes('samurai') && t.id === 'classic')));
  const [index, setIndex] = useState(startIndex);
  const current = TUTORIALS[index];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-[#1c1c1e] text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="w-16" /> {/* spacer */}
        <h1 className="text-xl font-bold tracking-widest">Tutorial</h1>
        <button onClick={onClose} className="text-blue-400 font-semibold w-16 text-right">
          Close
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center w-full"
          >
            <h2 className="text-3xl font-bold mb-10 text-center whitespace-pre-line leading-tight">
              {current.title}
            </h2>

            <div className="flex gap-8 mb-12">
              <div className="flex flex-col items-center gap-4">
                <MiniGrid data={current.puzzle} type={current.id} />
                <span className="text-white/80">Puzzle</span>
              </div>
              <div className="flex flex-col items-center gap-4">
                <MiniGrid data={current.solution} isSolution type={current.id} />
                <span className="text-white/80">Solution</span>
              </div>
            </div>

            <p className="text-lg text-center text-white/90 leading-relaxed max-w-xl">
              {current.text}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-3 p-8">
        {TUTORIALS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setIndex(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === index ? 'bg-blue-500' : 'bg-white/20'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </motion.div>
  );
};
