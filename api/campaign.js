'use strict';
const {neon}=require('@neondatabase/serverless');
module.exports=async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 // Publication state is deliberately public, but customer data and drafts are not.
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'})}
 res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=30');
 if(!process.env.DATABASE_URL)return res.status(503).json({error:'Предложения временно недоступны.'});
 try{
  const sql=neon(process.env.DATABASE_URL);
  const rows=await sql`SELECT d.title,d.body,d.target_url
    FROM yad_campaign_publication p
    INNER JOIN yad_campaign_drafts d ON d.id=p.campaign_id
    WHERE p.slot=1
    LIMIT 1`;
  if(!rows.length)return res.status(200).json({campaign:null});
  const d=rows[0];
  const url=String(d.target_url||'');
  try{
   const parsed=new URL(url);
   if(parsed.origin!=='https://yad-market.vercel.app'||parsed.username||parsed.password)throw Error('unsafe URL');
  }catch{
   console.error('YAD published campaign has invalid link');
   return res.status(200).json({campaign:null});
  }
  return res.status(200).json({campaign:{
   title:String(d.title||'').slice(0,110),
   body:String(d.body||'').slice(0,1500),
   url
  }});
 }catch(e){
  console.error('YAD public campaign failed',e?.message);
  return res.status(503).json({error:'Предложения временно недоступны.'});
 }
};
