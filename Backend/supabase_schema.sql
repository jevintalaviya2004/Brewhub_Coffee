-- BrewHub database schema for Supabase (Postgres)
-- Run this in Supabase: SQL Editor -> New query -> paste -> Run

-- 1. Companies
create table if not exists companies (
  id         bigint generated always as identity primary key,
  name       text not null,
  logo_url   text default '',
  created_at timestamptz not null default now()
);

-- 2. Employees (users)
create table if not exists users (
  id         bigint generated always as identity primary key,
  company_id bigint not null references companies(id) on delete cascade,
  first_name text not null,
  last_name  text not null,
  email      text not null,
  pin        text not null,
  created_at timestamptz not null default now()
);

-- 3. Products (drinks)
create table if not exists products (
  id         bigint generated always as identity primary key,
  name       text not null,
  price      numeric(10,2) not null check (price >= 0),
  created_at timestamptz not null default now()
);

-- 4. Orders
create table if not exists orders (
  id               bigint generated always as identity primary key,
  reference_number uuid not null default gen_random_uuid(),
  user_id          bigint not null references users(id) on delete cascade,
  total            numeric(10,2) not null default 0,
  created_at       timestamptz not null default now()
);

-- 5. Order items
create table if not exists order_items (
  id         bigint generated always as identity primary key,
  order_id   bigint not null references orders(id) on delete cascade,
  product_id bigint references products(id) on delete set null,
  quantity   integer not null check (quantity > 0),
  price      numeric(10,2) not null
);

-- 6. Admins
create table if not exists admins (
  id         bigint generated always as identity primary key,
  name       text,
  email      text not null unique,
  password   text not null,          -- bcrypt hash, never plain text
  created_at timestamptz not null default now()
);

-- Indexes for the queries the backend uses
create index if not exists idx_users_company      on users(company_id);
create index if not exists idx_orders_user        on orders(user_id);
create index if not exists idx_orders_created_at  on orders(created_at);
create index if not exists idx_order_items_order  on order_items(order_id);

-- Security: turn on Row Level Security with no policies.
-- The backend uses the service_role key, which skips RLS.
-- The public anon key can then read or change nothing.
alter table companies   enable row level security;
alter table users       enable row level security;
alter table products    enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table admins      enable row level security;

-- ---------------------------------------------------------------
-- First admin account. CHANGE the email and the password first.
-- crypt(..., gen_salt('bf')) makes a bcrypt hash that passlib accepts.
-- ---------------------------------------------------------------
insert into admins (name, email, password)
values ('Admin', 'admin@example.com',
        extensions.crypt('CHANGE-THIS-PASSWORD', extensions.gen_salt('bf')))
on conflict (email) do nothing;

-- ---------------------------------------------------------------
-- Optional test data (delete this part if you do not want it)
-- The logo paths point to frontend/public/company-logos
-- ---------------------------------------------------------------
insert into companies (name, logo_url) values
  ('THD',             '/company-logos/thd.jpeg'),
  ('Zollner',         '/company-logos/zollner.jpeg'),
  ('Rohde & Schwarz', '/company-logos/rohde&schwarz.jpeg');

insert into products (name, price) values
  ('Espresso',        1.50),
  ('Cappuccino',      2.20),
  ('Latte Macchiato', 2.50),
  ('Hot Chocolate',   2.00);
