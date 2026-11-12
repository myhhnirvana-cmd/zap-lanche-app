create index if not exists admin_audit_logs_actor_profile_id_idx
  on public.admin_audit_logs (actor_profile_id);
create index if not exists admin_audit_logs_subject_profile_id_idx
  on public.admin_audit_logs (subject_profile_id);
create index if not exists admin_audit_logs_restaurant_id_idx
  on public.admin_audit_logs (restaurant_id);

insert into public.admin_audit_logs (
  event_type, action, actor_profile_id, subject_profile_id, restaurant_id,
  source_table, source_record_id, details, created_at
)
select
  'pontos',
  'Movimentação histórica de pontos · ' || coalesce(lt.transaction_type, 'transação'),
  null,
  lt.profile_id,
  lt.restaurant_id,
  'loyalty_transactions',
  lt.id,
  jsonb_build_object(
    'operation', 'HISTORICAL',
    'table', 'loyalty_transactions',
    'points', lt.points::text,
    'transaction_type', lt.transaction_type
  ),
  lt.created_at
from public.loyalty_transactions lt
where not exists (
  select 1
  from public.admin_audit_logs al
  where al.source_table = 'loyalty_transactions'
    and al.source_record_id = lt.id
    and al.event_type = 'pontos'
);