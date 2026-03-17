create extension if not exists pgcrypto;

create table if not exists frs_user (
  pk_user_id bigserial primary key,
  email varchar(320) not null unique,
  username varchar(150) not null,
  fk_user_type_id int not null,
  role varchar(20) not null check (role in ('admin', 'hr')),
  password_hash varchar(255) not null,
  department varchar(150),
  created_at timestamptz not null default now()
);

create table if not exists frs_tenant (
  pk_tenant_id bigserial primary key,
  tenant_name varchar(200) not null
);

create table if not exists frs_customer (
  pk_customer_id bigserial primary key,
  customer_name varchar(200) not null,
  fk_tenant_id bigint not null references frs_tenant(pk_tenant_id)
);

create table if not exists frs_site (
  pk_site_id bigserial primary key,
  site_name varchar(200) not null,
  fk_customer_id bigint not null references frs_customer(pk_customer_id)
);

create table if not exists frs_unit (
  pk_unit_id bigserial primary key,
  unit_name varchar(200) not null,
  fk_site_id bigint not null references frs_site(pk_site_id)
);

create table if not exists frs_tenant_user_map (
  fk_user_id bigint not null references frs_user(pk_user_id),
  fk_tenant_id bigint not null references frs_tenant(pk_tenant_id),
  primary key (fk_user_id, fk_tenant_id)
);

create table if not exists frs_customer_user_map (
  fk_user_id bigint not null references frs_user(pk_user_id),
  fk_customer_id bigint not null references frs_customer(pk_customer_id),
  primary key (fk_user_id, fk_customer_id)
);

create table if not exists frs_user_membership (
  pk_membership_id bigserial primary key,
  fk_user_id bigint not null references frs_user(pk_user_id),
  role varchar(20) not null check (role in ('admin', 'hr')),
  tenant_id bigint not null references frs_tenant(pk_tenant_id),
  customer_id bigint references frs_customer(pk_customer_id),
  site_id bigint references frs_site(pk_site_id),
  unit_id bigint references frs_unit(pk_unit_id),
  permissions text[] not null default '{}'::text[]
);

create table if not exists auth_session_token (
  token_id uuid primary key default gen_random_uuid(),
  fk_user_id bigint not null references frs_user(pk_user_id),
  access_token varchar(128) not null unique,
  refresh_token varchar(128) not null unique,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  revoked boolean not null default false,
  user_agent varchar(512),
  ip_address varchar(45),
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_session_token_refresh on auth_session_token(refresh_token);
create index if not exists idx_auth_session_token_access on auth_session_token(access_token);
create index if not exists idx_membership_user on frs_user_membership(fk_user_id);
create index if not exists idx_membership_scope on frs_user_membership(tenant_id, customer_id, site_id, unit_id);
create unique index if not exists uq_membership_user_scope_role
  on frs_user_membership(fk_user_id, role, tenant_id, customer_id, site_id, unit_id);
