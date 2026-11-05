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
 const publish=PUBLISH.test(photoCaption),bare=PUBLISH.test(text);
 if(!help&&!check&&!publish&&!bare)return false;
 if(!authorized(message?.from,message?.chat))return true;
 if(check){await checkRights(message.chat.id);return true}
 if(help){
  await tell(message.chat.id,'📢 YAD · Публикация в канале\n\n'+
   'Отправьте сюда выбранную картинку как фото с подписью /publish.\n'+
   'Бот опубликует её с приветствием и кнопкой магазина, затем попробует закрепить.\n\n'+
   'Проверить права: /channelcheck');
  return true;
 }
 if(bare){await tell(message.chat.id,'Отправьте картинку именно как фото с подписью /publish.');return true}
 await publishPhoto(message);
 return true;
}
module.exports={handleChannelAdminMessage};
