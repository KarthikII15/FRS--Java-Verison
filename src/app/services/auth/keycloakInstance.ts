import Keycloak from "keycloak-js";
import { authConfig } from "../../config/authConfig";

/**
 * Singleton Keycloak instance.
 * Configured from environment variables via authConfig.
 */
const keycloakInstance = new Keycloak({
    url: authConfig.keycloak.url,
    realm: authConfig.keycloak.realm,
    clientId: authConfig.keycloak.clientId,
});

export default keycloakInstance;
