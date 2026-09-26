import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
const get=(r,...ks)=>{for(const k of ks){const hit=Object.keys(r).find(x=>x.toLowerCase()===k.toLowerCase());if(hit && r[hit]!=='') return r[hit];}return '';};
function date(v,order){
 if(!v)return null;
 const iso=String(v).match(/^(\d{4}-\d{2}-\d{2})(?:[T ].*)?$/);if(iso){const d=iso[1];if(new Date(d).toISOString().slice(0,10)!==d)throw Error(`Invalid date ${v}`);return d;}
 const slash=String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: .*)?$/);
 if(slash && ['dmy','mdy'].includes(order)){const [,a,b,y]=slash;return date(`${y}-${(order==='dmy'?b:a).padStart(2,'0')}-${(order==='dmy'?a:b).padStart(2,'0')}`);}
 throw Error(`Date "${v}" needs ISO YYYY-MM-DD or --date-order=dmy / mdy for slash dates`);
}
const statusMap={'open':'open','in progress':'in_progress','in_progress':'in_progress','on hold':'on_hold','on_hold':'on_hold','done':'done','completed':'done','canceled':'cancelled','cancelled':'cancelled'};
export async function importMaintainX(db,kind,file,flags={}){
 if(!['assets','work-orders'].includes(kind))throw Error('import maintainx assets|work-orders <file.csv> --org=<organisation> [--apply]');
 if(!file || !flags.org)throw Error('CSV path and --org=<organisation> are required; use a stable organisation key');
 const rows=parse(fs.readFileSync(file,'utf8'),{columns:true,bom:true,skip_empty_lines:true,trim:true});
 if(!rows.length)throw Error('CSV has no records');
 const seen=new Set();let inserted=0,existing=0;
 const mapped=kind==='assets'?['ID','Asset ID','Name','Asset','Asset Name','Location','Serial Number','Serial']:['ID','Global ID','Title','Status','Priority','Work Type','Description','Due Date','Completed on','Asset ID','Asset','Assigned to'];
 for(let idx=0;idx<rows.length;idx++){
  const r=rows[idx],id=get(r,kind==='assets'?'Asset ID':'Global ID','ID');
  if(!id)throw Error(`Row ${idx+2}: no stable ID. Include ID in the vendor export.`);
  if(seen.has(id))throw Error(`Duplicate ID ${id} in this file`);seen.add(id);
  const ext=`${flags.org}:${id}`,tab=kind==='assets'?'assets':'work_orders';
  if((await db.query(`select id from ${tab} where external_id=$1`,[ext])).length){existing++;continue;}
  const name=get(r,...(kind==='assets'?['Name','Asset Name','Asset']:['Title']));if(!name)throw Error(`Row ${idx+2}: missing name/title`);
  if(kind==='assets'){
   let loc=null;const ln=get(r,'Location');if(ln){const ls=await db.query('select id from locations where lower(name)=lower($1)',[ln]);if(ls.length!==1)throw Error(`Location "${ln}" must be added before import`);loc=ls[0].id;}
   await db.query('insert into assets(external_id,name,location_id,serial,source_data) values($1,$2,$3,$4,$5)',[ext,name,loc,get(r,'Serial Number','Serial')||null,JSON.stringify(r)]);
  }else{
   let asset=null,tech=null;const aid=get(r,'Asset ID'),an=get(r,'Asset');
   if(aid||an){const found=aid?await db.query('select id from assets where external_id=$1',[`${flags.org}:${aid}`]):await db.query('select id from assets where lower(name)=lower($1)',[an]);if(found.length!==1)throw Error(`Row ${idx+2}: asset "${aid||an}" is missing or ambiguous; import assets first. Multi-asset rows need mapping.`);asset=found[0].id;}
   const tn=get(r,'Assigned to');if(tn){const ts=await db.query('select id from technicians where lower(name)=lower($1)',[tn]);if(ts.length!==1)throw Error(`Technician "${tn}" must be added first; multiple assignees need mapping`);tech=ts[0].id;}
   const st=statusMap[get(r,'Status').toLowerCase()||'open'];if(!st)throw Error(`Unmapped status ${get(r,'Status')}`);
   const priority=get(r,'Priority').toLowerCase()||'medium',type=get(r,'Work Type').toLowerCase()||'other';
   const completed=date(get(r,'Completed on'),flags['date-order']);if(st==='done'&&!completed)throw Error('Completed orders need Completed on; never invent completion evidence');
   await db.query('insert into work_orders(external_id,title,asset_id,technician_id,status,priority,work_type,description,due_date,completed_at,source_data) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[ext,name,asset,tech,st,priority,type,get(r,'Description'),date(get(r,'Due Date'),flags['date-order']),completed,JSON.stringify(r)]);
  }inserted++;
 }
 return [{mode:flags.apply?'applied':'dry-run',kind,rows:rows.length,inserted,existing,raw_only_columns:Object.keys(rows[0]).filter(k=>!mapped.some(m=>m.toLowerCase()===k.toLowerCase())).join(', ')}];
}
