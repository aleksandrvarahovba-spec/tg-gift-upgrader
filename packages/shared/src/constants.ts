export const HOUSE_EDGE = 0.08; // 8% house edge
export const MIN_CHANCE = 1.0;   // 1.0% minimum chance
export const MAX_CHANCE = 80.0;  // 80.0% maximum chance
export const SELL_PAYOUT_RATE = 0.95; // 95% of price goes to balance when selling
export const WAGER_MULTIPLIER = 1.0; // Strictly 1x wager multiplier
export const MIN_DEPOSIT_TO_WITHDRAW = 1.0; // $1.00 minimum deposit threshold (~75 Telegram Stars)
export const STARS_PER_DOLLAR = 75; // 75 Telegram Stars = $1.00

export interface StarsPackage {
  stars: number;
  amountUsd: number;
  label: string;
  badge?: string;
  popular?: boolean;
}

export const STARS_PACKAGES: StarsPackage[] = [
  { stars: 75, amountUsd: 1.0, label: '75 Stars ($1.00)', badge: 'Мин. для вывода' },
  { stars: 150, amountUsd: 2.0, label: '150 Stars ($2.00)', badge: '+5% XP' },
  { stars: 375, amountUsd: 5.0, label: '375 Stars ($5.00)', badge: '+10% Bonus' },
  { stars: 750, amountUsd: 10.0, label: '750 Stars ($10.00)', badge: '🔥 ПОПУЛЯРНЫЙ', popular: true },
];

export type GiftRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export const RARITY_CONFIG: Record<GiftRarity, { label: string; color: string; border: string; glow: string; bg: string }> = {
  COMMON: {
    label: 'Common',
    color: '#94A3B8',
    border: 'border-slate-500/40',
    glow: 'rgba(148, 163, 184, 0.25)',
    bg: 'from-slate-900/60 to-slate-800/40',
  },
  UNCOMMON: {
    label: 'Uncommon',
    color: '#22C55E',
    border: 'border-emerald-500/40',
    glow: 'rgba(34, 197, 94, 0.25)',
    bg: 'from-emerald-950/60 to-slate-900/40',
  },
  RARE: {
    label: 'Rare',
    color: '#00D2FF',
    border: 'border-cyan-500/50',
    glow: 'rgba(0, 210, 255, 0.35)',
    bg: 'from-cyan-950/60 to-slate-900/40',
  },
  EPIC: {
    label: 'Epic',
    color: '#A855F7',
    border: 'border-purple-500/50',
    glow: 'rgba(168, 85, 247, 0.35)',
    bg: 'from-purple-950/60 to-slate-900/40',
  },
  LEGENDARY: {
    label: 'Legendary',
    color: '#F59E0B',
    border: 'border-amber-500/60',
    glow: 'rgba(245, 158, 11, 0.45)',
    bg: 'from-amber-950/60 to-slate-900/40',
  },
};

export interface TelegramBackdrop {
  name: string;
  rarityTier: 'MYTHIC' | 'EPIC' | 'RARE' | 'UNCOMMON' | 'COMMON';
  rarityPercent: number;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
  accentColor: string;
  patternType: 'diamonds' | 'circuit' | 'hexagons' | 'stars' | 'dots' | 'rings';
}

export const TELEGRAM_BACKDROPS: Record<string, TelegramBackdrop> = {
  'Onyx Black': {
    name: 'Onyx Black',
    rarityTier: 'MYTHIC',
    rarityPercent: 0.5,
    gradientFrom: '#181924',
    gradientTo: '#07080d',
    glowColor: '#a855f7',
    accentColor: '#fbbf24',
    patternType: 'diamonds',
  },
  'Cyber Purple': {
    name: 'Cyber Purple',
    rarityTier: 'EPIC',
    rarityPercent: 2.0,
    gradientFrom: '#3b0764',
    gradientTo: '#130225',
    glowColor: '#c084fc',
    accentColor: '#e879f9',
    patternType: 'circuit',
  },
  'Cobalt Gold': {
    name: 'Cobalt Gold',
    rarityTier: 'EPIC',
    rarityPercent: 3.0,
    gradientFrom: '#1e3a8a',
    gradientTo: '#09132b',
    glowColor: '#fbbf24',
    accentColor: '#f59e0b',
    patternType: 'hexagons',
  },
  'Crimson Glow': {
    name: 'Crimson Glow',
    rarityTier: 'RARE',
    rarityPercent: 5.0,
    gradientFrom: '#7f1d1d',
    gradientTo: '#1f0404',
    glowColor: '#ef4444',
    accentColor: '#f87171',
    patternType: 'stars',
  },
  'Emerald Mist': {
    name: 'Emerald Mist',
    rarityTier: 'RARE',
    rarityPercent: 6.0,
    gradientFrom: '#064e3b',
    gradientTo: '#021e17',
    glowColor: '#10b981',
    accentColor: '#34d399',
    patternType: 'dots',
  },
  'Sapphire Sky': {
    name: 'Sapphire Sky',
    rarityTier: 'UNCOMMON',
    rarityPercent: 8.0,
    gradientFrom: '#0c4a6e',
    gradientTo: '#031a2b',
    glowColor: '#0284c7',
    accentColor: '#38bdf8',
    patternType: 'rings',
  },
  'Rose Quartz': {
    name: 'Rose Quartz',
    rarityTier: 'UNCOMMON',
    rarityPercent: 10.0,
    gradientFrom: '#831843',
    gradientTo: '#2a0715',
    glowColor: '#ec4899',
    accentColor: '#f472b6',
    patternType: 'diamonds',
  },
  'Amber Sunset': {
    name: 'Amber Sunset',
    rarityTier: 'COMMON',
    rarityPercent: 12.0,
    gradientFrom: '#78350f',
    gradientTo: '#240f03',
    glowColor: '#f59e0b',
    accentColor: '#fbbf24',
    patternType: 'dots',
  },
  'Mint Breeze': {
    name: 'Mint Breeze',
    rarityTier: 'COMMON',
    rarityPercent: 12.0,
    gradientFrom: '#134e4a',
    gradientTo: '#042220',
    glowColor: '#14b8a6',
    accentColor: '#2dd4bf',
    patternType: 'hexagons',
  },
  'Lavender Haze': {
    name: 'Lavender Haze',
    rarityTier: 'COMMON',
    rarityPercent: 12.0,
    gradientFrom: '#4c1d95',
    gradientTo: '#170634',
    glowColor: '#8b5cf6',
    accentColor: '#a78bfa',
    patternType: 'stars',
  },
};

