// In-memory token blacklist for invalidated JWT tokens
// In production, use Redis or a database for persistence across server restarts

interface BlacklistedToken {
    token: string;
    expiresAt: Date;
}

const tokenBlacklist: Map<string, BlacklistedToken> = new Map();

const TokenBlacklistService = {
    /**
     * Add a token to the blacklist
     * @param token - JWT token to blacklist
     * @param expiresAt - When the token expires (for cleanup)
     */
    blacklist(token: string, expiresAt: Date): void {
        tokenBlacklist.set(token, { token, expiresAt });
    },

    /**
     * Check if a token is blacklisted
     * @param token - JWT token to check
     * @returns true if token is blacklisted
     */
    isBlacklisted(token: string): boolean {
        return tokenBlacklist.has(token);
    },

    /**
     * Clean up expired tokens from the blacklist
     * Should be called periodically to free memory
     */
    cleanup(): void {
        const now = new Date();
        for (const [key, value] of tokenBlacklist.entries()) {
            if (value.expiresAt < now) {
                tokenBlacklist.delete(key);
            }
        }
    },

    /**
     * Get the count of blacklisted tokens (for debugging)
     */
    getCount(): number {
        return tokenBlacklist.size;
    }
};

// Run cleanup every hour to remove expired tokens
setInterval(() => {
    TokenBlacklistService.cleanup();
}, 60 * 60 * 1000);

export default TokenBlacklistService;
