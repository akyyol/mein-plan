export const MIN_YEAR=2027,MAX_YEAR=2080;
export const MONTHS=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
export const periods={month:{months:1,label:'monatlich'},quarter:{months:3,label:'vierteljährlich'},halfyear:{months:6,label:'halbjährlich'},year:{months:12,label:'jährlich'},once:{months:0,label:'einmalig'}};
export const money=cents=>new Intl.NumberFormat('de-CH',{style:'currency',currency:'CHF'}).format(cents/100);
export const cents=amount=>Math.round(amount*100);
export function parseAmount(raw,{signed=false}={}){
  if(raw==null||String(raw).trim()==='')return null;
  const cleaned=String(raw).trim().replace(/[’'\s]/g,'').replace(',','.');
  if(!(signed?/^-?\d+(?:\.\d{0,2})?$/:/^\d+(?:\.\d{0,2})?$/).test(cleaned))throw new Error('Bitte einen gültigen Betrag mit höchstens zwei Nachkommastellen eingeben.');
  const n=Number(cleaned);if(!Number.isFinite(n)||Math.abs(n)>10000000)throw new Error('Bitte den Betrag prüfen.');return Math.round(n*100)/100;
}
export function dateParts(value){
  if(typeof value!=='string')return null;const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);if(!m)return null;
  const [y,mo,d]=m.slice(1).map(Number),date=new Date(Date.UTC(y,mo-1,d));
  if(y<MIN_YEAR||y>MAX_YEAR||date.getUTCFullYear()!==y||date.getUTCMonth()!==mo-1||date.getUTCDate()!==d)return null;return {y,m:mo,d,ms:date.getTime()};
}
export const daysInMonth=(y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate();
export const isoDate=(y,m,d)=>`${y}-${String(m).padStart(2,'0')}-${String(Math.min(d,daysInMonth(y,m))).padStart(2,'0')}`;
export const shortDate=value=>value?new Intl.DateTimeFormat('de-CH',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')):'Datum offen';
export function blankPlan(year){return {year,salaryMonthly:0,salaryExtra:0,salaryDay:null,bonusDate:'',balanceDate:`${year}-01-01`,openingBalance:null,healthProvider:'',healthSupplemental:'',taxEstimate:null,categories:['Alltag'],rows:[],trash:[]};}
export const getPlan=(state,year=state.year)=>state.plans[String(year)];
const oldMonth=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value||'')?value:'';
function migrateRow(row,year){
  const from=oldMonth(row.from),to=oldMonth(row.to),last=to?`${to}-${daysInMonth(Number(to.slice(0,4)),Number(to.slice(5)))}`:'';
  const result={id:row.id,label:row.label,group:row.group||'Weitere Ausgaben',amount:row.amount??null,period:row.period||'month',dueDate:row.dueDate||(from?from+'-01':''),endDate:row.endDate||last,note:row.note||'',dateAssumed:Boolean(from&&!row.dueDate)};
  if(row.kind){result.kind=row.kind;result.units=row.units;}
  if(row.id==='dentist'){result.dentalGross=row.dentalGross??null;result.dentalReimbursement=row.dentalReimbursement??null;}
  if(!row.id.startsWith('custom-')&&!row.id.startsWith('lease-')&&from===`${year}-01`&&to===`${year}-12`)result.legacyYearEnd=true;
  if(row.id==='tax-reserve')result.note='Geplante Überweisung auf ein separates Rücklagenkonto. Eine spätere Steuerrechnung aus demselben Konto nicht doppelt erfassen.';
  return result;
}
export function migrateLegacy(old){
  const year=Number(old.year)||MIN_YEAR,plan=blankPlan(year);
  Object.assign(plan,{salaryMonthly:old.salaryMonthly||0,salaryExtra:old.salaryExtra||0,healthProvider:old.healthProvider||'',healthSupplemental:old.healthSupplemental||'',taxEstimate:old.taxEstimate||null,rows:(old.rows||[]).map(r=>migrateRow(r,year))});
  plan.bonusDate=old.bonusMonth?isoDate(year,old.bonusMonth,daysInMonth(year,old.bonusMonth)):'';plan.bonusDateAssumed=Boolean(old.bonusMonth);
  plan.categories=[...new Set(plan.rows.map(r=>r.group))];if(!plan.categories.length)plan.categories=['Alltag'];
  return validateState({schema:2,year,plans:{[year]:plan},migratedFromSchema:1});
}
function validMoney(value,signed=false){return typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=10000000&&(signed||value>=0);}
function validateRow(row,ids,categories){
  if(!row||typeof row.id!=='string'||!/^[a-z0-9_-]{1,80}$/.test(row.id)||ids.has(row.id))throw new Error('Ein Posten ist ungültig oder doppelt.');ids.add(row.id);
  if(typeof row.label!=='string'||!row.label.trim()||row.label.length>120||typeof row.group!=='string'||!row.group.trim()||row.group.length>80)throw new Error('Bitte eine gültige Bezeichnung und Kategorie eingeben.');
  if(!categories.includes(row.group))categories.push(row.group);
  if(row.amount!==null&&!validMoney(row.amount))throw new Error('Ein Betrag ist ungültig.');
  if(!periods[row.period])throw new Error('Der Zahlungsrhythmus ist ungültig.');
  if(row.kind&&!['fuel','smoking'].includes(row.kind))throw new Error('Die Postenart ist ungültig.');
  if(row.kind&&(!Number.isFinite(row.units)||row.units<=0||row.units>10000))throw new Error('Bitte eine Anzahl grösser als 0 eingeben.');
  if((row.dueDate&&!dateParts(row.dueDate))||(row.endDate&&!dateParts(row.endDate)))throw new Error('Bitte ein gültiges Datum zwischen 2027 und 2080 eingeben.');
  if(row.dueDate&&row.endDate&&row.endDate<row.dueDate)throw new Error('Das Ende liegt vor der ersten Zahlung.');
  if(row.note!==undefined&&(typeof row.note!=='string'||row.note.length>2000))throw new Error('Die Notiz ist ungültig.');
  for(const key of ['dentalGross','dentalReimbursement'])if(row[key]!=null&&!validMoney(row[key]))throw new Error('Eine Zahnarztangabe ist ungültig.');
  if(row.id==='dentist'&&row.dentalGross!=null&&row.dentalReimbursement!=null&&(row.dentalReimbursement>row.dentalGross||cents(row.amount)!==cents(row.dentalGross-row.dentalReimbursement)))throw new Error('Der Eigenanteil für die Zahnreinigung stimmt nicht.');
}
export function validateState(input){
  if(input?.schema===1)return migrateLegacy(input);
  if(!input||input.schema!==2||!Number.isInteger(input.year)||input.year<MIN_YEAR||input.year>MAX_YEAR||!input.plans||typeof input.plans!=='object'||Array.isArray(input.plans)||Object.keys(input.plans).length>54)throw new Error('Diese Datei ist kein gültiger Plan für 2027–2080.');
  if(!input.plans[String(input.year)])throw new Error('Das ausgewählte Jahr fehlt.');
  for(const [key,p]of Object.entries(input.plans)){
    if(!/^\d{4}$/.test(key)||Number(key)<MIN_YEAR||Number(key)>MAX_YEAR||p.year!==Number(key))throw new Error('Ein Planjahr ist ungültig.');
    if(!validMoney(p.salaryMonthly)||!validMoney(p.salaryExtra))throw new Error('Ein Einkommen ist ungültig.');
    if(p.salaryDay!==null&&(!Number.isInteger(p.salaryDay)||p.salaryDay<1||p.salaryDay>31))throw new Error('Bitte einen Lohntag zwischen 1 und 31 angeben.');
    if(p.openingBalance!==null&&!validMoney(p.openingBalance,true))throw new Error('Der Kontostand ist ungültig.');
    if(!dateParts(p.balanceDate)||Number(p.balanceDate.slice(0,4))!==p.year)throw new Error('Das Kontostand-Datum muss im ausgewählten Planjahr liegen.');
    if(p.bonusDate&&(!dateParts(p.bonusDate)||Number(p.bonusDate.slice(0,4))!==p.year))throw new Error('Das Datum des Zusatzlohns muss im Planjahr liegen.');
    for(const field of ['healthProvider','healthSupplemental'])if(p[field]!==undefined&&(typeof p[field]!=='string'||p[field].length>160))throw new Error('Eine Versicherungsbezeichnung ist ungültig.');
    if(!Array.isArray(p.rows)||p.rows.length>250||!Array.isArray(p.categories)||p.categories.length>100||!Array.isArray(p.trash)||p.trash.length>250)throw new Error('Zu viele Posten oder Kategorien.');
    if(p.categories.some(c=>typeof c!=='string'||!c.trim()||c.length>80)||new Set(p.categories).size!==p.categories.length)throw new Error('Eine Kategorie ist leer oder doppelt.');
    const ids=new Set();for(const row of p.rows)validateRow(row,ids,p.categories);
    for(const item of p.trash){if(!item||!item.row)throw new Error('Ein Papierkorbeintrag ist ungültig.');validateRow(item.row,new Set(),[]);}
  }return input;
}
export const openRows=plan=>plan.rows.filter(r=>r.amount===null);
export const undatedRows=plan=>plan.rows.filter(r=>r.amount>0&&!r.dueDate);
export function rowEvents(row,year){
  if(row.amount==null||row.amount===0||!row.dueDate)return [];
  const anchor=dateParts(row.dueDate);if(!anchor)return [];const yearStart=Date.UTC(year,0,1),yearEnd=Date.UTC(year,11,31),last=row.endDate?dateParts(row.endDate).ms:Date.UTC(MAX_YEAR,11,31),events=[];
  const add=(date,amount)=>events.push({date,id:row.id,label:row.label,group:row.group,amount:-amount,type:'expense',assumed:Boolean(row.dateAssumed)});
  if(row.kind==='smoking'){
    const start=Math.max(yearStart,anchor.ms),end=Math.min(yearEnd,last),daily=cents(row.amount)/row.units;
    for(let day=start;day<=end;day+=86400000){const i=Math.round((day-anchor.ms)/86400000),amount=Math.round((i+1)*daily)-Math.round(i*daily);if(amount)add(new Date(day).toISOString().slice(0,10),amount);}return events;
  }
  const amount=cents(row.amount)*(row.kind==='fuel'?row.units:1),interval=periods[row.kind==='fuel'?'month':row.period].months;
  if(!interval){if(anchor.ms>=yearStart&&anchor.ms<=yearEnd&&anchor.ms<=last)add(row.dueDate,Math.round(amount));return events;}
  const startIndex=anchor.y*12+anchor.m-1,minIndex=year*12;let i=startIndex+Math.max(0,Math.ceil((minIndex-startIndex)/interval))*interval;
  for(;i<year*12+12;i+=interval){const y=Math.floor(i/12),m=i%12+1,date=isoDate(y,m,anchor.d),ms=dateParts(date).ms;if(ms>=anchor.ms&&ms<=last)add(date,Math.round(amount));}return events;
}
export function planEvents(plan){
  const events=plan.rows.flatMap(row=>rowEvents(row,plan.year));
  if(plan.salaryMonthly>0)for(let m=1;m<=12;m++)events.push({date:isoDate(plan.year,m,plan.salaryDay||daysInMonth(plan.year,m)),id:'salary',label:'Lohn',group:'Einkommen',amount:cents(plan.salaryMonthly),type:'income',assumed:plan.salaryDay===null});
  if(plan.salaryExtra>0&&plan.bonusDate)events.push({date:plan.bonusDate,id:'extra-salary',label:'Zusätzlicher Lohn',group:'Einkommen',amount:cents(plan.salaryExtra),type:'income',assumed:Boolean(plan.bonusDateAssumed)});
  return events.sort((a,b)=>a.date.localeCompare(b.date)||b.amount-a.amount||a.label.localeCompare(b.label));
}
export function forecast(plan){
  const events=planEvents(plan),days=new Map();for(const event of events){if(!days.has(event.date))days.set(event.date,[]);days.get(event.date).push(event);}
  let balance=plan.openingBalance===null?null:cents(plan.openingBalance);const months=[];
  for(let month=1;month<=12;month++){
    const first=isoDate(plan.year,month,1),last=isoDate(plan.year,month,daysInMonth(plan.year,month)),before=last<plan.balanceDate,from=first<plan.balanceDate?plan.balanceDate:first;
    const result={month,from,before,start:before?null:balance,end:null,min:before?null:balance,minDate:from,income:0,costs:0,days:[]};
    for(const [date,items]of days){if(date<first||date>last)continue;const included=!before&&date>=plan.balanceDate,income=items.filter(e=>e.amount>0).reduce((s,e)=>s+e.amount,0),costs=items.filter(e=>e.amount<0).reduce((s,e)=>s-e.amount,0);
      if(included){result.income+=income;result.costs+=costs;if(balance!==null){balance+=income-costs;if(balance<result.min){result.min=balance;result.minDate=date;}}}
      result.days.push({date,items,income,costs,included,balance:included?balance:null});
    }
    if(!before)result.end=balance;months.push(result);
  }return {events,months,income:events.filter(e=>e.amount>0).reduce((s,e)=>s+e.amount,0),costs:events.filter(e=>e.amount<0).reduce((s,e)=>s-e.amount,0),missing:openRows(plan),undated:undatedRows(plan)};
}
export function copyPlan(source,year){
  const p=structuredClone(source);p.year=year;p.openingBalance=null;p.balanceDate=`${year}-01-01`;p.trash=[];p.taxEstimate=null;
  if(p.bonusDate){const d=dateParts(p.bonusDate);p.bonusDate=isoDate(year,d.m,d.d);p.bonusDateAssumed=true;}
  p.rows=p.rows.filter(row=>{if(row.period==='once')return row.dueDate&&Number(row.dueDate.slice(0,4))===year;if(row.endDate&&row.endDate<`${year}-01-01`){if(row.legacyYearEnd){row.endDate='';row.dateAssumed=true;}else return false;}return true;});return p;
}
export function removeRow(plan,id){const index=plan.rows.findIndex(r=>r.id===id);if(index<0)return;const [row]=plan.rows.splice(index,1);plan.trash.push({row,index});}
export function restoreRow(plan,id){const i=plan.trash.findIndex(x=>x.row.id===id);if(i<0)return;const [{row,index}]=plan.trash.splice(i,1);if(!plan.categories.includes(row.group))plan.categories.push(row.group);if(!plan.rows.some(r=>r.id===row.id))plan.rows.splice(Math.min(index,plan.rows.length),0,row);}
export function renameCategory(plan,oldName,newName){const name=newName.trim();if(!name||name.length>80)throw new Error('Bitte einen Kategorienamen eingeben.');if(name!==oldName&&plan.categories.includes(name))throw new Error('Diese Kategorie gibt es bereits.');plan.categories=plan.categories.map(c=>c===oldName?name:c);for(const row of plan.rows)if(row.group===oldName)row.group=name;for(const item of plan.trash)if(item.row.group===oldName)item.row.group=name;}
export function removeCategory(plan,name,target){if(name===target)throw new Error('Bitte eine andere Zielkategorie wählen.');if(!plan.categories.includes(target))plan.categories.push(target);for(const row of plan.rows)if(row.group===name)row.group=target;for(const item of plan.trash)if(item.row.group===name)item.row.group=target;plan.categories=plan.categories.filter(c=>c!==name);}
