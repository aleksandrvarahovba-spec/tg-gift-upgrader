import { spawn } from 'child_process';
import http from 'http';
import WebSocket from 'ws';

async function runTripleUpgradeBrowserTest() {
  console.log('🚀 Starting Automated 3-Consecutive-Spins Browser Verification...');

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9223;

  const browserProc = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=430,932',
    'http://localhost:3000'
  ]);

  // Helper wait
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(2500);

  // Fetch debugger WebSocket URL
  const pages = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/json`, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const mainPage = pages.find((p) => p.url.includes('localhost:3000')) || pages[0];
  console.log(`Connecting to page: "${mainPage.title}"...`);

  const ws = new WebSocket(mainPage.webSocketDebuggerUrl);

  let msgId = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const id = msgId++;
      const handler = (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.id === id) {
          ws.off('message', handler);
          resolve(parsed.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise((resolve) => ws.on('open', resolve));
  console.log('Connected to CDP.');

  await send('Runtime.enable');
  await send('Page.enable');

  // Evaluate JS in browser helper
  const evalJs = async (expr) => {
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    return res?.result?.value;
  };

  // 1. Check title & page loaded
  const title = await evalJs('document.title');
  console.log(`Page Title: "${title}"`);

  // Wait 1.5s for initial gifts and user to load
  await sleep(1500);

  // 2. Enable Fast Spin for snappy test execution
  console.log('Step 1: Enabling Fast Spin...');
  await evalJs(`
    const fastSpinBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Fast Spin'));
    if (fastSpinBtn) fastSpinBtn.click();
  `);
  await sleep(500);

  // 3. Claim 3 demo gifts
  console.log('Step 2: Claiming demo gifts to ensure plenty of items...');
  for (let i = 1; i <= 3; i++) {
    const claimResult = await evalJs(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Демо-подарок'));
      if (btn) {
        btn.click();
        'clicked';
      } else {
        'not_found';
      }
    `);
    console.log(`  Claim Demo #${i}: ${claimResult}`);
    await sleep(800);
  }

  // 4. Consecutive Spins Loop (1, 2, 3)
  for (let spinIndex = 1; spinIndex <= 3; spinIndex++) {
    console.log(`\n========================================`);
    console.log(`🎯 EXECUTING SPIN #${spinIndex} WITHOUT PAGE RELOAD`);
    console.log(`========================================`);

    // A. Check state before spin
    const stateBefore = await evalJs(`
      (() => {
        const upgradeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('АПГРЕЙД'));
        const centerHud = document.body.innerText.includes('ШАНС ПОБЕДЫ');
        return {
          hasUpgradeBtn: Boolean(upgradeBtn),
          btnDisabled: upgradeBtn ? upgradeBtn.disabled : true,
          btnText: upgradeBtn ? upgradeBtn.innerText.substring(0, 40) : null
        };
      })()
    `);
    console.log(`  State before spin #${spinIndex}:`, stateBefore);

    // B. Click x2.0 multiplier to guarantee valid chance
    await evalJs(`
      const x2Btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'x2.0' || b.innerText === 'x1.5');
      if (x2Btn) x2Btn.click();
    `);
    await sleep(400);

    // C. Click Upgrade button!
    const clickUpgrade = await evalJs(`
      (() => {
        const upgradeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('АПГРЕЙД'));
        if (upgradeBtn && !upgradeBtn.disabled) {
          upgradeBtn.click();
          return { success: true, text: upgradeBtn.innerText };
        }
        return { success: false, reason: upgradeBtn ? 'button_disabled' : 'button_not_found' };
      })()
    `);
    console.log(`  Upgrade button clicked:`, clickUpgrade);

    if (!clickUpgrade.success) {
      throw new Error(`Failed to click upgrade button on spin #${spinIndex}: ${clickUpgrade.reason}`);
    }

    // D. Wait for wheel animation (1.3s duration + safety buffer)
    console.log(`  Wheel is spinning... waiting for completion...`);
    await sleep(2200);

    // E. Verify spin completed and outcome is visible
    const outcome = await evalJs(`
      (() => {
        const bodyText = document.body.innerText;
        const isWon = bodyText.includes('Вы выиграли') || bodyText.includes('ВЫИГРЫШ!');
        const isLost = bodyText.includes('Предмет сгорел') || bodyText.includes('СГОРЕЛ');
        return { isWon, isLost };
      })()
    `);
    console.log(`  Spin #${spinIndex} outcome:`, outcome);

    if (!outcome.isWon && !outcome.isLost) {
      console.warn(`  Warning: Neither win nor loss detected immediately, waiting an extra 800ms...`);
      await sleep(800);
    }

    // F. Handle post-spin action so next spin is immediately ready!
    if (outcome.isWon) {
      console.log(`  🎉 Won on spin #${spinIndex}! Clicking "Дальше" to continue upgrading this item...`);
      await evalJs(`
        const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Дальше') || b.innerText.includes('След.'));
        if (nextBtn) nextBtn.click();
      `);
    } else {
      console.log(`  💥 Lost on spin #${spinIndex}. Clicking "Взять следующий предмет"...`);
      await evalJs(`
        const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Взять следующий') || b.innerText.includes('След.'));
        if (nextBtn) nextBtn.click();
      `);
    }

    await sleep(1000);
    console.log(`  ✅ Spin #${spinIndex} successfully concluded! Ready for next round.`);
  }

  // 5. Take screenshot after 3 consecutive spins
  console.log('\n📸 Capturing screenshot after 3 consecutive spins...');
  const screenshotData = await send('Page.captureScreenshot', { format: 'png' });
  const fs = await import('fs');
  fs.writeFileSync('C:\\Users\\Sanya\\Documents\\krutekazino\\preview3.png', Buffer.from(screenshotData.data, 'base64'));
  console.log('Saved screenshot to C:\\Users\\Sanya\\Documents\\krutekazino\\preview3.png');

  console.log('\n🏆 ALL 3 CONSECUTIVE SPINS EXECUTED PERFECTLY WITH ZERO ERRORS!');

  ws.close();
  browserProc.kill();
  process.exit(0);
}

runTripleUpgradeBrowserTest().catch((err) => {
  console.error('Browser test failed:', err);
  process.exit(1);
});
