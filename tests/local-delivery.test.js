'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const file=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('checkout offers local courier delivery and describes a street address',()=>{
 const html=file('index.html');
 const js=file('app.js');
 const api=file('api/orders.js');
 assert.match(html,/name="deliveryService" value="Курьер по Хасавюрту"/);
 assert.match(html,/id="deliveryAddressLabel"/);
 assert.match(html,/id="deliveryExplainer"/);
 assert.match(js,/\['Wildberries','Ozon','Курьер по Хасавюрту'\]\.includes\(delivery\)/);
 assert.match(api,/\['Wildberries','Ozon','Курьер по Хасавюрту'\]\.includes\(b\.delivery\)/);
 assert.match(api,/const destination=b\.delivery==='Курьер по Хасавюрту'/);
 assert.match(js,/delivery:\['Wildberries','Ozon','Курьер по Хасавюрту'\]\.includes\(value\.delivery\)/);
});
test('courier order address includes Khasavyurt exactly once',()=>{
 const api=file('api/orders.js');
 const start=api.indexOf('function courierAddress(address){');
 const end=api.indexOf('async function notifyTelegram(',start);
 assert.ok(start>=0&&end>start);
 const fn=vm.runInNewContext(api.slice(start,end)+'\ncourierAddress', {});
 assert.equal(fn('улица Датуева, дом 12'),'г. Хасавюрт, улица Датуева, дом 12');
 assert.equal(fn('г. Хасавюрт, улица Датуева, дом 12'),'г. Хасавюрт, улица Датуева, дом 12');
 assert.equal(fn('Хасавюрт, улица Датуева, дом 12'),'Хасавюрт, улица Датуева, дом 12');
});

test('switching from pickup to courier updates form labels and clears the old address',()=>{
 const source=file('app.js');
 const begin=source.indexOf('// Marketplace choices are pickup locations, not stores.');
 const end=source.indexOf('const contactMethods=[...document.querySelectorAll(',begin);
 assert.ok(begin>0&&end>begin);
 const input={value:'Озон, улица А',placeholder:'',attributes:{},setAttribute(k,v){this.attributes[k]=v}};
 const fields={
  customerAddress:input,
  pickupServiceHint:{textContent:''},
  deliveryAddressLabel:{textContent:''},
  deliveryExplainer:{textContent:''}
 };
 let delivery='Wildberries';
 const handlers=[];
 const context={
  document:{
   querySelector:()=>({value:delivery}),
   querySelectorAll:()=>[{addEventListener:(_,callback)=>handlers.push(callback)}]
  },
  $:id=>fields[id],
  clearCheckoutFieldIssue:()=>{}
 };
 vm.runInNewContext(source.slice(begin,end),context);
 assert.match(fields.pickupServiceHint.textContent,/Wildberries/);
 delivery='Курьер по Хасавюрту';
 handlers[0]();
 assert.equal(input.value,'');
 assert.equal(input.placeholder,'Улица, дом, квартира, подъезд');
 assert.equal(fields.deliveryAddressLabel.textContent,'Адрес доставки по Хасавюрту');
 assert.match(fields.deliveryExplainer.textContent,/в пределах города Хасавюрт/);
 delivery='Ozon';handlers[0]();
 assert.match(fields.pickupServiceHint.textContent,/Ozon/);
 assert.match(fields.deliveryExplainer.textContent,/пункт выдачи/);
});
