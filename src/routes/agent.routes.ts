import { Router } from 'express';
import { AgentController } from '../controllers/agent.controller';
import authMiddleware from '../middleware/auth.middleware';
import { apiKeyMiddleware } from '../middleware/api-key.middleware';

const router = Router();

// POST /api/agent/generate-api-key - Generate API key for agent (PUBLIC)
router.post('/generate-api-key', AgentController.generateApiKey);

// GET /api/agent/list-keys - List all active API keys (ADMIN ONLY - requires JWT)
router.get('/list-keys', authMiddleware, AgentController.listApiKeys);

// DELETE /api/agent/revoke/:key - Revoke an API key (ADMIN ONLY - requires JWT)
router.delete('/revoke/:key', authMiddleware, AgentController.revokeApiKey);

// POST /api/agent/refresh - Refresh API key (requires valid API key)
router.post('/refresh', apiKeyMiddleware, AgentController.refreshApiKey);

// GET /api/agent/key-info - Get API key information (requires valid API key)
router.get('/key-info', apiKeyMiddleware, AgentController.getKeyInfo);

export default router;
