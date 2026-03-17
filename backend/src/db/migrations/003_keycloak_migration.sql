-- Keycloak Integration Migration
-- Adds keycloak_sub column to link Keycloak users to app users

-- Add Keycloak subject ID (stable, immutable, unique per Keycloak user)
ALTER TABLE frs_user ADD COLUMN IF NOT EXISTS keycloak_sub VARCHAR(255) UNIQUE;

-- Make password_hash optional (Keycloak manages passwords in keycloak mode)
ALTER TABLE frs_user ALTER COLUMN password_hash DROP NOT NULL;

-- Index for fast lookup by Keycloak sub
CREATE INDEX IF NOT EXISTS idx_frs_user_keycloak_sub ON frs_user(keycloak_sub);
