-- =====================================================================
-- RistOro dell'Etna — schema iniziale
-- Eseguire nel SQL Editor di Supabase (o con `supabase db push`).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Ruoli staff / admin
-- ---------------------------------------------------------------------
create table if not exists public.staff_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin', 'staff')),
  name       text,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_members where user_id = auth.uid());
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_members where user_id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------
-- Menù
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  description text,
  position   int  not null default 0,
  is_active  boolean not null default true,
  -- le pizze contano per la capacità del forno per slot
  counts_for_capacity boolean not null default false
);

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories(id) on delete cascade,
  name         text not null,
  description  text,
  price        numeric(8,2) not null check (price >= 0),
  image_url    text,
  allergens    text[] not null default '{}',
  tags         text[] not null default '{}',
  is_available boolean not null default true,
  is_featured  boolean not null default false,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id, position);

create table if not exists public.modifier_groups (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  type      text not null check (type in ('single', 'multiple')),
  required  boolean not null default false,
  min       int not null default 0,
  max       int,
  position  int not null default 0
);

create table if not exists public.modifiers (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.modifier_groups(id) on delete cascade,
  name         text not null,
  price_delta  numeric(8,2) not null default 0,
  is_default   boolean not null default false,
  is_available boolean not null default true,
  position     int not null default 0
);

create table if not exists public.product_modifier_groups (
  product_id uuid not null references public.products(id) on delete cascade,
  group_id   uuid not null references public.modifier_groups(id) on delete cascade,
  primary key (product_id, group_id)
);

-- ---------------------------------------------------------------------
-- Consegna, orari, impostazioni
-- ---------------------------------------------------------------------
create table if not exists public.delivery_zones (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  description text,
  radius_km  numeric(6,2),          -- zona circolare dal locale...
  polygon    jsonb,                 -- ...oppure poligono GeoJSON [[lng,lat],...]
  fee        numeric(8,2) not null default 0,
  min_order  numeric(8,2) not null default 0,
  free_over  numeric(8,2),
  is_active  boolean not null default true,
  position   int not null default 0
);

create table if not exists public.opening_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    int  not null check (weekday between 0 and 6), -- 0 = domenica
  open_time  time not null,
  close_time time not null  -- 00:00 = mezzanotte (fine giornata)
);

create table if not exists public.closures (
  id        uuid primary key default gen_random_uuid(),
  date_from date not null,
  date_to   date not null,
  reason    text,
  check (date_to >= date_from)
);

create table if not exists public.settings (
  id                   int primary key default 1 check (id = 1),
  prep_time_pickup     int not null default 25,
  prep_time_delivery   int not null default 45,
  slot_minutes         int not null default 15,
  slot_capacity        int not null default 8,   -- pizze per slot
  days_ahead           int not null default 3,
  orders_paused        boolean not null default false,
  pause_message        text default 'Stasera siamo al completo: gli ordini online sono sospesi. Chiamaci per informazioni!',
  pay_online           boolean not null default true,
  pay_cash             boolean not null default true,
  pay_pos              boolean not null default true,
  pickup_enabled       boolean not null default true,
  delivery_enabled     boolean not null default true,
  phone                text default '+39 353 375 8344',
  phone_landline       text default '095 586 0993',
  whatsapp             text default '393533758344',
  email                text default 'info@ristorodelletna.it',
  company_name         text default 'RistOro dell''Etna [DA CONFERMARE]',
  vat_number           text default '[DA CONFERMARE]',
  announcement         text,
  updated_at           timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------
-- Clienti
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id                uuid primary key default gen_random_uuid(),
  auth_user_id      uuid unique references auth.users(id) on delete set null,
  first_name        text,
  last_name         text,
  phone             text,
  email             text,
  marketing_consent boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists customers_phone_idx on public.customers(phone);

create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  street      text not null,
  number      text,
  city        text not null,
  cap         text,
  notes       text,
  lat         double precision,
  lng         double precision,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Codici sconto
-- ---------------------------------------------------------------------
create table if not exists public.discount_codes (
  code       text primary key,
  type       text not null check (type in ('percent', 'fixed')),
  value      numeric(8,2) not null check (value > 0),
  min_order  numeric(8,2) not null default 0,
  expires_at timestamptz,
  max_uses   int,
  used       int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Ordini
-- ---------------------------------------------------------------------
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  number            int not null unique default nextval('public.order_number_seq'),
  customer_id       uuid references public.customers(id) on delete set null,
  type              text not null check (type in ('pickup', 'delivery')),
  status            text not null default 'nuovo' check (status in (
                      'in_attesa_pagamento', 'nuovo', 'accettato', 'in_preparazione',
                      'pronto', 'in_consegna', 'completato', 'rifiutato', 'annullato')),
  asap              boolean not null default true,
  scheduled_for     timestamptz not null,
  estimated_ready_at timestamptz,
  customer_name     text not null,
  customer_phone    text not null,
  customer_email    text,
  address           jsonb,            -- snapshot indirizzo
  zone_id           uuid references public.delivery_zones(id) on delete set null,
  zone_name         text,
  pizza_count       int not null default 0,
  subtotal          numeric(8,2) not null,
  delivery_fee      numeric(8,2) not null default 0,
  discount          numeric(8,2) not null default 0,
  discount_code     text,
  total             numeric(8,2) not null,
  payment_method    text not null check (payment_method in ('online', 'cash', 'pos')),
  payment_status    text not null default 'pending' check (payment_status in ('pending', 'paid', 'refunded', 'failed', 'unpaid')),
  change_for        numeric(8,2),     -- "mi serve il resto da €50"
  stripe_payment_id text,
  notes             text,
  status_reason     text,
  marketing_consent boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists orders_status_idx on public.orders(status, created_at desc);
create index if not exists orders_scheduled_idx on public.orders(scheduled_for);
create index if not exists orders_customer_idx on public.orders(customer_id);

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  name        text not null,
  unit_price  numeric(8,2) not null,
  quantity    int not null check (quantity > 0),
  modifiers   jsonb not null default '[]',
  notes       text
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- Tabella pubblica di tracciamento: solo stato + orari, nessun dato personale.
-- Permette al cliente (anche ospite) di seguire l'ordine in Realtime conoscendo l'UUID.
create table if not exists public.order_tracking (
  order_id           uuid primary key references public.orders(id) on delete cascade,
  number             int not null,
  type               text not null,
  status             text not null,
  status_reason      text,
  scheduled_for      timestamptz,
  estimated_ready_at timestamptz,
  updated_at         timestamptz not null default now()
);

-- updated_at in BEFORE; la riga di tracking va scritta AFTER (vincolo FK)
create or replace function public.touch_order() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_order();

create or replace function public.sync_order_tracking_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.order_tracking (order_id, number, type, status, status_reason, scheduled_for, estimated_ready_at, updated_at)
  values (new.id, new.number, new.type, new.status, new.status_reason, new.scheduled_for, new.estimated_ready_at, now())
  on conflict (order_id) do update set
    status = excluded.status,
    status_reason = excluded.status_reason,
    scheduled_for = excluded.scheduled_for,
    estimated_ready_at = excluded.estimated_ready_at,
    updated_at = now();
  return null;
end $$;

drop trigger if exists orders_tracking on public.orders;
create trigger orders_tracking after insert or update on public.orders
  for each row execute function public.sync_order_tracking_after();

-- Incremento atomico dei codici sconto (chiamato dal server)
create or replace function public.redeem_discount(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  update public.discount_codes
     set used = used + 1
   where code = upper(p_code)
     and is_active
     and (expires_at is null or expires_at > now())
     and (max_uses is null or used < max_uses)
  returning true into ok;
  return coalesce(ok, false);
end $$;
revoke execute on function public.redeem_discount(text) from anon, authenticated;

-- ---------------------------------------------------------------------
-- Prenotazioni ed eventi
-- ---------------------------------------------------------------------
create table if not exists public.reservations (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  time       time not null,
  people     int  not null check (people between 1 and 200),
  name       text not null,
  phone      text not null,
  email      text,
  notes      text,
  status     text not null default 'in_attesa' check (status in ('in_attesa', 'confermata', 'rifiutata')),
  created_at timestamptz not null default now()
);

create table if not exists public.event_requests (
  id         uuid primary key default gen_random_uuid(),
  event_type text not null,
  date       date,
  guests     int,
  name       text not null,
  phone      text not null,
  email      text,
  message    text,
  status     text not null default 'in_attesa' check (status in ('in_attesa', 'confermata', 'rifiutata')),
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.staff_members           enable row level security;
alter table public.categories              enable row level security;
alter table public.products                enable row level security;
alter table public.modifier_groups         enable row level security;
alter table public.modifiers               enable row level security;
alter table public.product_modifier_groups enable row level security;
alter table public.delivery_zones          enable row level security;
alter table public.opening_hours           enable row level security;
alter table public.closures                enable row level security;
alter table public.settings                enable row level security;
alter table public.customers               enable row level security;
alter table public.addresses               enable row level security;
alter table public.discount_codes          enable row level security;
alter table public.orders                  enable row level security;
alter table public.order_items             enable row level security;
alter table public.order_tracking          enable row level security;
alter table public.reservations            enable row level security;
alter table public.event_requests          enable row level security;

-- staff_members: ognuno vede il proprio ruolo, l'admin vede tutti
create policy staff_self_read on public.staff_members for select using (user_id = auth.uid() or public.is_admin());
create policy staff_admin_all on public.staff_members for all using (public.is_admin()) with check (public.is_admin());

-- Catalogo e configurazione: lettura pubblica, scrittura solo admin
do $$
declare t text;
begin
  foreach t in array array['categories','products','modifier_groups','modifiers','product_modifier_groups',
                           'delivery_zones','opening_hours','closures','settings']
  loop
    execute format('create policy %I on public.%I for select using (true)', t || '_public_read', t);
    execute format('create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())', t || '_admin_write', t);
  end loop;
end $$;

-- Lo staff può mettere in pausa gli ordini (serata piena) e segnare piatti esauriti
create policy settings_staff_update on public.settings for update using (public.is_staff()) with check (public.is_staff());
create policy products_staff_update on public.products for update using (public.is_staff()) with check (public.is_staff());

-- Clienti: ognuno vede/modifica se stesso, lo staff vede tutti
create policy customers_self on public.customers for select using (auth_user_id = auth.uid() or public.is_staff());
create policy customers_self_update on public.customers for update using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
create policy customers_staff on public.customers for all using (public.is_admin()) with check (public.is_admin());

create policy addresses_self on public.addresses for all
  using (exists (select 1 from public.customers c where c.id = customer_id and c.auth_user_id = auth.uid()) or public.is_staff())
  with check (exists (select 1 from public.customers c where c.id = customer_id and c.auth_user_id = auth.uid()) or public.is_staff());

-- Codici sconto: solo admin (la validazione pubblica passa dal server)
create policy discount_admin on public.discount_codes for all using (public.is_admin()) with check (public.is_admin());

-- Ordini: i clienti leggono solo i propri; lo staff legge e aggiorna tutto.
-- La creazione avviene SOLO dal server (service role) dopo il ricalcolo dei prezzi.
create policy orders_customer_read on public.orders for select
  using (public.is_staff() or exists (select 1 from public.customers c where c.id = customer_id and c.auth_user_id = auth.uid()));
create policy orders_staff_update on public.orders for update using (public.is_staff()) with check (public.is_staff());

create policy order_items_read on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (
    public.is_staff() or exists (select 1 from public.customers c where c.id = o.customer_id and c.auth_user_id = auth.uid()))));

-- Tracking: leggibile da chiunque conosca l'UUID (nessun dato personale)
create policy tracking_public_read on public.order_tracking for select using (true);

-- Prenotazioni / eventi: inserimento dal server, gestione staff
create policy reservations_staff on public.reservations for all using (public.is_staff()) with check (public.is_staff());
create policy events_staff on public.event_requests for all using (public.is_staff()) with check (public.is_staff());

-- =====================================================================
-- Realtime
-- =====================================================================
alter table public.orders replica identity full;
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.orders'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.order_tracking'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.reservations'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.settings'; exception when others then null; end;
end $$;

-- =====================================================================
-- Storage: bucket pubblico per le foto del menù
-- =====================================================================
insert into storage.buckets (id, name, public) values ('menu', 'menu', true) on conflict (id) do nothing;

create policy menu_images_public_read on storage.objects for select using (bucket_id = 'menu');
create policy menu_images_admin_insert on storage.objects for insert with check (bucket_id = 'menu' and public.is_admin());
create policy menu_images_admin_update on storage.objects for update using (bucket_id = 'menu' and public.is_admin());
create policy menu_images_admin_delete on storage.objects for delete using (bucket_id = 'menu' and public.is_admin());
