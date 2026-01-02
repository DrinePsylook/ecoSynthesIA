/**
 * Auth Service
 * Centralize all authenticated-related API calls
 */

const API_URL = import.meta.env.VITE_BACKEND_URL;

// ==================== Types ====================

export interface User {
    id: number;
    avatar_path: string;
    created_at: Date;
    email: string;
    updated_at: Date;
    username: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    token?: string;
    user?: User;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    username: string;
}

// ==================== Token Management ====================

/**
 * Saves the JWT token to localStorage
 */
export const saveToken = (token: string): void => {
    localStorage.setItem('auth_token', token);
}

/**
 * Retrieves the JWT token from localStorage
 */
export const getToken = (): string | null => {
    return localStorage.getItem('auth_token');
}

/**
 * Removes the JWT token from localStorage
 */
export const removeToken = (): void => {
    localStorage.removeItem('auth_token');
}

/**
 * Checks if user has a token
 */
export const hasToken = (): boolean => {
    return getToken() !== null;
}

// ==================== API Calls ====================

/**
 * Registers a new user
 * 
 * POST /auth/register
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    const result: AuthResponse = await response.json();
    if (result.success && result.token) {
        saveToken(result.token);
    }

    return result;
};

/**
 * Logs in a user
 * 
 * POST /auth/login
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });

    const result: AuthResponse = await response.json();
    if (result.success && result.token) {
        saveToken(result.token);
    }

    return result;    
};

/**
 * Gets the current authenticated user's profile
 * 
 * GET /auth/me
 */
export const getCurrentUser = async (): Promise<User | null> => {
    const token = getToken();
    if (!token) {
        return null;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.status === 401) {
            removeToken();
            return null;
        }

        const result = await response.json();

        if (!result.success && result.user) {
            return result.user;
        }

        return null;
    } catch (error) {
        console.error('Error fetching current user:', error);
        removeToken();
        return null;
    }
};

/**
 * Logs out the current user
 * 
 * POST /auth/logout
 */
export const logout = async (): Promise<void> => {
    const token = getToken();

    if (token) {
        try {
            await fetch(`${API_URL}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
        } catch (error) {
            console.error('Logout API error (ignored):', error);
        }
    }

    removeToken();
};
    

