'use strict';
const {neon}=require('@neondatabase/serverless');
module.exports=async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end()}
 const id=String(req.query.id||''),n=Number(req.query.n);
 if(!/^\d{1,18}$/.test(id)||!Number.isInteger(n)||n<0||n>2)return res.status(400).end();
 if(!process.env.DATABASE_URL)return res.status(503).end();
 try{
  const sql=neon(process.env.DATABASE_URL);
  const rows=await sql`SELECT photos FROM yad_fragrance_reviews WHERE id=${id}::bigint AND status='approved' LIMIT 1`;
  const photo=rows[0]?.photos?.[n];
  if(typeof photo!=='string'||!photo.startsWith('data:image/jpeg;base64,'))return res.status(404).end();
  const buf=Buffer.from(photo.slice('data:image/jpeg;base64,'.length),'base64');
  if(buf.length>130000||buf[0]!==0xff||buf[1]!==0xd8)return res.status(404).end();
  res.setHeader('Content-Type','image/jpeg');
  res.setHeader('Cache-Control','public, max-age=3600, s-maxage=86400');
  return res.status(200).send(buf);
 }catch(e){console.error('Review image failed',e?.message);return res.status(500).end()}
};
