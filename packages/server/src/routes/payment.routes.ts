import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../db.js';
import { CONFIG } from '../config.js';
import { STARS_PACKAGES, MIN_DEPOSIT_TO_WITHDRAW } from '@upgrader/shared';

export async function paymentRoutes(fastify: FastifyInstance) {
  // 1. Get available Stars packages
  fastify.get('/api/payment/stars-packages', async (_request, reply) => {
    return reply.send({
      packages: STARS_PACKAGES,
      minDepositRequired: MIN_DEPOSIT_TO_WITHDRAW,
    });
  });

  // 2. Get user payment & deposit status
  fastify.get('/api/payment/status', { preHandler: [authMiddleware] }, async (request, reply) => {
    const user = request.user;
    const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!freshUser) {
      return reply.status(404).send({ error: 'Пользователь не найден' });
    }

    const totalDeposited = freshUser.totalDeposited || 0;
    const isWithdrawUnlocked = totalDeposited >= MIN_DEPOSIT_TO_WITHDRAW;
    const wagerTotal = freshUser.wagerTotal || 0;
    const wagerRequired = freshUser.wagerRequired || 0;
    const isWagerCompleted = wagerTotal >= wagerRequired;

    return reply.send({
      totalDeposited,
      minDepositRequired: MIN_DEPOSIT_TO_WITHDRAW,
      isWithdrawUnlocked,
      wagerTotal,
      wagerRequired,
      isWagerCompleted,
      balance: freshUser.balance,
    });
  });

  // 3. Create Telegram Stars invoice link
  fastify.post<{ Body: { stars?: number; packageIndex?: number } }>(
    '/api/payment/create-stars-invoice',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      let stars = request.body?.stars;

      if (!stars && typeof request.body?.packageIndex === 'number') {
        const pkg = STARS_PACKAGES[request.body.packageIndex];
        if (pkg) stars = pkg.stars;
      }

      if (!stars || stars < 10) {
        stars = 75; // Default minimum: 75 Stars ($1.00)
      }

      const amountUsd = Number((stars / 75).toFixed(2));
      const invoiceId = `inv_${user.id.slice(0, 8)}_${Date.now()}`;
      const payload = JSON.stringify({
        invoiceId,
        userId: user.id,
        telegramId: user.telegramId,
        stars,
        amountUsd,
      });

      let invoiceLink: string | null = null;
      let simulated = false;

      // Attempt official Telegram Bot API createInvoiceLink if token looks plausible
      if (CONFIG.BOT_TOKEN && !CONFIG.BOT_TOKEN.startsWith('test_')) {
        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/createInvoiceLink`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `Пополнение ${stars} Telegram Stars`,
              description: `Зачисление $${amountUsd.toFixed(2)} на игровой баланс (${stars} ⭐)`,
              payload,
              currency: 'XTR',
              prices: [{ label: `${stars} Telegram Stars`, amount: stars }],
              provider_token: '', // Must be empty string for Telegram Stars (XTR)
            }),
          });
          const tgData = (await tgRes.json()) as any;
          if (tgData && tgData.ok && tgData.result) {
            invoiceLink = tgData.result;
          }
        } catch (e) {
          console.warn('[Stars Payment] Failed to call Telegram Bot API, falling back to simulated link:', e);
        }
      }

      // If Bot API link could not be generated (dev mode, offline, or test token), produce fallback
      if (!invoiceLink) {
        simulated = true;
        invoiceLink = `https://t.me/GiftUpgraderBot?start=invoice_${invoiceId}`;
      }

      return reply.send({
        success: true,
        invoiceId,
        invoiceLink,
        stars,
        amountUsd,
        simulated,
      });
    }
  );

  // 4. Confirm Stars Payment (called upon successful Telegram invoice or manual simulation)
  fastify.post<{ Body: { stars: number; amountUsd?: number; invoiceId?: string } }>(
    '/api/payment/confirm-stars',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const user = request.user;
      const stars = Number(request.body?.stars) || 75;
      const amountUsd = Number(request.body?.amountUsd) || Number((stars / 75).toFixed(2));

      if (stars <= 0 || amountUsd <= 0) {
        return reply.status(400).send({ error: 'Некорректная сумма пополнения' });
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          // Increment balance and totalDeposited
          const updatedUser = await tx.user.update({
            where: { id: user.id },
            data: {
              balance: { increment: amountUsd },
              totalDeposited: { increment: amountUsd },
            },
          });

          // Check if withdrawals unlock & auto-unlock items if wager is satisfied
          const isWithdrawUnlocked = updatedUser.totalDeposited >= MIN_DEPOSIT_TO_WITHDRAW;
          let unlockedItemsCount = 0;

          if (updatedUser.wagerTotal >= updatedUser.wagerRequired) {
            const unlockRes = await tx.userInventory.updateMany({
              where: {
                userId: user.id,
                isLocked: true,
                status: 'AVAILABLE',
              },
              data: { isLocked: false },
            });
            unlockedItemsCount = unlockRes.count;
          }

          return { updatedUser, isWithdrawUnlocked, unlockedItemsCount };
        });

        return reply.send({
          success: true,
          message: `Успешно начислено +$${amountUsd.toFixed(2)} (${stars} ⭐)!`,
          balance: result.updatedUser.balance,
          totalDeposited: result.updatedUser.totalDeposited,
          isWithdrawUnlocked: result.isWithdrawUnlocked,
          unlockedItemsCount: result.unlockedItemsCount,
        });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
  );

  // 5. Telegram Webhook for official successful_payment events
  fastify.post('/api/payment/telegram-webhook', async (request, reply) => {
    try {
      const body = request.body as any;
      const successfulPayment = body?.message?.successful_payment;

      if (!successfulPayment) {
        return reply.send({ ok: true, ignored: true });
      }

      const totalStars = successfulPayment.total_amount || 0; // XTR
      const amountUsd = Number((totalStars / 75).toFixed(2));
      let payloadData: any = {};

      try {
        if (successfulPayment.invoice_payload) {
          payloadData = JSON.parse(successfulPayment.invoice_payload);
        }
      } catch (e) {
        console.warn('Could not parse invoice_payload:', e);
      }

      const userId = payloadData.userId;
      const telegramId = String(body.message?.from?.id || payloadData.telegramId || '');

      let targetUser = null;
      if (userId) {
        targetUser = await prisma.user.findUnique({ where: { id: userId } });
      }
      if (!targetUser && telegramId) {
        targetUser = await prisma.user.findUnique({ where: { telegramId } });
      }

      if (targetUser) {
        await prisma.user.update({
          where: { id: targetUser.id },
          data: {
            balance: { increment: amountUsd },
            totalDeposited: { increment: amountUsd },
          },
        });
        console.log(`[Webhook] Credited ${amountUsd} USD to user ${targetUser.id}`);
      }

      return reply.send({ ok: true, processed: true });
    } catch (err: any) {
      console.error('[Webhook Error]', err);
      return reply.send({ ok: false, error: err.message });
    }
  });
}
