import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../db.js';
import { SELL_PAYOUT_RATE, MIN_DEPOSIT_TO_WITHDRAW, WAGER_MULTIPLIER } from '@upgrader/shared';

export async function inventoryRoutes(fastify: FastifyInstance) {
  // Get active inventory items
  fastify.get('/api/inventory', { preHandler: [authMiddleware] }, async (request, reply) => {
    const user = request.user;

    // Check if user has satisfied wager, automatically unlock all locked items!
    const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (freshUser && (freshUser.wagerTotal || 0) >= (freshUser.wagerRequired || 0)) {
      await prisma.userInventory.updateMany({
        where: {
          userId: user.id,
          isLocked: true,
          status: 'AVAILABLE',
        },
        data: { isLocked: false },
      });
    }

    const items = await prisma.userInventory.findMany({
      where: {
        userId: user.id,
        status: 'AVAILABLE'
      },
      include: {
        gift: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return reply.send({
      items,
      wagerTotal: freshUser?.wagerTotal || 0,
      wagerRequired: freshUser?.wagerRequired || 0,
      totalDeposited: freshUser?.totalDeposited || 0,
      isWithdrawUnlocked: (freshUser?.totalDeposited || 0) >= MIN_DEPOSIT_TO_WITHDRAW,
    });
  });

  // Claim a demo gift + ensure at least $100 balance for hassle-free testing
  fastify.post('/api/inventory/claim-demo', { preHandler: [authMiddleware] }, async (request, reply) => {
    const user = request.user;

    // Pick a budget starter gift from COMMON tier
    const starterGifts = await prisma.gift.findMany({
      where: { rarity: 'COMMON' },
      orderBy: { price: 'asc' },
      take: 5
    });

    if (starterGifts.length === 0) {
      return reply.status(500).send({ error: 'No demo gifts available' });
    }

    const randomGift = starterGifts[Math.floor(Math.random() * starterGifts.length)];

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: user.id } });
      const currentWagerTotal = current?.wagerTotal || 0;
      const currentWagerReq = current?.wagerRequired || 0;

      // 1x Wager: required wager increases by exactly 1x the gift price
      const wagerIncrease = Number((randomGift.price * WAGER_MULTIPLIER).toFixed(2));
      const nextWagerReq = currentWagerReq + wagerIncrease;
      const isLocked = currentWagerTotal < nextWagerReq;

      // Top up balance if under 50
      let updatedBalance = current?.balance || 0;
      const balanceIncrement = updatedBalance < 50 ? 100 : 0;

      await tx.user.update({
        where: { id: user.id },
        data: {
          wagerRequired: { increment: wagerIncrease },
          balance: balanceIncrement > 0 ? { increment: balanceIncrement } : undefined,
        },
      });

      // Create new inventory item
      const newItem = await tx.userInventory.create({
        data: {
          userId: user.id,
          giftId: randomGift.id,
          status: 'AVAILABLE',
          isLocked,
        },
        include: { gift: true }
      });

      return { newItem, balance: updatedBalance + balanceIncrement };
    });

    return reply.send({
      success: true,
      message: `Вы получили демо-подарок: ${randomGift.name}! (Вейджер 1x: $${randomGift.price.toFixed(2)})`,
      item: result.newItem,
      newBalance: result.balance
    });
  });

  // Withdraw an inventory item to Telegram
  fastify.post<{ Body: { inventoryId: string } }>(
    '/api/inventory/withdraw',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      const { inventoryId } = request.body || {};

      if (!inventoryId) {
        return reply.status(400).send({ error: 'inventoryId is required' });
      }

      try {
        const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (!freshUser) {
          return reply.status(404).send({ error: 'Пользователь не найден' });
        }

        // 1. Check deposit requirement ($1.00 minimum / 75 Stars)
        if ((freshUser.totalDeposited || 0) < MIN_DEPOSIT_TO_WITHDRAW) {
          return reply.status(403).send({
            error: `Для первого вывода подарков требуется минимальный депозит от $${MIN_DEPOSIT_TO_WITHDRAW.toFixed(2)} (75 Stars). Ваш депозит: $${(freshUser.totalDeposited || 0).toFixed(2)}.`,
            requiresDeposit: true,
            minDepositRequired: MIN_DEPOSIT_TO_WITHDRAW,
            currentDeposited: freshUser.totalDeposited || 0,
          });
        }

        // 2. Fetch item
        const item = await prisma.userInventory.findFirst({
          where: { id: inventoryId, userId: user.id, status: 'AVAILABLE' },
          include: { gift: true },
        });

        if (!item) {
          return reply.status(404).send({ error: 'Предмет не найден или недоступен для вывода' });
        }

        // 3. Check wager status
        const isWagerSatisfied = (freshUser.wagerTotal || 0) >= (freshUser.wagerRequired || 0);
        if (item.isLocked && !isWagerSatisfied) {
          const remainingWager = (freshUser.wagerRequired || 0) - (freshUser.wagerTotal || 0);
          return reply.status(403).send({
            error: `Предмет заблокирован вейджером! Отыграйте еще $${remainingWager.toFixed(2)} в апгрейдере или PvP-дуэлях.`,
            isLocked: true,
            remainingWager,
          });
        }

        // 4. Mark item as WITHDRAWN
        const updatedItem = await prisma.userInventory.update({
          where: { id: inventoryId },
          data: { status: 'WITHDRAWN', isLocked: false },
          include: { gift: true },
        });

        return reply.send({
          success: true,
          message: `Заявка на перевод подарка "${item.gift.name}" успешно оформлена! Предмет отправлен в ваш профиль Telegram.`,
          item: updatedItem,
        });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message || 'Ошибка при выводе подарка' });
      }
    }
  );

  // Sell an inventory item for 95% of its value
  fastify.post<{ Body: { inventoryId: string } }>('/api/inventory/sell', { preHandler: [authMiddleware] }, async (request, reply) => {
    const user = request.user;
    const { inventoryId } = request.body || {};

    if (!inventoryId) {
      return reply.status(400).send({ error: 'inventoryId is required' });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Fetch item to know the price
        const item = await tx.userInventory.findFirst({
          where: { id: inventoryId, userId: user.id, status: 'AVAILABLE' },
          include: { gift: true }
        });

        if (!item) {
          throw new Error('ITEM_NOT_FOUND_OR_UNAVAILABLE');
        }

        // Mark as WITHDRAWN / SOLD atomically
        const updateResult = await tx.userInventory.updateMany({
          where: { id: inventoryId, userId: user.id, status: 'AVAILABLE' },
          data: { status: 'WITHDRAWN' }
        });

        if (updateResult.count !== 1) {
          throw new Error('CONCURRENCY_ERROR');
        }

        // Calculate payout (95%)
        const payout = Number((item.gift.price * SELL_PAYOUT_RATE).toFixed(2));

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: payout } }
        });

        return { payout, newBalance: updatedUser.balance, item };
      });

      return reply.send({
        success: true,
        payout: result.payout,
        newBalance: result.newBalance,
        soldItem: result.item
      });
    } catch (err: any) {
      if (err.message === 'ITEM_NOT_FOUND_OR_UNAVAILABLE' || err.message === 'CONCURRENCY_ERROR') {
        return reply.status(400).send({ error: 'Предмет не найден или уже был продан/использован' });
      }
      return reply.status(500).send({ error: 'Ошибка при продаже предмета' });
    }
  });
}
