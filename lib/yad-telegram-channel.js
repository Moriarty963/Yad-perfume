'use strict';
// Channel posts can only be triggered by the configured owner from a private chat.
const {authorized}=require('./yad-telegram-admin');
const {telegram,sendText,YAD_SHOP_URL}=require('./yad-telegram');
const CHANNEL='@yad_parfume';
const CHANNEL_URL='https://t.me/yad_parfume';
const BOT_URL='https://t.me/Yad_perfume_app';
const CHECK=/^\/channelcheck(?:@[A-Za-z0-9_]{5,32})?$/i;
const HELP=/^\/channelpost(?:@[A-Za-z0-9_]{5,32})?$/i;
const PUBLISH=/^\/publish(?:@[A-Za-z0-9_]{5,32})?$/i;
// Owner-only preview → one-tap confirmation → real channel video post.
// Source: the customer's original 68-second review, compressed without replacing footage.
const BIBLIOTHEQUE=/^\/bibliotheque(?:@[A-Za-z0-9_]{5,32})?$/i;
const BIBLIOTHEQUE_VIDEO='https://d2ol7oe51mr4n9.cloudfront.net/user_3FG45Orhn5vqJJg4K5Lfxp15zdo/e53199bb-471a-4028-b8e6-ae26255aac8f.mp4';
const BIBLIOTHEQUE_PRODUCT='https://yad-market.vercel.app/fragrance/bibliotheque';
const BIBLIOTHEQUE_CALLBACK=/^yc:(post|cancel):bibliotheque$/;
const bibliothequeCaption=[
 '📚 <b>НОВИНКА YAD — BIBLIOTHÈQUE</b>',
 '',
 '<i>Наша интерпретация по мотивам Byredo.</i>',
 '',
 'Аромат с атмосферой старинной библиотеки: бархатистая слива, нежные сухие цветы, кожа, ваниль и пачули.',
 '',
 'В обзоре показываем настоящий флакон YAD и делимся впечатлениями о его звучании.',
 '',
 '🖤 <b>Выберите свой объём:</b>',
 '6 мл — 500 ₽ · 10 мл — 700 ₽',
 '20 мл — 1 300 ₽ · 30 мл — 1 800 ₽',
 '50 мл — 2 700 ₽ · 100 мл — 5 000 ₽',
 '',
 '<i>YAD — ароматы с характером.</i>'
].join('\n');
const bibliothequeKeyboard=()=>({inline_keyboard:[
 [{text:'🛍 Выбрать объём и заказать',url:BIBLIOTHEQUE_PRODUCT}]
]});
function previewKeyboard(){return {inline_keyboard:[
 [{text:'✅ Опубликовать видео в канале',callback_data:'yc:post:bibliotheque'}],
 [{text:'Отмена',callback_data:'yc:cancel:bibliotheque'}]
]}}

const caption=[
 '<b>YAD — ПАРФЮМЕРИЯ С ХАРАКТЕРОМ</b>',
 '',
 'Добро пожаловать в пространство YAD.',
 '',
 'Здесь мы делимся ароматами, подборками под настроение и новинками коллекции.',
 '',
 '🧴 69 ароматов · объёмы от 6 до 100 мл.',
 '🚚 С флаконом 100 мл — бесплатная доставка до ПВЗ.',
 '',
 '<b>Откройте каталог и найдите свой аромат.</b>',
 '',
 '<i>YAD. Искусство оставлять впечатление.</i>'
].join('\n');
const keyboard=()=>({inline_keyboard:[
 [{text:'🛍 Открыть магазин YAD',url:BOT_URL}],
 [{text:'🌐 Посмотреть каталог на сайте',url:YAD_SHOP_URL}]
]});
async function tell(chat,text){
 try{await sendText(chat,text)}catch(_){}
}
async function checkRights(chat){
 try{
  const me=await telegram('getMe',{});
  if(!Number.isSafeInteger(me?.id))throw Error('No bot ID');
  const member=await telegram('getChatMember',{chat_id:CHANNEL,user_id:me.id});
  const admin=member?.status==='administrator'||member?.status==='creator';
  const post=admin&&(member?.status==='creator'||member?.can_post_messages===true);
  const pin=admin&&(member?.status==='creator'||member?.can_edit_messages===true);
  await tell(chat,'YAD · Права бота в '+CHANNEL+
   '\n\nПубликация: '+(post?'✅ Разрешена':'❌ Нет права публиковать')+
   '\nЗакрепление: '+(pin?'✅ Разрешено':'⚠️ Нужно право «Изменять сообщения»')+
   '\n\nОтправьте сюда выбранное фото с подписью /publish.');
 }catch(err){
  console.error('YAD channel rights check failed',err?.message);
  await tell(chat,'Не удалось проверить права бота в '+CHANNEL+'. Убедитесь, что он администратор с правами публиковать и изменять сообщения.');
 }
}
async function previewBibliotheque(chat){
 await telegram('sendMessage',{
  chat_id:chat,
  text:'<b>YAD · Готовая публикация Bibliothèque</b>\n\n'+
   bibliothequeCaption+'\n\n'+
   '<b>Канал:</b> '+CHANNEL+'\n'+
   '<b>Видео:</b> ваш обзор (68 сек.)\n'+
   '<b>Кнопка:</b> «Выбрать объём и заказать»\n\n'+
   'После подтверждения бот разместит видео в канале. Нажмите кнопку только один раз.',
  parse_mode:'HTML',disable_web_page_preview:true,
  reply_markup:previewKeyboard()
 });
}
// Callback buttons are delivered exclusively through the verified Telegram webhook.
// Removing this exact keyboard before posting prevents repeat taps from sending
// multiple videos. Never offer a public HTTP endpoint to initiate channel posting.
async function handleChannelAdminCallback(callback){
 const choice=BIBLIOTHEQUE_CALLBACK.exec(String(callback?.data||''));
 if(!choice)return false;
 if(!authorized(callback?.from,callback?.message?.chat))return true;
 const chat=callback.message.chat.id,mid=callback.message.message_id;
 if(!Number.isSafeInteger(mid))return true;
 try{await telegram('answerCallbackQuery',{callback_query_id:callback.id})}
 catch(err){console.error('YAD channel callback ack failed',err?.message)}
 try{
  await telegram('editMessageReplyMarkup',{chat_id:chat,message_id:mid,reply_markup:{inline_keyboard:[]}});
 }catch(err){
  await tell(chat,'Эта кнопка уже использована. Проверьте публикацию в '+CHANNEL+' перед повторной попыткой.');
  return true;
 }
 if(choice[1]==='cancel'){
  await tell(chat,'Публикация Bibliothèque отменена. Можно подготовить её заново командой /bibliotheque.');
  return true;
 }
 try{
  // An administrator without can_post_messages must not try to publish.
  const me=await telegram('getMe',{});
  const member=await telegram('getChatMember',{chat_id:CHANNEL,user_id:me.id});
  if(!['administrator','creator'].includes(member?.status)||
    (member.status!=='creator'&&member.can_post_messages!==true)){
   await tell(chat,'Бот не может публиковать в '+CHANNEL+'. Дайте ему право «Публиковать сообщения» и повторите /bibliotheque.');
   return true;
  }
  const sent=await telegram('sendVideo',{
   chat_id:CHANNEL,video:BIBLIOTHEQUE_VIDEO,
   supports_streaming:true,caption:bibliothequeCaption,parse_mode:'HTML',
   reply_markup:bibliothequeKeyboard()
  },{timeoutMs:22000});
  if(!Number.isSafeInteger(sent?.message_id))throw Error('Telegram did not return a published message ID');
  await tell(chat,'✅ Видео Bibliothèque опубликовано с кнопкой заказа:\n'+CHANNEL_URL+'/'+sent.message_id);
 }catch(err){
  console.error('YAD Bibliothèque channel publication failed',err?.message);
  await tell(chat,'Не получилось подтвердить публикацию. Проверьте канал '+CHANNEL+
   ' перед повторным /bibliotheque, чтобы не отправить дубль.');
 }
 return true;
}
async function publishPhoto(message){
 const chat=message.chat.id;
 const photos=Array.isArray(message.photo)?message.photo:[];
 const photo=photos[photos.length-1];
 if(!photo||typeof photo.file_id!=='string'||!photo.file_id){
  await tell(chat,'Для публикации отправьте фото с подписью /publish.');
  return;
 }
 let sent;
 try{
  // Reuse the exact picture provided to this bot, without generating a substitute.
  sent=await telegram('sendPhoto',{
   chat_id:CHANNEL,photo:photo.file_id,caption,parse_mode:'HTML',
   reply_markup:keyboard()
  });
 }catch(err){
  console.error('YAD channel sendPhoto failed',err?.message);
  await tell(chat,'Не получилось опубликовать. Проверьте право «Публиковать сообщения» у бота в '+CHANNEL+'.');
  return;
 }
 const id=sent?.message_id;
 if(!Number.isSafeInteger(id)){
  await tell(chat,'Telegram не вернул ID публикации. Проверьте канал перед повторной отправкой.');
  return;
 }
 let pinned=false;
 try{
  pinned=await telegram('pinChatMessage',{chat_id:CHANNEL,message_id:id,disable_notification:true})===true;
 }catch(err){console.error('YAD channel pin failed',err?.message)}
 const link=CHANNEL_URL+'/'+id;
 await tell(chat,pinned?'✅ Пост с кнопками опубликован и закреплён:\n'+link:
  '✅ Пост опубликован с кнопками:\n'+link+
  '\n\n⚠️ Закрепить не удалось. Разрешите боту «Изменять сообщения» или закрепите вручную.');
}
async function handleChannelAdminMessage(message){
 const text=String(message?.text||'').trim();
 const photoCaption=String(message?.caption||'').trim();
 const help=HELP.test(text),check=CHECK.test(text);
 // Telegram deep link t.me/Yad_perfume_app?start=bibliotheque opens the private
 // owner-only preview directly. Other /start payloads keep their existing behavior.
 const review=BIBLIOTHEQUE.test(text)||/^\/start(?:@[A-Za-z0-9_]{5,32})?\s+bibliotheque$/i.test(text);
 const publish=PUBLISH.test(photoCaption),bare=PUBLISH.test(text);
 if(!help&&!check&&!publish&&!bare&&!review)return false;
 if(!authorized(message?.from,message?.chat))return true;
 if(check){await checkRights(message.chat.id);return true}
 if(review){await previewBibliotheque(message.chat.id);return true}
 if(help){
  await tell(message.chat.id,'📢 YAD · Публикация в канале\n\n'+
   'Отправьте сюда выбранную картинку как фото с подписью /publish.\n'+
   'Бот опубликует её с приветствием и кнопкой магазина, затем попробует закрепить.\n\n'+
   'Проверить права: /channelcheck\n\n'+
   '🎬 Видео Bibliothèque с кнопкой заказа: /bibliotheque\n'+
   'Или ссылка: https://t.me/Yad_perfume_app?start=bibliotheque');
  return true;
 }
 if(bare){await tell(message.chat.id,'Отправьте картинку именно как фото с подписью /publish.');return true}
 await publishPhoto(message);
 return true;
}
module.exports={handleChannelAdminMessage,handleChannelAdminCallback,bibliothequeCaption,bibliothequeKeyboard};
