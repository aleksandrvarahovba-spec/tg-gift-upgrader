import React from 'react';
import { useGame } from '../context/GameContext';
import { Radio } from 'lucide-react';

export const LiveDropsBar: React.FC = () => {
  const { liveDrops } = useGame();

  if (!liveDrops || liveDrops.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-slate-950/80 border-b border-tg-border/40 py-1.5 px-3 overflow-hidden select-none">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {/* Live indicator badge */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 shrink-0">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">LIVE</span>
        </div>

        {/* Scrolling items track */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
          {liveDrops.map((drop) => {
            const isWon = drop.isWon;
            return (
              <div
                key={drop.id}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-xl shrink-0 transition ${
                  isWon
                    ? 'bg-slate-900/90 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                    : 'bg-slate-900/50 border border-slate-800/80 opacity-60'
                }`}
              >
                {/* Target Gift Icon */}
                <img
                  src={drop.targetGift.imageUrl}
                  alt={drop.targetGift.name}
                  className="w-5 h-5 rounded-md object-contain"
                />

                {/* Details */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-300 font-semibold truncate max-w-[80px]">
                    {drop.userFirstName}
                  </span>
                  <span
                    className={`font-mono text-[11px] font-bold px-1 rounded ${
                      isWon
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/15 text-rose-400 line-through'
                    }`}
                  >
                    x{drop.multiplier.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
