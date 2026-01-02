import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/authContext';
import Button from './Button';

/**
 * ProfileDropdown - Component for the profile dropdown menu
 */
export default function ProfileDropdown() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    /**
     * Handle logout click
     */
    const handleLogout = async () => {
        await logout();
        navigate('/');
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
                <span className="sr-only">Open user menu</span>
                <img
                    alt={user?.username || 'User avatar'}
                    src={getAvatarUrl()}
                    className="size-10 rounded-full bg-emerald-900 object-cover outline -outline-offset-1 outline-white/10"
                />
            </MenuButton>

            {/* Dropdown menu */}
            <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg outline outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
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
                        Profile
                    </Link>
                </MenuItem>

                {/* My Documents link */}
                <MenuItem>
                    <Link
                        to="/my-documents"
                        className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                    >
                        My Documents
                    </Link>
                </MenuItem>

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
                        Sign out
                    </Button>
                </MenuItem>
            </MenuItems>
        </Menu>
    );
}