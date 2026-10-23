import { prisma } from '../src/db.js';

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users in DB:', users.length);
  for (const u of users) {
    console.log({
      id: u.id,
      username: u.username,
      telegramId: u.telegramId,
      lastDailyBonus: u.lastDailyBonus,
      lastDailyBonusAt: u.lastDailyBonusAt,
      dailyStreak: u.dailyStreak,
    });
  }
}

main().finally(() => prisma.$disconnect());
