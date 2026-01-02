import { type ReactNode, type ButtonHTMLAttributes } from 'react';

/**
 * Button variants for different use cases
 */
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ghost-light';

/**
 * Button sizes
 */
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
}

/**
 * Reusable Button component with variants
 * 
 * Usage:
 *   <Button>Default (primary)</Button>
 *   <Button variant="danger">Delete</Button>
 *   <Button variant="secondary" size="sm">Cancel</Button>
 */
export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className = '',
    ...props
}: ButtonProps) {
    // Base classes (always applied)
    const baseClasses = 'rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

    // Variant-specific classes
    const variantClasses: Record<ButtonVariant, string> = {
        primary: 'bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
        danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
        'ghost-light': 'bg-transparent text-green-300 hover:bg-white/10 hover:text-white focus:ring-emerald-500',
    };

    // Size-specific classes
    const sizeClasses: Record<ButtonSize, string> = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    // Width class
    const widthClass = fullWidth ? 'w-full' : '';

    // Combine all classes
    const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`.trim();

    return (
        <button className={combinedClasses} {...props}>
            {children}
        </button>
    );
}