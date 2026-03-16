import { nanoid } from 'nanoid';
import prisma from '../prisma';
import { TokenType } from '@prisma/client';

/**
 * Generate a verification token for email verification
 */
export async function generateEmailVerificationToken(userId: string): Promise<string> {
    // Delete any existing email verification tokens for this user
    await prisma.verificationToken.deleteMany({
        where: {
            userId,
            type: 'EMAIL_VERIFICATION',
        },
    });

    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expire in 24 hours

    await prisma.verificationToken.create({
        data: {
            token,
            type: 'EMAIL_VERIFICATION',
            userId,
            expiresAt,
        },
    });

    return token;
}

/**
 * Generate a password reset token
 */
export async function generatePasswordResetToken(userId: string): Promise<string> {
    // Delete any existing password reset tokens for this user
    await prisma.verificationToken.deleteMany({
        where: {
            userId,
            type: 'PASSWORD_RESET',
        },
    });

    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // Expire in 30 minutes

    await prisma.verificationToken.create({
        data: {
            token,
            type: 'PASSWORD_RESET',
            userId,
            expiresAt,
        },
    });

    return token;
}

/**
 * Verify a token and return the user ID if valid
 */
export async function verifyToken(
    token: string,
    type: TokenType
): Promise<{ valid: boolean; userId?: string; error?: string }> {
    const verificationToken = await prisma.verificationToken.findFirst({
        where: {
            token,
            type,
        },
    });

    if (!verificationToken) {
        return { valid: false, error: 'Token invalide' };
    }

    if (verificationToken.used) {
        return { valid: false, error: 'Token déjà utilisé' };
    }

    if (new Date() > verificationToken.expiresAt) {
        return { valid: false, error: 'Token expiré' };
    }

    return { valid: true, userId: verificationToken.userId };
}

/**
 * Delete a token
 */
export async function deleteToken(token: string): Promise<void> {
    await prisma.verificationToken.delete({
        where: { token },
    });
}

/**
 * Mark a token as used (Deprecated: use deleteToken instead)
 */
export async function markTokenAsUsed(token: string): Promise<void> {
    await deleteToken(token);
}

/**
 * Invalidate all tokens for a user
 */
export async function invalidateUserTokens(userId: string): Promise<void> {
    await prisma.verificationToken.updateMany({
        where: { userId },
        data: { used: true },
    });
}
