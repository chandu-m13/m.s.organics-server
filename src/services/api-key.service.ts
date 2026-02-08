import crypto from 'crypto';
import { prisma } from '../prisma';

export interface ApiKey {
    key: string;
    name?: string;
    createdAt: Date;
    expiresAt: Date;
    isActive: boolean;
}

class ApiKeyService {
    private static instance: ApiKeyService;

    private constructor() {
        // Initialize cleanup interval - run every hour
        setInterval(() => {
            this.cleanupExpiredKeys().catch(console.error);
        }, 60 * 60 * 1000);
    }

    public static getInstance(): ApiKeyService {
        if (!ApiKeyService.instance) {
            ApiKeyService.instance = new ApiKeyService();
        }
        return ApiKeyService.instance;
    }

    /**
     * Generate a new API key for the agent
     */
    public async generateApiKey(name?: string): Promise<ApiKey> {
        const key = `ila_${crypto.randomBytes(32).toString('hex')}`;
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const apiKey = await prisma.apiKey.create({
            data: {
                key,
                name,
                expires_at: expiresAt,
                is_active: true
            }
        });

        console.log(`✅ Generated new API key: ${key.substring(0, 16)}...`);

        return {
            key: apiKey.key,
            name: apiKey.name || undefined,
            createdAt: apiKey.createdAt,
            expiresAt: apiKey.expires_at,
            isActive: apiKey.is_active
        };
    }

    /**
     * Validate an API key
     */
    public async validateApiKey(key: string): Promise<boolean> {
        try {
            const apiKey = await prisma.apiKey.findUnique({
                where: { key }
            });

            if (!apiKey) {
                return false;
            }

            // Check if not active
            if (!apiKey.is_active) {
                return false;
            }

            // Check if expired
            if (new Date() > apiKey.expires_at) {
                // Auto-revoke expired key
                await prisma.apiKey.update({
                    where: { id: apiKey.id },
                    data: { is_active: false }
                });
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error validating API key:', error);
            return false;
        }
    }

    /**
     * Clean up expired API keys
     */
    private async cleanupExpiredKeys(): Promise<void> {
        try {
            const now = new Date();
            const result = await prisma.apiKey.updateMany({
                where: {
                    expires_at: { lt: now },
                    is_active: true
                },
                data: {
                    is_active: false
                }
            });

            if (result.count > 0) {
                console.log(`🧹 Cleaned up ${result.count} expired API keys`);
            }
        } catch (error) {
            console.error('Error cleaning up expired keys:', error);
        }
    }

    /**
     * Revoke a specific API key
     */
    public async revokeApiKey(key: string): Promise<boolean> {
        try {
            const result = await prisma.apiKey.updateMany({
                where: { key },
                data: { is_active: false }
            });

            return result.count > 0;
        } catch (error) {
            console.error('Error revoking API key:', error);
            return false;
        }
    }

    /**
     * Refresh an API key - revoke old and generate new
     */
    public async refreshApiKey(oldKey: string, name?: string): Promise<ApiKey | null> {
        try {
            // Validate old key first
            const isValid = await this.validateApiKey(oldKey);
            if (!isValid) {
                return null;
            }

            // Revoke old key
            await this.revokeApiKey(oldKey);

            // Generate new key
            return await this.generateApiKey(name);
        } catch (error) {
            console.error('Error refreshing API key:', error);
            return null;
        }
    }

    /**
     * Get all active API keys (for admin purposes)
     */
    public async getActiveKeys(): Promise<ApiKey[]> {
        try {
            await this.cleanupExpiredKeys();

            const keys = await prisma.apiKey.findMany({
                where: {
                    is_active: true,
                    expires_at: { gt: new Date() }
                },
                orderBy: { createdAt: 'desc' }
            });

            return keys.map((k: any) => ({
                key: k.key,
                name: k.name || undefined,
                createdAt: k.createdAt,
                expiresAt: k.expires_at,
                isActive: k.is_active
            }));
        } catch (error) {
            console.error('Error getting active keys:', error);
            return [];
        }
    }

    /**
     * Get API key expiration info
     */
    public async getKeyInfo(key: string): Promise<ApiKey | null> {
        try {
            const apiKey = await prisma.apiKey.findUnique({
                where: { key }
            });

            if (!apiKey) {
                return null;
            }

            return {
                key: apiKey.key,
                name: apiKey.name || undefined,
                createdAt: apiKey.createdAt,
                expiresAt: apiKey.expires_at,
                isActive: apiKey.is_active
            };
        } catch (error) {
            console.error('Error getting key info:', error);
            return null;
        }
    }
}

export default ApiKeyService.getInstance();
