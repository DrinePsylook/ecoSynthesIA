import { SupportedLanguage } from '../constants';

export type User = {
    id: number;
    avatar_path: string;
    created_at: Date;
    email: string;
    password_hash: string;
    preferred_language: SupportedLanguage;
    updated_at: Date;
    username: string;
}

export interface UserUpdatePayload {
    avatar_path?: string;
    email?: string;
    password?: string;
    preferred_language?: SupportedLanguage;
    username?: string;
}