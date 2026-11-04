'use strict';
const crypto=require('node:crypto');
const {neon}=require('@neondatabase/serverless');
const {verifyToken}=require('../lib/order-status-token');
const {ready,botInfo,webhookInfo,hashCode}=require('../lib/yad-telegram');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
 const origin=req.headers?.origin;
 if(origin){try{if(new URL(origin).host!==req.headers.host)return res.status(403).json({error:'Запрос запрещён.'})}catch{return res.status(403).json({error:'Недопустимый источник.'})}}
 const input=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
 const action=input.action||'info';
 const orderId=verifyToken(input.token);
 if(!orderId)return res.status(401).json({error:'Для подключения нужен действующий заказ.'});
 if(!ready())return res.status(503).json({error:'Telegram временно недоступен.'});
 if(!['info','link'].includes(action))return res.status(400).json({error:'Неизвестное действие.'});
 try{
  const [bot,webhook]=await Promise.all([botInfo(),webhookInfo()]);
  const sql=neon(process.env.DATABASE_URL);
  const exists=await sql`SELECT 1 FROM yad_orders WHERE public_id=${orderId}::uuid LIMIT 1`;
  if(!exists.length)return res.status(404).json({error:'Заявка не найдена.'});
  const subscriptions=await sql`SELECT active FROM yad_telegram_subscriptions WHERE order_id=${orderId}::uuid AND active=true LIMIT 1`;
  const connected=subscriptions.length>0;
  if(action==='info')return res.status(200).json({bot_username:bot.username,connected,webhook_ready:webhook.active,webhook_conflict:webhook.conflict});
  if(connected)return res.status(200).json({connected:true,bot_username:bot.username});
  if(!webhook.active)return res.status(409).json({error:'Подключение Telegram пока не активировано администратором YAD.'});
  const counts=await sql`SELECT COUNT(*)::int AS recent FROM yad_telegram_links WHERE order_id=${orderId}::uuid AND created_at>now()-interval '1 hour'`;
  if(Number(counts[0]?.recent||0)>=8)return res.status(429).json({error:'Слишком много ссылок за последний час. Повторите попытку позже.'});
  const code='yad_'+crypto.randomBytes(24).toString('base64url');
  const expiry=new Date(Date.now()+30*60*1000);
  const hash=hashCode(code);
  await sql`INSERT INTO yad_telegram_links(token_hash,order_id,expires_at) VALUES (${hash},${orderId}::uuid,${expiry})`;
  return res.status(200).json({connected:false,bot_username:bot.username,url:'https://t.me/'+bot.username+'?start='+code,expires_in:1800});
 }catch(e){console.error('YAD Telegram link failed',e?.message);return res.status(503).json({error:'Не удалось подключить Telegram. Попробуйте позже.'})}
};
