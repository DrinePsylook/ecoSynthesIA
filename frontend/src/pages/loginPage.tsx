import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/authContext";
import Button from "../components/Button";

/**
 * LoginPage Component
 * Displays a login form with email and password fields.
 */
export default function LoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Handle form submission
     */
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError(t('auth.fillAllFields'));
            return;
        }
        setIsLoading(true);

        try {
            const response = await login({ email, password });
            if (response.success) {
                navigate('/');
            } else {
                setError(response.message);
            }
        } catch (err) {
            // Network or unexpected error
            setError(t('auth.unexpectedError'));
            console.error('Login error:', err);
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
                    {t('auth.loginTitle')}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    {t('auth.noAccount')}{' '}
                    <Link to="/register" className="font-medium text-emerald-600 hover:text-emerald-500">
                        {t('auth.createNewAccount')}
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
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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
                                {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
