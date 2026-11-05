'use strict';
(function(){
 const byId=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let currentId='', currentPage=0, currentSort='recent', photoData=[], selectedRating=5, manualOrder=false, loadSeq=0;
 const localOrderFor=id=>{
  if(typeof orderHistory==='undefined'||!Array.isArray(orderHistory)||typeof fragrances==='undefined')return null;
  const f=fragrances.find(x=>x.id===id);if(!f)return null;
  return orderHistory.find(o=>o.statusToken&&Array.isArray(o.items)&&o.items.some(x=>String(x.name||'').toLowerCase().includes(f.name.toLowerCase())))||null;
 };
 const titleFor=id=>typeof fragrances==='undefined'?'аромат':fragrances.find(x=>x.id===id)?.name||'аромат';
 const root=()=>byId('yadReviewsRoot');
 function stars(n){return '<span aria-label="'+Number(n)+' из 5 звёзд" class="yr-stars">'+('★'.repeat(Math.max(0,Math.min(5,Number(n)||0))))+'<span>'+('☆'.repeat(Math.max(0,5-(Number(n)||0))))+'</span></span>'}
 function card(r){
  const date=new Date(r.created_at).toLocaleDateString('ru-RU',{year:'numeric',month:'long',day:'numeric'});
  let photos='';
  for(let i=0;i<Math.min(3,Number(r.photo_count)||0);i++){
   const src='/api/review-image?id='+encodeURIComponent(r.id)+'&n='+i;
   photos+='<button type="button" data-yr-photo="'+esc(src)+'" aria-label="Посмотреть фотографию покупателя"><img src="'+esc(src)+'" alt="Фото покупателя" loading="lazy"></button>';
  }
  return '<article class="yr-card"><div class="yr-card-top"><div><strong>'+esc(r.author_name)+'</strong><span class="yr-verified">✓ Покупка подтверждена</span></div><time>'+esc(date)+'</time></div>'+stars(r.rating)+'<p>'+esc(r.body)+'</p>'+(photos?'<div class="yr-photos">'+photos+'</div>':'')+'</article>';
 }
 function makeSkeleton(id){
  const el=root();if(!el)return;
  el.dataset.reviewFor=id;
  el.innerHTML='<div class="yr-title"><div><span class="yr-overline">YAD / МНЕНИЯ ПОКУПАТЕЛЕЙ</span><h2>Отзывы об аромате</h2><p>Настоящие впечатления после покупки</p></div><div class="yr-rating" id="yrRating" aria-live="polite">—</div></div><div class="yr-toolbar"><button type="button" class="yr-write" data-yr-open>Написать отзыв <span>↗</span></button><label>Сортировка <select id="yrSort" aria-label="Сортировка отзывов"><option value="recent">Сначала новые</option><option value="high">Высокая оценка</option><option value="photos">С фотографиями</option></select></label></div><div id="yrItems" class="yr-items" aria-live="polite"><p class="yr-muted">Загружаем отзывы…</p></div><button type="button" class="yr-more" id="yrMore" hidden>Показать ещё отзывы</button>';
 }
 async function fetchReviews(append){
  const el=root();if(!el||el.dataset.reviewFor!==currentId)return;
  const seq=++loadSeq,page=append?currentPage+1:0, id=currentId, sort=currentSort;
  const more=byId('yrMore');if(more)more.disabled=true;
  try{
   const response=await fetch('/api/reviews?fragrance='+encodeURIComponent(id)+'&page='+page+'&sort='+encodeURIComponent(sort),{credentials:'same-origin'});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||'Не удалось загрузить отзывы.');
   if(seq!==loadSeq||root()!==el||el.dataset.reviewFor!==id)return;
   currentPage=page;
   const rating=byId('yrRating');
   if(rating)rating.innerHTML=Number(data.count)>0?'<strong>'+Number(data.average).toFixed(1)+'</strong>'+stars(Math.round(Number(data.average)))+'<small>'+Number(data.count)+' '+(Number(data.count)===1?'отзывов':'отзывов')+'</small>':'<strong>—</strong><small>Пока без оценок</small>';
   const holder=byId('yrItems');
   if(holder){const html=(Array.isArray(data.reviews)?data.reviews:[]).map(card).join('');
    if(append)holder.insertAdjacentHTML('beforeend',html);
    else holder.innerHTML=html||'<div class="yr-empty"><strong>Здесь пока нет отзывов.</strong><p>Первыми поделитесь впечатлением о '+esc(titleFor(id))+' после покупки.</p></div>';
   }
   if(more){more.hidden=(page+1)*6>=Number(data.count);more.disabled=false}
  }catch(e){
   if(seq!==loadSeq||root()!==el)return;
   const holder=byId('yrItems');if(holder&&!append)holder.innerHTML='<p class="yr-muted">'+esc(e.message)+'</p>';
   if(more){more.hidden=true;more.disabled=false}
  }
 }
 function load(id){
  if(!root()||!id)return;
  currentId=id;currentPage=0;currentSort='recent';
  makeSkeleton(id);fetchReviews(false);
 }
 window.YadReviews={load};
 function dialog(){
  let d=byId('yadReviewDialog');if(d)return d;
  d=document.createElement('dialog');d.id='yadReviewDialog';d.className='yr-dialog';
  d.innerHTML='<form id="yrForm"><div class="yr-dialog-heading"><div><span class="yr-overline">YAD / ВАШ ОПЫТ</span><h2>Поделитесь впечатлением</h2><p id="yrProductName"></p></div><button type="button" class="yr-close" data-yr-close aria-label="Закрыть">×</button></div><label class="yr-field">Ваше имя или ник<input id="yrName" name="name" autocomplete="name" minlength="2" maxlength="60" required placeholder="Как вас представить"></label><fieldset class="yr-rate"><legend>Ваша оценка</legend><div id="yrStarSelect" role="group" aria-label="Оценка аромата"><button type="button" data-yr-rate="1" aria-label="1 звезда">★</button><button type="button" data-yr-rate="2" aria-label="2 звезды">★</button><button type="button" data-yr-rate="3" aria-label="3 звезды">★</button><button type="button" data-yr-rate="4" aria-label="4 звезды">★</button><button type="button" data-yr-rate="5" aria-label="5 звёзд">★</button></div></fieldset><label class="yr-field">Ваш отзыв<textarea id="yrText" name="text" minlength="10" maxlength="1500" required rows="5" placeholder="Как раскрывается аромат, насколько он стойкий и какие впечатления оставил?"></textarea></label><div class="yr-field"><label for="yrPhotos">Фотографии (необязательно, до 3)</label><input type="file" id="yrPhotos" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*" multiple><div id="yrPreviews" class="yr-previews"></div><small>Фотографии автоматически уменьшаются перед отправкой.</small></div><div class="yr-proof" id="yrProof"></div><p class="yr-consent">Публикуя отзыв, вы соглашаетесь с отображением указанных имени, текста и фотографий на сайте YAD. Отзыв появится после проверки.</p><p id="yrError" class="yr-form-error" role="status" aria-live="polite"></p><button class="yr-submit" type="submit" id="yrSubmit">Отправить отзыв</button></form>';
  document.body.appendChild(d);return d;
 }
 function updateStars(){
  dialog().querySelectorAll('[data-yr-rate]').forEach(b=>{const active=Number(b.dataset.yrRate)<=selectedRating;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(Number(b.dataset.yrRate)===selectedRating))});
 }
 function updateProof(){
  const found=localOrderFor(currentId),proof=byId('yrProof');
  const using=!!found&&!manualOrder;
  proof.innerHTML=using?'<p class="yr-proof-ok">✓ Нашли ваш заказ №'+esc(found.number)+'. Покупку проверим автоматически.</p><button type="button" class="yr-switch" data-yr-manual>Указать другой заказ</button>':
   '<p>Чтобы подтвердить покупку, укажите номер заказа из 8 символов и телефон или Telegram, указанный при оформлении.</p><div class="yr-manual-grid"><label class="yr-field">Номер заказа<input id="yrOrderCode" maxlength="8" minlength="8" required placeholder="Например, A1B2C3D4" autocomplete="off"></label><label class="yr-field">Контакт из заказа<input id="yrOrderContact" maxlength="150" required placeholder="Телефон или @username" autocomplete="off"></label></div>'+(found?'<button type="button" class="yr-switch" data-yr-auto>Использовать сохранённый заказ</button>':'');
 }
 function openForm(){
  if(!currentId)return;
  const d=dialog();d.querySelector('form').reset();
  byId('yrProductName').textContent=titleFor(currentId);
  byId('yrError').textContent='';byId('yrPreviews').innerHTML='';
  photoData=[];selectedRating=5;manualOrder=false;
  updateStars();updateProof();
  if(!d.open)d.showModal();
  byId('yrName').focus();
 }
 function closeForm(){const d=byId('yadReviewDialog');if(d?.open)d.close()}
 async function shrinkPhoto(file){
  if(file.size>12*1024*1024)throw Error('Каждое исходное фото должно быть меньше 12 МБ.');
  const url=URL.createObjectURL(file);
  try{
   const img=new Image();img.src=url;
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Не получилось прочитать фотографию.'))});
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
   if(!ctx)throw Error('Сжатие фотографий недоступно.');
   const maxSide=Math.max(img.naturalWidth,img.naturalHeight);
   for(const side of [1000,850,700,560]){
    const scale=Math.min(1,side/maxSide);
    canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    for(const quality of [0.8,0.68,0.55]){
     const jpeg=canvas.toDataURL('image/jpeg',quality);
     if(jpeg.startsWith('data:image/jpeg;base64,')&&jpeg.length<=170000)return jpeg;
    }
   }
   throw Error('Фотография слишком большая. Выберите другое изображение.');
  }finally{URL.revokeObjectURL(url)}
 }
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-yr-open]')){openForm();return}
  if(e.target.closest('[data-yr-close]')){closeForm();return}
  if(e.target.closest('[data-yr-manual]')){manualOrder=true;updateProof();return}
  if(e.target.closest('[data-yr-auto]')){manualOrder=false;updateProof();return}
  const rate=e.target.closest('[data-yr-rate]');if(rate){selectedRating=Number(rate.dataset.yrRate);updateStars();return}
  if(e.target.id==='yrMore'){fetchReviews(true);return}
  const image=e.target.closest('[data-yr-photo]');if(image){
   const src=image.dataset.yrPhoto;
   const d=document.createElement('dialog');d.className='yr-lightbox';d.innerHTML='<button type="button" aria-label="Закрыть изображение">×</button><img src="'+esc(src)+'" alt="Фото покупателя">';
   document.body.append(d);d.addEventListener('click',()=>d.close());d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();
  }
 });
 document.addEventListener('change',async e=>{
  if(e.target.id==='yrSort'){currentSort=e.target.value;currentPage=0;fetchReviews(false);return}
  if(e.target.id!=='yrPhotos')return;
  const files=Array.from(e.target.files||[]);
  if(files.length>3){byId('yrError').textContent='Можно приложить максимум 3 фотографии.';e.target.value='';return}
  const previews=byId('yrPreviews'),error=byId('yrError');
  previews.textContent='Обрабатываем фото…';error.textContent='';photoData=[];
  try{
   for(const file of files)photoData.push(await shrinkPhoto(file));
   previews.innerHTML=photoData.map(p=>'<img src="'+p+'" alt="Выбранная фотография">').join('');
  }catch(err){photoData=[];previews.innerHTML='';e.target.value='';error.textContent=err.message}
 });
 document.addEventListener('submit',async e=>{
  if(e.target.id!=='yrForm')return;
  e.preventDefault();
  const button=byId('yrSubmit'),error=byId('yrError');
  const found=localOrderFor(currentId);
  const body={fragrance:currentId,name:byId('yrName').value.trim(),rating:selectedRating,
   text:byId('yrText').value.trim(),photos:photoData};
  if(found&&!manualOrder)body.order_token=found.statusToken;
  else {body.order_code=byId('yrOrderCode')?.value.trim();body.contact=byId('yrOrderContact')?.value.trim();}
  button.disabled=true;button.textContent='Отправляем…';error.textContent='';
  try{
   const response=await fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||'Не удалось отправить отзыв.');
   closeForm();const el=root();if(el&&el.dataset.reviewFor===currentId){const note=document.createElement('p');note.className='yr-success';note.textContent='Спасибо! Отзыв отправлен на проверку.';el.querySelector('.yr-toolbar')?.after(note)}
  }catch(err){error.textContent=err.message}
  finally{button.disabled=false;button.textContent='Отправить отзыв'}
 });
 if(document.body.dataset.page?.startsWith('fragrance/')&&root()?.dataset.reviewFor!==byId('fragranceDetail')?.dataset.fragrance)
  load(byId('fragranceDetail')?.dataset.fragrance);
})();
