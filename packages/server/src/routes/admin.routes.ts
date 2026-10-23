import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../db.js';

export async function adminRoutes(fastify: FastifyInstance) {
  // 1. Add $1,000 balance
  fastify.post<{ Body: { amount?: number } }>(
    '/api/admin/add-balance',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      const amount = Number(request.body?.amount) || 1000.0;

      try {
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { balance: { increment: amount } },
        });

        return reply.send({
          success: true,
          added: amount,
          balance: updated.balance,
          message: `+$${amount.toFixed(2)} успешно зачислено на баланс!`,
        });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );

  // 2. Grant TOP Streamer Pack (Plush Pepe, Durov's Cap, Snoop Dogg, Birthday Cake)
  fastify.post(
    '/api/admin/grant-top-pack',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;

      try {
        const targetSlugs = ['plushpepe-gift', 'durovscap-gift', 'snoopdogg-gift', 'birthdaycake-gift'];
        const gifts = await prisma.gift.findMany({
          where: { slug: { in: targetSlugs } },
        });

        const grantedItems = [];
        for (const g of gifts) {
          const item = await prisma.userInventory.create({
            data: {
              userId: user.id,
              giftId: g.id,
              status: 'AVAILABLE',
            },
            include: { gift: true },
          });
          grantedItems.push(item);
        }

        return reply.send({
          success: true,
          count: grantedItems.length,
          grantedItems,
          message: '👑 ТОП-набор стримера (Pepe, Cap, Snoop, Cake) успешно выдан!',
        });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );

  // 3. Toggle Streamer Lucky Mode
  fastify.post<{ Body: { enabled?: boolean } }>(
    '/api/admin/toggle-lucky-mode',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      const requested = request.body?.enabled;

      try {
        const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
        const newState = requested !== undefined ? requested : !freshUser?.luckyModeEnabled;

        await prisma.user.update({
          where: { id: user.id },
          data: { luckyModeEnabled: newState },
        });

        return reply.send({
          success: true,
          luckyModeEnabled: newState,
          message: newState
            ? '🎬 Режим Стримера ВКЛЮЧЕН! Победа в апгрейдах гарантирована для записи видео.'
            : '🎬 Режим Стримера ВЫКЛЮЧЕН (обычный честный Provably Fair).',
        });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );

  // 4. Set Risk Limits (Max Win Limit $)
  fastify.post<{ Body: { maxWinLimit: number } }>(
    '/api/admin/set-risk-limits',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      const limit = Number(request.body?.maxWinLimit) || 0;

      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { maxWinLimit: limit },
        });

        return reply.send({
          success: true,
          maxWinLimit: limit,
          message:
            limit > 0
              ? `Лимит максимального выигрыша установлен: $${limit}`
              : 'Лимит выигрыша снят (Безлимит).',
        });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );

  // 5. Get Streamer / Admin status
  fastify.get(
    '/api/admin/status',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      try {
        const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
        return reply.send({
          luckyModeEnabled: freshUser?.luckyModeEnabled || false,
          maxWinLimit: freshUser?.maxWinLimit || 0,
          balance: freshUser?.balance || 0,
          telegramId: freshUser?.telegramId,
        });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );
}
