const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

interface ApiOptions extends RequestInit {
    body?: BodyInit | null;
}

export async function apiRequest<T>(
    path: string,
    options: ApiOptions = {}
): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}