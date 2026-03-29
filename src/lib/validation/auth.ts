import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z
    .string()
    .email('Adresse email invalide')
    .min(1, 'L\'email est requis')
    .max(255, 'L\'email est trop long');

/**
 * Password validation schema
 */
export const passwordSchema = z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
    .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial');

/**
 * Name validation schema
 */
export const nameSchema = z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom est trop long')
    .regex(/^[a-zA-ZÀ-ÿ\s-]+$/, 'Le nom contient des caractères invalides');

/**
 * Registration validation schema
 */
export const registerSchema = z.object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Login validation schema
 */
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Le mot de passe est requis'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Forgot password validation schema
 */
export const forgotPasswordSchema = z.object({
    email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Verify PIN validation schema
 */
export const verifyPinSchema = z.object({
    email: emailSchema,
    pin: z
        .string()
        .length(5, 'Le code PIN doit contenir exactement 5 chiffres')
        .regex(/^\d{5}$/, 'Le code PIN doit contenir uniquement des chiffres'),
});

export type VerifyPinInput = z.infer<typeof verifyPinSchema>;

/**
 * Reset password validation schema
 */
export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Le token est requis'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'La confirmation du mot de passe est requise'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
