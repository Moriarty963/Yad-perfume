#!/usr/bin/env python3
"""Rebuild 69 x 6 YAD catalog images from the authentic Imagination photos.
Only the printed fragrance name region is replaced, preserving body, cap,
glass, YAD logo, formulation line, ml marking, lighting and backdrop.
Run from repo root. All names and image slugs come from docs/catalog-69.json.
"""
import json, os, io, math, sys, time
from pathlib import Path
from urllib.request import Request, urlopen
import numpy as np
from PIL import Image, ImageFont, ImageDraw

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets'/'studio'
DATA=json.loads((ROOT/'docs'/'catalog-69.json').read_text('utf-8'))
REFS={
 6:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/8275abcb-2a55-4854-a0d1-894da87fee07.jpg',
 10:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/33d4d1a6-36dc-42f3-8eb8-5e46a7212063.jpg',
 20:str(ROOT/'assets'/'real'/'imagination-20ml-main.webp'),
 30:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/8ed5016f-b1c1-402c-8210-1d5f9bb767d6.jpg',
 50:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/c992b3b0-982c-4f82-8723-bf6d42cc21e6.jpg',
 100:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/f61658bc-dbbf-4b70-b3cc-069d4c019287.jpg',
}
# On 1103x1536 reference images, only the center line containing
# IMAGINATION is modified. Keep all other typography unmodified.
LAYOUT={
 6: ((480,886,643,934),561,912,158,30,27,'italic'),
 10:((478,766,643,816),562,791,164,31,27,'italic'),
 20:((457,794,669,858),559,829,232,42,32,'italic'),
 30:((442,863,679,907),562,886,238,34,26,'roman'),
 50:((418,856,712,900),563,881,274,33,27,'roman'),
 100:((481,800,728,850),599,825,256,36,28,'roman'),
}
FONTS={
 'italic':'/usr/share/fonts/truetype/liberation2/LiberationSerif-BoldItalic.ttf',
 'roman':'/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
}
def font(face,size):
 path=FONTS[face]
 if not os.path.exists(path):
  path='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
 return ImageFont.truetype(path,max(7,size))

def source(key):
 ref=REFS[key]
 if ref.startswith('https://'):
  last=None
  for attempt in range(3):
   try:
    req=Request(ref,headers={'User-Agent':'Mozilla/5.0 (compatible; YADCatalog/1.0)'})
    with urlopen(req,timeout=30) as u: data=u.read()
    im=Image.open(io.BytesIO(data)); im.load()
    break
   except Exception as ex:
    last=ex
    time.sleep(2)
  else:raise RuntimeError(f'Cannot retrieve authentic reference for {key} ml: {last}')
 else:
  im=Image.open(ref)
 im=im.convert('RGB')
 assert im.width>=250 and im.height>=370, (key,im.size)
 return im

def dimensions(ml,im):
 (xa,ya,xb,yb),cx,cy,maxw,sz,leading,face=LAYOUT[ml]
 sx,sy=im.width/1103,im.height/1536
 box=(round(xa*sx),round(ya*sy),round(xb*sx),round(yb*sy))
 return box,round(cx*sx),round(cy*sy),round(maxw*sx),round(sz*sy),round(leading*sy),face

def erase_original(im,box):
 xa,ya,xb,yb=box
 arr=np.asarray(im).astype('float32').copy()
 h,w=yb-ya,xb-xa
 if xa<8 or ya<9 or xb>=im.width-8 or yb>=im.height-9:raise ValueError((im.size,box))
 top=arr[ya-7:ya-3,xa:xb].mean(axis=0)
 bot=arr[yb+3:yb+7,xa:xb].mean(axis=0)
 blend=np.linspace(0,1,h,dtype='float32')[:,None,None]
 patch=(1-blend)*top[None,:,:]+blend*bot[None,:,:]
 yr=np.minimum(np.arange(h)+1,np.arange(h)[::-1]+1)
 xr=np.minimum(np.arange(w)+1,np.arange(w)[::-1]+1)
 alpha=(np.clip(yr[:,None]/6,0,1)*np.clip(xr[None,:]/7,0,1))[:,:,None]
 arr[ya:yb,xa:xb]=arr[ya:yb,xa:xb]*(1-alpha)+patch*alpha
 return Image.fromarray(np.uint8(np.clip(arr,0,255)))

def text_layout(name,ml,im):
 box,cx,cy,maxw,sz,leading,face=dimensions(ml,im)
 words=name.split()
 opts=[[name]]+[[(' '.join(words[:i])),(' '.join(words[i:]))] for i in range(1,len(words))]
 pen=ImageDraw.Draw(Image.new('RGB',(1,1)))
 best=None
 for lines in opts:
  size=sz if len(lines)==1 else min(sz-2,leading+1)
  while size>=9:
   f=font(face,size)
   if all((pen.textbbox((0,0),s,font=f)[2]-pen.textbbox((0,0),s,font=f)[0])<=maxw for s in lines):break
   size-=1
  if size<9:continue
  score=size-(1.5 if len(lines)>1 else 0)
  if best is None or score>best[0]:best=(score,size,lines)
 if not best:raise ValueError(f"Name doesn't fit: {name}, {ml}")
 return box,cx,cy,leading,face,best[1],best[2]

def render(im,ml,name):
 if name.casefold()=='imagination':return im.copy()
 box,cx,cy,leading,face,size,lines=text_layout(name,ml,im)
 pic=erase_original(im,box)
 pen=ImageDraw.Draw(pic); f=font(face,size)
 y=cy-(len(lines)-1)*leading/2
 for i,line in enumerate(lines):
  pen.text((cx,round(y+i*leading)),line,font=f,fill=(23,20,18),anchor='mm')
 return pic

def main():
 assert len(DATA)==69 and len(set(x['assetSlug'] for x in DATA))==69
 OUT.mkdir(parents=True,exist_ok=True)
 bases={ml:source(ml) for ml in LAYOUT}
 for ml,im in bases.items():print('reference',ml,im.size,flush=True)
 made=0
 for row in DATA:
  for ml,im in bases.items():
   path=OUT/f"{row['assetSlug']}-{ml}ml.webp"
   rendered=render(im,ml,row['name'])
   rendered.save(path,'WEBP',quality=82,method=4)
   with Image.open(path) as check:
    check.verify()
   made+=1
  if made%60==0:print('validated',made,'image assets',flush=True)
 expected=[f"{entry['assetSlug']}-{size}ml.webp" for entry in DATA for size in LAYOUT]
 actual=[f.name for f in OUT.glob('*.webp')]
 assert len(actual)==len(expected)==414 and set(expected)==set(actual)
 (OUT/'manifest.json').write_text(json.dumps({'count':made,'volumes':list(LAYOUT),'source':'real YAD bottle photos','assets':expected},ensure_ascii=False,indent=2),encoding='utf-8')
 print('DONE:',made,'validated WebP images in',OUT,flush=True)
if __name__=='__main__':main()
