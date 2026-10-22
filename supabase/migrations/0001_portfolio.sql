create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create function immutable_evidence() returns trigger language plpgsql as $$ begin raise exception 'Evidence is append-only'; end $$;
create table funds(id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index fund_name on funds(lower(name));
create table companies(id uuid primary key default gen_random_uuid(), source_id text unique, name text not null check(length(trim(name))>0), sector text not null, country text not null, currency text not null check(currency ~ '^[A-Z]{3}$'), owner text not null check(length(trim(owner))>0), review_due date not null, personal boolean not null default false, purpose text, retention_review date, accuracy_evidence text, archived boolean not null default false, created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table holdings(id uuid primary key default gen_random_uuid(), fund_id uuid not null references funds,company_id uuid not null references companies, unique(fund_id,company_id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table metrics(id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name))>0),unit text not null check(unit in ('money','count','percent','ratio')),direction text not null check(direction in ('higher','lower','neutral')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index metric_name on metrics(lower(name));
create table subscriptions(id uuid primary key default gen_random_uuid(),company_id uuid not null references companies,metric_id uuid not null references metrics,target numeric(20,4),unique(company_id,metric_id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table requirements(id uuid primary key default gen_random_uuid(),company_id uuid not null references companies,metric_id uuid not null references metrics,period date not null,due date not null,unique(company_id,metric_id,period),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(due>=period));
create table observations(id uuid primary key default gen_random_uuid(),company_id uuid not null references companies,metric_id uuid not null references metrics,period date not null,value numeric(20,4) not null,currency text,revision integer not null check(revision>0),source text not null check(length(trim(source))>0),actor text not null check(length(trim(actor))>0),note text not null, unique(company_id,metric_id,period,revision),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table decisions(id uuid primary key default gen_random_uuid(),observation_id uuid not null references observations,decision text not null check(decision in ('approved','changes')),actor text not null check(length(trim(actor))>0),evidence text not null check(length(trim(evidence))>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table actions(id uuid primary key default gen_random_uuid(),company_id uuid not null references companies,title text not null check(length(trim(title))>0),owner text not null check(length(trim(owner))>0),due date not null,closed_at timestamptz,closure text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table updates(id uuid primary key default gen_random_uuid(),company_id uuid not null references companies,note text not null check(length(trim(note))>0),source text not null check(length(trim(source))>0),actor text not null check(length(trim(actor))>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table imports(id uuid primary key default gen_random_uuid(),digest text not null unique,source_name text not null,actor text not null,inserted integer not null,unchanged integer not null,mapping jsonb not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table packs(id uuid primary key default gen_random_uuid(),fund_id uuid not null references funds,period date not null,actor text not null,snapshot jsonb not null,digest text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table audit(id uuid primary key default gen_random_uuid(),entity_id uuid not null,event text not null,actor text not null,detail jsonb not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create function validate_observation() returns trigger language plpgsql as $$
declare u text; c text; begin
 select unit into u from metrics where id=new.metric_id;
 select currency into c from companies where id=new.company_id;
 if u='money' and new.currency is distinct from c then raise exception 'Currency must match company'; end if;
 if u<>'money' and new.currency is not null then raise exception 'Non-money metric has no currency'; end if;
 if u='count' and (new.value<0 or trunc(new.value)<>new.value) then raise exception 'Count must be a nonnegative integer'; end if;
 if new.period>current_date then raise exception 'Actual reporting period cannot be in the future'; end if;
 return new; end $$;
create trigger validate_observation before insert on observations for each row execute function validate_observation();
create function validate_decision() returns trigger language plpgsql as $$
declare o observations; begin
 select * into o from observations where id=new.observation_id;
 if lower(trim(o.actor))=lower(trim(new.actor)) then raise exception 'Different reviewer required'; end if;
 if exists(select 1 from observations where company_id=o.company_id and metric_id=o.metric_id and period=o.period and revision>o.revision) then raise exception 'Cannot review superseded observation'; end if;
 return new;end $$;
create trigger validate_decision before insert on decisions for each row execute function validate_decision();
create view latest_observations with (security_invoker=true) as
select o.*,c.name as company,m.name as metric,m.unit,m.direction,coalesce(d.decision,'unreviewed') as review_state,d.actor as reviewer,d.evidence as review_evidence
from observations o join companies c on c.id=o.company_id join metrics m on m.id=o.metric_id
left join lateral(select * from decisions where observation_id=o.id order by created_at desc,id desc limit 1)d on true
where not exists(select 1 from observations n where n.company_id=o.company_id and n.metric_id=o.metric_id and n.period=o.period and n.revision>o.revision);
create view collection_week with (security_invoker=true) as
select r.id,r.company_id,r.metric_id,c.name as company,c.owner,m.name as metric,r.period,r.due,o.value,o.currency,coalesce(o.review_state,'missing') as state,o.id as observation_id
from requirements r join companies c on c.id=r.company_id join metrics m on m.id=r.metric_id
left join latest_observations o on o.company_id=r.company_id and o.metric_id=r.metric_id and o.period=r.period
where not c.archived;
create view metric_variance with (security_invoker=true) as
select o.id,o.company_id,o.company,o.metric,o.period,o.value,o.currency,o.unit,o.review_state,p.period as previous_period,p.value as previous_value,
 o.value-p.value as change,case when p.value<>0 then round((o.value-p.value)/abs(p.value)*100,2) end as change_percent,s.target,
 case when s.target is null then 'no target' when o.direction='higher' and o.value<s.target then 'below target' when o.direction='lower' and o.value>s.target then 'above target' else 'within target' end as target_state
from latest_observations o
left join lateral(select * from latest_observations p where p.company_id=o.company_id and p.metric_id=o.metric_id and p.period<o.period order by period desc limit 1)p on true
left join subscriptions s on s.company_id=o.company_id and s.metric_id=o.metric_id;
create view attention with (security_invoker=true) as
select company_id,company,owner,'metric overdue: '||metric as issue,due from collection_week where due<current_date and state<>'approved'
union all select id,name,owner,'company review overdue',review_due from companies where not archived and review_due<current_date
union all select a.company_id,c.name,a.owner,'action overdue: '||a.title,a.due from actions a join companies c on c.id=a.company_id where a.closed_at is null and a.due<current_date
union all select id,name,owner,'personal record needs purpose or accuracy evidence',review_due from companies where personal and (coalesce(trim(purpose),'')='' or coalesce(trim(accuracy_evidence),'')='')
union all select id,name,owner,'retention review due',retention_review from companies where personal and (retention_review is null or retention_review<current_date);
DO $$ declare t text; begin
 foreach t in array ARRAY['funds','companies','holdings','metrics','subscriptions','requirements','observations','decisions','actions','updates','imports','packs','audit'] loop
 execute format('alter table %I enable row level security',t);execute format('revoke all on %I from public',t);
 execute format('create trigger touch_updated before update on %I for each row execute function touch_updated()',t);
 end loop;
 foreach t in array ARRAY['observations','decisions','updates','imports','packs','audit'] loop
 execute format('create trigger immutable_evidence before update or delete on %I for each row execute function immutable_evidence()',t);
 end loop;end $$;
revoke all on latest_observations,collection_week,metric_variance,attention from public;
