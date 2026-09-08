import { sql } from "../config/database.js";

export interface SearchUser {
    id: string;
    username: string;
    email: string;
    avatar_url: string | null;
}

export async function searchUsers(
    currentUserId: string,
    query: string
): Promise<SearchUser[]> {
    const search = query.trim();

    if (!search) {
        return [];
    }

    const result = await sql`
        SELECT
            id,
            username,
            email,
            avatar_url
        FROM users
        WHERE id <> ${currentUserId}
          AND (
              username ILIKE ${`%${search}%`}
              OR email ILIKE ${`%${search}%`}
          )
        ORDER BY username ASC
        LIMIT 20
    `;

    return result as SearchUser[];
}