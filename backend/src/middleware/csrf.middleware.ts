import type {
    NextFunction,
    Request,
    Response,
} from "express";

const SAFE_METHODS = new Set([
    "GET",
    "HEAD",
    "OPTIONS",
]);

export function csrfProtection(
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (SAFE_METHODS.has(req.method)) {
        next();
        return;
    }

    const expectedOrigin =
        process.env.FRONTEND_URL ||
        (process.env.NODE_ENV === "production"
            ? "https://chat-app-orpin-one-36.vercel.app"
            : "http://localhost:5173");

    if (
        process.env.NODE_ENV === "production" &&
        !expectedOrigin
    ) {
        res.status(500).json({
            message:
                "FRONTEND_URL is required in production",
        });
        return;
    }

    const origin = req.headers.origin;

    if (origin) {
        if (origin !== expectedOrigin) {
            res.status(403).json({
                message: "CSRF validation failed",
            });
            return;
        }

        next();
        return;
    }

    const referer = req.headers.referer;

    if (referer) {
        try {
            const refererOrigin =
                new URL(referer).origin;

            if (refererOrigin !== expectedOrigin) {
                res.status(403).json({
                    message: "CSRF validation failed",
                });
                return;
            }

            next();
            return;
        } catch {
            res.status(403).json({
                message: "CSRF validation failed",
            });
            return;
        }
    }

    res.status(403).json({
        message: "CSRF validation failed",
    });
}