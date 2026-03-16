import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePasswordStrength(password: string): {
    isValid: boolean;
    strength: number;
    errors: string[];
} {
    const errors: string[] = [];
    let strength = 0;

    if (password.length < 8) {
        errors.push('Le mot de passe doit contenir au moins 8 caractères');
    } else {
        strength++;
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins une minuscule');
    } else {
        strength++;
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins une majuscule');
    } else {
        strength++;
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins un chiffre');
    } else {
        strength++;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    } else {
        strength++;
    }

    return {
        isValid: errors.length === 0,
        strength,
        errors,
    };
}
