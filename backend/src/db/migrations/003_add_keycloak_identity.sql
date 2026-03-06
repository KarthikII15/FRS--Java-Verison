alter table if exists ivis_user
  add column if not exists keycloak_sub varchar(64) unique,
  add column if not exists auth_provider varchar(20) not null default 'internal'
    check (auth_provider in ('internal', 'keycloak', 'federated')),
  add column if not exists last_identity_sync_at timestamptz;

create index if not exists idx_ivis_user_keycloak_sub on ivis_user(keycloak_sub);
