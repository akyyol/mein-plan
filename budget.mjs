export const YEAR = 2027;
export const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
export const periods = {month:{months:1,label:'pro Monat'},quarter:{months:3,label:'pro Quartal'},halfyear:{months:6,label:'pro Halbjahr'},year:{months:12,label:'pro Jahr'},once:{months:0,label:'einmalig'}};
export const money = cents => new Intl.NumberFormat('de-CH',{style:'currency',currency:'CHF'}).format(cents/100);
export function parseAmount(raw) {
  if (raw === null || String(raw).trim() === '') return null;
  const cleaned = String(raw).trim().replace(/[’'\s]/g,'').replace(',','.');
  if (!/^\d+(?:\.\d{0,2})?$/.test(cleaned)) throw new Error('Bitte einen Betrag ab 0 mit höchstens zwei Nachkommastellen eingeben.');
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value > 10000000) throw new Error('Bitte den Betrag prüfen.');
  return Math.round(value*100)/100;
}
const monthIndex = value => {const m=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(value||'');return m?Number(m[1])*12+Number(m[2])-1:null;};
const origin = YEAR*12;
function limits(row) {return {from:monthIndex(row.from)??origin,to:monthIndex(row.to)??origin+11};}
export function isActive(row, month) {const {from,to}=limits(row);const current=origin+month-1;return current>=from&&current<=to;}
export function paymentMonths(row) {
  const {from,to}=limits(row); const interval=periods[row.period||'month']?.months??1;
  if (row.period==='once') return from>=origin&&from<=origin+11&&from<=to?[from-origin+1]:[];
  return Array.from({length:12},(_,i)=>i+1).filter(month=>{const current=origin+month-1;return current>=from&&current<=to&&(current-from)%interval===0;});
}
export function paymentCents(row, month) {
  if(row.amount===null||row.amount===undefined||!isActive(row,month)) return 0;
  if(row.kind==='smoking') return Math.round(row.amount*100*new Date(YEAR,month,0).getDate()/row.units);
  if(row.kind==='fuel') return Math.round(row.amount*100*row.units);
  return paymentMonths(row).includes(month)?Math.round(row.amount*100):0;
}
export function annualCents(row) {return Array.from({length:12},(_,i)=>paymentCents(row,i+1)).reduce((a,b)=>a+b,0);}
export function budgetCents(row, month) {
  if(row.kind==='smoking'||row.kind==='fuel'||row.period==='month') return paymentCents(row,month);
  // Spread non-monthly bills over the whole budget year; retain every cent.
  const annual=annualCents(row); return Math.floor(annual/12)+(month<=annual%12?1:0);
}
export function incomeCents(state,month) {return Math.round(state.salaryMonthly*100)+(state.bonusMonth===month?Math.round(state.salaryExtra*100):0);}
export function annualIncomeCents(state) {return Math.round(state.salaryMonthly*100)*12+Math.round(state.salaryExtra*100);}
export function monthlyTotals(state,month) {const costs=state.rows.reduce((s,row)=>s+budgetCents(row,month),0),income=incomeCents(state,month);return {income,costs,remainder:income-costs};}
export function openRows(state) {return state.rows.filter(row=>row.amount===null||row.amount===undefined);}
export function validateState(candidate) {
  if(!candidate||candidate.schema!==1||candidate.year!==YEAR||!Array.isArray(candidate.rows)||candidate.rows.length>150) throw new Error('Diese Datei ist kein passender Budgetplan 2027.');
  for(const key of ['salaryMonthly','salaryExtra']) if(typeof candidate[key]!=='number'||!Number.isFinite(candidate[key])||candidate[key]<0||candidate[key]>10000000) throw new Error('Die Einkommensangaben sind ungültig.');
  if(candidate.bonusMonth!==null&&(!Number.isInteger(candidate.bonusMonth)||candidate.bonusMonth<1||candidate.bonusMonth>12)) throw new Error('Der Auszahlungsmonat ist ungültig.');
  for(const key of ['healthProvider','healthSupplemental']) if(candidate[key]!==undefined&&(typeof candidate[key]!=='string'||candidate[key].length>160)) throw new Error('Die Versicherungsbezeichnung ist ungültig.');
  const ids=new Set();
  for(const row of candidate.rows) {
    if(!row||typeof row.id!=='string'||!/^[a-z0-9_-]{1,80}$/.test(row.id)||ids.has(row.id)) throw new Error('Ein Budgetposten ist ungültig.');ids.add(row.id);
    if(typeof row.label!=='string'||row.label.length>120||typeof row.group!=='string'||row.group.length>80) throw new Error('Eine Bezeichnung ist ungültig.');
    if(row.amount!==null&&(typeof row.amount!=='number'||!Number.isFinite(row.amount)||row.amount<0||row.amount>10000000)) throw new Error('Ein Betrag ist ungültig.');
    if(!periods[row.period]) throw new Error('Ein Zahlungsrhythmus ist ungültig.');
    if(row.kind&&!['fuel','smoking'].includes(row.kind)) throw new Error('Die Berechnungsart ist ungültig.');
    if(row.kind&&(!Number.isFinite(row.units)||row.units<=0||row.units>10000)) throw new Error('Die Anzahl ist ungültig.');
    if((row.from&&monthIndex(row.from)===null)||(row.to&&monthIndex(row.to)===null)) throw new Error('Ein Zahlungszeitraum ist ungültig.');
    if(row.from&&row.to&&monthIndex(row.from)>monthIndex(row.to)) throw new Error('Ein Zahlungszeitraum endet vor seinem Beginn.');
    if(row.note!==undefined&&(typeof row.note!=='string'||row.note.length>2000)) throw new Error('Eine Notiz ist ungültig.');
    for(const key of ['dentalGross','dentalReimbursement']) if(row[key]!==undefined&&row[key]!==null&&(typeof row[key]!=='number'||!Number.isFinite(row[key])||row[key]<0||row[key]>10000000)) throw new Error('Ein Betrag zur Zahnreinigung ist ungültig.');
    if(row.id==='dentist'&&row.dentalGross!=null&&row.dentalReimbursement!=null&&(row.dentalReimbursement>row.dentalGross||Math.round(row.amount*100)!==Math.round((row.dentalGross-row.dentalReimbursement)*100))) throw new Error('Der Eigenanteil für die Zahnreinigung stimmt nicht.');
  }
  return candidate;
}
