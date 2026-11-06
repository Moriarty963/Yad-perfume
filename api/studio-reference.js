'use strict';
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).end();
 const ml=Number(req.query.ml);
 if(![6,10,20,30,50,100].includes(ml))return res.status(400).end();
 try{
  const r=await fetch('https://yad-market.vercel.app/assets/studio/imagination-'+ml+'ml.webp',{signal:AbortSignal.timeout(7000)});
  if(!r.ok)return res.status(502).json({error:'Reference unavailable',status:r.status});
  const buf=Buffer.from(await r.arrayBuffer());
  if(buf.length>900000)return res.status(413).json({error:'Too big'});
  return res.status(200).json({ml,mime:'image/webp',bytes:buf.length,base64:buf.toString('base64')});
 }catch(e){return res.status(503).json({error:String(e?.message||'reference unavailable')})}
};
