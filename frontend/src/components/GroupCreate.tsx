import {
    useEffect,
    useState,
} from "react";
import {
    searchUsers,
    type SearchUser,
} from "../services/users";

interface GroupCreateProps {
    onCreate: (
        name: string,
        members: SearchUser[]
    ) => void;
    onClose: () => void;
    loading?: boolean;
}

function GroupCreate({
    onCreate,
    onClose,
    loading = false,
}: GroupCreateProps) {
    const [name, setName] =
        useState("");

    const [query, setQuery] =
        useState("");

    const [users, setUsers] =
        useState<SearchUser[]>([]);

    const [selectedUsers, setSelectedUsers] =
        useState<SearchUser[]>([]);

    useEffect(() => {
        const trimmedQuery =
            query.trim();

        if (!trimmedQuery) {
            setUsers([]);
            return;
        }

        const timer =
            window.setTimeout(
                async () => {
                    try {
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
                    }
                },
                300
            );

        return () => {
            window.clearTimeout(
                timer
            );
        };
    }, [query]);

    const handleSelectUser = (
        user: SearchUser
    ) => {
        setSelectedUsers(
            (currentUsers) => {
                if (
                    currentUsers.some(
                        (currentUser) =>
                            currentUser.id ===
                            user.id
                    )
                ) {
                    return currentUsers;
                }

                return [
                    ...currentUsers,
                    user,
                ];
            }
        );
    };

    const handleRemoveUser = (
        userId: string
    ) => {
        setSelectedUsers(
            (currentUsers) =>
                currentUsers.filter(
                    (user) =>
                        user.id !==
                        userId
                )
        );
    };

    const handleSubmit = (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const trimmedName =
            name.trim();

        if (!trimmedName) {
            return;
        }

        onCreate(
            trimmedName,
            selectedUsers
        );
    };

    return (
        <section className="group-create">
            <div className="group-create-header">
                <h2>New group</h2>

                <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                >
                    Close
                </button>
            </div>

            <form
                onSubmit={handleSubmit}
            >
                <input
                    type="text"
                    value={name}
                    onChange={(event) =>
                        setName(
                            event.target.value
                        )
                    }
                    placeholder="Group name"
                    maxLength={100}
                    required
                />

                <input
                    type="search"
                    value={query}
                    onChange={(event) =>
                        setQuery(
                            event.target.value
                        )
                    }
                    placeholder="Search people"
                />

                {selectedUsers.length >
                    0 && (
                        <div className="selected-users">
                            {selectedUsers.map(
                                (user) => (
                                    <div
                                        key={user.id}
                                        className="selected-user"
                                    >
                                        <span>
                                            {
                                                user.username
                                            }
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemoveUser(
                                                    user.id
                                                )
                                            }
                                            disabled={
                                                loading
                                            }
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
                    )}

                <div className="group-search-results">
                    {users.map(
                        (user) => {
                            const selected =
                                selectedUsers.some(
                                    (
                                        selectedUser
                                    ) =>
                                        selectedUser.id ===
                                        user.id
                                );

                            return (
                                <button
                                    type="button"
                                    key={user.id}
                                    className={
                                        selected
                                            ? "group-user selected"
                                            : "group-user"
                                    }
                                    onClick={() =>
                                        handleSelectUser(
                                            user
                                        )
                                    }
                                    disabled={
                                        selected ||
                                        loading
                                    }
                                >
                                    <div className="avatar">
                                        {user.username
                                            .charAt(
                                                0
                                            )
                                            .toUpperCase()}
                                    </div>

                                    <div>
                                        <strong>
                                            {
                                                user.username
                                            }
                                        </strong>

                                        <span>
                                            {
                                                user.email
                                            }
                                        </span>
                                    </div>
                                </button>
                            );
                        }
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                >
                    {loading
                        ? "Creating..."
                        : "Create group"}
                </button>
            </form>
        </section>
    );
}

export default GroupCreate;