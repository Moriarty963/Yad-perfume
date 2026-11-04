'use strict';
// Telegram admin access is limited to a single positive user ID in a private chat.
// If YAD_TELEGRAM_ADMIN_USER_ID is absent, reuse the *private* notifications recipient.
const {neon}=require('@neondatabase/serverless');
const {telegram,enableWebhook,notifyBuyerStatus,statusLabels}=require('./yad-telegram');
const {YAD_CATALOG_ROWS}=require('../catalog-data');
const names=new Map(YAD_CATALOG_ROWS.map(([id,name])=>[id,name]));
names.set('discovery','Discovery Set');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validStatus=/^(new|confirmed|paid|shipped|completed|cancelled)$/;
function adminId(){
 const value=String(process.env.YAD_TELEGRAM_ADMIN_USER_ID||process.env.YAD_TELEGRAM_CHAT_ID||'').trim();
 if(!/^[1-9][0-9]{0,15}$/.test(value))return null;
 const id=Number(value);return Number.isSafeInteger(id)?id:null;
}
function authorized(from,chat){
 const id=adminId();
 return id!==null&&chat?.type==='private'&&!from?.is_bot&&
 Number.isSafeInteger(from?.id)&&Number.isSafeInteger(chat.id)&&from.id===chat.id&&from.id===id;
}
function esc(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
const rub=n=>Number(n||0).toLocaleString('ru-RU')+' ₽';
const short=id=>String(id).slice(0,8).toUpperCase();
const button=(text,data)=>({text,callback_data:data});
const keyboard=()=>({inline_keyboard:[
 [button('🆕 Новые','ya:list:new'),button('📋 Все','ya:list:all')],
 [button('📊 Статистика','ya:stats'),button('🌐 Веб-панель','ya:web')]
]});
async function send(chat,text,reply_markup){
 return telegram('sendMessage',{chat_id:chat,text:String(text).slice(0,3900),parse_mode:'HTML',
  disable_web_page_preview:true,...(reply_markup?{reply_markup}:{})});
}
function date(d){
 const value=new Date(d);if(Number.isNaN(value.getTime()))return '—';
 return value.toLocaleString('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}
async function menu(chat){
 return send(chat,'<b>YAD ATELIER · Управление</b>\n\nЗаказы и статистика прямо в Telegram.\nВыберите раздел:',keyboard());
}
async function stats(chat,sql){
 const rows=await sql`SELECT COUNT(*)::int AS total,
  COUNT(*) FILTER(WHERE status='new')::int AS new_count,
  COUNT(*) FILTER(WHERE status='confirmed')::int AS confirmed_count,
  COUNT(*) FILTER(WHERE status='paid')::int AS paid_count,
  COUNT(*) FILTER(WHERE status='completed')::int AS completed_count,
  COUNT(*) FILTER(WHERE status='cancelled')::int AS cancelled_count,
  COUNT(*) FILTER(WHERE status<>'cancelled' AND (created_at AT TIME ZONE 'Europe/Moscow')::date=(now() AT TIME ZONE 'Europe/Moscow')::date)::int AS today_count,
  COALESCE(SUM(total_rub) FILTER(WHERE status<>'cancelled' AND (created_at AT TIME ZONE 'Europe/Moscow')::date=(now() AT TIME ZONE 'Europe/Moscow')::date),0)::bigint AS today_sum,
  COALESCE(SUM(total_rub) FILTER(WHERE status<>'cancelled' AND created_at>=now()-interval '7 days'),0)::bigint AS week_sum
  FROM yad_orders`;
 const s=rows[0]||{};
 return send(chat,['<b>📊 Статистика YAD</b>','',
 'Сегодня: <b>'+Number(s.today_count||0)+'</b> заказов · <b>'+rub(s.today_sum)+'</b>',
 '7 дней: <b>'+rub(s.week_sum)+'</b>','',
 'Новые: '+Number(s.new_count||0),'Подтверждены: '+Number(s.confirmed_count||0),
 'Оплачены: '+Number(s.paid_count||0),'Завершены: '+Number(s.completed_count||0),
 'Отменены: '+Number(s.cancelled_count||0),'Всего: '+Number(s.total||0)
 ].join('\n'),keyboard());
}
async function list(chat,sql,filter){
 const rows=await sql`SELECT public_id,created_at,total_rub,status,customer_name
  FROM yad_orders WHERE (${filter}='all' OR status='new')
  ORDER BY created_at DESC,id DESC LIMIT 6`;
 if(!rows.length)return send(chat,filter==='new'?'Новых заявок нет.':'Заказов пока нет.',keyboard());
 const text=['<b>'+(filter==='new'?'🆕 Новые заявки':'📋 Последние заявки')+'</b>','',...rows.map(o=>
  '№'+short(o.public_id)+' · '+esc(statusLabels[o.status]||o.status)+' · <b>'+rub(o.total_rub)+'</b>\n'+
  esc(String(o.customer_name||'Клиент').slice(0,70))+' · '+date(o.created_at))].join('\n\n');
 const keys=rows.map(o=>[button('№'+short(o.public_id)+' · '+rub(o.total_rub),'ya:order:'+o.public_id)]);
 keys.push([button('↩️ Меню','ya:menu'),button('🔄 Обновить','ya:list:'+filter)]);
 return send(chat,text,{inline_keyboard:keys});
}
async function detail(chat,sql,id){
 const rows=await sql`SELECT public_id,created_at,customer_name,contact_method,contact_value,
  delivery_service,pickup_address,comment,items,subtotal_rub,delivery_rub,total_rub,status
  FROM yad_orders WHERE public_id=${id}::uuid LIMIT 1`;
 if(!rows.length)return send(chat,'Заказ не найден.',keyboard());
 const o=rows[0],lines=[
  '🧾 <b>Заказ YAD №'+short(id)+'</b>',
  esc(statusLabels[o.status]||o.status)+' · '+date(o.created_at),'',
  '<b>Покупатель</b>','👤 '+esc(String(o.customer_name||'—').slice(0,100)),
  'Связь: '+(o.contact_method==='telegram'?'Telegram':'WhatsApp'),
  '<code>'+esc(String(o.contact_value||'—').slice(0,150))+'</code>','',
  '<b>Доставка</b>',esc(o.delivery_service||'—'),
  esc(String(o.pickup_address||'—').slice(0,350))];
 if(o.comment)lines.push('','<b>Комментарий</b>',esc(String(o.comment).slice(0,400)));
 lines.push('','<b>Товары</b>');
 for(const item of (Array.isArray(o.items)?o.items:[]).slice(0,30)){
  lines.push('• '+esc(names.get(item.id)||item.title||'Аромат')+
   (item.ml?' · '+Number(item.ml)+' мл':'')+
   (item.variant==='travel'?' · Travel'+(item.color?' / '+esc(item.color):''):'')+
   ' × '+Number(item.qty||1)+' — '+rub(Number(item.unit_price||0)*Number(item.qty||1)));
 }
 lines.push('','Товары: '+rub(o.subtotal_rub),'Доставка: '+rub(o.delivery_rub),
  '<b>Итого: '+rub(o.total_rub)+'</b>','','Изменить статус:');
 return send(chat,lines.join('\n'),{inline_keyboard:[
  [button('✅ Подтверждён','ya:choose:'+id+':confirmed'),button('💳 Оплачен','ya:choose:'+id+':paid')],
  [button('📦 Отправлен','ya:choose:'+id+':shipped'),button('🏁 Завершён','ya:choose:'+id+':completed')],
  [button('🆕 Новый','ya:choose:'+id+':new'),button('✖ Отменён','ya:choose:'+id+':cancelled')],
  [button('↩️ Заказы','ya:list:all'),button('🔄 Обновить','ya:order:'+id)]
 ]});
}
async function choose(chat,sql,id,next){
 const rows=await sql`SELECT status FROM yad_orders WHERE public_id=${id}::uuid LIMIT 1`;
 if(!rows.length)return send(chat,'Заказ не найден.',keyboard());
 const before=String(rows[0].status);
 if(before===next)return send(chat,'Этот статус уже установлен.',{inline_keyboard:[[button('↩️ К заказу','ya:order:'+id)]]});
 return send(chat,'<b>Подтвердите изменение</b>\n\n№'+short(id)+'\n'+
  esc(statusLabels[before]||before)+' → <b>'+esc(statusLabels[next])+'</b>',
  {inline_keyboard:[[button('✅ Подтвердить','ya:ok:'+id+':'+next+':'+before)],
  [button('↩️ Отмена','ya:order:'+id)]]});
}
async function update(chat,sql,id,next,previous){
 const rows=await sql`UPDATE yad_orders SET status=${next}
  WHERE public_id=${id}::uuid AND status=${previous} RETURNING public_id,status`;
 if(!rows.length)return send(chat,'Заказ уже изменился или не найден. Обновите карточку.',
  {inline_keyboard:[[button('🔄 Открыть заказ','ya:order:'+id)]]});
 let notification='not_subscribed';
 try{notification=await notifyBuyerStatus(id,next)}
 catch(e){notification='failed';console.error('YAD admin status notification',e?.message)}
 const note=notification==='failed'?' Уведомление покупателю не отправлено.':
  notification==='sent'?' Покупатель получил уведомление.':'';
 return send(chat,'✅ №'+short(id)+' → <b>'+esc(statusLabels[next])+'</b>.'+note,
  {inline_keyboard:[[button('📋 К заказу','ya:order:'+id),button('↩️ Список','ya:list:all')]]});
}
async function handleMessage(message){
 const match=/^\/(admin|yad_new|yad_all|yad_stats)(?:@[A-Za-z0-9_]{5,32})?$/i.exec(String(message.text||'').trim());
 if(!match)return false;
 if(!authorized(message.from,message.chat))return true;
 if(match[1].toLowerCase()==='admin'){
  // The verified admin can opt in to callbacks by sending /admin.
  // Reconfigure the existing YAD URL only, never replace a conflicting webhook.
  let ok=false;
  try{ok=(await enableWebhook()).ok}catch(e){console.error('YAD admin webhook enable',e?.message)}
  await menu(message.chat.id);
  if(!ok)await send(message.chat.id,'Команды /yad_new, /yad_all, /yad_stats доступны. Если кнопки не отвечают, проверьте подключение Telegram в веб-панели.');
  return true;
 }
 const sql=neon(process.env.DATABASE_URL),cmd=match[1].toLowerCase();
 if(cmd==='yad_new')await list(message.chat.id,sql,'new');
 else if(cmd==='yad_all')await list(message.chat.id,sql,'all');
 else await stats(message.chat.id,sql);
 return true;
}
async function handleCallback(c){
 if(!authorized(c.from,c.message?.chat))return false;
 try{await telegram('answerCallbackQuery',{callback_query_id:c.id})}
 catch(e){console.error('YAD admin callback acknowledgement',e?.message)}
 const data=String(c.data||'');if(data.length>64||!data.startsWith('ya:'))return true;
 const chat=c.message.chat.id;
 if(data==='ya:menu'){await menu(chat);return true}
 if(data==='ya:web'){await send(chat,'Веб-панель: https://yad-market.vercel.app/admin',keyboard());return true}
 const sql=neon(process.env.DATABASE_URL);
 if(data==='ya:stats'){await stats(chat,sql);return true}
 if(data==='ya:list:new'||data==='ya:list:all'){await list(chat,sql,data.slice(8));return true}
 const order=/^ya:order:([0-9a-f-]{36})$/.exec(data);
 if(order&&uuid.test(order[1])){await detail(chat,sql,order[1]);return true}
 const select=/^ya:choose:([0-9a-f-]{36}):(new|confirmed|paid|shipped|completed|cancelled)$/.exec(data);
 if(select&&uuid.test(select[1])){await choose(chat,sql,select[1],select[2]);return true}
 const approved=/^ya:ok:([0-9a-f-]{36}):(new|confirmed|paid|shipped|completed|cancelled):(new|confirmed|paid|shipped|completed|cancelled)$/.exec(data);
 if(approved&&uuid.test(approved[1])){await update(chat,sql,approved[1],approved[2],approved[3]);return true}
 return true;
}
module.exports={adminId,authorized,handleMessage,handleCallback};
