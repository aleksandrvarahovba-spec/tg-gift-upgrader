async function test() {
  console.log('1. Calling reset-daily...');
  const resetRes = await fetch('http://localhost:3001/api/bonuses/reset-daily', { method: 'POST' });
  console.log('Reset response:', await resetRes.json());

  console.log('2. Checking daily status...');
  const statusRes = await fetch('http://localhost:3001/api/bonuses/daily-status');
  const statusData = await statusRes.json();
  console.log('Daily status:', { canClaim: statusData.canClaim, streak: statusData.streak });

  console.log('3. Claiming daily bonus...');
  const claimRes = await fetch('http://localhost:3001/api/bonuses/claim-daily', { method: 'POST' });
  const claimData = await claimRes.json();
  console.log('Claim result:', { success: claimData.success, rewardText: claimData.rewardText, balance: claimData.balance });

  console.log('4. Checking status after claim...');
  const status2Res = await fetch('http://localhost:3001/api/bonuses/daily-status');
  const status2Data = await status2Res.json();
  console.log('After claim status:', { canClaim: status2Data.canClaim, nextClaimAt: status2Data.nextClaimAt });
}

test().catch(console.error);
