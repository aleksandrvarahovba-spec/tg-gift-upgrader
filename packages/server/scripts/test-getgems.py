import urllib.request
import json

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

slugs = ['swiss-watches', 'kissed-frogs', 'plush-pepes', 'signet-rings', 'durovs-caps', 'precious-peaches', 'magic-potions']

for slug in slugs:
    try:
        query = {
            "query": f'query {{ nftCollectionByAddressOrSlug(addressOrSlug: "{slug}") {{ name floorPrice {{ value currency }} approxFloorPriceUsd itemsCount }} }}'
        }
        data = json.dumps(query).encode('utf-8')
        req = urllib.request.Request('https://api.getgems.io/graphql', data=data, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req, timeout=5)
        parsed = json.loads(res.read().decode('utf-8'))
        col = parsed.get('data', {}).get('nftCollectionByAddressOrSlug')
        if col:
            print(f"{col['name']}: floor={col.get('approxFloorPriceUsd')} USD ({col.get('itemsCount')} items)")
        else:
            print(f"{slug}: not found")
    except Exception as e:
        print(f"{slug}: error {e}")
