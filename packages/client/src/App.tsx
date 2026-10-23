import React, { useState, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider, useGame } from './context/GameContext';
import { ToastProvider } from './context/ToastContext';
import { Header } from './components/Header';
import { LiveDropsBar } from './components/LiveDropsBar';
import { UpgradeArena } from './components/UpgradeArena';
import { InventorySelector } from './components/InventorySelector';
import { TargetCatalogSelector } from './components/TargetCatalogSelector';
import { BottomNavBar } from './components/BottomNavBar';
import { InventoryShopScreen } from './components/InventoryShopScreen';
import { DepositScreen } from './components/DepositScreen';
import { ProvablyFairScreen } from './components/ProvablyFairScreen';
import { PvpBattleScreen } from './components/PvpBattleScreen';
import { BonusScreen } from './components/BonusScreen';
import { DevToolbar } from './components/DevToolbar';
import { AmbientNftScene } from './components/AmbientNftScene';
import { Sparkles, X } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeTab } = useGame();
  const { loading, error } = useAuth();

  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const inventoryRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);

  const scrollToInventory = () => {
    setIsInventoryOpen(true);
    inventoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToCatalog = () => {
    setIsCatalogOpen(true);
    catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-tg-bg flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 animate-spin mb-3 shadow-xl shadow-cyan-500/20">
          <Sparkles className="w-7 h-7" />
        </div>
        <span className="font-black text-sm text-slate-200 tracking-wider uppercase">
          Загрузка Gift Upgrader...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-tg-bg flex flex-col items-center justify-center p-4 text-center">
        <div className="p-6 rounded-3xl glass-card border border-rose-500/40 max-w-sm">
          <h2 className="text-base font-bold text-rose-400 mb-2">Ошибка подключения</h2>
          <p className="text-xs text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs uppercase"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tg-bg text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black relative">
      {/* Floating & Peeking Animated Telegram NFTs Layer */}
      <AmbientNftScene />

      {/* Top Header */}
      <Header />

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col">
        {/* Live Drops Ticker (always on top) */}
        <LiveDropsBar />

        {/* Tab 1: Cosmic Upgrade Arena Screen */}
        {activeTab === 'upgrade' && (
          <div className="flex-1 flex flex-col items-center max-w-5xl w-full mx-auto p-2 pb-28 space-y-4">
            {/* Center Upgrade Arena with 3D Pedestals, Wheel, and In-place Finale */}
            <UpgradeArena
              onOpenInventoryDrawer={scrollToInventory}
              onOpenCatalogDrawer={scrollToCatalog}
            />

            {/* Selectors Grid: Inventory (Left) & Catalog (Right) */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 px-2 pt-2">
              <div ref={inventoryRef}>
                <InventorySelector />
              </div>
              <div ref={catalogRef}>
                <TargetCatalogSelector />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: PvP Coin Flip Duel Screen */}
        {activeTab === 'pvp' && <PvpBattleScreen />}

        {/* Tab 3: Bonuses, Referral & Promocodes Screen */}
        {activeTab === 'bonuses' && <BonusScreen />}

        {/* Tab 4: Inventory & Shop Screen */}
        {activeTab === 'inventory_shop' && <InventoryShopScreen />}

        {/* Tab 5: Deposit & Bot Transfer Screen */}
        {activeTab === 'deposit' && <DepositScreen />}

        {/* Tab 6: Provably Fair & History Screen */}
        {activeTab === 'provably_fair' && <ProvablyFairScreen />}
      </main>

      {/* Floating Dev Toolbar */}
      <DevToolbar />

      {/* Bottom Tab Bar Navigation */}
      <BottomNavBar />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <GameProvider>
          <MainLayout />
        </GameProvider>
      </AuthProvider>
    </ToastProvider>
  );
};
export default App;
