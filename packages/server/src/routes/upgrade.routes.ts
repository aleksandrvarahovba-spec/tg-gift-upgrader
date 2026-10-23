import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../db.js';
import { calculateUpgradeMath, verifyGameResult } from '@upgrader/shared';
import { ProvablyFairService } from '../services/provablyFairService.js';

export async function upgradeRoutes(fastify: FastifyInstance) {
  // 1. Calculate upgrade chance preview without playing
  fastify.post<{ Body: { sourcePrice: number; targetPrice: number } }>(
    '/api/upgrade/calculate',
    async (request, reply) => {
      const { sourcePrice, targetPrice } = request.body || {};
      const math = calculateUpgradeMath(sourcePrice, targetPrice);
      return reply.send({ math });
    }
  );

  // 2. Execute Provably Fair upgrade roll
  fastify.post<{ Body: { inventoryId: string; targetGiftId: string; clientSeed?: string } }>(
    '/api/upgrade/roll',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      const { inventoryId, targetGiftId, clientSeed } = request.body || {};

      if (!inventoryId || !targetGiftId) {
        return reply.status(400).send({ error: 'inventoryId and targetGiftId are required' });
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          // 1. Check target gift
          const targetGift = await tx.gift.findUnique({ where: { id: targetGiftId } });
          if (!targetGift) {
            throw new Error('TARGET_GIFT_NOT_FOUND');
          }

          // 2. Fetch source inventory item
          const sourceItem = await tx.userInventory.findFirst({
            where: { id: inventoryId, userId: user.id, status: 'AVAILABLE' },
            include: { gift: true }
          });

          if (!sourceItem) {
            throw new Error('SOURCE_ITEM_NOT_AVAILABLE');
          }

          // 3. Atomically burn source item (Anti-dupe race condition guard)
          const burnRes = await tx.userInventory.updateMany({
            where: { id: inventoryId, userId: user.id, status: 'AVAILABLE' },
            data: { status: 'BURNED' }
          });

          if (burnRes.count !== 1) {
            throw new Error('ITEM_ALREADY_BURNED');
          }

          // 4. Validate upgrade chance
          const math = calculateUpgradeMath(sourceItem.gift.price, targetGift.price);
          if (!math.isValid) {
            throw new Error(`INVALID_CHANCE: ${math.reason}`);
          }

          // 5. Fetch fresh user state for seeds & nonce
          const freshUser = await tx.user.findUnique({ where: { id: user.id } });
          if (!freshUser) {
            throw new Error('USER_NOT_FOUND');
          }

          // Risk management: Max win limit check
          if (freshUser.maxWinLimit && freshUser.maxWinLimit > 0 && targetGift.price > freshUser.maxWinLimit) {
            throw new Error(`MAX_WIN_LIMIT_EXCEEDED: Подарок ($${targetGift.price}) превышает установленный лимит банка ($${freshUser.maxWinLimit})`);
          }

          const currentNonce = freshUser.nonce + 1;
          const activeClientSeed = (clientSeed && clientSeed.trim().length > 0)
            ? clientSeed.trim().substring(0, 64)
            : freshUser.clientSeed;

          // 6. Evaluate Provably Fair roll
          let { roll, rollAngle } = ProvablyFairService.evaluateRoll(
            freshUser.serverSeed,
            activeClientSeed,
            currentNonce
          );

          // Streamer Lucky Content Mode: Boost winning roll for viral TikTok/Reels recordings
          if (freshUser.luckyModeEnabled) {
            roll = parseFloat(((roll % (math.rawChance * 0.75)) + 0.1).toFixed(4));
            rollAngle = parseFloat(((roll / 100) * 360).toFixed(2));
          }

          const isWon = roll < math.rawChance;

          // 7. If won, award target gift
          let wonItem = null;
          if (isWon) {
            wonItem = await tx.userInventory.create({
              data: {
                userId: user.id,
                giftId: targetGift.id,
                status: 'AVAILABLE'
              },
              include: { gift: true }
            });
          }

          // 8. MANDATORY Provably Fair serverSeed rotation & wager progression
          const newServerSeed = ProvablyFairService.generateServerSeed();
          const newServerSeedHash = ProvablyFairService.hashServerSeed(newServerSeed);

          const updatedUser = await tx.user.update({
            where: { id: user.id },
            data: {
              serverSeed: newServerSeed,
              serverSeedHash: newServerSeedHash,
              clientSeed: activeClientSeed,
              nonce: currentNonce,
              wagerTotal: { increment: sourceItem.gift.price }
            }
          });

          // Check if wager is satisfied (wagerProgress >= wagerRequired) -> auto-unlock all items!
          if (updatedUser.wagerTotal >= updatedUser.wagerRequired) {
            await tx.userInventory.updateMany({
              where: { userId: user.id, isLocked: true, status: 'AVAILABLE' },
              data: { isLocked: false }
            });
            if (wonItem) {
              wonItem.isLocked = false;
            }
          }

          // 9. Save to UpgradeHistory
          await tx.upgradeHistory.create({
            data: {
              userId: user.id,
              sourceInventoryId: sourceItem.id,
              sourceGiftId: sourceItem.gift.id,
              targetGiftId: targetGift.id,
              sourcePrice: sourceItem.gift.price,
              targetPrice: targetGift.price,
              chance: math.rawChance,
              multiplier: math.multiplier,
              roll,
              rollAngle,
              isWon,
              serverSeed: freshUser.serverSeed,       // Revealed seed used for this roll
              serverSeedHash: freshUser.serverSeedHash,// Hash committed prior to roll
              clientSeed: activeClientSeed,
              nonce: currentNonce
            }
          });

          return {
            isWon,
            roll,
            rollAngle,
            chance: math.rawChance,
            multiplier: math.multiplier,
            revealedServerSeed: freshUser.serverSeed,
            revealedServerSeedHash: freshUser.serverSeedHash,
            nextServerSeedHash: newServerSeedHash,
            nextNonce: currentNonce + 1,
            clientSeed: activeClientSeed,
            sourceInventoryItem: sourceItem,
            wonInventoryItem: wonItem
          };
        });

        return reply.send(result);
      } catch (err: any) {
        if (err.message.startsWith('INVALID_CHANCE:')) {
          return reply.status(400).send({ error: err.message.replace('INVALID_CHANCE: ', '') });
        }
        if (err.message === 'SOURCE_ITEM_NOT_AVAILABLE' || err.message === 'ITEM_ALREADY_BURNED') {
          return reply.status(400).send({ error: 'Предмет не найден или уже был использован в апгрейде' });
        }
        if (err.message === 'TARGET_GIFT_NOT_FOUND') {
          return reply.status(404).send({ error: 'Целевой подарок не найден' });
        }
        return reply.status(500).send({ error: 'Внутренняя ошибка при выполнении апгрейда' });
      }
    }
  );

  // 3. Live drops feed (last 20 upgrades across all players)
  fastify.get('/api/upgrade/live-feed', async (_request, reply) => {
    const games = await prisma.upgradeHistory.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            username: true,
            photoUrl: true
          }
        },
        sourceGift: true,
        targetGift: true
      }
    });

    const liveDrops = games.map((g) => ({
      id: g.id,
      userFirstName: g.user.firstName || 'Player',
      userUsername: g.user.username,
      userPhotoUrl: g.user.photoUrl,
      sourceGift: g.sourceGift,
      targetGift: g.targetGift,
      isWon: g.isWon,
      multiplier: g.multiplier,
      chance: g.chance,
      createdAt: g.createdAt.toISOString()
    }));

    return reply.send({ liveDrops });
  });

  // 4. User's upgrade history
  fastify.get('/api/upgrade/history', { preHandler: [authMiddleware] }, async (request, reply) => {
    const user = request.user;
    const history = await prisma.upgradeHistory.findMany({
      where: { userId: user.id },
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: {
        sourceGift: true,
        targetGift: true
      }
    });

    return reply.send({ history });
  });

  // 5. Update user's client seed
  fastify.post<{ Body: { clientSeed: string } }>(
    '/api/provably-fair/client-seed',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      const { clientSeed } = request.body || {};

      if (!clientSeed || clientSeed.trim().length === 0) {
        return reply.status(400).send({ error: 'clientSeed cannot be empty' });
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { clientSeed: clientSeed.trim().substring(0, 64) }
      });

      return reply.send({
        success: true,
        clientSeed: updated.clientSeed
      });
    }
  );

  // 6. Independent verification tool endpoint
  fastify.post<{
    Body: {
      serverSeed: string;
      serverSeedHash: string;
      clientSeed: string;
      nonce: number;
      expectedRoll: number;
    };
  }>('/api/provably-fair/verify', async (request, reply) => {
    const { serverSeed, serverSeedHash, clientSeed, nonce, expectedRoll } = request.body || {};

    if (!serverSeed || !serverSeedHash || !clientSeed || nonce === undefined || expectedRoll === undefined) {
      return reply.status(400).send({ error: 'Missing required parameters for verification' });
    }

    const verification = verifyGameResult(
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
      expectedRoll
    );

    return reply.send({ verification });
  });
}
