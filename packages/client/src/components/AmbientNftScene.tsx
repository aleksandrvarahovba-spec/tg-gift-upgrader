import React, { useState } from 'react';
import { sound } from '../services/soundEngine';

export const AmbientNftScene: React.FC = () => {
  const [clickedItem, setClickedItem] = useState<string | null>(null);

  const handleInteract = (id: string, soundPitch = 1.4) => {
    sound.playTick(soundPitch);
    setClickedItem(id);
    setTimeout(() => setClickedItem(null), 1200);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden select-none">
      {/* =========================================================================
          1. PLUSH PEPE PEEKER (Left Edge Mascot - Grail 1 из 1K)
          ========================================================================= */}
      <div
        className="pointer-events-auto absolute left-0 top-[24%] sm:top-[26%] -translate-x-6 sm:-translate-x-4 hover:translate-x-2 transition-all duration-300 cursor-pointer group z-20"
        onClick={() => handleInteract('pepe', 1.6)}
      >
        <div className="relative animate-peek-left group-hover:scale-115 transition-transform">
          {/* Speech Bubble */}
          <div
            className={`absolute -top-10 left-10 bg-slate-900/95 border border-emerald-500/60 shadow-xl shadow-emerald-500/25 text-emerald-300 font-mono text-[11px] font-black px-3 py-1 rounded-xl whitespace-nowrap transition-all duration-200 z-30 ${
              clickedItem === 'pepe' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
            }`}
          >
            {clickedItem === 'pepe' ? '🐸 Plush Pepe 1 из 1K! $1,820!' : '🐸 Пепе верит в твой апгрейд!'}
          </div>

          <div className="w-24 h-24 sm:w-28 sm:h-28 p-1 filter drop-shadow-[0_0_25px_rgba(16,185,129,0.65)]">
            <img
              src="/gifts/plushpepe-1821.png"
              alt="Plush Pepe"
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. DUROV'S CAP (Right Edge Mascot - 1 из 4.7K)
          ========================================================================= */}
      <div
        className="pointer-events-auto absolute right-0 top-[24%] sm:top-[26%] translate-x-6 sm:translate-x-4 hover:-translate-x-2 transition-all duration-300 cursor-pointer group z-20"
        onClick={() => handleInteract('cap', 1.4)}
      >
        <div className="relative animate-peek-right group-hover:scale-115 transition-transform">
          {/* Speech Bubble */}
          <div
            className={`absolute -top-10 right-10 bg-slate-900/95 border border-cyan-500/60 shadow-xl shadow-cyan-500/25 text-cyan-300 font-mono text-[11px] font-black px-3 py-1 rounded-xl whitespace-nowrap transition-all duration-200 z-30 ${
              clickedItem === 'cap' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
            }`}
          >
            {clickedItem === 'cap' ? '🧢 Durov’s Cap 1 из 4.7K! $450!' : '✈️ Крылатая кепка Павла Дурова!'}
          </div>

          <div className="w-24 h-24 sm:w-28 sm:h-28 p-1 filter drop-shadow-[0_0_25px_rgba(6,182,212,0.65)]">
            <img
              src="/gifts/durovscap-1640.png"
              alt="Durov Cap"
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. SWISS WATCH (Top Left Floating - 1 из 5K)
          ========================================================================= */}
      <div
        className="pointer-events-auto absolute left-[8%] top-[15%] hidden lg:block cursor-pointer group z-10"
        onClick={() => handleInteract('watch', 2.0)}
      >
        <div className="relative animate-float-slow group-hover:scale-120 transition-transform">
          <div
            className={`absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-indigo-500/60 shadow-xl shadow-indigo-500/25 text-indigo-300 font-mono text-[10px] font-black px-2.5 py-1 rounded-lg whitespace-nowrap transition-all duration-200 z-30 ${
              clickedItem === 'watch' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
            }`}
          >
            ⌚ Swiss Watch $460 (89 TON)
          </div>

          <div className="w-20 h-20 filter drop-shadow-[0_0_22px_rgba(99,102,241,0.65)]">
            <img
              src="/gifts/swisswatch-7799.png"
              alt="Swiss Watch"
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. HEART LOCKET (Top Right Floating - Grail 1 из 500)
          ========================================================================= */}
      <div
        className="pointer-events-auto absolute right-[8%] top-[15%] hidden lg:block cursor-pointer group z-10"
        onClick={() => handleInteract('locket', 1.8)}
      >
        <div className="relative animate-float-delayed group-hover:scale-120 transition-transform">
          <div
            className={`absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-rose-500/60 shadow-xl shadow-rose-500/25 text-rose-300 font-mono text-[10px] font-black px-2.5 py-1 rounded-lg whitespace-nowrap transition-all duration-200 z-30 ${
              clickedItem === 'locket' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
            }`}
          >
            💖 Heart Locket $4,420 (850 TON)
          </div>

          <div className="w-20 h-20 filter drop-shadow-[0_0_22px_rgba(244,63,94,0.7)]">
            <img
              src="/gifts/heartlocket-875.png"
              alt="Heart Locket"
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. PRECIOUS PEACH (Bottom Left Floating - 1 из 5K)
          ========================================================================= */}
      <div
        className="pointer-events-auto absolute left-[6%] bottom-[15%] hidden md:block cursor-pointer group z-10"
        onClick={() => handleInteract('peach', 1.5)}
      >
        <div className="relative animate-float-delayed group-hover:scale-120 transition-transform">
          <div
            className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-amber-500/60 shadow-xl shadow-amber-500/25 text-amber-300 font-mono text-[10px] font-black px-2.5 py-1 rounded-lg whitespace-nowrap transition-all duration-200 z-30 ${
              clickedItem === 'peach' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
            }`}
          >
            🍑 Precious Peach $440 (85 TON)
          </div>

          <div className="w-20 h-20 filter drop-shadow-[0_0_22px_rgba(251,146,60,0.65)]">
            <img
              src="/gifts/preciouspeach-881.png"
              alt="Precious Peach"
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          6. SCARED CAT (Bottom Right Floating - 1 из 10K)
          ========================================================================= */}
      <div
        className="pointer-events-auto absolute right-[6%] bottom-[15%] hidden md:block cursor-pointer group z-10"
        onClick={() => handleInteract('cat', 1.7)}
      >
        <div className="relative animate-float-slow group-hover:scale-120 transition-transform">
          <div
            className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-purple-500/60 shadow-xl shadow-purple-500/25 text-purple-300 font-mono text-[10px] font-black px-2.5 py-1 rounded-lg whitespace-nowrap transition-all duration-200 z-30 ${
              clickedItem === 'cat' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
            }`}
          >
            🐱 Scared Cat $335 (65 TON)
          </div>

          <div className="w-20 h-20 filter drop-shadow-[0_0_22px_rgba(168,85,247,0.65)]">
            <img
              src="/gifts/scaredcat-3005.png"
              alt="Scared Cat"
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
            />
          </div>
        </div>
      </div>

      {/* Ambient drifting sparkles */}
      <div className="absolute top-[20%] left-[26%] w-2 h-2 rounded-full bg-cyan-400 opacity-30 animate-pulse pointer-events-none" />
      <div className="absolute top-[24%] right-[24%] w-2 h-2 rounded-full bg-rose-400 opacity-30 animate-ping pointer-events-none" />
      <div className="absolute bottom-[26%] left-[22%] w-1.5 h-1.5 rounded-full bg-amber-400 opacity-40 animate-pulse pointer-events-none" />
      <div className="absolute bottom-[30%] right-[26%] w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-40 animate-ping pointer-events-none" />
    </div>
  );
};
