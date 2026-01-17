import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from './Button';

/**
 * AuthButtons Component
 * Displays login and register buttons for unauthenticated users.
 */
export default function AuthButtons() {
    const { t } = useTranslation();

    return (
        <div className="flex items-center gap-3">
            <Link to="/login">
                <Button
                    variant="ghost-light"
                    size="sm"
                >
                    {t('nav.login')}
                </Button>
            </Link>

            <Link to="/register">
                <Button
                    variant="primary"
                    size="sm"
                >
                    {t('nav.register')}
                </Button>
            </Link>
        </div>
    );
}
