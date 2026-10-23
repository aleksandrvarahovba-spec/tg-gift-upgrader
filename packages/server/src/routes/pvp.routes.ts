import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../db.js';
import { PvpService } from '../services/pvpService.js';

export async function pvpRoutes(fastify: FastifyInstance) {
  // 1. Get active rooms
  fastify.get('/api/pvp/rooms', async (request, reply) => {
    try {
      const rooms = await PvpService.getActiveRooms();
      return reply.send({ rooms });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // 2. Create room
  fastify.post<{ Body: { inventoryId: string; side?: 'TON' | 'FRAGMENT' } }>(
    '/api/pvp/create',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      const { inventoryId, side = 'TON' } = request.body || {};

      if (!inventoryId) {
        return reply.status(400).send({ error: 'inventoryId is required' });
      }

      try {
        const item = await prisma.userInventory.findFirst({
          where: { id: inventoryId, userId: user.id, status: 'AVAILABLE' },
          include: { gift: true },
        });

        if (!item) {
          return reply.status(400).send({ error: 'Предмет не найден или недоступен' });
        }

        // Lock item in room
        await prisma.userInventory.update({
          where: { id: inventoryId },
          data: { status: 'LOCKED_PVP' },
        });

        const room = await prisma.pvpGame.create({
          data: {
            creatorUserId: user.id,
            creatorUsername: user.username || user.firstName || 'Player',
            creatorSide: side,
            creatorGiftId: item.gift.id,
            status: 'WAITING',
          },
          include: { creatorGift: true },
        });

        return reply.send({ room });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );

  // 3. Join room (player vs player or player vs bot) with dynamic odds based on gift values
  fastify.post<{ Body: { roomId: string; inventoryId: string } }>(
    '/api/pvp/join',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      const { roomId, inventoryId } = request.body || {};

      if (!roomId || !inventoryId) {
        return reply.status(400).send({ error: 'roomId and inventoryId are required' });
      }

      try {
        // Fetch joiner's inventory item
        const joinerItem = await prisma.userInventory.findFirst({
          where: { id: inventoryId, userId: user.id, status: 'AVAILABLE' },
          include: { gift: true },
        });

        if (!joinerItem) {
          return reply.status(400).send({ error: 'Ваш предмет недоступен для битвы' });
        }

        // Check if joining a bot room
        if (roomId.startsWith('bot_room_')) {
          const botUsername = roomId.replace('bot_room_', '');
          const rooms = await PvpService.getActiveRooms();
          const targetBotRoom = rooms.find((r) => r.id === roomId);

          if (!targetBotRoom) {
            return reply.status(404).send({ error: 'Комната бота не найдена' });
          }

          const creatorPrice = targetBotRoom.creatorGift.price;
          const joinerPrice = joinerItem.gift.price;

          // Dynamic Provably Fair duel based on gift prices
          const duel = PvpService.evaluateDuel(creatorPrice, joinerPrice, user.id);
          const isUserWon = !duel.isCreatorWon;

          if (isUserWon) {
            // Joiner wins! Award bot's gift to user, keep own item
            const wonGift = targetBotRoom.creatorGift;
            await prisma.userInventory.create({
              data: {
                userId: user.id,
                giftId: wonGift.id,
                status: 'AVAILABLE',
              },
            });

            // Update user wager progress & auto-unlock items if completed
            const updatedUser = await prisma.user.update({
              where: { id: user.id },
              data: { wagerTotal: { increment: joinerItem.gift.price } },
            });
            if (updatedUser.wagerTotal >= updatedUser.wagerRequired) {
              await prisma.userInventory.updateMany({
                where: { userId: user.id, isLocked: true, status: 'AVAILABLE' },
                data: { isLocked: false },
              });
            }

            return reply.send({
              isWon: true,
              winnerUserId: user.id,
              winnerUsername: user.username || user.firstName || 'You',
              creatorChance: duel.creatorChance,
              joinerChance: duel.joinerChance,
              roll: duel.roll,
              creatorSide: targetBotRoom.creatorSide,
              creatorUsername: botUsername,
              creatorGift: targetBotRoom.creatorGift,
              opponentGift: joinerItem.gift,
              wonGift,
              serverSeed: duel.serverSeed,
              serverSeedHash: duel.serverSeedHash,
            });
          } else {
            // Joiner loses: burn joiner's item & increment wager progress
            await prisma.userInventory.update({
              where: { id: joinerItem.id },
              data: { status: 'BURNED' },
            });

            const updatedUser = await prisma.user.update({
              where: { id: user.id },
              data: { wagerTotal: { increment: joinerItem.gift.price } },
            });
            if (updatedUser.wagerTotal >= updatedUser.wagerRequired) {
              await prisma.userInventory.updateMany({
                where: { userId: user.id, isLocked: true, status: 'AVAILABLE' },
                data: { isLocked: false },
              });
            }

            return reply.send({
              isWon: false,
              winnerUserId: `bot_${botUsername}`,
              winnerUsername: botUsername,
              creatorChance: duel.creatorChance,
              joinerChance: duel.joinerChance,
              roll: duel.roll,
              creatorSide: targetBotRoom.creatorSide,
              creatorUsername: botUsername,
              creatorGift: targetBotRoom.creatorGift,
              opponentGift: joinerItem.gift,
              wonGift: null,
              serverSeed: duel.serverSeed,
              serverSeedHash: duel.serverSeedHash,
            });
          }
        }

        // Real DB room
        const room = await prisma.pvpGame.findUnique({
          where: { id: roomId },
          include: { creatorGift: true },
        });

        if (!room || room.status !== 'WAITING') {
          return reply.status(400).send({ error: 'Комната уже занята или завершена' });
        }

        if (room.creatorUserId === user.id) {
          return reply.status(400).send({ error: 'Нельзя вступить в свою же комнату' });
        }

        const creatorPrice = room.creatorGift.price;
        const joinerPrice = joinerItem.gift.price;

        const duel = PvpService.evaluateDuel(creatorPrice, joinerPrice, user.id);
        const isUserWon = !duel.isCreatorWon;

        if (isUserWon) {
          // Joiner won: gets creator's gift
          await prisma.userInventory.create({
            data: {
              userId: user.id,
              giftId: room.creatorGiftId,
              status: 'AVAILABLE',
            },
          });
        } else {
          // Creator won: creator gets joiner's gift, joiner burns item
          await prisma.userInventory.update({
            where: { id: joinerItem.id },
            data: { status: 'BURNED' },
          });

          await prisma.userInventory.create({
            data: {
              userId: room.creatorUserId,
              giftId: joinerItem.gift.id,
              status: 'AVAILABLE',
            },
          });
        }

        // Close room
        await prisma.pvpGame.update({
          where: { id: room.id },
          data: {
            status: 'FINISHED',
            opponentUserId: user.id,
            opponentUsername: user.username || user.firstName || 'Player',
            opponentGiftId: joinerItem.gift.id,
            winnerUserId: isUserWon ? user.id : room.creatorUserId,
            winnerUsername: isUserWon ? (user.username || user.firstName || 'Player') : room.creatorUsername,
            creatorChance: duel.creatorChance,
            opponentChance: duel.joinerChance,
            roll: duel.roll,
            serverSeed: duel.serverSeed,
            serverSeedHash: duel.serverSeedHash,
          },
        });

        return reply.send({
          isWon: isUserWon,
          winnerUserId: isUserWon ? user.id : room.creatorUserId,
          winnerUsername: isUserWon ? (user.username || user.firstName || 'Player') : room.creatorUsername,
          creatorChance: duel.creatorChance,
          joinerChance: duel.joinerChance,
          roll: duel.roll,
          creatorSide: room.creatorSide,
          creatorUsername: room.creatorUsername,
          creatorGift: room.creatorGift,
          opponentGift: joinerItem.gift,
          wonGift: isUserWon ? room.creatorGift : null,
          serverSeed: duel.serverSeed,
          serverSeedHash: duel.serverSeedHash,
        });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );

  // 4. Call bot into user's created room
  fastify.post<{ Body: { roomId: string } }>(
    '/api/pvp/call-bot',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      const { roomId } = request.body || {};

      if (!roomId) {
        return reply.status(400).send({ error: 'roomId is required' });
      }

      try {
        const room = await prisma.pvpGame.findUnique({
          where: { id: roomId },
          include: { creatorGift: true },
        });

        if (!room || room.status !== 'WAITING') {
          return reply.status(400).send({ error: 'Комната не найдена или уже завершена' });
        }

        // Pick an authentic bot gift
        let botGift = await prisma.gift.findFirst({
          where: {
            id: { not: room.creatorGiftId },
            price: {
              gte: room.creatorGift.price * 0.4,
              lte: room.creatorGift.price * 2.5,
            },
          },
        });

        if (!botGift) {
          botGift = await prisma.gift.findFirst({
            where: { id: { not: room.creatorGiftId } }
          }) || room.creatorGift;
        }

        const botNames = ['TonWhale_Bot', 'LuckyBot_777', 'FragmentSniper', 'PepeDuelist', 'DurovChallenger'];
        const botUsername = botNames[Math.floor(Math.random() * botNames.length)];

        const creatorPrice = room.creatorGift.price;
        const joinerPrice = botGift.price;

        const duel = PvpService.evaluateDuel(creatorPrice, joinerPrice, user.id);
        const isCreatorWon = duel.isCreatorWon;

        if (isCreatorWon) {
          // Creator wins: gets bot's gift, unlocks own item
          await prisma.userInventory.updateMany({
            where: { giftId: room.creatorGiftId, userId: user.id, status: 'LOCKED_PVP' },
            data: { status: 'AVAILABLE' },
          });

          await prisma.userInventory.create({
            data: {
              userId: user.id,
              giftId: botGift.id,
              status: 'AVAILABLE',
            },
          });
        } else {
          // Creator loses: burn creator's locked item
          await prisma.userInventory.updateMany({
            where: { giftId: room.creatorGiftId, userId: user.id, status: 'LOCKED_PVP' },
            data: { status: 'BURNED' },
          });
        }

        await prisma.pvpGame.update({
          where: { id: room.id },
          data: {
            status: 'FINISHED',
            opponentUserId: `bot_${botUsername}`,
            opponentUsername: botUsername,
            opponentGiftId: botGift.id,
            winnerUserId: isCreatorWon ? user.id : `bot_${botUsername}`,
            winnerUsername: isCreatorWon ? (user.username || user.firstName || 'Player') : botUsername,
            creatorChance: duel.creatorChance,
            opponentChance: duel.joinerChance,
            roll: duel.roll,
            serverSeed: duel.serverSeed,
            serverSeedHash: duel.serverSeedHash,
          },
        });

        return reply.send({
          isWon: isCreatorWon,
          winnerUserId: isCreatorWon ? user.id : `bot_${botUsername}`,
          winnerUsername: isCreatorWon ? (user.username || user.firstName || 'Player') : botUsername,
          creatorChance: duel.creatorChance,
          joinerChance: duel.joinerChance,
          roll: duel.roll,
          creatorSide: room.creatorSide,
          creatorUsername: room.creatorUsername,
          creatorGift: room.creatorGift,
          opponentGift: botGift,
          wonGift: isCreatorWon ? botGift : null,
          serverSeed: duel.serverSeed,
          serverSeedHash: duel.serverSeedHash,
        });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );

  // 5. Recent PvP history
  fastify.get('/api/pvp/history', async (request, reply) => {
    try {
      const history = await prisma.pvpGame.findMany({
        where: { status: 'FINISHED' },
        include: { creatorGift: true, opponentGift: true },
        orderBy: { createdAt: 'desc' },
        take: 12,
      });

      return reply.send({ history });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
