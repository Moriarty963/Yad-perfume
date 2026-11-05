/* YAD · Telegram Mini App shell. The public website remains fully usable
   outside Telegram. Telegram identity is never trusted for purchases here. */
(function(){
 'use strict';
 const tg=window.Telegram&&window.Telegram.WebApp;
 const active=Boolean(tg&&(tg.initData||(typeof tg.platform==='string'&&tg.platform!=='unknown'&&tg.platform!=='') ));
 let backHandler=null;
 const bridge={
  active,
  setBackHandler(handler){backHandler=typeof handler==='function'?handler:null},
  syncNavigation(page){
   if(!active||!tg.BackButton)return;
   try{
    if(page==='home')tg.BackButton.hide();
    else tg.BackButton.show();
   }catch(_){}
  }
 };
 window.YadMiniApp=bridge;
 if(!active)return;
 document.body.classList.add('telegram-miniapp');
 try{tg.setHeaderColor('#FAF9F6')}catch(_){}
 try{tg.setBackgroundColor('#FAF9F6')}catch(_){}
 try{tg.expand()}catch(_){}
 try{tg.BackButton&&tg.BackButton.onClick(function(){if(backHandler)backHandler()})}catch(_){}
 try{tg.ready()}catch(_){}
})();