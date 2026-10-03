#!/usr/bin/env python3
"""Compose approved raster layers without moving/redrawing the master cat."""
import argparse, hashlib, itertools, json
from pathlib import Path
from PIL import Image

p = argparse.ArgumentParser()
p.add_argument('--config', default='art/layers.json')
p.add_argument('--output', default='output')
p.add_argument('--image-uri', required=True, help='ipfs://REAL_IMAGE_CID/')
a = p.parse_args()
if not a.image_uri.startswith('ipfs://') or not a.image_uri.endswith('/') or 'REPLACE' in a.image_uri:
    p.error('Use the actual pinned image CID as ipfs://CID/')
config_path = Path(a.config).resolve()
c = json.loads(config_path.read_text())
root = config_path.parent
layers = c['layers']
if len(layers) == 0 or any(not x['variants'] for x in layers):
    raise ValueError('Every layer needs approved variants')
combinations = list(itertools.islice(itertools.product(*(x['variants'] for x in layers)), 5000))
if len(combinations) != 5000:
    raise ValueError('Need at least 5000 combinations; none will be output')
size = tuple(c['size'])
# Load/validate every layer before generating any edition.
cache = {}
for layer in layers:
    for v in layer['variants']:
        path = (root / v['file']).resolve()
        im = Image.open(path).convert('RGBA')
        if im.size != size:
            raise ValueError(f'{path}: expected {size}, found {im.size}')
        cache[str(path)] = im
out = Path(a.output)
if out.exists():
    raise ValueError('Output already exists: use a new directory to avoid stale editions')
(out / 'images').mkdir(parents=True)
(out / 'metadata').mkdir()
seen = set()
manifest = []
for token_id, combo in enumerate(combinations, 1):
    im = Image.new('RGBA', size)
    attrs = []
    for layer, v in zip(layers, combo):
        im = Image.alpha_composite(im, cache[str((root / v['file']).resolve())])
        attrs.append({'trait_type': layer['name'], 'value': v['name']})
    pixel_hash = hashlib.sha256(im.tobytes()).hexdigest()
    if pixel_hash in seen:
        raise ValueError(f'Duplicate visual at #{token_id}; partial output must be discarded')
    seen.add(pixel_hash)
    image_path = out / 'images' / f'{token_id}.png'
    im.save(image_path)
    meta = {'name': f'Nazca Cats #{token_id}', 'description': c['description'],
            'image': f'{a.image_uri}{token_id}.png', 'attributes': attrs}
    meta_path = out / 'metadata' / f'{token_id}.json'
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
    manifest.append({'id': token_id, 'pixels_sha256': pixel_hash,
        'image_sha256': hashlib.sha256(image_path.read_bytes()).hexdigest(),
        'metadata_sha256': hashlib.sha256(meta_path.read_bytes()).hexdigest()})
manifest_path = out / 'manifest.json'
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
print('5000 unique pixel outputs generated. Inspect artwork before publication.')
print('Manifest SHA-256 / bytes32: 0x' + hashlib.sha256(manifest_path.read_bytes()).hexdigest())
