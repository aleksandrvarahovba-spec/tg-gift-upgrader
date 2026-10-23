import https from 'https';
import fs from 'fs';
import path from 'path';

async function checkUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.request(
      url,
      { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 },
      (res) => {
        resolve(res.statusCode === 200 && (res.headers['content-type']?.includes('image') || false));
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

// Complete candidates list
const CANDIDATES = [
  // Mythic / Grail ($500 - $3500)
  { name: 'Plush Pepe', slug: 'plushpepe', price: 1850.0, rarity: 'LEGENDARY', badge: '1 из 1K', color: '#10B981' },
  { name: "Durov's Cap", slug: 'durovscap', price: 1200.0, rarity: 'LEGENDARY', badge: '1 из 5K', color: '#00D2FF' },
  { name: 'Snoop Dogg', slug: 'snoopdogg', price: 2800.0, rarity: 'LEGENDARY', badge: '1 из 250', color: '#8B5CF6' },
  { name: "Khabib's Papakha", slug: 'khabibspapakha', price: 2400.0, rarity: 'LEGENDARY', badge: '1 из 500', color: '#F59E0B' },
  { name: 'Precious Peach', slug: 'preciouspeach', price: 950.0, rarity: 'LEGENDARY', badge: '1 из 5K', color: '#F43F5E' },
  { name: 'Swiss Watch', slug: 'swisswatch', price: 850.0, rarity: 'LEGENDARY', badge: '1 из 5K', color: '#F59E0B' },
  { name: 'Signet Ring', slug: 'signetring', price: 780.0, rarity: 'LEGENDARY', badge: '1 из 2.5K', color: '#F59E0B' },
  { name: 'Mini Oscar', slug: 'minioscar', price: 775.0, rarity: 'LEGENDARY', badge: '1 из 2.5K', color: '#EAB308' },
  { name: 'Diamond Ring', slug: 'diamondring', price: 690.0, rarity: 'LEGENDARY', badge: '1 из 5K', color: '#06B6D4' },
  { name: 'Magic Potion', slug: 'magicpotion', price: 635.0, rarity: 'LEGENDARY', badge: '1 из 5K', color: '#A855F7' },
  { name: 'Low Rider', slug: 'lowrider', price: 620.0, rarity: 'LEGENDARY', badge: '1 из 10K', color: '#A855F7' },
  { name: 'Loot Bag', slug: 'lootbag', price: 615.0, rarity: 'LEGENDARY', badge: '1 из 5K', color: '#10B981' },
  { name: 'Scared Cat', slug: 'scaredcat', price: 580.0, rarity: 'LEGENDARY', badge: '1 из 10K', color: '#6366F1' },
  { name: 'Vintage Cigar', slug: 'vintagecigar', price: 540.0, rarity: 'LEGENDARY', badge: '1 из 5K', color: '#D97706' },

  // Epic ($80 - $450)
  { name: 'Heart Locket', slug: 'heartlocket', price: 450.0, rarity: 'EPIC', badge: '1 из 500', color: '#F43F5E' },
  { name: 'Timeless Book', slug: 'timelessbook', price: 450.0, rarity: 'EPIC', badge: '1 из 250', color: '#F59E0B' },
  { name: 'Electric Skull', slug: 'electricskull', price: 440.0, rarity: 'EPIC', badge: '1 из 2K', color: '#00D2FF' },
  { name: 'UFC Strike', slug: 'ufcstrike', price: 420.0, rarity: 'EPIC', badge: '1 из 5K', color: '#EF4444' },
  { name: 'Heroic Helmet', slug: 'heroichelmet', price: 410.0, rarity: 'EPIC', badge: '1 из 1K', color: '#F59E0B' },
  { name: 'Neko Helmet', slug: 'nekohelmet', price: 390.0, rarity: 'EPIC', badge: '1 из 2.5K', color: '#EC4899' },
  { name: 'Resistance Dog', slug: 'resistancedog', price: 390.0, rarity: 'EPIC', badge: '1 из 1.5K', color: '#3B82F6' },
  { name: 'Gem Signet', slug: 'gemsignet', price: 380.0, rarity: 'EPIC', badge: '1 из 3K', color: '#8B5CF6' },
  { name: 'Kissed Frog', slug: 'kissedfrog', price: 360.0, rarity: 'EPIC', badge: '1 из 2.5K', color: '#10B981' },
  { name: 'Light Sword', slug: 'lightsword', price: 350.0, rarity: 'EPIC', badge: '1 из 3K', color: '#00D2FF' },
  { name: 'Bonded Ring', slug: 'bondedring', price: 340.0, rarity: 'EPIC', badge: '1 из 4K', color: '#06B6D4' },
  { name: 'Genie Lamp', slug: 'genielamp', price: 320.0, rarity: 'EPIC', badge: '1 из 5K', color: '#EAB308' },
  { name: 'Eternal Rose', slug: 'eternalrose', price: 310.0, rarity: 'EPIC', badge: '1 из 5K', color: '#EF4444' },
  { name: 'Rare Bird', slug: 'rarebird', price: 310.0, rarity: 'EPIC', badge: '1 из 2.5K', color: '#3B82F6' },
  { name: 'Perfume Bottle', slug: 'perfumebottle', price: 290.0, rarity: 'EPIC', badge: '1 из 5K', color: '#EC4899' },
  { name: 'Stellar Rocket', slug: 'stellarrocket', price: 280.0, rarity: 'EPIC', badge: '1 из 4K', color: '#EF4444' },
  { name: 'Snoop Cigar', slug: 'snoopcigar', price: 275.0, rarity: 'EPIC', badge: '1 из 5K', color: '#D97706' },
  { name: 'Astral Shard', slug: 'astralshard', price: 260.0, rarity: 'EPIC', badge: '1 из 5K', color: '#8B5CF6' },
  { name: 'Swag Bag', slug: 'swagbag', price: 240.0, rarity: 'EPIC', badge: '1 из 5K', color: '#10B981' },
  { name: 'Westside Sign', slug: 'westsidesign', price: 220.0, rarity: 'EPIC', badge: '1 из 5K', color: '#EAB308' },
  { name: 'Record Player', slug: 'recordplayer', price: 210.0, rarity: 'EPIC', badge: '1 из 5K', color: '#D97706' },
  { name: 'Mousse Cake', slug: 'moussecake', price: 195.0, rarity: 'EPIC', badge: '1 из 20K', color: '#F472B6' },
  { name: 'Voodoo Doll', slug: 'voodoodoll', price: 195.0, rarity: 'EPIC', badge: '1 из 5K', color: '#8B5CF6' },
  { name: 'Lol Pop', slug: 'lolpop', price: 180.0, rarity: 'EPIC', badge: '1 из 50K', color: '#8B5CF6' },
  { name: 'Nail Bracelet', slug: 'nailbracelet', price: 180.0, rarity: 'EPIC', badge: '1 из 5K', color: '#94A3B8' },
  { name: 'Homemade Cake', slug: 'homemadecake', price: 110.0, rarity: 'EPIC', badge: '1 из 10K', color: '#F59E0B' },

  // Rare ($20 - $75)
  { name: 'Jelly Bunny', slug: 'jellybunny', price: 75.0, rarity: 'RARE', badge: '1 из 2K', color: '#06B6D4' },
  { name: 'Pet Snake', slug: 'petsnake', price: 74.0, rarity: 'RARE', badge: '1 из 15K', color: '#10B981' },
  { name: 'Ion Gem', slug: 'iongem', price: 72.0, rarity: 'RARE', badge: '1 из 7K', color: '#00D2FF' },
  { name: 'Money Pot', slug: 'moneypot', price: 71.0, rarity: 'RARE', badge: '1 из 8K', color: '#EAB308' },
  { name: 'Trapped Heart', slug: 'trappedheart', price: 70.0, rarity: 'RARE', badge: '1 из 8K', color: '#EC4899' },
  { name: 'Ginger Cookie', slug: 'gingercookie', price: 68.0, rarity: 'RARE', badge: '1 из 10K', color: '#D97706' },
  { name: 'Hex Pot', slug: 'hexpot', price: 68.0, rarity: 'RARE', badge: '1 из 10K', color: '#8B5CF6' },
  { name: 'Tama Gadget', slug: 'tamagadget', price: 66.0, rarity: 'RARE', badge: '1 из 9K', color: '#EC4899' },
  { name: 'Santa Hat', slug: 'santahat', price: 65.0, rarity: 'RARE', badge: '1 из 15K', color: '#EF4444' },
  { name: 'Big Year', slug: 'bigyear', price: 65.0, rarity: 'RARE', badge: '1 из 10K', color: '#F59E0B' },
  { name: 'Lunar Snake', slug: 'lunarsnake', price: 64.0, rarity: 'RARE', badge: '1 из 10K', color: '#10B981' },
  { name: 'Moon Pendant', slug: 'moonpendant', price: 63.0, rarity: 'RARE', badge: '1 из 10K', color: '#00D2FF' },
  { name: 'Sharp Tongue', slug: 'sharptongue', price: 62.0, rarity: 'RARE', badge: '1 из 10K', color: '#EF4444' },
  { name: 'Crystal Ball', slug: 'crystalball', price: 60.0, rarity: 'RARE', badge: '1 из 12K', color: '#8B5CF6' },
  { name: 'Jolly Chimp', slug: 'jollychimp', price: 59.0, rarity: 'RARE', badge: '1 из 12K', color: '#D97706' },
  { name: 'Evil Eye', slug: 'evileye', price: 58.0, rarity: 'RARE', badge: '1 из 15K', color: '#3B82F6' },
  { name: 'Snake Box', slug: 'snakebox', price: 58.0, rarity: 'RARE', badge: '1 из 12K', color: '#10B981' },
  { name: 'Witch Hat', slug: 'witchhat', price: 56.0, rarity: 'RARE', badge: '1 из 15K', color: '#8B5CF6' },
  { name: 'Spiced Wine', slug: 'spicedwine', price: 55.0, rarity: 'RARE', badge: '1 из 30K', color: '#E11D48' },
  { name: 'Skull Flower', slug: 'skullflower', price: 54.0, rarity: 'RARE', badge: '1 из 12K', color: '#10B981' },
  { name: 'Mighty Arm', slug: 'mightyarm', price: 53.0, rarity: 'RARE', badge: '1 из 15K', color: '#F59E0B' },
  { name: 'Snow Globe', slug: 'snowglobe', price: 52.0, rarity: 'RARE', badge: '1 из 18K', color: '#06B6D4' },
  { name: 'Love Potion', slug: 'lovepotion', price: 50.0, rarity: 'RARE', badge: '1 из 25K', color: '#EC4899' },
  { name: 'Jack-in-the-Box', slug: 'jackinthebox', price: 49.0, rarity: 'RARE', badge: '1 из 20K', color: '#EF4444' },
  { name: 'Spy Agaric', slug: 'spyagaric', price: 48.0, rarity: 'RARE', badge: '1 из 20K', color: '#EF4444' },
  { name: 'Sky Stilettos', slug: 'skystilettos', price: 48.0, rarity: 'RARE', badge: '1 из 20K', color: '#06B6D4' },
  { name: 'Flying Broom', slug: 'flyingbroom', price: 46.0, rarity: 'RARE', badge: '1 из 20K', color: '#D97706' },
  { name: 'Victory Medal', slug: 'victorymedal', price: 46.0, rarity: 'RARE', badge: '1 из 20K', color: '#EAB308' },
  { name: 'Toy Bear', slug: 'toybear', price: 45.0, rarity: 'RARE', badge: '1 из 25K', color: '#F59E0B' },
  { name: 'Love Candle', slug: 'lovecandle', price: 44.0, rarity: 'RARE', badge: '1 из 25K', color: '#F43F5E' },
  { name: 'Sakura Flower', slug: 'sakuraflower', price: 43.0, rarity: 'RARE', badge: '1 из 25K', color: '#EC4899' },
  { name: 'Lush Bouquet', slug: 'lushbouquet', price: 42.0, rarity: 'RARE', badge: '1 из 25K', color: '#EC4899' },
  { name: 'Joyful Bundle', slug: 'joyfulbundle', price: 40.0, rarity: 'RARE', badge: '1 из 25K', color: '#F43F5E' },
  { name: 'Bling Binky', slug: 'blingbinky', price: 39.0, rarity: 'RARE', badge: '1 из 30K', color: '#F59E0B' },
  { name: 'Eternal Candle', slug: 'eternalcandle', price: 38.0, rarity: 'RARE', badge: '1 из 30K', color: '#F59E0B' },
  { name: 'Top Hat', slug: 'tophat', price: 38.0, rarity: 'RARE', badge: '1 из 30K', color: '#1E293B' },
  { name: 'Star Notepad', slug: 'starnotepad', price: 35.0, rarity: 'RARE', badge: '1 из 35K', color: '#F59E0B' },
  { name: 'Cupid Charm', slug: 'cupidcharm', price: 32.0, rarity: 'RARE', badge: '1 из 50K', color: '#F43F5E' },

  // Uncommon / Common real items ($3.50 - $18)
  { name: 'Candy Cane', slug: 'candycane', price: 7.5, rarity: 'UNCOMMON', badge: '1 из 50K', color: '#EF4444' },
  { name: 'Bow Tie', slug: 'bowtie', price: 3.6, rarity: 'COMMON', badge: '1 из 100K', color: '#0284C7' },
];

async function main() {
  console.log(`Starting CDN validation for ${CANDIDATES.length} gifts...`);
  const verifiedGifts = [];

  // Possible mint numbers to try (gives diversity of official backdrops)
  const mintVariants = [1, 2, 3, 5, 7, 10, 15, 24, 42];

  for (let i = 0; i < CANDIDATES.length; i++) {
    const gift = CANDIDATES[i];
    const cleanSlug = gift.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Deterministically pick a target mint number based on index for backdrop variety
    const preferredMint = mintVariants[i % mintVariants.length];

    let foundMint: number | null = null;
    let foundUrl: string | null = null;

    // First try preferred mint
    const urlPref = `https://nft.fragment.com/gift/${cleanSlug}-${preferredMint}.medium.jpg`;
    if (await checkUrl(urlPref)) {
      foundMint = preferredMint;
      foundUrl = urlPref;
    } else {
      // Try other mints
      for (const m of [1, 2, 3, 4, 5, 7, 10]) {
        const u = `https://nft.fragment.com/gift/${cleanSlug}-${m}.medium.jpg`;
        if (await checkUrl(u)) {
          foundMint = m;
          foundUrl = u;
          break;
        }
      }
    }

    if (foundUrl && foundMint) {
      verifiedGifts.push({
        name: gift.name,
        slug: `${cleanSlug}-nft`,
        price: gift.price,
        rarity: gift.rarity,
        badge: gift.badge,
        color: gift.color,
        mintNumber: foundMint,
        collection: 'Telegram NFT Gifts',
        imageUrl: foundUrl,
      });
      console.log(`[${verifiedGifts.length}/${CANDIDATES.length}] OK: ${gift.name} -> #${foundMint} (${foundUrl})`);
    } else {
      console.warn(`[SKIP 404]: ${gift.name} (${cleanSlug}) does not resolve on Fragment CDN`);
    }
  }

  console.log(`\nValidation complete! Total verified 200 OK Fragment NFT gifts: ${verifiedGifts.length}`);
  fs.writeFileSync(
    'packages/server/prisma/verifiedFragmentGifts.json',
    JSON.stringify(verifiedGifts, null, 2),
    'utf-8'
  );
  console.log('Saved to packages/server/prisma/verifiedFragmentGifts.json');
}

main().catch(console.error);
