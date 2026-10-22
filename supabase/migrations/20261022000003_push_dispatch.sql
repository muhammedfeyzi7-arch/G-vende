-- Push gönderim kayıtları: aynı olay için tekrar bildirim gönderilmesini ve
-- kullanıcı başına çok sık bildirim gönderilmesini önler. Yalnızca service_role erişir.
create table public.notified_events (
  event_key text primary key,
  magnitude numeric(3, 1),
  notified_at timestamptz not null default now()
);
create table public.push_deliveries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_sent_at timestamptz not null
);
alter table public.notified_events enable row level security;
alter table public.push_deliveries enable row level security;
revoke all on public.notified_events, public.push_deliveries from anon, authenticated;
