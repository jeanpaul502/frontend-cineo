import prisma from '../prisma';

/**
 * Generate a random 5-digit PIN code
 */
export function generatePin(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
}

/**
 * Create a PIN code for a user
 */
export async function createPinCode(userId: string): Promise<string> {
    // Delete any existing PIN codes for this user
    await prisma.pinCode.deleteMany({
        where: { userId },
    });

    const pin = generatePin();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expire in 10 minutes

    await prisma.pinCode.create({
        data: {
            pin,
            userId,
            expiresAt,
        },
    });

    return pin;
}

/**
 * Verify a PIN code
 */
export async function verifyPin(
    userId: string,
    pin: string
): Promise<{ valid: boolean; error?: string; attemptsLeft?: number }> {
    const pinCode = await prisma.pinCode.findFirst({
        where: {
            userId,
            verified: false,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    if (!pinCode) {
        return { valid: false, error: 'Code PIN non trouvé ou déjà utilisé' };
    }

    if (new Date() > pinCode.expiresAt) {
        return { valid: false, error: 'Code PIN expiré' };
    }

    if (pinCode.attempts >= 5) {
        return { valid: false, error: 'Nombre maximum de tentatives atteint' };
    }

    // Increment attempts
    await prisma.pinCode.update({
        where: { id: pinCode.id },
        data: { attempts: pinCode.attempts + 1 },
    });

    if (pinCode.pin !== pin) {
        const attemptsLeft = 5 - (pinCode.attempts + 1);

        if (attemptsLeft <= 0) {
            // Delete the PIN code as max attempts reached
            await prisma.pinCode.delete({
                where: { id: pinCode.id },
            });
            return {
                valid: false,
                error: 'Nombre maximum de tentatives atteint',
                attemptsLeft: 0,
            };
        }

        return {
            valid: false,
            error: `Code PIN incorrect. ${attemptsLeft} tentative(s) restante(s)`,
            attemptsLeft,
        };
    }

    // Delete the PIN code after successful verification
    await prisma.pinCode.delete({
        where: { id: pinCode.id },
    });

    return { valid: true };
}

/**
 * Check if a user has a valid PIN code
 */
export async function hasValidPin(userId: string): Promise<boolean> {
    const pinCode = await prisma.pinCode.findFirst({
        where: {
            userId,
            verified: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    if (!pinCode) {
        return false;
    }

    // Check if still within expiration window (10 minutes after verification)
    const expirationExtension = new Date(pinCode.expiresAt);
    expirationExtension.setMinutes(expirationExtension.getMinutes() + 10);

    return new Date() <= expirationExtension;
}
