'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

function createChannel(owner=42,rights=true){
 const content=fs.readFileSync(path.join(__dirname,'../lib/yad-telegram-channel.js'),'utf8');
 const calls=[];let clicked=false;
 async function telegram(method,payload,options){
  calls.push({method,payload,options});
  if(method==='getMe')return {id:777};
  if(method==='getChatMember')return rights?{status:'administrator',can_post_messages:true}:{status:'member'};
  if(method==='editMessageReplyMarkup'){
   if(clicked)throw Error('Message is not modified');
   clicked=true;return {message_id:10};
  }
  if(method==='sendVideo')return {message_id:867};
  return {message_id:10};
 }
 const requireStub=id=>{
  if(id==='./yad-telegram-admin')return {authorized:(from,chat)=>
   from?.id===owner&&chat?.id===owner&&chat?.type==='private'&&!from?.is_bot};
  if(id==='./yad-telegram')return {telegram,sendText:async(chat,message)=>{calls.push({method:'sendText',chat,message});return true},YAD_SHOP_URL:'https://yad-market.vercel.app/'};
  throw Error('Unexpected module '+id);
 };
 const mod={exports:{}};
 new Function('module','require','process',content)(mod,requireStub,{env:{}});
 return {channel:mod.exports,calls};
}
const message=id=>({text:'/bibliotheque',from:{id},chat:{id,type:'private'}});
const callback=id=>({id:'callback-1',data:'yc:post:bibliotheque',from:{id},message:{message_id:10,chat:{id,type:'private'}}});

test('owner sees a preview, and approval publishes original video with product button exactly once',async()=>{
 const {channel,calls}=createChannel();
 assert.equal(channel.bibliothequeCaption.length<1024,true,'caption must fit Telegram limit');
 assert.equal(await channel.handleChannelAdminMessage(message(42)),true);
 const preview=calls.find(x=>x.method==='sendMessage');
 assert.equal(preview.payload.chat_id,42);
 assert.equal(preview.payload.reply_markup.inline_keyboard[0][0].callback_data,'yc:post:bibliotheque');
 assert.equal(calls.filter(x=>x.method==='sendVideo').length,0,'preview is not a post');

 assert.equal(await channel.handleChannelAdminCallback(callback(42)),true);
 const sent=calls.filter(x=>x.method==='sendVideo');
 assert.equal(sent.length,1);
 assert.equal(sent[0].payload.chat_id,'@yad_parfume');
 assert.equal(sent[0].payload.video.endsWith('/e53199bb-471a-4028-b8e6-ae26255aac8f.mp4'),true);
 assert.equal(sent[0].payload.caption,channel.bibliothequeCaption);
 assert.equal(sent[0].payload.reply_markup.inline_keyboard[0][0].url,'https://yad-market.vercel.app/fragrance/bibliotheque');
 assert.equal(sent[0].options.timeoutMs,22000);
 assert.equal(calls.some(x=>x.method==='sendText'&&x.message.includes('https://t.me/yad_parfume/867')),true);

 await channel.handleChannelAdminCallback(callback(42));
 assert.equal(calls.filter(x=>x.method==='sendVideo').length,1,'a repeat click cannot republish');
});

test('unauthorized owners and channels cannot publish',async()=>{
 const {channel,calls}=createChannel();
 await channel.handleChannelAdminMessage(message(99));
 await channel.handleChannelAdminCallback(callback(99));
 assert.equal(calls.length,0);
 const {channel:channel2,calls:calls2}=createChannel(42,false);
 await channel2.handleChannelAdminCallback(callback(42));
 assert.equal(calls2.some(x=>x.method==='sendVideo'),false);
 assert.equal(calls2.some(x=>x.method==='sendText'),true);
});

test('owner can cancel publication before a video is sent',async()=>{
 const {channel,calls}=createChannel();
 const cancel=callback(42);cancel.data='yc:cancel:bibliotheque';
 await channel.handleChannelAdminCallback(cancel);
 assert.equal(calls.some(x=>x.method==='sendVideo'),false);
 assert.equal(calls.some(x=>x.method==='sendText'&&x.message.includes('отменена')),true);
});
test('production webhook keeps Telegram secret verification and admin-only callback routing',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../api/telegram-webhook.js'),'utf8');
 assert.match(src,/validWebhookSecret\(req\.headers\?\.\['x-telegram-bot-api-secret-token'\]\)/);
 assert.match(src,/handleChannelAdminCallback\(update\.callback_query\)/);
 assert.match(src,/handleAdminCallback\(update\.callback_query\)/);
 assert.equal(typeof require('../api/telegram-webhook.js'),'function');
});
