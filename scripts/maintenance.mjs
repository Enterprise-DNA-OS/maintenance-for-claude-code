#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDb,REPO_ROOT } from './lib/db.mjs';
import { table } from './lib/format.mjs';
import { entities,refs,reports,resolve,compliance } from './lib/domain.mjs';
import { importMaintainX } from './lib/import.mjs';
export const actions=['asset','work','add','set','assign','status','log','time','check-step','complete','generate-pm','reading','use-part','order-part','receive','approve-request','inspect','down','restore','draft-handover','import','export'];
export function parseArgs(args){const flags={},pos=[];for(let i=0;i<args.length;i++){const a=args[i];if(a.startsWith('--')){const at=a.indexOf('=');if(at>=0)flags[a.slice(2,at)]=a.slice(at+1);else if(['json','apply','dry-run','help'].includes(a.slice(2)))flags[a.slice(2)]=true;else if(args[i+1]&&!args[i+1].startsWith('--'))flags[a.slice(2)]=args[++i];else throw Error(`Flag ${a} needs a value`);}else pos.push(a);}return {flags,pos};}
function required(v,name){if(v===undefined||v===null||String(v).trim()==='')throw Error(`Required: ${name}`);return v;}
function number(v,name,min=0){required(v,name);const n=Number(v);if(!Number.isFinite(n)||n<=min)throw Error(`${name} must be greater than ${min}`);return n;}
const open=w=>{if(['done','cancelled'].includes(w.status))throw Error('Work order is closed');};
async function audit(db,action,id,detail){await db.query('insert into audit(action,record_id,detail) values($1,$2,$3)',[action,id||null,JSON.stringify(detail)]);}
async function record(db,entity,flags,id=null){
 const def=entities[entity];if(!def)throw Error(`Entity must be ${Object.keys(entities).join(', ')}`);const [tab,,allowed]=def,cols=[],vals=[];
 for(const [raw,v]of Object.entries(flags)){if(raw==='json')continue;const k=raw.replaceAll('-','_');if(!allowed.includes(k))throw Error(`Unknown ${entity} field ${raw}. Allowed: ${allowed.join(', ')}`);if(id && ((entity==='part'&&k==='stock')||(entity==='meter'&&k==='value')))throw Error('Use stock receipt/use or reading to preserve history');cols.push(k);vals.push(v==='null'?null:refs[k]?(await resolve(db,refs[k],v)).id:v);}
 if(!cols.length)throw Error('Provide fields with --field=value');
 let rows;if(id){vals.push(id);rows=await db.query(`update ${tab} set ${cols.map((c,i)=>`${c}=$${i+1}`).join(',')} where id=$${vals.length} returning *`,vals);}else rows=await db.query(`insert into ${tab}(${cols.join(',')}) values(${vals.map((_,i)=>`$${i+1}`).join(',')}) returning *`,vals);
 if(entity==='schedule'&&rows[0].meter_id){const [m]=await db.query('select asset_id from meters where id=$1',[rows[0].meter_id]);if(m.asset_id!==rows[0].asset_id)throw Error('Schedule meter must belong to the same asset');}
 return rows;
}
async function completionGate(db,w){
 open(w);if(!w.technician_id)throw Error('Assign a technician before starting or completing');
 const [t]=await db.query('select *,competency_until>=current_date as current from technicians where id=$1',[w.technician_id]);
 if(!t.competency_ref||!t.current)throw Error('Technician competency evidence missing or expired');
 if(w.asset_id){const [a]=await db.query('select * from assets where id=$1',[w.asset_id]);if(a.isolation_required&&!w.isolation_ref)throw Error('Record isolation reference before starting or completing');}
}
export async function run(db,args){
 const {pos,flags}=parseArgs(args);const [cmd='help',a,b,c,d]=pos;
 if(cmd==='help'||flags.help)return [{commands:[...Object.keys(reports),'compliance','weekly-review',...actions].join(', '),reference:'docs/cli.md'}];
 if(reports[cmd])return db.query(reports[cmd]);
 if(cmd==='compliance')return compliance(db);
 if(cmd==='weekly-review')return {attention:await db.query(reports.attention),preventive:await db.query(reports['pm-due']),workload:await db.query(reports.workload)};
 if(cmd==='asset'){const r=await resolve(db,'asset',a);return {asset:r,work:await db.query('select * from v_work where id in(select id from work_orders where asset_id=$1)',[r.id]),inspections:await db.query('select * from inspections where asset_id=$1 order by inspected_on desc',[r.id])};}
 if(cmd==='work'){const r=await resolve(db,'work',a);return {work:r,steps:await db.query('select * from procedure_steps where work_order_id=$1',[r.id]),activity:await db.query('select * from activity where work_order_id=$1 order by created_at',[r.id]),costs:await db.query('select * from v_costs where id=$1',[r.id])};}
 if(cmd==='export'){
  const snapshot={version:1,exported_at:new Date().toISOString(),records:{}};
  for(const t of [...new Set(Object.values(entities).map(x=>x[0])),'part_uses','purchase_orders','labour','downtime','inspections','activity','audit'])snapshot.records[t]=await db.query(`select * from ${t} order by created_at,id`);
  const file=path.resolve(required(a,'output.json'));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(snapshot,null,2)+'\n',{flag:'wx',mode:0o600});return [{file,records:Object.values(snapshot.records).reduce((n,v)=>n+v.length,0)}];
 }
 if(cmd==='draft-handover'){
  const w=await resolve(db,'work',a);const detail=await run(db,['work',w.id]);const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`handover-${w.id}-${Date.now()}.md`);fs.writeFileSync(file,`# Draft shift handover: ${w.title}\n\nFor review. Nothing sent.\n\n${JSON.stringify(detail,null,2)}\n`,{flag:'wx'});return [{file,status:'draft'}];
 }
 if(!actions.includes(cmd))throw Error(`Unknown command ${cmd}. Run help.`);
 await db.exec('BEGIN');let result;
 try{
  // Serialize CLI writes across shared installations; readers remain available.
  await db.exec('LOCK TABLE work_orders IN SHARE ROW EXCLUSIVE MODE');
  if(cmd==='add')result=await record(db,a,flags);
  else if(cmd==='set')result=await record(db,a,flags,(await resolve(db,a,b)).id);
  else if(cmd==='import'){
   if(a!=='maintainx')throw Error('Supported import: maintainx');if(flags.apply&&flags['dry-run'])throw Error('Choose --apply or --dry-run, not both');
   result=await importMaintainX(db,b,c,flags);
  }else if(cmd==='assign'){
   const w=await resolve(db,'work',a);open(w);const t=await resolve(db,'technician',b);result=await db.query('update work_orders set technician_id=$1 where id=$2 returning id,title,technician_id',[t.id,w.id]);
  }else if(cmd==='status'){
   const w=await resolve(db,'work',a);open(w);if(!['open','in_progress','on_hold','cancelled'].includes(b))throw Error('Use open, in_progress, on_hold or cancelled; complete records evidence');if(b==='in_progress')await completionGate(db,w);result=await db.query('update work_orders set status=$1 where id=$2 returning id,title,status',[b,w.id]);
  }else if(cmd==='log'){
   const w=await resolve(db,'work',a);result=await db.query('insert into activity(work_order_id,note) values($1,$2) returning *',[w.id,required(b,'note')]);await db.query('update work_orders set updated_at=now() where id=$1',[w.id]);
  }else if(cmd==='time'){
   const w=await resolve(db,'work',a);open(w);const t=await resolve(db,'technician',b);result=await db.query('insert into labour(work_order_id,technician_id,hours,rate,currency,note) values($1,$2,$3,$4,$5,$6) returning *',[w.id,t.id,number(c,'hours'),t.rate,t.currency,required(d,'note')]);
  }else if(cmd==='check-step'){
   const p=await resolve(db,'step',a);const w=await resolve(db,'work',p.work_order_id);open(w);required(c,'evidence');required(d,'checked by');if(!['pass','fail','na'].includes(b))throw Error('Use pass, fail or na');result=await db.query('update procedure_steps set result=$1,evidence=$2,checked_by=$3 where id=$4 returning *',[b,c,d,p.id]);
  }else if(cmd==='complete'){
   const w=await resolve(db,'work',a);await db.query('select id from work_orders where id=$1 for update',[w.id]);const [fresh]=await db.query('select * from work_orders where id=$1',[w.id]);await completionGate(db,fresh);
   if((await db.query("select id from procedure_steps where work_order_id=$1 and (result in ('pending','fail') or coalesce(evidence,'')='' or coalesce(checked_by,'')='')",[w.id])).length)throw Error('Resolve all procedure steps and record evidence before completion');
   result=await db.query("update work_orders set status='done',completion_note=$1,completed_at=now() where id=$2 returning id,title,status,completed_at",[required(b,'completion note'),w.id]);
   if(w.schedule_id)await db.query('update schedules set next_due=current_date+interval_days,next_meter=case when meter_id is not null then (select value from meters where id=schedules.meter_id)+meter_interval else null end where id=$1',[w.schedule_id]);
  }else if(cmd==='generate-pm'){
   const due=await db.query('select * from v_pm_due where not has_open_work');result=[];
   for(const s of due){const rows=await db.query("insert into work_orders(title,asset_id,schedule_id,due_date,work_type,description) select name,asset_id,id,case when meter_id is not null and (select value from meters where id=schedules.meter_id)>=next_meter then least(next_due,current_date) else next_due end,'preventive',instructions from schedules where id=$1 on conflict do nothing returning id,title",[s.id]);for(const w of rows){await db.query('insert into procedure_steps(work_order_id,name) values($1,$2)',[w.id,s.instructions]);result.push(w);}}
  }else if(cmd==='reading'){
   const m=await resolve(db,'meter',a);const value=number(b,'reading',-1);result=await db.query('update meters set value=$1,read_at=now() where id=$2 and value<=$1 returning *',[value,m.id]);if(!result.length)throw Error('Cumulative meter reading cannot decrease');
  }else if(cmd==='use-part'){
   const w=await resolve(db,'work',a);open(w);const p=await resolve(db,'part',b),qty=number(c,'quantity');const updated=await db.query('update parts set stock=stock-$1 where id=$2 and stock>=$1 returning *',[qty,p.id]);if(!updated.length)throw Error('Insufficient stock');
   result=await db.query('insert into part_uses(work_order_id,part_id,quantity,unit_cost,currency) values($1,$2,$3,$4,$5) returning *',[w.id,p.id,qty,updated[0].unit_cost,updated[0].currency]);
  }else if(cmd==='order-part'){
   const p=await resolve(db,'part',a);if(!p.supplier)throw Error('Set part supplier first');result=await db.query('insert into purchase_orders(name,part_id,quantity,unit_cost,currency,supplier,expected_date) values($1,$2,$3,$4,$5,$6,$7) returning *',[required(flags.name,'--name'),p.id,number(b,'quantity'),p.unit_cost,p.currency,p.supplier,required(c,'expected date')]);
  }else if(cmd==='receive'){
   const p=await resolve(db,'purchase',a);result=await db.query("update purchase_orders set status='received' where id=$1 and status='ordered' returning *",[p.id]);if(!result.length)throw Error('Purchase order already received');await db.query('update parts set stock=stock+$1 where id=$2',[p.quantity,p.part_id]);
  }else if(cmd==='approve-request'){
   const r=await resolve(db,'request',a);const locked=await db.query("update requests set status='approved' where id=$1 and status='new' returning *",[r.id]);if(!locked.length)throw Error('Request already processed');result=await db.query('insert into work_orders(title,asset_id,due_date,description) values($1,$2,$3,$4) returning *',[r.name,r.asset_id,required(b,'due date'),`Requested by ${r.requested_by}`]);await db.query('update requests set work_order_id=$1 where id=$2',[result[0].id,r.id]);
  }else if(cmd==='inspect'){
   const asset=await resolve(db,'asset',a);const t=await resolve(db,'technician',required(flags.inspector,'--inspector'));const [valid]=await db.query("select id from technicians where id=$1 and competency_ref is not null and competency_ref<>'' and competency_until>=current_date",[t.id]);if(!valid)throw Error('Inspector competency evidence missing or expired');
   result=await db.query('insert into inspections(asset_id,inspector,inspected_on,next_due,result,evidence) values($1,$2,current_date,$3,$4,$5) returning *',[asset.id,t.name,required(flags['next-due'],'--next-due'),required(flags.result,'--result'),required(flags.evidence,'--evidence')]);
   await db.query("update assets set inspection_due=$1,status=case when $2='fail' then 'down' else status end where id=$3",[flags['next-due'],flags.result,asset.id]);
  }else if(cmd==='down'){
   const asset=await resolve(db,'asset',a);result=await db.query('insert into downtime(asset_id,started_at,reason) values($1,now(),$2) returning *',[asset.id,required(b,'reason')]);await db.query("update assets set status='down' where id=$1",[asset.id]);
  }else if(cmd==='restore'){
   const asset=await resolve(db,'asset',a);required(b,'return-to-service evidence');const bad=await db.query("select result from inspections where asset_id=$1 order by inspected_on desc,created_at desc limit 1",[asset.id]);if(bad[0]?.result==='fail')throw Error('Latest inspection failed; record a competent-person pass before restoring');
   result=await db.query('update downtime set ended_at=now() where asset_id=$1 and ended_at is null returning *',[asset.id]);await db.query("update assets set status='operational' where id=$1",[asset.id]);
  }
  await audit(db,cmd,result?.[0]?.id||null,{args:pos.slice(1),fields:flags});
  await db.exec(cmd==='import'&&!flags.apply?'ROLLBACK':'COMMIT');return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
export function format(value){if(Array.isArray(value)){if(!value.length)return '(none)';const cols=Object.keys(value[0]).filter(k=>!['source_data','created_at','updated_at'].includes(k));const rows=value.map(r=>Object.fromEntries(cols.map(k=>[k,r[k] instanceof Date?r[k].toISOString().slice(0,10):r[k]&&typeof r[k]==='object'?JSON.stringify(r[k]):r[k]])));return table(rows,cols.map(k=>({key:k,label:k.replaceAll('_',' '),width:k==='id'?8:60})));}return Object.entries(value).map(([k,v])=>`${k.toUpperCase()}\n${format(Array.isArray(v)?v:[v])}`).join('\n\n');}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):format(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}}
