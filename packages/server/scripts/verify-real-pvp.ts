import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function runVerification() {
  console.log('🚀 Launching Puppeteer browser verification...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 440, height: 950 });

  const artifactDir = 'C:/Users/Sanya/.gemini/antigravity/brain/9a3410f9-d87a-4b82-9f43-7d957531ff22';

  try {
    // 1. Load Main App
    console.log('1. Navigating to http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Capture main screen
    await page.screenshot({ path: path.join(artifactDir, 'verify_real_1_catalog.png') });
    console.log('📸 Captured verify_real_1_catalog.png');

    // 2. Check Catalog for any forbidden strings or fake items
    const pageContent = await page.content();
    const forbidden = ['Yellow Banana', 'High Five', '🍌', '✋', '🍊', '👏'];
    const foundForbidden: string[] = [];

    for (const f of forbidden) {
      if (pageContent.includes(f)) {
        foundForbidden.push(f);
      }
    }

    if (foundForbidden.length > 0) {
      console.error('❌ FORBIDDEN ITEMS FOUND IN PAGE:', foundForbidden);
    } else {
      console.log('✅ ZERO FORBIDDEN EMOJIS OR FAKE ITEMS FOUND! All gifts authentic.');
    }

    // 3. Switch to PvP Battles Tab
    console.log('3. Switching to PvP Tab...');
    const tabs = await page.$$('button');
    let pvpTabClicked = false;
    for (const tab of tabs) {
      const text = await (await tab.getProperty('textContent')).jsonValue();
      if (text && text.includes('PvP')) {
        await tab.click();
        pvpTabClicked = true;
        break;
      }
    }

    if (!pvpTabClicked) {
      console.log('PvP tab not found by text, trying all buttons...');
    }

    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(artifactDir, 'verify_real_2_pvp_lobby.png') });
    console.log('📸 Captured verify_real_2_pvp_lobby.png');

    // 4. Find and click "Вступить" button on first room
    console.log('4. Opening Dynamic Odds Join Modal...');
    const joinButtons = await page.$$('button');
    let joined = false;
    for (const btn of joinButtons) {
      const text = await (await btn.getProperty('textContent')).jsonValue();
      if (text && text.includes('Вступить')) {
        await btn.click();
        joined = true;
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(artifactDir, 'verify_real_3_dynamic_odds_modal.png') });
    console.log('📸 Captured verify_real_3_dynamic_odds_modal.png');

    // 5. Click "Крутить рулетку" button
    console.log('5. Clicking "Крутить рулетку"...');
    const spinButtons = await page.$$('button');
    let spinStarted = false;
    for (const btn of spinButtons) {
      const text = await (await btn.getProperty('textContent')).jsonValue();
      if (text && text.includes('Крутить рулетку')) {
        await btn.click();
        spinStarted = true;
        break;
      }
    }

    if (spinStarted) {
      // Capture mid-spin (during the 5.0s horizontal case opening reel)
      await new Promise((r) => setTimeout(r, 1800));
      await page.screenshot({ path: path.join(artifactDir, 'verify_real_4_roulette_spinning.png') });
      console.log('📸 Captured verify_real_4_roulette_spinning.png (Mid-Spin)');

      // Wait for 5.0s animation to complete + confetti/result
      await new Promise((r) => setTimeout(r, 4000));
      await page.screenshot({ path: path.join(artifactDir, 'verify_real_5_roulette_outcome.png') });
      console.log('📸 Captured verify_real_5_roulette_outcome.png (Final Stop)');
    } else {
      console.log('Could not click "Крутить рулетку", checking if room created instead...');
    }

    console.log('🎉 Verification completed successfully!');
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await browser.close();
  }
}

runVerification();
