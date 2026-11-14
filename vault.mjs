import {encodeSetup,applySetup} from './share.mjs';

const PREFIX='locked1.';
const ITERATIONS=600000;
const b64=bytes=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));

export function isVault(value){return typeof value==='string'&&value.startsWith(PREFIX)&&value.length<6000000;}
async function derive(password,salt){
  if(typeof password!=='string'||password.length<8)throw new Error('Passwort nicht erkannt.');
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function createVault(state,password){
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const key=await derive(password,salt);
  return {cipher:await sealVault(state,key,salt),key,salt};
}
export async function sealVault(state,key,salt){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const plaintext=unb64(encodeSetup(state));
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('StefanBudget2027-v1')},key,plaintext));
  const bytes=new Uint8Array(28+encrypted.length);bytes.set(salt);bytes.set(iv,16);bytes.set(encrypted,28);
  return PREFIX+b64(bytes);
}
export async function openVault(template,cipher,password){
  if(!isVault(cipher)||!/^[A-Za-z0-9_-]+$/.test(cipher.slice(PREFIX.length)))throw new Error('Kein gültiger geschützter Budgetstand.');
  const bytes=unb64(cipher.slice(PREFIX.length));if(bytes.length<45)throw new Error('Der Budgetstand ist unvollständig.');
  const salt=bytes.slice(0,16),iv=bytes.slice(16,28),key=await derive(password,salt);
  let plaintext;
  try{plaintext=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('StefanBudget2027-v1')},key,bytes.slice(28)));}
  catch{throw new Error('Passwort nicht erkannt oder Budgetdatei beschädigt.');}
  return {state:applySetup(template,b64(plaintext)),key,salt};
}
