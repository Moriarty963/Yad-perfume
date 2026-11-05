'use strict';
const {database,storageAvailable}=require('../lib/yad-club-db');
const {verifyUnsubscribeToken}=require('../lib/yad-club-unsubscribe');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Метод не поддерживается.'})}
 if(!storageAvailable())return res.status(503).json({error:'Подписки YAD Club пока не активны.'});
 let body={};
 try{body=typeof req.body==='string'?JSON.parse(req.body||'{}'):req.body||{}}
 catch{return res.status(400).json({error:'Некорректные данные.'})}
 const token=req.method==='GET'?req.query?.token:body.token;
 const memberId=verifyUnsubscribeToken(token);
 if(!memberId)return res.status(400).json({error:'Ссылка для отписки недействительна или устарела.'});
 if(req.method==='GET')return res.status(200).json({valid:true});
 const client=await database().connect();
 try{
  await client.query('BEGIN');
  const rows=await client.query(`UPDATE yad_club_members SET promotions_opt_in=false,
   promotions_revoked_at=now() WHERE id=$1 AND promotions_opt_in=true RETURNING id`,[memberId]);
  if(rows.rowCount){
   await client.query(`INSERT INTO yad_club_consent_log(member_id,consent_version,action,source)
    VALUES($1,'2026-11-v1','opt_out','email_unsubscribe')`,[memberId]);
  }
  await client.query('COMMIT');
  return res.status(200).json({ok:true,message:'Рекламная подписка отключена.'});
 }catch(e){
  await client.query('ROLLBACK');
  console.error('YAD Club unsubscribe failed',e?.message);
  return res.status(500).json({error:'Не удалось изменить подписку. Попробуйте позже.'});
 }finally{client.release()}
};
