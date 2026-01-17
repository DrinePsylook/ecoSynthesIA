import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/authContext';
import Button from '../components/Button';

/**
 * RegisterPage Component
 * 
 * Displays a registration form with username, email, password, and confirmation.
 * On successful registration, the user is automatically logged in and redirected.
 */
export default function RegisterPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { register } = useAuth();

    // Form state
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Handle form submission
     */
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            setError(t('auth.fillAllFields'));
            return;
        }

        if (username.length < 3) {
            setError(t('auth.usernameMinLength'));
            return;
        }

        if (password.length < 8) {
            setError(t('auth.passwordMinLength'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('auth.passwordMismatch'));
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError(t('auth.invalidEmail'));
            return;
        }

        setIsLoading(true);

        try {
            const response = await register({ email, password, username });

            if (response.success) {
                // Registration successful - user is auto-logged in
                // Redirect to home
                navigate('/');
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError(t('auth.unexpectedError'));
            console.error('Registration error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <img
                    className="mx-auto h-16 w-auto"
                    src="/src/assets/logo_ecoSynthesIA_bulle.png"
                    alt="EcoSynthesIA"
                />
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                    {t('auth.registerTitle')}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    {t('auth.hasAccount')}{' '}
                    <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-500">
                        {t('auth.signIn')}
                    </Link>
                </p>
            </div>

            {/* Form Card */}
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Username field */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                                {t('auth.username')}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                                    placeholder="johndoe"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                {t('auth.atLeast3Chars')}
                            </p>
                        </div>

                        {/* Email field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                {t('auth.email')}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        {/* Password field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                {t('auth.password')}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                {t('auth.atLeast8Chars')}
                            </p>
                        </div>

                        {/* Confirm Password field */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                {t('auth.confirmPassword')}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Submit button */}
                        <div>
                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                disabled={isLoading}
                            >
                                {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
                            </Button>
                        </div>
                    </form>

                    {/* Terms notice */}
                    <p className="mt-6 text-center text-xs text-gray-500">
                        {t('auth.terms')}{' '}
                        <a href="#" className="text-emerald-600 hover:text-emerald-500">
                            {t('auth.termsOfService')}
                        </a>{' '}
                        {t('auth.and')}{' '}
                        <a href="#" className="text-emerald-600 hover:text-emerald-500">
                            {t('auth.privacyPolicy')}
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
