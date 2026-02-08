import fs from 'fs';

// Cache for secrets to avoid repeated file reads
const secretsCache: Record<string, string> = {};

/**
 * Retrieves a configuration value, prioritizing Docker Secrets over Environment Variables.
 * 
 * 1. Checks for a file at `/run/secrets/<key>` (Docker Secret default)
 * 2. Checks for a file path specified in `<key>_FILE` env var
 * 3. Checks for direct value in `<key>` env var
 * 
 * @param key The name of the secret/variable (e.g., 'DB_PASSWORD')
 * @param defaultValue Optional fallback value if nothing is found
 */
export function getEnv(key: string, defaultValue?: string): string {
    // 1. Check if we already cached this secret
    if (secretsCache[key]) {
        return secretsCache[key];
    }

    // 2. Try to read from Docker Secret (Standard Path)
    // Docker secrets are lowercase by default when mounted, but we can check both
    const secretPath = `/run/secrets/${key.toLowerCase()}`;
    if (fs.existsSync(secretPath)) {
        try {
            const secretValue = fs.readFileSync(secretPath, 'utf8').trim();
            secretsCache[key] = secretValue;
            return secretValue;
        } catch (error) {
            console.warn(`[Config] Failed to read secret from ${secretPath}:`, error);
        }
    }

    // 3. Try to read from file path specified in env var (e.g. DB_PASSWORD_FILE)
    const envFilePath = process.env[`${key}_FILE`];
    if (envFilePath && fs.existsSync(envFilePath)) {
        try {
            const secretValue = fs.readFileSync(envFilePath, 'utf8').trim();
            secretsCache[key] = secretValue;
            return secretValue;
        } catch (error) {
            console.warn(`[Config] Failed to read secret from ${envFilePath}:`, error);
        }
    }

    // 4. Fallback to standard environment variable
    const envValue = process.env[key];
    if (envValue !== undefined) {
        return envValue;
    }

    // 5. Return default or empty string (standard env behavior)
    if (defaultValue !== undefined) {
        return defaultValue;
    }

    // Return empty string instead of undefined to simplify type handling, 
    // or let the caller handle validation if it's a required field.
    return '';
}
