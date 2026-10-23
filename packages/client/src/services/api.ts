import {
  GiftDto,
  UserDto,
  UserInventoryItemDto,
  UpgradeCalculationResult,
  UpgradeRollResponse,
  LiveDropDto,
  ProvablyFairVerificationResult
} from '@upgrader/shared';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (typeof window !== 'undefined') {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initData && tg.initData.length > 0) {
      headers['x-telegram-init-data'] = tg.initData;
    } else {
      headers['x-telegram-init-data'] = 'dev';
      const devUserId = localStorage.getItem('upgrader_dev_user_id');
      if (devUserId) {
        headers['x-dev-user-id'] = devUserId;
      }
    }
  }

  return headers;
}

const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/+$/, '');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const isPostOrPut = options.method === 'POST' || options.method === 'PUT';
  const body = options.body !== undefined ? options.body : (isPostOrPut ? JSON.stringify({}) : undefined);

  const res = await fetch(url, {
    ...options,
    body,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Server error occurred');
  }
  return data as T;
}

export const api = {
  // Auth
  getMe: () => request<{ user: UserDto }>('/api/auth/me'),
  resetBalance: () => request<{ success: boolean; balance: number }>('/api/auth/dev-reset', { method: 'POST' }),

  // Gifts & Shop
  getGifts: () => request<{ gifts: GiftDto[] }>('/api/gifts'),
  buyGift: (giftId: string) =>
    request<{ success: boolean; newBalance: number; inventoryItem: UserInventoryItemDto }>('/api/gifts/buy', {
      method: 'POST',
      body: JSON.stringify({ giftId })
    }),

  // Inventory
  getInventory: () => request<{ items: UserInventoryItemDto[] }>('/api/inventory'),
  claimDemo: () =>
    request<{ success: boolean; message: string; item: UserInventoryItemDto; newBalance: number }>(
      '/api/inventory/claim-demo',
      { method: 'POST' }
    ),
  sellItem: (inventoryId: string) =>
    request<{ success: boolean; payout: number; newBalance: number; soldItem: UserInventoryItemDto }>(
      '/api/inventory/sell',
      {
        method: 'POST',
        body: JSON.stringify({ inventoryId })
      }
    ),

  // Upgrade & Math
  calculate: (sourcePrice: number, targetPrice: number) =>
    request<{ math: UpgradeCalculationResult }>('/api/upgrade/calculate', {
      method: 'POST',
      body: JSON.stringify({ sourcePrice, targetPrice })
    }),
  roll: (inventoryId: string, targetGiftId: string, clientSeed?: string) =>
    request<UpgradeRollResponse>('/api/upgrade/roll', {
      method: 'POST',
      body: JSON.stringify({ inventoryId, targetGiftId, clientSeed })
    }),
  getLiveFeed: () => request<{ liveDrops: LiveDropDto[] }>('/api/upgrade/live-feed'),
  getHistory: () => request<{ history: any[] }>('/api/upgrade/history'),

  // Provably Fair
  updateClientSeed: (clientSeed: string) =>
    request<{ success: boolean; clientSeed: string }>('/api/provably-fair/client-seed', {
      method: 'POST',
      body: JSON.stringify({ clientSeed })
    }),
  verifyGame: (payload: {
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    expectedRoll: number;
  }) =>
    request<{ verification: ProvablyFairVerificationResult }>('/api/provably-fair/verify', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // PvP Coinflip / Case Roulette Duel
  getPvpRooms: () => request<{ rooms: any[] }>('/api/pvp/rooms'),
  createPvpRoom: (inventoryId: string, side?: string) =>
    request<{ room: any }>('/api/pvp/create', {
      method: 'POST',
      body: JSON.stringify({ inventoryId, side }),
    }),
  joinPvpRoom: (roomId: string, inventoryId: string) =>
    request<{
      isWon: boolean;
      winnerUserId: string;
      winnerUsername: string;
      creatorChance?: number;
      joinerChance?: number;
      roll: number;
      creatorSide?: string;
      creatorUsername: string;
      creatorGift: any;
      opponentGift: any;
      wonGift: any | null;
      serverSeed: string;
      serverSeedHash: string;
    }>('/api/pvp/join', {
      method: 'POST',
      body: JSON.stringify({ roomId, inventoryId }),
    }),
  callPvpBot: (roomId: string) =>
    request<{
      isWon: boolean;
      winnerUserId: string;
      winnerUsername: string;
      creatorChance?: number;
      joinerChance?: number;
      roll: number;
      creatorSide?: string;
      creatorUsername: string;
      creatorGift: any;
      opponentGift: any;
      wonGift: any | null;
      serverSeed: string;
      serverSeedHash: string;
    }>('/api/pvp/call-bot', {
      method: 'POST',
      body: JSON.stringify({ roomId }),
    }),
  getPvpHistory: () => request<{ history: any[] }>('/api/pvp/history'),

  // Bonuses & Promocodes
  getDailyStatus: () =>
    request<{
      canClaim: boolean;
      streak: number;
      nextClaimAt: string | null;
      rewards: Array<{ day: number; balance: number; hasGift: boolean; desc: string }>;
    }>('/api/bonuses/daily-status'),
  getBonusInfo: () =>
    request<{
      referralLink: string;
      referredCount: number;
      referralEarnings: number;
      wagerTotal: number;
      wagerRequired: number;
      canClaimDaily: boolean;
      dailyStreak?: number;
      timeUntilNextMs: number;
      inStockCount: number;
      starsWithdrawFee: number;
    }>('/api/bonuses/info'),
  claimDailyBonus: () =>
    request<{
      success: boolean;
      rewardText: string;
      bonusAmount: number;
      awardedGift: any | null;
      streak: number;
      balance: number;
    }>('/api/bonuses/claim-daily', { method: 'POST' }),
  resetDailyTimer: () =>
    request<{ success: boolean; message: string }>('/api/bonuses/reset-daily', { method: 'POST' }),
  redeemPromocode: (code: string) =>
    request<{
      success: boolean;
      message: string;
      addedBalance: number;
      grantedGift: any | null;
      newBalance: number;
      wagerRequired: number;
    }>('/api/bonuses/promocode', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  // Streamer Mode & Risk Controls
  addAdminBalance: (amount?: number) =>
    request<{ success: boolean; added: number; balance: number; message: string }>('/api/admin/add-balance', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  grantAdminTopPack: () =>
    request<{ success: boolean; count: number; grantedItems: any[]; message: string }>('/api/admin/grant-top-pack', {
      method: 'POST',
    }),
  toggleLuckyMode: (enabled?: boolean) =>
    request<{ success: boolean; luckyModeEnabled: boolean; message: string }>('/api/admin/toggle-lucky-mode', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),
  setAdminRiskLimits: (maxWinLimit: number) =>
    request<{ success: boolean; maxWinLimit: number; message: string }>('/api/admin/set-risk-limits', {
      method: 'POST',
      body: JSON.stringify({ maxWinLimit }),
    }),
  getAdminStatus: () =>
    request<{ luckyModeEnabled: boolean; maxWinLimit: number; balance: number; telegramId: string }>('/api/admin/status'),

  // Payments & Telegram Stars
  getStarsPackages: () =>
    request<{ packages: any[]; minDepositRequired: number }>('/api/payment/stars-packages'),
  getPaymentStatus: () =>
    request<{
      totalDeposited: number;
      minDepositRequired: number;
      isWithdrawUnlocked: boolean;
      wagerTotal: number;
      wagerRequired: number;
      isWagerCompleted: boolean;
      balance: number;
    }>('/api/payment/status'),
  createStarsInvoice: (stars: number) =>
    request<{
      success: boolean;
      invoiceId: string;
      invoiceLink: string;
      stars: number;
      amountUsd: number;
      simulated: boolean;
    }>('/api/payment/create-stars-invoice', {
      method: 'POST',
      body: JSON.stringify({ stars }),
    }),
  confirmStarsPayment: (stars: number, amountUsd?: number) =>
    request<{
      success: boolean;
      message: string;
      balance: number;
      totalDeposited: number;
      isWithdrawUnlocked: boolean;
      unlockedItemsCount: number;
    }>('/api/payment/confirm-stars', {
      method: 'POST',
      body: JSON.stringify({ stars, amountUsd }),
    }),
  withdrawItem: (inventoryId: string) =>
    request<{
      success: boolean;
      message: string;
      item: UserInventoryItemDto;
    }>('/api/inventory/withdraw', {
      method: 'POST',
      body: JSON.stringify({ inventoryId }),
    }),
};
