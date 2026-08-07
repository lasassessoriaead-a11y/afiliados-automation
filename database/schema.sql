create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'admin' check (role in ('admin','user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  marketplace text not null,
  price numeric(14,2) not null default 0 check (price >= 0),
  commission_percent numeric(7,2) not null default 0 check (commission_percent >= 0),
  original_url text not null,
  affiliate_url text,
  status text not null default 'active' check (status in ('active','paused','archived')),
  clicks integer not null default 0 check (clicks >= 0),
  conversions integer not null default 0 check (conversions >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists affiliate_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  marketplace text not null,
  original_url text not null,
  affiliate_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists products_user_id_idx on products(user_id);
create index if not exists products_marketplace_idx on products(user_id, marketplace);
create index if not exists products_created_at_idx on products(user_id, created_at desc);
create index if not exists affiliate_links_user_id_idx on affiliate_links(user_id, created_at desc);
