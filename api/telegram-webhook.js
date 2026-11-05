'use strict';
const {neon}=require('@neondatabase/serverless');
const {ready,validWebhookSecret,hashCode,sendText,shopKeyboard,setShopMenu,statusLabels}=require('../lib/yad-telegram');
const {ensureTelegramTables}=require('../lib/yad-telegram-schema');
const {handleMessage:handleAdminMessage,handleCallback:handleAdminCallback}=require('../lib/yad-telegram-admin');
const {YAD_CATALOG_ROWS}=require('../catalog-data');
const fragranceNames=new Map(YAD_CATALOG_ROWS.map(([id,name])=>[id,name]));
fragranceNames.set('discovery','Discovery Set');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
 if(!ready())return res.status(503).json({error:'Bot not configured'});
 if(!validWebhookSecret(req.headers?.['x-telegram-bot-api-secret-token']))return res.status(401).json({error:'Unauthorized'});
 try{
  const update=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(update.callback_query){
   // Telegram only delivers callbacks from the existing authenticated webhook.
   // Private-chat and exact Telegram user-ID verification happen inside handler.
   await handleAdminCallback(update.callback_query);
   return res.status(200).json({ok:true});
  }
  const message=update.message;
  if(!message||message.chat?.type!=='private'||!Number.isSafeInteger(message.chat.id)||
   !Number.isSafeInteger(message.from?.id)||message.chat.id!==message.from.id||message.from?.is_bot){
   return res.status(200).json({ok:true});
  }
  const chatId=message.chat.id;
  const text=String(message.text||'').trim();
  if(text.length>100)return res.status(200).json({ok:true});
  if(await handleAdminMessage(message))return res.status(200).json({ok:true});
  const sql=neon(process.env.DATABASE_URL);
  await ensureTelegramTables(sql);
  if(/^\/start(?:@\w+)?(?:\s+.*)?$/i.test(text)){
   await setShopMenu(chatId);
   const m=/^\/start(?:@\w+)?\s+(yad_[A-Za-z0-9_-]{32})$/i.exec(text);
   if(!m){
    await sendText(chatId,'Добро пожаловать в YAD! 🌿\n\nОткройте магазин кнопкой ниже — каталог, корзина и оформление работают прямо в Telegram.\n\n/orders — ваши заявки\n/channel — наш Telegram-канал\n/stop — отключить уведомления',shopKeyboard());
    return res.status(200).json({ok:true});
   }
   const hash=hashCode(m[1]);
   const tokens=await sql`UPDATE yad_telegram_links SET used_at=now() WHERE token_hash=${hash} AND used_at IS NULL AND expires_at>now() RETURNING order_id`;
   if(!tokens.length){
    await sendText(chatId,'Ссылка истекла или уже использована. Вернитесь в YAD и создайте новую ссылку в подтверждении заказа.');
    return res.status(200).json({ok:true});
   }
   const id=tokens[0].order_id;
   const bound=await sql`INSERT INTO yad_telegram_subscriptions(order_id,chat_id,active,created_at,updated_at,last_notified_status)
     VALUES (${id}::uuid,${chatId},true,now(),now(),NULL)
     ON CONFLICT(order_id) DO UPDATE SET chat_id=EXCLUDED.chat_id,active=true,updated_at=now(),last_notified_status=NULL
     WHERE yad_telegram_subscriptions.active=false OR yad_telegram_subscriptions.chat_id=EXCLUDED.chat_id
     RETURNING order_id`;
   if(!bound.length){
    await sendText(chatId,'Этот заказ уже привязан к другому Telegram. Для защиты данных изменить привязку можно только после отключения прежней подписки.');
    return res.status(200).json({ok:true});
   }
   await sendText(chatId,'✅ Заказ YAD №'+String(id).slice(0,8).toUpperCase()+' подключён!\n\nВы дали согласие на уведомления об изменениях статуса этого заказа.\n\n/orders — посмотреть связанные заказы\n/channel — наш Telegram-канал\n/stop — отключить уведомления',shopKeyboard());
   return res.status(200).json({ok:true});
  }
  if(/^\/stop(?:@\w+)?$/i.test(text)){
   await sql`UPDATE yad_telegram_subscriptions SET active=false,updated_at=now() WHERE chat_id=${chatId} AND active=true`;
   await sendText(chatId,'Уведомления YAD отключены. Для повторного подключения откройте заказ на сайте YAD и создайте новую ссылку.');
   return res.status(200).json({ok:true});
  }
  if(/^\/orders(?:@\w+)?$/i.test(text)){
   const orders=await sql`SELECT o.public_id,o.status,o.total_rub,o.items,o.created_at
     FROM yad_orders o INNER JOIN yad_telegram_subscriptions s ON s.order_id=o.public_id
     WHERE s.chat_id=${chatId} AND s.active=true
     ORDER BY o.created_at DESC LIMIT 15`;
   if(!orders.length){
    await sendText(chatId,'Пока нет подключённых заказов. Откройте подтверждение заказа на сайте YAD и нажмите «Подключить Telegram».');
    return res.status(200).json({ok:true});
   }
   const list=orders.map(o=>{
    const status=statusLabels[o.status]||'Уточняется';
    const entries=Array.isArray(o.items)?o.items:[];
    const names=entries.slice(0,5).map(i=>(fragranceNames.get(i.id)||i.title||'Аромат')+(i.ml?' '+i.ml+' мл':'')+' × '+i.qty).join(', ');
    return '🧴 №'+String(o.public_id).slice(0,8).toUpperCase()+' · '+status+'\n'+names+'\n'+(Number(o.total_rub)||0).toLocaleString('ru-RU')+' ₽';
   });
   await sendText(chatId,'Ваши заказы YAD:\n\n'+list.join('\n\n')+'\n\n/stop — отключить уведомления');
   return res.status(200).json({ok:true});
  }
  if(/^\/channel(?:@\w+)?$/i.test(text)){
   await sendText(chatId,'📢 YAD · Наш Telegram-канал\n\nПодборки ароматов, новинки и заметки о парфюмерии. Подписывайтесь, чтобы не пропускать обновления.',shopKeyboard());
   return res.status(200).json({ok:true});
  }
  if(/^\/ping(?:@\w+)?$/i.test(text)){
   await sendText(chatId,'✅ YAD Telegram работает. Связь с ботом установлена.\n\nДля уведомлений о заказе подключите заявку на сайте YAD.\n/orders — связанные заказы\n/stop — отключить уведомления');
   return res.status(200).json({ok:true});
  }
  if(/^\/(?:shop|catalog)(?:@\w+)?$/i.test(text)){
   await setShopMenu(chatId);
   await sendText(chatId,'🛍 YAD · Парфюмерия\n\nНажмите кнопку, чтобы открыть каталог внутри Telegram. Выберите аромат и объём, затем оформите заказ.',shopKeyboard());
   return res.status(200).json({ok:true});
  }
  if(/^\/help(?:@\w+)?$/i.test(text)){
   await sendText(chatId,'YAD · Помощь\n/shop — открыть магазин в Telegram\n/channel — наш Telegram-канал\n/ping — проверить работу бота\n/orders — ваши заказы\n/stop — отключить уведомления\n\nДля подключения нового заказа откройте его подтверждение в YAD.',shopKeyboard());
   return res.status(200).json({ok:true});
  }
  if(text.startsWith('/'))await sendText(chatId,'Доступные команды: /shop, /channel, /ping, /orders, /stop, /help.',shopKeyboard());
  return res.status(200).json({ok:true});
 }catch(e){
  console.error('YAD bot webhook failed',e?.message);
  return res.status(500).json({error:'Webhook processing failed'});
 }
};
