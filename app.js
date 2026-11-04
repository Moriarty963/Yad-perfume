const prices={6:500,10:700,20:1300,30:1800,50:2700,100:5000};
const deliveryFee=250;
const travelSurcharge={6:90,10:90};
const travelColors=['Чёрный','Белый мрамор','Серый мрамор'];
function itemPrice(ml,variant){return prices[ml]+(variant==='travel'&&travelSurcharge[ml]?travelSurcharge[ml]:0)}
function packagingName(x){return x.variant==='travel'?'Travel · '+x.color:'Стекло'}

const fragrances=YAD_CATALOG_ROWS.map(([id,name,notes,family,audience])=>({id,name,notes,family,audience,glow:({fresh:'#53645f',woody:'#67584a',intense:'#624a49',floral:'#806b6a'})[family]||'#5b5750'}));
const audienceLabels={men:'Мужской',women:'Женский',unisex:'Унисекс'};
const fragranceFamilyLabels={fresh:'Свежий',woody:'Древесный',floral:'Цветочный',intense:'Насыщенный'};
const fragranceStories={
immensite:'Бодрое цитрусовое начало с пряным имбирём и тёплой амбровой глубиной.',
imagination:'Чистое, светлое сочетание цитруса, воздушного чая и нероли.',
escentric02:'Сдержанная композиция вокруг амброксана с мягким мускусом и ирисом.',
tygar:'Контраст сочного грейпфрута и сухого древесного характера.',
aventus:'Яркое фруктовое начало, дымно-древесный акцент и мягкий мускус.',
kirke:'Сочный фруктовый характер с мягкой ванилью и мускусным шлейфом.',
blackpepper:'Пряная энергия чёрного перца на спокойной древесной основе.',
amberwood:'Глубокая амброво-древесная композиция с тёплыми специями.',
tilia:'Нежное цветочное настроение с липовым цветом и медовыми оттенками.',
megamare:'Прохладный морской характер с солёными и амбровыми акцентами.'
};
// Describe the fragrance itself, never the size or bottle. Unknown scents use
// only the catalogue's documented family and notes — not invented pyramids.
function aromaDescription(f){
 if(fragranceStories[f.id])return fragranceStories[f.id];
 const moods={
  fresh:'Свежая, лёгкая композиция с чистым характером.',
  woody:'Спокойная древесная композиция с выразительным характером.',
  floral:'Мягкая цветочная композиция с деликатным характером.',
  intense:'Насыщенная композиция с ярким характером.'
 };
 const notes=String(f.notes||'').split(' · ').map(x=>x.trim()).filter(Boolean);
 return (moods[f.family]||'Композиция с собственным характером.')+
  (notes.length?' В её звучании сочетаются '+notes.join(', ')+'.':'');
}
const favoritesKey='yad-favorites-v1';let favorites=[];try{const saved=JSON.parse(localStorage.getItem(favoritesKey)||'[]');favorites=Array.isArray(saved)?saved.filter(id=>fragrances.some(f=>f.id===id)):[]}catch{};let favoritesOnly=false;function updateFavoritesUI(){$('favoritesCount').textContent=favorites.length;$('favoritesFilter').setAttribute('aria-pressed',String(favoritesOnly));$('favoritesFilter').classList.toggle('active',favoritesOnly)}function toggleFavorite(id){if(!fragrances.some(f=>f.id===id))return;favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];try{localStorage.setItem(favoritesKey,JSON.stringify(favorites))}catch{}updateFavoritesUI();renderProducts();notify(favorites.includes(id)?'Аромат сохранён в избранном':'Аромат удалён из избранного')}
const $=id=>document.getElementById(id);const key='yad-market-cart-v1';let cart=[];try{cart=JSON.parse(localStorage.getItem(key))||[]}catch{};
// Rebuild saved cart from the current catalog and price list; never trust stale prices.
cart=Array.isArray(cart)?cart.filter(x=>x&&typeof x.id==='string'&&Number.isInteger(Number(x.qty))&&Number(x.qty)>0).map(x=>{const isSet=x.id==='discovery';const item=fragrances.find(f=>f.id===x.id);const ml=Number(x.ml);if(!isSet&&!item)return null;if(!isSet&&!Object.prototype.hasOwnProperty.call(prices,ml))return null;const variant=!isSet&&[6,10].includes(ml)&&x.variant==='travel'?'travel':'glass';const color=variant==='travel'&&travelColors.includes(x.color)?x.color:'Чёрный';return {id:x.id,ml:isSet?0:ml,title:isSet?'Discovery Set · 3 × 6 мл':item.name,variant:isSet?'glass':variant,color,price:isSet?990:itemPrice(ml,variant),qty:Math.min(30,Number(x.qty))}}).filter(Boolean):[];
// Only the public order number and purchased items are kept for this tab.
// Personal details (name, phone, address) are deliberately not stored here.
const lastOrderSessionKey='yad-last-order-session-v1';
const lastOrderDeviceKey='yad-last-order-status-v2';
const orderHistoryKey='yad-order-history-v1';
const lastOrderRetentionMs=180*24*60*60*1000;
const maxLocalOrderHistory=15;
let lastOrder=null;
let orderHistory=[];
function normalizeLocalOrder(value){
 if(!value||typeof value!=='object'||!/^[A-F0-9]{8}$/.test(String(value.number||''))||!Array.isArray(value.items)||value.items.length>30)return null;
 const savedAt=Number(value.savedAt)||Date.now();
 if(savedAt>Date.now()+60000||Date.now()-savedAt>lastOrderRetentionMs)return null;
 const items=value.items.map(entry=>{
  const x=entry&&typeof entry==='object'?entry:{};
  return {
   name:String(x.name||'Аромат').slice(0,120),
   description:String(x.description||'').slice(0,180),
   qty:Math.min(30,Math.max(1,Number(x.qty)||1)),
   price:Math.max(0,Math.min(1000000,Number(x.price)||0))
  };
 });
 const token=typeof value.statusToken==='string'&&/^v1\.[0-9a-f-]{36}\.[0-9]{10}\.[a-f0-9]{64}$/.test(value.statusToken)?value.statusToken:null;
 return {number:value.number,method:value.method==='whatsapp'?'whatsapp':'telegram',
 delivery:value.delivery==='Wildberries'?'Wildberries':'Ozon',
 total:Math.max(0,Math.min(1000000,Number(value.total)||0)),items,
 statusToken:token,status:['new','confirmed','paid','shipped','completed','cancelled'].includes(value.status)?value.status:'new',
 checkedAt:typeof value.checkedAt==='string'?value.checkedAt:null,savedAt};
}
try{
 const data=JSON.parse(localStorage.getItem(orderHistoryKey)||'[]');
 if(Array.isArray(data))orderHistory=data.map(normalizeLocalOrder).filter(Boolean).sort((a,b)=>b.savedAt-a.savedAt).slice(0,maxLocalOrderHistory);
 const oldData=localStorage.getItem(lastOrderDeviceKey)||sessionStorage.getItem(lastOrderSessionKey);
 const previous=oldData?normalizeLocalOrder(JSON.parse(oldData)):null;
 if(previous&&!orderHistory.some(x=>x.number===previous.number))orderHistory.push(previous);
 orderHistory.sort((a,b)=>b.savedAt-a.savedAt);
 orderHistory=orderHistory.slice(0,maxLocalOrderHistory);
 lastOrder=orderHistory[0]||null;
}catch{orderHistory=[];lastOrder=null}
function persistLocalOrderHistory(){
 try{localStorage.setItem(orderHistoryKey,JSON.stringify(orderHistory))}catch{}
 if(lastOrder){
  try{localStorage.setItem(lastOrderDeviceKey,JSON.stringify(lastOrder))}catch{}
  try{sessionStorage.setItem(lastOrderSessionKey,JSON.stringify(lastOrder))}catch{}
 }else{
  try{localStorage.removeItem(lastOrderDeviceKey)}catch{}
  try{sessionStorage.removeItem(lastOrderSessionKey)}catch{}
 }
}
function saveLastOrder(){
 if(!lastOrder)return;
 const clean=normalizeLocalOrder(lastOrder);if(!clean)return;
 lastOrder=clean;
 const previousIndex=orderHistory.findIndex(o=>o.number===clean.number);
 if(previousIndex>=0)orderHistory[previousIndex]=clean;
 else orderHistory.unshift(clean);
 orderHistory.sort((a,b)=>b.savedAt-a.savedAt);
 orderHistory=orderHistory.slice(0,maxLocalOrderHistory);
 persistLocalOrderHistory();
}
function deleteSavedOrder(number){
 orderHistory=orderHistory.filter(x=>x.number!==number);
 if(lastOrder?.number===number)lastOrder=orderHistory[0]||null;
 persistLocalOrderHistory();
 renderOrderReceipt();
 renderOrderHistory();
 notify('Сведения о заявке удалены с этого устройства.');
}
function forgetLastOrder(){if(lastOrder)deleteSavedOrder(lastOrder.number)}
const rub=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const yadPhoto=ml=>'/assets/yad-'+ml+'ml.webp';
// Approved Higgsfield concept visuals are registered here by fragrance and bottle size.
// Keep empty until each generated WebP is checked against its real bottle reference.
const YAD_STUDIO_VISUALS={};
const YAD_PHOTO_MANIFEST={imagination:{
6:{main:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/8275abcb-2a55-4854-a0d1-894da87fee07.jpg'},
10:{main:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/33d4d1a6-36dc-42f3-8eb8-5e46a7212063.jpg'},
20:{main:'/assets/real/imagination-20ml-main.webp'},
30:{main:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/8ed5016f-b1c1-402c-8210-1d5f9bb767d6.jpg'},
50:{main:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/c992b3b0-982c-4f82-8723-bf6d42cc21e6.jpg'},
100:{main:'https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/f61658bc-dbbf-4b70-b3cc-069d4c019287.jpg'}
}}
function fragranceAsset(id,ml){return '/assets/fragrances/'+id+(ml===20?'':'-'+ml+'ml')+'.svg'}
function yadPhotoManifest(id,ml){return YAD_PHOTO_MANIFEST[id]?.[ml]||null}
function yadDigitalBottle(id,ml){
 const f=fragrances.find(x=>x.id===id),name=f?.name||id;
 const title=safe(name.toUpperCase());
 const small=ml<=10,round=ml>=30;
 const x=small?170:120,w=small?180:280,y=small?175:185,h=small?325:310;
 const cap=small?'<rect x="207" y="68" width="106" height="111" rx="12" fill="url(#black)"/>':round?'<circle cx="260" cy="110" r="79" fill="url(#black)"/><ellipse cx="228" cy="73" rx="27" ry="12" fill="white" opacity=".26" transform="rotate(-30 228 73)"/>':'<rect x="190" y="45" width="140" height="140" rx="15" fill="url(#ivory)" stroke="#d7c6b3" stroke-width="2"/><path d="M208 60v103" stroke="#fff" stroke-width="13" opacity=".57"/><rect x="190" y="169" width="140" height="13" rx="2" fill="url(#gold)"/><rect x="193" y="51" width="134" height="5" rx="2" fill="url(#gold)" opacity=".72"/>';
 const fontSize=Math.max(12,Math.min(name.length>18?17:name.length>12?21:27,Math.floor((w-62)/Math.max(1,name.length*.64))));
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="520" height="620" viewBox="0 0 520 620"><defs><linearGradient id="glass"><stop stop-color="#b4a08b" stop-opacity=".7"/><stop offset=".15" stop-color="#fff" stop-opacity=".9"/><stop offset=".65" stop-color="#eed6b6" stop-opacity=".45"/><stop offset=".92" stop-color="#fff"/><stop offset="1" stop-color="#9b8874" stop-opacity=".7"/></linearGradient><radialGradient id="black" cx=".25" cy=".15" r=".85"><stop stop-color="#666"/><stop offset=".3" stop-color="#272727"/><stop offset="1" stop-color="#050505"/></radialGradient><linearGradient id="gold"><stop stop-color="#85602b"/><stop offset=".5" stop-color="#f4d78a"/><stop offset="1" stop-color="#8e652e"/></linearGradient><linearGradient id="ivory"><stop stop-color="#c9bbae"/><stop offset=".17" stop-color="#f3eee6"/><stop offset=".52" stop-color="#fffdf8"/><stop offset=".86" stop-color="#e4d9cc"/><stop offset="1" stop-color="#bcb0a4"/></linearGradient></defs><ellipse cx="260" cy="521" rx="150" ry="14" fill="#9e8b77" opacity=".14"/>'+cap+'<rect x="217" y="170" width="86" height="18" rx="3" fill="url(#gold)"/><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(round?23:12)+'" fill="url(#glass)" stroke="#c7b8a8" stroke-width="5"/><rect x="'+(x+14)+'" y="'+(y+14)+'" width="'+(w-28)+'" height="'+(h-32)+'" rx="9" fill="#f5e8d5" fill-opacity=".27" stroke="white" stroke-width="3"/><path d="M'+(x+22)+' '+(y+28)+'v'+(h-75)+'" stroke="white" stroke-width="13" opacity=".27"/><path d="M'+(x+w-21)+' '+(y+45)+'v'+(h-110)+'" stroke="#8c7868" stroke-width="6" opacity=".17"/><rect x="'+(x+23)+'" y="250" width="'+(w-46)+'" height="180" rx="3" fill="#fffaf0" fill-opacity=".95"/><text x="260" y="293" text-anchor="middle" font-family="Georgia,serif" font-size="35" letter-spacing="4" fill="#211d18">YAD</text><text x="260" y="316" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" letter-spacing="1.8" fill="#62544a">PERFUME ATELIER</text><text x="260" y="348" text-anchor="middle" font-family="Georgia,serif" font-size="'+fontSize+'" fill="#211d18">'+title+'</text><path d="M238 370h44" stroke="#b69b71"/><text x="260" y="394" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" letter-spacing="1.5">EXTRAIT DE PARFUM</text><text x="260" y="416" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" letter-spacing="2">'+ml+' ML</text></svg>';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function yadProductImage(id,ml){
 const f=fragrances.find(x=>x.id===id);
 const slug=YAD_PHOTO_SLUGS[id]||id;
 const studio=f&&Object.prototype.hasOwnProperty.call(prices,ml)?'/assets/studio/'+slug+'-'+ml+'ml.webp?v=20261104-2':null;
 const photo=yadPhotoManifest(id,ml)?.main;
 const original=id==='imagination'&&!!photo;
 return {src:studio||photo||yadDigitalBottle(id,ml),isPhoto:original,isComposite:!!studio&&!original,isMockup:false};
}
function yadMediaLabel(asset){return asset.isPhoto?'Фото флакона':asset.isComposite?'Фотомакет':'Визуализация'}
const YAD_MOCKUP_LABEL_LAYOUT={
 6:[42.8,63.2,14.5,3.5],10:[42.6,54.6,14.7,3.6],
 20:[40.7,56.6,18.9,4.6],30:[39.4,61.6,21.1,3.1],
 50:[37.25,61.1,26.2,3.1],100:[40.1,61,20.6,3.8]
};
function yadMockupLabel(id,ml){
 const a=yadProductImage(id,ml);if(!a.isMockup)return '';
 const f=fragrances.find(x=>x.id===id),pos=YAD_MOCKUP_LABEL_LAYOUT[ml];if(!f||!pos)return '';
 const [x,y,w,h]=pos;
 return '<span aria-hidden="true" class="yad-mockup-label yad-mockup-label-'+ml+'" data-yad-label="'+id+'" style="--mx:'+x+'%;--my:'+y+'%;--mw:'+w+'%;--mh:'+h+'%;">'+safe(f.name.toUpperCase())+'</span>';
}

function updateDetailImage(id,ml){
 const root=$('fragranceDetail'),img=root.querySelector('.yad-detail-hero-photo'),label=root.querySelector('#detailImageStatus');
 const f=fragrances.find(x=>x.id===id),asset=yadProductImage(id,ml);
 if(!img)return;
 const stage=img.closest('.detail-visual');
 stage.querySelector('[data-yad-label]')?.remove();
 stage.insertAdjacentHTML('beforeend',yadMockupLabel(id,ml));
 const sequence=String((Number(stage.dataset.imageSequence)||0)+1);stage.dataset.imageSequence=sequence;
 const old=stage.querySelector('.atelier-previous-photo');if(old)old.remove();
 const previous=img.cloneNode(false);previous.removeAttribute('id');previous.removeAttribute('onerror');previous.className='atelier-previous-photo';previous.alt='';previous.setAttribute('aria-hidden','true');stage.insertBefore(previous,img);
 img.classList.add('atelier-photo-changing');
 img.alt=yadMediaLabel(asset)+' YAD '+(f?.name||id)+', '+ml+' мл';
 const preload=new Image();let resolved=false;
 const commit=(src,isPhoto)=>{if(resolved||stage.dataset.imageSequence!==sequence)return;resolved=true;img.src=src;
  if(label)label.textContent=(src===asset.src?yadMediaLabel(asset):'Визуализация')+' · '+ml+' мл';
  requestAnimationFrame(()=>{img.classList.remove('atelier-photo-changing');previous.classList.add('atelier-photo-leaving')});
  setTimeout(()=>{if(previous.isConnected)previous.remove()},460);
 };
 preload.onload=()=>commit(asset.src,asset.isPhoto);
 preload.onerror=()=>commit(yadDigitalBottle(id,ml),false);
 preload.src=asset.src;
}

function yadImageFallback(img,id,ml){
 if(img.dataset.fallbackApplied==='1'){img.hidden=true;img.parentElement?.classList.remove('has-volume-photo');return}
 img.dataset.fallbackApplied='1';img.parentElement?.querySelector('[data-yad-label]')?.remove();img.src=yadDigitalBottle(id,ml);
 const label=img.parentElement?.querySelector('.atelier-card-media-label');if(label)label.textContent='Визуализация';
}
function photoMarkup(ml,id,priority=false){
 const f=fragrances.find(x=>x.id===id),asset=yadProductImage(id,ml);
 const loading=priority?'loading="eager" fetchpriority="high"':'loading="lazy"';
 const dimensions=ml===20?'width="1122" height="1402"':'';
 return `<img class="yad-volume-photo" src="${asset.src}" alt="${asset.isMockup?'Фотомакет':'Флакон'} YAD ${safe(f?.name||id)}, ${ml} мл" ${loading} ${dimensions} decoding="async" onload="this.hidden=false;this.parentElement.classList.add('has-volume-photo')" onerror="yadImageFallback(this,'${id}',${ml})" data-volume="${ml}">${yadMockupLabel(id,ml)}`;
}
// Accent-, punctuation- and Russian-keyboard-friendly catalog search.
const scentAliases={
 imagination:'имаджинейшн имажинейшн',kirke:'кирке',aventus:'авентус',
 tygar:'тайгар тигар тайгер',megamare:'мегамаре',immensite:'лимменсите лименсите',
 escentric02:'молекула молекула 02 эсцентрик 02',blackpepper:'блэк пеппер',
 amberwood:'амбер вуд',baccarat:'баккара баккарат',tilia:'тилия',
 'fleur-narcotique':'флер наркотик'
};
function foldScent(text){
 return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ё/g,'е').replace(/æ/g,'ae').replace(/œ/g,'oe').replace(/[^a-zа-я0-9]+/g,' ').trim();
}
const translitMap={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ы:'y',э:'e',ю:'yu',я:'ya',ь:'',ъ:''};
function translitScent(s){return s.replace(/[а-я]/g,ch=>translitMap[ch]??ch)}
function scentMatches(f,terms){
 if(!terms.length)return true;
 const base=foldScent(f.name+' '+f.notes+' '+(scentAliases[f.id]||''));
 const latin=translitScent(base);
 return terms.every(term=>base.includes(term)||latin.includes(translitScent(term)));
}
const catalogPageSize=12;
let catalogVisibleLimit=catalogPageSize,catalogViewKey='',renderedCatalogIds=[];
function renderProducts(){const query=foldScent($('search').value);const terms=query?query.split(/\s+/).filter(Boolean):[];const family=$('family').value,audience=$('audience').value;let items=fragrances.filter(f=>(!favoritesOnly||favorites.includes(f.id))&&(family==='all'||f.family===family)&&(audience==='all'||f.audience===audience)&&scentMatches(f,terms));const sort=$('sort').value;if(sort==='name')items.sort((a,b)=>a.name.localeCompare(b.name,'ru'));if(sort==='name-desc')items.sort((a,b)=>b.name.localeCompare(a.name,'ru'));const key=JSON.stringify([query,family,audience,sort,favoritesOnly]);if(catalogViewKey!==key){catalogViewKey=key;catalogVisibleLimit=catalogPageSize;renderedCatalogIds=[]}
const shown=items.slice(0,catalogVisibleLimit),shownIds=shown.map(f=>f.id);
const append=renderedCatalogIds.length>0&&shownIds.length>renderedCatalogIds.length&&renderedCatalogIds.every((id,index)=>id===shownIds[index]);
const toRender=append?shown.slice(renderedCatalogIds.length):shown;
$('catalogCount').textContent=items.length===0?'Ничего не найдено':`Показано ${shown.length} из ${items.length} ароматов`;
const markup=toRender.map((f,index)=>`<article class="product" data-card-detail="${f.id}"><div class="product-art scene-${f.family} " style="--glow:${f.glow}"><div class="scene-backdrop" aria-hidden="true"><i class="scene-light"></i><i class="scene-ridge ridge-one"></i><i class="scene-ridge ridge-two"></i><i class="scene-branch"></i><i class="scene-stone"></i><i class="scene-foreground"></i></div>${photoMarkup(20,f.id,!append&&index<2)}<span class="atelier-card-media-label" aria-label="Тип изображения">${yadMediaLabel(yadProductImage(f.id,20))}</span><div class="yad-product-bottle volume-20" aria-hidden="true"><div class="yad-cap"></div><div class="yad-collar"></div><div class="yad-glass"><div class="yad-tube"></div><div class="yad-label"><span>YAD PERFUME</span><strong>${safe(f.name)}</strong><small>EXTRAIT DE PARFUM<br><span class="bottle-volume">20 мл</span></small></div></div></div><button type="button" class="favorite-toggle" data-favorite="${f.id}" aria-pressed="${favorites.includes(f.id)}" aria-label="${favorites.includes(f.id)?'Убрать из избранного':'В избранное'}: ${safe(f.name)}">${favorites.includes(f.id)?'♥':'♡'}</button></div><div class="product-info"><a class="product-image-link" href="/fragrance/${f.id}" data-detail="${f.id}" aria-label="Подробнее об аромате ${safe(f.name)}">Подробнее об аромате ↗</a><div class="product-meta"><span class="product-audience" data-audience="${f.audience}">${audienceLabels[f.audience]}</span><span>№ ${String(fragrances.indexOf(f)+1).padStart(2,"0")}</span></div><h3><a class="product-detail-link" href="/fragrance/${f.id}" data-detail="${f.id}">${safe(f.name)}</a></h3><p class="product-aroma-description">${safe(aromaDescription(f))}</p><p class="product-aroma-notes"><span>Ноты</span> ${safe(f.notes)}</p><p class="product-price">${rub(prices[20])}</p><select aria-label="Объём ${safe(f.name)}" id="size-${f.id}">${Object.entries(prices).map(([ml,p])=>`<option value="${ml}" ${ml==='20'?'selected':''}>${ml} мл — ${rub(p)}</option>`).join('')}</select><button data-add="${f.id}">Добавить в корзину ↗</button></div></article>`).join('');
const holder=$('products');if(append){holder.insertAdjacentHTML('beforeend',markup)}else{holder.innerHTML=markup||'<p>Ароматы не найдены. Попробуйте другой запрос.</p>'}
renderedCatalogIds=shownIds;
const more=$('catalogMore');if(more){more.hidden=shown.length>=items.length;$('catalogMoreCount').textContent=more.hidden?'':`Ещё ${items.length-shown.length} ароматов в коллекции`;}
}
function syncBottle(select){
 const card=select.closest('.product');if(!card)return;
 const ml=Number(select.value),id=card.dataset.cardDetail||card.querySelector('[data-detail]')?.dataset.detail||'';
 const art=card.querySelector('.product-art'),photo=art?.querySelector('.yad-volume-photo');
 if(!art||!photo||!Object.prototype.hasOwnProperty.call(prices,ml))return;
 const asset=yadProductImage(id,ml);
 const request=String((Number(photo.dataset.requestSequence)||0)+1);
 photo.dataset.requestSequence=request;
 // Prices respond immediately; keep the previous photograph visible while the next loads.
 const price=card.querySelector('.product-price');if(price)price.textContent=rub(prices[ml]);
 const volume=card.querySelector('.bottle-volume');if(volume)volume.textContent=ml+' мл';
 const bottle=card.querySelector('.yad-product-bottle');
 if(bottle)bottle.className='yad-product-bottle volume-'+ml;
 art.classList.toggle('photo-volume-20',ml===20&&!!card.querySelector('.real-bottle-photo'));
 const completeImage=(src,fallback)=>{
  if(photo.dataset.requestSequence!==request||!photo.isConnected)return;
  let previous=art.querySelector('.yad-previous-volume-photo');
  if(previous)previous.classList.remove('yad-photo-fading');
  else if(art.classList.contains('has-volume-photo')&&!photo.hidden&&photo.complete&&photo.naturalWidth){
   previous=photo.cloneNode(false);
   previous.className='yad-previous-volume-photo';
   previous.removeAttribute('onload');previous.removeAttribute('onerror');
   previous.alt='';previous.setAttribute('aria-hidden','true');
   art.appendChild(previous);
  }
  photo.classList.add('yad-photo-entering');
  let finished=false;
  const done=()=>{
   if(finished||photo.dataset.requestSequence!==request)return;finished=true;
   photo.hidden=false;photo.dataset.volume=String(ml);
   photo.alt=(fallback?'Визуализация':yadMediaLabel(asset))+' YAD '+(fragrances.find(f=>f.id===id)?.name||id)+', '+ml+' мл';
   art.classList.add('has-volume-photo');
   art.setAttribute('aria-label',photo.alt);
   const badge=card.querySelector('.atelier-card-media-label');
   if(badge)badge.textContent=fallback?'Визуализация':yadMediaLabel(asset);
   card.querySelector('[data-yad-label]')?.remove();
   art.insertAdjacentHTML('beforeend',yadMockupLabel(id,ml));
   requestAnimationFrame(()=>{
    if(photo.dataset.requestSequence!==request)return;
    photo.classList.remove('yad-photo-entering');
    if(previous){
     previous.classList.add('yad-photo-fading');
     setTimeout(()=>{if(previous.isConnected&&previous.classList.contains('yad-photo-fading'))previous.remove()},320);
    }
   });
  };
  photo.onload=done;
  photo.onerror=()=>{
   if(photo.dataset.requestSequence!==request)return;
   if(!fallback){completeImage(yadDigitalBottle(id,ml),true)}
   else{
    photo.classList.remove('yad-photo-entering');
    if(previous){previous.classList.remove('yad-photo-fading');art.classList.add('has-volume-photo')}
    else{photo.hidden=true;art.classList.remove('has-volume-photo')}
   }
  };
  photo.src=src;
  if(photo.complete&&photo.naturalWidth)done();
 };
 const preload=new Image();
 preload.onload=()=>completeImage(asset.src,false);
 preload.onerror=()=>completeImage(yadDigitalBottle(id,ml),true);
 preload.src=asset.src;
}
$('products').addEventListener('change',e=>{if(e.target.matches('select[id^="size-"]'))syncBottle(e.target)});$('loadMoreProducts').addEventListener('click',()=>{catalogVisibleLimit+=catalogPageSize;renderProducts()});
function syncCheckoutAction(){
 const button=$('submitSiteOrder');if(!button||button.disabled)return;
 const sum=cart.reduce((total,item)=>total+item.qty*item.price,0);
 button.innerHTML='Отправить заявку · '+rub(sum+(cart.length?deliveryFee:0))+' <span aria-hidden="true">↗</span>';
}
function notify(message){const el=$('toast');if(!el)return;el.textContent=message;el.hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>{el.hidden=true},3500)}function add(id,ml,variant='glass',color='Чёрный'){let title=id==='discovery'?'Discovery Set · 3 × 6 мл':fragrances.find(f=>f.id===id)?.name;if(!title)return;if(![6,10].includes(ml))variant='glass';if(variant!=='travel')variant='glass';if(!travelColors.includes(color))color='Чёрный';let price=id==='discovery'?990:itemPrice(ml,variant);if(!Number.isFinite(price))return;let found=cart.find(x=>x.id===id&&x.ml===ml&&(x.variant||'glass')===variant&&(variant!=='travel'||x.color===color));if(found){if(found.qty>=30){notify('Для одного товара максимум 30 штук.');return}found.qty+=1}else{if(cart.length>=30){notify('В корзине максимум 30 разных позиций.');return}cart.push({id,ml,title,variant,color,price,qty:1})}persist();notify('Добавлено в корзину · '+cart.reduce((sum,x)=>sum+x.qty,0)+' шт.')}
function persist(){try{localStorage.setItem(key,JSON.stringify(cart))}catch{}renderCart()}
function renderCart(){const quantity=cart.reduce((s,x)=>s+x.qty,0);const sum=cart.reduce((s,x)=>s+x.qty*x.price,0);$('count').textContent=quantity;$('subtotal').textContent=rub(sum);$('deliveryPrice').textContent=rub(quantity?deliveryFee:0);$('total').textContent=rub(quantity?sum+deliveryFee:0);$('mobileCartCount').textContent=quantity;$('mobileCartTotal').textContent=rub(quantity?sum+deliveryFee:0);$('mobileCartBar').hidden=true;$('navCartCount').textContent=quantity>99?'99+':quantity;$('navCartCount').hidden=quantity===0;$('clearCart').hidden=quantity===0;$('cartItems').innerHTML=cart.length?cart.map((x,i)=>`<div class="cart-row"><div class="cart-product"><img class="cart-bottle-photo" alt="" loading="lazy" decoding="async" src="${x.id==='discovery'?'/assets/yad-6ml.webp':yadProductImage(x.id,x.ml).src}" onerror="this.onerror=null;this.src='/assets/yad-20ml.webp'"><div class="cart-product-copy">${safe(x.title)}<small>${x.id==='discovery'?'Набор':x.ml+' мл · '+packagingName(x)} · ${x.qty} шт. · ${rub(x.price*x.qty)}</small></div></div><div class="cart-qty"><button data-remove="${i}" aria-label="Уменьшить количество ${safe(x.title)}">−</button><span aria-label="Количество">${x.qty}</span><button data-increase="${i}" aria-label="Увеличить количество ${safe(x.title)}">+</button></div></div>`).join(''):'<p class="cart-empty-state">Пока пусто. Выберите аромат из коллекции.</p>';
 $('checkoutPanel').hidden=cart.length===0;
 renderCheckoutReview();
 renderOrderReceipt();
 renderOrderHistory();
 syncCheckoutAction();
}
function orderProductLine(x){
 return x.id==='discovery'?'Набор 3 × 6 мл':x.ml+' мл · '+packagingName(x);
}
function renderCheckoutReview(){
 const holder=$('checkoutReviewItems');if(!holder)return;
 const qty=cart.reduce((sum,x)=>sum+x.qty,0);
 $('checkoutReviewCount').textContent=qty+' шт.';
 $('checkoutReviewTotal').textContent=rub(cart.reduce((sum,x)=>sum+x.qty*x.price,0)+(cart.length?deliveryFee:0));
 holder.innerHTML=cart.map(x=>`<div class="checkout-review-row"><img src="${x.id==='discovery'?'/assets/yad-6ml.webp':yadProductImage(x.id,x.ml).src}" loading="lazy" alt="" onerror="this.onerror=null;this.src='/assets/yad-20ml.webp'"><div><strong>${safe(x.title)}</strong><small>${safe(orderProductLine(x))} · ${x.qty} шт.</small></div><span>${rub(x.price*x.qty)}</span></div>`).join('');
}
function receiptPlainText(order){
 return ['YAD / PERFUME ATELIER','Заявка №'+order.number,'','Состав заказа:',...order.items.map((x,i)=>(i+1)+'. '+x.name+' — '+x.description+' × '+x.qty+' = '+rub(Number(x.price)||0)),'','Доставка: '+order.delivery,'Итого с доставкой: '+rub(Number(order.total)||0),'','Заявка отправлена. Дождитесь подтверждения от YAD в '+(order.method==='telegram'?'Telegram':'WhatsApp')+'.'].join('\n');
}
function orderInquiryUrl(order){
 const number=String(window.YAD_WHATSAPP_NUMBER||'').replace(/\D/g,'');
 if(!/^\d{10,15}$/.test(number))return '';
 return 'https://wa.me/'+number+'?text='+encodeURIComponent('Здравствуйте! Хочу уточнить статус заявки YAD №'+order.number+'.');
}
const orderStatusDetails={
 new:['Новый','Заявка получена и ожидает подтверждения.'],
 confirmed:['Подтверждён','Мы подтвердили заказ и готовим его к выполнению.'],
 paid:['Оплачен','Поступление оплаты отмечено администратором YAD.'],
 shipped:['Отправлен','Заказ передан на доставку. Уточните номер отправления у YAD.'],
 completed:['Завершён','Заказ отмечен как завершённый.'],
 cancelled:['Отменён','Заявка отменена. При необходимости свяжитесь с YAD.']
};
function orderStatusTimestamp(iso){
 if(!iso||!Number.isFinite(new Date(iso).getTime()))return 'Пока не проверяли';
 return 'Проверено '+new Date(iso).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
}
function renderOrderHistory(){
 const holder=$('orderHistory');if(!holder)return;
 const show=orderHistory.length>1||(orderHistory.length>0&&cart.length>0);
 holder.hidden=!show;
 if(!show){holder.innerHTML='';return}
 const list=holder.querySelector('.order-history-list');
 const expanded=list?list.open:true;
 const expandedItems=new Set(Array.from(holder.querySelectorAll('details[data-history-detail][open]')).map(x=>x.dataset.historyDetail));
 const rows=orderHistory.map(o=>{
  const valid=Object.prototype.hasOwnProperty.call(orderStatusDetails,o.status);
  const label=valid?orderStatusDetails[o.status][0]:'Новый';
  const date=new Date(o.savedAt).toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'});
  const lines=o.items.map(x=>'<div class="order-history-product"><div><strong>'+safe(x.name)+'</strong><small>'+safe(x.description)+' · '+Number(x.qty)+' шт.</small></div><span>'+rub(Number(x.price)||0)+'</span></div>').join('');
  const detailOpen=expandedItems.has(o.number);
  return '<article class="order-history-item">'+
   '<div class="order-history-head"><div><strong>№'+safe(o.number)+'</strong><small>'+safe(date)+'</small></div><div class="order-history-head-right"><span class="order-history-badge status-'+safe(o.status)+'">'+safe(label)+'</span><strong>'+rub(o.total)+'</strong></div></div>'+
   '<details data-history-detail="'+safe(o.number)+'"'+(detailOpen?' open':'')+'><summary>Состав заказа</summary><div class="order-history-products">'+lines+'</div></details>'+
   '<div class="order-history-actions">'+(!cart.length?'<button type="button" data-history-open="'+safe(o.number)+'">Открыть заказ</button>':'')+
   (o.statusToken?'<button type="button" data-history-check="'+safe(o.number)+'">Проверить статус</button>':'')+
   '<button type="button" class="order-history-remove" data-history-remove="'+safe(o.number)+'">Удалить</button></div></article>';
 }).join('');
 holder.innerHTML='<details class="order-history-list"'+(expanded?' open':'')+'><summary><span>Мои заявки</span><small>'+orderHistory.length+' сохранено на этом устройстве</small></summary><p class="order-history-note">Это история в текущем браузере, а не личный кабинет. Статусы обновляются только при проверке.</p>'+rows+'</details>';
}
$('orderHistory').addEventListener('click',async e=>{
 const target=e.target.closest('[data-history-open],[data-history-check],[data-history-remove]');
 if(!target)return;
 const number=target.dataset.historyOpen||target.dataset.historyCheck||target.dataset.historyRemove;
 const order=orderHistory.find(x=>x.number===number);if(!order)return;
 if(target.hasAttribute('data-history-remove')){
  if(window.confirm('Удалить заявку №'+number+' из истории на этом устройстве?'))deleteSavedOrder(number);
  return;
 }
 lastOrder=order;
 persistLocalOrderHistory();
 if(target.hasAttribute('data-history-check')){
  await checkLastOrderStatus(target);
  return;
 }
 renderOrderReceipt();
 renderOrderHistory();
 if(!cart.length)$('orderReceipt')?.scrollIntoView({block:'start',behavior:'smooth'});

});
function renderOrderReceipt(){
 const holder=$('orderReceipt');if(!holder)return;
 const show=!cart.length&&!!lastOrder;
 holder.hidden=!show;
 if(!show){holder.innerHTML='';return}
 const rows=lastOrder.items.map(x=>`<div class="order-receipt-row"><div><strong>${safe(x.name)}</strong><small>${safe(x.description)} · ${Number(x.qty)||1} шт.</small></div><span>${rub(Number(x.price)||0)}</span></div>`).join('');
 const inquiry=orderInquiryUrl(lastOrder);
 const receiptActions=inquiry?'<a href="'+safe(inquiry)+'" target="_blank" rel="noopener noreferrer">Уточнить статус в WhatsApp ↗</a>':'';
 const statusKey=Object.prototype.hasOwnProperty.call(orderStatusDetails,lastOrder.status)?lastOrder.status:'new';
 const [statusTitle,statusDescription]=orderStatusDetails[statusKey];
 const checkedLabel=orderStatusTimestamp(lastOrder.checkedAt);
 const telegramUI=lastOrder.statusToken
  ?'<section class="yad-tg-connect" aria-label="Подписка на уведомления"><div class="yad-tg-top"><strong>Уведомления в Telegram</strong><small>Только по вашему желанию</small></div><p>Подключите заказ к Telegram, чтобы получать сообщения при смене статуса и открыть свои заказы на другом устройстве. Отписаться можно командой /stop.</p><div class="yad-tg-actions"><button type="button" data-tg-connect>Подключить Telegram</button><button type="button" data-tg-check>Проверить подключение</button></div><p class="yad-tg-message" id="yadTgConnectStatus" role="status" aria-live="polite"></p></section>'
  :'';
 const trackingUI=lastOrder.statusToken
  ?`<section class="order-tracking" aria-label="Статус заявки"><div class="order-tracking-heading"><span>Актуальный статус заказа</span><span class="order-tracking-checked">${safe(checkedLabel)}</span></div><strong class="order-tracking-state status-${statusKey}">${safe(statusTitle)}</strong><p>${safe(statusDescription)}</p><button type="button" data-order-status>Проверить статус</button><p id="orderStatusMessage" class="order-tracking-message" role="status" aria-live="polite"></p></section>`
  :'<p class="order-receipt-note">Онлайн-проверка статуса доступна для новых заявок. Для этой заявки можно уточнить статус через WhatsApp.</p>';
 holder.innerHTML=`<div class="order-receipt-header"><span class="order-receipt-mark" aria-hidden="true">✓</span><div><span class="order-receipt-kicker">Заявка получена</span><h3>Заказ №${safe(lastOrder.number)}</h3><p>Мы свяжемся с вами в ${lastOrder.method==='telegram'?'Telegram':'WhatsApp'} для подтверждения.</p></div></div><div class="order-receipt-list">${rows}</div><div class="order-receipt-total"><span>Итого с доставкой (${safe(lastOrder.delivery)})</span><strong>${rub(Number(lastOrder.total)||0)}</strong></div>${trackingUI}${telegramUI}<div class="order-receipt-actions"><button type="button" data-order-copy>Скопировать состав заказа</button>${receiptActions}</div><p class="order-receipt-retention">История до 15 заявок хранится только в этом браузере, без имён, телефонов и адресов. Данные хранятся не дольше 180 дней, их можно удалить.</p><button type="button" class="order-forget" data-order-forget>Удалить сведения о заявке с устройства</button>`;
}
async function customerTelegramConnect(button,action){
 const order=lastOrder;if(!order?.statusToken)return;
 const label=$('yadTgConnectStatus');
 if(button){button.disabled=true;button.textContent=action==='link'?'Создаём ссылку…':'Проверяем…'}
 if(label)label.textContent=action==='link'?'Создаём безопасную ссылку для Telegram…':'Проверяем подписку…';
 try{
  const response=await fetch('/api/telegram-link',{method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json'},body:JSON.stringify({action,token:order.statusToken})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'Не удалось подключить Telegram.');
  if(lastOrder?.number!==order.number)return;
  const holder=$('yadTgConnectStatus');if(!holder)return;
  if(result.connected){
   holder.textContent='Telegram подключён. Уведомления будут приходить при изменении статуса.';
   return;
  }
  if(action==='link'&&typeof result.url==='string'&&/^https:\/\/t\.me\/[A-Za-z0-9_]{5,32}\?start=yad_[A-Za-z0-9_-]{32}$/.test(result.url)){
   holder.innerHTML='Ссылка действует 30 минут. Откройте Telegram и нажмите Start: <a href="'+safe(result.url)+'" target="_blank" rel="noopener noreferrer">Открыть бота ↗</a>. Затем нажмите «Проверить подключение».';
  }else if(!result.webhook_ready){
   holder.textContent='Telegram-бот ещё не активирован. Сейчас можно проверять статус заказа на сайте.';
  }else{
   holder.textContent='Подписка пока не найдена. Нажмите «Подключить Telegram» и подтвердите запуск бота.';
  }
 }catch(error){
  const holder=$('yadTgConnectStatus');if(holder)holder.textContent=String(error?.message||'Telegram временно недоступен.');
 }finally{
  if(button){button.disabled=false;button.textContent=action==='link'?'Подключить Telegram':'Проверить подключение'}
 }
}
async function checkLastOrderStatus(button){
 if(!lastOrder?.statusToken)return;
 const token=lastOrder.statusToken;
 if(button){button.disabled=true;button.textContent='Проверяем…'}
 const msg=$('orderStatusMessage');if(msg)msg.textContent='Запрашиваем актуальный статус…';
 try{
  const response=await fetch('/api/order-status',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'Не удалось получить статус.');
  if(!Object.prototype.hasOwnProperty.call(orderStatusDetails,result.status))throw new Error('Получен неизвестный статус заказа.');
  if(lastOrder?.statusToken!==token)return;
  lastOrder.status=result.status;
  lastOrder.checkedAt=typeof result.checked_at==='string'?result.checked_at:new Date().toISOString();
  saveLastOrder();
  renderOrderReceipt();
  renderOrderHistory();
  const updated=$('orderStatusMessage');if(updated)updated.textContent='Статус обновлён по данным YAD.';
  if(!updated)notify('Статус заявки №'+lastOrder.number+' обновлён: '+orderStatusDetails[result.status][0]);
 }catch(err){
  if(lastOrder?.statusToken!==token)return;
  const note=$('orderStatusMessage');if(note)note.textContent=String(err?.message||'Не удалось проверить статус. Попробуйте позже.');
  else notify('Не удалось проверить статус. Повторите попытку позже.');
 }finally{
  if(button){button.disabled=false;button.textContent='Проверить статус'}
  const active=$('orderReceipt')?.querySelector('[data-order-status]');
  if(active){active.disabled=false;active.textContent='Проверить статус'}
 }
}
$('orderReceipt').addEventListener('click',async event=>{
 if(!lastOrder)return;
 const tgConnect=event.target.closest('[data-tg-connect]');
 if(tgConnect){await customerTelegramConnect(tgConnect,'link');return}
 const tgCheck=event.target.closest('[data-tg-check]');
 if(tgCheck){await customerTelegramConnect(tgCheck,'info');return}
 const check=event.target.closest('[data-order-status]');
 if(check){await checkLastOrderStatus(check);return}
 if(event.target.closest('[data-order-forget]')){
  if(window.confirm('Удалить сведения о последней заявке из этого браузера?'))forgetLastOrder();
  return;
 }
 if(!event.target.closest('[data-order-copy]'))return;
 const message=receiptPlainText(lastOrder);
 let copied=false;
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);copied=true}}catch{}
 if(!copied){
  const field=document.createElement('textarea');
  field.value=message;field.setAttribute('readonly','');field.style.position='fixed';field.style.opacity='0';
  document.body.appendChild(field);field.select();
  try{copied=document.execCommand('copy')}catch{}
  field.remove();
 }
 notify(copied?'Состав заказа скопирован':'Не получилось скопировать. Сохраните заказ скриншотом.');
});
let focusBeforeCart=null;function openCart(){navigate('cart')}
function closeCart(){if(currentPage()==='cart'){navigate('catalog');return}$('overlay').hidden=true;$('drawer').classList.remove('open');$('drawer').setAttribute('aria-hidden','true');document.body.classList.remove('cart-open');const focusTarget=focusBeforeCart?.isConnected?focusBeforeCart:$('cartButton');focusTarget.focus()}
function syncAudienceButtons(){const current=$('audience').value;document.querySelectorAll('#catalogAudiences [data-audience]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.audience===current)))}
function selectAudience(value){if(!['all','men','women','unisex'].includes(value))return;$('audience').value=value;syncAudienceButtons();renderProducts()}
$('catalogAudiences').addEventListener('click',e=>{const b=e.target.closest('[data-audience]');if(b)selectAudience(b.dataset.audience)});
$('audience').addEventListener('change',()=>selectAudience($('audience').value));
$('search').addEventListener('input',renderProducts);$('family').addEventListener('change',renderProducts);$('sort').addEventListener('change',renderProducts);$('resetFilters').addEventListener('click',()=>{$('search').value='';$('family').value='all';$('audience').value='all';syncAudienceButtons();$('sort').value='default';favoritesOnly=false;updateFavoritesUI();renderProducts()});$('products').addEventListener('click',e=>{const favorite=e.target.closest('[data-favorite]');if(favorite){toggleFavorite(favorite.dataset.favorite);return}let b=e.target.closest('[data-add]');if(b){add(b.dataset.add,Number($('size-'+b.dataset.add).value));return}const detail=e.target.closest('[data-detail]');if(detail){e.preventDefault();navigate('fragrance/'+detail.dataset.detail);return}const share=e.target.closest('[data-share]');if(share){shareFragrance(share.dataset.share);return}const card=e.target.closest('.product[data-card-detail]');if(card&&!e.target.closest('button,select,option,input,textarea,label,a,[contenteditable]')){navigate('fragrance/'+card.dataset.cardDetail)}});$('favoritesFilter').addEventListener('click',()=>{favoritesOnly=!favoritesOnly;updateFavoritesUI();renderProducts()});updateFavoritesUI();$('addDiscovery').addEventListener('click',()=>add('discovery',0));$('cartButton').addEventListener('click',openCart);$('mobileCartBar').addEventListener('click',openCart);
const bottomNav=document.querySelector('.yad-bottom-nav');
const pages=['home','catalog','favorites','cart'];
function currentPage(){const p=location.pathname.split('/').filter(Boolean).join('/');return pages.includes(p)||(p.startsWith('fragrance/')&&fragrances.some(f=>f.id===p.slice(10)))?p:'home'}
function setBottomActive(id){bottomNav.querySelectorAll('[data-nav]').forEach(b=>{const active=b.dataset.nav===id;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')})}
function updateDetailPackaging(){
 const root=$('fragranceDetail'),chosen=root.querySelector('[data-detail-size][aria-pressed="true"]');if(!chosen)return;
 const ml=Number(chosen.dataset.detailSize),target=$('detailPackaging');
 // Only real packaging-related choice remains here: the 6/10 ml Travel variant.
 // The old visual description of the bottle has been removed from the product page.
 const choice=[6,10].includes(ml)?
  '<fieldset class="travel-choice"><legend>Вариант исполнения</legend>'+
  '<label><input type="radio" name="detailVariant" value="glass" checked> Стандартный флакон · без доплаты</label>'+
  '<label><input type="radio" name="detailVariant" value="travel"> Поворотный Travel · +90 ₽</label>'+
  '<label class="travel-color" hidden>Цвет <select id="detailTravelColor"><option>Чёрный</option><option>Белый мрамор</option><option>Серый мрамор</option></select></label>'+
  '</fieldset><small>Наличие цветов Travel подтверждается при обработке заказа.</small>':'';
 if(target)target.innerHTML=choice;
 const buttonPrice=root.querySelector('#detailButtonPrice');
 if(buttonPrice)buttonPrice.textContent=rub(prices[ml]);
}
function refreshDetailPrice(){
 const root=$('fragranceDetail'),size=root.querySelector('[data-detail-size][aria-pressed="true"]');
 if(!size)return;
 const ml=Number(size.dataset.detailSize),variant=root.querySelector('[name="detailVariant"]:checked')?.value||'glass';
 const total=itemPrice(ml,variant);
 const price=root.querySelector('#detailPrice'),button=root.querySelector('#detailButtonPrice');
 if(price)price.textContent=rub(total);
 if(button)button.textContent=rub(total);
}
function noteVisual(note){const n=note.toLowerCase();if(/цитрус|грейпфрут|нероли/.test(n))return '🍋';if(/чай/.test(n))return '🍃';if(/дерев|берёз|кедр/.test(n))return '🪵';if(/ванил/.test(n))return '🌼';if(/цвет|липов|ирис/.test(n))return '🌸';if(/ананас|фрукт/.test(n))return '🍍';if(/морск|соль/.test(n))return '🌊';if(/перец|спец|имбир/.test(n))return '🌶️';if(/амбр|амброкс/.test(n))return '✨';return '🌿'}
function renderFragranceDetail(id){
 const f=fragrances.find(x=>x.id===id);if(!f)return;
 const index=fragrances.indexOf(f)+1;
 const isFav=favorites.includes(id);
 const scene=`<img class="yad-detail-hero-photo" src="${yadProductImage(id,20).src}" alt="${yadMediaLabel(yadProductImage(id,20))} YAD ${safe(f.name)}, 20 мл" loading="eager" decoding="async" onerror="this.onerror=null;this.src=yadDigitalBottle('${id}',20)">${yadMockupLabel(id,20)}`;
 $('fragranceDetail').innerHTML=`<div class="detail-breadcrumb"><a href="/catalog" data-detail-back>← Коллекция ароматов</a><span>YAD / № ${String(index).padStart(2,'0')}</span></div><div class="detail-layout atelier-layout"><div class="detail-gallery atelier-gallery"><div class="atelier-photo-topline"><span>YAD / PERFUME ATELIER</span><span id="atelierGalleryCounter">03 / 06</span></div><div class="detail-visual atelier-stage" data-gallery-current="full">${scene}<span class="detail-image-status" id="detailImageStatus">${yadMediaLabel(yadProductImage(id,20))} · 20 мл</span></div><div class="atelier-mini-gallery" role="group" aria-label="Просмотр флаконов по объёму">${Object.keys(prices).map(ml=>`<button type="button" data-gallery-size="${ml}" aria-label="Посмотреть флакон ${ml} мл" aria-pressed="${ml==='20'}" class="${ml==='20'?'active':''}"><img src="${yadProductImage(id,Number(ml)).src}" alt="" loading="lazy" onerror="this.onerror=null;this.src=yadDigitalBottle('${id}',${Number(ml)})">${yadMockupLabel(id,Number(ml))}<span>${ml} мл</span></button>`).join('')}</div></div><div class="detail-copy atelier-copy"><div class="detail-intro"><div class="eyebrow">YAD / PERFUME ATELIER · № ${String(index).padStart(3,'0')}</div><h1>${safe(f.name)}</h1><div class="detail-profile"><span class="detail-audience" data-audience="${f.audience}">${audienceLabels[f.audience]}</span><span class="detail-family">${fragranceFamilyLabels[f.family]||"Ароматический"} характер</span></div><div class="detail-aroma-description"><span>ХАРАКТЕР АРОМАТА</span><p>${safe(aromaDescription(f))}</p></div><div class="detail-note-section"><h2>Ноты композиции</h2><div class="detail-note-grid">${f.notes.split(' · ').map((note,i)=>`<div class="detail-note-tile"><span class="detail-note-index" aria-hidden="true">${String(i+1).padStart(2,"0")}</span><strong>${safe(note)}</strong></div>`).join('')}</div></div></div><div class="detail-purchase atelier-purchase"><div class="detail-divider"></div><div class="atelier-selection-head"><div><span class="atelier-kicker">YAD / ВАШ ФОРМАТ</span><div class="detail-label">Выберите объём</div></div><span class="atelier-current-volume" id="atelierCurrentVolume" aria-live="polite">20 мл</span></div><div class="detail-sizes atelier-volume-rail" role="group" aria-label="Выбор объёма">${Object.entries(prices).map(([ml,p])=>`<button type="button" data-detail-size="${ml}" aria-pressed="${ml==='20'}"><strong>${ml} мл</strong><small>${rub(p)}</small></button>`).join('')}</div><div class="atelier-format-caption">Изображение и стоимость обновятся при выборе объёма.</div><div class="detail-packaging" id="detailPackaging" aria-live="polite"></div><div class="detail-total"><span>Стоимость аромата</span><strong id="detailPrice" aria-live="polite">${rub(prices[20])}</strong></div><button type="button" id="detailAdd" class="detail-add">Добавить в корзину · <span id="detailButtonPrice">${rub(prices[20])}</span></button><div class="detail-secondary-actions"><button type="button" id="detailFavorite" class="detail-favorite" aria-pressed="${isFav}">${isFav?'♥ В избранном':'♡ Добавить в избранное'}</button><button type="button" id="detailShare" class="detail-share">↗ Поделиться ароматом</button></div><p class="detail-footnote">Парфюмерная интерпретация. Описание нот носит ознакомительный характер.</p></div></div></div><div class="detail-benefits detail-benefits-wide"><span>✧ 30% эссенции</span><span>◈ Подарочная упаковка</span><span>◇ Доставка по России</span></div>`;
 $('fragranceDetail').dataset.fragrance=id;updateDetailPackaging();
}
$('fragranceDetail').addEventListener('change',e=>{if(e.target.name==='detailVariant'||e.target.id==='detailTravelColor'){const variant=$('fragranceDetail').querySelector('[name="detailVariant"]:checked')?.value||'glass';const ml=Number($('fragranceDetail').querySelector('[data-detail-size][aria-pressed="true"]').dataset.detailSize);const color=$('fragranceDetail').querySelector('.travel-color');if(color)color.hidden=variant!=='travel';$('detailPrice').textContent=rub(itemPrice(ml,variant));const bp=$('detailButtonPrice');if(bp)bp.textContent=rub(itemPrice(ml,variant));}});
$('fragranceDetail').addEventListener('click',e=>{
 const gallery=e.target.closest('[data-gallery-size]');if(gallery){const size=$('fragranceDetail').querySelector('[data-detail-size="'+gallery.dataset.gallerySize+'"]');if(size)size.click();return}const back=e.target.closest('[data-detail-back]');if(back){e.preventDefault();navigate('catalog');return}
 const size=e.target.closest('[data-detail-size]');if(size){$('fragranceDetail').querySelectorAll('[data-detail-size]').forEach(b=>b.setAttribute('aria-pressed',String(b===size)));$('detailPrice').textContent=rub(prices[Number(size.dataset.detailSize)]);updateDetailPackaging();updateDetailImage($('fragranceDetail').dataset.fragrance,Number(size.dataset.detailSize));const cv=$('atelierCurrentVolume');if(cv)cv.textContent=size.dataset.detailSize+' мл';const counter=$('atelierGalleryCounter');if(counter)counter.textContent=String(Object.keys(prices).indexOf(size.dataset.detailSize)+1).padStart(2,'0')+' / 06';refreshDetailPrice();$('fragranceDetail').querySelectorAll('[data-gallery-size]').forEach(b=>{const selected=b.dataset.gallerySize===size.dataset.detailSize;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))});return}
 const id=$('fragranceDetail').dataset.fragrance;
 if(e.target.closest('#detailAdd')){const ml=Number($('fragranceDetail').querySelector('[data-detail-size][aria-pressed="true"]').dataset.detailSize);const variant=$('fragranceDetail').querySelector('[name="detailVariant"]:checked')?.value||'glass';const color=$('detailTravelColor')?.value||'Чёрный';add(id,ml,variant,color);return}
 if(e.target.closest('#detailFavorite')){toggleFavorite(id);const button=$('detailFavorite');const saved=favorites.includes(id);if(button){button.setAttribute('aria-pressed',String(saved));button.textContent=saved?'♥ В избранном':'♡ Добавить в избранное'}return}
 if(e.target.closest('#detailShare')){shareFragrance(id);return}
});


function renderMarketHome(){
 const featured=['imagination','tygar','kirke','aventus'].map(id=>fragrances.find(f=>f.id===id));
 $('marketFeatured').innerHTML=featured.map(f=>`<article class="market-card"><a href="/fragrance/${f.id}" data-market-detail="${f.id}" class="market-card-photo scene-${f.family}" style="--glow:${f.glow}" aria-label="Открыть ${safe(f.name)}">${photoMarkup(100,f.id)}<div class="market-mini-bottle"><span>YAD</span><small>${safe(f.name)}</small></div></a><div class="market-card-copy"><span>${audienceLabels[f.audience]} · ${safe(f.notes)}</span><a href="/fragrance/${f.id}" data-market-detail="${f.id}">${safe(f.name)}</a><div class="market-card-bottom"><strong>от ${rub(prices[6])}</strong><button type="button" data-market-add="${f.id}" aria-label="Выбрать объём ${safe(f.name)}">→</button></div></div></article>`).join('');
}
function marketCatalog(family='all',focus=false,audience='all'){
 navigate('catalog');$('family').value=family;$('audience').value=audience;syncAudienceButtons();$('search').value='';renderProducts();
 if(focus)$('search').focus();
}
$('marketSearch').addEventListener('click',()=>marketCatalog('all',true));
$('marketExplore').addEventListener('click',()=>marketCatalog());
$('marketAll').addEventListener('click',()=>marketCatalog());
document.querySelector('.market-categories').addEventListener('click',e=>{const b=e.target.closest('[data-market-family]');if(b)marketCatalog(b.dataset.marketFamily)});
document.querySelector('.market-audiences').addEventListener('click',e=>{const b=e.target.closest('[data-market-audience]');if(b)marketCatalog('all',false,b.dataset.marketAudience)});
// Editorial homepage routes: keep the mobile catalogue, product detail and checkout unchanged.
document.addEventListener('click',e=>{
 const goCatalog=e.target.closest('[data-editorial-catalog]');
 if(goCatalog){e.preventDefault();marketCatalog();return}
 const jump=e.target.closest('[data-editorial-anchor]');
 if(jump){
  const id=jump.dataset.editorialAnchor;
  if(!['home-formats','home-steps'].includes(id))return;
  e.preventDefault();
  if(currentPage()!=='home')navigate('home');
  requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({
   behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',
   block:'start'
  }));
 }
});
$('marketFeatured').addEventListener('click',e=>{
 const addButton=e.target.closest('[data-market-add]');if(addButton){navigate('fragrance/'+addButton.dataset.marketAdd);return}
 const link=e.target.closest('[data-market-detail]');if(link){e.preventDefault();navigate('fragrance/'+link.dataset.marketDetail)}
});
renderMarketHome();

function renderPage(){
 const page=currentPage();document.body.dataset.page=page;
 const isDetail=page.startsWith('fragrance/');const catalogPage=page==='catalog'||page==='favorites';
 document.querySelectorAll('main > *').forEach(el=>{el.hidden=isDetail?el.id!=='fragranceDetail':catalogPage?el.id!=='catalog':page==='home'?el.id!=='marketHome':true});
 $('catalog').hidden=!catalogPage;if(isDetail)renderFragranceDetail(page.split('/')[1]);
 if(page==='favorites'){favoritesOnly=true;$('search').value='';$('family').value='all';$('audience').value='all';syncAudienceButtons()}
 else if(page==='catalog'){favoritesOnly=false}
 updateFavoritesUI();renderProducts();
 const isCart=page==='cart';
 $('overlay').hidden=true;$('drawer').classList.toggle('open',isCart);$('drawer').setAttribute('aria-hidden',String(!isCart));
 document.body.classList.toggle('cart-open',isCart);
 setBottomActive(isDetail?'catalog':page);
 document.title=(page==='home'?'YAD — Ароматы с характером':page==='catalog'?'Каталог ароматов — YAD':page==='favorites'?'Избранное — YAD':isDetail?fragrances.find(f=>f.id===page.split('/')[1]).name+' — YAD':'Корзина — YAD');
 window.scrollTo({top:0,behavior:'instant'});
}
function navigate(page){const next=pages.includes(page)||(page.startsWith('fragrance/')&&fragrances.some(f=>f.id===page.slice(10)))?page:'home';const path=next==='home'?'/':'/'+next;if(location.pathname!==path)history.pushState({page:next},'',path);renderPage()}
bottomNav.addEventListener('click',e=>{const button=e.target.closest('[data-nav]');if(button)navigate(button.dataset.nav)});
window.addEventListener('popstate',renderPage);
document.addEventListener('click',e=>{const link=e.target.closest('a[href^="#"]');if(!link)return;const href=link.getAttribute('href');if(href==='#catalog'||href==='#discovery'||href==='#philosophy'||href==='#questions'||href==='#top'){e.preventDefault();const page=href==='#catalog'?'catalog':'home';navigate(page);if(page==='home'&&href!=='#top')requestAnimationFrame(()=>document.querySelector(href)?.scrollIntoView({behavior:'smooth'}))}});
$('continueShopping').addEventListener('click',()=>navigate('catalog'));$('clearCart').addEventListener('click',()=>{if(!cart.length)return;if(!window.confirm('Удалить все товары из корзины?'))return;cart=[];persist();$('status').textContent='Корзина очищена.';notify('Корзина очищена')});$('closeCart').addEventListener('click',closeCart);$('overlay').addEventListener('click',closeCart);document.addEventListener('keydown',e=>{if(!$('drawer').classList.contains('open')||currentPage()==='cart')return;if(e.key==='Escape'){e.preventDefault();closeCart();return}if(e.key==='Tab'){const nodes=[...$('drawer').querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});$('cartItems').addEventListener('click',e=>{let b=e.target.closest('[data-remove],[data-increase]');if(!b)return;let i=Number(b.dataset.remove??b.dataset.increase);if(!cart[i])return;if(b.hasAttribute('data-increase')){if(cart[i].qty>=30){notify('Для одного товара максимум 30 штук.');return}cart[i].qty+=1}else{cart[i].qty--;if(!cart[i].qty)cart.splice(i,1)}persist()});
function buildOrder(){if(!cart.length){$('status').textContent='Добавьте товары в корзину.';return null}const name=$('customerName').value.trim(),phone=$('customerPhone').value.trim(),address=$('customerAddress').value.trim(),comment=$('customerComment').value.trim(),delivery=document.querySelector('input[name="deliveryService"]:checked')?.value;if(!['Wildberries','Ozon'].includes(delivery)){$('status').textContent='Выберите службу доставки.';return null}if(!name||!phone||!address){const missing=!name?'customerName':!phone?'customerPhone':'customerAddress';$('status').textContent='Укажите имя, телефон и адрес доставки.';$(missing).focus();return null}if(name.length>100||address.length>350||comment.length>500){$('status').textContent='Сократите имя, адрес или комментарий.';return null}const digits=phone.replace(/\D/g,'');if(digits.length<10||digits.length>15){$('status').textContent='Проверьте номер телефона: нужно от 10 до 15 цифр.';$('customerPhone').focus();return null}$('status').textContent='';return ['Здравствуйте! Хочу оформить заказ YAD.','','Покупатель: '+name,'Телефон: '+phone,'Способ доставки: '+delivery,'Пункт выдачи: '+address,...(comment?['Комментарий: '+comment]:[]),'','Состав заказа:',...cart.map((x,i)=>`${i+1}. ${x.title} — ${x.id==='discovery'?'набор 3 × 6 мл (ароматы согласовать)':x.ml+' мл · '+packagingName(x)} × ${x.qty} = ${rub(x.price*x.qty)}`),'','Товары: '+rub(cart.reduce((s,x)=>s+x.qty*x.price,0)),'Доставка ('+delivery+'): '+rub(deliveryFee),'Итого с доставкой: '+rub(cart.reduce((s,x)=>s+x.qty*x.price,0)+deliveryFee),'','Пожалуйста, подтвердите наличие и способ оплаты.'].join('\n')}
const contactMethods=[...document.querySelectorAll('input[name="contactMethod"]')];
function updatePreferredContact(){const method=document.querySelector('input[name="contactMethod"]:checked')?.value;const label=$('telegramContactLabel');label.hidden=method!=='telegram';$('preferredContact').required=method==='telegram';}
contactMethods.forEach(input=>input.addEventListener('change',updatePreferredContact));updatePreferredContact();
// Keep the order overview available, but avoid pushing contact fields below the fold
// on phones. Desktop retains the expanded review.
if(window.matchMedia('(max-width:760px)').matches)$('checkoutReview').open=false;
$('submitSiteOrder').addEventListener('click',async()=>{
 const button=$('submitSiteOrder'),status=$('siteOrderStatus');status.textContent='';status.className='checkout-status';
 if(!buildOrder())return;
 const method=document.querySelector('input[name="contactMethod"]:checked')?.value;
 const contact=method==='whatsapp'?$('customerPhone').value.trim():$('preferredContact').value.trim();
 if(method==='telegram'&&!/^@[A-Za-z0-9_]{5,32}$/.test(contact)){status.textContent='Укажите Telegram в формате @username.';$('preferredContact').focus();return}
 const body={name:$('customerName').value.trim(),contact,method,address:$('customerAddress').value.trim(),delivery:document.querySelector('input[name="deliveryService"]:checked')?.value,comment:$('customerComment').value.trim(),items:cart.map(x=>({id:x.id,ml:x.ml,qty:x.qty,variant:x.variant||'glass',color:x.variant==='travel'?x.color:undefined}))};
 button.disabled=true;button.textContent='Оформляем заказ…';status.textContent='Сохраняем заявку…';
 try{
  const response=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'Не удалось оформить заказ.');
  const publicNumber=String(result.order_id||'').slice(0,8).toUpperCase();
  lastOrder={
   number:publicNumber,method,delivery:body.delivery,
   total:Number.isFinite(Number(result.total))?Number(result.total):cart.reduce((sum,x)=>sum+x.qty*x.price,0)+deliveryFee,
   items:cart.map(x=>({name:x.title,description:orderProductLine(x),qty:x.qty,price:x.qty*x.price})),
   statusToken:typeof result.status_token==='string'&&result.status_token.length<=160?result.status_token:null,
   status:'new',checkedAt:null,savedAt:Date.now()
  };
  saveLastOrder();
  status.classList.add('success');
  status.textContent='Заявка №'+publicNumber+' отправлена.';
  cart=[];persist();notify('Заказ оформлен');
  $('orderReceipt')?.scrollIntoView({block:'start',behavior:'smooth'});
 }catch(error){status.classList.add('error');status.textContent=(error.message||'Не удалось оформить заказ.')+' Попробуйте ещё раз чуть позже.'}
 finally{button.disabled=false;syncCheckoutAction()}
});
async function shareFragrance(id){const item=fragrances.find(f=>f.id===id);if(!item)return;const url=new URL('/catalog',window.location.origin);url.searchParams.set('aroma',id);const payload={title:'YAD — '+item.name,text:item.name+' · '+item.notes,url:url.toString()};try{if(navigator.share){await navigator.share(payload);return}}catch(error){if(error&&error.name==='AbortError')return}try{await navigator.clipboard.writeText(payload.url);notify('Ссылка на аромат скопирована')}catch{const field=document.createElement('textarea');field.value=payload.url;field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();const copied=document.execCommand('copy');field.remove();notify(copied?'Ссылка на аромат скопирована':'Не удалось скопировать ссылку')}}
function openLinkedFragrance(){const id=new URLSearchParams(window.location.search).get('aroma');const item=fragrances.find(f=>f.id===id);if(!item)return;if(currentPage()!=='catalog')navigate('catalog');$('search').value='';$('family').value='all';$('audience').value='all';syncAudienceButtons();$('sort').value='default';syncMood();renderProducts();const index=fragrances.findIndex(f=>f.id===id);catalogVisibleLimit=Math.max(catalogVisibleLimit,Math.ceil((index+1)/catalogPageSize)*catalogPageSize);renderProducts();const card=[...document.querySelectorAll('.product[data-card-detail]')].find(el=>el.dataset.cardDetail===id);if(!card)return;card.classList.add('linked-product');requestAnimationFrame(()=>card.scrollIntoView({behavior:'auto',block:'center'}))}
const moodLabels={fresh:'Свежесть и свобода',woody:'Спокойная уверенность',floral:'Мягкость и нежность',intense:'Яркое впечатление'};function syncMood(){const selected=$('family').value;document.querySelectorAll('[data-mood]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mood===selected)));$('moodHint').textContent=moodLabels[selected]?'Подобраны ароматы направления «'+moodLabels[selected]+'». Это ориентир по нотам, а не индивидуальная рекомендация.':'Выберите настроение — покажем подходящее направление коллекции.'}document.querySelectorAll('[data-mood]').forEach(button=>button.addEventListener('click',()=>{$('search').value='';$('family').value=$('family').value===button.dataset.mood?'all':button.dataset.mood;syncMood();renderProducts();$('products').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}));$('family').addEventListener('change',syncMood);$('resetFilters').addEventListener('click',syncMood);syncMood();
$('search').addEventListener('keydown',e=>{if(e.key==='Escape'&&$('search').value){$('search').value='';renderProducts()}});// Personal contact details stay in the current page only, not persistent browser storage.
try{localStorage.removeItem('yad-customer-v1')}catch{};
syncAudienceButtons();renderProducts();renderCart();renderPage();openLinkedFragrance();