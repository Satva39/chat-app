import type { NextFunction, Request, Response } from "express";
import { getUserFromSession } from "../services/auth.service.js";

function getSessionToken(req: Request): string | null {
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
        return null;
    }

    const cookieName =
        process.env.NODE_ENV === "production"
            ? "__Host-session="
            : "session=";

    const sessionCookie = cookieHeader
        .split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) =>
            cookie.startsWith(cookieName)
        );

    if (!sessionCookie) {
        return null;
    }

    try {
        return decodeURIComponent(
            sessionCookie.substring(cookieName.length)
        );
    } catch {
        return null;
    }
}

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const sessionToken = getSessionToken(req);

        if (!sessionToken) {
            res.status(401).json({
                message: "Authentication required",
            });
            return;
        }

        const user = await getUserFromSession(sessionToken);

        if (!user) {
            res.status(401).json({
                message: "Authentication required",
            });
            return;
        }

        req.user = user;

        next();
    } catch {
        res.status(500).json({
            message: "Authentication check failed",
        });
    }
}