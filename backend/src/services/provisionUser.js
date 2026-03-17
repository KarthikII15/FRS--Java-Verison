import { query } from "../db/pool.js";
import { findUserByEmail } from "../repositories/authRepository.js";

/**
 * Auto-provision a Keycloak user into frs_user on first login.
 *
 * Strategy (Review Feedback #1):
 *  1. Try to find existing user by keycloak_sub  →  already linked
 *  2. Try to find existing user by email         →  link via keycloak_sub
 *  3. If neither found                           →  create new frs_user record
 *
 * @param {object} jwtPayload  Decoded Keycloak JWT
 * @returns {Promise<object>}  The frs_user row
 */
export async function provisionKeycloakUser(jwtPayload) {
    const email = jwtPayload.email;
    const name =
        jwtPayload.name || jwtPayload.preferred_username || email;
    const role = (jwtPayload.realm_access?.roles || []).includes("admin")
        ? "admin"
        : "hr";
    const sub = jwtPayload.sub;

    // ── 1. Check if user exists by email (pre-provisioned without keycloak_sub) ──
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
        // Link existing user to Keycloak sub
        await query(
            `UPDATE frs_user SET keycloak_sub = $1 WHERE pk_user_id = $2`,
            [sub, existingUser.pk_user_id]
        );
        return existingUser;
    }

    // ── 2. Create brand-new user ──
    const result = await query(
        `INSERT INTO frs_user (email, username, role, keycloak_sub, fk_user_type_id, password_hash)
     VALUES ($1, $2, $3, $4, 1, '')
     RETURNING pk_user_id, email, username, role, department, created_at`,
        [email, name, role, sub]
    );
    return result.rows[0];
}
