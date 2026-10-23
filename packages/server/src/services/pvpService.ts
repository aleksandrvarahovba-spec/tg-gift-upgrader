import crypto from 'crypto';
import { prisma } from '../db.js';

export interface PvpRoomDto {
  id: string;
  creatorUserId: string;
  creatorUsername: string;
  creatorSide: 'TON' | 'FRAGMENT';
  creatorGift: any;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  createdAt: string;
  isBot?: boolean;
}

export class PvpService {
  // Preset demo bot rooms so the lobby is lively with authentic Telegram NFT gifts
  private static defaultBotPresets = [
    {
      username: 'ton_whale',
      side: 'TON' as const,
      giftSlug: 'durovscap-nft',
      fallbackPrice: 1200,
    },
    {
      username: 'crypto_knight',
      side: 'FRAGMENT' as const,
      giftSlug: 'heartlocket-nft',
      fallbackPrice: 450,
    },
    {
      username: 'pepe_trader',
      side: 'TON' as const,
      giftSlug: 'spicedwine-nft',
      fallbackPrice: 55,
    },
    {
      username: 'ton_baron',
      side: 'FRAGMENT' as const,
      giftSlug: 'jellybunny-nft',
      fallbackPrice: 75,
    },
    {
      username: 'candyman',
      side: 'TON' as const,
      giftSlug: 'candycane-nft',
      fallbackPrice: 7.5,
    },
    {
      username: 'starter_bro',
      side: 'FRAGMENT' as const,
      giftSlug: 'bowtie-nft',
      fallbackPrice: 3.6,
    },
  ];

  public static async getActiveRooms(): Promise<PvpRoomDto[]> {
    // 1. Fetch real DB waiting rooms
    const dbRooms = await prisma.pvpGame.findMany({
      where: { status: 'WAITING' },
      include: { creatorGift: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const activeRooms: PvpRoomDto[] = dbRooms.map((r) => ({
      id: r.id,
      creatorUserId: r.creatorUserId,
      creatorUsername: r.creatorUsername || 'Player',
      creatorSide: r.creatorSide as 'TON' | 'FRAGMENT',
      creatorGift: r.creatorGift,
      status: 'WAITING',
      createdAt: r.createdAt.toISOString(),
      isBot: r.creatorUserId.startsWith('bot_'),
    }));

    // 2. If fewer than 5 rooms exist, dynamically inject bot rooms from catalog
    if (activeRooms.length < 5) {
      for (const preset of this.defaultBotPresets) {
        if (activeRooms.some((r) => r.creatorUsername === preset.username)) continue;

        let gift = await prisma.gift.findUnique({ where: { slug: preset.giftSlug } });
        if (!gift) {
          gift = await prisma.gift.findFirst({
            where: { price: { gte: preset.fallbackPrice * 0.7, lte: preset.fallbackPrice * 1.3 } },
          });
        }

        if (gift) {
          activeRooms.push({
            id: `bot_room_${preset.username}`,
            creatorUserId: `bot_${preset.username}`,
            creatorUsername: preset.username,
            creatorSide: preset.side,
            creatorGift: gift,
            status: 'WAITING',
            createdAt: new Date().toISOString(),
            isBot: true,
          });
        }
      }
    }

    return activeRooms;
  }

  /**
   * Evaluates dynamic duel chances strictly based on gift values:
   * totalPot = creatorPrice + joinerPrice
   * creatorChance = (creatorPrice / totalPot) * 100
   * joinerChance = (joinerPrice / totalPot) * 100
   * Provably Fair roll (0.00 - 99.99). Winner is creator if roll < creatorChance, else joiner.
   */
  public static evaluateDuel(
    creatorPrice: number,
    joinerPrice: number,
    userSeed?: string
  ): {
    isCreatorWon: boolean;
    creatorChance: number;
    joinerChance: number;
    roll: number;
    serverSeed: string;
    serverSeedHash: string;
  } {
    const totalPot = Math.max(0.1, (creatorPrice || 1) + (joinerPrice || 1));
    const rawCreatorChance = ((creatorPrice || 1) / totalPot) * 100;
    // Bound chance between 1% and 99% to avoid 0% or 100% deadlocks
    const creatorChance = Math.min(99.0, Math.max(1.0, Math.round(rawCreatorChance * 10) / 10));
    const joinerChance = Math.round((100 - creatorChance) * 10) / 10;

    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const hmac = crypto
      .createHmac('sha256', serverSeed)
      .update(userSeed || 'pvp_case_roulette_fair_duel')
      .digest('hex');

    const roll = (parseInt(hmac.substring(0, 8), 16) % 10000) / 100; // 0.00 - 99.99
    const isCreatorWon = roll < creatorChance;

    return {
      isCreatorWon,
      creatorChance,
      joinerChance,
      roll,
      serverSeed,
      serverSeedHash,
    };
  }
}
