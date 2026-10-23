import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { sound } from '../services/soundEngine';
import {
  DollarSign,
  Zap,
  Plus,
  ShoppingCart,
  Gift,
  ArrowUpRight,
  Lock,
  Unlock,
  ShieldCheck,
  Star,
  ExternalLink,
} from 'lucide-react';
import { TelegramGiftCard } from './TelegramGiftCard';
import { MIN_DEPOSIT_TO_WITHDRAW } from '@upgrader/shared';

export const InventoryShopScreen: React.FC = () => {
  const {
    inventory,
    gifts,
    sellInventoryItem,
    withdrawInventoryItem,
    buyCatalogGift,
    setSelectedItem,
    setActiveTab,
  } = useGame();
  const { user, claimDemoGift } = useAuth();
  const [subTab, setSubTab] = useState<'inventory' | 'shop'>('inventory');
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const wagerTotal = (user as any)?.wagerTotal || 0;
  const wagerRequired = (user as any)?.wagerRequired || 0;
  const wagerPercent = wagerRequired > 0 ? Math.min(100, (wagerTotal / wagerRequired) * 100) : 100;
  const isWagerSatisfied = wagerTotal >= wagerRequired;

  const totalDeposited = (user as any)?.totalDeposited || 0;
  const isWithdrawUnlocked = totalDeposited >= MIN_DEPOSIT_TO_WITHDRAW;

  const handleSendToUpgrade = (item: any) => {
    sound.playClick();
    setSelectedItem(item);
    setActiveTab('upgrade');
  };

  const handleWithdraw = async (item: any) => {
    sound.playClick();
    if (item.isLocked && !isWagerSatisfied) {
      sound.playLoss();
      const rem = (wagerRequired - wagerTotal).toFixed(2);
      alert(`🔒 Предмет заблокирован вейджером! Отыграйте еще $${rem} в Апгрейде или Дуэлях.`);
      return;
    }

    if (!isWithdrawUnlocked) {
      sound.playLoss();
      const need = (MIN_DEPOSIT_TO_WITHDRAW - totalDeposited).toFixed(2);
      if (
        confirm(
          `💳 Для первого вывода требуется депозит от $1.00 (75 Stars). Осталось внести: $${need}.\nПерейти в кассу для пополнения?`
        )
      ) {
        setActiveTab('deposit');
      }
      return;
    }

    setWithdrawingId(item.id);
    await withdrawInventoryItem(item.id);
    setWithdrawingId(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 pb-24 space-y-4">
      {/* Sub tabs switch */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-900/80 border border-slate-800 max-w-md mx-auto">
        <button
          onClick={() => {
            sound.playClick();
            setSubTab('inventory');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
            subTab === 'inventory'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Мой инвентарь ({inventory.length})
        </button>
        <button
          onClick={() => {
            sound.playClick();
            setSubTab('shop');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
            subTab === 'shop'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Магазин подарков ({gifts.length})
        </button>
      </div>

      {/* Subtab 1: Inventory Management */}
      {subTab === 'inventory' && (
        <div className="space-y-4">
          {/* Status Bar: Wager 1x + Deposit Status */}
          <div className="p-3.5 rounded-2xl glass-card border border-tg-border bg-slate-900/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Wager 1x */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Отыгрыш вейджера (1x)
                </span>
                <span className="text-emerald-400 font-mono font-bold">{wagerPercent.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${wagerPercent}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Отыграно: ${wagerTotal.toFixed(2)}</span>
                <span>Требуется (1x): ${wagerRequired.toFixed(2)}</span>
              </div>
            </div>

            {/* Deposit Requirement */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Статус вывода ($1.00 мин.)
                </span>
                <span
                  className={`font-mono font-bold ${
                    isWithdrawUnlocked ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {isWithdrawUnlocked ? 'РАЗБЛОКИРОВАН' : 'ТРЕБУЕТСЯ $1.00'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{
                    width: `${Math.min(100, (totalDeposited / MIN_DEPOSIT_TO_WITHDRAW) * 100)}%`,
                  }}
                  className={`h-full transition-all duration-300 ${
                    isWithdrawUnlocked ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Внесено: ${totalDeposited.toFixed(2)}</span>
                <button
                  onClick={() => setActiveTab('deposit')}
                  className="text-cyan-400 hover:underline flex items-center gap-0.5"
                >
                  Пополнить <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-100 uppercase tracking-wide">
                Ваши NFT Подарки
              </h2>
              <p className="text-xs text-slate-400">
                Крутите в Апгрейде, выводите в Telegram или продавайте за 95% стоимости
              </p>
            </div>
            <button
              onClick={() => claimDemoGift()}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-500/30 active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Демо-подарок
            </button>
          </div>

          {inventory.length === 0 ? (
            <div className="p-8 rounded-3xl glass-card text-center flex flex-col items-center">
              <Gift className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-200 mb-1">Ваш инвентарь пуст</h3>
              <p className="text-xs text-slate-400 mb-4 max-w-xs">
                Получите бесплатный демо-подарок или купите подарок в магазине за баланс.
              </p>
              <button
                onClick={() => claimDemoGift()}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/30 active:scale-95 transition"
              >
                Получить первый подарок
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {inventory.map((item) => {
                const sellPayout = Number((item.gift.price * 0.95).toFixed(2));
                const itemLocked = item.isLocked && !isWagerSatisfied;

                return (
                  <TelegramGiftCard
                    key={item.id}
                    gift={item.gift}
                    serialNumber={item.gift.mintNumber ? `#${item.gift.mintNumber}` : undefined}
                    actionButton={
                      <div className="w-full space-y-1.5 mt-2">
                        {/* Lock status banner if item has active wager */}
                        {itemLocked && (
                          <div className="w-full py-0.5 px-1.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-[9px] font-bold text-amber-300 flex items-center justify-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            Вейджер 1x (в игре)
                          </div>
                        )}

                        <div className="w-full grid grid-cols-2 gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sellInventoryItem(item.id);
                            }}
                            title={`Продать за $${sellPayout}`}
                            className="py-1.5 rounded-xl bg-slate-800/90 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 border border-slate-700 text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1 active:scale-95 transition"
                          >
                            <DollarSign className="w-3 h-3 text-emerald-400" />
                            ${sellPayout}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendToUpgrade(item);
                            }}
                            title="Отправить в апгрейд"
                            className="py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/40 text-[10px] font-bold text-cyan-300 flex items-center justify-center gap-1 active:scale-95 transition"
                          >
                            <Zap className="w-3 h-3" />
                            Апгрейд
                          </button>
                        </div>

                        {/* Withdraw button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWithdraw(item);
                          }}
                          disabled={withdrawingId === item.id}
                          className={`w-full py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border active:scale-95 transition ${
                            itemLocked
                              ? 'bg-slate-900 text-slate-500 border-slate-800 hover:border-amber-500/40'
                              : isWithdrawUnlocked
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950'
                              : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                          }`}
                        >
                          <ArrowUpRight className="w-3 h-3" />
                          {withdrawingId === item.id
                            ? 'Вывод...'
                            : itemLocked
                            ? '🔒 Вейджер'
                            : isWithdrawUnlocked
                            ? 'Вывести в TG'
                            : 'Депозит $1 для вывода'}
                        </button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Catalog Shop */}
      {subTab === 'shop' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-100 uppercase tracking-wide">
                Магазин подарков
              </h2>
              <p className="text-xs text-slate-400">
                Покупайте любые подарки за внутренний баланс (Баланс: ${user?.balance.toFixed(2)})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {gifts.map((gift) => {
              const canAfford = (user?.balance || 0) >= gift.price;

              return (
                <TelegramGiftCard
                  key={gift.id}
                  gift={gift}
                  serialNumber={gift.mintNumber ? `#${gift.mintNumber}` : undefined}
                  actionButton={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        buyCatalogGift(gift.id);
                      }}
                      disabled={!canAfford}
                      className={`w-full py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition mt-2 ${
                        canAfford
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Купить
                    </button>
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
