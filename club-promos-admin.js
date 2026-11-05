(function(){
 'use strict';
 const dashboard=document.getElementById('dashboard');
 if(!dashboard)return;
 const key='yad-promo-studio-local-v1';
 const panel=document.createElement('section');
 panel.id='yadPromoStudio';
 panel.className='yad-promo-studio';
 panel.innerHTML='<div class="yad-promo-heading"><div><span>YAD / CAMPAIGNS</span><h2>Студия акций</h2><p>Подготовка предложений для Telegram-канала и будущей email-рассылки.</p></div><span class="yad-promo-status-label">Только черновики</span></div><div class="yad-promo-layout"><form id="yadPromoForm"><label>Название кампании<input id="yadPromoTitle" maxlength="110" placeholder="Например, подарочный набор YAD" required></label><label>Сообщение покупателю<textarea id="yadPromoBody" rows="5" maxlength="1500" placeholder="Подарочный набор, новая коллекция, сезонная акция…" required></textarea></label><label>Ссылка на предложение<input id="yadPromoUrl" type="url" maxlength="300" placeholder="https://yad-market.vercel.app/gift-set"></label><div class="yad-promo-actions"><button type="button" id="yadPromoExample">Пример подарочного набора</button><button type="submit" class="yad-promo-primary">Сохранить черновик</button><button type="button" id="yadPromoCopy">Скопировать текст</button></div><p id="yadPromoNotice" role="status" aria-live="polite"></p></form><div class="yad-promo-preview"><span>ПРЕДПРОСМОТР СООБЩЕНИЯ</span><h3 id="yadPromoPreviewTitle">Ваше предложение</h3><p id="yadPromoPreviewText">Текст акции появится здесь при заполнении.</p><p id="yadPromoPreviewUrl"></p><div class="yad-promo-drafts"><div class="yad-promo-drafts-heading">Мои черновики <small>только на этом устройстве</small></div><div id="yadPromoDraftList"></div></div></div></div><p class="yad-promo-footnote">Рассылка подписчикам пока не активна. Текст можно скопировать и вручную опубликовать в канале YAD. Ни адреса, ни телефоны клиентов здесь не хранятся.</p>';
 const css=document.createElement('style');
 css.textContent='.yad-promo-studio{background:#1b201d;border:1px solid #41483e;border-radius:8px;padding:24px;margin:24px 0;color:#eee8dc}.yad-promo-heading{display:flex;gap:14px;justify-content:space-between;align-items:center;margin-bottom:24px}.yad-promo-heading span{font-size:10px;letter-spacing:.19em;color:#c5ac89}.yad-promo-heading h2{font:400 26px Georgia,serif;margin:8px 0 6px}.yad-promo-heading p{font-size:12px;color:#b8b3a8;margin:0}.yad-promo-status-label{white-space:nowrap;border:1px solid #655a48;border-radius:3px;padding:9px 12px}.yad-promo-layout{display:grid;grid-template-columns:1fr 1fr;gap:22px}.yad-promo-layout label{font-size:12px;color:#c5bcae;display:flex;flex-direction:column;gap:7px;margin-bottom:14px}.yad-promo-layout input,.yad-promo-layout textarea{box-sizing:border-box;background:#111714;color:#eee8dc;border:1px solid #4c514b;border-radius:4px;padding:13px;font:13px/1.5 inherit;width:100%;resize:vertical}.yad-promo-layout input:focus-visible,.yad-promo-layout textarea:focus-visible{outline:2px solid #d9c39b}.yad-promo-actions{display:flex;gap:8px;flex-wrap:wrap}.yad-promo-actions button{background:#343b35;color:#f1eee7;border:1px solid #5c6159;border-radius:4px;padding:10px 12px;cursor:pointer;font-size:12px}.yad-promo-actions .yad-promo-primary{background:#dfd0b7;color:#222622;border-color:#dfd0b7}.yad-promo-preview{padding:20px;background:#f6f2e9;color:#302f29;border-radius:4px;min-width:0}.yad-promo-preview>span{letter-spacing:.18em;color:#8b7f68;font-size:10px}.yad-promo-preview h3{font:400 25px Georgia,serif;margin:14px 0}.yad-promo-preview p{font-size:13px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;color:#5e584c}.yad-promo-drafts{border-top:1px solid #ded9cb;margin-top:18px;padding-top:16px}.yad-promo-drafts-heading{display:flex;justify-content:space-between;gap:10px;margin-bottom:10px;font-size:13px;font-weight:600}.yad-promo-drafts small{font-weight:400;color:#8d887b;font-size:10px}.yad-promo-draft{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid #e2ddcf}.yad-promo-draft button{border:0;background:transparent;color:#493e31;text-decoration:underline;font-size:11px;cursor:pointer}.yad-promo-draft>span{font-size:12px;min-width:0;overflow-wrap:anywhere}.yad-promo-draft>div{flex-shrink:0}.yad-promo-footnote{color:#aaa89d;font-size:11px;line-height:1.65;margin:18px 0 0}#yadPromoNotice{font-size:12px;color:#dec19b;min-height:17px}@media(max-width:760px){.yad-promo-layout{grid-template-columns:1fr}.yad-promo-studio{padding:14px}.yad-promo-heading{align-items:flex-start;flex-wrap:wrap}.yad-promo-preview h3{font-size:22px}}';
 document.head.appendChild(css);
 const anchor=dashboard.querySelector('.yad-club-admin');
 if(anchor)anchor.after(panel);else dashboard.querySelector('.toolbar')?.before(panel);
 const $=id=>document.getElementById(id);
 let drafts=[];
 try{
  const saved=JSON.parse(localStorage.getItem(key)||'[]');
  if(Array.isArray(saved))drafts=saved.filter(x=>typeof x?.title==='string'&&typeof x?.body==='string'&&typeof x?.url==='string').slice(0,12);
 }catch{}
 const read=()=>({title:$('yadPromoTitle').value.trim(),body:$('yadPromoBody').value.trim(),url:$('yadPromoUrl').value.trim()});
 const compose=x=>[x.title,x.body,x.url].filter(Boolean).join('\n\n');
 const message=msg=>{$('yadPromoNotice').textContent=msg};
 function update(){
  const d=read();
  $('yadPromoPreviewTitle').textContent=d.title||'Ваше предложение';
  $('yadPromoPreviewText').textContent=d.body||'Текст акции появится здесь при заполнении.';
  $('yadPromoPreviewUrl').textContent=d.url||'';
 }
 function renderDrafts(){
  const list=$('yadPromoDraftList');list.replaceChildren();
  if(!drafts.length){const el=document.createElement('p');el.textContent='Пока нет сохранённых черновиков.';list.append(el);return}
  drafts.forEach((d,i)=>{
   const line=document.createElement('div');line.className='yad-promo-draft';
   const title=document.createElement('span');title.textContent=d.title;
   const actions=document.createElement('div');
   const open=document.createElement('button');open.type='button';open.textContent='Открыть';
   open.addEventListener('click',()=>{ $('yadPromoTitle').value=d.title;$('yadPromoBody').value=d.body;$('yadPromoUrl').value=d.url;update();message('Черновик загружен для редактирования.')});
   const remove=document.createElement('button');remove.type='button';remove.textContent='Удалить';
   remove.addEventListener('click',()=>{drafts.splice(i,1);persist();renderDrafts();message('Черновик удалён.')});
   actions.append(open,remove);line.append(title,actions);list.append(line);
  });
 }
 function persist(){try{localStorage.setItem(key,JSON.stringify(drafts))}catch{message('Недостаточно места для черновиков в браузере.')}}
 $('yadPromoForm').addEventListener('input',update);
 $('yadPromoForm').addEventListener('submit',e=>{
  e.preventDefault();const d=read();
  if(!d.title||!d.body)return message('Введите название и текст кампании.');
  if(d.url&&!/^https:\/\//i.test(d.url))return message('Ссылка должна начинаться с https://');
  drafts.unshift({...d,createdAt:new Date().toISOString()});drafts=drafts.slice(0,12);persist();renderDrafts();message('Черновик сохранён только на этом устройстве.');
 });
 $('yadPromoExample').addEventListener('click',()=>{
  $('yadPromoTitle').value='YAD Gift Set · три аромата на выбор';
  $('yadPromoBody').value='Подарочный набор YAD: три флакона по 20 мл в красивой кожаной подарочной коробке. Выберите три любимых аромата. Стоимость набора — 4 900 ₽.';
  $('yadPromoUrl').value='https://yad-market.vercel.app/gift-set';update();message('Пример загружен. Проверьте предложение перед публикацией.');
 });
 $('yadPromoCopy').addEventListener('click',async()=>{
  const d=read();if(!d.title||!d.body)return message('Сначала подготовьте сообщение.');
  try{await navigator.clipboard.writeText(compose(d));message('Текст скопирован. Вы можете разместить его в Telegram-канале вручную.')}
  catch{message('Не удалось скопировать текст. Выделите его из полей вручную.')}
 });
 update();renderDrafts();
})();