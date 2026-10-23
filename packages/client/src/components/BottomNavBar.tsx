import React from 'react';
import { useGame } from '../context/GameContext';
import { sound } from '../services/soundEngine';
import { useTelegram } from '../hooks/useTelegram';
import { Zap, ShoppingBag, ShieldCheck, Swords, Gift } from 'lucide-react';

export const BottomNavBar: React.FC = () => {
  const { activeTab, setActiveTab, isUpgrading } = useGame();
  const { haptic } = useTelegram();

  const tabs = [
    { id: 'upgrade', label: 'Апгрейд', icon: Zap },
    { id: 'pvp', label: '⚔️ Битва', icon: Swords },
    { id: 'bonuses', label: '🎁 Бонусы', icon: Gift },
    { id: 'inventory_shop', label: 'Маркет', icon: ShoppingBag },
    { id: 'provably_fair', label: 'Честность', icon: ShieldCheck },
  ] as const;

  const handleTabChange = (tabId: typeof activeTab) => {
    if (isUpgrading) return;
    sound.playTap();
    haptic.selection();
    setActiveTab(tabId);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-tg-border/70 pb-safe">
      <div className="max-w-lg mx-auto grid grid-cols-5 px-1.5 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              data-testid={`nav-tab-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-cyan-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition ${
                  isActive ? 'bg-cyan-500/20 text-cyan-400 shadow-sm shadow-cyan-500/30' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
