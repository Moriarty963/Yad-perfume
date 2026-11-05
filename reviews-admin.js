'use strict';
(function(){
 const dashboard=document.getElementById('dashboard');
 if(!dashboard)return;
 const panel=document.createElement('section');
 panel.className='yad-admin-reviews';
 panel.innerHTML='<div class="yad-admin-reviews-head"><div><h2>Отзывы покупателей</h2><p>Публикуются только после вашей проверки. Имя, фото и текст увидят все посетители.</p></div><div><select id="reviewAdminFilter" aria-label="Статус отзывов"><option value="pending">На проверке</option><option value="approved">Опубликованы</option><option value="rejected">Отклонены</option></select><button type="button" id="reviewAdminRefresh">Обновить</button></div></div><p id="reviewAdminStatus" role="status"></p><div id="reviewAdminList"></div>';
 const anchor=dashboard.querySelector('.toolbar');
 if(anchor)anchor.before(panel);else dashboard.append(panel);
 const css=document.createElement('style');
 css.textContent='.yad-admin-reviews{margin:28px 0 36px;padding:22px;border:1px solid #373a36;background:#1b1e1c;border-radius:8px}.yad-admin-reviews-head{display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap;align-items:center}.yad-admin-reviews h2{margin:0 0 5px;font:500 22px Georgia,serif;color:#f3ede4}.yad-admin-reviews p{color:#b4ada4;margin:0 0 10px;font-size:12px}.yad-admin-reviews-head>div:last-child{display:flex;gap:8px}.yad-admin-reviews select,.yad-admin-reviews button{border:1px solid #5e5e53;background:#262b27;color:#f6f2eb;border-radius:4px;padding:10px;font-size:12px;cursor:pointer}.yad-admin-reviews button[data-review-decision="approved"]{background:#3c6049}.yad-admin-reviews button[data-review-decision="rejected"]{background:#663b38}.yad-admin-review{border-top:1px solid #363b35;padding:18px 0}.yad-admin-review .meta{font-size:12px;color:#bcb5ab;margin-bottom:10px}.yad-admin-review strong{color:#f4eddf}.yad-admin-review .body{white-space:pre-wrap;overflow-wrap:anywhere;color:#eee2d2;font-size:13px;line-height:1.6}.yad-admin-review .images{display:flex;gap:8px;margin:10px 0}.yad-admin-review .images img{width:105px;height:105px;object-fit:cover;border-radius:4px}.yad-admin-review .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}@media(max-width:600px){.yad-admin-reviews{padding:13px}.yad-admin-reviews-head>div:last-child{width:100%;flex-wrap:wrap}}';
 document.head.append(css);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const nameMap=new Map((typeof YAD_CATALOG_ROWS==='undefined'?[]:YAD_CATALOG_ROWS).map(x=>[x[0],x[1]]));
 let rows=[],sequence=0;
 async function load(){
  if(dashboard.hidden)return;
  const seq=++sequence,filter=document.getElementById('reviewAdminFilter').value;
  document.getElementById('reviewAdminStatus').textContent='Загружаем отзывы…';
  try{
   const resp=await fetch('/api/admin?action=reviews&status='+encodeURIComponent(filter),{credentials:'same-origin'});
   const data=await resp.json().catch(()=>({}));
   if(!resp.ok)throw Error(data.error||'Не удалось загрузить отзывы.');
   if(seq!==sequence)return;
   rows=data.reviews||[];
   document.getElementById('reviewAdminStatus').textContent=rows.length?'Найдено: '+rows.length:'Отзывов с таким статусом пока нет.';
   document.getElementById('reviewAdminList').innerHTML=rows.map(r=>{
    const imgs=(Array.isArray(r.photos)?r.photos:[]).map(p=>typeof p==='string'&&p.startsWith('data:image/jpeg;base64,')?'<img src="'+esc(p)+'" alt="Фото из отзыва">':'').join('');
    const buttons='<div class="actions">'+(filter!=='approved'?'<button type="button" data-review-id="'+esc(r.id)+'" data-review-decision="approved">Опубликовать</button>':'')+(filter!=='rejected'?'<button type="button" data-review-id="'+esc(r.id)+'" data-review-decision="rejected">'+(filter==='approved'?'Снять с публикации':'Отклонить')+'</button>':'')+'</div>';
    return '<article class="yad-admin-review"><div class="meta">Заказ №'+esc(String(r.order_number).toUpperCase())+' · '+esc(nameMap.get(r.fragrance_id)||r.fragrance_id)+' · '+new Date(r.created_at).toLocaleString('ru-RU')+'</div><strong>'+esc(r.author_name)+' · '+esc(r.rating)+'/5 ★</strong><p class="body">'+esc(r.body)+'</p><div class="images">'+imgs+'</div>'+buttons+'</article>';
   }).join('');
  }catch(e){if(seq===sequence)document.getElementById('reviewAdminStatus').textContent=e.message}
 }
 document.getElementById('reviewAdminRefresh').addEventListener('click',load);
 document.getElementById('reviewAdminFilter').addEventListener('change',load);
 document.getElementById('reviewAdminList').addEventListener('click',async e=>{
  const b=e.target.closest('[data-review-decision]');if(!b)return;
  if(!confirm(b.dataset.reviewDecision==='approved'?'Опубликовать этот отзыв на сайте?':'Отклонить этот отзыв?'))return;
  b.disabled=true;
  try{
   const response=await fetch('/api/admin?action=review',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:b.dataset.reviewId,status:b.dataset.reviewDecision})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||'Ошибка сохранения.');
   load();
  }catch(err){document.getElementById('reviewAdminStatus').textContent=err.message;b.disabled=false}
 });
 let wasVisible=!dashboard.hidden;
 new MutationObserver(()=>{const visible=!dashboard.hidden;if(visible&&!wasVisible)load();wasVisible=visible}).observe(dashboard,{attributes:true,attributeFilter:['hidden']});
 if(wasVisible)load();
})();
