'use strict';
const {neon}=require('@neondatabase/serverless');
const {verifyToken}=require('../lib/order-status-token');
const {YAD_CATALOG_ROWS}=require('../catalog-data');
const validIds=new Set(YAD_CATALOG_ROWS.map(row=>row[0]));
const paidStatuses=new Set(['paid','shipped','completed']);
const codeRe=/^[0-9a-f]{8}$/i;
function sameContact(provided,order){
 const expected=[order.contact_value,order.customer_phone].filter(Boolean);
 const val=String(provided||'').trim().toLowerCase();
 if(val.length<5||val.length>150)return false;
 const digits=val.replace(/\D/g,'');
 return expected.some(v=>{
  const s=String(v).trim().toLowerCase();
  return val===s||(digits.length>=10&&digits===s.replace(/\D/g,''));
 });
}
function validPhoto(photo){
 if(typeof photo!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)||photo.length>180000)return false;
 const data=Buffer.from(photo.split(',')[1],'base64');
 return data.length>=100&&data.length<=130000&&data[0]===0xff&&data[1]===0xd8&&data[2]===0xff;
}
function okOrigin(req){
 const origin=req.headers.origin;
 if(!origin)return true;
 try{return new URL(origin).host===req.headers.host}catch{return false}
}
module.exports=async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed'})}
 if(!process.env.DATABASE_URL)return res.status(503).json({error:'Отзывы пока недоступны.'});
 const sql=neon(process.env.DATABASE_URL);
 try{
  if(req.method==='GET'){
   const fragrance=String(req.query.fragrance||'');
   const sort=String(req.query.sort||'recent');
   const page=Number(req.query.page||0);
   if(!validIds.has(fragrance)||!['recent','high','photos'].includes(sort)||!Number.isInteger(page)||page<0||page>1000)return res.status(400).json({error:'Некорректные параметры.'});
   const [stats,rows]=await Promise.all([
    sql`SELECT COUNT(*)::int AS count, COALESCE(ROUND(AVG(rating)::numeric,1),0)::float AS average FROM yad_fragrance_reviews WHERE fragrance_id=${fragrance} AND status='approved'`,
    sql`SELECT id,author_name,rating,body,created_at,jsonb_array_length(photos) AS photo_count FROM yad_fragrance_reviews
      WHERE fragrance_id=${fragrance} AND status='approved'
      ORDER BY CASE WHEN ${sort}='high' THEN rating END DESC NULLS LAST,
       CASE WHEN ${sort}='photos' THEN jsonb_array_length(photos) END DESC NULLS LAST,
       created_at DESC LIMIT 6 OFFSET ${page*6}`
   ]);
   return res.status(200).json({count:stats[0].count,average:stats[0].average,page,reviews:rows.map(r=>({...r,verified:true}))});
  }
  if(!okOrigin(req))return res.status(403).json({error:'Запрос с другого сайта запрещён.'});
  const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
  if(raw.length>620000)return res.status(413).json({error:'Слишком большие фотографии.'});
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const id=String(b.fragrance||'');
  const name=String(b.name||'').trim();
  const body=String(b.text||'').trim();
  const rating=Number(b.rating);
  const photos=b.photos||[];
  if(!validIds.has(id)||name.length<2||name.length>60||body.length<10||body.length>1500||!Number.isInteger(rating)||rating<1||rating>5||!Array.isArray(photos)||photos.length>3||!photos.every(validPhoto))
   return res.status(400).json({error:'Проверьте оценку, текст и фотографии (до 3 JPEG).'});
  const tokenId=b.order_token?verifyToken(b.order_token):null;
  let orders=[];
  if(tokenId){orders=await sql`SELECT public_id,contact_value,customer_phone,status,items FROM yad_orders WHERE public_id=${tokenId}::uuid LIMIT 1`;}
  else{
   const code=String(b.order_code||'').trim();
   if(!codeRe.test(code))return res.status(400).json({error:'Введите 8 символов номера заказа или откройте сайт с устройства, где оформляли покупку.'});
   orders=await sql`SELECT public_id,contact_value,customer_phone,status,items FROM yad_orders WHERE left(public_id::text,8)=lower(${code}) LIMIT 2`;
   if(orders.length!==1||!sameContact(b.contact,orders[0]))return res.status(403).json({error:'Не удалось подтвердить заказ. Проверьте номер и контакт.'});
  }
  const order=orders[0];
  if(!order)return res.status(403).json({error:'Заказ не найден. Проверьте данные.'});
  if(!paidStatuses.has(order.status))return res.status(409).json({error:'Оставить отзыв можно после подтверждения оплаты заказа.'});
  const items=Array.isArray(order.items)?order.items:[];
  const includes=items.some(item=>item.id===id||(item.id==='gift-set'&&Array.isArray(item.scents)&&item.scents.includes(id)));
  if(!includes)return res.status(403).json({error:'Этого аромата нет в подтверждённом заказе.'});
  const existing=await sql`SELECT id FROM yad_fragrance_reviews WHERE order_id=${order.public_id}::uuid AND fragrance_id=${id} LIMIT 1`;
  if(existing.length)return res.status(409).json({error:'По этому аромату уже оставлен отзыв с данного заказа.'});
  const inserted=await sql`INSERT INTO yad_fragrance_reviews(order_id,fragrance_id,author_name,rating,body,photos)
   VALUES(${order.public_id}::uuid,${id},${name},${rating},${body},${JSON.stringify(photos)}::jsonb)
   ON CONFLICT(order_id,fragrance_id) DO NOTHING RETURNING id`;
  if(!inserted.length)return res.status(409).json({error:'Отзыв уже был отправлен.'});
  return res.status(201).json({ok:true,message:'Спасибо! Отзыв отправлен на проверку.'});
 }catch(e){console.error('YAD reviews failed',e?.message);return res.status(500).json({error:'Сервис отзывов временно недоступен.'})}
};
