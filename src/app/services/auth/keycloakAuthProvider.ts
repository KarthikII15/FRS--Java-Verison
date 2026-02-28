import { User, UserMembership, AccessScope } from "../../types";
import { apiRequest } from "../http/apiClient";
import { AuthBootstrap, AuthProvider, AuthSession } from "./types";
import { derivePermissionsForScope } from "./permissionUtils";
import keycloak from "./keycloakInstance";

/* ------------------------------------------------------------------ */
/*  Types for bootstrap response                                       */
/* ------------------------------------------------------------------ */

interface ApiUser {
    id: string;
    email: string;
    role: "admin" | "hr";
    name: string;
    department?: string;
    createdAt: string | Date;
}

interface BootstrapResponse {
    user: User | ApiUser;
    memberships: UserMembership[];
    activeScope?: AccessScope | null;
    tenants: AuthBootstrap["catalog"]["tenants"];
    customers: AuthBootstrap["catalog"]["customers"];
    sites: AuthBootstrap["catalog"]["sites"];
    units: AuthBootstrap["catalog"]["units"];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function normalizeUser(user: User | ApiUser): User {
    return {
        ...user,
        password: (user as User).password ?? "",
        createdAt:
            user.createdAt instanceof Date
                ? user.createdAt
                : new Date(user.createdAt),
    };
}

const emptyCatalog = () => ({
    tenants: [] as AuthBootstrap["catalog"]["tenants"],
    customers: [] as AuthBootstrap["catalog"]["customers"],
    sites: [] as AuthBootstrap["catalog"]["sites"],
    units: [] as AuthBootstrap["catalog"]["units"],
});

/* ------------------------------------------------------------------ */
/*  Token refresh interval (Diagram 4: every 30 s, min-validity 60 s) */
/* ------------------------------------------------------------------ */

let refreshInterval: ReturnType<typeof setInterval> | null = null;

function startTokenRefreshLoop() {
    stopTokenRefreshLoop();
    refreshInterval = setInterval(async () => {
        try {
            // updateToken(60) refreshes if the token expires within 60 s
            await keycloak.updateToken(60);
        } catch {
            // Refresh failed — Keycloak session expired
            keycloak.login();
        }
    }, 30_000); // every 30 seconds
}

function stopTokenRefreshLoop() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

/* ------------------------------------------------------------------ */
/*  Keycloak Auth Provider                                             */
/* ------------------------------------------------------------------ */

export const keycloakAuthProvider: AuthProvider = {
    /**
     * Initialize Keycloak and fetch memberships from our backend.
     *
     * Flow (Diagram 1 + 2):
     *  1. keycloak.init() — OIDC Auth Code + PKCE
     *  2. GET /api/auth/bootstrap (Bearer JWT)
     *  3. Backend verifies JWT, finds/provisions user, loads memberships
     *  4. Frontend stores AuthSession in Context
     */
    async initialize(_tokens) {
        try {
            const authenticated = await keycloak.init({
                onLoad: "login-required",
                pkceMethod: "S256",
                silentCheckSsoRedirectUri:
                    window.location.origin + "/silent-check-sso.html",
            });

            if (!authenticated || !keycloak.token) {
                return { session: null, catalog: emptyCatalog() };
            }

            // Start the token refresh loop (Diagram 4)
            startTokenRefreshLoop();

            // Fetch memberships + catalog from our backend
            const bootstrap = await apiRequest<BootstrapResponse>(
                "/auth/bootstrap",
                {
                    method: "GET",
                    accessToken: keycloak.token,
                }
            );

            return {
                session: {
                    user: normalizeUser(bootstrap.user),
                    accessToken: keycloak.token,
                    refreshToken: null, // Keycloak manages refresh internally
                    memberships: bootstrap.memberships,
                    activeScope:
                        bootstrap.activeScope ??
                        bootstrap.memberships[0]?.scope ??
                        null,
                },
                catalog: {
                    tenants: bootstrap.tenants,
                    customers: bootstrap.customers,
                    sites: bootstrap.sites,
                    units: bootstrap.units,
                },
            };
        } catch {
            return { session: null, catalog: emptyCatalog() };
        }
    },

    /**
     * Login — redirect to Keycloak login page.
     * The email/password params are ignored; Keycloak handles credentials.
     */
    async login(_email, _password) {
        keycloak.login();
        // This redirects — the promise never resolves.
        return null as unknown as AuthSession;
    },

    /**
     * Logout (Diagram 5):
     *  1. Stop the refresh interval
     *  2. keycloak.logout({ redirectUri }) — destroys Keycloak session
     *  3. Redirects to app in unauthenticated state
     */
    async logout(_refreshToken) {
        stopTokenRefreshLoop();
        keycloak.logout({ redirectUri: window.location.origin });
    },

    /** Permission derivation — unchanged, same logic as mock/api modes. */
    derivePermissions: derivePermissionsForScope,
};
