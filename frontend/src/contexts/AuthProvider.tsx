import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { AuthContext, type AuthContextType } from './authContext';
import * as authService from '../services/authService';
import type { LoginCredentials, RegisterData, AuthResponse } from '../services/authService';

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthContextType['user']>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = user !== null;

    const refreshUser = useCallback(async () => {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
    }, []);

    const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await authService.login(credentials);
        if (response.success && response.user) {
            setUser(response.user);
        }
        return response;
    }, []);

    const register = useCallback(async (data: RegisterData): Promise<AuthResponse> => {
        const response = await authService.register(data);
        if (response.success && response.user) {
            setUser(response.user);
        }
        return response;
    }, []);

    const logout = useCallback(async () => {
        await authService.logout();
        setUser(null);
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            if (authService.hasToken()) {
                await refreshUser();
            }
            setIsLoading(false);
        };
        initializeAuth();
    }, [refreshUser]);

    const value: AuthContextType = {
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}