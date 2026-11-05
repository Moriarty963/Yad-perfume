const {neon}=require('@neondatabase/serverless');
const {issueToken}=require('../lib/order-status-token.js');
const prices={6:500,10:700,20:1300,30:1800,50:2700,100:5000};
const {YAD_CATALOG_ROWS}=require('../catalog-data.js');
const {adminId}=require('../lib/yad-telegram-admin');
const allowed=new Set(YAD_CATALOG_ROWS.map(([id])=>id));
const fee=250;
const travelSurcharge={6:90,10:90};
const travelColors=new Set(['Чёрный','Белый мрамор','Серый мрамор']);
const perfumeNames=Object.fromEntries(YAD_CATALOG_ROWS.map(([id,name])=>[id,name]));
perfumeNames.discovery='Discovery Set';
perfumeNames['gift-set']='YAD Gift Set · 3 × 20 мл';
function telegramEscape(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function rub(n){return new Intl.NumberFormat('ru-RU').format(n)+' ₽'}
async function notifyTelegram(order,b,items){
 const token=process.env.YAD_TELEGRAM_BOT_TOKEN,chat=process.env.YAD_TELEGRAM_CHAT_ID;
 if(!token||!chat)return;
 const lines=[
  '🛍 <b>НОВЫЙ ЗАКАЗ · YAD</b>',
  '<code>№ '+telegramEscape(String(order.public_id).slice(0,8).toUpperCase())+'</code>',
  '',
  '🧴 <b>ТОВАРЫ</b>'
 ];
 for(const item of items){
  const name=perfumeNames[item.id]||item.title;
  lines.push('• '+telegramEscape(name)+(item.ml?' · '+item.ml+' мл':'')+(item.variant==='travel'?' · Travel / '+telegramEscape(item.color):'')+' × '+item.qty);
  if(item.id==='gift-set')lines.push('   Состав: '+item.scents.map(id=>telegramEscape(perfumeNames[id]||id)).join(' · '));
  lines.push('   '+rub(item.unit_price*item.qty));
 }
 lines.push(
  '',
  '💰 <b>ОПЛАТА</b>',
  'Товары: '+rub(order.subtotal_rub),
  'Доставка: '+(Number(order.delivery_rub)===0?'Бесплатно':rub(order.delivery_rub)),
  '<b>Итого: '+rub(order.total_rub)+'</b>',
  '',
  '👤 <b>ПОКУПАТЕЛЬ</b>',
  telegramEscape(b.name.trim()),
  'Связь: '+(b.method==='whatsapp'?'WhatsApp':'Telegram'),
  '<code>'+telegramEscape(b.contact.trim())+'</code>',
  ...(b.method==='telegram'&&validPhone(b.phone)&&b.phone.trim()!==b.contact.trim()?['Телефон для связи: <code>'+telegramEscape(b.phone.trim())+'</code>']:[]),
  '',
  '📦 <b>ДОСТАВКА</b>',
  telegramEscape(b.delivery),
  telegramEscape(b.address.trim())
 );
 if(b.comment.trim())lines.push('','💬 <b>КОММЕНТАРИЙ</b>',telegramEscape(b.comment.trim()));
 // Telegram actions are restricted to a private administrator, never a group.
 const allowed=adminId();
 const markup=allowed!==null&&String(chat)===String(allowed)?{inline_keyboard:[[{text:'📋 Открыть заказ',callback_data:'ya:order:'+order.public_id}]]}:null;
 try{
  const response=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({chat_id:chat,text:lines.join('\n'),parse_mode:'HTML',disable_web_page_preview:true,...(markup?{reply_markup:markup}:{})}),
   signal:AbortSignal.timeout(3500)
  });
  if(!response.ok)console.error('YAD notification failed',response.status);
 }catch(e){console.error('YAD notification unavailable',e?.message)}
}
function validText(v,max){return typeof v==='string'&&v.trim().length>0&&v.trim().length<=max}
function validPhone(v){return typeof v==='string'&&/^\+?[\d\s()\-]{10,25}$/.test(v.trim())&&v.replace(/\D/g,'').length>=10&&v.replace(/\D/g,'').length<=15}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
 if(!process.env.DATABASE_URL)return res.status(503).json({error:'Оформление заказов пока настраивается. Выберите WhatsApp или Telegram.'});
 try{
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(!validText(b.name,100)||!validText(b.contact,150)||!validText(b.address,350)||!['telegram','whatsapp'].includes(b.method)||!['Wildberries','Ozon'].includes(b.delivery)||typeof b.comment!=='string'||b.comment.length>500)return res.status(400).json({error:'Проверьте данные покупателя и доставки.'});
  if(b.method==='telegram'&&!validPhone(b.contact)&&!/^@[A-Za-z0-9_]{5,32}$/.test(b.contact.trim()))return res.status(400).json({error:'Укажите телефон для связи. Telegram можно подключить после заказа.'});
  if(b.method==='whatsapp'&&!validPhone(b.contact))return res.status(400).json({error:'Укажите корректный номер телефона для WhatsApp.'});
  if(b.phone!==undefined&&!validPhone(b.phone))return res.status(400).json({error:'Укажите корректный номер телефона покупателя.'});
  if(!Array.isArray(b.items)||b.items.length<1||b.items.length>30)return res.status(400).json({error:'Добавьте товары в корзину.'});
  let subtotal=0;
  const items=[];
  for(const x of b.items){
   if(!x||!Number.isInteger(x.qty)||x.qty<1||x.qty>30)return res.status(400).json({error:'Неверное количество.'});
   let price,title,ml,variant='glass',color=null;
   if(x.id==='discovery'){price=990;title='Discovery Set';ml=0}
   else if(x.id==='gift-set'){
    if(!Array.isArray(x.scents)||x.scents.length!==3||!x.scents.every(id=>typeof id==='string'&&allowed.has(id)))
     return res.status(400).json({error:'Для подарочного набора выберите три аромата из каталога YAD.'});
    price=4900;title='YAD Gift Set · 3 × 20 мл';ml=0;variant='gift';
   }
   else if(allowed.has(x.id)&&Number.isInteger(x.ml)&&prices[x.ml]){ml=x.ml;variant=x.variant||'glass';if(!['glass','travel'].includes(variant))return res.status(400).json({error:'Неверное исполнение флакона.'});if(variant==='travel'){if(!travelSurcharge[ml]||!travelColors.has(x.color))return res.status(400).json({error:'Недоступный Travel флакон или цвет.'});color=x.color}price=prices[ml]+(variant==='travel'?travelSurcharge[ml]:0);title=x.id}
   else return res.status(400).json({error:'Некорректный товар.'});
   subtotal+=price*x.qty;
   items.push({id:x.id,title,ml,variant,color,qty:x.qty,unit_price:price,...(x.id==='gift-set'?{scents:x.scents.slice()}: {})});
  }
  if(subtotal>1000000)return res.status(400).json({error:'Слишком большая сумма заказа.'});
  const orderDeliveryFee=items.some(item=>item.ml===100)?0:fee;
  const sql=neon(process.env.DATABASE_URL);
  const rows=await sql`INSERT INTO yad_orders (customer_name,customer_phone,contact_method,contact_value,delivery_service,pickup_address,comment,items,subtotal_rub,delivery_rub,total_rub) VALUES (${b.name.trim()},${validPhone(b.phone)?b.phone.trim():(validPhone(b.contact)?b.contact.trim():null)},${b.method},${b.contact.trim()},${b.delivery},${b.address.trim()},${b.comment.trim()},${JSON.stringify(items)}::jsonb,${subtotal},${orderDeliveryFee},${subtotal+orderDeliveryFee}) RETURNING public_id,created_at,subtotal_rub,delivery_rub,total_rub`;
  await notifyTelegram(rows[0],b,items);return res.status(201).json({order_id:rows[0].public_id,total:rows[0].total_rub,status_token:issueToken(rows[0].public_id)});
 }catch(e){console.error('YAD order submission failed',e?.message);return res.status(500).json({error:'Не удалось сохранить заказ. Попробуйте ещё раз.'})}
};