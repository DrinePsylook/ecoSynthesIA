import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/authContext';
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from '../i18n';
import Button from './Button';
import { updateProfile } from '../services/authService';

/**
 * ProfileDropdown - Component for the profile dropdown menu
 * Includes user info, navigation links, language selector, and sign out button.
 */
export default function ProfileDropdown() {
    const { user, logout, refreshUser } = useAuth();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    // Get current language info
    const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) 
        || SUPPORTED_LANGUAGES[0];

    /**
     * Handle logout click
     */
    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    /**
     * Handle language change
     * Updates i18n, localStorage, and syncs with backend if authenticated
     */
    const handleLanguageChange = async (langCode: SupportedLanguageCode) => {
        i18n.changeLanguage(langCode);
        localStorage.setItem('preferred_language', langCode);
        
        // Save to backend if user is authenticated
        if (user) {
            try {
                await updateProfile({ preferred_language: langCode });
                await refreshUser();
            } catch (error) {
                console.error('Failed to save language preference:', error);
            }
        }
    };
    
    /**
     * Get avatar URL
     */
    const getAvatarUrl = (): string => {
        if (user?.avatar_path && user.avatar_path.length > 0) {
            return `${import.meta.env.VITE_BACKEND_URL}/${user.avatar_path}`;
        }
        return '/src/assets/default_avatar.png';
    };

    return (
        <Menu as="div" className="relative ml-3">
            {/* Avatar button that opens the dropdown */}
            <MenuButton className="relative flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500">
                <span className="absolute -inset-1.5" />
                <span className="sr-only">{t('common.openUserMenu')}</span>
                <img
                    alt={user?.username || 'User avatar'}
                    src={getAvatarUrl()}
                    className="size-10 rounded-full bg-emerald-900 object-cover outline -outline-offset-1 outline-white/10"
                />
            </MenuButton>

            {/* Dropdown menu */}
            <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg outline outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
            >
                {/* User info header */}
                <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                        {user?.email}
                    </p>
                </div>

                {/* Profile link */}
                <MenuItem>
                    <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                    >
                        {t('nav.profile')}
                    </Link>
                </MenuItem>

                {/* My Documents link */}
                <MenuItem>
                    <Link
                        to="/my-documents"
                        className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                    >
                        {t('nav.myDocuments')}
                    </Link>
                </MenuItem>

                {/* Separator */}
                <div className="border-t border-gray-100 my-1" />

                {/* Language selector */}
                <div className="px-4 py-2">
                    <label 
                        htmlFor="language-select"
                        className="block text-xs font-medium text-gray-500 mb-1.5"
                    >
                        {t('common.language')}
                    </label>
                    <select
                        id="language-select"
                        value={currentLanguage.code}
                        onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguageCode)}
                        className="w-full px-2.5 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md 
                                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                                   cursor-pointer hover:border-gray-400 transition-colors"
                    >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                                {lang.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Separator */}
                <div className="border-t border-gray-100 my-1" />

                {/* Sign out button */}
                <MenuItem>
                    <Button
                        variant="danger"
                        size="sm"
                        fullWidth
                        onClick={handleLogout}
                    >
                        {t('nav.signOut')}
                    </Button>
                </MenuItem>
            </MenuItems>
        </Menu>
    );
}
