import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser } from "../services/auth";

function ProtectedRoute() {
    const [authenticated, setAuthenticated] = useState<boolean | null>(
        null
    );

    useEffect(() => {
        getCurrentUser()
            .then(() => {
                setAuthenticated(true);
            })
            .catch(() => {
                setAuthenticated(false);
            });
    }, []);

    if (authenticated === null) {
        return (
            <main className="auth-loading">
                Checking authentication...
            </main>
        );
    }

    if (!authenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}

export default ProtectedRoute;