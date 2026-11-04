const {neon}=require('@neondatabase/serverless');
const crypto=require('node:crypto');
const COOKIE='yad_admin_session';
const adminPassword=process.env.ADMIN_PASSWORD||process.env.Admin_password;
const sessionSecret=process.env.ADMIN_SESSION_SECRET||process.env.admin_session_secret;
const maxAge=60*60*8;
const statuses=new Set(['new','confirmed','paid','shipped','completed','cancelled']);
const pageSize=50;

function configured(){return Boolean(adminPassword&&sessionSecret&&adminPassword.length>=12&&sessionSecret.length>=32&&process.env.DATABASE_URL)}
function digest(v){return crypto.createHash('sha256').update(String(v)).digest()}
function equal(a,b){return crypto.timingSafeEqual(digest(a),digest(b))}
function sign(payload){return crypto.createHmac('sha256',sessionSecret).update(payload).digest('hex')}
function authorized(req){const cookies=(req.headers.cookie||'').split(';').map(s=>s.trim());const value=cookies.find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!value)return false;const match=/^(\d+)\.([a-f0-9]{64})$/.exec(value);if(!match||Number(match[1])<Date.now()||Number(match[1])>Date.now()+maxAge*1000)return false;return equal(match[2],sign(match[1]))}
function cookie(value,age){return COOKIE+'='+value+'; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age='+age}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(['POST','PATCH'].includes(req.method)){
  const origin=req.headers.origin;
  if(origin){try{if(new URL(origin).host!==req.headers.host)return res.status(403).json({error:'Запрос с другого сайта запрещён.'})}catch{return res.status(403).json({error:'Недопустимый источник запроса.'})}}
 }
 if(!configured())return res.status(503).json({error:'Панель администратора ещё не активирована.'});
 if(req.method==='POST'&&req.query.action==='login'){
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(typeof b.password!=='string'||!equal(b.password,adminPassword))return res.status(401).json({error:'Неверный пароль.'});
  const exp=String(Date.now()+maxAge*1000);res.setHeader('Set-Cookie',cookie(exp+'.'+sign(exp),maxAge));return res.status(200).json({ok:true});
 }
 if(req.method==='POST'&&req.query.action==='logout'){res.setHeader('Set-Cookie',cookie('',0));return res.status(200).json({ok:true})}
 if(!authorized(req))return res.status(401).json({error:'Требуется вход.'});
 const sql=neon(process.env.DATABASE_URL);
 try{
  if(req.method==='GET'){
   const page=Number(req.query.page??0);
   const filter=String(req.query.status??'all');
   const query=String(req.query.q??'').trim();
   if(!Number.isInteger(page)||page<0||page>10000||!(filter==='all'||statuses.has(filter))||query.length>120)return res.status(400).json({error:'Неверные параметры фильтра.'});
   const offset=page*pageSize,term='%'+query+'%';
   const rows=await sql`SELECT public_id,created_at,customer_name,contact_method,contact_value,delivery_service,pickup_address,comment,items,subtotal_rub,delivery_rub,total_rub,status
    FROM yad_orders WHERE (${filter}='all' OR status=${filter})
    AND (${query}='' OR customer_name ILIKE ${term} OR contact_value ILIKE ${term} OR pickup_address ILIKE ${term} OR public_id::text ILIKE ${term})
    ORDER BY created_at DESC,id DESC LIMIT ${pageSize+1} OFFSET ${offset}`;
   const metrics=await sql`SELECT
    COUNT(*)::int AS all_count,
    COUNT(*) FILTER(WHERE status='new')::int AS new_count,
    COUNT(*) FILTER(WHERE status='completed')::int AS completed_count,
    COUNT(*) FILTER(WHERE status <> 'cancelled' AND (created_at AT TIME ZONE 'Europe/Moscow')::date=(now() AT TIME ZONE 'Europe/Moscow')::date)::int AS today_count,
    COALESCE(SUM(total_rub) FILTER(WHERE status <> 'cancelled' AND (created_at AT TIME ZONE 'Europe/Moscow')::date=(now() AT TIME ZONE 'Europe/Moscow')::date),0)::bigint AS today_sum,
    COALESCE(SUM(total_rub) FILTER(WHERE status <> 'cancelled' AND created_at >= now()-interval '7 days'),0)::bigint AS week_sum
    FROM yad_orders`;
   return res.status(200).json({orders:rows.slice(0,pageSize),has_more:rows.length>pageSize,page,per_page:pageSize,metrics:metrics[0]});
  }
  if(req.method==='PATCH'){
   const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
   if(typeof b.id!=='string'||!/^[0-9a-f-]{36}$/i.test(b.id)||!statuses.has(b.status))return res.status(400).json({error:'Неверные данные.'});
   const rows=await sql`UPDATE yad_orders SET status=${b.status} WHERE public_id=${b.id}::uuid RETURNING public_id,status`;
   if(!rows.length)return res.status(404).json({error:'Заказ не найден.'});
   return res.status(200).json({order:rows[0]});
  }
  res.setHeader('Allow','GET, POST, PATCH');return res.status(405).json({error:'Method not allowed'});
 }catch(e){console.error('YAD admin failed',e?.message);return res.status(500).json({error:'Не удалось загрузить данные.'})}
};