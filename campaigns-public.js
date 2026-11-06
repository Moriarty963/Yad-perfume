(function(){
 'use strict';
 // Anonymous, read-only storefront promotion. No analytics cookies or signup.
 const panels=[document.getElementById('yadHomeCampaign'),document.getElementById('yadCatalogCampaign')].filter(Boolean);
 if(!panels.length)return;
 function hideAll(){panels.forEach(el=>{el.hidden=true})}
 function validUrl(value){
  try{
   const url=new URL(value);
   return url.protocol==='https:'&&url.origin==='https://yad-market.vercel.app'&&!url.username&&!url.password?url.href:null;
  }catch{return null}
 }
 async function render(){
  try{
   const resp=await fetch('/api/campaign',{credentials:'omit',cache:'no-store'});
   if(!resp.ok){hideAll();return}
   const data=await resp.json();
   const campaign=data&&data.campaign;
   const url=validUrl(campaign?.url);
   const title=String(campaign?.title||'').trim(),body=String(campaign?.body||'').trim();
   if(!url||!title||!body){hideAll();return}
   for(const el of panels){
    const headline=el.querySelector('[data-campaign-title]');
    const description=el.querySelector('[data-campaign-description]');
    const link=el.querySelector('[data-campaign-link]');
    if(!headline||!description||!link)continue;
    headline.textContent=title.slice(0,110);
    description.textContent=body.slice(0,300);
    link.href=url;link.rel='noopener';
    el.hidden=false;
   }
  }catch{hideAll()}
 }
 render();
 // Return to the site from another tab: reflect a newly published/unpublished offer.
 window.addEventListener('pageshow',e=>{if(e.persisted)render()});
})();
