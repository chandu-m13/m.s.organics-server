import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import HttpStatusCodes from '../utils/HTTP_STATUS_CODES';
import RestError from '../utils/rest-error';
import TokenBlacklistService from '../services/token-blacklist.service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Backward compatibility
const JWT_EXPIRES_IN = ACCESS_TOKEN_EXPIRES_IN;

export interface JWTPayload {
    userId: number;
    email: string;
    name: string;
    userCode: string;
    exp?: number; // JWT expiration timestamp
    iat?: number; // JWT issued at timestamp
}

export interface AuthRequest extends Request {
    user?: JWTPayload;
    token?: string; // Store token for logout
}

// Generate access token (short-lived, 15 minutes)
export const generateAccessToken = (payload: JWTPayload): string => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN
    } as any);
};

// Generate refresh token JWT (for validation) - actual refresh token is crypto-random in service
export const generateRefreshTokenJWT = (payload: { userId: number }): string => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN
    } as any);
};

// Backward compatibility wrapper
export const generateToken = (payload: JWTPayload): string => {
    return generateAccessToken(payload);
};

export const verifyToken = (token: string): JWTPayload => {
    try {
        // Check if token is blacklisted
        if (TokenBlacklistService.isBlacklisted(token)) {
            throw new RestError(HttpStatusCodes.UNAUTHORIZED, 'You session has been expired! Please login again');
        }
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
        if (error instanceof RestError) {
            throw error;
        }
        throw new RestError(HttpStatusCodes.UNAUTHORIZED, 'Invalid or expired token');
    }
};

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        console.log('Auth Middleware - Origin:', req.headers.origin);
        console.log('Auth Middleware - Cookies:', req.cookies);
        console.log('Auth Middleware - Auth Header:', req.headers.authorization);

        // Check for token in cookies (accessToken set by login, token for backward compatibility)
        let token = req.cookies?.accessToken || req.cookies?.token;

        // Fallback to Authorization header if no cookie
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.replace('Bearer ', '');
            }
        }

        if (!token) {
            throw new RestError(HttpStatusCodes.UNAUTHORIZED, 'No authorization token provided');
        }

        const decoded = verifyToken(token);
        req.user = decoded;
        req.token = token; // Store token for potential logout use

        next();
    } catch (error) {
        if (error instanceof RestError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        return res.status(HttpStatusCodes.UNAUTHORIZED).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

export default authMiddleware;

