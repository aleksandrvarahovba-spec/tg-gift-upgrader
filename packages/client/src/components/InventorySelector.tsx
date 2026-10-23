import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { sound } from '../services/soundEngine';
import { Gift, PlusCircle, Sparkles, ArrowUpDown } from 'lucide-react';
import { TelegramGiftCard } from './TelegramGiftCard';

export const InventorySelector: React.FC = () => {
  const { inventory, selectedItem, setSelectedItem, isUpgrading } = useGame();
  const { claimDemoGift } = useAuth();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSelectItem = (item: any) => {
    if (isUpgrading) return;
    sound.playClick();
    setSelectedItem(item);
  };

  const handleClaimDemo = async () => {
    await claimDemoGift();
  };

  const sortedItems = useMemo(() => {
    return [...inventory].sort((a, b) => {
      return sortOrder === 'asc'
        ? a.gift.price - b.gift.price
        : b.gift.price - a.gift.price;
    });
  }, [inventory, sortOrder]);

  return (
    <div className="flex flex-col h-full glass-card rounded-3xl p-3.5 border border-tg-border/70 shadow-xl">
      {/* Title Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-tg-border/50">
        <div className="flex items-center gap-1.5">
          <Gift className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-200">
            Инвентарь ({inventory.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Sort button */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title="Сортировка по цене"
            className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          {/* Claim Demo Button */}
          <button
            onClick={handleClaimDemo}
            disabled={isUpgrading}
            title="Получить бесплатный демо-подарок для теста"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 hover:border-emerald-400 text-[11px] font-black text-emerald-300 hover:text-emerald-200 active:scale-95 transition shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Демо-подарок</span>
          </button>
        </div>
      </div>

      {/* Grid of items */}
      <div className="flex-1 overflow-y-auto max-h-[260px] md:max-h-[360px] pr-1">
        {inventory.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center p-4 text-center">
            <Gift className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-xs text-slate-400 mb-3">У вас нет доступных подарков</p>
            <button
              onClick={handleClaimDemo}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-cyan-500/25 active:scale-95 transition"
            >
              <Sparkles className="w-4 h-4" />
              Получить демо-подарок
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sortedItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <TelegramGiftCard
                  key={item.id}
                  gift={item.gift}
                  isSelected={isSelected}
                  onClick={() => handleSelectItem(item)}
                  size="sm"
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
