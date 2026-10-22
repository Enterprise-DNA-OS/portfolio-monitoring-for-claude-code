#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv} from './lib/csv.mjs';
import {table as textTable} from './lib/format.mjs';
import {page,table,writeOut} from './lib/render.mjs';

// Each entry declares positional arguments, accepted flags and a user-facing recipe.
export const usage={
 help:[0,[],'Show this guide'],
 funds:[0,[],'List funds'],
 'add-fund':[0,['name','actor'],'--name=NAME --actor=NAME'],
 companies:[0,['fund'],'[--fund=NAME]'],
 'add-company':[0,['name','source-id','sector','country','currency','owner','review-due','actor'],'--name=NAME --sector=TEXT --country=NZ --currency=NZD --owner=NAME --review-due=DATE --actor=NAME [--source-id=ID]'],
 'link-company':[1,['fund','actor'],'COMPANY --fund=NAME --actor=NAME'],
 show:[1,[],'COMPANY'],
 metrics:[0,[],'List metric definitions'],
 'add-metric':[0,['name','unit','direction','actor'],'--name=NAME --unit=money|count|percent|ratio --direction=higher|lower|neutral --actor=NAME'],
 require:[1,['metric','target','actor'],'COMPANY --metric=NAME --actor=NAME [--target=NUMBER]'],
 'open-cycle':[0,['fund','period','due','actor'],'--fund=NAME --period=DATE --due=DATE --actor=NAME'],
 'collection-week':[0,['fund','period'],'[--fund=NAME] [--period=DATE]'],
 'metrics-due':[0,['fund','period'],'Missing or unapproved requirements [--fund=NAME] [--period=DATE]'],
 observations:[0,['company','period'],'[--company=NAME] [--period=DATE]'],
 record:[1,['metric','period','value','currency','source','actor','note'],'COMPANY --metric=NAME --period=DATE --value=NUMBER --source=TEXT --actor=NAME --note=TEXT [--currency=NZD]'],
 review:[1,['decision','actor','evidence'],'OBSERVATION_ID --decision=approved|changes --actor=NAME --evidence=TEXT'],
 variance:[0,['company'],'[--company=NAME]'],
 watchlist:[0,[],'Latest approved cash runway by company; no forecasts'],
 attention:[0,[],'Overdue collections, actions and evidence'],
 actions:[0,[],'List open follow-up actions'],
 'add-action':[1,['title','owner','due','actor'],'COMPANY --title=TEXT --owner=NAME --due=DATE --actor=NAME'],
 'close-action':[1,['evidence','actor'],'ACTION_ID --evidence=TEXT --actor=NAME'],
 log:[1,['note','source','actor'],'COMPANY --note=TEXT --source=TEXT --actor=NAME'],
 updates:[0,['company'],'[--company=NAME]'],
 privacy:[1,['personal','purpose','retention','accuracy','review-due','actor'],'COMPANY --personal=yes|no --review-due=DATE --actor=NAME [--purpose=TEXT --retention=DATE --accuracy=TEXT]'],
 compliance:[0,[],'Operational evidence checks, not certification'],
 insights:[0,[],'Ten questions across collections and evidence'],
 import:[2,['map','actor','source','dry-run'],'fundwave FILE.csv --map=FILE.json --actor=NAME --source=TEXT [--dry-run]'],
 imports:[0,[],'List import receipts'],
 export:[0,['out'],'--out=FILE.json'],
 history:[1,[],'COMPANY'],
 'draft-update':[1,[],'COMPANY; writes a local review brief'],
 'weekly-review':[0,[],'Draft the week from collection, attention and compliance'],
 pack:[0,['fund','period','actor'],'--fund=NAME --period=DATE --actor=NAME; checked local snapshot'],
 packs:[0,[],'List saved snapshots'],
};
const mutating=new Set(['add-fund','add-company','link-company','add-metric','require','open-cycle','record','review','add-action','close-action','log','privacy','import','pack']);
const canonical=x=>x instanceof Date?x.toISOString():Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
export const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(canonical(x))).digest('hex');
const required=(o,k)=>{if(typeof o[k]!=='string'||!o[k].trim())throw Error(`Required --${k}`);return o[k].trim();};
export function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||'')||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Use a valid YYYY-MM-DD date');return v;}
export function decimal(v){v=String(v??'').trim();if(!/^-?\d{1,16}(\.\d{1,4})?$/.test(v))throw Error('Number needs decimal notation, at most four decimals, no separators');return v;}
const choose=(v,choices)=>{if(!choices.includes(v))throw Error(`Choose ${choices.join(', ')}`);return v;};
const today=()=>new Date().toISOString().slice(0,10);
async function resolve(db,t,v){
 const cols={companies:'name',funds:'name',metrics:'name',actions:'title',observations:null};
 if(!Object.hasOwn(cols,t)||!v)throw Error('Record ID or exact name required');
 const col=cols[t];
 let rows=col?await db.query(`select * from ${t} where lower(${col})=lower($1)`,[v]):[];
 if(!rows.length)rows=await db.query(`select * from ${t} where left(id::text,length($1))=$1`,[v.toLowerCase()]);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${t}:\n`+rows.map(r=>`${r.id}  ${r[col]||''}`).join('\n'):`No matching ${t}: ${v}`);
 return rows[0];
}
async function audit(db,id,event,actor,detail){await db.query('insert into audit(entity_id,event,actor,detail) values($1,$2,$3,$4)',[id,event,actor,JSON.stringify(detail)]);}
async function company(db,v){const c=await resolve(db,'companies',v);if(c.archived)throw Error('Company archived');return c;}
async function compliance(db){
 return db.query(`select id as company_id,name as company,'privacy accuracy or purpose missing' as issue from companies where personal and (coalesce(trim(purpose),'')='' or coalesce(trim(accuracy_evidence),'')='')
 union all select id,name,'retention decision due' from companies where personal and (retention_review is null or retention_review<current_date)
 union all select id,name,'company review overdue' from companies where review_due<current_date and not archived
 union all select company_id,company,'source figure needs review: '||metric from latest_observations where review_state<>'approved'
 order by company,issue`);
}
async function rowsForCycle(db,o){
 const params=[];let where='true';
 if(o.fund){params.push((await resolve(db,'funds',o.fund)).id);where+=` and company_id in(select company_id from holdings where fund_id=$${params.length})`;}
 if(o.period){params.push(date(o.period));where+=` and period=$${params.length}`;}
 return db.query(`select * from collection_week where ${where} order by due,company,metric`,params);
}
async function record(db,c,m,o){
 const period=date(required(o,'period'));if(period>today())throw Error('Actual reporting period cannot be in the future');
 const value=decimal(required(o,'value')),actor=required(o,'actor'),source=required(o,'source'),note=required(o,'note');
 const currency=m.unit==='money'?required(o,'currency'):null;
 if(m.unit!=='money'&&o.currency)throw Error('Non-money metric has no currency');
 // Parent lock serializes revision allocation across independent writers on Postgres.
 await db.query('select id from companies where id=$1 for update',[c.id]);
 const [row]=await db.query(`insert into observations(company_id,metric_id,period,value,currency,revision,source,actor,note)
 values($1,$2,$3,$4,$5,(select coalesce(max(revision),0)+1 from observations where company_id=$1 and metric_id=$2 and period=$3),$6,$7,$8) returning *`,[c.id,m.id,period,value,currency,source,actor,note]);
 await audit(db,c.id,'record',actor,{observation:row.id,metric:m.name,period,revision:row.revision});return row;
}
async function importCsv(db,args,o){
 if(args[0]!=='fundwave')throw Error('Supported importer: fundwave');
 if(!args[1].toLowerCase().endsWith('.csv'))throw Error('Save the Fundwave Excel export sheet as CSV UTF-8 first');
 const raw=fs.readFileSync(args[1],'utf8'),mapping=JSON.parse(fs.readFileSync(required(o,'map'),'utf8'));
 if(!mapping||Array.isArray(mapping)||typeof mapping!=='object')throw Error('Mapping must be an object');
 for(const k of Object.keys(mapping))if(!['company','metric','period','value','currency','columns'].includes(k))throw Error(`Unknown mapping key ${k}`);
 for(const k of ['company','metric'])if(typeof mapping[k]!=='string'||!mapping[k])throw Error(`Mapping requires ${k} header`);
 const wide=Array.isArray(mapping.columns);
 if(wide&&['period','value'].some(k=>mapping[k]))throw Error('Choose long mapping or wide columns, not both');
 if(!wide&&(!mapping.period||!mapping.value))throw Error('Long mapping requires period and value headers');
 if(wide&&(!mapping.columns.length||mapping.columns.some(c=>!c||typeof c.header!=='string'||!c.header||!c.period)))throw Error('Wide mapping requires columns with header and period');
 if(wide)for(const c of mapping.columns){date(c.period);if(Object.keys(c).some(k=>!['header','period'].includes(k)))throw Error('Unknown wide mapping key');}
 const rows=parseCsv(raw);if(!rows.length)throw Error('Empty import');
 const headers=Object.keys(rows[0]);const needed=[mapping.company,mapping.metric,mapping.currency,...(wide?mapping.columns.map(c=>c.header):[mapping.period,mapping.value])].filter(Boolean);
 for(const h of needed)if(!headers.includes(h))throw Error(`Mapped header not found: ${h}`);
 const source=required(o,'source'),actor=required(o,'actor');
 const digest=hash({raw,mapping,source});
 const priorImport=(await db.query('select * from imports where digest=$1',[digest]))[0];
 if(priorImport)return {inserted:0,unchanged:priorImport.inserted+priorImport.unchanged,already_imported:true,dry_run:!!o['dry-run']};
 const seen=new Set();let inserted=0,unchanged=0,blank=0;
 for(const [index,r] of rows.entries()){
  const c=await company(db,r[mapping.company]);const m=await resolve(db,'metrics',r[mapping.metric]);
  for(const cell of wide?mapping.columns:[{header:mapping.value,period:r[mapping.period]}]){
   if(r[cell.header].trim()===''){blank++;continue;} // Missing never becomes zero.
   const period=date(cell.period),value=decimal(r[cell.header]),currency=m.unit==='money'?(mapping.currency?r[mapping.currency].trim():null):null;
   if(m.unit==='money'&&!currency)throw Error('Money imports require an explicit currency column');
   const key=[c.id,m.id,period].join(':');if(seen.has(key))throw Error(`Duplicate company/metric/period at row ${index+2}`);seen.add(key);
   const prior=await db.query('select * from latest_observations where company_id=$1 and metric_id=$2 and period=$3',[c.id,m.id,period]);
   if(prior.length){const same=await db.query('select $1::numeric=$2::numeric as same',[prior[0].value,value]);if(!same[0].same||prior[0].currency!==currency)throw Error(`Import conflict at row ${index+2}: use record to revise after review`);unchanged++;continue;}
   await record(db,c,m,{period,value,...(currency?{currency}:{}),source,actor,note:`Fundwave mapped CSV row ${index+2}`});inserted++;
  }
 }
 if(!seen.size)throw Error('No values in import');
 await db.query('insert into imports(digest,source_name,actor,inserted,unchanged,mapping) values($1,$2,$3,$4,$5,$6)',[digest,path.basename(args[1]),actor,inserted,unchanged,JSON.stringify(mapping)]);
 return {inserted,unchanged,blank,dry_run:!!o['dry-run'],digest};
}
async function draft(db,c){
 const id=c.id;const sections=[{title:'Company',html:table([{company:c.name,owner:c.owner,review_due:c.review_due}])},
 {title:'Current requirements',html:table(await db.query('select metric,period,due,value,currency,state from collection_week where company_id=$1 order by period desc,metric',[id]))},
 {title:'Recorded updates',html:table(await db.query('select note,source,actor,created_at from updates where company_id=$1 order by created_at desc',[id]))},
 {title:'Follow-up actions',html:table(await db.query('select title,owner,due,closure from actions where company_id=$1 order by due',[id]))}];
 return {file:writeOut('drafts','company-'+id+'-'+randomUUID(),page({title:'Draft company review',subtitle:'Internal review only. No message sent.',sections})),sent:false};
}
export const insightQuestions=[
 'Which companies still owe figures for a reporting period?',
 'Which received figures still need review?',
 'Which revenue figures fell against the previous reported period?',
 'Which companies have approved cash and burn for fewer than six months of simple runway?',
 'Which company reviews are overdue?',
 'Which owners have overdue follow-up actions?',
 'Which companies are held in more than one fund?',
 'Which personal records need a retention decision?',
 'Which figures miss their configured target?',
 'Which reporting periods are complete and approved?'
];
const watchSql=`with paired as(select c.id as company_id,c.name as company,c.currency,cash.period,cash.value as cash,burn.value as monthly_burn,
 case when burn.value>0 and cash.value>=0 then round(cash.value/burn.value,2) end as runway_months,
 current_date-cash.period as age_days,
 row_number() over(partition by c.id order by cash.period desc) as n
 from companies c join latest_observations cash on cash.company_id=c.id and cash.metric='Cash' and cash.review_state='approved'
 join latest_observations burn on burn.company_id=c.id and burn.metric='Monthly burn' and burn.period=cash.period and burn.review_state='approved'
 where not c.archived and cash.currency=c.currency and burn.currency=c.currency)
 select company_id,company,currency,period,cash,monthly_burn,runway_months,age_days from paired where n=1 order by company`;
async function inner(db,cmd,args,o){
 const actor=mutating.has(cmd)?required(o,'actor'):null;
 switch(cmd){
 case 'help':return Object.entries(usage).map(([command,[,,arguments_]])=>({command,arguments:arguments_}));
 case 'funds':return db.query('select * from funds order by name');
 case 'add-fund':return (await db.query('insert into funds(name) values($1) returning *',[required(o,'name')]))[0];
 case 'companies':return o.fund?db.query('select c.* from companies c join holdings h on h.company_id=c.id where h.fund_id=$1 order by name',[(await resolve(db,'funds',o.fund)).id]):db.query('select * from companies order by name');
 case 'add-company':{
 const currency=required(o,'currency');if(!/^[A-Z]{3}$/.test(currency))throw Error('Use an uppercase three-letter currency');
 const [c]=await db.query('insert into companies(name,source_id,sector,country,currency,owner,review_due) values($1,$2,$3,$4,$5,$6,$7) returning *',[required(o,'name'),o['source-id']||null,required(o,'sector'),required(o,'country'),currency,required(o,'owner'),date(required(o,'review-due'))]);await audit(db,c.id,cmd,actor,{name:c.name});return c;}
 case 'link-company':{const c=await company(db,args[0]),f=await resolve(db,'funds',required(o,'fund'));await db.query('insert into holdings(fund_id,company_id) values($1,$2) on conflict do nothing',[f.id,c.id]);await audit(db,c.id,cmd,actor,{fund:f.id});return {company:c.name,fund:f.name};}
 case 'show':{const c=await resolve(db,'companies',args[0]);return {company:c,requirements:await db.query('select * from collection_week where company_id=$1 order by period desc,metric',[c.id]),metrics:await db.query('select * from latest_observations where company_id=$1 order by period desc,metric',[c.id])};}
 case 'metrics':return db.query('select * from metrics order by name');
 case 'add-metric':return (await db.query('insert into metrics(name,unit,direction) values($1,$2,$3) returning *',[required(o,'name'),choose(required(o,'unit'),['money','count','percent','ratio']),choose(required(o,'direction'),['higher','lower','neutral'])]))[0];
 case 'require':{const c=await company(db,args[0]),m=await resolve(db,'metrics',required(o,'metric'));const [r]=await db.query('insert into subscriptions(company_id,metric_id,target) values($1,$2,$3) on conflict(company_id,metric_id) do update set target=excluded.target returning *',[c.id,m.id,o.target===undefined?null:decimal(o.target)]);await audit(db,c.id,cmd,actor,{metric:m.name,target:r.target});return r;}
 case 'open-cycle':{const f=await resolve(db,'funds',required(o,'fund')),period=date(required(o,'period')),due=date(required(o,'due'));const rows=await db.query(`insert into requirements(company_id,metric_id,period,due) select s.company_id,s.metric_id,$2,$3 from subscriptions s join holdings h on h.company_id=s.company_id join companies c on c.id=s.company_id where h.fund_id=$1 and not c.archived on conflict do nothing returning *`,[f.id,period,due]);if(!rows.length&&!(await rowsForCycle(db,{fund:f.id,period})).length)throw Error('No required metrics for this fund');await audit(db,f.id,cmd,actor,{period,due,inserted:rows.length});return {inserted:rows.length,period,due};}
 case 'collection-week':return rowsForCycle(db,o);
 case 'metrics-due':return (await rowsForCycle(db,o)).filter(r=>r.state!=='approved');
 case 'observations':{const p=[];let w='true';if(o.company){p.push((await resolve(db,'companies',o.company)).id);w+=` and company_id=$${p.length}`;}if(o.period){p.push(date(o.period));w+=` and period=$${p.length}`;}return db.query(`select * from latest_observations where ${w} order by company,period desc,metric`,p);}
 case 'record':return record(db,await company(db,args[0]),await resolve(db,'metrics',required(o,'metric')),o);
 case 'review':{const ob=await resolve(db,'observations',args[0]);await db.query('select id from companies where id=$1 for update',[ob.company_id]);const [r]=await db.query('insert into decisions(observation_id,decision,actor,evidence) values($1,$2,$3,$4) returning *',[ob.id,choose(required(o,'decision'),['approved','changes']),actor,required(o,'evidence')]);await audit(db,ob.company_id,cmd,actor,{observation:ob.id,decision:r.decision});return r;}
 case 'variance':return o.company?db.query('select * from metric_variance where company_id=$1 order by period desc,metric',[(await resolve(db,'companies',o.company)).id]):db.query('select * from metric_variance order by company,period desc,metric');
 case 'watchlist':return db.query(watchSql);
 case 'attention':return db.query('select company,owner,issue,due from attention order by due nulls first,company,issue');
 case 'actions':return db.query('select a.*,c.name as company from actions a join companies c on c.id=a.company_id where closed_at is null order by due');
 case 'add-action':{const c=await company(db,args[0]);const [r]=await db.query('insert into actions(company_id,title,owner,due) values($1,$2,$3,$4) returning *',[c.id,required(o,'title'),required(o,'owner'),date(required(o,'due'))]);await audit(db,c.id,cmd,actor,{action:r.id});return r;}
 case 'close-action':{const a=await resolve(db,'actions',args[0]);if(a.closed_at)throw Error('Action already closed');const [r]=await db.query('update actions set closed_at=now(),closure=$2 where id=$1 returning *',[a.id,required(o,'evidence')]);await audit(db,a.company_id,cmd,actor,{action:a.id,evidence:r.closure});return r;}
 case 'log':{const c=await company(db,args[0]);return (await db.query('insert into updates(company_id,note,source,actor) values($1,$2,$3,$4) returning *',[c.id,required(o,'note'),required(o,'source'),actor]))[0];}
 case 'updates':return o.company?db.query('select * from updates where company_id=$1 order by created_at desc',[(await resolve(db,'companies',o.company)).id]):db.query('select u.*,c.name as company from updates u join companies c on c.id=u.company_id order by u.created_at desc');
 case 'privacy':{const c=await company(db,args[0]),personal=choose(required(o,'personal'),['yes','no'])==='yes';const [r]=await db.query('update companies set personal=$2,purpose=$3,retention_review=$4,accuracy_evidence=$5,review_due=$6 where id=$1 returning *',[c.id,personal,o.purpose||null,o.retention?date(o.retention):null,o.accuracy||null,date(required(o,'review-due'))]);await audit(db,c.id,cmd,actor,{personal,review_due:r.review_due,retention_review:r.retention_review});return r;}
 case 'compliance':return compliance(db);
 case 'insights':{
 const queries=["select company,metric,period,due from collection_week where state='missing' order by company,period,metric","select company,metric,period,review_state from latest_observations where review_state<>'approved' order by company,period,metric","select company,period,value,previous_value,currency,change_percent,review_state from metric_variance where metric='Revenue' and change<0 order by company,period",`select * from (${watchSql}) w where runway_months<6`,"select name,owner,review_due from companies where not archived and review_due<current_date","select c.name,a.owner,a.title,a.due from actions a join companies c on c.id=a.company_id where closed_at is null and due<current_date","select c.name,count(*)::int as funds from holdings h join companies c on c.id=h.company_id group by c.id,c.name having count(*)>1","select name,retention_review from companies where personal and (retention_review is null or retention_review<current_date)","select company,metric,period,value,target,currency,review_state from metric_variance where target_state in ('above target','below target')","select company,period,count(*)::int as figures from collection_week group by company,period having bool_and(state='approved')"];
 const out=[];for(let i=0;i<queries.length;i++)out.push({question:insightQuestions[i],rows:await db.query(queries[i])});return out;}
 case 'import':return importCsv(db,args,o);
 case 'imports':return db.query('select * from imports order by created_at desc');
 case 'export':{const records={};for(const t of ['funds','companies','holdings','metrics','subscriptions','requirements','observations','decisions','actions','updates','imports','packs','audit'])records[t]=await db.query(`select * from ${t} order by id`);const file=path.resolve(required(o,'out'));fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,JSON.stringify({format:'portfolio-monitoring-v1',exported_at:new Date().toISOString(),records},null,2)+'\n',{flag:'wx',mode:0o600});return {file,records:Object.fromEntries(Object.entries(records).map(([k,v])=>[k,v.length]))};}
 case 'history':{const c=await resolve(db,'companies',args[0]);return {audit:await db.query('select * from audit where entity_id=$1 order by created_at,id',[c.id]),observations:await db.query('select * from observations where company_id=$1 order by period,revision',[c.id]),decisions:await db.query('select d.* from decisions d join observations o on o.id=d.observation_id where o.company_id=$1 order by d.created_at,d.id',[c.id]),updates:await db.query('select * from updates where company_id=$1 order by created_at,id',[c.id])};}
 case 'draft-update':return draft(db,await resolve(db,'companies',args[0]));
 case 'weekly-review':{const sections=[{title:'Collection week',html:table(await rowsForCycle(db,{}),['company','metric','period','due','state'])},{title:'Attention',html:table(await db.query('select company,owner,issue,due from attention order by due'))},{title:'Compliance evidence',html:table(await compliance(db))}];return {file:writeOut('drafts','weekly-'+randomUUID(),page({title:'Draft weekly portfolio review',subtitle:'Internal review. No sending.',sections})),sent:false};}
 case 'pack':{
 const f=await resolve(db,'funds',required(o,'fund')),period=date(required(o,'period'));if(period>today())throw Error('Reporting period cannot be in the future');
 // Lock companies against revisions and capture a single repeatable snapshot.
 const cs=await db.query('select c.* from companies c join holdings h on h.company_id=c.id where h.fund_id=$1 and not c.archived order by c.id for update',[f.id]);
 if(!cs.length)throw Error('No companies in this fund');
 const rows=await rowsForCycle(db,{fund:f.id,period});
 const absent=await db.query('select c.name,m.name as metric from subscriptions s join companies c on c.id=s.company_id join metrics m on m.id=s.metric_id join holdings h on h.company_id=c.id where h.fund_id=$1 and not c.archived and not exists(select 1 from requirements r where r.company_id=s.company_id and r.metric_id=s.metric_id and r.period=$2)',[f.id,period]);
 if(absent.length)throw Error('Reporting requirements missing: '+absent.map(r=>r.name+' '+r.metric).join(', '));
 for(const c of cs){const rs=rows.filter(r=>r.company_id===c.id);if(!rs.length)throw Error(`No reporting requirements: ${c.name}`);const bad=rs.filter(r=>r.state!=='approved');if(bad.length)throw Error(`Missing or unapproved figures: ${c.name}: ${bad.map(r=>r.metric).join(', ')}`);if(c.review_due<today())throw Error(`Company review overdue: ${c.name}`);if(c.personal&&(!c.purpose?.trim()||!c.accuracy_evidence?.trim()||!c.retention_review||c.retention_review<today()))throw Error(`Personal evidence incomplete: ${c.name}`);}
 const evidence=await db.query('select * from latest_observations where id=any($1::uuid[]) order by company,metric',[rows.map(r=>r.observation_id)]);
 const snapshot={fund:{id:f.id,name:f.name},period,companies:cs,requirements:rows,observations:evidence,scope:'Internal portfolio KPI report. No valuation, tax, payment or investment advice.'},digest=hash(snapshot);
 const [p]=await db.query('insert into packs(fund_id,period,actor,snapshot,digest) values($1,$2,$3,$4,$5) returning id',[f.id,period,actor,JSON.stringify(snapshot),digest]);
 const file=writeOut('drafts','pack-'+p.id,page({title:'Checked portfolio reporting pack',subtitle:`${f.name} | ${period} | Internal review only`,sections:[{title:'Figures',html:table(rows,['company','metric','period','value','currency','state'])},{title:'Source evidence',html:table(evidence,['company','metric','source','actor','reviewer','review_evidence'])},{title:'Snapshot',html:table([{digest,scope:snapshot.scope}])}]}));
 return {id:p.id,file,digest,figures:rows.length,sent:false};}
 case 'packs':return db.query('select id,fund_id,period,actor,digest,created_at from packs order by created_at desc');
 default:throw Error(`Unknown command ${cmd}`);
 }
}
export async function run(db,cmd,args=[],o={}){
 if(!Object.hasOwn(usage,cmd))throw Error(`Unknown command ${cmd}; run help`);
 const [count,allowed]=usage[cmd];if(args.length!==count)throw Error(`${cmd}: expected ${count} positional arguments. ${usage[cmd][2]}`);
 for(const k of Object.keys(o))if(!allowed.includes(k))throw Error(`Unknown option --${k}`);
 for(const [k,v] of Object.entries(o)){if(k==='dry-run'){if(v!==true)throw Error('--dry-run is a boolean flag');}else if(typeof v!=='string'||!v.trim())throw Error(`--${k} needs a value`);}
 if(cmd==='help')return inner(db,cmd,args,o);
 await db.exec(mutating.has(cmd)?'BEGIN ISOLATION LEVEL REPEATABLE READ':'BEGIN READ ONLY');
 try{const result=await inner(db,cmd,args,o);await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}
}
export function parseArgs(argv){const args=[],o={};let json=false;for(const a of argv){if(a==='--json'){json=true;continue;}if(a.startsWith('--')){const i=a.indexOf('='),k=a.slice(2,i===-1?undefined:i);if(Object.hasOwn(o,k))throw Error(`Duplicate option --${k}`);o[k]=i===-1?true:a.slice(i+1);}else args.push(a);}return {cmd:args.shift()||'help',args,o,json};}
export function display(v){if(Array.isArray(v)&&v.every(x=>x&&typeof x==='object'&&!Array.isArray(x))){if(!v.length)return '(none)';const keys=Object.keys(v[0]);return textTable(v.map(r=>Object.fromEntries(keys.map(k=>[k,typeof r[k]==='object'&&r[k]!==null?JSON.stringify(r[k]):r[k]]))),keys.map(k=>({key:k,label:k,width:k==='id'||k.endsWith('_id')?12:55})));}return JSON.stringify(v,null,2);}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{const {cmd,args,o,json}=parseArgs(process.argv.slice(2));if(cmd!=='help')db=await getDb();const result=await run(db,cmd,args,o);const columns={'collection-week':['company','metric','period','due','state'],'metrics-due':['company','metric','period','due','state'],watchlist:['company','currency','period','cash','monthly_burn','runway_months','age_days'],variance:['company','metric','period','value','currency','change_percent','review_state','target_state']};const human=Array.isArray(result)&&columns[cmd]?result.map(r=>Object.fromEntries(columns[cmd].map(k=>[k,r[k]]))):result;console.log(json?JSON.stringify(result,null,2):display(human));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
