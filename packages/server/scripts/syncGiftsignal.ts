import fs from 'fs';
import path from 'path';
import https from 'https';

export interface GiftSignalItem {
  name: string;
  category?: string;
  imgUrl?: string;
  priceTon?: number;
  priceUsd?: number;
}

export async function fetchAndParseGiftSignal(): Promise<GiftSignalItem[]> {
  const url = 'https://giftsignal.com/spisok-podarkov-v-telegram/';
  console.log(`[GiftSignal Sync] Fetching ${url}...`);

  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 6000,
      },
      (res) => {
        let rawHtml = '';
        res.on('data', (chunk) => (rawHtml += chunk));
        res.on('end', () => {
          try {
            console.log(`[GiftSignal Sync] Downloaded ${rawHtml.length} bytes.`);
            const parsed = parseGiftsFromHtml(rawHtml);
            resolve(parsed);
          } catch (e) {
            console.warn('[GiftSignal Sync] Parsing error:', e);
            resolve([]);
          }
        });
      }
    );

    req.on('error', (err) => {
      console.warn(`[GiftSignal Sync] Network warning (fallback enabled): ${err.message}`);
      resolve([]);
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn('[GiftSignal Sync] Timeout reached, proceeding with dataset merge.');
      resolve([]);
    });
  });
}

function parseGiftsFromHtml(html: string): GiftSignalItem[] {
  const items: GiftSignalItem[] = [];
  // Match table rows or gift cards with images and titles
  const regex = /<tr[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][\s\S]*?<\/tr>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const [, imgUrl, name] = match;
    if (name && name.trim()) {
      items.push({
        name: name.trim(),
        imgUrl,
      });
    }
  }

  // Also match general gift cards if present
  if (items.length === 0) {
    const imgRegex = /<img[^>]+src=["']([^"']*(?:gift|nft|cdn)[^"']*)["'][^>]*alt=["']([^"']+)["']/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      items.push({
        name: imgMatch[2].trim(),
        imgUrl: imgMatch[1],
      });
    }
  }

  console.log(`[GiftSignal Sync] Extracted ${items.length} gifts from HTML.`);
  return items;
}

if (process.argv[1]?.includes('syncGiftsignal')) {
  fetchAndParseGiftSignal().then((res) => {
    console.log(`Sync complete. Found ${res.length} items from online source.`);
  });
}
