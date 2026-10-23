import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../db.js';
import { WAGER_MULTIPLIER, MIN_DEPOSIT_TO_WITHDRAW } from '@upgrader/shared';

const DAILY_REWARDS_TABLE = [
  { day: 1, balance: 2.5, hasGift: true, rarity: 'COMMON', desc: '$2.50 + Подарок' },
  { day: 2, balance: 5.0, hasGift: false, rarity: null, desc: '$5.00' },
  { day: 3, balance: 7.5, hasGift: true, rarity: 'UNCOMMON', desc: '$7.50 + Подарок' },
  { day: 4, balance: 10.0, hasGift: false, rarity: null, desc: '$10.00' },
  { day: 5, balance: 12.5, hasGift: true, rarity: 'RARE', desc: '$12.50 + Редкий NFT' },
  { day: 6, balance: 15.0, hasGift: false, rarity: null, desc: '$15.00' },
  { day: 7, balance: 25.0, hasGift: true, rarity: 'EPIC', desc: '$25.00 + Эпический NFT' },
];

export async function bonusesRoutes(fastify: FastifyInstance) {
  // 1. Daily Bonus Status (requested by user)
  fastify.get(
    '/api/bonuses/daily-status',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      try {
        const freshUser = await prisma.user.findUnique({
          where: { id: user.id },
        });

        if (!freshUser) {
          return reply.status(404).send({ error: 'Пользователь не найден' });
        }

        const now = Date.now();
        const lastBonusTime = freshUser.lastDailyBonusAt || freshUser.lastDailyBonus;
        const lastClaimMs = lastBonusTime ? new Date(lastBonusTime).getTime() : 0;
        const cooldownMs = 24 * 60 * 60 * 1000;
        const diffMs = now - lastClaimMs;

        const canClaim = !lastBonusTime || diffMs >= cooldownMs;
        const nextClaimAt = canClaim ? null : new Date(lastClaimMs + cooldownMs).toISOString();

        // Check if streak broke (>48h)
        let currentStreak = freshUser.dailyStreak || 0;
        if (lastBonusTime && diffMs > 2 * cooldownMs) {
          currentStreak = 0; // Streak broken, will start at day 1 on next claim
        }

        return reply.send({
          canClaim,
          streak: currentStreak,
          nextClaimAt,
          rewards: DAILY_REWARDS_TABLE,
        });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );

  // 2. Claim Daily Bonus (POST /api/bonuses/claim-daily and alias /api/bonuses/daily-claim)
  const claimDailyHandler = async (request: any, reply: any) => {
    const user = request.user;
    try {
      const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!freshUser) {
        return reply.status(404).send({ error: 'Пользователь не найден' });
      }

      const now = Date.now();
      const lastBonusTime = freshUser.lastDailyBonusAt || freshUser.lastDailyBonus;
      const lastClaimMs = lastBonusTime ? new Date(lastBonusTime).getTime() : 0;
      const cooldownMs = 24 * 60 * 60 * 1000;
      const diffMs = now - lastClaimMs;

      if (lastBonusTime && diffMs < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - diffMs) / (60 * 1000));
        const hours = Math.floor(remainingMinutes / 60);
        const mins = remainingMinutes % 60;
        return reply.status(400).send({
          error: `Ежедневный бонус уже получен! Приходите через ${hours}ч ${mins}мин.`,
          nextClaimAt: new Date(lastClaimMs + cooldownMs).toISOString(),
        });
      }

      // Calculate new streak (1..7)
      let nextStreak = 1;
      if (lastBonusTime && diffMs <= 2 * cooldownMs) {
        nextStreak = ((freshUser.dailyStreak || 0) % 7) + 1;
      } else {
        nextStreak = 1;
      }

      const rewardConfig = DAILY_REWARDS_TABLE[nextStreak - 1] || DAILY_REWARDS_TABLE[0];
      const bonusCash = rewardConfig.balance;

      let awardedGift: any = null;
      let giftMatch: any = null;
      let giftText = '';

      if (rewardConfig.hasGift) {
        // Pick an authentic gift from catalog according to rarity tier
        if (rewardConfig.rarity === 'EPIC') {
          giftMatch = await prisma.gift.findFirst({
            where: { price: { gte: 70, lte: 250 } },
          });
        } else if (rewardConfig.rarity === 'RARE') {
          giftMatch = await prisma.gift.findFirst({
            where: { price: { gte: 30, lte: 70 } },
          });
        } else {
          giftMatch = await prisma.gift.findFirst({
            where: { price: { lte: 35 } },
            orderBy: { price: 'asc' },
          });
        }

        if (!giftMatch) {
          giftMatch = await prisma.gift.findFirst({ orderBy: { price: 'asc' } });
        }
      }

      const currentUser = await prisma.user.findUnique({ where: { id: user.id } });
      const currentWagerTotal = currentUser?.wagerTotal || 0;
      const currentWagerReq = currentUser?.wagerRequired || 0;

      const giftPrice = giftMatch ? giftMatch.price : 0;
      // Strictly 1x wager multiplier
      const wagerIncrease = Number(((bonusCash + giftPrice) * WAGER_MULTIPLIER).toFixed(2));
      const nextWagerReq = currentWagerReq + wagerIncrease;
      const isLocked = currentWagerTotal < nextWagerReq;

      if (giftMatch) {
        const invItem = await prisma.userInventory.create({
          data: {
            userId: user.id,
            giftId: giftMatch.id,
            status: 'AVAILABLE',
            isLocked,
          },
          include: { gift: true },
        });
        awardedGift = invItem.gift;
        giftText = ` + NFT-подарок "${giftMatch.name}" ($${giftMatch.price.toFixed(0)})`;
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: bonusCash },
          wagerRequired: { increment: wagerIncrease },
          lastDailyBonusAt: new Date(),
          lastDailyBonus: new Date(),
          dailyStreak: nextStreak,
        },
      });

      const rewardText = `+$${bonusCash.toFixed(2)}${giftText}`;

      return reply.send({
        success: true,
        rewardText,
        bonusAmount: bonusCash,
        awardedGift,
        streak: nextStreak,
        balance: updatedUser.balance,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  };

  fastify.post('/api/bonuses/claim-daily', { preHandler: [authMiddleware] }, claimDailyHandler);
  fastify.post('/api/bonuses/daily-claim', { preHandler: [authMiddleware] }, claimDailyHandler);

  // 3. Reset Daily Bonus Timer (for Streamer / Testing mode)
  fastify.post(
    '/api/bonuses/reset-daily',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastDailyBonusAt: null,
            lastDailyBonus: null,
          },
        });
        return reply.send({ success: true, message: 'Таймер Daily Bonus успешно сброшен!' });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );

  // 4. General Bonus & Referral Info
  fastify.get(
    '/api/bonuses/info',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      try {
        const freshUser = await prisma.user.findUnique({
          where: { id: user.id },
        });

        if (!freshUser) {
          return reply.status(404).send({ error: 'Пользователь не найден' });
        }

        const now = Date.now();
        const lastBonusTime = freshUser.lastDailyBonusAt || freshUser.lastDailyBonus;
        const lastClaimMs = lastBonusTime ? new Date(lastBonusTime).getTime() : 0;
        const cooldownMs = 24 * 60 * 60 * 1000;
        const canClaimDaily = !lastBonusTime || now - lastClaimMs >= cooldownMs;
        const timeUntilNextMs = canClaimDaily ? 0 : Math.max(0, cooldownMs - (now - lastClaimMs));

        const inStockCount = await prisma.gift.count();

        return reply.send({
          referralLink: `https://t.me/GiftUpgraderBot?start=ref_${freshUser.telegramId}`,
          referredCount: freshUser.referredCount || 0,
          referralEarnings: freshUser.referralEarnings || 0,
          wagerTotal: freshUser.wagerTotal || 0,
          wagerRequired: freshUser.wagerRequired || 0,
          totalDeposited: freshUser.totalDeposited || 0,
          minDepositRequired: MIN_DEPOSIT_TO_WITHDRAW,
          isWithdrawUnlocked: (freshUser.totalDeposited || 0) >= MIN_DEPOSIT_TO_WITHDRAW,
          canClaimDaily,
          dailyStreak: freshUser.dailyStreak || 0,
          timeUntilNextMs,
          inStockCount,
          starsWithdrawFee: 25,
        });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );

  // 5. Redeem promocode
  fastify.post<{ Body: { code: string } }>(
    '/api/bonuses/promocode',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      const rawCode = (request.body?.code || '').trim().toUpperCase();

      if (!rawCode) {
        return reply.status(400).send({ error: 'Введите промокод' });
      }

      try {
        const promoPresets: Record<
          string,
          { bonusType: string; balanceAmount: number; giftSlug?: string; desc: string }
        > = {
          WELCOME: {
            bonusType: 'BOTH',
            balanceAmount: 5.0,
            giftSlug: 'cupidcharm-nft',
            desc: 'Бесплатный подарок Cupid Charm + $5.00',
          },
          TIKTOK: {
            bonusType: 'BALANCE',
            balanceAmount: 25.0,
            desc: '+$25.00 на баланс от TikTok',
          },
          DUROV: {
            bonusType: 'GIFT',
            balanceAmount: 0.0,
            giftSlug: 'spicedwine-nft',
            desc: 'Редкий подарок Spiced Wine ($55)',
          },
        };

        let promo = await prisma.promocode.findUnique({ where: { code: rawCode } });
        if (!promo && promoPresets[rawCode]) {
          const preset = promoPresets[rawCode];
          promo = await prisma.promocode.create({
            data: {
              code: rawCode,
              bonusType: preset.bonusType,
              balanceAmount: preset.balanceAmount,
              giftSlug: preset.giftSlug,
              description: preset.desc,
            },
          });
        }

        if (!promo) {
          return reply.status(404).send({ error: 'Промокод не найден или срок его действия истек' });
        }

        const alreadyUsed = await prisma.userPromocode.findUnique({
          where: {
            userId_code: {
              userId: user.id,
              code: rawCode,
            },
          },
        });

        if (alreadyUsed) {
          return reply.status(400).send({ error: 'Вы уже активировали этот промокод ранее' });
        }

        let grantedGift = null;
        let addedBalance = promo.balanceAmount;

        if (promo.giftSlug) {
          const gift = await prisma.gift.findUnique({ where: { slug: promo.giftSlug } });
          if (gift) {
            const promoWager = Number(((addedBalance + gift.price) * WAGER_MULTIPLIER).toFixed(2));
            const currentUser = await prisma.user.findUnique({ where: { id: user.id } });
            const isLocked = (currentUser?.wagerTotal || 0) < ((currentUser?.wagerRequired || 0) + promoWager);

            grantedGift = await prisma.userInventory.create({
              data: {
                userId: user.id,
                giftId: gift.id,
                status: 'AVAILABLE',
                isLocked,
              },
              include: { gift: true },
            });
          }
        }

        const promoWager = Number(((addedBalance + (grantedGift ? grantedGift.gift.price : 0)) * WAGER_MULTIPLIER).toFixed(2));
        await prisma.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: addedBalance },
            wagerRequired: { increment: promoWager },
          },
        });

        await prisma.userPromocode.create({
          data: {
            userId: user.id,
            code: rawCode,
          },
        });

        await prisma.promocode.update({
          where: { code: rawCode },
          data: { usedCount: { increment: 1 } },
        });

        const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });

        return reply.send({
          success: true,
          message: `Промокод ${rawCode} успешно активирован! (${promo.description})`,
          bonusAmount: addedBalance,
          grantedGift,
          balance: updatedUser?.balance,
        });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );
}
