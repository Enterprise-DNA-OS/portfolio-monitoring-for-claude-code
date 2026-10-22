insert into funds(id,name) values ('10000000-0000-4000-8000-000000000001','Harbour Growth'),('10000000-0000-4000-8000-000000000002','Tasman Ventures') on conflict do nothing;
insert into companies(id,source_id,name,sector,country,currency,owner,review_due,personal,purpose,retention_review,accuracy_evidence) values
('20000000-0000-4000-8000-000000000001','demo-fern','Fern Sensors','Industrial','NZ','NZD','Aroha Chen',current_date+30,false,null,null,null),
('20000000-0000-4000-8000-000000000002','demo-tidal','Tidal Software','Software','AU','AUD','Mia Wilson',current_date-5,false,null,null,null),
('20000000-0000-4000-8000-000000000003','demo-grove','Grove Materials','Industrial','NZ','NZD','Aroha Chen',current_date+20,true,'Founder reporting contact',current_date-2,null) on conflict do nothing;
insert into holdings(fund_id,company_id) select f.id,c.id from funds f cross join companies c where f.name='Harbour Growth' or c.name='Tidal Software' on conflict do nothing;
insert into metrics(id,name,unit,direction) values
('30000000-0000-4000-8000-000000000001','Revenue','money','higher'),
('30000000-0000-4000-8000-000000000002','Cash','money','higher'),
('30000000-0000-4000-8000-000000000003','Monthly burn','money','lower'),
('30000000-0000-4000-8000-000000000004','Headcount','count','neutral') on conflict do nothing;
insert into subscriptions(company_id,metric_id,target) select c.id,m.id,case when m.name='Revenue' then 100000 else null end from companies c cross join metrics m on conflict do nothing;
insert into requirements(company_id,metric_id,period,due) select c.id,m.id,(date_trunc('month',current_date)::date-1),current_date-3 from companies c cross join metrics m on conflict do nothing;
insert into observations(company_id,metric_id,period,value,currency,revision,source,actor,note)
select c.id,m.id,(date_trunc('month',current_date)::date-1),case m.name when 'Revenue' then 80000 when 'Cash' then 180000 when 'Monthly burn' then 60000 else 12 end,case when m.unit='money' then c.currency end,1,'Fictional monthly management report','Demo editor','Seed data'
from companies c cross join metrics m where c.name='Fern Sensors' on conflict do nothing;
insert into observations(company_id,metric_id,period,value,currency,revision,source,actor,note)
select c.id,m.id,(date_trunc('month',current_date)-interval '1 month')::date-1,100000,c.currency,1,'Fictional previous monthly report','Demo editor','Seed data'
from companies c cross join metrics m where c.name='Fern Sensors' and m.name='Revenue' on conflict do nothing;
insert into decisions(observation_id,decision,actor,evidence) select o.id,'approved','Demo reviewer','Fictional source checked' from observations o where o.note='Seed data' and not exists(select 1 from decisions d where d.observation_id=o.id);
insert into actions(id,company_id,title,owner,due) values ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','Confirm missing monthly figures','Mia Wilson',current_date-2) on conflict do nothing;
insert into updates(id,company_id,note,source,actor) values ('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Pilot delivery moved to next month','Fictional board note','Demo editor') on conflict do nothing;
