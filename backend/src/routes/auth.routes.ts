import { Router, type Request } from "express";

import {
    createRateLimit,
} from "../middleware/rate-limit.middleware.js";

import {
    getTrimmedString,
    isValidEmail,
    isValidUsername,
} from "../utils/validation.js";
import {
    deleteSession,
    getUserFromSession,
    loginUser,
    registerUser,
} from "../services/auth.service.js";

const router = Router();

const isProduction = process.env.NODE_ENV === "production";

const sessionCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite:
        isProduction
            ? ("none" as const)
            : ("lax" as const),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
};

function getSessionToken(req: Request) {
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

const registerRateLimit =
    createRateLimit({
        windowMs:
            60 * 60 * 1000,
        maxRequests: 5,
        keyPrefix:
            "auth-register",
        message:
            "Too many registration attempts. Please try again later.",
    });

router.post("/register", registerRateLimit, async (req, res) => {
    try {
        const username =
            getTrimmedString(
                req.body?.username
            );

        const email =
            getTrimmedString(
                req.body?.email
            )?.toLowerCase() ?? null;

        const password =
            typeof req.body?.password ===
                "string"
                ? req.body.password
                : null;

        if (!username || !email || password === null) {
            res.status(400).json({
                message:
                    "Username, email and password are required",
            });

            return;
        }

        if (!isValidUsername(username)) {
            res.status(400).json({
                message:
                    "Username must be 2-50 characters",
            });

            return;
        }

        if (!isValidEmail(email)) {
            res.status(400).json({
                message:
                    "Invalid email address",
            });

            return;
        }

        if (
            password.length < 8 ||
            password.length > 128
        ) {
            res.status(400).json({
                message:
                    "Password must be 8-128 characters",
            });

            return;
        }

        const user = await registerUser(
            username,
            email,
            password
        );
        res.status(201).json({
            user,
        });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Registration failed";

        const status =
            message === "Email already registered"
                ? 409
                : 400;

        res.status(status).json({
            message,
        });
    }
});

const loginRateLimit =
    createRateLimit({
        windowMs:
            10 * 60 * 1000,
        maxRequests: 10,
        keyPrefix:
            "auth-login",
        message:
            "Too many login attempts. Please try again later.",
    });

router.post("/login", loginRateLimit, async (req, res) => {
    try {
        const email =
            getTrimmedString(
                req.body?.email
            )?.toLowerCase() ?? null;

        const password =
            typeof req.body?.password ===
                "string"
                ? req.body.password
                : null;

        if (!email || password === null) {
            res.status(400).json({
                message:
                    "Email and password are required",
            });

            return;
        }

        if (!isValidEmail(email)) {
            res.status(400).json({
                message:
                    "Invalid email address",
            });

            return;
        }

        if (
            password.length < 8 ||
            password.length > 128
        ) {
            res.status(400).json({
                message:
                    "Invalid email or password",
            });

            return;
        }

        const result =
            await loginUser(
                email,
                password
            );

        const cookieName =
            isProduction
                ? "__Host-session"
                : "session";

        const cookieParts = [
            `${cookieName}=${encodeURIComponent(
                result.sessionToken
            )}`,
            "HttpOnly",
            "Path=/",
            `Max-Age=${sessionCookieOptions.maxAge}`,
            `SameSite=${sessionCookieOptions.sameSite === "none"
                ? "None"
                : "Lax"
            }`,
        ];

        if (sessionCookieOptions.secure) {
            cookieParts.push("Secure");
        }

        res.setHeader("Set-Cookie", cookieParts.join("; "));
        res.json({
            user: result.user,
        });
    } catch {
        res.status(401).json({
            message: "Invalid email or password",
        });
    }
});

router.post("/logout", async (req, res) => {
    const sessionToken = getSessionToken(req);

    if (sessionToken) {
        await deleteSession(sessionToken);
    }

    const cookieName =
        isProduction
            ? "__Host-session"
            : "session";

    const cookieParts = [
        `${cookieName}=`,
        "HttpOnly",
        "Path=/",
        "Max-Age=0",
        `SameSite=${sessionCookieOptions.sameSite === "none"
            ? "None"
            : "Lax"
        }`,
    ];

    if (isProduction) {
        cookieParts.push("Secure");
    }

    res.setHeader("Set-Cookie", cookieParts.join("; "));

    res.json({
        message: "Logged out",
    });
});

router.get("/me", async (req, res) => {
    const sessionToken = getSessionToken(req);

    if (!sessionToken) {
        res.status(401).json({
            message: "Not authenticated",
        });
        return;
    }

    const user = await getUserFromSession(sessionToken);

    if (!user) {
        res.status(401).json({
            message: "Not authenticated",
        });
        return;
    }

    res.json({
        user,
    });
});

export default router;