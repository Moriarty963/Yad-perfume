(function(){
 'use strict';
 const root=document.getElementById('dashboard');
 if(!root)return;
 const panel=document.createElement('section');
 panel.className='yad-club-admin';
 panel.innerHTML='<div class="yad-club-admin-head"><div><h2>YAD Club · Клиенты</h2><p>Регистрация и добровольные подписки на акции</p></div><button type="button" id="yadClubAdminReload">Обновить</button></div><div class="yad-club-admin-counts"><div><span>Подтверждённые аккаунты</span><strong id="yadClubAccounts">—</strong></div><div><span>Согласны получать акции</span><strong id="yadClubSubscribed">—</strong></div></div><p id="yadClubAdminNotice" role="status">Проверяем готовность регистрации…</p><p class="yad-club-admin-footnote">Рассылки допускаются только по подтверждённому согласию. Отправка рекламных кампаний не включена до настройки домена и юридических документов.</p>';
 const css=document.createElement('style');
 css.textContent='.yad-club-admin{margin:25px 0;padding:20px;border:1px solid #353a36;border-radius:8px;background:#1b1f1c;color:#efece5}.yad-club-admin-head{display:flex;gap:14px;align-items:center;justify-content:space-between}.yad-club-admin-head h2{font:400 22px Georgia,serif;margin:0 0 6px}.yad-club-admin-head p{font-size:12px;color:#a9a8a0;margin:0}.yad-club-admin button{border:1px solid #69685f;color:#f0ece4;background:#2f322e;border-radius:4px;padding:10px;cursor:pointer}.yad-club-admin-counts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}.yad-club-admin-counts div{border:1px solid #434841;border-radius:4px;padding:16px}.yad-club-admin-counts span{display:block;color:#aaa99f;font-size:12px}.yad-club-admin-counts strong{font:400 30px Georgia,serif;display:block;margin-top:8px}.yad-club-admin #yadClubAdminNotice{color:#d6c6b3;font-size:12px}.yad-club-admin .yad-club-admin-footnote{font-size:11px;color:#918e85;line-height:1.7;margin:12px 0 0}@media(max-width:500px){.yad-club-admin{padding:14px}.yad-club-admin-counts strong{font-size:23px}}';
 document.head.append(css);
 root.querySelector('.yad-admin-reviews')?.before(panel);
 if(!panel.isConnected)root.querySelector('.toolbar')?.before(panel);
 async function load(){
  if(root.hidden)return;
  try{
   const r=await fetch('/api/admin?action=club-stats',{credentials:'same-origin',cache:'no-store'});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.error||'Не удалось загрузить статистику.');
   document.getElementById('yadClubAccounts').textContent=Number(data.registered||0);
   document.getElementById('yadClubSubscribed').textContent=Number(data.subscribed||0);
   document.getElementById('yadClubAdminNotice').textContent=data.configured?'Подписчики подтверждены по email.':'Регистрация не запущена: требуются база РФ, политика и почтовый сервис.';
  }catch(e){document.getElementById('yadClubAdminNotice').textContent=e.message}
 }
 document.getElementById('yadClubAdminReload').addEventListener('click',load);
 let old=!root.hidden;
 new MutationObserver(()=>{const shown=!root.hidden;if(shown&&!old)load();old=shown}).observe(root,{attributes:true,attributeFilter:['hidden']});
 if(old)load();
})();