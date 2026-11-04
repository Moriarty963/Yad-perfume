'use strict';
const {ready,botInfo,webhookInfo}=require('../lib/yad-telegram');
module.exports=async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Cache-Control','public, s-maxage=60, max-age=20');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'})}
 if(!ready())return res.status(200).json({configured:false,webhook_ready:false});
 try{
  const [bot,webhook]=await Promise.all([botInfo(),webhookInfo()]);
  return res.status(200).json({configured:true,bot_username:bot.username,webhook_ready:webhook.active,webhook_conflict:webhook.conflict});
 }catch(e){
  console.error('YAD Telegram health failed',e?.message);
  return res.status(503).json({configured:false,webhook_ready:false,error:'Не удалось проверить Telegram.'});
 }
};
