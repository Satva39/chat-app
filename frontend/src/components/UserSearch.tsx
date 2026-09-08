import { useEffect, useState } from "react";
import {
    searchUsers,
    type SearchUser,
} from "../services/users";

interface UserSearchProps {
    onSelectUser: (user: SearchUser) => void;
    onClose: () => void;
}

function UserSearch({
    onSelectUser,
    onClose,
}: UserSearchProps) {
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<SearchUser[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
            setUsers([]);
            return;
        }

        const timer = window.setTimeout(
            async () => {
                try {
                    setLoading(true);

                    const results =
                        await searchUsers(
                            trimmedQuery
                        );

                    setUsers(results);
                } catch (error) {
                    console.error(
                        "Failed to search users:",
                        error
                    );
                } finally {
                    setLoading(false);
                }
            },
            300
        );

        return () => {
            window.clearTimeout(timer);
        };
    }, [query]);

    return (
        <div className="user-search">
            
            <div className="user-search-header">
                <h3>New chat</h3>

                <div>
                    <button
                        type="button"
                        onClick={() =>
                            window.dispatchEvent(
                                new CustomEvent(
                                    "open-group-create"
                                )
                            )
                        }
                    >
                        New group
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>

            <input
                type="search"
                value={query}
                onChange={(event) =>
                    setQuery(event.target.value)
                }
                placeholder="Search username or email"
                autoFocus
            />

            <div className="user-search-results">
                {loading && (
                    <p>Searching...</p>
                )}

                {!loading &&
                    query.trim() &&
                    users.length === 0 && (
                        <p>
                            No users found
                        </p>
                    )}

                {users.map((user) => (
                    <button
                        type="button"
                        key={user.id}
                        className="user-search-item"
                        onClick={() =>
                            onSelectUser(user)
                        }
                    >
                        <div className="avatar">
                            {user.username
                                .charAt(0)
                                .toUpperCase()}
                        </div>

                        <div>
                            <strong>
                                {user.username}
                            </strong>

                            <span>
                                {user.email}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default UserSearch;