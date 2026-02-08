import { prisma } from "../prisma";
import ApiResponse from "../utils/api-response";
import HttpStatusCodes from "../utils/HTTP_STATUS_CODES";
import RestError from "../utils/rest-error";
import bcrypt from 'bcrypt';
import { generateAccessToken } from '../middleware/auth.middleware';
import TokenBlacklistService from './token-blacklist.service';
import RefreshTokenService from './refresh-token.service';

const UserService = {
    async login(payload: {
        email: string;
        password: string;
    }) {
        // Validate input
        if (!payload.email || !payload.password) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Email and password are required');
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: payload.email }
        });

        if (!user) {
            throw new RestError(HttpStatusCodes.UNAUTHORIZED, 'Invalid email or password');
        }

        // Check if user is active
        if (!user.is_active) {
            throw new RestError(HttpStatusCodes.FORBIDDEN, 'Account is not active. Please contact administrator.');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(payload.password, user.password);
        if (!isPasswordValid) {
            throw new RestError(HttpStatusCodes.UNAUTHORIZED, 'Invalid email or password');
        }

        // Generate access token (15 minutes)
        const accessToken = generateAccessToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            userCode: user.user_code
        });

        // Generate and store refresh token (7 days)
        const refreshToken = await RefreshTokenService.createRefreshToken(user.id);

        // Return user data and both tokens
        return new ApiResponse(HttpStatusCodes.OK, 'Login successful', {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                userCode: user.user_code
            }
        });
    },


    async resetPassword(userId: number, payload: {
        currentPassword: string;
        newPassword: string;
    }) {
        // Validate input
        if (!payload.currentPassword || !payload.newPassword) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Current password and new password are required');
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new RestError(HttpStatusCodes.NOT_FOUND, 'User not found');
        }

        if (!user.is_active) {
            throw new RestError(HttpStatusCodes.FORBIDDEN, 'User account is not active');
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(payload.currentPassword, user.password);
        if (!isPasswordValid) {
            throw new RestError(HttpStatusCodes.UNAUTHORIZED, 'Current password is incorrect');
        }

        // Check if new password is same as current password
        const isSamePassword = await bcrypt.compare(payload.newPassword, user.password);
        if (isSamePassword) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'New password must be different from current password');
        }

        // Validate new password strength
        if (payload.newPassword.length < 8) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Password must be at least 8 characters long');
        }

        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(payload.newPassword, saltRounds);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                updatedAt: new Date()
            }
        });

        return new ApiResponse(HttpStatusCodes.OK, 'Password reset successfully', { success: true });
    },

    async getUserById(userId: number) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                user_code: true,
                is_active: true,
                createdAt: true
            }
        });

        if (!user) {
            throw new RestError(HttpStatusCodes.NOT_FOUND, 'User not found');
        }

        return new ApiResponse(HttpStatusCodes.OK, 'User fetched successfully', user);
    },

    async logout(accessToken: string, refreshToken?: string, expiresAt?: Date) {
        if (!accessToken) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Token is required for logout');
        }

        // Calculate expiration from JWT if not provided (default 15 min from now for access token)
        const tokenExpiresAt = expiresAt || new Date(Date.now() + 15 * 60 * 1000);

        // Add access token to blacklist
        TokenBlacklistService.blacklist(accessToken, tokenExpiresAt);

        // Revoke refresh token if provided
        if (refreshToken) {
            try {
                await RefreshTokenService.revokeToken(refreshToken);
            } catch (error) {
                // Continue logout even if refresh token revocation fails
                console.error('Error revoking refresh token:', error);
            }
        }

        return new ApiResponse(HttpStatusCodes.OK, 'Logged out successfully', { success: true });
    },

    async refreshAccessToken(refreshToken: string) {
        if (!refreshToken) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Refresh token is required');
        }

        try {
            // Verify refresh token and get user ID
            const userId = await RefreshTokenService.verifyRefreshToken(refreshToken);

            // Get user data
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    user_code: true,
                    is_active: true
                }
            });

            if (!user) {
                throw new RestError(HttpStatusCodes.NOT_FOUND, 'User not found');
            }

            if (!user.is_active) {
                throw new RestError(HttpStatusCodes.FORBIDDEN, 'User account is not active');
            }

            // Generate new access token
            const accessToken = generateAccessToken({
                userId: user.id,
                email: user.email,
                name: user.name,
                userCode: user.user_code
            });

            return new ApiResponse(HttpStatusCodes.OK, 'Access token refreshed successfully', {
                accessToken
            });
        } catch (error) {
            if (error instanceof RestError) {
                throw error;
            }
            throw new RestError(HttpStatusCodes.UNAUTHORIZED, 'Invalid or expired refresh token');
        }
    }
};

export default UserService;


