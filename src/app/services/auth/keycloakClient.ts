import Keycloak, { type KeycloakInstance, type KeycloakInitOptions } from "keycloak-js";
import { authConfig } from "../../config/authConfig";

let keycloak: KeycloakInstance | null = null;
let refreshTimer: number | null = null;

function requireKeycloakConfig() {
  const { url, realm, clientId } = authConfig.keycloak;
  if (!url || !realm || !clientId) {
    throw new Error("Keycloak config is incomplete. Set VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM, and VITE_KEYCLOAK_CLIENT_ID.");
  }
}

export function getKeycloakClient(): KeycloakInstance {
  requireKeycloakConfig();
  if (!keycloak) {
    keycloak = new Keycloak({
      url: authConfig.keycloak.url,
      realm: authConfig.keycloak.realm,
      clientId: authConfig.keycloak.clientId,
    });
  }
  return keycloak;
}

export async function initKeycloak(options?: Partial<KeycloakInitOptions>): Promise<KeycloakInstance> {
  const client = getKeycloakClient();
  if (!client.authenticated && typeof client.token === "undefined") {
    await client.init({
      onLoad: "check-sso",
      checkLoginIframe: false,
      pkceMethod: "S256",
      ...options,
    });
  }
  return client;
}

export function startTokenRefreshLoop(minValiditySec = 30, intervalMs = 20_000) {
  const client = getKeycloakClient();
  if (refreshTimer != null) return;

  refreshTimer = window.setInterval(async () => {
    try {
      if (client.authenticated) {
        await client.updateToken(minValiditySec);
      }
    } catch {
      // Ignore refresh failures here. The app will request re-login on API 401.
    }
  }, intervalMs);
}

export function stopTokenRefreshLoop() {
  if (refreshTimer != null) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
