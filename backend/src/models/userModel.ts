export type User = {
    id: number;
    avatar_path: string;
    created_at: Date;
    email: string;
    password_hash: string;
    updated_at: Date;
    username: string;
}

export interface UserUpdatePayload {
    avatar_path?: string;
    email?: string;
    password?: string;
    username?: string;
}