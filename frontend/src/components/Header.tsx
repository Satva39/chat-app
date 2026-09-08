import { useNavigate } from "react-router-dom";
import { logout } from "../services/auth";

interface HeaderProps {
    unreadCount?: number;
    onNotificationsClick?: () => void;
}

function Header({
    unreadCount = 0,
    onNotificationsClick,
}: HeaderProps) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            navigate("/login", { replace: true });
        }
    };

    return (
        <header className="top-header">
            <div className="brand">
                <div className="brand-logo">C</div>
                <span>Chat App</span>
            </div>

            <div className="header-actions">
                <button
                    type="button"
                    onClick={onNotificationsClick}
                    className="notification-button"
                    aria-label={
                        unreadCount > 0
                            ? `${unreadCount} unread notifications`
                            : "Notifications"
                    }
                >
                    <span>Notifications</span>

                    {unreadCount > 0 && (
                        <span className="notification-badge">
                            {unreadCount > 99
                                ? "99+"
                                : unreadCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    className="logout-button"
                    onClick={handleLogout}
                >
                    Logout
                </button>
            </div>
        </header>
    );
}

export default Header;