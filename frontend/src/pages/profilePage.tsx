import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/authContext";
import { formatDate } from "../utils/formatters";
import { updateProfile, updatePassword, uploadAvatar, deleteAvatar, deleteAccount, getAvatarUrl } from "../services/authService";
import Button from "../components/Button";

/**
 * ProfilePage Component
 * Displays and allows editing of user profile information.
 */
export default function ProfilePage() {
    const { t } = useTranslation();
    const { user, isLoading, refreshUser, logout } = useAuth();
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

    // Account deletion requires password
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

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
                <p className="text-gray-500">{t('profile.loadingProfile')}</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">{t('auth.pleaseLogin')}</p>
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
            setError(t('profile.validation.usernameEmpty'));
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
                setSuccess(t('profile.success.username'));
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
            setError(t('profile.error.updateFailed'));
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
            setError(t('profile.validation.emailEmpty'));
            return;
        }

        // Validation - check email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailValue)) {
            setError(t('profile.validation.emailInvalid'));
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
                setSuccess(t('profile.success.email'));
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
            setError(t('profile.error.updateFailed'));
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
            setError(t('profile.validation.passwordRequired'));
            return;
        }

        // Validation - check if new password is long enough
        if (newPassword.length < 8) {
            setError(t('profile.validation.passwordMinLength'));
            return;
        }

        // Validation - check if passwords match
        if (newPassword !== confirmPassword) {
            setError(t('profile.validation.passwordMismatch'));
            return;
        }

        // Validation - check if new password is different from current
        if (newPassword === currentPassword) {
            setError(t('profile.validation.passwordSame'));
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
                setSuccess(t('profile.success.password'));
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
            setError(t('profile.error.updateFailed'));
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    // ==================== Delete Account Handlers ====================

    const handleOpenDeleteModal = () => {
        setDeletePassword('');
        setIsDeleteModalOpen(true);
        setError(null);
    };

    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeletePassword('');
        setError(null);
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            setError(t('profile.deleteAccount.passwordRequired'));
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            const response = await deleteAccount(deletePassword);

            if (response.success) {
                // Clear auth context state (removes token and sets user to null)
                await logout();
                // Redirect to home after successful deletion
                navigate('/');
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError(t('profile.error.deleteFailed'));
            console.error(err);
        } finally {
            setIsDeleting(false);
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
            setError(t('profile.validation.fileTypeInvalid'));
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setError(t('profile.validation.fileTooLarge'));
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const response = await uploadAvatar(file);

            if (response.success) {
                await refreshUser();
                setAvatarCacheBuster(Date.now()); // Force browser to reload the new avatar
                setSuccess(t('profile.success.avatar'));
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
            setError(t('profile.error.uploadFailed'));
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
                setSuccess(t('profile.success.avatarDeleted'));
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
            setError(t('profile.error.deleteFailed'));
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
                    {t('profile.title')}
                </h1>

                {/* ==================== SECTION 1: User Information ==================== */}
                <div className="bg-white shadow rounded-lg p-6">
                    
                    {/* Section Header */}
                    <h2 className="text-xl font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-200">
                        {t('profile.personalInfo')}
                    </h2>

                    {/* Avatar Row */}
                    <div className="py-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {/* Avatar Label */}
                                <span className="text-sm font-medium text-gray-500 w-24">
                                    {t('profile.avatar')}
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
                                        {isSaving ? t('profile.uploading') : t('profile.upload')}
                                    </Button>
                                    {user.avatar_path && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={handleDeleteAvatar}
                                            disabled={isSaving}
                                        >
                                            {t('common.delete')}
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelAvatar}
                                        disabled={isSaving}
                                    >
                                        {t('common.cancel')}
                                    </Button>
                                </div>
                            ) : (
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={handleEditAvatar}
                                >
                                    {t('common.edit')}
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
                                    {t('profile.username')}
                                </span>

                                {isEditingUsername ? (
                                    <input
                                        type="text"
                                        value={usernameValue}
                                        onChange={(e) => setUsernameValue(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm 
                                                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder={t('profile.newUsername')}
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
                                        {isSaving ? t('profile.saving') : t('common.save')}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelUsername}
                                        disabled={isSaving}
                                    >
                                        {t('common.cancel')}
                                    </Button>
                                </div>
                            ) : (
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={handleEditUsername}
                                >
                                    {t('common.edit')}
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
                                    {t('profile.email')}
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
                                        {isSaving ? t('profile.saving') : t('common.save')}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelEmail}
                                        disabled={isSaving}
                                    >
                                        {t('common.cancel')}
                                    </Button>
                                </div>
                            ) : (
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={handleEditEmail}
                                >
                                    {t('common.edit')}
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
                                        {t('profile.password')}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                        {t('profile.changePassword')}
                                    </span>
                                </div>
                                
                                {/* Current Password */}
                                <div className="ml-28">
                                    <label className="block text-sm text-gray-600 mb-1">
                                        {t('profile.currentPassword')}
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
                                        {t('profile.newPassword')}
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm 
                                                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder={t('profile.atLeast8Chars')}
                                    />
                                </div>
                                
                                {/* Confirm New Password */}
                                <div className="ml-28">
                                    <label className="block text-sm text-gray-600 mb-1">
                                        {t('profile.confirmPassword')}
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm 
                                                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder={t('profile.repeatPassword')}
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
                                        {isSaving ? t('profile.saving') : t('common.save')}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelPassword}
                                        disabled={isSaving}
                                    >
                                        {t('common.cancel')}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // VIEW MODE: Show password placeholder
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium text-gray-500 w-24">
                                        {t('profile.password')}
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
                                    {t('common.edit')}
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
                                {t('profile.memberSince')}
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
                            {t('documents.myDocuments')}
                        </h2>

                        <Button
                            variant="primary"
                            size="sm"
                            className="w-24"
                            onClick={() => navigate('/my-documents')}
                        >
                            {t('documents.viewAll')}
                        </Button>
                    </div>

                </div>
                {/* End Section 2 */}


                {/* ==================== SECTION 3: Add document button ==================== */}
                <div className="bg-white shadow rounded-lg p-6 mt-6">
                    
                    {/* Section Header with Button */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-800">
                            {t('documents.addDocument')}
                        </h2>

                        <Button
                            variant="primary"
                            size="sm"
                            className="w-24"
                            onClick={() => navigate('/new-document')}
                        >
                            {t('documents.addNew')}
                        </Button>
                    </div>

                </div>
                {/* End Section 3 */}

                {/* ==================== SECTION 4: Delete Account ==================== */}
                <div className="bg-white shadow rounded-lg p-6 mt-6 border border-red-100">
                    
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-red-600">
                                {t('profile.deleteAccount.title')}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {t('profile.deleteAccount.warning')}
                            </p>
                        </div>

                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleOpenDeleteModal}
                        >
                            {t('profile.deleteAccount.button')}
                        </Button>
                    </div>

                </div>
                {/* End Section 4 */}

                {/* Delete Account Confirmation Modal */}
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {t('profile.deleteAccount.confirmTitle')}
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                {t('profile.deleteAccount.confirmMessage')}
                            </p>
                            
                            <div className="mb-4">
                                <label className="block text-sm text-gray-600 mb-1">
                                    {t('profile.deleteAccount.enterPassword')}
                                </label>
                                <input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm 
                                            focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    placeholder="••••••••"
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="mb-4 p-2 rounded-md bg-red-50 border border-red-200">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3 justify-end">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCloseDeleteModal}
                                    disabled={isDeleting}
                                >
                                    {t('common.cancel')}
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting || !deletePassword}
                                >
                                    {isDeleting ? t('profile.deleteAccount.deleting') : t('profile.deleteAccount.confirmButton')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
        
    );
}
