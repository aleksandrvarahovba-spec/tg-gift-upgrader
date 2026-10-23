import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning old SVG gifts...');
  // Find gifts with svg data URIs
  const oldGifts = await prisma.gift.findMany({
    where: { imageUrl: { startsWith: 'data:image/svg' } }
  });
  console.log(`Found ${oldGifts.length} old gifts to remove.`);

  for (const g of oldGifts) {
    await prisma.userInventory.deleteMany({ where: { giftId: g.id } });
    await prisma.upgradeHistory.deleteMany({
      where: {
        OR: [{ sourceGiftId: g.id }, { targetGiftId: g.id }]
      }
    });
    await prisma.gift.delete({ where: { id: g.id } });
  }

  const remaining = await prisma.gift.findMany({ orderBy: { price: 'asc' } });
  console.log(`Now catalog contains strictly ${remaining.length} authentic Telegram NFT gifts:`);
  remaining.forEach((g, i) => console.log(` ${i + 1}. ${g.name} (${g.badge}) - $${g.price}`));

  await prisma.$disconnect();
}

main().catch(console.error);
