export type AuthMode = "mock" | "api" | "keycloak";

const rawMode = (import.meta.env.VITE_AUTH_MODE ?? "mock").toLowerCase();
const authMode: AuthMode =
  rawMode === "keycloak" ? "keycloak" : rawMode === "api" ? "api" : "mock";

export const authConfig = {
  mode: authMode,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api",
  timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? "15000"),
  keycloak: {
    url: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:9090",
    realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "attendance",
    clientId:
      import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "attendance-frontend",
  },
};

