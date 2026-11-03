const {neon}=require('@neondatabase/serverless');
const prices={6:500,10:700,20:1300,30:1800,50:2700,100:5000};
const allowed=new Set(['immensite','imagination','escentric02','tygar','aventus','kirke','blackpepper','amberwood','tilia','megamare']);
const fee=250;
const perfumeNames={immensite:"L’Immensité",imagination:"Imagination",escentric02:"Escentric 02",tygar:"Tygar",aventus:"Aventus",kirke:"Kirke",blackpepper:"Black Pepper",amberwood:"Amber Wood",tilia:"Tilia",megamare:"Megamare",discovery:"Discovery Set"};
async function notifyTelegram(order,b,items){
 const token=process.env.YAD_TELEGRAM_BOT_TOKEN,chat=process.env.YAD_TELEGRAM_CHAT_ID;
 if(!token||!chat)return;
 const lines=['🛍 Новый заказ YAD','№ '+String(order.public_id).slice(0,8).toUpperCase(),'Сумма: '+order.total_rub+' ₽','','🧴 Состав заказа:'];
 for(const item of items){lines.push('• '+(perfumeNames[item.id]||item.title)+(item.ml?' · '+item.ml+' мл':'')+' × '+item.qty+' — '+(item.unit_price*item.qty)+' ₽')}
 lines.push('','Покупатель: '+b.name.trim(),'Связь: '+(b.method==='whatsapp'?'WhatsApp':'Telegram')+' · '+b.contact.trim(),'Доставка: '+b.delivery,'Пункт выдачи: '+b.address.trim());
 if(b.comment.trim())lines.push('','💬 Комментарий: '+b.comment.trim());
 try{
  const response=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text:lines.join('\\n'),disable_web_page_preview:true}),signal:AbortSignal.timeout(3500)});
  if(!response.ok)console.error('YAD notification failed',response.status);
 }catch(e){console.error('YAD notification unavailable',e?.message)}
}
function validText(v,max){return typeof v==='string'&&v.trim().length>0&&v.trim().length<=max}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
 if(!process.env.DATABASE_URL)return res.status(503).json({error:'Оформление заказов пока настраивается. Выберите WhatsApp или Telegram.'});
 try{
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(!validText(b.name,100)||!validText(b.contact,150)||!validText(b.address,350)||!['telegram','whatsapp'].includes(b.method)||!['Wildberries','Ozon'].includes(b.delivery)||typeof b.comment!=='string'||b.comment.length>500)return res.status(400).json({error:'Проверьте данные покупателя и доставки.'});
  if(b.method==='telegram'&&!/^@[A-Za-z0-9_]{5,32}$/.test(b.contact.trim()))return res.status(400).json({error:'Укажите Telegram в формате @username (от 5 символов).'});
  if(b.method==='whatsapp'&&!/^\+?[\d\s()\-]{10,25}$/.test(b.contact.trim()))return res.status(400).json({error:'Укажите номер WhatsApp.'});
  if(!Array.isArray(b.items)||b.items.length<1||b.items.length>30)return res.status(400).json({error:'Добавьте товары в корзину.'});
  let subtotal=0;
  const items=[];
  for(const x of b.items){
   if(!x||!Number.isInteger(x.qty)||x.qty<1||x.qty>30)return res.status(400).json({error:'Неверное количество.'});
   let price,title,ml;
   if(x.id==='discovery'){price=990;title='Discovery Set';ml=0}
   else if(allowed.has(x.id)&&Number.isInteger(x.ml)&&prices[x.ml]){price=prices[x.ml];title=x.id;ml=x.ml}
   else return res.status(400).json({error:'Некорректный товар.'});
   subtotal+=price*x.qty;
   items.push({id:x.id,title,ml,qty:x.qty,unit_price:price});
  }
  if(subtotal>1000000)return res.status(400).json({error:'Слишком большая сумма заказа.'});
  const sql=neon(process.env.DATABASE_URL);
  const rows=await sql`INSERT INTO yad_orders (customer_name,customer_phone,contact_method,contact_value,delivery_service,pickup_address,comment,items,subtotal_rub,delivery_rub,total_rub) VALUES (${b.name.trim()},${b.method==='whatsapp'?b.contact.trim():null},${b.method},${b.contact.trim()},${b.delivery},${b.address.trim()},${b.comment.trim()},${JSON.stringify(items)}::jsonb,${subtotal},${fee},${subtotal+fee}) RETURNING public_id,created_at,total_rub`;
  await notifyTelegram(rows[0],b,items);return res.status(201).json({order_id:rows[0].public_id,total:rows[0].total_rub});
 }catch(e){console.error('YAD order submission failed',e?.message);return res.status(500).json({error:'Не удалось сохранить заказ. Попробуйте ещё раз.'})}
};