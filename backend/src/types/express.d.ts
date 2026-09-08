declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                username: string;
                email: string;
                avatar_url: string | null;
            };
        }
    }
}

export { };