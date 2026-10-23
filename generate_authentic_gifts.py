import os
import urllib.request
import io
import time
from PIL import Image
import numpy as np
from scipy.ndimage import label, binary_fill_holes, gaussian_filter

GIFTS = [
    # Common ($80 - $200)
    {"name": "Cupid Charm", "slug": "cupidcharm-19009", "rarity": "COMMON", "badge": "1 из 50K", "ton": 17.0, "usd": 88.0},
    {"name": "Spiced Wine", "slug": "spicedwine-106402", "rarity": "COMMON", "badge": "1 из 30K", "ton": 30.0, "usd": 155.0},
    {"name": "Love Potion", "slug": "lovepotion-19861", "rarity": "COMMON", "badge": "1 из 25K", "ton": 30.0, "usd": 155.0},
    {"name": "Toy Bear", "slug": "toybear-2522", "rarity": "COMMON", "badge": "1 из 25K", "ton": 33.0, "usd": 170.0},
    {"name": "Lol Pop", "slug": "lolpop-236517", "rarity": "COMMON", "badge": "1 из 50K", "ton": 35.0, "usd": 180.0},
    {"name": "Diamond Ring", "slug": "diamondring-1314", "rarity": "COMMON", "badge": "1 из 20K", "ton": 37.0, "usd": 190.0},
    {"name": "Mousse Cake", "slug": "moussecake-52339", "rarity": "COMMON", "badge": "1 из 20K", "ton": 38.0, "usd": 195.0},
    
    # Uncommon ($200 - $380)
    {"name": "Pet Snake", "slug": "petsnake-328", "rarity": "UNCOMMON", "badge": "1 из 15K", "ton": 55.0, "usd": 285.0},
    {"name": "Scared Cat", "slug": "scaredcat-3005", "rarity": "UNCOMMON", "badge": "1 из 10K", "ton": 65.0, "usd": 335.0},
    {"name": "Low Rider", "slug": "lowrider-2703", "rarity": "UNCOMMON", "badge": "1 из 10K", "ton": 70.0, "usd": 360.0},
    {"name": "Ginger Cookie", "slug": "gingercookie-48634", "rarity": "UNCOMMON", "badge": "1 из 10K", "ton": 75.0, "usd": 385.0},
    
    # Rare ($400 - $650)
    {"name": "Snoop Cigar", "slug": "snoopcigar-76760", "rarity": "RARE", "badge": "1 из 5K", "ton": 80.0, "usd": 415.0},
    {"name": "Precious Peach", "slug": "preciouspeach-881", "rarity": "RARE", "badge": "1 из 5K", "ton": 85.0, "usd": 440.0},
    {"name": "Durov’s Cap", "slug": "durovscap-1640", "rarity": "RARE", "badge": "1 из 5K", "ton": 87.0, "usd": 450.0},
    {"name": "Swiss Watch", "slug": "swisswatch-7799", "rarity": "RARE", "badge": "1 из 5K", "ton": 89.0, "usd": 460.0},
    {"name": "Genie Lamp", "slug": "genielamp-312", "rarity": "RARE", "badge": "1 из 5K", "ton": 90.0, "usd": 465.0},
    {"name": "Vintage Cigar", "slug": "vintagecigar-21826", "rarity": "RARE", "badge": "1 из 5K", "ton": 99.0, "usd": 515.0},
    {"name": "UFC Strike", "slug": "ufcstrike-13098", "rarity": "RARE", "badge": "1 из 5K", "ton": 100.0, "usd": 520.0},
    {"name": "Loot Bag", "slug": "lootbag-9996", "rarity": "RARE", "badge": "1 из 5K", "ton": 119.0, "usd": 615.0},
    {"name": "Magic Potion", "slug": "magicpotion-353", "rarity": "RARE", "badge": "1 из 5K", "ton": 122.0, "usd": 635.0},
    
    # Epic ($700 - $1,200)
    {"name": "Kissed Frog", "slug": "kissedfrog-1087", "rarity": "EPIC", "badge": "1 из 2.5K", "ton": 140.0, "usd": 725.0},
    {"name": "Mini Oscar", "slug": "minioscar-1815", "rarity": "EPIC", "badge": "1 из 2.5K", "ton": 149.0, "usd": 775.0},
    {"name": "Signet Ring", "slug": "signetring-4154", "rarity": "EPIC", "badge": "1 из 2.5K", "ton": 150.0, "usd": 780.0},
    {"name": "Rare Bird", "slug": "rarebird-1985", "rarity": "EPIC", "badge": "1 из 2.5K", "ton": 160.0, "usd": 830.0},
    {"name": "Jelly Bunny", "slug": "jellybunny-95677", "rarity": "EPIC", "badge": "1 из 2K", "ton": 190.0, "usd": 985.0},
    
    # Legendary / Grail ($1,400 - $6,000)
    {"name": "Heroic Helmet", "slug": "heroichelmet-206", "rarity": "LEGENDARY", "badge": "1 из 1K", "ton": 280.0, "usd": 1450.0},
    {"name": "Plush Pepe", "slug": "plushpepe-1821", "rarity": "LEGENDARY", "badge": "1 из 1K", "ton": 350.0, "usd": 1820.0},
    {"name": "Heart Locket", "slug": "heartlocket-875", "rarity": "LEGENDARY", "badge": "1 из 500", "ton": 850.0, "usd": 4420.0},
    {"name": "Timeless Book", "slug": "timelessbook-77649", "rarity": "LEGENDARY", "badge": "1 из 250", "ton": 1050.0, "usd": 5460.0}
]

out_dir = r"packages/client/public/gifts"
os.makedirs(out_dir, exist_ok=True)
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def process_gift(item):
    slug = item['slug']
    target_path = os.path.join(out_dir, f"{slug}.png")
    
    # Download official HD webp
    url = f"https://nft.fragment.com/gift/{slug}.webp"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
    except Exception as e:
        print(f"Failed to download {slug}: {e}")
        return False
        
    try:
        im = Image.open(io.BytesIO(data))
        arr = np.array(im, dtype=np.float32)
        h, w = arr.shape[:2]
        
        # Estimate background color from 4 corners
        corners = [arr[0:40, 0:40, :3], arr[0:40, -40:, :3], arr[-40:, 0:40, :3], arr[-40:, -40:, :3]]
        bg_color = np.median(np.concatenate(corners, axis=0), axis=(0,1))
        
        # Distance from background color
        dist = np.linalg.norm(arr[:, :, :3] - bg_color, axis=2)
        raw_mask = dist > 23.0
        filled_mask = binary_fill_holes(raw_mask)
        
        labeled, num_features = label(filled_mask)
        counts = np.bincount(labeled.ravel())
        counts[0] = 0
        if len(counts) > 1 and np.max(counts) > 500:
            largest_label = np.argmax(counts)
            subject_mask = (labeled == largest_label)
        else:
            subject_mask = filled_mask
            
        # Smooth alpha mask
        alpha = gaussian_filter(subject_mask.astype(np.float32), sigma=1.5)
        alpha = np.clip((alpha - 0.25) / 0.5, 0.0, 1.0) * 255.0
        
        out_arr = np.zeros((h, w, 4), dtype=np.uint8)
        out_arr[:, :, :3] = arr[:, :, :3].astype(np.uint8)
        out_arr[:, :, 3] = alpha.astype(np.uint8)
        
        y_idx, x_idx = np.where(alpha > 15)
        if len(y_idx) > 0 and len(x_idx) > 0:
            ymin, ymax = y_idx.min(), y_idx.max()
            xmin, xmax = x_idx.min(), x_idx.max()
            pad = 25
            ymin = max(0, ymin - pad)
            ymax = min(h, ymax + pad)
            xmin = max(0, xmin - pad)
            xmax = min(w, xmax + pad)
            cropped = out_arr[ymin:ymax, xmin:xmax]
        else:
            cropped = out_arr
            
        crop_im = Image.fromarray(cropped)
        cw, ch = crop_im.size
        dim = max(cw, ch)
        sq_im = Image.new('RGBA', (dim, dim), (0, 0, 0, 0))
        sq_im.paste(crop_im, ((dim - cw) // 2, (dim - ch) // 2))
        sq_im = sq_im.resize((512, 512), Image.Resampling.LANCZOS)
        
        sq_im.save(target_path)
        print(f"OK: {item['name']} -> {slug}.png ({cw}x{ch})")
        return True
    except Exception as e:
        print(f"Error processing {slug}: {e}")
        return False

print(f"Processing {len(GIFTS)} authentic Telegram gifts...")
success = 0
for g in GIFTS:
    if process_gift(g):
        success += 1

print(f"\nCOMPLETED: {success}/{len(GIFTS)} gifts cleanly extracted!")
