import urllib.request
import re
import json

url = "https://giftsignal.com/spisok-podarkov-v-telegram/"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        print(f"Loaded {len(html)} bytes from giftsignal.com")
        
        # Look for images and names
        imgs = re.findall(r'<img[^>]+src=[\"\']([^\"\']+)[\"\'][^>]*alt=[\"\']([^\"\']*)[\"\']', html)
        print(f"Found {len(imgs)} img tags with alt")
        for src, alt in imgs[:15]:
            print(f"  {alt} -> {src}")
            
        with open("packages/server/giftsignal.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("Saved packages/server/giftsignal.html")
except Exception as e:
    print(f"Error fetching giftsignal: {e}")
