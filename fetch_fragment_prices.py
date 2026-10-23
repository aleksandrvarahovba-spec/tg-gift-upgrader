import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for sort in ['price_asc', 'price_desc', 'listed']:
    url = f'https://fragment.com/gifts?sort={sort}'
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            # Look for gift card items in html
            # Look for item titles and prices
            items = re.findall(r'<a[^>]+href=[\"\']/gift/([a-zA-Z0-9\-_]+)[\"\'][^>]*>(.*?)</a>', html, re.DOTALL)
            print(f"=== Sort {sort}: found {len(items)} items ===")
            for slug, body in items[:8]:
                # find price in body
                price = re.findall(r'<div[^>]*class=[\"\'][^\"\']*price[^\"\']*[\"\'][^>]*>(.*?)</div>', body, re.DOTALL)
                price_text = re.sub(r'<[^>]+>', '', price[0]).strip() if price else 'N/A'
                title = re.findall(r'<div[^>]*class=[\"\'][^\"\']*title[^\"\']*[\"\'][^>]*>(.*?)</div>', body, re.DOTALL)
                title_text = re.sub(r'<[^>]+>', '', title[0]).strip() if title else slug
                print(f"  {title_text} ({slug}) -> {price_text}")
    except Exception as e:
        print(f"Err {sort}: {e}")
