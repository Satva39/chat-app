import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        try {
            await apiRequest("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            navigate("/chat");
        } catch (error) {
            alert(
                error instanceof Error
                    ? error.message
                    : "Login failed"
            );
        }
    };

    return (
        <main className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">C</div>

                <h1>Welcome back</h1>
                <p className="auth-subtitle">Login to continue chatting.</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <label htmlFor="email">Email</label>

                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Enter your email"
                        required
                    />

                    <label htmlFor="password">Password</label>

                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        required
                    />

                    <button type="submit" className="auth-button">
                        Login
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account?{" "}
                    <Link to="/register">Create account</Link>
                </p>
            </div>
        </main>
    );
}

export default Login;