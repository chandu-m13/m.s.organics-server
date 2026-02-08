import { Request, Response } from 'express';
import UserService from '../services/user.service';
import { AuthRequest } from '../middleware/auth.middleware';

const UserController = {
    login: async function (req: Request, res: Response) {
        const { email, password } = req.body;
        const result = await UserService.login({ email, password });

        if (result.success && result.data?.accessToken) {
            const isProduction = process.env.NODE_ENV === 'production';

            // Set HttpOnly cookie for access token
            res.cookie('accessToken', result.data.accessToken, {
                httpOnly: true,
                secure: isProduction, // Must be true for SameSite=None
                sameSite: isProduction ? 'none' : 'lax',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            // Set refresh token cookie - ONLY sent to refresh-token endpoint for security
            if (result.data.refreshToken) {
                res.cookie('refreshToken', result.data.refreshToken, {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: isProduction ? 'none' : 'lax',
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                    path: '/api/user/refresh-token' // ✅ Only sent to this endpoint
                });
            }
        }

        return result;
    },


    resetPassword: async function (req: AuthRequest, res: Response) {
        // Get userId from JWT token if available, otherwise from body
        const userId = req.user?.userId || req.body.userId;
        const { currentPassword, newPassword } = req.body;

        // Validate userId
        if (!userId || isNaN(parseInt(String(userId)))) {
            throw new Error('Valid userId is required');
        }

        return UserService.resetPassword(parseInt(String(userId)), { currentPassword, newPassword });
    },

    getProfile: async function (req: AuthRequest, res: Response) {
        // Get userId from JWT token if available, otherwise from query/body
        const userId = req.user?.userId || req.body.userId || req.query.userId;

        // Validate userId
        if (!userId || isNaN(parseInt(String(userId)))) {
            throw new Error('Valid userId is required');
        }

        return UserService.getUserById(parseInt(String(userId)));
    },

    logout: async function (req: AuthRequest, res: Response) {
        const isProduction = process.env.NODE_ENV === 'production';

        // Clear cookies
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax'
        });
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/api/user/refresh-token' // Must match path used when setting cookie
        });
        // For backward compatibility
        res.clearCookie('token', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax'
        });

        // Get access token from the request (set by authMiddleware) or cookies
        const accessToken = req.token || req.cookies?.accessToken || req.cookies?.token;

        // Get refresh token from body or cookies
        const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;

        if (!accessToken) {
            // Fallback: try to extract from Authorization header
            const authHeader = req.headers.authorization;
            const extractedToken = authHeader?.replace('Bearer ', '');

            if (extractedToken) {
                const expiresAt = req.user?.exp
                    ? new Date(req.user.exp * 1000)
                    : undefined;
                return UserService.logout(extractedToken, refreshToken, expiresAt);
            }

            // Even if no token found to blacklist, we cleared the cookies, so return success
            return { success: true, message: 'Logged out successfully' };
        }

        // Calculate expiration time from JWT payload if available
        const expiresAt = req.user?.exp
            ? new Date(req.user.exp * 1000)
            : undefined;

        return UserService.logout(accessToken, refreshToken, expiresAt);
    },

    refreshToken: async function (req: Request, res: Response) {
        const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;

        if (!refreshToken) {
            return {
                success: false,
                statusCode: 401,
                message: 'Refresh token is required'
            };
        }

        return UserService.refreshAccessToken(refreshToken);
    }
};

export default UserController;

