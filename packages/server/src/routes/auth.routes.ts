import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../db.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/api/auth/me', { preHandler: [authMiddleware] }, async (request, reply) => {
    const user = request.user;
    const inventoryCount = await prisma.userInventory.count({
      where: { userId: user.id, status: 'AVAILABLE' }
    });

    return reply.send({
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        balance: user.balance,
        wagerTotal: user.wagerTotal || 0,
        wagerRequired: user.wagerRequired || 0,
        totalDeposited: user.totalDeposited || 0,
        serverSeedHash: user.serverSeedHash,
        clientSeed: user.clientSeed,
        nonce: user.nonce,
        inventoryCount,
        createdAt: user.createdAt.toISOString()
      }
    });
  });

  fastify.post('/api/auth/dev-reset', { preHandler: [authMiddleware] }, async (request, reply) => {
    const user = request.user;
    // Top up balance to 200
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { balance: 200.0 }
    });
    return reply.send({ success: true, balance: updated.balance });
  });
}
