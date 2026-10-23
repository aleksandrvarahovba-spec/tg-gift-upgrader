import React from 'react';
import { useGame } from '../context/GameContext';
import { sound } from '../services/soundEngine';
import { CheckCircle2, XCircle, Sparkles, RefreshCw, DollarSign, Shield } from 'lucide-react';
import { RARITY_CONFIG } from '@upgrader/shared';

export const WinCelebrationModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { upgradeResult, sellInventoryItem, setActiveTab } = useGame();

  if (!isOpen || !upgradeResult) return null;

  const isWon = upgradeResult.isWon;
  const wonItem = upgradeResult.wonInventoryItem;
  const sourceItem = upgradeResult.sourceInventoryItem;
  const rarityStyle = wonItem ? (RARITY_CONFIG[wonItem.gift.rarity] || RARITY_CONFIG.COMMON) : null;

  const handleSellWonItem = async () => {
    if (!wonItem) return;
    await sellInventoryItem(wonItem.id);
    onClose();
  };

  const handleVerifyGame = () => {
    onClose();
    setActiveTab('provably_fair');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full max-w-sm rounded-3xl p-6 border shadow-2xl overflow-hidden text-center transition-all ${
          isWon
            ? 'glass-panel border-emerald-500/50 glow-green'
            : 'glass-panel border-rose-500/40 glow-red'
        }`}
      >
        {/* Glow backdrop */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isWon ? 'bg-emerald-500/30' : 'bg-rose-500/20'
          }`}
        />

        {/* Status Icon */}
        <div className="flex justify-center mb-3">
          {isWon ? (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <XCircle className="w-10 h-10" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase">
          {isWon ? 'УСПЕШНЫЙ АПГРЕЙД!' : 'ПРЕДМЕТ СГОРЕЛ'}
        </h2>

        <p className="text-xs text-slate-400 mt-1 mb-4 font-mono">
          Roll: <span className="font-bold text-slate-200">{upgradeResult.roll.toFixed(4)}%</span> | Шанс: <span className="font-bold text-cyan-400">{upgradeResult.chance.toFixed(2)}%</span>
        </p>

        {/* Won or Lost Card */}
        {isWon && wonItem ? (
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 mb-4 shadow-lg flex flex-col items-center">
            <div className="w-20 h-20 mb-2 flex items-center justify-center">
              <img
                src={wonItem.gift.imageUrl}
                alt={wonItem.gift.name}
                className="w-full h-full object-contain filter drop-shadow-xl animate-pulse"
              />
            </div>
            <span className="font-extrabold text-base text-slate-100">{wonItem.gift.name}</span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full"
                style={{ color: rarityStyle?.color, backgroundColor: `${rarityStyle?.color}20` }}
              >
                {wonItem.gift.rarity}
              </span>
              <span className="text-sm font-mono font-bold text-emerald-300">
                ${wonItem.gift.price.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 mb-4 flex flex-col items-center opacity-70">
            <div className="w-16 h-16 mb-2 flex items-center justify-center grayscale">
              <img
                src={sourceItem.gift.imageUrl}
                alt={sourceItem.gift.name}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-xs text-slate-400 line-through">
              {sourceItem.gift.name} (${sourceItem.gift.price.toFixed(2)})
            </span>
          </div>
        )}

        {/* Provably Fair Badge */}
        <div
          onClick={handleVerifyGame}
          className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 cursor-pointer transition mb-4"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Provably Fair: Проверить криптографический хеш</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {isWon && wonItem && (
            <button
              onClick={handleSellWonItem}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Продать за 95% (${(wonItem.gift.price * 0.95).toFixed(2)})
            </button>
          )}

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            Продолжить игру
          </button>
        </div>
      </div>
    </div>
  );
};
