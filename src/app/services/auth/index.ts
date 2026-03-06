import { authConfig } from "../../config/authConfig";
import { apiAuthProvider } from "./apiAuthProvider";
import { keycloakAuthProvider } from "./keycloakAuthProvider";
import { mockAuthProvider } from "./mockAuthProvider";

export const authProvider =
    authConfig.mode === "keycloak"
        ? keycloakAuthProvider
        : authConfig.mode === "api"
            ? apiAuthProvider
            : mockAuthProvider;
