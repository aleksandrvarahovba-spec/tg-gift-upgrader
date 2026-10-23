import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting NFT Gift Upgrader Database Seed (100% VERIFIED FRAGMENT CDN GIFTS) ---');

  const possiblePaths = [
    path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'verifiedFragmentGifts.json'),
    path.resolve('packages/server/prisma/verifiedFragmentGifts.json'),
    path.resolve('prisma/verifiedFragmentGifts.json'),
  ];
  const giftsJsonPath = possiblePaths.find((p) => fs.existsSync(p));
  if (!giftsJsonPath) {
    throw new Error(`Gifts data not found. Looked in: ${possiblePaths.join(', ')}`);
  }

  const giftsData: any[] = JSON.parse(fs.readFileSync(giftsJsonPath, 'utf-8'));
  console.log(`Seeding all ${giftsData.length} verified Fragment NFT gifts...`);

  for (const giftData of giftsData) {
    await prisma.gift.upsert({
      where: { slug: giftData.slug },
      update: {
        name: giftData.name,
        price: giftData.price,
        rarity: giftData.rarity,
        badge: giftData.badge,
        color: giftData.color,
        mintNumber: giftData.mintNumber || 1,
        collection: giftData.collection,
        imageUrl: giftData.imageUrl,
      },
      create: {
        name: giftData.name,
        slug: giftData.slug,
        price: giftData.price,
        rarity: giftData.rarity,
        badge: giftData.badge,
        color: giftData.color,
        mintNumber: giftData.mintNumber || 1,
        collection: giftData.collection,
        imageUrl: giftData.imageUrl,
      },
    });
  }

  // Create or refresh demo user
  const demoTelegramId = '123456789';
  const initialServerSeed = crypto.randomBytes(32).toString('hex');
  const initialServerHash = crypto.createHash('sha256').update(initialServerSeed).digest('hex');

  const user = await prisma.user.upsert({
    where: { telegramId: demoTelegramId },
    update: {
      balance: 1000.0,
      serverSeedHash: initialServerHash,
      serverSeed: initialServerSeed,
      lastDailyBonusAt: null,
      lastDailyBonus: null,
      dailyStreak: 0,
    },
    create: {
      telegramId: demoTelegramId,
      username: 'durov_vip',
      firstName: 'Pavel',
      lastName: 'Durov',
      balance: 1000.0,
      serverSeed: initialServerSeed,
      serverSeedHash: initialServerHash,
      clientSeed: 'fragment_2026',
      nonce: 0,
      lastDailyBonusAt: null,
      lastDailyBonus: null,
      dailyStreak: 0,
    },
  });

  console.log(`Demo User initialized: ${user.username} (${user.telegramId}) with balance $${user.balance}`);

  // Give demo user starter inventory items (several items of different values)
  const starterGifts = await prisma.gift.findMany({
    where: {
      price: { lte: 65 },
    },
    orderBy: { price: 'asc' },
    take: 8,
  });

  for (const g of starterGifts) {
    await prisma.userInventory.create({
      data: {
        userId: user.id,
        giftId: g.id,
        status: 'AVAILABLE',
      },
    });
  }
  console.log(`Granted ${starterGifts.length} starter authentic NFT gifts to demo user.`);

  const catalogCount = await prisma.gift.count();
  console.log(`Catalog seeded successfully! Total authentic Telegram gifts: ${catalogCount}`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
