import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { CONFIG } from '../config.js';
import { ProvablyFairService } from '../services/provablyFairService.js';
import { User } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    user: User;
  }
}

interface TelegramUserData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export function validateTelegramInitData(initDataRaw: string, botToken: string): TelegramUserData | null {
  try {
    const urlParams = new URLSearchParams(initDataRaw);
    const hash = urlParams.get('hash');
    if (!hash) return null;

    urlParams.delete('hash');
    const paramsList: string[] = [];
    for (const [key, value] of urlParams.entries()) {
      paramsList.push(`${key}=${value}`);
    }
    paramsList.sort();
    const dataCheckString = paramsList.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
      return null;
    }

    const userParam = urlParams.get('user');
    if (!userParam) return null;
    return JSON.parse(userParam) as TelegramUserData;
  } catch (err) {
    return null;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const initDataHeader = (request.headers['x-telegram-init-data'] || request.headers['authorization']) as string | undefined;
  const devUserIdHeader = request.headers['x-dev-user-id'] as string | undefined;

  let tgUser: TelegramUserData | null = null;

  // 1. Try validating real Telegram initData
  if (initDataHeader && initDataHeader !== 'dev' && !initDataHeader.startsWith('Bearer dev')) {
    const cleanData = initDataHeader.startsWith('Bearer ') ? initDataHeader.slice(7) : initDataHeader;
    tgUser = validateTelegramInitData(cleanData, CONFIG.BOT_TOKEN);
  }

  // 2. Dev mode fallback for local browser testing
  if (!tgUser && CONFIG.IS_DEV) {
    const targetTelegramId = devUserIdHeader || '123456789';
    tgUser = {
      id: parseInt(targetTelegramId.replace(/\D/g, '') || '123456789', 10),
      first_name: 'Pavel',
      last_name: 'Durov',
      username: 'durov',
      photo_url: 'https://telegram.org/img/t_logo.png'
    };
  }

  if (!tgUser) {
    return reply.status(401).send({ error: 'Unauthorized: Invalid or missing Telegram credentials' });
  }

  // 3. Find or create user in database
  const telegramIdStr = tgUser.id.toString();
  let user = await prisma.user.findUnique({
    where: { telegramId: telegramIdStr }
  });

  if (!user) {
    const serverSeed = ProvablyFairService.generateServerSeed();
    const serverSeedHash = ProvablyFairService.hashServerSeed(serverSeed);

    user = await prisma.user.create({
      data: {
        telegramId: telegramIdStr,
        username: tgUser.username || null,
        firstName: tgUser.first_name || 'Player',
        lastName: tgUser.last_name || null,
        photoUrl: tgUser.photo_url || null,
        balance: 100.0, // Initial balance
        serverSeed,
        serverSeedHash,
        clientSeed: 'default_client_seed',
        nonce: 0
      }
    });

    // Award starter items for new user
    const defaultGifts = await prisma.gift.findMany({ take: 3, orderBy: { price: 'asc' } });
    for (const g of defaultGifts) {
      await prisma.userInventory.create({
        data: {
          userId: user.id,
          giftId: g.id,
          status: 'AVAILABLE'
        }
      });
    }
  }

  request.user = user;
}
