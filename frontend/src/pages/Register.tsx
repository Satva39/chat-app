import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";

function Register() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        try {
            await apiRequest("/api/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    username: name,
                    email,
                    password,
                }),
            });

            navigate("/login");
        } catch (error) {
            alert(
                error instanceof Error
                    ? error.message
                    : "Registration failed"
            );
        }
    };

    return (
        <main className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">C</div>

                <h1>Create account</h1>
                <p className="auth-subtitle">Create your Chat App account.</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <label htmlFor="name">Name</label>

                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Enter your name"
                        required
                    />

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
                        placeholder="Create a password"
                        required
                    />

                    <button type="submit" className="auth-button">
                        Create account
                    </button>
                </form>

                <p className="auth-footer">
                    Already have account?{" "}
                    <Link to="/login">Login</Link>
                </p>
            </div>
        </main>
    );
}

export default Register;