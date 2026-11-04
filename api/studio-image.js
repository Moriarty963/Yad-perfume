'use strict';
const sharp=require('sharp');
const {YAD_CATALOG_ROWS}=require('../catalog-data.js');

const SCENTS=new Map(YAD_CATALOG_ROWS.map(([id,name])=>[id,name]));
const SOURCES={
  6:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/1762bcf2-871f-448c-9015-7a576a2df8dc.jpg',
  10:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/92fc07e8-d38b-48fb-9d73-67a4c127a811.jpg',
  20:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/02da08fd-56bb-468f-bd61-0fcce8c55267.jpg',
  30:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/ad364887-04df-4804-bb6b-17bdbed75da4.jpg',
  50:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/27500f9e-6613-4b2c-8037-1251b54f1bad.jpg',
  100:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/9623cf65-2e2d-40f9-8041-780b5abc9514.jpg'
};
// Only these narrow name rectangles are modified; all product geometry, glass,
// cap, gold parts, background, YAD lettering and volume text remain original.
const SPEC={
  6:{base:[1122,1402],box:[480,886,643,934],cx:561,cy:912,maxw:158,font:30,leading:27,italic:true},
  10:{base:[1122,1402],box:[478,766,643,816],cx:562,cy:791,maxw:164,font:31,leading:27,italic:true},
  20:{base:[1122,1402],box:[457,794,669,858],cx:559,cy:829,maxw:232,font:42,leading:32,italic:true},
  30:{base:[1122,1402],box:[442,863,679,907],cx:562,cy:886,maxw:238,font:34,leading:26,italic:false},
  50:{base:[1122,1402],box:[418,856,712,900],cx:563,cy:881,maxw:274,font:33,leading:27,italic:false},
  100:{base:[1199,1312],box:[481,800,728,850],cx:599,cy:825,maxw:256,font:36,leading:28,italic:false}
};
const sourcePromises=new Map();
const outputCache=new Map();

async function loadOriginal(ml){
  if(!sourcePromises.has(ml)){
    const job=(async()=>{
      const response=await fetch(SOURCES[ml],{signal:AbortSignal.timeout(14000)});
      if(!response.ok)throw new Error('Product reference unavailable');
      const bytes=Buffer.from(await response.arrayBuffer());
      if(!bytes.length||bytes.length>8000000)throw new Error('Unexpected photo size');
      const meta=await sharp(bytes).metadata();
      if(meta.width<500||meta.height<500)throw new Error('Invalid reference dimensions');
      return bytes;
    })();
    sourcePromises.set(ml,job);
    job.catch(()=>sourcePromises.delete(ml));
  }
  return sourcePromises.get(ml);
}
function glyphWidth(text){
  let u=0;for(const ch of text){
    if(ch===' ')u+=0.33;
    else if('I1!.,:;|'.includes(ch))u+=0.35;
    else if('MW@'.includes(ch))u+=0.93;
    else if("’'".includes(ch))u+=0.27;
    else u+=0.67;
  }
  return u;
}
function layoutTitle(title,spec){
  const words=title.trim().split(/\s+/);
  const choices=[[title]];
  for(let k=1;k<words.length;k++)choices.push([words.slice(0,k).join(' '),words.slice(k).join(' ')]);
  let best=null;
  for(const lines of choices){
    const natural=spec.font-(lines.length===2?2:0);
    const font=Math.max(12,Math.min(natural,Math.floor(spec.maxw/Math.max(...lines.map(glyphWidth)))));
    const fit=Math.max(...lines.map(glyphWidth))*font<=spec.maxw;
    if(!fit)continue;
    const penalty=(lines.length===2?1.4:0);
    const score=font-penalty;
    if(!best||score>best.score)best={lines,font,score};
  }
  return best||{lines:[title],font:12};
}
function xml(text){
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function drawTitle(title,spec,w,h){
  const scaleX=w/spec.base[0],scaleY=h/spec.base[1];
  const layout=layoutTitle(title.toUpperCase(),spec);
  const lead=spec.leading*scaleY;
  const baseY=spec.cy*scaleY-(layout.lines.length-1)*lead/2;
  const letters=layout.lines.map((line,i)=>'<text x="'+(spec.cx*scaleX).toFixed(2)+'" y="'+(baseY+i*lead).toFixed(2)+'" text-anchor="middle" dominant-baseline="middle">'+xml(line)+'</text>').join('');
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><g fill="#171412" font-family="DejaVu Serif, Times New Roman, serif" font-weight="'+(spec.italic?'600':'400')+'" font-style="'+(spec.italic?'italic':'normal')+'" font-size="'+(layout.font*scaleX).toFixed(1)+'">'+letters+'</g></svg>');
}
async function renderImage(name,ml){
  const original=await loadOriginal(ml);
  if(name.toUpperCase()==='IMAGINATION')
    return sharp(original).webp({quality:86,effort:3}).toBuffer();
  const spec=SPEC[ml];
  const parsed=await sharp(original).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h,channels:n}=parsed.info;
  const source=parsed.data;
  const out=Buffer.from(source);
  const sx=w/spec.base[0],sy=h/spec.base[1];
  const [left,top,right,bottom]=spec.box;
  const x0=Math.round(left*sx),x1=Math.round(right*sx);
  const y0=Math.round(top*sy),y1=Math.round(bottom*sy);
  const pixel=(x,y,c)=>source[(y*w+x)*n+c];
  const avg=(x,yA,yB,c)=>{
    let sum=0,num=0;
    for(let y=Math.max(0,yA);y<Math.min(h,yB);y++){sum+=pixel(x,y,c);num++}
    return num?sum/num:pixel(x,Math.max(0,Math.min(h-1,yA)),c);
  };
  for(let x=x0;x<x1;x++){
    const topRgb=[0,1,2].map(c=>avg(x,y0-5,y0-2,c));
    const bottomRgb=[0,1,2].map(c=>avg(x,y1+3,y1+6,c));
    for(let y=y0;y<y1;y++){
      const p=(y*w+x)*n;
      const t=(y-y0)/(y1-y0);
      const ey=Math.min(1,(y-y0+1)/6,(y1-y)/6);
      const ex=Math.min(1,(x-x0+1)/7,(x1-x)/7);
      const feather=Math.max(0,Math.min(1,ey*ex));
      for(let k=0;k<3;k++){
        const smoothed=topRgb[k]*(1-t)+bottomRgb[k]*t;
        out[p+k]=Math.round(source[p+k]*(1-feather)+smoothed*feather);
      }
    }
  }
  const stamp=drawTitle(name,spec,w,h);
  return sharp(out,{raw:{width:w,height:h,channels:n}})
    .composite([{input:stamp,top:0,left:0}])
    .webp({quality:84,effort:3}).toBuffer();
}

module.exports=async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.setHeader('Allow','GET, HEAD');res.statusCode=405;return res.end('Method not allowed');
  }
  const url=new URL(req.url,'https://yad.example');
  const id=url.searchParams.get('id')||'';
  const ml=Number(url.searchParams.get('ml'));
  if(!SCENTS.has(id)||!Object.prototype.hasOwnProperty.call(SOURCES,ml)){
    res.statusCode=400;res.setHeader('Content-Type','text/plain; charset=utf-8');return res.end('Invalid product or volume');
  }
  const key=id+':'+ml;
  try{
    let item=outputCache.get(key);
    if(!item){
      item=renderImage(SCENTS.get(id),ml);
      outputCache.set(key,item);
      if(outputCache.size>75)outputCache.delete(outputCache.keys().next().value);
      item.catch(()=>outputCache.delete(key));
    }
    const bytes=await item;
    res.statusCode=200;
    res.setHeader('Content-Type','image/webp');
    res.setHeader('Cache-Control','public,max-age=86400,s-maxage=604800,stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options','nosniff');
    if(req.method==='HEAD')return res.end();
    return res.end(bytes);
  }catch(e){
    console.error('YAD image render failed',ml,id,e&&e.message?e.message:'unknown');
    res.statusCode=503;res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Type','text/plain; charset=utf-8');
    return res.end('Image temporarily unavailable');
  }
};
