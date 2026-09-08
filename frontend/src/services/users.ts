import { apiRequest } from "./api";

export interface SearchUser {
    id: string;
    username: string;
    email: string;
    avatar_url: string | null;
}

interface SearchUsersResponse {
    users: SearchUser[];
}

export async function searchUsers(
    query: string
): Promise<SearchUser[]> {
    const response =
        await apiRequest<SearchUsersResponse>(
            `/api/users/search?q=${encodeURIComponent(
                query
            )}`
        );

    return response.users;
}