import { createContext, useContext } from 'react';
import type { User, LoginCredentials, RegisterData, AuthResponse } from '../services/authService';

// ==================== Types ====================

export interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<AuthResponse>;
    register: (data: RegisterData) => Promise<AuthResponse>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

// ==================== Context ====================

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==================== Hook ====================

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    
    return context;
}