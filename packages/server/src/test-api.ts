import fastify from 'fastify';
import cors from '@fastify/cors';
import { authRoutes } from './routes/auth.routes.js';
import { giftsRoutes } from './routes/gifts.routes.js';
import { inventoryRoutes } from './routes/inventory.routes.js';
import { upgradeRoutes } from './routes/upgrade.routes.js';
import { pvpRoutes } from './routes/pvp.routes.js';
import { bonusesRoutes } from './routes/bonuses.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { calculateUpgradeMath, verifyGameResult, calculateRoll } from '@upgrader/shared';
import { prisma } from './db.js';

async function runTestSuite() {
  console.log('🧪 Starting NFT Gift Upgrader End-to-End API Test Suite...');

  const app = fastify();
  await app.register(cors);
  await app.register(authRoutes);
  await app.register(giftsRoutes);
  await app.register(inventoryRoutes);
  await app.register(upgradeRoutes);
  await app.register(pvpRoutes);
  await app.register(bonusesRoutes);
  await app.register(adminRoutes);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Ensure standard mode for baseline testing
  await prisma.user.updateMany({
    data: { luckyModeEnabled: false, maxWinLimit: 0 }
  });

  // TEST 1: Auth & User Profile
  console.log('\n--- Test Group 1: Auth & User Profile ---');
  const authRes = await app.inject({
    method: 'GET',
    url: '/api/auth/me',
    headers: { 'x-telegram-init-data': 'dev' }
  });
  assert(authRes.statusCode === 200, 'GET /api/auth/me returns 200');
  const authBody = JSON.parse(authRes.body);
  assert(Boolean(authBody.user?.id), 'User profile returned with valid ID');
  assert(typeof authBody.user?.balance === 'number', 'User balance is a number');
  assert(Boolean(authBody.user?.serverSeedHash), 'User has active serverSeedHash commitment');

  // TEST 2: Catalog Gifts
  console.log('\n--- Test Group 2: Catalog Gifts ---');
  const giftsRes = await app.inject({ method: 'GET', url: '/api/gifts' });
  assert(giftsRes.statusCode === 200, 'GET /api/gifts returns 200');
  const giftsBody = JSON.parse(giftsRes.body);
  assert(giftsBody.gifts.length >= 18, `Catalog contains at least 18 gifts (got ${giftsBody.gifts.length})`);

  // TEST 3: Claim Demo Gift
  console.log('\n--- Test Group 3: Faucet / Claim Demo Gift ---');
  const claimRes = await app.inject({
    method: 'POST',
    url: '/api/inventory/claim-demo',
    headers: { 'x-telegram-init-data': 'dev' }
  });
  assert(claimRes.statusCode === 200, 'POST /api/inventory/claim-demo returns 200');
  const claimBody = JSON.parse(claimRes.body);
  assert(claimBody.success === true, 'Claim response has success: true');
  assert(Boolean(claimBody.item?.gift?.name), `Claimed demo item: ${claimBody.item?.gift?.name}`);

  // TEST 4: Buy Gift & Sell Item (Economy)
  console.log('\n--- Test Group 4: Marketplace (Buy & Sell) ---');
  const cheapGift = giftsBody.gifts.find((g: any) => g.slug === 'homemade-cake') || giftsBody.gifts[0];
  const initialBalance = authBody.user.balance;

  const buyRes = await app.inject({
    method: 'POST',
    url: '/api/gifts/buy',
    headers: { 'x-telegram-init-data': 'dev' },
    payload: { giftId: cheapGift.id }
  });
  assert(buyRes.statusCode === 200, 'POST /api/gifts/buy returns 200');
  const buyBody = JSON.parse(buyRes.body);
  assert(buyBody.inventoryItem.giftId === cheapGift.id, 'Purchased correct item');
  assert(buyBody.newBalance < initialBalance, 'Balance successfully deducted');

  // Sell the purchased item
  const sellRes = await app.inject({
    method: 'POST',
    url: '/api/inventory/sell',
    headers: { 'x-telegram-init-data': 'dev' },
    payload: { inventoryId: buyBody.inventoryItem.id }
  });
  assert(sellRes.statusCode === 200, 'POST /api/inventory/sell returns 200');
  const sellBody = JSON.parse(sellRes.body);
  const expectedPayout = Number((cheapGift.price * 0.95).toFixed(2));
  assert(sellBody.payout === expectedPayout, `Sell payout is 95% of price: $${sellBody.payout}`);

  // TEST 5: Math & Provably Fair Rules
  console.log('\n--- Test Group 5: Math Abuse Protection (Limits 1.0% - 80.0%) ---');
  // Raw chance < 1%: $2.5 to $2500 -> 0.092%
  const lowMath = calculateUpgradeMath(2.5, 2500.0);
  assert(lowMath.isValid === false, 'Math correctly blocks chance < 1.0%');
  assert(lowMath.reason?.includes('1.0%') ?? false, 'Reason clearly mentions minimum threshold');

  // Raw chance > 80%: $100 to $105 -> 87.6%
  const highMath = calculateUpgradeMath(100.0, 105.0);
  assert(highMath.isValid === false, 'Math correctly blocks chance > 80.0%');
  assert(highMath.reason?.includes('80.0%') ?? false, 'Reason clearly mentions maximum threshold');

  // Valid chance: $10 to $25 -> (10/25) * 0.92 * 100 = 36.8%
  const validMath = calculateUpgradeMath(10.0, 25.0);
  assert(validMath.isValid === true, 'Math accepts valid 36.8% chance');
  assert(validMath.displayChance === 36.8, `Display chance matches exact formula: ${validMath.displayChance}%`);

  // TEST 6: Atomic Upgrade Roll & Provably Fair Audit
  console.log('\n--- Test Group 6: Atomic Upgrade Roll & Provably Fair Verification ---');
  // Get an available item
  const invRes = await app.inject({
    method: 'GET',
    url: '/api/inventory',
    headers: { 'x-telegram-init-data': 'dev' }
  });
  const invBody = JSON.parse(invRes.body);
  const sourceItem = invBody.items[0];
  assert(Boolean(sourceItem), `Found available inventory item for upgrade: ${sourceItem?.gift?.name} ($${sourceItem?.gift?.price})`);

  // Pick target gift with valid chance
  const targetGift = giftsBody.gifts.find((g: any) => {
    const m = calculateUpgradeMath(sourceItem.gift.price, g.price);
    return m.isValid;
  }) || giftsBody.gifts[1];

  const committedHashBeforeRoll = authBody.user.serverSeedHash;

  const rollRes = await app.inject({
    method: 'POST',
    url: '/api/upgrade/roll',
    headers: { 'x-telegram-init-data': 'dev' },
    payload: {
      inventoryId: sourceItem.id,
      targetGiftId: targetGift.id,
      clientSeed: 'test_client_seed_123'
    }
  });

  assert(rollRes.statusCode === 200, 'POST /api/upgrade/roll returns 200');
  const rollBody = JSON.parse(rollRes.body);

  // Provably Fair Verification
  const verify = verifyGameResult(
    rollBody.revealedServerSeed,
    committedHashBeforeRoll,
    rollBody.clientSeed,
    rollBody.nextNonce - 1,
    rollBody.roll
  );

  assert(verify.isHashMatch, 'Revealed serverSeed SHA-256 matches previously committed serverSeedHash!');
  assert(verify.isRollMatch, `HMAC-SHA256 roll calculation verified! (roll: ${rollBody.roll}%, isWon: ${rollBody.isWon})`);
  assert(rollBody.nextServerSeedHash !== committedHashBeforeRoll, 'Server seed was ROTATED to a new seed for next roll!');

  // Anti-dupe check: try rolling with the same item again
  console.log('\n--- Test Group 7: Anti-Dupe Race Condition Protection ---');
  const dupeRes = await app.inject({
    method: 'POST',
    url: '/api/upgrade/roll',
    headers: { 'x-telegram-init-data': 'dev' },
    payload: {
      inventoryId: sourceItem.id,
      targetGiftId: targetGift.id
    }
  });
  assert(dupeRes.statusCode === 400, 'Duplicate roll on consumed item rejected with 400 Bad Request');

  // Test Group 8: PvP Coinflip & Bot Rooms
  console.log('\n--- Test Group 8: PvP Coinflip & Bot Rooms ---');
  const pvpRoomsRes = await app.inject({
    method: 'GET',
    url: '/api/pvp/rooms',
  });
  assert(pvpRoomsRes.statusCode === 200, 'GET /api/pvp/rooms returns 200');
  const pvpRoomsBody = JSON.parse(pvpRoomsRes.body);
  assert(pvpRoomsBody.rooms.length >= 4, `Lobby has active rooms (got ${pvpRoomsBody.rooms.length})`);

  // Test Group 9: Bonuses & Promocodes
  console.log('\n--- Test Group 9: Bonuses & Promocodes ---');
  const bonusInfoRes = await app.inject({
    method: 'GET',
    url: '/api/bonuses/info',
    headers: { 'x-telegram-init-data': 'dev' },
  });
  assert(bonusInfoRes.statusCode === 200, 'GET /api/bonuses/info returns 200');
  const bonusInfoBody = JSON.parse(bonusInfoRes.body);
  assert(bonusInfoBody.referralLink.includes('t.me'), 'Valid referral link returned');

  // Test Group 10: Admin & Streamer Controls
  console.log('\n--- Test Group 10: Admin & Streamer Controls ---');
  const adminBalanceRes = await app.inject({
    method: 'POST',
    url: '/api/admin/add-balance',
    headers: { 'x-telegram-init-data': 'dev' },
    payload: { amount: 1000 },
  });
  assert(adminBalanceRes.statusCode === 200, 'POST /api/admin/add-balance returns 200');
  const adminLuckyRes = await app.inject({
    method: 'POST',
    url: '/api/admin/toggle-lucky-mode',
    headers: { 'x-telegram-init-data': 'dev' },
    payload: { enabled: true },
  });
  assert(adminLuckyRes.statusCode === 200, 'POST /api/admin/toggle-lucky-mode returns 200');

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`========================================`);

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
