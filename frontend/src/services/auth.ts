import { apiRequest } from "./api";

export interface AuthUser {
    id: string;
    username: string;
    email: string;
    avatar_url: string | null;
}

interface AuthResponse {
    user: AuthUser;
}

export async function getCurrentUser(): Promise<AuthUser> {
    const response = await apiRequest<AuthResponse>(
        "/api/auth/me"
    );

    return response.user;
}

export async function logout(): Promise<void> {
    await apiRequest("/api/auth/logout", {
        method: "POST",
    });
}