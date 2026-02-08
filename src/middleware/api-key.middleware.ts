import { Request, Response, NextFunction } from 'express';
import ApiKeyService from '../services/api-key.service';

/**
 * Middleware to validate API key for agent requests
 * API key should be sent in X-API-Key header
 */
/**
 * Middleware to validate API key for agent requests
 * API key should be sent in X-API-Key header
 */
export const apiKeyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get API key from header
        const apiKey = req.headers['x-api-key'] as string;

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: 'API key is required'
            });
        }

        // Validate API key
        const isValid = await ApiKeyService.validateApiKey(apiKey);

        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired API key'
            });
        }

        // API key is valid, proceed
        next();
    } catch (error) {
        console.error('API key validation error:', error);
        res.status(401).json({
            success: false,
            message: 'API key validation failed'
        });
    }
};

