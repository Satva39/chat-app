import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({
    apiRequestMock: vi.fn(),
}));

vi.mock("../services/api", () => ({
    apiRequest: apiRequestMock,
}));

import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from "../services/notifications";

describe("notifications service", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("loads notifications", async () => {
        const response = {
            notifications: [],
            unreadCount: 2,
        };

        apiRequestMock.mockResolvedValue(
            response
        );

        const result =
            await getNotifications();

        expect(result).toEqual(
            response
        );

        expect(
            apiRequestMock
        ).toHaveBeenCalledWith(
            "/api/notifications"
        );
    });

    it("marks one notification as read", async () => {
        apiRequestMock.mockResolvedValue(
            undefined
        );

        await markNotificationAsRead(
            "notification-1"
        );

        expect(
            apiRequestMock
        ).toHaveBeenCalledWith(
            "/api/notifications/notification-1/read",
            {
                method: "PATCH",
            }
        );
    });

    it("marks all notifications as read", async () => {
        apiRequestMock.mockResolvedValue(
            undefined
        );

        await markAllNotificationsAsRead();

        expect(
            apiRequestMock
        ).toHaveBeenCalledWith(
            "/api/notifications/read-all",
            {
                method: "PATCH",
            }
        );
    });
});