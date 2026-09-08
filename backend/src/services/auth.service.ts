import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { sql } from "../config/database.js";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

function hashSessionToken(token: string): string {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

export async function registerUser(
    username: string,
    email: string,
    password: string
) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    if (normalizedUsername.length < 2) {
        throw new Error("Username must be at least 2 characters");
    }

    if (password.length < 8) {
        throw new Error("Password must be at least 8 characters");
    }

    const existingUsers = await sql`
      SELECT id
      FROM users
      WHERE email = ${normalizedEmail}
    `;

    if (existingUsers.length > 0) {
        throw new Error("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await sql`
      INSERT INTO users (username, email, password_hash)
      VALUES (
        ${normalizedUsername},
        ${normalizedEmail},
        ${passwordHash}
      )
      RETURNING id, username, email, avatar_url, created_at
    `;

    return result[0];
}

export async function loginUser(
    email: string,
    password: string
) {
    const normalizedEmail = email.trim().toLowerCase();

    const result = await sql`
      SELECT id, username, email, password_hash
      FROM users
      WHERE email = ${normalizedEmail}
    `;

    if (result.length === 0) {
        throw new Error("Invalid email or password");
    }

    const user = result[0];

    const passwordValid = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!passwordValid) {
        throw new Error("Invalid email or password");
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashSessionToken(sessionToken);

    const expiresAt = new Date(
        Date.now() + SESSION_DURATION_MS
    );

    await sql`
      INSERT INTO sessions (
        user_id,
        token_hash,
        expires_at
      )
      VALUES (
        ${user.id},
        ${tokenHash},
        ${expiresAt}
      )
    `;

    return {
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
        },
        sessionToken,
    };
}

export interface AuthUser {
    id: string;
    username: string;
    email: string;
    avatar_url: string | null;
}

export async function getUserFromSession(
    sessionToken: string
): Promise<AuthUser | null> {
    const tokenHash = hashSessionToken(sessionToken);

    const result = await sql`
      SELECT
        users.id,
        users.username,
        users.email,
        users.avatar_url
      FROM sessions
      INNER JOIN users
        ON users.id = sessions.user_id
      WHERE sessions.token_hash = ${tokenHash}
        AND sessions.expires_at > NOW()
    `;

    const user = result[0];

    if (!user) {
        return null;
    }

    return {
        id: String(user.id),
        username: String(user.username),
        email: String(user.email),
        avatar_url: user.avatar_url ?? null,
    };
}

export async function deleteSession(sessionToken: string) {
    const tokenHash = hashSessionToken(sessionToken);

    await sql`
      DELETE FROM sessions
      WHERE token_hash = ${tokenHash}
    `;
}