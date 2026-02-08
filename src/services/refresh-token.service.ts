import { prisma } from '../prisma';
import crypto from 'crypto';

const REFRESH_TOKEN_EXPIRES_IN_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || '7');

class RefreshTokenService {
    /**
     * Create a new refresh token for a user
     */
    async createRefreshToken(userId: number): Promise<string> {
        // Generate a unique refresh token
        const token = crypto.randomBytes(64).toString('hex');

        // Calculate expiry date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS);

        // Store in database
        await prisma.refreshToken.create({
            data: {
                token,
                fk_id_user: userId,
                expires_at: expiresAt,
                is_revoked: false
            }
        });

        return token;
    }

    /**
     * Verify a refresh token and return the user ID
     */
    async verifyRefreshToken(token: string): Promise<number> {
        const refreshToken = await prisma.refreshToken.findUnique({
            where: { token }
        });

        if (!refreshToken) {
            throw new Error('Invalid refresh token');
        }

        if (refreshToken.is_revoked) {
            throw new Error('Refresh token has been revoked');
        }

        if (new Date() > refreshToken.expires_at) {
            throw new Error('Refresh token has expired');
        }

        return refreshToken.fk_id_user;
    }

    /**
     * Revoke a specific refresh token
     */
    async revokeToken(token: string): Promise<void> {
        await prisma.refreshToken.updateMany({
            where: { token },
            data: { is_revoked: true }
        });
    }

    /**
     * Revoke all refresh tokens for a user
     */
    async revokeUserTokens(userId: number): Promise<void> {
        await prisma.refreshToken.updateMany({
            where: { fk_id_user: userId },
            data: { is_revoked: true }
        });
    }

    /**
     * Clean up expired tokens (can be run as a cron job)
     */
    async cleanupExpiredTokens(): Promise<number> {
        const result = await prisma.refreshToken.deleteMany({
            where: {
                expires_at: {
                    lt: new Date()
                }
            }
        });

        return result.count;
    }
}

export default new RefreshTokenService();
