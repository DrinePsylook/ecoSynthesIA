import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext";
import { formatDate } from "../utils/formatters";
import { updateProfile, updatePassword, uploadAvatar, deleteAvatar, getAvatarUrl } from "../services/authService";
import Button from "../components/Button";

/**
 * ProfilePage Component
 */
export default function ProfilePage() {
    const {user, isLoading, refreshUser } = useAuth();
    const navigate = useNavigate();

    // ==================== Edit Mode States ====================
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [isEditingAvatar, setIsEditingAvatar] = useState(false);
    
    // Reference to the hidden file input for avatar upload
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ==================== Form Values ====================
    const [usernameValue, setUsernameValue] = useState('');
    const [emailValue, setEmailValue] = useState('');
    
    // Password requires 3 fields: current, new, and confirmation
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // ==================== Loading & Error States ====================
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    // Track which field was successfully updated (to show success message in the right place)
    const [successField, setSuccessField] = useState<'username' | 'email' | 'password' | 'avatar' | null>(null);
    
    // Cache-buster timestamp to force browser to reload avatar after upload/delete
    const [avatarCacheBuster, setAvatarCacheBuster] = useState<number>(Date.now());

    // ==================== Loading State ====================
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">Loading profile...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">Please log in to view your profile.</p>
            </div>
        );
    }

    // ==================== Handlers ====================
    /**
     * Start editing username
     */
    const handleEditUsername = () => {
        setUsernameValue(user.username);
        setIsEditingUsername(true);
        setError(null);
        setSuccess(null);
    };

    const handleCancelUsername = () => {
        setIsEditingUsername(false);
        setUsernameValue('');
        setError(null);
    };

    const handleSaveUsername = async () => {
        if (!usernameValue.trim()) {
            setError('Username cannot be empty');
            return;
        }

        if (usernameValue === user.username) {
            setIsEditingUsername(false);
            return
        }

        setIsSaving(true);
        setError(null);

        try {
            const response = await updateProfile({ username: usernameValue });

            if (response.success) {
                await refreshUser();
                setSuccess('Username updated successfully');
                setSuccessField('username');
                setIsEditingUsername(false);
                setTimeout(() => {
                    setSuccess(null);
                    setSuccessField(null);
                }, 3000);
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError('An error occurred while updating');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    // ==================== Email Handlers ====================
    
    const handleEditEmail = () => {
        setEmailValue(user.email);
        setIsEditingEmail(true);
        setError(null);
        setSuccess(null);
    };

    const handleCancelEmail = () => {
        setIsEditingEmail(false);
        setEmailValue('');
        setError(null);
    };

    const handleSaveEmail = async () => {
        // Validation - check if empty
        if (!emailValue.trim()) {
            setError('Email cannot be empty');
            return;
        }

        // Validation - check email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailValue)) {
            setError('Invalid email format');
            return;
        }

        // No change? Just close
        if (emailValue === user.email) {
            setIsEditingEmail(false);
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            // Call the API to update email
            const response = await updateProfile({ email: emailValue });

            if (response.success) {
                await refreshUser();
                setSuccess('Email updated successfully');
                setSuccessField('email');
                setIsEditingEmail(false);
                setTimeout(() => {
                    setSuccess(null);
                    setSuccessField(null);
                }, 3000);
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError('An error occurred while updating');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    // ==================== Password Handlers ====================
    
    const handleEditPassword = () => {
        // Reset all password fields when opening edit mode
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsEditingPassword(true);
        setError(null);
        setSuccess(null);
    };

    const handleCancelPassword = () => {
        setIsEditingPassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError(null);
    };

    const handleSavePassword = async () => {
        // Validation - check if all fields are filled
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('All password fields are required');
            return;
        }

        // Validation - check if new password is long enough
        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters');
            return;
        }

        // Validation - check if passwords match
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        // Validation - check if new password is different from current
        if (newPassword === currentPassword) {
            setError('New password must be different from current password');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const response = await updatePassword({ 
                currentPassword, 
                newPassword 
            });

            if (response.success) {
                setSuccess('Password updated successfully');
                setSuccessField('password');
                setIsEditingPassword(false);
                // Clear password fields for security
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setTimeout(() => {
                    setSuccess(null);
                    setSuccessField(null);
                }, 3000);
            } else {
                // Show error from server (e.g., "Current password is incorrect")
                setError(response.message);
            }
        } catch (err) {
            setError('An error occurred while updating password');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    // ==================== Avatar Handlers ====================
    
    const handleEditAvatar = () => {
        setIsEditingAvatar(true);
        setError(null);
        setSuccess(null);
    };

    const handleCancelAvatar = () => {
        setIsEditingAvatar(false);
        setError(null);
    };

    /**
     * Trigger the hidden file input when clicking "Upload"
     */
    const handleClickUpload = () => {
        fileInputRef.current?.click();
    };

    /**
     * Handle file selection from the file input
     */
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type on client side
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError('Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setError('File too large. Maximum size is 5MB');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const response = await uploadAvatar(file);

            if (response.success) {
                await refreshUser();
                setAvatarCacheBuster(Date.now()); // Force browser to reload the new avatar
                setSuccess('Avatar uploaded successfully');
                setSuccessField('avatar');
                setIsEditingAvatar(false);
                setTimeout(() => {
                    setSuccess(null);
                    setSuccessField(null);
                }, 3000);
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError('An error occurred while uploading avatar');
            console.error(err);
        } finally {
            setIsSaving(false);
            // Reset the file input so the same file can be selected again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    /**
     * Handle avatar deletion
     */
    const handleDeleteAvatar = async () => {
        setIsSaving(true);
        setError(null);

        try {
            const response = await deleteAvatar();

            if (response.success) {
                await refreshUser();
                setAvatarCacheBuster(Date.now()); // Reset cache-buster
                setSuccess('Avatar deleted successfully');
                setSuccessField('avatar');
                setIsEditingAvatar(false);
                setTimeout(() => {
                    setSuccess(null);
                    setSuccessField(null);
                }, 3000);
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError('An error occurred while deleting avatar');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            {/* Page Container - limits width for readability */}
            <div className="max-w-2xl mx-auto">
                
                {/* Page Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    My Profile
                </h1>

                {/* ==================== SECTION 1: User Information ==================== */}
                <div className="bg-white shadow rounded-lg p-6">
                    
                    {/* Section Header */}
                    <h2 className="text-xl font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-200">
                        Personal Information
                    </h2>

                    {/* Avatar Row */}
                    <div className="py-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {/* Avatar Label */}
                                <span className="text-sm font-medium text-gray-500 w-24">
                                    Avatar
                                </span>
                                {/* Avatar Image or Placeholder */}
                                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
                                    {getAvatarUrl(user.avatar_path, avatarCacheBuster) ? (
                                        <img 
                                            src={getAvatarUrl(user.avatar_path, avatarCacheBuster)!} 
                                            alt="Avatar" 
                                            className="w-full h-full object-cover object-center"
                                        />
                                    ) : (
                                        <span className="text-2xl font-bold text-emerald-600">
                                            {user.username.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {isEditingAvatar ? (
                                <div className="flex gap-2">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleClickUpload}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Uploading...' : 'Upload'}
                                    </Button>
                                    {user.avatar_path && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={handleDeleteAvatar}
                                            disabled={isSaving}
                                        >
                                            Delete
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelAvatar}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={handleEditAvatar}
                                >
                                    Edit
                                </Button>
                            )}
                        </div>
                        
                        {/* Hidden file input for avatar upload */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                        />
                        
                        {/* Inline messages for Avatar */}
                        {isEditingAvatar && error && (
                            <div className="mt-2 ml-28 max-w-xs p-2 rounded-md bg-red-50 border border-red-200">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}
                        {successField === 'avatar' && success && (
                            <div className="mt-2 ml-28 max-w-xs p-2 rounded-md bg-emerald-50 border border-emerald-200">
                                <p className="text-sm text-emerald-600">{success}</p>
                            </div>
                        )}
                    </div>

                    {/* Username Row */}
                    <div className="py-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-500 w-24">
                                    Username
                                </span>

                                {isEditingUsername ? (
                                    <input
                                        type="text"
                                        value={usernameValue}
                                        onChange={(e) => setUsernameValue(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm 
                                                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="New username"
                                        autoFocus
                                    />
                                ) : (
                                    <span className="text-gray-900 font-medium">
                                        {user.username}
                                    </span>
                                )}
                            </div>

                            {isEditingUsername ? (
                                <div className="flex gap-2">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleSaveUsername}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelUsername}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={handleEditUsername}
                                >
                                    Edit
                                </Button>
                            )}
                        </div>
                        
                        {/* Inline messages for Username */}
                        {isEditingUsername && error && (
                            <div className="mt-2 ml-28 max-w-xs p-2 rounded-md bg-red-50 border border-red-200">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}
                        {successField === 'username' && success && (
                            <div className="mt-2 ml-28 max-w-xs p-2 rounded-md bg-emerald-50 border border-emerald-200">
                                <p className="text-sm text-emerald-600">{success}</p>
                            </div>
                        )}
                    </div>

                    {/* Email Row */}
                    <div className="py-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-500 w-24">
                                    Email
                                </span>

                                {isEditingEmail ? (
                                    <input
                                        type="email"
                                        value={emailValue}
                                        onChange={(e) => setEmailValue(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm 
                                                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="new.email@example.com"
                                        autoFocus
                                    />
                                ) : (
                                    <span className="text-gray-900">
                                        {user.email}
                                    </span>
                                )}
                            </div>

                            {isEditingEmail ? (
                                <div className="flex gap-2">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleSaveEmail}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelEmail}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={handleEditEmail}
                                >
                                    Edit
                                </Button>
                            )}
                        </div>
                        
                        {/* Inline messages for Email */}
                        {isEditingEmail && error && (
                            <div className="mt-2 ml-28 max-w-xs p-2 rounded-md bg-red-50 border border-red-200">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}
                        {successField === 'email' && success && (
                            <div className="mt-2 ml-28 max-w-xs p-2 rounded-md bg-emerald-50 border border-emerald-200">
                                <p className="text-sm text-emerald-600">{success}</p>
                            </div>
                        )}
                    </div>

                    {/* Password Row */}
                    <div className="py-4 border-b border-gray-100">
                        {isEditingPassword ? (
                            // EDIT MODE: Show password form
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium text-gray-500 w-24">
                                        Password
                                    </span>
                                    <span className="text-sm text-gray-600">
                                        Change your password
                                    </span>
                                </div>
                                
                                {/* Current Password */}
                                <div className="ml-28">
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Current password
                                    </label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm 
                                                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="••••••••"
                                        autoFocus
                                    />
                                </div>
                                
                                {/* New Password */}
                                <div className="ml-28">
                                    <label className="block text-sm text-gray-600 mb-1">
                                        New password
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm 
                                                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="At least 8 characters"
                                    />
                                </div>
                                
                                {/* Confirm New Password */}
                                <div className="ml-28">
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Confirm new password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm 
                                                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="Repeat new password"
                                    />
                                </div>

                                {/* Inline Error Message for Password */}
                                {error && isEditingPassword && (
                                    <div className="ml-28 max-w-xs p-2 rounded-md bg-red-50 border border-red-200">
                                        <p className="text-sm text-red-600">{error}</p>
                                    </div>
                                )}
                                
                                {/* Action Buttons */}
                                <div className="ml-28 flex gap-2">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleSavePassword}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelPassword}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // VIEW MODE: Show password placeholder
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium text-gray-500 w-24">
                                        Password
                                    </span>
                                    <span className="text-gray-900">
                                        ••••••••
                                    </span>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={handleEditPassword}
                                >
                                    Edit
                                </Button>
                            </div>
                        )}
                        
                        {/* Success message for Password (shown after save) */}
                        {successField === 'password' && success && (
                            <div className="mt-2 ml-28 max-w-xs p-2 rounded-md bg-emerald-50 border border-emerald-200">
                                <p className="text-sm text-emerald-600">{success}</p>
                            </div>
                        )}
                    </div>

                    {/* Member Since Row - Read-only, no edit button */}
                    <div className="flex items-center py-4">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-500 w-24">
                                Member since
                            </span>
                            <span className="text-gray-900">
                                {formatDate(user.created_at)}
                            </span>
                        </div>
                        {/* No edit button here - this is read-only information */}
                    </div>

                </div>
                {/* End Section 1 */}


                {/* ==================== SECTION 2: My documents button ==================== */}
                <div className="bg-white shadow rounded-lg p-6 mt-6">
                    
                    {/* Section Header with Button */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-800">
                            My Documents
                        </h2>

                        <Button
                            variant="primary"
                            size="sm"
                            className="w-24"
                            onClick={() => navigate('/my-documents')}
                        >
                            View all
                        </Button>
                    </div>

                </div>
                {/* End Section 2 */}


                {/* ==================== SECTION 3: Add document button ==================== */}
                <div className="bg-white shadow rounded-lg p-6 mt-6">
                    
                    {/* Section Header with Button */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-800">
                            Add Document
                        </h2>

                        <Button
                            variant="primary"
                            size="sm"
                            className="w-24"
                            onClick={() => navigate('/new-document')}
                        >
                            Add new
                        </Button>
                    </div>

                </div>
                {/* End Section 3 */}

            </div>
        </div>
        
    );
}

