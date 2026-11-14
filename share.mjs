import {validateState,getPlan} from './budget.mjs';
const encode=bytes=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export function encodeSetup(state){return encode(new TextEncoder().encode(JSON.stringify({v:2,data:validateState(state)})));}
export function applySetup(template,token){
  if(typeof token!=='string'||token.length>4000000||!/^[A-Za-z0-9_-]+$/.test(token))throw new Error('Ungültiger Budgetstand.');
  const bytes=Uint8Array.from(atob(token.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)),p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(p.v===2)return validateState(p.data);
  if(p.v!==1||!Array.isArray(p.r)||p.r.length>250||!Array.isArray(p.h))throw new Error('Ungültige Ausgangswerte.');
  const base=template.schema===1?template:getPlan(template,2027)||getPlan(template);
  const old={schema:1,year:2027,salaryMonthly:p.s,salaryExtra:p.e,bonusMonth:p.b,healthProvider:p.h[0]||'',healthSupplemental:p.h[1]||'',taxEstimate:p.t||null,rows:base.rows.map(r=>({id:r.id,label:r.label,group:r.group,amount:null,period:r.period,from:'',to:'',note:r.note||'',...(r.kind?{kind:r.kind,units:r.units}:{})}))};
  const seen=new Set();for(const item of p.r){
    if(!Array.isArray(item)){if(!item||typeof item.id!=='string'||!item.id.startsWith('custom-')||seen.has(item.id))throw new Error('Ungültiger eigener Posten.');seen.add(item.id);old.rows.push(item);continue;}
    const [id,amount,period,extra]=item,info=extra===1?{y:1}:extra||{};if(seen.has(id))throw new Error('Doppelter Posten.');seen.add(id);const row=old.rows.find(r=>r.id===id);if(!row)throw new Error('Unbekannter Posten.');
    Object.assign(row,{amount,period,from:info.y?'2027-01':info.f||'',to:info.y?'2027-12':info.t||''});if(row.kind)row.units=info.u??row.units;if(id==='dentist')Object.assign(row,{dentalGross:info.g??null,dentalReimbursement:info.c??null});
  }return validateState(old);
}
