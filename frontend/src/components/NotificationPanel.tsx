import type { Notification } from "../services/notifications";

interface NotificationPanelProps {
    notifications: Notification[];
    onRead: (
        notificationId: string
    ) => void;
    onReadAll: () => void;
    onClose: () => void;
}

function NotificationPanel({
    notifications,
    onRead,
    onReadAll,
    onClose,
}: NotificationPanelProps) {
    return (
        <div className="notification-panel">
            <div className="notification-panel-header">
                <div>
                    <h3>Notifications</h3>
                    <span>
                        {notifications.length}{" "}
                        {notifications.length === 1
                            ? "notification"
                            : "notifications"}
                    </span>
                </div>

                <div className="notification-panel-actions">
                    {notifications.some(
                        (notification) =>
                            !notification.is_read
                    ) && (
                            <button
                                type="button"
                                onClick={onReadAll}
                            >
                                Mark all read
                            </button>
                        )}

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close notifications"
                    >
                        ×
                    </button>
                </div>
            </div>

            <div className="notification-list">
                {notifications.length === 0 ? (
                    <div className="notification-empty">
                        No notifications
                    </div>
                ) : (
                    notifications.map(
                        (notification) => (
                            <button
                                type="button"
                                key={notification.id}
                                className={`notification-item ${notification.is_read
                                        ? "read"
                                        : "unread"
                                    }`}
                                onClick={() =>
                                    onRead(
                                        notification.id
                                    )
                                }
                            >
                                <div className="notification-item-content">
                                    <strong>
                                        {
                                            notification.title
                                        }
                                    </strong>

                                    {notification.content && (
                                        <span>
                                            {
                                                notification.content
                                            }
                                        </span>
                                    )}

                                    <small>
                                        {new Date(
                                            notification.created_at
                                        ).toLocaleString()}
                                    </small>
                                </div>

                                {!notification.is_read && (
                                    <span className="notification-dot" />
                                )}
                            </button>
                        )
                    )
                )}
            </div>
        </div>
    );
}

export default NotificationPanel;