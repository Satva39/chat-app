import { apiRequest } from "./api";

export interface Room {
    id: string;
    name: string;
    description: string | null;
    is_private: boolean;
    created_by: string | null;
    created_at: string;
    room_type: "direct" | "group";
}

interface RoomsResponse {
    rooms: Room[];
}

interface RoomResponse {
    room: Room;
}

export async function getRooms(): Promise<Room[]> {
    const response = await apiRequest<RoomsResponse>(
        "/api/rooms"
    );

    return response.rooms;
}

export async function createRoom(
    name: string,
    description?: string
): Promise<Room> {
    const response = await apiRequest<RoomResponse>(
        "/api/rooms",
        {
            method: "POST",
            body: JSON.stringify({
                name,
                description: description || null,
                isPrivate: false,
            }),
        }
    );

    return response.room;
}

export interface RoomMember {
    id: string;
    username: string;
    avatar_url: string | null;
}

interface RoomMembersResponse {
    members: RoomMember[];
}

export async function getRoomMembers(
    roomId: string
): Promise<RoomMember[]> {
    const response =
        await apiRequest<RoomMembersResponse>(
            `/api/rooms/${roomId}/members`
        );

    return response.members;
}

export async function createDirectRoom(
    userId: string
): Promise<Room> {
    const response =
        await apiRequest<RoomResponse>(
            "/api/rooms/direct",
            {
                method: "POST",
                body: JSON.stringify({
                    userId,
                }),
            }
        );

    return response.room;
}

export async function addRoomMember(
    roomId: string,
    userId: string
): Promise<void> {
    await apiRequest(
        `/api/rooms/${roomId}/members`,
        {
            method: "POST",
            body: JSON.stringify({
                userId,
            }),
        }
    );
}