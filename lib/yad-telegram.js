'use strict';
const crypto=require('node:crypto');
const {neon}=require('@neondatabase/serverless');
const BOT_API='https://api.telegram.org/bot';
const PRODUCTION_WEBHOOK='https://yad-market.vercel.app/api/telegram-webhook';
const statusLabels={new:'Новый',confirmed:'Подтверждён',paid:'Оплачен',shipped:'Отправлен',completed:'Завершён',cancelled:'Отменён'};
const token=()=>process.env.YAD_TELEGRAM_BOT_TOKEN||'';
const adminSecret=()=>process.env.ADMIN_SESSION_SECRET||process.env.admin_session_secret||'';
function ready(){return token().length>25&&adminSecret().length>=32&&!!process.env.DATABASE_URL}
function webhookSecret(){if(!ready())return '';return crypto.createHmac('sha256',adminSecret()).update('YAD:TELEGRAM_WEBHOOK:V1').digest('hex')}
function validWebhookSecret(given){
 if(typeof given!=='string'||given.length!==64)return false;
 const expected=webhookSecret();if(!expected)return false;
 return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(given));
}
async function telegram(method,payload){
 if(!token())throw Error('Telegram bot not configured');
 const response=await fetch(BOT_API+token()+'/'+method,{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify(payload||{}),signal:AbortSignal.timeout(5500)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.ok)throw Error('Telegram '+method+' failed: '+(data.error_code||response.status));
 return data.result;
}
async function botInfo(){
 const r=await telegram('getMe',{});
 if(!r||!r.is_bot||!/^[A-Za-z0-9_]{5,32}$/.test(r.username||''))throw Error('Bot username unavailable');
 return {username:r.username};
}
async function webhookInfo(){
 const r=await telegram('getWebhookInfo',{});
 const actual=String(r?.url||'');
 return {active:actual===PRODUCTION_WEBHOOK,available:!actual||actual===PRODUCTION_WEBHOOK,conflict:!!actual&&actual!==PRODUCTION_WEBHOOK,pending:Math.max(0,Number(r?.pending_update_count)||0)};
}
async function enableWebhook(){
 if(!ready())return {ok:false,error:'Отсутствуют настройки Telegram или базы.'};
 const info=await webhookInfo();
 if(info.conflict)return {ok:false,conflict:true,error:'У бота уже есть другой webhook. Автоматически заменять его небезопасно.'};
 const r=await telegram('setWebhook',{url:PRODUCTION_WEBHOOK,secret_token:webhookSecret(),allowed_updates:['message','callback_query'],drop_pending_updates:false,max_connections:10});
 if(r!==true)throw Error('Unable to activate Telegram webhook');
 return {ok:true,username:(await botInfo()).username};
}
async function sendText(chatId,text){
 if(!Number.isSafeInteger(Number(chatId))||!String(text).length)return false;
 try{await telegram('sendMessage',{chat_id:chatId,text:String(text).slice(0,4000),disable_web_page_preview:true});return true}
 catch(err){console.error('YAD Telegram delivery failed',err?.message);return false}
}
async function notifyBuyerStatus(orderId,status){
 if(!ready())return 'not_configured';
 if(!Object.prototype.hasOwnProperty.call(statusLabels,status))return 'invalid_status';
 const sql=neon(process.env.DATABASE_URL);
 const rows=await sql`SELECT chat_id,last_notified_status FROM yad_telegram_subscriptions WHERE order_id=${orderId}::uuid AND active=true LIMIT 1`;
 if(!rows.length)return 'not_subscribed';
 if(rows[0].last_notified_status===status)return 'already_sent';
 const number=String(orderId).slice(0,8).toUpperCase();
 const message='YAD · Статус заказа №'+number+'\n\n'+statusLabels[status]+
 '\n\nПосмотреть все заказы: /orders\nОтключить уведомления: /stop';
 const ok=await sendText(rows[0].chat_id,message);
 if(!ok)return 'failed';
 await sql`UPDATE yad_telegram_subscriptions SET last_notified_status=${status},last_notified_at=now(),updated_at=now()
 WHERE order_id=${orderId}::uuid AND chat_id=${rows[0].chat_id} AND active=true`;
 return 'sent';
}
function hashCode(code){return crypto.createHash('sha256').update(String(code)).digest('hex')}
module.exports={ready,webhookSecret,validWebhookSecret,telegram,botInfo,webhookInfo,enableWebhook,sendText,notifyBuyerStatus,hashCode,statusLabels,PRODUCTION_WEBHOOK};
