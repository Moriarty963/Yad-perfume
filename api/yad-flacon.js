'use strict';
const {renderYadFlacon,fragrance,BOTTLES}=require('../lib/yad-flacon-renderer');
module.exports=async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end()}
 const id=typeof req.query?.id==='string'?req.query.id:'';
 const ml=Number(req.query?.ml);
 if(!/^[a-z0-9-]{1,60}$/.test(id)||!BOTTLES[ml]||!fragrance(id))
  return res.status(404).end();
 // Labels are generated from the server-owned catalog; no arbitrary user text.
 res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=86400');
 try{
  const buffer=await renderYadFlacon(id,ml);
  res.setHeader('Content-Type','image/webp');
  return res.status(200).send(buffer);
 }catch(e){
  console.error('YAD flacon image render failed',e?.message);
  return res.status(e?.status||503).end();
 }
};
