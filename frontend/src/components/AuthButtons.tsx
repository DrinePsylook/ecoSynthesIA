import { Link } from 'react-router-dom';
import Button from './Button';

/**
 * AuthButtons Component
 */
export default function AuthButtons() {
    return (
        <div className="flex items-center gap-3">
            <Link to="/login">
                <Button
                    variant="ghost-light"
                    size="sm"
                >
                    Login
                </Button>
            </Link>

            <Link to="/register">
                <Button
                    variant="primary"
                    size="sm"
                >
                    Register
                </Button>
            </Link>
        </div>
    );
}