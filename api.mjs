import {getStore} from '@netlify/blobs';
import {randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
const accounts=()=>getStore('story-accounts-v1');
const progress=()=>getStore('story-progress-v1');
const sessions=()=>getStore('story-sessions-v1');
const attempts=()=>getStore('story-attempts-v1');
const MAX_BODY=50000, DAY=86400000;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const error=(message,status=400)=>json({error:message},status);
const sha=s=>createHash('sha256').update(s).digest('hex');
const norm=s=>String(s||'').normalize('NFKC').trim().toLowerCase();
const key=s=>sha(norm(s));
const secureEq=(a,b)=>{const A=Buffer.from(sha(a)),B=Buffer.from(sha(b));return timingSafeEqual(A,B)};
const secret=()=>randomBytes(32).toString('base64url');
const passHash=async(password,salt)=> (await scrypt(password,salt,64)).toString('hex');
async function body(req){const text=await req.text();if(text.length>MAX_BODY)throw Error('Eingabe zu groß.');return JSON.parse(text||'{}')}
async function record(store,k){return await store.get(k,{type:'json',consistency:'strong'}).catch(()=>null)}
async function session(req){const auth=req.headers.get('authorization')||'';const match=/^Bearer ([a-zA-Z0-9_-]{32,100})$/.exec(auth);if(!match)return null;const token=match[1],s=await record(sessions(),sha(token));if(!s||s.exp<Date.now())return null;if(s.role==='student'){const u=await record(accounts(),s.id);if(!u||u.rev!==s.rev)return null;}else if(s.role==='teacher'&&(!process.env.TEACHER_CODE||s.rev!==sha(process.env.TEACHER_CODE)))return null;return {...s,token}}
async function newSession(role,id,rev){const token=secret();await sessions().setJSON(sha(token),{role,id,rev,exp:Date.now()+7*DAY});return token}
async function throttle(req,scope,limit=18){const ip=(req.headers.get('x-nf-client-connection-ip')||req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();const id=sha(scope+':'+ip),now=Date.now();const store=attempts();const r=await record(store,id);const v=r&&now-r.start<15*60*1000?r:{start:now,count:0};v.count++;await store.setJSON(id,v);return v.count<=limit}
const safeStudent=u=>({nickname:u.nickname,created:u.created,updated:u.updated});
async function getAll(store){let cursor,all=[];do{const r=await store.list({paginate:true,cursor});all.push(...r.blobs);cursor=r.cursor}while(cursor);return all}
export default async(req)=>{
try{
const url=new URL(req.url), action=url.pathname.split('/').filter(Boolean).at(-1),method=req.method;
if(method!=='POST')return error('Nur POST erlaubt.',405);
const data=await body(req);
if(action==='register'){
if(!(await throttle(req,'register',12)))return error('Zu viele Versuche. Bitte später erneut versuchen.',429);
const nickname=String(data.nickname||'').trim(),password=String(data.password||'');
if(!/^[\p{L}\p{N}_\- ]{3,24}$/u.test(nickname))return error('Nickname: 3–24 Zeichen, Buchstaben, Zahlen, Leerzeichen, _ oder -.');
if(password.length<10||password.length>128)return error('Passwort muss 10–128 Zeichen lang sein.');
const id=key(nickname),salt=secret(),now=Date.now();
const result=await accounts().setJSON(id,{nickname,salt,hash:await passHash(password,salt),rev:1,created:now,updated:now},{onlyIfNew:true});
if(!result.modified)return error('Nickname ist bereits vergeben.',409);
const token=await newSession('student',id,1);
return json({token,role:'student',nickname,progress:null});
}
if(action==='login'){
if(!(await throttle(req,'login',25)))return error('Zu viele Anmeldeversuche. Bitte später erneut versuchen.',429);
const id=key(data.nickname),u=await record(accounts(),id),pw=String(data.password||'');
if(!u||pw.length>128||!secureEq(await passHash(pw,u.salt),u.hash))return error('Nickname oder Passwort falsch.',401);
const token=await newSession('student',id,u.rev);
return json({token,role:'student',nickname:u.nickname,progress:await record(progress(),id)});
}
if(action==='teacher-login'){
if(!(await throttle(req,'teacher',10)))return error('Zu viele Versuche. Bitte später erneut versuchen.',429);
const admin=process.env.TEACHER_CODE||'';
if(admin.length<12)return error('Lehrer-Code in Netlify noch nicht korrekt eingerichtet.',503);
if(!secureEq(String(data.code||''),admin))return error('Lehrer-Code falsch.',401);
const token=await newSession('teacher','teacher',sha(admin));return json({token,role:'teacher'});
}
const s=await session(req);
if(!s)return error('Bitte erneut anmelden.',401);
if(action==='me')return json({role:s.role,nickname:s.role==='student'?(await record(accounts(),s.id))?.nickname:null});
if(action==='logout'){await sessions().delete(sha(s.token));return json({ok:true})}
if(action==='load'&&s.role==='student')return json({progress:await record(progress(),s.id)});
if(action==='save'&&s.role==='student'){
const state=data.progress;if(!state||typeof state!=='object'||JSON.stringify(state).length>35000)return error('Ungültiger Fortschritt.');
const cleaned={step:Math.max(0,Math.min(6,Number(state.step)||0)),values:{},checked:{},updated:Date.now()};
const fields=['name','classroom','title','figure','place','object','trait','goal','problem','stakes','beginning','middle','ending','scene0','scene1','scene2','scene3','scene4','scene5'];
for(const k of fields)cleaned.values[k]=String(state.values?.[k]||'').slice(0,4000);
for(const k of ['builder','acts','scenes'])cleaned.checked[k]=Boolean(state.checked?.[k]);
await progress().setJSON(s.id,cleaned);const u=await record(accounts(),s.id);if(u){u.updated=Date.now();await accounts().setJSON(s.id,u)}
return json({ok:true,updated:cleaned.updated});
}
if(s.role!=='teacher')return error('Nur für Lehrkräfte.',403);
if(action==='students'){
const keys=await getAll(accounts()),out=[];
for(const item of keys){const u=await record(accounts(),item.key);if(!u)continue;const p=await record(progress(),item.key);out.push({...safeStudent(u),id:item.key,step:p?.step||0,completed:Boolean(p?.values?.scene5?.trim()),hasProgress:Boolean(p),lastSave:p?.updated||null});}
out.sort((a,b)=>a.nickname.localeCompare(b.nickname,'de'));return json({students:out});
}
if(action==='student-progress'){
const id=String(data.id||'');if(!/^[a-f0-9]{64}$/.test(id))return error('Ungültiger Nutzer.');
return json({progress:await record(progress(),id)});
}
if(action==='reset-password'){
const id=String(data.id||'');const u=await record(accounts(),id);if(!u)return error('Nutzer nicht vorhanden.',404);
const pw=secret().slice(0,18),salt=secret();u.salt=salt;u.hash=await passHash(pw,salt);u.rev++;u.updated=Date.now();await accounts().setJSON(id,u);return json({password:pw});
}
if(action==='delete-student'){
const id=String(data.id||'');if(!/^[a-f0-9]{64}$/.test(id))return error('Ungültiger Nutzer.');
await progress().delete(id);await accounts().delete(id);return json({ok:true});
}
if(action==='clear-progress'){
const list=await getAll(progress());for(const item of list)await progress().delete(item.key);
return json({ok:true,count:list.length});
}
return error('Unbekannte Aktion.',404);
}catch(e){console.error('api error',e);return error('Serverfehler. Bitte später erneut versuchen.',500)}
};
