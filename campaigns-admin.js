(function(){
 'use strict';
 const dashboard=document.getElementById('dashboard');
 if(!dashboard)return;
 const panel=document.createElement('section');
 panel.id='yadPromoStudio';
 panel.className='yad-promo-studio';
 panel.innerHTML='<div class="yad-promo-heading"><div><span>YAD / CAMPAIGNS</span><h2>Студия акций</h2><p>Подготовка предложений для Telegram-канала и будущей email-рассылки.</p></div><span class="yad-promo-status-label">Только черновики</span></div><div class="yad-promo-layout"><form id="yadPromoForm"><label>Название кампании<input id="yadPromoTitle" maxlength="110" placeholder="Например, подарочный набор YAD" required></label><label>Сообщение покупателю<textarea id="yadPromoBody" rows="5" maxlength="1500" placeholder="Подарочный набор, новая коллекция, сезонная акция…" required></textarea></label><label>Ссылка на предложение<input id="yadPromoUrl" type="url" maxlength="300" placeholder="https://yad-market.vercel.app/gift-set"></label><div class="yad-promo-actions"><button type="button" id="yadPromoExample">Пример подарочного набора</button><button type="submit" class="yad-promo-primary" id="yadPromoSave">Сохранить черновик</button><button type="button" id="yadPromoNew">Новый</button><button type="button" id="yadPromoCopy">Скопировать текст</button></div><p id="yadPromoNotice" role="status" aria-live="polite"></p></form><div class="yad-promo-preview"><span>ПРЕДПРОСМОТР СООБЩЕНИЯ</span><h3 id="yadPromoPreviewTitle">Ваше предложение</h3><p id="yadPromoPreviewText">Текст акции появится здесь при заполнении.</p><p id="yadPromoPreviewUrl"></p><div class="yad-promo-drafts"><div class="yad-promo-drafts-heading">Общие черновики <small>синхронизируются между устройствами</small></div><div id="yadPromoDraftList"></div><div class="yad-promo-pager"><button type="button" id="yadPromoPrev">← Назад</button><span id="yadPromoPage">1</span><button type="button" id="yadPromoNext">Вперёд →</button></div><button type="button" id="yadPromoImport" hidden>Перенести старые черновики из этого браузера</button></div></div></div><p class="yad-promo-footnote">Это только черновики: рассылка подписчикам не активна. Тексты сохраняются в базе YAD, но не содержат контакты покупателей. Публикация в Telegram выполняется вручную.</p>';
 const css=document.createElement('style');
 css.textContent='.yad-promo-studio{background:#1b201d;border:1px solid #41483e;border-radius:8px;padding:24px;margin:24px 0;color:#eee8dc}.yad-promo-heading{display:flex;gap:14px;justify-content:space-between;align-items:center;margin-bottom:24px}.yad-promo-heading span{font-size:10px;letter-spacing:.19em;color:#c5ac89}.yad-promo-heading h2{font:400 26px Georgia,serif;margin:8px 0 6px}.yad-promo-heading p{font-size:12px;color:#b8b3a8;margin:0}.yad-promo-status-label{white-space:nowrap;border:1px solid #655a48;border-radius:3px;padding:9px 12px}.yad-promo-layout{display:grid;grid-template-columns:1fr 1fr;gap:22px}.yad-promo-layout label{font-size:12px;color:#c5bcae;display:flex;flex-direction:column;gap:7px;margin-bottom:14px}.yad-promo-layout input,.yad-promo-layout textarea{box-sizing:border-box;background:#111714;color:#eee8dc;border:1px solid #4c514b;border-radius:4px;padding:13px;font-size:13px;line-height:1.5;font-family:inherit;width:100%;resize:vertical}.yad-promo-layout input:focus-visible,.yad-promo-layout textarea:focus-visible{outline:2px solid #d9c39b}.yad-promo-actions{display:flex;gap:8px;flex-wrap:wrap}.yad-promo-actions button{background:#343b35;color:#f1eee7;border:1px solid #5c6159;border-radius:4px;padding:10px 12px;cursor:pointer;font-size:12px}.yad-promo-actions .yad-promo-primary{background:#dfd0b7;color:#222622;border-color:#dfd0b7}.yad-promo-preview{padding:20px;background:#f6f2e9;color:#302f29;border-radius:4px;min-width:0}.yad-promo-preview>span{letter-spacing:.18em;color:#8b7f68;font-size:10px}.yad-promo-preview h3{font:400 25px Georgia,serif;margin:14px 0}.yad-promo-preview p{font-size:13px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;color:#5e584c}.yad-promo-drafts{border-top:1px solid #ded9cb;margin-top:18px;padding-top:16px}.yad-promo-drafts-heading{display:flex;justify-content:space-between;gap:10px;margin-bottom:10px;font-size:13px;font-weight:600}.yad-promo-drafts small{font-weight:400;color:#8d887b;font-size:10px}.yad-promo-draft{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid #e2ddcf}.yad-promo-draft button{border:0;background:transparent;color:#493e31;text-decoration:underline;font-size:11px;cursor:pointer}.yad-promo-draft>span{font-size:12px;min-width:0;overflow-wrap:anywhere}.yad-promo-draft>div{flex-shrink:0}.yad-promo-footnote{color:#aaa89d;font-size:11px;line-height:1.65;margin:18px 0 0}#yadPromoNotice{font-size:12px;color:#dec19b;min-height:17px}@media(max-width:760px){.yad-promo-layout{grid-template-columns:1fr}.yad-promo-studio{padding:14px}.yad-promo-heading{align-items:flex-start;flex-wrap:wrap}.yad-promo-preview h3{font-size:22px}}';
 css.textContent+='.yad-promo-pager{display:flex;gap:9px;align-items:center;justify-content:center;margin:15px 0}.yad-promo-pager button,#yadPromoImport{font-size:11px;padding:9px 11px;border-radius:4px;background:transparent;color:#64543e;border:1px solid #c2b7a7;cursor:pointer}.yad-promo-pager button:disabled{opacity:.32;cursor:default}#yadPromoImport{width:100%;background:#e9dfcc}.yad-promo-draft>div{display:flex;gap:12px}.yad-promo-draft button:focus-visible{outline:2px solid #967957;outline-offset:3px}.yad-promo-selected{font-weight:650}.yad-promo-pager span{font-size:12px;color:#857665}';
 document.head.appendChild(css);
 const anchor=dashboard.querySelector('.toolbar');
 if(anchor)anchor.before(panel);else dashboard.append(panel);
 const $=id=>document.getElementById(id);
 const key='yad-promo-studio-local-v1';
 let drafts=[],page=0,hasMore=false,selected=null,loading=false;
 let localDrafts=[];
 try{
  const saved=JSON.parse(localStorage.getItem(key)||'[]');
  if(Array.isArray(saved))localDrafts=saved.filter(x=>typeof x?.title==='string'&&typeof x?.body==='string'&&typeof x?.url==='string').slice(0,12);
 }catch{}
 const read=()=>({title:$('yadPromoTitle').value.trim(),body:$('yadPromoBody').value.trim(),url:$('yadPromoUrl').value.trim()});
 const compose=x=>[x.title,x.body,x.url||x.target_url].filter(Boolean).join('\n\n');
 const message=x=>{$('yadPromoNotice').textContent=x};
 const saveButton=$('yadPromoSave');
 function update(){
  const d=read();
  $('yadPromoPreviewTitle').textContent=d.title||'Ваше предложение';
  $('yadPromoPreviewText').textContent=d.body||'Текст акции появится здесь при заполнении.';
  $('yadPromoPreviewUrl').textContent=d.url||'';
  saveButton.textContent=selected?'Сохранить изменения':'Сохранить черновик';
 }
 function edit(d){
  selected=d?.id?d:null;
  $('yadPromoTitle').value=d?.title||'';
  $('yadPromoBody').value=d?.body||'';
  $('yadPromoUrl').value=d?.target_url||d?.url||'';
  update();
 }
 async function request(path,options={}){
  const resp=await fetch('/api/admin?action='+path,{credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},...options});
  const data=await resp.json().catch(()=>({}));
  if(!resp.ok)throw Object.assign(new Error(data.error||'Ошибка сохранения.'),{status:resp.status});
  return data;
 }
 function renderDrafts(){
  const list=$('yadPromoDraftList');
  list.replaceChildren();
  if(!drafts.length){const el=document.createElement('p');el.textContent='Пока нет черновиков на этой странице.';list.append(el)}
  drafts.forEach(d=>{
   const line=document.createElement('div');line.className='yad-promo-draft';
   const title=document.createElement('span');title.textContent=d.title;
   if(selected?.id===d.id)title.classList.add('yad-promo-selected');
   const actions=document.createElement('div');
   const open=document.createElement('button');open.type='button';open.textContent='Редактировать';
   open.addEventListener('click',()=>{edit(d);message('Редактирование: '+d.title)});
   const copy=document.createElement('button');copy.type='button';copy.textContent='Копировать';
   copy.addEventListener('click',()=>copyDraft(d));
   const remove=document.createElement('button');remove.type='button';remove.textContent='Удалить';
   remove.addEventListener('click',()=>removeDraft(d));
   actions.append(open,copy,remove);line.append(title,actions);list.append(line);
  });
  $('yadPromoPrev').disabled=page===0;
  $('yadPromoNext').disabled=!hasMore;
  $('yadPromoPage').textContent='Страница '+(page+1);
  $('yadPromoImport').hidden=localDrafts.length===0;
  $('yadPromoImport').textContent='Перенести '+localDrafts.length+' старых черновиков с этого устройства';
 }
 async function load(){
  if(dashboard.hidden)return;
  try{
   const result=await request('campaigns&page='+page);
   drafts=result.drafts||[];
   hasMore=Boolean(result.has_more);
   if(!drafts.length&&page>0){page--;return load()}
   renderDrafts();
   message('Черновики доступны после входа в админ-панель на любом устройстве.');
  }catch(e){
   message(e.status===503?'Черновики пока недоступны в этой тестовой среде.':e.message);
  }
 }
 async function copyDraft(d){
  const value=compose(d);
  if(!d.title||!d.body)return message('Сначала подготовьте сообщение.');
  try{await navigator.clipboard.writeText(value);message('Текст скопирован. Можно опубликовать в Telegram-канале вручную.')}
  catch{message('Не удалось скопировать. Выделите текст и скопируйте вручную.')}
 }
 async function removeDraft(d){
  if(!confirm('Удалить черновик «'+d.title+'» на всех устройствах?'))return;
  if(loading)return;loading=true;
  try{
   await request('campaign',{method:'DELETE',body:JSON.stringify({id:d.id})});
   if(selected?.id===d.id)edit(null);
   await load();
   message('Черновик удалён из базы YAD.');
  }catch(e){message(e.message)}
  finally{loading=false}
 }
 $('yadPromoForm').addEventListener('input',update);
 $('yadPromoForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(loading)return;
  const draft=read();
  if(draft.title.length<2||draft.title.length>110||draft.body.length<5||draft.body.length>1500)
   return message('Проверьте длину названия и сообщения.');
  if(draft.url){
   try{const u=new URL(draft.url);if(u.origin!=='https://yad-market.vercel.app')throw Error('url')}
   catch{return message('Ссылка должна вести на сайт YAD.')}
  }
  loading=true;saveButton.disabled=true;
  try{
   const params=selected?{...draft,id:selected.id,revision:selected.revision}:draft;
   const result=await request('campaign',{method:selected?'PATCH':'POST',body:JSON.stringify(params)});
   edit(result.draft);
   page=0;
   await load();
   message('Черновик сохранён в базе YAD.');
  }catch(e){message(e.status===409?'Другая версия этого черновика уже сохранена. Скопируйте свой текст перед обновлением страницы.':e.message)}
  finally{loading=false;saveButton.disabled=false}
 });
 $('yadPromoNew').addEventListener('click',()=>{edit(null);message('Новый черновик. Предыдущий текст сохранится только после нажатия «Сохранить».')});
 $('yadPromoExample').addEventListener('click',()=>{
  edit(null);
  $('yadPromoTitle').value='YAD Gift Set · три аромата на выбор';
  $('yadPromoBody').value='Подарочный набор YAD: три флакона по 20 мл в красивой кожаной подарочной коробке. Выберите три любимых аромата. Стоимость набора — 4 900 ₽.';
  $('yadPromoUrl').value='https://yad-market.vercel.app/gift-set';
  update();message('Пример загружен. Проверьте предложение перед публикацией.');
 });
 $('yadPromoCopy').addEventListener('click',()=>copyDraft(read()));
 $('yadPromoPrev').addEventListener('click',()=>{if(page>0){page--;load()}});
 $('yadPromoNext').addEventListener('click',()=>{if(hasMore){page++;load()}});
 $('yadPromoImport').addEventListener('click',async()=>{
  if(!localDrafts.length||loading)return;
  if(!confirm('Перенести старые черновики с этого устройства в общую админ-базу YAD?'))return;
  loading=true;
  let imported=0;
  try{
   for(const d of [...localDrafts]){
    await request('campaign',{method:'POST',body:JSON.stringify(d)});
    localDrafts.shift();imported++;
    try{localStorage.setItem(key,JSON.stringify(localDrafts))}catch{}
   }
   page=0;await load();message('Перенесено черновиков: '+imported+'.');
  }catch(e){renderDrafts();message('Перенесено '+imported+'. Оставшиеся не удалены из этого браузера. '+e.message)}
  finally{loading=false}
 });
 let old=!dashboard.hidden;
 new MutationObserver(()=>{const visible=!dashboard.hidden;if(visible&&!old)load();old=visible}).observe(dashboard,{attributes:true,attributeFilter:['hidden']});
 update();
 renderDrafts();
 if(old)load();
})();