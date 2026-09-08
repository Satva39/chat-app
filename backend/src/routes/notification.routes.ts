import { Router } from "express";

import {
    requireAuth,
} from "../middleware/auth.middleware.js";

import {
    getUserNotifications,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from "../services/notification.service.js";

const router = Router();

router.get(
    "/notifications",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    message:
                        "Authentication required",
                });

                return;
            }

            const notifications =
                await getUserNotifications(
                    req.user.id
                );

            const unreadCount =
                await getUnreadNotificationCount(
                    req.user.id
                );

            res.json({
                notifications,
                unreadCount,
            });
        } catch (error) {
            console.error(
                "Failed to load notifications:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to load notifications",
            });
        }
    }
);

router.patch(
    "/notifications/:notificationId/read",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    message:
                        "Authentication required",
                });

                return;
            }

            const notificationId =
                typeof req.params.notificationId ===
                    "string"
                    ? req.params.notificationId.trim()
                    : "";

            if (!notificationId) {
                res.status(400).json({
                    message:
                        "Notification ID is required",
                });

                return;
            }

            await markNotificationAsRead(
                notificationId,
                req.user.id
            );

            res.json({
                message:
                    "Notification marked as read",
            });
        } catch (error) {
            console.error(
                "Failed to mark notification as read:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to mark notification as read",
            });
        }
    }
);

router.patch(
    "/notifications/read-all",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    message:
                        "Authentication required",
                });

                return;
            }

            await markAllNotificationsAsRead(
                req.user.id
            );

            res.json({
                message:
                    "All notifications marked as read",
            });
        } catch (error) {
            console.error(
                "Failed to mark all notifications as read:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to mark all notifications as read",
            });
        }
    }
);

router.get(
    "/notifications/unread-count",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    message:
                        "Authentication required",
                });

                return;
            }

            const unreadCount =
                await getUnreadNotificationCount(
                    req.user.id
                );

            res.json({
                unreadCount,
            });
        } catch (error) {
            console.error(
                "Failed to load unread notification count:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to load unread notification count",
            });
        }
    }
);

export default router;