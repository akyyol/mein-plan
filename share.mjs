import {validateState} from './budget.mjs';

export function encodeSetup(state){
  validateState(state);
  const payload={v:1,s:state.salaryMonthly,e:state.salaryExtra,b:state.bonusMonth,h:[state.healthProvider||'',state.healthSupplemental||''],t:state.taxEstimate||null,r:state.rows.map(row=>{
    if(row.id.startsWith('custom-'))return row;
    const item=[row.id,row.amount,row.period],extra={};
    if(row.from==='2027-01'&&row.to==='2027-12')extra.y=1;
    else if(row.from||row.to){extra.f=row.from||'';extra.t=row.to||'';}
    if(row.kind)extra.u=row.units;
    if(row.dentalGross!=null)extra.g=row.dentalGross;
    if(row.dentalReimbursement!=null)extra.c=row.dentalReimbursement;
    if(Object.keys(extra).length)item.push(Object.keys(extra).length===1&&extra.y?1:extra);
    return item;
  })};
  const bytes=new TextEncoder().encode(JSON.stringify(payload));
  return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

export function applySetup(template,token){
  if(typeof token!=='string'||token.length>25000||!/^[A-Za-z0-9_-]+$/.test(token))throw new Error('Ungültiger Einrichtungslink.');
  const bytes=Uint8Array.from(atob(token.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  const p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(p.v!==1||!Array.isArray(p.r)||p.r.length>150||!Array.isArray(p.h)||p.h.length!==2)throw new Error('Ungültige Ausgangswerte.');
  const state=structuredClone(template);state.salaryMonthly=p.s;state.salaryExtra=p.e;state.bonusMonth=p.b;state.healthProvider=p.h[0];state.healthSupplemental=p.h[1];state.taxEstimate=p.t||null;
  if(state.taxEstimate)for(const key of ['salaryAnnual','lowAnnual','highAnnual'])if(typeof state.taxEstimate[key]!=='number'||!Number.isFinite(state.taxEstimate[key])||state.taxEstimate[key]<0||state.taxEstimate[key]>10000000)throw new Error('Ungültige Steuerangaben.');
  const seen=new Set();
  for(const item of p.r){
    if(!Array.isArray(item)){
      if(!item||typeof item.id!=='string'||!item.id.startsWith('custom-'))throw new Error('Ungültiger eigener Posten.');
      if(seen.has(item.id))throw new Error('Doppelter Posten.');seen.add(item.id);state.rows.push(item);continue;
    }
    const [id,amount,period,extra]=item;const info=extra===1?{y:1}:extra||{};
    if(seen.has(id))throw new Error('Doppelter Posten.');seen.add(id);
    const row=state.rows.find(r=>r.id===id);if(!row)throw new Error('Unbekannter Budgetposten.');
    Object.assign(row,{amount,period,from:info.y?'2027-01':info.f||'',to:info.y?'2027-12':info.t||''});if(row.kind)row.units=info.u??row.units;
    if(id==='dentist')Object.assign(row,{dentalGross:info.g??null,dentalReimbursement:info.c??null});
  }
  return validateState(state);
}
