/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Timer, 
  RefreshCw, 
  Play, 
  Info, 
  CheckCircle2, 
  XCircle,
  ChevronRight,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

type GameStatus = 'idle' | 'playing' | 'gameover';

interface Color {
  h: number;
  s: number;
  l: number;
}

// --- Constants ---

const GRID_SIZE = 5;
const INITIAL_DELTA = 15; // Initial difference in lightness or hue
const MIN_DELTA = 1.5;    // Minimum difference for high difficulty
const TIME_LIMIT = 60;    // Seconds

// --- Helpers ---

const generateRandomColor = (): Color => ({
  h: Math.floor(Math.random() * 360),
  s: 40 + Math.floor(Math.random() * 40), // 40-80% saturation
  l: 40 + Math.floor(Math.random() * 30), // 40-70% lightness
});

const colorToCss = (color: Color) => `hsl(${color.h}, ${color.s}%, ${color.l}%)`;

const getDifferentColor = (base: Color, delta: number): Color => {
  // Randomly decide whether to change hue or lightness
  const changeHue = Math.random() > 0.5;
  
  if (changeHue) {
    return {
      ...base,
      h: (base.h + delta) % 360
    };
  } else {
    // Ensure lightness doesn't go out of bounds
    const newL = base.l + (base.l > 50 ? -delta : delta);
    return {
      ...base,
      l: Math.max(0, Math.min(100, newL))
    };
  }
};

// --- Components ---

const COLOR_FACTS = [
  "人类的眼睛可以分辨大约 1000 万种不同的颜色。",
  "训练您的“最小可觉差”(JND) 阈值可以提高您在作品中创造深度的能力。",
  "眼睛中的视杆细胞处理弱光，而视锥细胞处理色彩和细节。",
  "四色视觉是一种状况，有些人能比普通人多看到 100 倍的颜色。",
  "“品红色”在光谱中并不存在；它是你的大脑凭空创造出来的。",
  "艺术生通过练习，通常会对微妙的色相偏移产生更高的敏感度。"
];

export default function App() {
  const [status, setStatus] = useState<GameStatus>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [grid, setGrid] = useState<{ color: Color; isTarget: boolean }[]>([]);
  const [level, setLevel] = useState(1);
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem('chromavision_best');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [lastClickResult, setLastClickResult] = useState<'correct' | 'wrong' | null>(null);
  const [factIndex, setFactIndex] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Rotate fact every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex(prev => (prev + 1) % COLOR_FACTS.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Generate a new grid
  const generateGrid = useCallback(() => {
    const baseColor = generateRandomColor();
    // Difficulty formula: delta decreases as score increases
    const currentDelta = Math.max(MIN_DELTA, INITIAL_DELTA - (score * 0.4));
    const targetColor = getDifferentColor(baseColor, currentDelta);
    const targetIndex = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));

    const newGrid = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
      color: i === targetIndex ? targetColor : baseColor,
      isTarget: i === targetIndex,
    }));

    setGrid(newGrid);
  }, [score]);

  // Start Game
  const startGame = () => {
    setScore(0);
    setLevel(1);
    setTimeLeft(TIME_LIMIT);
    setStatus('playing');
    setLastClickResult(null);
    generateGrid();
  };

  // Handle Block Click
  const handleBlockClick = (isTarget: boolean) => {
    if (status !== 'playing') return;

    if (isTarget) {
      setScore(prev => prev + 1);
      setLevel(prev => prev + 1);
      setLastClickResult('correct');
      generateGrid();
      // Small time bonus for correct answer
      setTimeLeft(prev => Math.min(TIME_LIMIT, prev + 1));
      
      // Visual feedback
      setTimeout(() => setLastClickResult(null), 500);
    } else {
      setLastClickResult('wrong');
      // Penalty for wrong answer
      setTimeLeft(prev => Math.max(0, prev - 3));
      setTimeout(() => setLastClickResult(null), 500);
    }
  };

  // Timer Logic
  useEffect(() => {
    if (status === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && status === 'playing') {
      setStatus('gameover');
      if (score > bestScore) {
        setBestScore(score);
        localStorage.setItem('chromavision_best', score.toString());
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, timeLeft, score, bestScore]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-400 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-orange-400 blur-[120px]" />
      </div>

      <main className="w-full max-w-2xl bg-white brutalist-border p-6 md:p-10 relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-6xl font-serif font-black italic tracking-tighter leading-none mb-2">
              CHROMA<br />VISION
            </h1>
            <p className="text-xs font-mono uppercase tracking-widest text-[#1A1A1A]/60">
              艺术生色彩敏感度测试协议 v1.0
            </p>
          </div>

          <div className="flex gap-4 items-center">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono uppercase text-[#1A1A1A]/50">最高得分</span>
              <span className="text-2xl font-black font-mono">{bestScore}</span>
            </div>
            <div className="h-10 w-[1px] bg-[#1A1A1A]/20" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono uppercase text-[#1A1A1A]/50">当前得分</span>
              <span className="text-2xl font-black font-mono">{score}</span>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="relative aspect-square w-full mb-8">
          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-[#F5F5F0]"
              >
                <Eye className="w-16 h-16 mb-4 text-[#1A1A1A]" />
                <h2 className="text-2xl font-bold mb-4">准备好测试你的眼力了吗？</h2>
                <p className="text-sm text-[#1A1A1A]/70 mb-8 max-w-sm">
                  找出颜色稍有不同的色块。
                  随着进度的推进，差异会越来越小。
                  点错一次扣除 3 秒。
                </p>
                <button 
                  onClick={startGame}
                  className="brutalist-button flex items-center gap-2 text-lg"
                >
                  <Play className="w-5 h-5 fill-current" />
                  开始挑战
                </button>
              </motion.div>
            )}

            {status === 'playing' && (
              <motion.div 
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 grid grid-cols-5 gap-2 md:gap-3"
              >
                {grid.map((item, idx) => (
                  <motion.button
                    key={`${level}-${idx}`}
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBlockClick(item.isTarget)}
                    className="w-full h-full rounded-sm brutalist-border transition-shadow hover:shadow-none"
                    style={{ backgroundColor: colorToCss(item.color) }}
                  />
                ))}
                
                {/* Feedback Overlays */}
                <AnimatePresence>
                  {lastClickResult === 'correct' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 pointer-events-none flex items-center justify-center bg-green-500/20 z-10"
                    >
                      <CheckCircle2 className="w-24 h-24 text-green-600" />
                    </motion.div>
                  )}
                  {lastClickResult === 'wrong' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 pointer-events-none flex items-center justify-center bg-red-500/20 z-10"
                    >
                      <XCircle className="w-24 h-24 text-red-600" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {status === 'gameover' && (
              <motion.div 
                key="gameover"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-[#1A1A1A] text-white"
              >
                <Trophy className="w-16 h-16 mb-4 text-yellow-400" />
                <h2 className="text-4xl font-black mb-2 font-serif italic">时间到！</h2>
                <div className="mb-8">
                  <p className="text-sm font-mono uppercase opacity-60">最终得分</p>
                  <p className="text-6xl font-black font-mono">{score}</p>
                </div>
                
                {score >= bestScore && score > 0 && (
                  <div className="mb-6 px-4 py-1 bg-yellow-400 text-[#1A1A1A] font-bold text-xs uppercase tracking-widest">
                    打破个人纪录！
                  </div>
                )}

                <button 
                  onClick={startGame}
                  className="brutalist-button text-[#1A1A1A] flex items-center gap-2 text-lg"
                >
                  <RefreshCw className="w-5 h-5" />
                  再试一次
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between border-t-2 border-[#1A1A1A] pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1A1A1A] text-white rounded-sm">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-[#1A1A1A]/50 leading-none mb-1">剩余时间</p>
              <p className={cn(
                "text-xl font-black font-mono leading-none",
                timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-[#1A1A1A]"
              )}>
                {timeLeft}秒
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-[10px] font-mono uppercase text-[#1A1A1A]/50 leading-none mb-1">当前等级</p>
              <p className="text-xl font-black font-mono leading-none">{level}</p>
            </div>
            <div className="p-2 bg-[#1A1A1A] text-white rounded-sm">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Color Science Info */}
        <div className="mt-8 p-4 bg-[#F5F5F0] border border-[#1A1A1A]/10 rounded-sm flex gap-4 items-start min-h-[80px]">
          <Info className="w-5 h-5 text-[#1A1A1A]/40 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase mb-1">色彩科学小知识</h4>
            <AnimatePresence mode="wait">
              <motion.p 
                key={factIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-[11px] text-[#1A1A1A]/60 leading-relaxed italic"
              >
                {COLOR_FACTS[factIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Mobile Instructions */}
      <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.2em] text-[#1A1A1A]/40 text-center max-w-xs">
        专为高色域显示器优化。
        请确保屏幕亮度至少在 80% 以上以获得最佳体验。
      </p>
    </div>
  );
}
