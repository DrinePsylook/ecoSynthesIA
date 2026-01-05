/**
 * Auth Service
 * Centralize all authenticated-related API calls
 */

const API_URL = import.meta.env.VITE_BACKEND_URL;

// ==================== Utility Functions ====================

/**
 * Constructs the full URL for an avatar path
 * @param avatarPath - The relative path stored in the database (e.g., "bucket/user/2/avatar.jpg")
 * @param cacheBuster - Optional timestamp to bust browser cache (use Date.now() after upload/delete)
 * @returns The full URL to access the avatar, or null if no path provided
 */
export const getAvatarUrl = (avatarPath: string | null | undefined, cacheBuster?: number): string | null => {
    if (!avatarPath) return null;
    
    let url: string;
    
    // If it's already a full URL, use as-is
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
        url = avatarPath;
    } else {
        // Otherwise, prepend the backend URL
        url = `${API_URL}/${avatarPath}`;
    }
    
    // Add cache-buster to force browser to reload the image
    if (cacheBuster) {
        url += `?t=${cacheBuster}`;
    }
    
    return url;
};

// ==================== Types ====================

export interface User {
    id: number;
    avatar_path: string | null;
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

        // Check if the response indicates success AND contains user data
        if (result.success && result.user) {
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
    

/**
 * Updates the current user's profile
 * 
 * PATCH /auth/profile
 */
export const updateProfile = async (data: { username?: string; email?: string }): Promise<AuthResponse> => {
    const token = getToken();
    
    if (!token) {
        return {
            success: false,
            message: 'Not authenticated'
        };
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        return await response.json();
    } catch (error) {
        console.error('Update profile error:', error);
        return {
            success: false,
            message: 'Network error occurred'
        };
    }
};

/**
 * Updates the current user's password
 * 
 * PATCH /auth/password
 * 
 * @param currentPassword - The user's current password for verification
 * @param newPassword - The new password to set
 */
export const updatePassword = async (data: { 
    currentPassword: string; 
    newPassword: string 
}): Promise<AuthResponse> => {
    const token = getToken();
    
    if (!token) {
        return {
            success: false,
            message: 'Not authenticated'
        };
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/password`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        return await response.json();
    } catch (error) {
        console.error('Update password error:', error);
        return {
            success: false,
            message: 'Network error occurred'
        };
    }
};

/**
 * Uploads a new avatar for the current user
 * 
 * POST /auth/avatar
 * Content-Type: multipart/form-data
 * 
 * @param file - The image file to upload
 */
export const uploadAvatar = async (file: File): Promise<AuthResponse> => {
    const token = getToken();
    
    if (!token) {
        return {
            success: false,
            message: 'Not authenticated'
        };
    }

    try {
        // Create FormData to send the file
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch(`${API_URL}/api/auth/avatar`, {
            method: 'POST',
            headers: {
                // Don't set Content-Type - browser will set it with boundary for FormData
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        return await response.json();
    } catch (error) {
        console.error('Upload avatar error:', error);
        return {
            success: false,
            message: 'Network error occurred'
        };
    }
};

/**
 * Deletes the current user's avatar
 * 
 * DELETE /auth/avatar
 */
export const deleteAvatar = async (): Promise<AuthResponse> => {
    const token = getToken();
    
    if (!token) {
        return {
            success: false,
            message: 'Not authenticated'
        };
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/avatar`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        return await response.json();
    } catch (error) {
        console.error('Delete avatar error:', error);
        return {
            success: false,
            message: 'Network error occurred'
        };
    }
};
