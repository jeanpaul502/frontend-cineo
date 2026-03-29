import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret-change-me-in-production'
);

const JWT_REFRESH_SECRET = new TextEncoder().encode(
    process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-me-in-production'
);

export interface JWTPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}

/**
 * Generate a JWT access token (expires in 15 minutes)
 */
export async function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    return new SignJWT(payload as any)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(JWT_SECRET);
}

/**
 * Generate a JWT refresh token (expires in 7 days)
 */
export async function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    return new SignJWT(payload as any)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_REFRESH_SECRET);
}

/**
 * Verify and decode a JWT access token
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as JWTPayload;
    } catch (error) {
        return null;
    }
}

/**
 * Verify and decode a JWT refresh token
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
        return payload as unknown as JWTPayload;
    } catch (error) {
        return null;
    }
}
