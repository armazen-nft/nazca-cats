#!/usr/bin/env python3
"""Validate completed artwork and produce metadata. Does not generate artwork."""
import argparse, hashlib, json
from collections import Counter
from pathlib import Path
from PIL import Image, ImageSequence
p=argparse.ArgumentParser()
p.add_argument('--catalog', required=True, help='JSON list of entries {file, rarity, traits}')
p.add_argument('--image-uri', required=True, help='ipfs://actualCID/; files named 1.png etc.')
p.add_argument('--output', required=True)
a=p.parse_args()
if not a.image_uri.startswith('ipfs://') or not a.image_uri.endswith('/'):
    p.error('image-uri must be ipfs://CID/')
cat_path=Path(a.catalog).resolve()
entries=json.loads(cat_path.read_text())
if len(entries)!=5000: raise ValueError('Exactly 5000 approved artworks required')
expected={('Comum','PNG'):3500,('Incomum','PNG'):1000,('Raro','PNG'):200,
          ('Raro','GIF'):200,('Lendario','PNG'):50,('Lendario','GIF'):50}
counts=Counter(); seen=set(); records=[]; size=None
for i,e in enumerate(entries,1):
    src=(cat_path.parent/e['file']).resolve()
    with Image.open(src) as im:
        fmt=im.format
        if fmt not in ('PNG','GIF'): raise ValueError(f'{src}: PNG/GIF only')
        if size is None: size=im.size
        if im.size!=size: raise ValueError(f'{src}: different canvas dimensions')
        h=hashlib.sha256(); distinct_frames=set()
        for frame in ImageSequence.Iterator(im):
            pixels=frame.convert('RGBA').tobytes()
            distinct_frames.add(hashlib.sha256(pixels).digest()); h.update(pixels)
        if fmt=='GIF' and len(distinct_frames)<2:
            raise ValueError(f'{src}: GIF is not visibly animated')
        visual=h.hexdigest()
        if visual in seen: raise ValueError(f'{src}: duplicate visual')
        seen.add(visual)
        counts[(e['rarity'],fmt)]+=1
        records.append((i,e,src,fmt,visual))
if dict(counts)!=expected: raise ValueError(f'Rarity quotas mismatch: {dict(counts)}')
out=Path(a.output)
if out.exists(): raise ValueError('Output exists; choose a fresh directory')
(out/'images').mkdir(parents=True); (out/'metadata').mkdir()
manifest=[]
for i,e,src,fmt,visual in records:
    name=f'{i}.{fmt.lower()}'
    content=src.read_bytes(); (out/'images'/name).write_bytes(content)
    attrs=[{'trait_type':'Raridade','value':e['rarity']},{'trait_type':'Formato','value':fmt}]
    attrs += [{'trait_type':k,'value':v} for k,v in e.get('traits',{}).items()
              if k not in ('Raridade','Formato')]
    meta={'name':f'Nazca Cats #{i}', 'description':'Gato de Nazca: pose fixa, pelagens e paisagens variadas.',
          'image':a.image_uri+name,'attributes':attrs}
    target=out/'metadata'/f'{i}.json'
    target.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    manifest.append({'id':i,'file':name,'rarity':e['rarity'],'visual_sha256':visual,
        'file_sha256':hashlib.sha256(content).hexdigest(),
        'metadata_sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
m=out/'manifest.json'; m.write_text(json.dumps(manifest,indent=2)+'\n')
print('Validated: 5000 artworks, exact quotas, 250 animated GIFs.')
print('Manifest hash: 0x'+hashlib.sha256(m.read_bytes()).hexdigest())
