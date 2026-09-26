export const entities = {
 location:['locations','name',['name','jurisdiction']],
 technician:['technicians','name',['name','weekly_hours','rate','currency','competency_ref','competency_until']],
 asset:['assets','name',['name','location_id','serial','criticality','status','inspection_due','interval_source','isolation_required','registered_plant','registration_ref']],
 meter:['meters','name',['name','asset_id','unit','value']],
 schedule:['schedules','name',['name','asset_id','interval_days','next_due','meter_id','meter_interval','next_meter','instructions','active']],
 work:['work_orders','title',['title','asset_id','technician_id','due_date','priority','work_type','estimated_hours','description','isolation_ref']],
 part:['parts','name',['name','sku','stock','reorder_point','unit_cost','currency','supplier']],
 request:['requests','name',['name','asset_id','requested_by']],
 step:['procedure_steps','name',['name','work_order_id']],
};
export const refs={location_id:'location',asset_id:'asset',technician_id:'technician',meter_id:'meter',work_order_id:'work'};
export async function resolve(db,entity,value){
 const def=entities[entity] || ({purchase:['purchase_orders','name'],downtime:['downtime','reason']})[entity];
 if(!def || !value) throw Error(`Need ${entity} name or ID`);
 const [table,name]=def;
 const rows=await db.query(`select * from ${table} where id::text=$1 or lower(${name})=lower($1) order by ${name}`, [value]);
 const found=rows.length ? rows : await db.query(`select * from ${table} where starts_with(id::text,lower($1)) or strpos(lower(${name}),lower($1))>0 order by ${name}`,[value]);
 if(found.length!==1) throw Error(`${entity}: ${found.length?'Ambiguous match':'No match'} for "${value}". Candidates:\n${(found.length?found:await db.query(`select * from ${table} order by ${name} limit 20`)).map(r=>`${r.id}  ${r[name]}`).join('\n')}`);
 return found[0];
}
export const reports={
 locations:'select id,name,jurisdiction from locations order by name',
 technicians:'select id,name,weekly_hours,rate,currency,competency_ref,competency_until from technicians order by name',
 assets:'select a.id,a.name,l.name as location,a.criticality,a.status,a.inspection_due,a.interval_source from assets a left join locations l on l.id=a.location_id order by a.name',
 'work-orders':'select id,title,asset,technician,status,priority,due_date from v_work order by due_date nulls first,title',
 attention:'select * from v_attention order by due_date nulls first,title',
 'pm-due':'select * from v_pm_due order by next_due,name',
 meters:'select m.id,m.name,a.name as asset,m.value,m.unit,m.read_at from meters m join assets a on a.id=m.asset_id order by m.name',
 parts:'select id,name,sku,stock,reorder_point,unit_cost,currency,stock<=reorder_point as reorder from parts order by stock-reorder_point,name',
 purchasing:'select p.id,p.name,x.name as part,p.quantity,p.supplier,p.expected_date,p.status,p.quantity*p.unit_cost as committed,p.currency from purchase_orders p join parts x on x.id=p.part_id order by p.expected_date,p.name',
 requests:'select r.id,r.name,a.name as asset,r.requested_by,r.status,r.created_at from requests r join assets a on a.id=r.asset_id order by r.created_at',
 procedures:'select p.id,w.title,p.name,p.result,p.evidence,p.checked_by from procedure_steps p join work_orders w on w.id=p.work_order_id order by w.title,p.name',
 backlog:"select location,priority,status,count(*)::int as orders,sum(estimated_hours) as planned_hours from v_work where status not in ('done','cancelled') group by location,priority,status order by location,priority",
 workload:"select t.name,t.weekly_hours,coalesce(sum(greatest(0,w.estimated_hours-w.logged_hours)),0) as remaining_hours,count(w.id)::int as orders_due from technicians t left join v_work w on w.technician=t.name and w.status not in ('done','cancelled') and (w.due_date<=current_date+7 or w.due_date is null) group by t.id,t.name,t.weekly_hours order by remaining_hours desc",
 costs:'select * from v_costs order by currency,total_cost desc,title',
 downtime:"select d.id,a.name as asset,d.started_at,d.ended_at,round(extract(epoch from(coalesce(d.ended_at,now())-d.started_at))/3600,2) as hours,d.reason from downtime d join assets a on a.id=d.asset_id order by d.started_at desc",
 reliability:"select a.name as asset,(select count(*)::int from work_orders w where w.asset_id=a.id and w.work_type='reactive') as reactive_orders,(select count(*)::int from work_orders w where w.asset_id=a.id and w.status not in ('done','cancelled')) as open_orders,(select round(sum(extract(epoch from(coalesce(d.ended_at,now())-d.started_at))/3600),2) from downtime d where d.asset_id=a.id) as downtime_hours from assets a order by reactive_orders desc,a.name",
 metrics:"select count(*)::int as total_orders,count(*) filter(where status='done')::int as completed,count(*) filter(where status='done' and completed_at::date<=due_date)::int as completed_on_time,count(*) filter(where work_type='preventive')::int as preventive_orders,round(avg(extract(epoch from(completed_at-created_at))/3600) filter(where status='done'),2) as mean_elapsed_hours from work_orders",
 inspections:'select i.id,a.name as asset,i.inspector,i.inspected_on,i.next_due,i.result,i.evidence from inspections i join assets a on a.id=i.asset_id order by inspected_on desc',
 audit:'select action,record_id,detail,created_at from audit order by created_at desc,id',
 activity:'select a.id,w.title,a.note,a.created_at from activity a join work_orders w on w.id=a.work_order_id order by a.created_at desc',
};
export async function compliance(db){
 return db.query(`
 SELECT 'INSPECTION-DUE' as rule,a.id,a.name as record,'Inspection missing or overdue' as finding,'docs/compliance.md#inspection-due' as source FROM assets a WHERE a.status<>'retired' AND (a.inspection_due IS NULL OR a.inspection_due<current_date)
 UNION ALL SELECT 'INTERVAL-SOURCE',id,name,'No manufacturer or competent-person interval reference','docs/compliance.md#interval-source' FROM assets WHERE status<>'retired' AND coalesce(interval_source,'')=''
 UNION ALL SELECT 'AU-REGISTER',a.id,a.name,'Registered plant lacks registration reference','docs/compliance.md#au-register' FROM assets a JOIN locations l ON l.id=a.location_id WHERE a.registered_plant AND l.jurisdiction='AU' AND coalesce(a.registration_ref,'')=''
 UNION ALL SELECT 'COMPETENCY',w.id,w.title,'Assigned worker evidence missing or expired','docs/compliance.md#competency' FROM work_orders w JOIN technicians t ON t.id=w.technician_id WHERE w.status NOT IN ('done','cancelled') AND (coalesce(t.competency_ref,'')='' OR t.competency_until IS NULL OR t.competency_until<current_date)
 UNION ALL SELECT 'ISOLATION',w.id,w.title,'Work in progress or completed lacks isolation reference','docs/compliance.md#isolation' FROM work_orders w JOIN assets a ON a.id=w.asset_id WHERE a.isolation_required AND w.status IN ('in_progress','done') AND coalesce(w.isolation_ref,'')=''
 UNION ALL SELECT 'PROCEDURE-FAIL',w.id,w.title,'Procedure has failed or unfinished checks','docs/compliance.md#procedure-fail' FROM work_orders w WHERE w.status<>'cancelled' AND EXISTS(SELECT 1 FROM procedure_steps p WHERE p.work_order_id=w.id AND (p.result='fail' OR (w.status='done' AND p.result='pending')))
 UNION ALL SELECT 'COMPLETION-EVIDENCE',id,title,'Completed work has no completion note','docs/compliance.md#completion-evidence' FROM work_orders WHERE status='done' AND coalesce(completion_note,'')=''
 UNION ALL SELECT 'METER-STALE',id,name,'No reading in seven days; local review policy','docs/compliance.md#meter-stale' FROM meters WHERE read_at IS NULL OR read_at<now()-interval '7 days'
 UNION ALL SELECT 'INSPECTION-FAIL',a.id,a.name,'Latest recorded inspection failed','docs/compliance.md#inspection-fail' FROM assets a WHERE (SELECT result FROM inspections i WHERE i.asset_id=a.id ORDER BY inspected_on DESC,created_at DESC LIMIT 1)='fail'
 ORDER BY rule,record`);
}
