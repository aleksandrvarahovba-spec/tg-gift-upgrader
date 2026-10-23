import { GiftRarity } from './constants.js';

export interface UserDto {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  balance: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  wagerTotal?: number;
  wagerRequired?: number;
  totalDeposited?: number;
  luckyModeEnabled?: boolean;
  maxWinLimit?: number;
  createdAt: string;
}

export interface GiftDto {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  rarity: GiftRarity;
  badge: string | null;
  color: string;
  collection: string;
  mintNumber?: number | null;
  backdropName?: string | null;
  backdropRarity?: number | null;
  backdropFrom?: string | null;
  backdropTo?: string | null;
  backdropGlow?: string | null;
  backdropAccent?: string | null;
  backdropPattern?: string | null;
}

export interface UserInventoryItemDto {
  id: string;
  userId: string;
  giftId: string;
  gift: GiftDto;
  status: 'AVAILABLE' | 'BURNED' | 'WITHDRAWN';
  isLocked?: boolean;
  createdAt: string;
}

export interface UpgradeCalculationResult {
  isValid: boolean;
  rawChance: number;      // e.g. 46.0000
  displayChance: number;  // rounded e.g. 46.00
  multiplier: number;     // e.g. 2.00
  sourcePrice: number;
  targetPrice: number;
  reason?: string;
}

export interface UpgradeRollRequest {
  inventoryId: string;
  targetGiftId: string;
  clientSeed?: string;
}

export interface UpgradeRollResponse {
  isWon: boolean;
  roll: number;              // 0.0000 - 99.9999
  rollAngle: number;         // 0.00 - 360.00
  chance: number;            // raw chance %
  multiplier: number;
  revealedServerSeed: string; // The seed used for THIS roll (now revealed!)
  revealedServerSeedHash: string; // The hash previously displayed to user
  nextServerSeedHash: string; // The fresh hash committed for NEXT roll
  nextNonce: number;
  clientSeed: string;
  sourceInventoryItem: UserInventoryItemDto;
  wonInventoryItem: UserInventoryItemDto | null;
}

export interface LiveDropDto {
  id: string;
  userFirstName: string;
  userUsername: string | null;
  userPhotoUrl: string | null;
  sourceGift: GiftDto;
  targetGift: GiftDto;
  isWon: boolean;
  multiplier: number;
  chance: number;
  createdAt: string;
}

export interface ProvablyFairState {
  currentServerSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export interface ProvablyFairVerificationResult {
  computedHash: string;
  computedHmac: string;
  computedRoll: number;
  computedAngle: number;
  isHashMatch: boolean;
  isRollMatch: boolean;
}
