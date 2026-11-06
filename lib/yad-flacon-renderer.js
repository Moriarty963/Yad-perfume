'use strict';
const sharp=require('sharp');
const fontkit=require('fontkit');
const {YAD_CATALOG_ROWS,YAD_BASE_STUDIO_COUNT}=require('../catalog-data.js');

// Exact studio photos of the six YAD bottle formats. Only the existing
// scent name is replaced; the bottle shape, background, cap, YAD logo,
// fragrance concentration and the volume on the label are preserved.
const BOTTLES={
 6:{source:'imagination-6ml.webp',rect:[476,881,172,58],font:27,italic:true},
 10:{source:'imagination-10ml.webp',rect:[478,763,169,59],font:28,italic:true},
 20:{source:'imagination-20ml.webp',rect:[450,797,225,62],font:36,italic:true},
 30:{source:'imagination-30ml.webp',rect:[431,852,260,60],font:31,italic:false},
 50:{source:'imagination-50ml.webp',rect:[412,846,303,64],font:34,italic:false},
 100:{source:'imagination-100ml.webp',rect:[466,793,270,70],font:32,italic:false}
};
const STUDIO_ORIGIN='https://yad-market.vercel.app/assets/studio/';
// Vercel's minimal serverless image environment does not include system fonts.
// Convert bundled, openly licensed font glyphs to vector paths instead of relying
// on <text> in sharp's SVG renderer. No font files are exposed by this endpoint.
const loadedFonts=new Map();
function vectorFont(text,italic){
 const script=/[а-яё]/i.test(text)?'cyrillic':'latin';
 const style=italic?'italic':'normal';
 const key=script+':'+style;
 if(!loadedFonts.has(key)){
  const filename='noto-serif-'+script+'-400-'+style+'.woff2';
  const file=require.resolve('@fontsource/noto-serif/files/'+filename);
  loadedFonts.set(key,fontkit.openSync(file));
 }
 return loadedFonts.get(key);
}
function nameAsSvgPaths(name,config,width,height){
 const value=config.italic?name:name.toLocaleUpperCase('fr-FR');
 const font=vectorFont(value,config.italic);
 const glyphs=font.layout(value);
 if(glyphs.glyphs.some(g=>g.id===0))throw Error('Missing letter outline in YAD label font');
 const total=glyphs.positions.reduce((sum,p)=>sum+p.xAdvance,0);
 const [x,y,w,h]=config.rect;
 const fontScale=Math.min(config.font/font.unitsPerEm,(w-14)/Math.max(1,total));
 const middleX=x+w/2;
 const middleY=y+h/2;
 const capHeight=font.capHeight||font.unitsPerEm*0.72;
 const top=middleY+(capHeight*fontScale/2);
 let pen=0;
 const paths=glyphs.glyphs.map((glyph,i)=>{
  const p=glyphs.positions[i];
  const dx=pen+p.xOffset,dy=p.yOffset;
  pen+=p.xAdvance;
  return '<path transform="translate('+dx+' '+dy+')" d="'+glyph.path.toSVG()+'"/>';
 }).join('');
 return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'"><g fill="#1d1713" transform="translate('+(middleX-total*fontScale/2)+' '+top+') scale('+fontScale+' -'+fontScale+')">'+paths+'</g></svg>');
}

function fragrance(id){
 const index=YAD_CATALOG_ROWS.findIndex(row=>row[0]===id);
 // Existing scents keep their own studio assets; this is only for new arrivals.
 return index>=YAD_BASE_STUDIO_COUNT?YAD_CATALOG_ROWS[index]:null;
}
function inpaintLabel(data,info,r){
 const [x0,y0,w,h]=r;
 const {width,height,channels}=info;
 if(channels!==4||x0<10||y0<10||x0+w+10>=width||y0+h+10>=height)throw Error('Invalid label coordinates');
 const source=Buffer.from(data),endX=x0+w,endY=y0+h;
 // Recreate the local paper gradient by interpolating clean image rows
 // immediately above and below the original lettering (same x coordinate).
 const upper=y0-7,lower=endY+6;
 for(let y=y0;y<endY;y++){
  const t=(y-y0+1)/(h+1);
  const fadeY=Math.min(1,(y-y0+1)/9,(endY-y)/9);
  for(let x=x0;x<endX;x++){
   const fadeX=Math.min(1,(x-x0+1)/9,(endX-x)/9);
   const alpha=fadeY*fadeX;
   const index=(y*width+x)*4,top=(upper*width+x)*4,bottom=(lower*width+x)*4;
   for(let ch=0;ch<3;ch++){
    const inferred=source[top+ch]*(1-t)+source[bottom+ch]*t;
    data[index+ch]=Math.round(source[index+ch]*(1-alpha)+inferred*alpha);
   }
  }
 }
}
async function renderYadFlacon(id,ml,options={}){
 const row=fragrance(id),config=BOTTLES[ml];
 if(!row||!config)throw Object.assign(Error('Unknown new fragrance/volume'),{status:404});
 const response=await fetch(STUDIO_ORIGIN+config.source,{signal:AbortSignal.timeout(8500)});
 if(!response.ok)throw Object.assign(Error('Studio bottle reference not available'),{status:503});
 const reference=Buffer.from(await response.arrayBuffer());
 if(reference.length>900000)throw Error('Studio reference too large');
 const {data,info}=await sharp(reference).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 inpaintLabel(data,info,config.rect);
 const svg=nameAsSvgPaths(row[1],config,info.width,info.height);
 const output=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}})
  .composite([{input:svg,left:0,top:0}]).webp({quality:91,effort:4}).toBuffer();
 return output;
}
module.exports={renderYadFlacon,BOTTLES,fragrance};
