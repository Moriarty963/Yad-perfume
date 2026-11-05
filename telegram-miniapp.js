/* YAD · Telegram Mini App only. The public storefront stays browser-native.
   Never trust Telegram initData for order authorization in client-side code. */
(function(){
 'use strict';
 const tg=window.Telegram&&window.Telegram.WebApp;
 const active=Boolean(tg&&(tg.initData||(typeof tg.platform==='string'&&tg.platform!=='unknown'&&tg.platform!=='')));
 let backHandler=null;
 const supported=(version)=>typeof tg?.isVersionAtLeast==='function'&&tg.isVersionAtLeast(version);
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

 const setFullscreenClass=()=>{
  document.body.classList.toggle('telegram-fullscreen',tg.isFullscreen===true);
 };
 document.body.classList.add('telegram-miniapp');
 try{tg.setHeaderColor('#FAF9F6')}catch(_){}
 try{tg.setBackgroundColor('#FAF9F6')}catch(_){}
 try{tg.ready()}catch(_){}
 try{tg.expand()}catch(_){}

 // 7.7+: keep regular shop scrolling from collapsing the Telegram bottom sheet.
 // Telegram's native header remains available for intentional minimization.
 if(supported('7.7')&&typeof tg.disableVerticalSwipes==='function'){
  try{tg.disableVerticalSwipes()}catch(_){}
 }
 // 8.0+: true edge-to-edge fullscreen when the Telegram platform supports it.
 // Older Telegram clients continue to use expanded mode.
 if(supported('8.0')){
  try{tg.onEvent('fullscreenChanged',setFullscreenClass)}catch(_){}
  try{if(!tg.isFullscreen&&typeof tg.requestFullscreen==='function')tg.requestFullscreen()}catch(_){}
 }
 setFullscreenClass();
 // Open brand links in Telegram itself; normal browsers keep standard links.
 document.addEventListener('click',function(event){
  const link=event.target.closest('a[data-yad-telegram-link]');
  if(!link||typeof tg.openTelegramLink!=='function')return;
  const url=link.getAttribute('href');
  if(!/^https:\/\/t\.me\/(?:yad_parfume|Yad_perfume_app)\/?$/i.test(url||''))return;
  event.preventDefault();
  try{tg.openTelegramLink(url)}catch(_){}
 });
 try{tg.BackButton&&tg.BackButton.onClick(function(){if(backHandler)backHandler()})}catch(_){}
})();