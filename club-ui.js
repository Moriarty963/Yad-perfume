(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let step='start',email='',member=null,pendingName='',pendingPromos=false,loading=false;
 const root=()=>$('clubPage');
 const benefits='<div class="club-benefits"><div><span>01</span><strong>Личный кабинет</strong><p>Данные вашего профиля в одном месте.</p></div><div><span>02</span><strong>Только нужные новости</strong><p>Акции и новинки — лишь с вашего согласия.</p></div><div><span>03</span><strong>Ваш выбор</strong><p>Подписку можно отключить в любой момент.</p></div></div>';
 const intro='<div class="club-hero"><span class="club-kicker">YAD / PRIVATE EXPERIENCE</span><h1>YAD <em>Club</em></h1><p>Ваше пространство в мире ароматов YAD.</p></div>'+benefits;
 function draw(){
  const el=root();if(!el)return;
  let content='';
  if(member){
   content='<div class="club-form-wrap"><div class="club-form-header"><span class="club-kicker">ВАШ ПРОФИЛЬ</span><h2>Рады видеть вас, '+safe(member.name)+'.</h2><p>'+safe(member.email)+' · Почта подтверждена</p></div><form id="clubProfile" class="club-form"><label>Ваше имя<input id="clubProfileName" autocomplete="name" minlength="2" maxlength="80" required value="'+safe(member.name)+'"></label><label class="club-check"><input id="clubProfilePromos" type="checkbox"'+(member.promotions?' checked':'')+'><span><strong>Получать акции и новинки YAD</strong><small>Рассылка по email только с вашего согласия. Отказаться можно здесь в любой момент.</small></span></label><button class="club-primary" type="submit">Сохранить изменения</button></form><p class="club-status" id="clubStatus" role="status" aria-live="polite"></p><div class="club-account-actions"><button type="button" id="clubLogout">Выйти из профиля</button><button type="button" id="clubDelete">Удалить аккаунт и данные</button></div><p class="club-legal">Изменения подписки сохраняются в истории согласий. Рассылка пока не включена.</p></div>';
  }else if(step==='verify'){
   content='<div class="club-form-wrap"><div class="club-form-header"><span class="club-kicker">ПОДТВЕРЖДЕНИЕ</span><h2>Проверьте почту</h2><p>Мы отправили шестизначный код на <strong>'+safe(email)+'</strong>. Он действует 10 минут.</p></div><form id="clubVerify" class="club-form"><label>Код из письма<input id="clubCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required placeholder="000000"></label><button class="club-primary" type="submit">Подтвердить и войти</button></form><p class="club-status" id="clubStatus" role="status" aria-live="polite"></p><button type="button" class="club-quiet-link" id="clubBack">Изменить адрес почты</button></div>';
  }else{
   content='<div class="club-form-wrap"><div class="club-form-header"><span class="club-kicker">ПРИСОЕДИНИТЬСЯ</span><h2>Создайте свой профиль</h2><p>Регистрация бесплатна. Пароль не нужен — вход по коду из письма.</p></div><form id="clubStart" class="club-form"><label>Как к вам обращаться<input id="clubName" autocomplete="name" minlength="2" maxlength="80" value="'+safe(pendingName)+'" required placeholder="Ваше имя"></label><label>Email<input id="clubEmail" type="email" autocomplete="email" maxlength="254" value="'+safe(email)+'" required placeholder="name@example.com"></label><label class="club-check"><input id="clubPromos" type="checkbox"'+(pendingPromos?' checked':'')+'><span><strong>Хочу получать акции и новинки YAD</strong><small>Необязательно. Отказаться от рекламы можно в профиле в любой момент.</small></span></label><label class="club-check club-terms"><input id="clubTerms" type="checkbox" required><span>Согласен на обработку данных для регистрации и создания личного кабинета согласно <a href="/club-privacy" target="_blank" rel="noopener">политике конфиденциальности</a>.</span></label><button class="club-primary" type="submit">Получить код для регистрации</button></form><p class="club-status" id="clubStatus" role="status" aria-live="polite"></p><p class="club-legal">Для подтверждения входа мы отправим письмо на ваш адрес. Покупать ароматы можно и без регистрации.</p></div>';
  }
  el.innerHTML=intro+content+'<div class="club-foot"><span>YAD · YOUR AROMA, YOUR STORY</span></div>';
 }
 async function request(url,opts={}){
  const resp=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...opts});
  const data=await resp.json().catch(()=>({}));
  if(!resp.ok)throw Object.assign(Error(data.error||'Не удалось обработать запрос.'),{status:resp.status});
  return data;
 }
 function status(text,isError=false){const el=$('clubStatus');if(el){el.textContent=text;el.classList.toggle('error',isError)}}
 function showPrelaunch(){
  status('YAD Club скоро откроется. Пока можно оформить заказ без аккаунта.',true);
  const form=$('clubStart');
  if(!form)return;
  form.hidden=true;
  const note=document.createElement('div');note.className='club-launch-note';
  note.innerHTML='<strong>Узнавайте об акциях уже сейчас</strong><p>Подписывайтесь на наш официальный Telegram-канал: новые ароматы, подарочные наборы и специальные предложения.</p><a href="https://t.me/yad_parfume" target="_blank" rel="noopener noreferrer" data-yad-telegram-link>Канал YAD — смотреть новинки ↗</a>';
  form.before(note);
 }
 async function mount(){
  if(!root())return;
  draw();
  try{
   const response=await request('/api/club');
   member=response.member||null;draw();
   if(!member&&response.signup_open===false)showPrelaunch();
  }catch(err){
   draw();
   if(err.status===503)showPrelaunch();
   else status('Сейчас не удаётся загрузить профиль. Повторите позже.',true);
  }
 }
 document.addEventListener('submit',async e=>{
  if(!['clubStart','clubVerify','clubProfile'].includes(e.target.id))return;
  e.preventDefault();if(loading)return;loading=true;
  const btn=e.target.querySelector('button[type="submit"]');if(btn)btn.disabled=true;
  status('');
  try{
   if(e.target.id==='clubStart'){
    pendingName=$('clubName').value.trim();email=$('clubEmail').value.trim().toLowerCase();pendingPromos=$('clubPromos').checked;
    await request('/api/club?action=start',{method:'POST',body:JSON.stringify({name:pendingName,email,promotions:pendingPromos,terms:$('clubTerms').checked})});
    step='verify';draw();$('clubCode')?.focus();
   }else if(e.target.id==='clubVerify'){
    const data=await request('/api/club?action=verify',{method:'POST',body:JSON.stringify({email,code:$('clubCode').value.trim()})});
    member=data.member;step='start';draw();status('Профиль готов. Добро пожаловать в YAD Club.');
   }else{
    const data=await request('/api/club',{method:'PATCH',body:JSON.stringify({name:$('clubProfileName').value.trim(),promotions:$('clubProfilePromos').checked})});
    member=data.member;draw();status('Настройки сохранены.');
   }
  }catch(err){status(err.message,true)}
  finally{loading=false;if(btn?.isConnected)btn.disabled=false}
 });
 document.addEventListener('click',async e=>{
  if(e.target.closest('#clubBack')){step='start';draw();return}
  if(e.target.closest('#clubLogout')){
   try{await request('/api/club?action=logout',{method:'POST',body:'{}'});member=null;step='start';draw();status('Вы вышли из профиля.')}
   catch(err){status(err.message,true)}
   return;
  }
  if(e.target.closest('#clubDelete')){
   if(!window.confirm('Удалить ваш аккаунт YAD Club и настройки подписки? Это действие нельзя отменить.'))return;
   try{await request('/api/club',{method:'DELETE',body:'{}'});member=null;step='start';draw();status('Аккаунт удалён.')}
   catch(err){status(err.message,true)}
  }
 });
 window.YadClub={mount};
 if(document.body.dataset.page==='account')mount();
})();
