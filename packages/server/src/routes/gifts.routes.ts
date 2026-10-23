import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../db.js';

export async function giftsRoutes(fastify: FastifyInstance) {
  // Get all catalog gifts
  fastify.get('/api/gifts', async (_request, reply) => {
    const gifts = await prisma.gift.findMany({
      orderBy: { price: 'asc' }
    });
    return reply.send({ gifts });
  });

  // Buy a gift using user balance
  fastify.post<{ Body: { giftId: string } }>('/api/gifts/buy', { preHandler: [authMiddleware] }, async (request, reply) => {
    const user = request.user;
    const { giftId } = request.body || {};

    if (!giftId) {
      return reply.status(400).send({ error: 'giftId is required' });
    }

    const gift = await prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift) {
      return reply.status(404).send({ error: 'Gift not found' });
    }

    // Execute atomic purchase
    try {
      const result = await prisma.$transaction(async (tx) => {
        const freshUser = await tx.user.findUnique({ where: { id: user.id } });
        if (!freshUser || freshUser.balance < gift.price) {
          throw new Error('INSUFFICIENT_BALANCE');
        }

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { balance: { decrement: gift.price } }
        });

        const inventoryItem = await tx.userInventory.create({
          data: {
            userId: user.id,
            giftId: gift.id,
            status: 'AVAILABLE'
          },
          include: { gift: true }
        });

        return { newBalance: updatedUser.balance, inventoryItem };
      });

      return reply.send({
        success: true,
        newBalance: result.newBalance,
        inventoryItem: result.inventoryItem
      });
    } catch (err: any) {
      if (err.message === 'INSUFFICIENT_BALANCE') {
        return reply.status(400).send({ error: 'Недостаточно средств на балансе для покупки' });
      }
      return reply.status(500).send({ error: 'Ошибка при покупке подарка' });
    }
  });
}
