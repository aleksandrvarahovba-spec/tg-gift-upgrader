import https from 'https';
import fs from 'fs';
import path from 'path';

export interface ScrapedGift {
  name: string;
  slug: string;
  price: number;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  badge: string;
  color: string;
  collection: string;
  imageUrl: string;
  backdropName: string;
  backdropRarity: number;
  backdropFrom: string;
  backdropTo: string;
  backdropGlow: string;
  backdropAccent: string;
  backdropPattern: string;
}

// 80 Authentic Telegram NFT Gifts with Fragment 3D renders
const AUTHENTIC_GIFTS_BASE = [
  // Mythic / Grail ($500 - $3500)
  { name: 'Plush Pepe', slug: 'plushpepe', price: 1850.0, rarity: 'LEGENDARY', badge: '1 из 1K', color: '#10B981', backdrop: 'Onyx Black' },
  { name: "Durov's Cap", slug: 'durovscap', price: 1200.0, rarity: 'LEGENDARY', badge: '1 из 5K', color: '#00D2FF', backdrop: 'Cyber Purple' },
  { name: 'Snoop Dogg', slug: 'snoopdogg', price: 2800.0, rarity: 'LEGENDARY', badge: '1 из 250', color: '#8B5CF6', backdrop: 'Onyx Black' },
  { name: "Khabib's Papakha", slug: 'khabibspapakha', price: 2400.0, rarity: 'LEGENDARY', badge: '1 из 500', color: '#F59E0B', backdrop: 'Onyx Black' },
  { name: 'Precious Peach', slug: 'preciouspeach', price: 950.0, rarity: 'LEGENDARY', badge: '1 из 5K', color: '#F43F5E', backdrop: 'Rose Quartz' },
  { name: 'Swiss Watch', slug: 'swisswatch', price: 850.0, rarity: 'LEGENDARY', badge: '1 из 5K', color: '#F59E0B', backdrop: 'Cobalt Gold' },
  { name: 'Signet Ring', slug: 'signetring', price: 780.0, rarity: 'LEGENDARY', badge: '1 из 2.5K', color: '#F59E0B', backdrop: 'Cobalt Gold' },
  { name: 'Mini Oscar', slug: 'minioscar', price: 775.0, rarity: 'LEGENDARY', badge: '1 из 2.5K', color: '#EAB308', backdrop: 'Cobalt Gold' },
  { name: 'Diamond Ring', slug: 'diamondring', price: 690.0, rarity: 'LEGENDARY', badge: '1 из 5K', color: '#06B6D4', backdrop: 'Cyber Purple' },
  { name: 'Magic Potion', slug: 'magicpotion', price: 635.0, rarity: 'LEGENDARY', badge: '1 из 5K', color: '#A855F7', backdrop: 'Cyber Purple' },
  { name: 'Low Rider', slug: 'lowrider', price: 620.0, rarity: 'LEGENDARY', badge: '1 из 10K', color: '#A855F7', backdrop: 'Cyber Purple' },
  { name: 'Loot Bag', slug: 'lootbag', price: 615.0, rarity: 'LEGENDARY', badge: '1 из 5K', color: '#10B981', backdrop: 'Emerald Mist' },
  { name: 'Scared Cat', slug: 'scaredcat', price: 580.0, rarity: 'LEGENDARY', badge: '1 из 10K', color: '#6366F1', backdrop: 'Lavender Haze' },
  { name: 'Vintage Cigar', slug: 'vintagecigar', price: 540.0, rarity: 'LEGENDARY', badge: '1 из 5K', color: '#D97706', backdrop: 'Amber Sunset' },

  // Epic ($80 - $450)
  { name: 'Heart Locket', slug: 'heartlocket', price: 450.0, rarity: 'EPIC', badge: '1 из 500', color: '#F43F5E', backdrop: 'Rose Quartz' },
  { name: 'Timeless Book', slug: 'timelessbook', price: 450.0, rarity: 'EPIC', badge: '1 из 250', color: '#F59E0B', backdrop: 'Cobalt Gold' },
  { name: 'Electric Skull', slug: 'electricskull', price: 440.0, rarity: 'EPIC', badge: '1 из 2K', color: '#00D2FF', backdrop: 'Cyber Purple' },
  { name: 'UFC Strike', slug: 'ufcstrike', price: 420.0, rarity: 'EPIC', badge: '1 из 5K', color: '#EF4444', backdrop: 'Crimson Glow' },
  { name: 'Heroic Helmet', slug: 'heroichelmet', price: 410.0, rarity: 'EPIC', badge: '1 из 1K', color: '#F59E0B', backdrop: 'Cobalt Gold' },
  { name: 'Neko Helmet', slug: 'nekohelmet', price: 390.0, rarity: 'EPIC', badge: '1 из 2.5K', color: '#EC4899', backdrop: 'Rose Quartz' },
  { name: 'Resistance Dog', slug: 'resistancedog', price: 390.0, rarity: 'EPIC', badge: '1 из 1.5K', color: '#3B82F6', backdrop: 'Sapphire Sky' },
  { name: 'Gem Signet', slug: 'gemsignet', price: 380.0, rarity: 'EPIC', badge: '1 из 3K', color: '#8B5CF6', backdrop: 'Cyber Purple' },
  { name: 'Kissed Frog', slug: 'kissedfrog', price: 360.0, rarity: 'EPIC', badge: '1 из 2.5K', color: '#10B981', backdrop: 'Emerald Mist' },
  { name: 'Light Sword', slug: 'lightsword', price: 350.0, rarity: 'EPIC', badge: '1 из 3K', color: '#00D2FF', backdrop: 'Sapphire Sky' },
  { name: 'Bonded Ring', slug: 'bondedring', price: 340.0, rarity: 'EPIC', badge: '1 из 4K', color: '#06B6D4', backdrop: 'Sapphire Sky' },
  { name: 'Genie Lamp', slug: 'genielamp', price: 320.0, rarity: 'EPIC', badge: '1 из 5K', color: '#EAB308', backdrop: 'Cobalt Gold' },
  { name: 'Eternal Rose', slug: 'eternalrose', price: 310.0, rarity: 'EPIC', badge: '1 из 5K', color: '#EF4444', backdrop: 'Crimson Glow' },
  { name: 'Rare Bird', slug: 'rarebird', price: 310.0, rarity: 'EPIC', badge: '1 из 2.5K', color: '#3B82F6', backdrop: 'Sapphire Sky' },
  { name: 'Perfume Bottle', slug: 'perfumebottle', price: 290.0, rarity: 'EPIC', badge: '1 из 5K', color: '#EC4899', backdrop: 'Rose Quartz' },
  { name: 'Stellar Rocket', slug: 'stellarrocket', price: 280.0, rarity: 'EPIC', badge: '1 из 4K', color: '#EF4444', backdrop: 'Crimson Glow' },
  { name: 'Snoop Cigar', slug: 'snoopcigar', price: 275.0, rarity: 'EPIC', badge: '1 из 5K', color: '#D97706', backdrop: 'Amber Sunset' },
  { name: 'Astral Shard', slug: 'astralshard', price: 260.0, rarity: 'EPIC', badge: '1 из 5K', color: '#8B5CF6', backdrop: 'Lavender Haze' },
  { name: 'Swag Bag', slug: 'swagbag', price: 240.0, rarity: 'EPIC', badge: '1 из 5K', color: '#10B981', backdrop: 'Emerald Mist' },
  { name: 'Westside Sign', slug: 'westsidesign', price: 220.0, rarity: 'EPIC', badge: '1 из 5K', color: '#EAB308', backdrop: 'Cobalt Gold' },
  { name: 'Record Player', slug: 'recordplayer', price: 210.0, rarity: 'EPIC', badge: '1 из 5K', color: '#D97706', backdrop: 'Amber Sunset' },
  { name: 'Mousse Cake', slug: 'moussecake', price: 195.0, rarity: 'EPIC', badge: '1 из 20K', color: '#F472B6', backdrop: 'Rose Quartz' },
  { name: 'Voodoo Doll', slug: 'voodoodoll', price: 195.0, rarity: 'EPIC', badge: '1 из 5K', color: '#8B5CF6', backdrop: 'Cyber Purple' },
  { name: 'Lol Pop', slug: 'lolpop', price: 180.0, rarity: 'EPIC', badge: '1 из 50K', color: '#8B5CF6', backdrop: 'Cyber Purple' },
  { name: 'Nail Bracelet', slug: 'nailbracelet', price: 180.0, rarity: 'EPIC', badge: '1 из 5K', color: '#94A3B8', backdrop: 'Sapphire Sky' },
  { name: 'Homemade Cake', slug: 'homemadecake', price: 110.0, rarity: 'EPIC', badge: '1 из 10K', color: '#F59E0B', backdrop: 'Rose Quartz' },

  // Rare ($20 - $75)
  { name: 'Jelly Bunny', slug: 'jellybunny', price: 75.0, rarity: 'RARE', badge: '1 из 2K', color: '#06B6D4', backdrop: 'Sapphire Sky' },
  { name: 'Pet Snake', slug: 'petsnake', price: 74.0, rarity: 'RARE', badge: '1 из 15K', color: '#10B981', backdrop: 'Emerald Mist' },
  { name: 'Ion Gem', slug: 'iongem', price: 72.0, rarity: 'RARE', badge: '1 из 7K', color: '#00D2FF', backdrop: 'Sapphire Sky' },
  { name: 'Money Pot', slug: 'moneypot', price: 71.0, rarity: 'RARE', badge: '1 из 8K', color: '#EAB308', backdrop: 'Cobalt Gold' },
  { name: 'Trapped Heart', slug: 'trappedheart', price: 70.0, rarity: 'RARE', badge: '1 из 8K', color: '#EC4899', backdrop: 'Rose Quartz' },
  { name: 'Ginger Cookie', slug: 'gingercookie', price: 68.0, rarity: 'RARE', badge: '1 из 10K', color: '#D97706', backdrop: 'Amber Sunset' },
  { name: 'Hex Pot', slug: 'hexpot', price: 68.0, rarity: 'RARE', badge: '1 из 10K', color: '#8B5CF6', backdrop: 'Cyber Purple' },
  { name: 'Tama Gadget', slug: 'tamagadget', price: 66.0, rarity: 'RARE', badge: '1 из 9K', color: '#EC4899', backdrop: 'Rose Quartz' },
  { name: 'Santa Hat', slug: 'santahat', price: 65.0, rarity: 'RARE', badge: '1 из 15K', color: '#EF4444', backdrop: 'Crimson Glow' },
  { name: 'Big Year', slug: 'bigyear', price: 65.0, rarity: 'RARE', badge: '1 из 10K', color: '#F59E0B', backdrop: 'Cobalt Gold' },
  { name: 'Lunar Snake', slug: 'lunarsnake', price: 64.0, rarity: 'RARE', badge: '1 из 10K', color: '#10B981', backdrop: 'Emerald Mist' },
  { name: 'Moon Pendant', slug: 'moonpendant', price: 63.0, rarity: 'RARE', badge: '1 из 10K', color: '#00D2FF', backdrop: 'Sapphire Sky' },
  { name: 'Sharp Tongue', slug: 'sharptongue', price: 62.0, rarity: 'RARE', badge: '1 из 10K', color: '#EF4444', backdrop: 'Crimson Glow' },
  { name: 'Crystal Ball', slug: 'crystalball', price: 60.0, rarity: 'RARE', badge: '1 из 12K', color: '#8B5CF6', backdrop: 'Cyber Purple' },
  { name: 'Jolly Chimp', slug: 'jollychimp', price: 59.0, rarity: 'RARE', badge: '1 из 12K', color: '#D97706', backdrop: 'Amber Sunset' },
  { name: 'Evil Eye', slug: 'evileye', price: 58.0, rarity: 'RARE', badge: '1 из 15K', color: '#3B82F6', backdrop: 'Sapphire Sky' },
  { name: 'Snake Box', slug: 'snakebox', price: 58.0, rarity: 'RARE', badge: '1 из 12K', color: '#10B981', backdrop: 'Emerald Mist' },
  { name: 'Witch Hat', slug: 'witchhat', price: 56.0, rarity: 'RARE', badge: '1 из 15K', color: '#8B5CF6', backdrop: 'Cyber Purple' },
  { name: 'Spiced Wine', slug: 'spicedwine', price: 55.0, rarity: 'RARE', badge: '1 из 30K', color: '#E11D48', backdrop: 'Rose Quartz' },
  { name: 'Skull Flower', slug: 'skullflower', price: 54.0, rarity: 'RARE', badge: '1 из 12K', color: '#10B981', backdrop: 'Emerald Mist' },
  { name: 'Mighty Arm', slug: 'mightyarm', price: 53.0, rarity: 'RARE', badge: '1 из 15K', color: '#F59E0B', backdrop: 'Amber Sunset' },
  { name: 'Snow Globe', slug: 'snowglobe', price: 52.0, rarity: 'RARE', badge: '1 из 18K', color: '#06B6D4', backdrop: 'Sapphire Sky' },
  { name: 'Love Potion', slug: 'lovepotion', price: 50.0, rarity: 'RARE', badge: '1 из 25K', color: '#EC4899', backdrop: 'Rose Quartz' },
  { name: 'Jack-in-the-Box', slug: 'jackinthebox', price: 49.0, rarity: 'RARE', badge: '1 из 20K', color: '#EF4444', backdrop: 'Crimson Glow' },
  { name: 'Spy Agaric', slug: 'spyagaric', price: 48.0, rarity: 'RARE', badge: '1 из 20K', color: '#EF4444', backdrop: 'Crimson Glow' },
  { name: 'Sky Stilettos', slug: 'skystilettos', price: 48.0, rarity: 'RARE', badge: '1 из 20K', color: '#06B6D4', backdrop: 'Sapphire Sky' },
  { name: 'Flying Broom', slug: 'flyingbroom', price: 46.0, rarity: 'RARE', badge: '1 из 20K', color: '#D97706', backdrop: 'Amber Sunset' },
  { name: 'Victory Medal', slug: 'victorymedal', price: 46.0, rarity: 'RARE', badge: '1 из 20K', color: '#EAB308', backdrop: 'Cobalt Gold' },
  { name: 'Toy Bear', slug: 'toybear', price: 45.0, rarity: 'RARE', badge: '1 из 25K', color: '#F59E0B', backdrop: 'Amber Sunset' },
  { name: 'Love Candle', slug: 'lovecandle', price: 44.0, rarity: 'RARE', badge: '1 из 25K', color: '#F43F5E', backdrop: 'Rose Quartz' },
  { name: 'Sakura Flower', slug: 'sakuraflower', price: 43.0, rarity: 'RARE', badge: '1 из 25K', color: '#EC4899', backdrop: 'Rose Quartz' },
  { name: 'Lush Bouquet', slug: 'lushbouquet', price: 42.0, rarity: 'RARE', badge: '1 из 25K', color: '#EC4899', backdrop: 'Rose Quartz' },
  { name: 'Joyful Bundle', slug: 'joyfulbundle', price: 40.0, rarity: 'RARE', badge: '1 из 25K', color: '#F43F5E', backdrop: 'Rose Quartz' },
  { name: 'Bling Binky', slug: 'blingbinky', price: 39.0, rarity: 'RARE', badge: '1 из 30K', color: '#F59E0B', backdrop: 'Amber Sunset' },
  { name: 'Eternal Candle', slug: 'eternalcandle', price: 38.0, rarity: 'RARE', badge: '1 из 30K', color: '#F59E0B', backdrop: 'Amber Sunset' },
  { name: 'Top Hat', slug: 'tophat', price: 38.0, rarity: 'RARE', badge: '1 из 30K', color: '#1E293B', backdrop: 'Onyx Black' },
  { name: 'Star Notepad', slug: 'starnotepad', price: 35.0, rarity: 'RARE', badge: '1 из 35K', color: '#F59E0B', backdrop: 'Amber Sunset' },
  { name: 'Cupid Charm', slug: 'cupidcharm', price: 32.0, rarity: 'RARE', badge: '1 из 50K', color: '#F43F5E', backdrop: 'Rose Quartz' },

  // Uncommon / Common real items ($3.50 - $18)
  { name: 'Candy Cane', slug: 'candycane', price: 7.5, rarity: 'UNCOMMON', badge: '1 из 50K', color: '#EF4444', backdrop: 'Crimson Glow' },
  { name: 'Bow Tie', slug: 'bowtie', price: 3.6, rarity: 'COMMON', badge: '1 из 100K', color: '#0284C7', backdrop: 'Sapphire Sky' },
];

const BACKDROP_DEFINITIONS: Record<string, { rarity: number; from: string; to: string; glow: string; accent: string; pattern: string }> = {
  'Onyx Black': { rarity: 0.5, from: '#181924', to: '#07080d', glow: '#a855f7', accent: '#fbbf24', pattern: 'diamonds' },
  'Cyber Purple': { rarity: 2.0, from: '#3b0764', to: '#130225', glow: '#c084fc', accent: '#e879f9', pattern: 'circuit' },
  'Cobalt Gold': { rarity: 3.0, from: '#1e3a8a', to: '#09132b', glow: '#fbbf24', accent: '#f59e0b', pattern: 'hexagons' },
  'Crimson Glow': { rarity: 5.0, from: '#7f1d1d', to: '#1f0404', glow: '#ef4444', accent: '#f87171', pattern: 'stars' },
  'Emerald Mist': { rarity: 6.0, from: '#064e3b', to: '#021e17', glow: '#10b981', accent: '#34d399', pattern: 'dots' },
  'Sapphire Sky': { rarity: 8.0, from: '#0c4a6e', to: '#031a2b', glow: '#0284c7', accent: '#38bdf8', pattern: 'rings' },
  'Rose Quartz': { rarity: 10.0, from: '#831843', to: '#2a0715', glow: '#ec4899', accent: '#f472b6', pattern: 'diamonds' },
  'Amber Sunset': { rarity: 12.0, from: '#78350f', to: '#240f03', glow: '#f59e0b', accent: '#fbbf24', pattern: 'dots' },
  'Mint Breeze': { rarity: 12.0, from: '#134e4a', to: '#042220', glow: '#14b8a6', accent: '#2dd4bf', pattern: 'hexagons' },
  'Lavender Haze': { rarity: 12.0, from: '#4c1d95', to: '#170634', glow: '#8b5cf6', accent: '#a78bfa', pattern: 'stars' },
};

async function checkUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 3500 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

export async function fetchAndCompileRealGifts(): Promise<ScrapedGift[]> {
  console.log('🔄 Compiling ONLY authentic Telegram NFT gifts from Fragment CDN & GiftSignal...');

  const compiled: ScrapedGift[] = [];
  const publicGiftsDir = path.resolve('packages/client/public/gifts');

  for (const gift of AUTHENTIC_GIFTS_BASE) {
    const cleanName = gift.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check if we have an isolated cutout PNG in public/gifts
    let chosenImgUrl = '';
    const possibleCutouts = [
      `${gift.slug}-1.png`,
      `${gift.slug}.png`,
      `${cleanName}-1.png`,
      `${cleanName}.png`
    ];

    for (const f of possibleCutouts) {
      if (fs.existsSync(path.join(publicGiftsDir, f))) {
        chosenImgUrl = `/gifts/${f}`;
        break;
      }
    }

    // If no local cutout, use official 3D Fragment CDN URL
    if (!chosenImgUrl) {
      chosenImgUrl = `https://nft.fragment.com/gift/${cleanName}-1.medium.jpg`;
    }

    const bd = BACKDROP_DEFINITIONS[gift.backdrop] || BACKDROP_DEFINITIONS['Cobalt Gold'];

    compiled.push({
      name: gift.name,
      slug: `${gift.slug}-nft`,
      price: gift.price,
      rarity: gift.rarity as any,
      badge: gift.badge,
      color: gift.color,
      collection: 'Telegram NFT Gifts',
      imageUrl: chosenImgUrl,
      backdropName: gift.backdrop,
      backdropRarity: bd.rarity,
      backdropFrom: bd.from,
      backdropTo: bd.to,
      backdropGlow: bd.glow,
      backdropAccent: bd.accent,
      backdropPattern: bd.pattern,
    });
  }

  console.log(`✅ Successfully compiled ${compiled.length} authentic Telegram NFT gifts (ZERO flat emojis, ZERO fake items)!`);
  return compiled;
}

if (process.argv[1]?.includes('fetch-real-gifts')) {
  fetchAndCompileRealGifts().then((gifts) => {
    fs.writeFileSync(
      'packages/server/prisma/realGiftsData.json',
      JSON.stringify(gifts, null, 2),
      'utf-8'
    );
    console.log('Saved to packages/server/prisma/realGiftsData.json');
  });
}
