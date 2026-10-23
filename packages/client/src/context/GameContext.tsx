import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  GiftDto,
  UserInventoryItemDto,
  UpgradeCalculationResult,
  UpgradeRollResponse,
  LiveDropDto,
  calculateUpgradeMath
} from '@upgrader/shared';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { sound } from '../services/soundEngine';
import { useTelegram } from '../hooks/useTelegram';
import { useToast } from './ToastContext';

interface GameContextType {
  gifts: GiftDto[];
  inventory: UserInventoryItemDto[];
  selectedItem: UserInventoryItemDto | null;
  selectedTarget: GiftDto | null;
  math: UpgradeCalculationResult | null;
  isUpgrading: boolean;
  setIsUpgrading: (val: boolean) => void;
  upgradeResult: UpgradeRollResponse | null;
  liveDrops: LiveDropDto[];
  loadingGifts: boolean;
  loadingInventory: boolean;
  activeTab: 'upgrade' | 'pvp' | 'bonuses' | 'inventory_shop' | 'deposit' | 'provably_fair';
  setActiveTab: (tab: 'upgrade' | 'pvp' | 'bonuses' | 'inventory_shop' | 'deposit' | 'provably_fair') => void;
  fastSpin: boolean;
  setFastSpin: (val: boolean) => void;
  hideDevToolbar: boolean;
  setHideDevToolbar: (val: boolean) => void;

  setSelectedItem: (item: UserInventoryItemDto | null) => void;
  setSelectedTarget: (target: GiftDto | null) => void;
  selectQuickMultiplier: (mult: number | 'max') => void;
  executeUpgrade: () => Promise<UpgradeRollResponse | null>;
  sellInventoryItem: (id: string) => Promise<{ success: boolean; payout: number }>;
  withdrawInventoryItem: (id: string) => Promise<{ success: boolean; error?: string }>;
  buyCatalogGift: (id: string) => Promise<{ success: boolean }>;
  refreshAll: () => Promise<void>;
  closeResultModal: () => void;
  continueWithWonItem: () => void;
  pickNextAvailableItem: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, refreshUser } = useAuth();
  const { haptic } = useTelegram();
  const { showToast } = useToast();

  const [gifts, setGifts] = useState<GiftDto[]>([]);
  const [inventory, setInventory] = useState<UserInventoryItemDto[]>([]);
  const [selectedItem, setSelectedItem] = useState<UserInventoryItemDto | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<GiftDto | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeResult, setUpgradeResult] = useState<UpgradeRollResponse | null>(null);
  const [liveDrops, setLiveDrops] = useState<LiveDropDto[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [activeTab, setActiveTab] = useState<'upgrade' | 'pvp' | 'bonuses' | 'inventory_shop' | 'deposit' | 'provably_fair'>('upgrade');
  const [hideDevToolbar, setHideDevToolbarState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('upgrader_hide_dev') === 'true';
    } catch {
      return false;
    }
  });

  const setHideDevToolbar = (val: boolean) => {
    setHideDevToolbarState(val);
    try {
      localStorage.setItem('upgrader_hide_dev', String(val));
    } catch {}
  };
  const [fastSpin, setFastSpin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('upgrader_fast_spin') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleFastSpin = (val: boolean) => {
    setFastSpin(val);
    try {
      localStorage.setItem('upgrader_fast_spin', String(val));
    } catch {}
    sound.playClick();
  };

  // Load catalog
  const loadGifts = useCallback(async () => {
    try {
      setLoadingGifts(true);
      const res = await api.getGifts();
      setGifts(res.gifts);
    } catch (err: any) {
      console.error('Failed to load gifts:', err);
      showToast(err.message || 'Ошибка загрузки каталога', 'error');
    } finally {
      setLoadingGifts(false);
    }
  }, [showToast]);

  // Load inventory
  const loadInventory = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingInventory(true);
      const res = await api.getInventory();
      setInventory(res.items);
      return res.items;
    } catch (err: any) {
      console.error('Failed to load inventory:', err);
      return [];
    } finally {
      setLoadingInventory(false);
    }
  }, [user]);

  // Load live drops
  const loadLiveDrops = useCallback(async () => {
    try {
      const res = await api.getLiveFeed();
      setLiveDrops(res.liveDrops);
    } catch (err) {
      console.error('Failed to load live feed:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshUser(), loadGifts(), loadInventory(), loadLiveDrops()]);
  }, [refreshUser, loadGifts, loadInventory, loadLiveDrops]);

  useEffect(() => {
    loadGifts();
    loadLiveDrops();
    const interval = setInterval(loadLiveDrops, 8000);
    return () => clearInterval(interval);
  }, [loadGifts, loadLiveDrops]);

  useEffect(() => {
    if (user) {
      loadInventory();
    }
  }, [user, loadInventory]);

  // Default selection when inventory or gifts load
  useEffect(() => {
    if (inventory.length > 0 && !selectedItem) {
      // Pick first available item
      const firstAvailable = inventory.find(i => i.status === 'AVAILABLE') || inventory[0];
      setSelectedItem(firstAvailable);
    }
  }, [inventory, selectedItem]);

  useEffect(() => {
    if (gifts.length > 0 && selectedItem && !selectedTarget) {
      // Pick a gift that offers a valid, exciting 30-55% chance (e.g. 1.8x - 3x upgrade)
      const idealTarget = gifts.find(g => {
        const m = calculateUpgradeMath(selectedItem.gift.price, g.price);
        return m.isValid && m.displayChance <= 60 && m.displayChance >= 30;
      }) || gifts.find(g => calculateUpgradeMath(selectedItem.gift.price, g.price).isValid) || gifts[1] || gifts[0];
      setSelectedTarget(idealTarget);
    }
  }, [gifts, selectedItem, selectedTarget]);

  // Calculate math whenever selectedItem or selectedTarget changes
  const math = useMemo(() => {
    if (!selectedItem || !selectedTarget) return null;
    return calculateUpgradeMath(selectedItem.gift.price, selectedTarget.price);
  }, [selectedItem, selectedTarget]);

  // Quick Multiplier selector: x1.5, x2, x3, x5, x10, max
  const selectQuickMultiplier = useCallback((mult: number | 'max') => {
    if (!selectedItem || gifts.length === 0) return;
    sound.playClick();
    haptic.selection();

    const currentPrice = selectedItem.gift.price;

    if (mult === 'max') {
      const maxEligible = [...gifts]
        .filter(g => {
          const m = calculateUpgradeMath(currentPrice, g.price);
          return m.isValid;
        })
        .sort((a, b) => b.price - a.price)[0];

      if (maxEligible) {
        setSelectedTarget(maxEligible);
      }
      return;
    }

    const desiredTargetPrice = currentPrice * mult;
    const validGifts = gifts.filter(g => {
      const m = calculateUpgradeMath(currentPrice, g.price);
      return m.isValid;
    });

    if (validGifts.length === 0) return;

    let closest = validGifts[0];
    let minDiff = Math.abs(closest.price - desiredTargetPrice);

    for (const g of validGifts) {
      const diff = Math.abs(g.price - desiredTargetPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closest = g;
      }
    }

    setSelectedTarget(closest);
  }, [selectedItem, gifts, haptic]);

  // Execute upgrade roll
  const executeUpgrade = useCallback(async (): Promise<UpgradeRollResponse | null> => {
    if (!selectedItem || !selectedTarget || !math || !math.isValid || isUpgrading) {
      return null;
    }

    try {
      setIsUpgrading(true);
      haptic.impact('heavy');

      const result = await api.roll(selectedItem.id, selectedTarget.id);
      setUpgradeResult(result);
      return result;
    } catch (err: any) {
      console.error('Upgrade execution failed:', err);
      setIsUpgrading(false);
      haptic.notification('error');
      showToast(err.message || 'Ошибка выполнения апгрейда', 'error');
      return null;
    }
  }, [selectedItem, selectedTarget, math, isUpgrading, haptic, showToast]);

  const closeResultModal = () => {
    setUpgradeResult(null);
  };

  // Continue with newly won item as source for next roll!
  const continueWithWonItem = useCallback(() => {
    sound.playClick();
    if (upgradeResult?.wonInventoryItem) {
      const newItem = upgradeResult.wonInventoryItem;
      setSelectedItem(newItem);
      // Auto-pick next target (e.g., x2 multiplier)
      const nextTarget = gifts.find(g => g.price > newItem.gift.price && g.price <= newItem.gift.price * 2.5) || gifts[gifts.length - 1];
      if (nextTarget) {
        setSelectedTarget(nextTarget);
      }
      setUpgradeResult(null);
      showToast(`Предмет ${newItem.gift.name} готов к следующему апгрейду!`, 'success');
    }
  }, [upgradeResult, gifts, showToast]);

  // Pick next available item from inventory after a loss or when moving to inventory
  const pickNextAvailableItem = useCallback(async () => {
    sound.playClick();
    setUpgradeResult(null);
    const freshItems = await loadInventory();
    if (freshItems && freshItems.length > 0) {
      const nextItem = freshItems[0];
      setSelectedItem(nextItem);
      // Auto pick suitable target
      const target = gifts.find(g => g.price > nextItem.gift.price && g.price <= nextItem.gift.price * 2.5) || gifts[1] || gifts[0];
      setSelectedTarget(target);
    } else {
      setSelectedItem(null);
    }
  }, [loadInventory, gifts]);

  // Sell item
  const sellInventoryItem = async (id: string) => {
    try {
      sound.playClick();
      haptic.impact('medium');
      const res = await api.sellItem(id);
      await refreshAll();
      haptic.notification('success');
      showToast(`Предмет успешно продан за $${res.payout}!`, 'success', 'Продажа');
      setUpgradeResult(null);
      // Pick next available item
      const freshItems = await loadInventory();
      if (freshItems && freshItems.length > 0) {
        setSelectedItem(freshItems[0]);
      } else {
        setSelectedItem(null);
      }
      return { success: true, payout: res.payout };
    } catch (err: any) {
      haptic.notification('error');
      showToast(err.message || 'Не удалось продать предмет', 'error');
      return { success: false, payout: 0 };
    }
  };

  // Withdraw inventory item to Telegram
  const withdrawInventoryItem = async (id: string) => {
    try {
      sound.playClick();
      haptic.impact('heavy');
      const res = await api.withdrawItem(id);
      await refreshAll();
      haptic.notification('success');
      showToast(res.message, 'success', 'Вывод подарка');
      return { success: true };
    } catch (err: any) {
      haptic.notification('error');
      showToast(err.message || 'Не удалось вывести предмет', 'error');
      return { success: false, error: err.message };
    }
  };

  // Buy catalog gift
  const buyCatalogGift = async (giftId: string) => {
    try {
      sound.playClick();
      haptic.impact('medium');
      const res = await api.buyGift(giftId);
      await refreshAll();
      haptic.notification('success');
      showToast(`Подарок ${res.inventoryItem.gift.name} успешно куплен!`, 'success', 'Покупка');
      // If no item was selected, select the newly purchased gift
      if (!selectedItem) {
        setSelectedItem(res.inventoryItem);
      }
      return { success: true };
    } catch (err: any) {
      haptic.notification('error');
      showToast(err.message || 'Недостаточно баланса для покупки', 'error');
      return { success: false };
    }
  };

  return (
    <GameContext.Provider
      value={{
        gifts,
        inventory,
        selectedItem,
        selectedTarget,
        math,
        isUpgrading,
        setIsUpgrading,
        upgradeResult,
        liveDrops,
        loadingGifts,
        loadingInventory,
        activeTab,
        setActiveTab,
        fastSpin,
        setFastSpin: handleToggleFastSpin,
        hideDevToolbar,
        setHideDevToolbar,
        setSelectedItem,
        setSelectedTarget,
        selectQuickMultiplier,
        executeUpgrade,
        sellInventoryItem,
        withdrawInventoryItem,
        buyCatalogGift,
        refreshAll,
        closeResultModal,
        continueWithWonItem,
        pickNextAvailableItem
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
