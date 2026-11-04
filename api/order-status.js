'use strict';
const {neon}=require('@neondatabase/serverless');
const {configured,verifyToken}=require('../lib/order-status-token.js');
const statuses=new Set(['new','confirmed','paid','shipped','completed','cancelled']);
module.exports=async function orderStatus(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 if(req.method!=='POST'){
  res.setHeader('Allow','POST');
  return res.status(405).json({error:'Method not allowed'});
 }
 const origin=req.headers?.origin;
 if(origin){
  try{
   if(new URL(origin).host!==req.headers.host)return res.status(403).json({error:'Запрос с другого сайта запрещён.'});
  }catch{return res.status(403).json({error:'Недопустимый источник запроса.'})}
 }
 if(!configured()||!process.env.DATABASE_URL)return res.status(503).json({error:'Проверка статуса временно недоступна.'});
 try{
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const id=verifyToken(b.token);
  if(!id)return res.status(401).json({error:'Ссылка для проверки заказа недействительна или устарела.'});
  const sql=neon(process.env.DATABASE_URL);
  const rows=await sql`SELECT status,created_at FROM yad_orders WHERE public_id=${id}::uuid LIMIT 1`;
  if(!rows.length)return res.status(404).json({error:'Заявка не найдена.'});
  const status=String(rows[0].status);
  if(!statuses.has(status))return res.status(503).json({error:'Статус временно недоступен.'});
  return res.status(200).json({status,created_at:rows[0].created_at,checked_at:new Date().toISOString()});
 }catch(e){
  console.error('YAD customer status lookup failed',e?.message);
  return res.status(500).json({error:'Не удалось проверить статус заказа.'});
 }
};
