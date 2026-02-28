import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { env } from "../config/env.js";

const jwks = jwksClient({
  jwksUri: env.keycloak.jwksUri,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getKey(header, callback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    return callback(null, key.getPublicKey());
  });
}

function validateKeycloakConfig() {
  return Boolean(
    env.keycloak.issuer
    && env.keycloak.jwksUri
    && env.keycloak.audience
  );
}

export async function verifyKeycloakAccessToken(accessToken) {
  if (!validateKeycloakConfig()) {
    throw new Error("keycloak configuration is incomplete");
  }

  return new Promise((resolve, reject) => {
    jwt.verify(
      accessToken,
      getKey,
      {
        algorithms: ["RS256"],
        issuer: env.keycloak.issuer,
        audience: env.keycloak.audience,
        clockTolerance: env.keycloak.clockToleranceSec,
      },
      (err, payload) => {
        if (err) return reject(err);
        if (!payload || typeof payload !== "object" || !payload.sub || !payload.email) {
          return reject(new Error("required claims are missing"));
        }
        return resolve(payload);
      }
    );
  });
}
