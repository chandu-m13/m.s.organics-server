import { Request, Response } from 'express';
import ApiKeyService from '../services/api-key.service';

export const AgentController = {
    /**
     * Generate API key for agent
     * Public endpoint - no authentication required
     */
    generateApiKey: async (req: Request, res: Response) => {
        try {
            const name = req.body?.name;
            const apiKey = await ApiKeyService.generateApiKey(name);

            return res.status(200).json({
                success: true,
                message: 'API key generated successfully',
                data: {
                    apiKey: apiKey.key,
                    expiresAt: apiKey.expiresAt,
                    name: apiKey.name
                }
            });
        } catch (error: any) {
            console.error('Error generating API key:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate API key'
            });
        }
    },

    /**
     * List all active API keys
     * Protected endpoint - requires JWT authentication (admin only)
     */
    listApiKeys: async (req: Request, res: Response) => {
        try {
            const keys = await ApiKeyService.getActiveKeys();

            return res.status(200).json({
                success: true,
                message: 'API keys retrieved successfully',
                data: {
                    keys: keys.map(k => ({
                        key: k.key.substring(0, 16) + '...',  // Mask full key
                        fullKey: k.key,  // Include full key for admin
                        name: k.name,
                        expiresAt: k.expiresAt,
                        createdAt: k.createdAt
                    })),
                    count: keys.length
                }
            });
        } catch (error: any) {
            console.error('Error listing API keys:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to list API keys'
            });
        }
    },

    /**
     * Revoke an API key
     * Protected endpoint - requires JWT authentication (admin only)
     */
    revokeApiKey: async (req: Request, res: Response) => {
        try {
            const { key } = req.params;

            if (!key) {
                return res.status(400).json({
                    success: false,
                    message: 'API key is required'
                });
            }

            const success = await ApiKeyService.revokeApiKey(key);

            if (success) {
                return res.status(200).json({
                    success: true,
                    message: 'API key revoked successfully'
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'API key not found'
                });
            }
        } catch (error: any) {
            console.error('Error revoking API key:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to revoke API key'
            });
        }
    },

    /**
     * Refresh an API key
     * Protected endpoint - requires valid API key
     */
    refreshApiKey: async (req: Request, res: Response) => {
        try {
            const oldKey = req.headers['x-api-key'] as string;
            const name = req.body?.name;

            if (!oldKey) {
                return res.status(400).json({
                    success: false,
                    message: 'API key is required'
                });
            }

            const newApiKey = await ApiKeyService.refreshApiKey(oldKey, name);

            if (newApiKey) {
                return res.status(200).json({
                    success: true,
                    message: 'API key refreshed successfully',
                    data: {
                        apiKey: newApiKey.key,
                        expiresAt: newApiKey.expiresAt,
                        name: newApiKey.name
                    }
                });
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired API key'
                });
            }
        } catch (error: any) {
            console.error('Error refreshing API key:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to refresh API key'
            });
        }
    },

    /**
     * Get API key information
     * Protected endpoint - requires valid API key
     */
    getKeyInfo: async (req: Request, res: Response) => {
        try {
            const key = req.headers['x-api-key'] as string;

            if (!key) {
                return res.status(400).json({
                    success: false,
                    message: 'API key is required'
                });
            }

            const keyInfo = await ApiKeyService.getKeyInfo(key);

            if (keyInfo) {
                return res.status(200).json({
                    success: true,
                    data: {
                        name: keyInfo.name,
                        expiresAt: keyInfo.expiresAt,
                        createdAt: keyInfo.createdAt,
                        isActive: keyInfo.isActive
                    }
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'API key not found'
                });
            }
        } catch (error: any) {
            console.error('Error getting API key info:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get API key info'
            });
        }
    }
};
