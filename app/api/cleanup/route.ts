import {NextRequest,NextResponse} from 'next/server';
import {equal,env} from '@/lib/security';
import {listCases,saveCase,withCaseLock,audit} from '@/lib/store';
import {stop} from '@/lib/cloud';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(req:NextRequest){try{if(!equal(req.headers.get('authorization')??'','Bearer '+env('CRON_SECRET')))return NextResponse.json({error:'UNAUTHORIZED'},{status:401});const stale=(await listCases()).filter(c=>c.run&&!c.run.browserStopped&&Date.now()-Date.parse(c.updatedAt)>15*60*1000).slice(0,5);const outcomes=[];for(const c of stale){try{await withCaseLock(c.id,async()=>{await stop(c);await saveCase(c);await audit('cloud.idle_cleanup',c.id);});outcomes.push({id:c.id,stopped:true});}catch{outcomes.push({id:c.id,stopped:false});}}return NextResponse.json({outcomes},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'CLEANUP_UNAVAILABLE'},{status:503});}}
