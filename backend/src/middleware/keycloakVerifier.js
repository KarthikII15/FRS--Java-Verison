import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env.js";

/**
 * JWKS remote keyset — caches public keys from Keycloak automatically.
 * Used to cryptographically verify JWT access token signatures.
 */
const JWKS = createRemoteJWKSet(
    new URL(
        `${env.keycloak.url}/realms/${env.keycloak.realm}/protocol/openid-connect/certs`
    )
);

/**
 * Verify a Keycloak JWT access token.
 *
 * Checks:
 *  - Signature (via JWKS public keys)
 *  - Issuer (must match the Keycloak realm)
 *  - Audience (must be "attendance-frontend" — prevents cross-client abuse)
 *  - Expiration (built into jwtVerify)
 *
 * @param {string} accessToken  Raw Bearer token string
 * @returns {Promise<object>}   Decoded JWT payload
 * @throws  If verification fails
 */
export async function verifyKeycloakToken(accessToken) {
    const { payload } = await jwtVerify(accessToken, JWKS, {
        issuer: `${env.keycloak.url}/realms/${env.keycloak.realm}`,
        audience: "attendance-frontend",
    });
    return payload;
}
