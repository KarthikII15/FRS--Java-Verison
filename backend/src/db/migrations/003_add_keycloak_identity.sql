alter table if exists frs_user
  add column if not exists keycloak_sub varchar(64) unique,
  add column if not exists auth_provider varchar(20) not null default 'internal'
    check (auth_provider in ('internal', 'keycloak', 'federated')),
  add column if not exists last_identity_sync_at timestamptz;

create index if not exists idx_frs_user_keycloak_sub on frs_user(keycloak_sub);
