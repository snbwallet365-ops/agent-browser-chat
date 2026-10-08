import { createCipheriv,createDecipheriv,createHmac,createHash,randomBytes,timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
export function env(name:string):string {const v=process.env[name];if(!v)throw new Error('SETUP_REQUIRED');return v;}
export function equal(a:string,b:string):boolean{return timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());}
function vaultKey(){const k=Buffer.from(env('VAULT_KEY'),'base64');if(k.length!==32)throw new Error('VAULT_SETUP_REQUIRED');return k;}
export function encrypt(value:string):string{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',vaultKey(),iv);cipher.setAAD(Buffer.from('velovisa-v1'));const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),data].map(b=>b.toString('base64url')).join('.');}
export function decrypt(value:string):string{const [iv,tag,data]=value.split('.').map(v=>Buffer.from(v,'base64url'));const cipher=createDecipheriv('aes-256-gcm',vaultKey(),iv);cipher.setAAD(Buffer.from('velovisa-v1'));cipher.setAuthTag(tag);return Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8');}
function sig(s:string){return createHmac('sha256',env('SESSION_SIGNING_SECRET')).update(s).digest('base64url');}
export function sessionToken(){const value=String(Date.now()+8*60*60*1000);return value+'.'+sig(value);}
export function authenticated(req:NextRequest){try{const [value,signature]=(req.cookies.get('velovisa_session')?.value??'').split('.');return Boolean(value&&signature&&Number(value)>Date.now()&&equal(sig(value),signature));}catch{return false;}}
export function authorize(req:NextRequest){if(!authenticated(req))throw new Error('UNAUTHORIZED');const origin=req.headers.get('origin');if(origin&&origin!==req.nextUrl.origin)throw new Error('FORBIDDEN');}
