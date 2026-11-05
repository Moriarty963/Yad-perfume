const {neon}=require('@neondatabase/serverless');
const crypto=require('node:crypto');
const {ready:telegramReady,botInfo,webhookInfo,enableWebhook,notifyBuyerStatus}=require('../lib/yad-telegram');
const {ensureTelegramTables}=require('../lib/yad-telegram-schema');
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
 if(req.method==='GET'&&req.query.action==='telegram-config'){
  if(!telegramReady())return res.status(200).json({configured:false,webhook_ready:false});
  try{
   const [bot,webhook]=await Promise.all([botInfo(),webhookInfo()]);
   return res.status(200).json({configured:true,bot_username:bot.username,webhook_ready:webhook.active,webhook_conflict:webhook.conflict});
  }catch(e){console.error('YAD Telegram status failed',e?.message);return res.status(503).json({error:'Не удалось проверить Telegram.'})}
 }
 if(req.method==='POST'&&req.query.action==='telegram-enable'){
  try{
   const result=await enableWebhook();
   if(!result.ok)return res.status(result.conflict?409:503).json({error:result.error});
   return res.status(200).json({ok:true,bot_username:result.username});
  }catch(e){console.error('YAD Telegram activation failed',e?.message);return res.status(503).json({error:'Не удалось подключить Telegram.'})}
 }
 const sql=neon(process.env.DATABASE_URL);
 try{
  if(req.method==='POST'&&req.query.action==='telegram-retry'){
   await ensureTelegramTables(sql);
   const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
   const id=typeof b.id==='string'?b.id:'';
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return res.status(400).json({error:'Некорректный номер заявки.'});
   const rows=await sql`SELECT o.public_id,o.status,(s.chat_id IS NOT NULL) AS telegram_connected,s.last_notified_status
    FROM yad_orders o LEFT JOIN yad_telegram_subscriptions s ON s.order_id=o.public_id AND s.active=true
    WHERE o.public_id=${id}::uuid LIMIT 1`;
   if(!rows.length)return res.status(404).json({error:'Заказ не найден.'});
   const order=rows[0];
   if(!order.telegram_connected)return res.status(409).json({error:'Покупатель ещё не подключил заказ к Telegram.'});
   if(order.last_notified_status===order.status)return res.status(200).json({notification_status:'already_sent',status:order.status});
   const outcome=await notifyBuyerStatus(order.public_id,order.status);
   if(outcome==='failed'||outcome==='not_configured')
    return res.status(503).json({error:'Telegram не принял сообщение. Повторите попытку позже.',notification_status:outcome});
   return res.status(200).json({notification_status:outcome,status:order.status});
  }
  if(req.query.action==='campaigns'&&req.method==='GET'){
   const page=Number(req.query.page||0),limit=20;
   if(!Number.isInteger(page)||page<0||page>100)return res.status(400).json({error:'Неверная страница.'});
   const rows=await sql`SELECT id,title,body,target_url,revision,created_at,updated_at
      FROM yad_campaign_drafts ORDER BY updated_at DESC,id DESC LIMIT ${limit+1} OFFSET ${page*limit}`;
   return res.status(200).json({drafts:rows.slice(0,limit),has_more:rows.length>limit,page});
  }
  if(req.query.action==='campaign'&&['POST','PATCH','DELETE'].includes(req.method)){
   // Only same-site browser interactions may change privately stored campaigns.
   const origin=String(req.headers.origin||'');
   let validOrigin=false;
   try{const parsed=new URL(origin);validOrigin=parsed.protocol==='https:'&&parsed.host===req.headers.host}
   catch{}
   if(!validOrigin)return res.status(403).json({error:'Недопустимый источник изменения.'});
   let body;
   try{body=typeof req.body==='string'?JSON.parse(req.body):req.body||{}}
   catch{return res.status(400).json({error:'Некорректный JSON.'})}
   if(!body||typeof body!=='object'||Array.isArray(body))return res.status(400).json({error:'Некорректные данные.'});
   if(JSON.stringify(body).length>2500)return res.status(413).json({error:'Слишком большой текст.'});
   if(req.method==='DELETE'){
    const id=String(body.id||'');
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      return res.status(400).json({error:'Некорректный черновик.'});
    const removed=await sql`DELETE FROM yad_campaign_drafts WHERE id=${id}::uuid RETURNING id`;
    return removed.length?res.status(200).json({ok:true}):res.status(404).json({error:'Черновик не найден.'});
   }
   const title=typeof body.title==='string'?body.title.trim():'';
   const content=typeof body.body==='string'?body.body.trim():'';
   let url=typeof body.url==='string'?body.url.trim():'';
   if(title.length<2||title.length>110||content.length<5||content.length>1500||url.length>300)
      return res.status(400).json({error:'Проверьте название и текст акции.'});
   if(url){
    try{
     const dest=new URL(url);
     if(dest.origin!=='https://yad-market.vercel.app'||dest.username||dest.password)throw Error('not YAD');
     url=dest.href;
     if(url.length>300)return res.status(400).json({error:'Ссылка слишком длинная.'});
    }catch{return res.status(400).json({error:'Укажите ссылку на страницу YAD.'})}
   }
   if(req.method==='POST'){
    const draft=await sql`INSERT INTO yad_campaign_drafts (title,body,target_url)
     VALUES (${title},${content},${url})
     RETURNING id,title,body,target_url,revision,created_at,updated_at`;
    return res.status(201).json({draft:draft[0]});
   }
   const id=String(body.id||''),revision=Number(body.revision);
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
       ||!Number.isInteger(revision)||revision<1)
     return res.status(400).json({error:'Неверная версия черновика.'});
   const rows=await sql`UPDATE yad_campaign_drafts
     SET title=${title},body=${content},target_url=${url},revision=revision+1,updated_at=now()
     WHERE id=${id}::uuid AND revision=${revision}
     RETURNING id,title,body,target_url,revision,created_at,updated_at`;
   if(rows.length)return res.status(200).json({draft:rows[0]});
   const existing=await sql`SELECT id FROM yad_campaign_drafts WHERE id=${id}::uuid LIMIT 1`;
   return res.status(existing.length?409:404).json({error:existing.length?'Черновик изменён на другом устройстве. Обновите список.':'Черновик не найден.'});
  }
  // Review moderation shares the existing HttpOnly administrator session.
  if(req.method==='GET'&&req.query.action==='club-stats'){
   if(process.env.YAD_CLUB_DATA_REGION!=='RU'||process.env.YAD_CLUB_PRIVACY_APPROVED!=='true'||!process.env.YAD_CLUB_DATABASE_URL)
    return res.status(200).json({configured:false,registered:0,subscribed:0});
   try{
    const {database}=require('../lib/yad-club-db');
    const result=await database().query(`SELECT COUNT(*)::int AS registered,
      COUNT(*) FILTER(WHERE promotions_opt_in=true AND verified_at IS NOT NULL)::int AS subscribed
      FROM yad_club_members`);
    return res.status(200).json({configured:true,...result.rows[0]});
   }catch(e){console.error('YAD Club stats unavailable',e?.message);return res.status(503).json({error:'Статистика YAD Club временно недоступна.'})}
  }
  if(req.method==='GET'&&req.query.action==='reviews'){
   const state=String(req.query.status||'pending');
   const page=Number(req.query.page||0),reviewPageSize=6;
   if(!['pending','approved','rejected'].includes(state)||!Number.isInteger(page)||page<0||page>1000)return res.status(400).json({error:'Неверный фильтр.'});
   const rows=await sql`SELECT r.id,r.fragrance_id,r.author_name,r.rating,r.body,r.photos,r.status,r.created_at,
     left(o.public_id::text,8) AS order_number FROM yad_fragrance_reviews r
     JOIN yad_orders o ON o.public_id=r.order_id WHERE r.status=${state}
     ORDER BY r.created_at DESC LIMIT ${reviewPageSize+1} OFFSET ${page*reviewPageSize}`;
   return res.status(200).json({reviews:rows.slice(0,reviewPageSize),has_more:rows.length>reviewPageSize,page});
  }
  if(req.method==='PATCH'&&req.query.action==='review'){
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
   const rid=String(body.id||''),state=String(body.status||'');
   if(!/^\d{1,18}$/.test(rid)||!['approved','rejected'].includes(state))
    return res.status(400).json({error:'Неверное действие.'});
   const result=await sql`UPDATE yad_fragrance_reviews SET status=${state},moderated_at=now()
    WHERE id=${rid}::bigint AND status IS DISTINCT FROM ${state} RETURNING id,status`;
   if(!result.length)return res.status(409).json({error:'Отзыв уже имеет выбранный статус.'});
   return res.status(200).json({review:result[0]});
  }
  if(req.method==='GET'){
   // Admin authenticated: repair only missing Telegram tables in the live database.
   await ensureTelegramTables(sql);
   const page=Number(req.query.page??0);
   const filter=String(req.query.status??'all');
   const query=String(req.query.q??'').trim();
   if(!Number.isInteger(page)||page<0||page>10000||!(filter==='all'||statuses.has(filter))||query.length>120)return res.status(400).json({error:'Неверные параметры фильтра.'});
   const offset=page*pageSize,term='%'+query+'%';
   const rows=await sql`SELECT o.public_id,o.created_at,o.customer_name,o.customer_phone,o.contact_method,o.contact_value,
    o.delivery_service,o.pickup_address,o.comment,o.items,o.subtotal_rub,o.delivery_rub,o.total_rub,o.status,
    (sub.chat_id IS NOT NULL) AS telegram_connected,
    sub.last_notified_status AS telegram_last_status,
    sub.last_notified_at AS telegram_last_sent_at
    FROM yad_orders o LEFT JOIN yad_telegram_subscriptions sub ON sub.order_id=o.public_id AND sub.active=true
    WHERE (${filter}='all' OR o.status=${filter})
    AND (${query}='' OR o.customer_name ILIKE ${term} OR o.contact_value ILIKE ${term} OR o.pickup_address ILIKE ${term} OR o.public_id::text ILIKE ${term})
    ORDER BY o.created_at DESC,o.id DESC LIMIT ${pageSize+1} OFFSET ${offset}`;
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
   await ensureTelegramTables(sql);
   const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
   if(typeof b.id!=='string'||!/^[0-9a-f-]{36}$/i.test(b.id)||!statuses.has(b.status))return res.status(400).json({error:'Неверные данные.'});
   const rows=await sql`UPDATE yad_orders SET status=${b.status} WHERE public_id=${b.id}::uuid AND status IS DISTINCT FROM ${b.status} RETURNING public_id,status`;
   if(!rows.length){
    const existing=await sql`SELECT public_id,status FROM yad_orders WHERE public_id=${b.id}::uuid LIMIT 1`;
    if(!existing.length)return res.status(404).json({error:'Заказ не найден.'});
    return res.status(200).json({order:existing[0],unchanged:true,notification_status:'unchanged'});
   }
   let notificationStatus='not_subscribed';
   try{notificationStatus=await notifyBuyerStatus(rows[0].public_id,b.status)}
   catch(err){notificationStatus='failed';console.error('YAD buyer notification failed',err?.message)}
   return res.status(200).json({order:rows[0],notification_status:notificationStatus});
  }
  res.setHeader('Allow','GET, POST, PATCH, DELETE');return res.status(405).json({error:'Method not allowed'});
 }catch(e){console.error('YAD admin failed',e?.message);return res.status(500).json({error:'Не удалось загрузить данные.'})}
};