# Keycloak Setup for Team Members

## Quick Start (One Command)

Your team members can start the entire stack (Keycloak + Database + Backend) with a single command:

```bash
docker-compose -f docker-compose.keycloak.yml up -d
```

This will:
1. Start PostgreSQL database with migrations
2. Start Keycloak with pre-configured realm
3. Start backend in Keycloak mode
4. Create test users: `admin@company.com` / `admin123` and `hr@company.com` / `hr123`

## What's Pre-Configured?

The `keycloak/realm-export.json` includes:

✅ **Realm**: `attendance-intelligence`  
✅ **Frontend Client**: `attendance-frontend` (public, PKCE enabled)  
✅ **API Client**: `attendance-api` (bearer-only)  
✅ **Roles**: `admin`, `hr`, `user`  
✅ **Test Users**:
   - admin@company.com / admin123 (admin role)
   - hr@company.com / hr123 (hr role)

## Manual Setup (If Not Using Docker)

If team members prefer manual setup, they need to:

### 1. Start Keycloak
```bash
docker run -p 9090:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:24.0.2 start-dev
```

### 2. Import Realm
1. Go to http://localhost:9090/admin (login: admin/admin)
2. Click "Create realm"
3. Click "Browse" and select `keycloak/realm-export.json`
4. Click "Create"

### 3. Configure Environment

**Backend `.env`:**
```bash
AUTH_MODE=keycloak
KEYCLOAK_URL=http://localhost:9090
KEYCLOAK_REALM=attendance-intelligence
KEYCLOAK_ISSUER=http://localhost:9090/realms/attendance-intelligence
KEYCLOAK_AUDIENCE=attendance-api
KEYCLOAK_JWKS_URI=http://localhost:9090/realms/attendance-intelligence/protocol/openid-connect/certs
```

**Frontend `.env`:**
```bash
VITE_AUTH_MODE=keycloak
VITE_KEYCLOAK_URL=http://localhost:9090
VITE_KEYCLOAK_REALM=attendance-intelligence
VITE_KEYCLOAK_CLIENT_ID=attendance-frontend
```

## Development Workflow

### Option 1: Full Docker Stack (Recommended for new team members)
```bash
# Start everything
docker-compose -f docker-compose.keycloak.yml up -d

# View logs
docker-compose -f docker-compose.keycloak.yml logs -f

# Stop everything
docker-compose -f docker-compose.keycloak.yml down
```

### Option 2: Docker Keycloak + Local Development
```bash
# Terminal 1: Start Keycloak and DB only
docker-compose -f docker-compose.keycloak.yml up -d keycloak keycloak-db postgres

# Terminal 2: Run backend locally (for debugging)
cd backend
npm install
npm run dev

# Terminal 3: Run frontend locally
npm install
npm run dev
```

### Option 3: Legacy Mode (No Keycloak)
If team members want to work without Keycloak:
```bash
# Backend .env
AUTH_MODE=api

# Frontend .env
VITE_AUTH_MODE=api

# Then start normally - uses email/password login
```

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Keycloak Admin | http://localhost:9090/admin | admin/admin |
| Frontend App | http://localhost:5173 | Use Keycloak login |
| Backend API | http://localhost:8080/api | Bearer token from Keycloak |
| PostgreSQL | localhost:5432 | postgres/postgres |

## Troubleshooting

### Keycloak not importing realm?
```bash
# Manual import
docker cp keycloak/realm-export.json attendance-keycloak:/tmp/
docker exec attendance-keycloak /opt/keycloak/bin/kc.sh import --file /tmp/realm-export.json
```

### CORS errors?
Make sure `Web Origins` in Keycloak client includes `http://localhost:5173`

### JWT validation failing?
Check that `KEYCLOAK_ISSUER` matches exactly what's in the token (check via jwt.io)

### Database connection issues?
```bash
# Reset database
docker-compose -f docker-compose.keycloak.yml down -v
docker-compose -f docker-compose.keycloak.yml up -d
```

## Files for Team Members

Share these files with your team:
- `docker-compose.keycloak.yml` - Full stack setup
- `keycloak/realm-export.json` - Pre-configured realm
- `.env.example` - Environment variable template
- `KEYCLOAK_SETUP_README.md` - This guide

No manual Keycloak configuration needed!
