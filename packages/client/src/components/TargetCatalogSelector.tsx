import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { sound } from '../services/soundEngine';
import { Target, Search, X } from 'lucide-react';
import { TelegramGiftCard } from './TelegramGiftCard';
import { calculateUpgradeMath } from '@upgrader/shared';

export const TargetCatalogSelector: React.FC = () => {
  const { gifts, selectedItem, selectedTarget, setSelectedTarget, isUpgrading } = useGame();
  const [filterRarity, setFilterRarity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Counts per tier
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: gifts.length,
      LEGENDARY: 0,
      EPIC: 0,
      RARE: 0,
      UNCOMMON: 0,
      COMMON: 0,
    };
    gifts.forEach((g) => {
      if (counts[g.rarity] !== undefined) {
        counts[g.rarity]++;
      }
    });
    return counts;
  }, [gifts]);

  const filteredGifts = useMemo(() => {
    return gifts.filter((g) => {
      const matchRarity = filterRarity === 'ALL' || g.rarity === filterRarity;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        g.name.toLowerCase().includes(q) ||
        (g.backdropName && g.backdropName.toLowerCase().includes(q)) ||
        g.collection.toLowerCase().includes(q);
      return matchRarity && matchSearch;
    });
  }, [gifts, filterRarity, searchQuery]);

  const handleSelectTarget = (target: any) => {
    if (isUpgrading) return;
    sound.playTap();
    setSelectedTarget(target);
  };

  const tabs = [
    { id: 'ALL', label: 'Все', count: tierCounts.ALL },
    { id: 'LEGENDARY', label: 'Mythic', count: tierCounts.LEGENDARY },
    { id: 'EPIC', label: 'Epic', count: tierCounts.EPIC },
    { id: 'RARE', label: 'Rare', count: tierCounts.RARE },
    { id: 'UNCOMMON', label: 'Uncommon', count: tierCounts.UNCOMMON },
    { id: 'COMMON', label: 'Common', count: tierCounts.COMMON },
  ];

  return (
    <div className="flex flex-col h-full glass-card rounded-3xl p-3.5 border border-tg-border/70 shadow-xl">
      {/* Title Header with Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-tg-border/50">
        <div className="flex items-center gap-1.5">
          <Target className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-200">
            Каталог целей
          </span>
          <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800/60">
            {filteredGifts.length} из {gifts.length}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по названию или фону..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-56 pl-8 pr-7 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/70 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Rarity filter pills with counter badges */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2.5">
        {tabs.map((tab) => {
          const isActive = filterRarity === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sound.playTap();
                setFilterRarity(tab.id);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase shrink-0 transition active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-black/40 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Gifts Grid */}
      <div className="flex-1 overflow-y-auto max-h-[300px] md:max-h-[420px] pr-1">
        {filteredGifts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Подарков не найдено по запросу «{searchQuery}»
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {filteredGifts.map((gift) => {
              const isSelected = selectedTarget?.id === gift.id;

              // Calculate potential chance if an item is selected
              let chanceBadge = undefined;
              if (selectedItem) {
                const m = calculateUpgradeMath(selectedItem.gift.price, gift.price);
                chanceBadge = { value: m.displayChance, isValid: m.isValid };
              }

              return (
                <TelegramGiftCard
                  key={gift.id}
                  gift={gift}
                  isSelected={isSelected}
                  onClick={() => handleSelectTarget(gift)}
                  chanceBadge={chanceBadge}
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
