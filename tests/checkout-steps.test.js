'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

test('two-step checkout keeps cart and customer fields intact and updates delivered total',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 const start=code.indexOf("let checkoutStep='review';");
 const end=code.indexOf('function renderCart(){',start);
 assert.ok(start>=0&&end>start,'two-step checkout implementation exists');
 const elements=Object.fromEntries([
  'orderReceipt','cartStepTitle','cartItems','cartActions','cartReviewBar',
  'checkoutPanel','cartReviewCount','cartReviewShipping','cartReviewTotal',
  'checkoutReview','customerName'
 ].map(id=>[id,{hidden:false,textContent:'',open:true,value:''}]));
 elements.orderReceipt.hidden=true;
 elements.customerName.value='Покупатель';
 const sandbox={
  cart:[{id:'bibliotheque',ml:20,qty:1,price:1300}],
  document:{body:{dataset:{}}},
  $:id=>elements[id],
  rub:value=>value+' ₽',
  cartDeliveryFee:items=>items.length&&items.some(x=>x.ml===100)?0:(items.length?250:0),
  window:{matchMedia:()=>({matches:true}),scrollTo:()=>{}},
  currentPage:()=> 'cart'
 };
 const ui=vm.runInNewContext(code.slice(start,end)+'\n({setCheckoutStep,getStep:()=>checkoutStep})',sandbox);
 ui.setCheckoutStep('review',{scroll:false});
 assert.equal(elements.cartReviewBar.hidden,false);
 assert.equal(elements.checkoutPanel.hidden,true);
 assert.equal(elements.cartReviewTotal.textContent,'1550 ₽');
 assert.equal(elements.cartReviewShipping.textContent,'Доставка · 250 ₽');
 assert.equal(ui.getStep(),'review');

 ui.setCheckoutStep('details',{scroll:false});
 assert.equal(elements.cartReviewBar.hidden,true);
 assert.equal(elements.cartItems.hidden,true);
 assert.equal(elements.cartActions.hidden,true);
 assert.equal(elements.checkoutPanel.hidden,false);
 assert.equal(elements.checkoutReview.open,false);
 assert.equal(elements.customerName.value,'Покупатель');

 ui.setCheckoutStep('review',{scroll:false});
 assert.equal(elements.checkoutPanel.hidden,true);
 assert.equal(elements.customerName.value,'Покупатель');

 sandbox.cart[0].ml=100;sandbox.cart[0].price=5000;
 ui.setCheckoutStep('review',{scroll:false});
 assert.equal(elements.cartReviewShipping.textContent,'Бесплатная доставка');
 assert.equal(elements.cartReviewTotal.textContent,'5000 ₽');

 sandbox.cart.splice(0);elements.orderReceipt.hidden=false;
 ui.setCheckoutStep('receipt',{scroll:false});
 assert.equal(ui.getStep(),'receipt');
 assert.equal(elements.cartItems.hidden,true);
 assert.equal(elements.cartReviewBar.hidden,true);
 assert.equal(elements.checkoutPanel.hidden,true);
 assert.equal(elements.cartStepTitle.textContent,'Заказ оформлен');
});
test('checkout remains submitted only via the existing /api/orders validation path',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 const markup=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(app,/if\(!buildOrder\(\)\)return/);
 assert.match(app,/fetch\('\/api\/orders'/);
 assert.match(app,/setCheckoutStep\('receipt',\{scroll:false\}\)/);
 assert.match(markup,/id="cartContinueCheckout"/);
 assert.match(markup,/id="cartBackToReview"/);
 assert.match(markup,/id="checkoutPanel" hidden/);
});

test('add-to-cart toast offers an optional button without forcing navigation',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 const start=app.indexOf('function notify(message,cartAction=false){');
 const end=app.indexOf('function add(',start);
 assert.ok(start>=0&&end>start);
 const element={hidden:true,children:[],classList:{styles:new Set(),toggle(name,on){if(on)this.styles.add(name);else this.styles.delete(name)}},replaceChildren(...items){this.children=[...items]},append(child){this.children.push(child)}};
 const visited=[];
 const sandbox={
  $:id=>id==='toast'?element:null,
  document:{createElement:tag=>({tag,textContent:'',attrs:{},handlers:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this.handlers[k]=fn}})},
  clearTimeout:()=>{},setTimeout:()=>101,
  navigate:page=>visited.push(page)
 };
 const {notify}=vm.runInNewContext(app.slice(start,end)+'\n({notify})',sandbox);
 notify('Добавлено в корзину · 1 шт.',true);
 assert.equal(element.hidden,false);
 assert.equal(element.children.length,2);
 assert.equal(element.children[1].textContent,'В корзину →');
 assert.equal(visited.length,0,'adding does not force navigation');
 element.children[1].handlers.click();
 assert.equal(element.hidden,true);
 assert.equal(visited[0],'cart');
 notify('Аромат сохранён в избранном');
 assert.equal(element.children.length,1);
 assert.equal(element.classList.styles.has('toast-with-cart-link'),false);
 const styles=fs.readFileSync(path.join(__dirname,'../style.css'),'utf8');
 assert.match(styles,/\.toast\.toast-with-cart-link\[hidden\]\{display:none!important\}/);
});
