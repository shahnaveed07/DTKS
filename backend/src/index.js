import { handleApiRequest } from './routes/router.js';

/**
 * Cloudflare Worker Entry Point for DTKS Backend API
 * Compatible with Cloudflare Workers + D1 (`env.DB`) + R2 (`env.ASSETS_BUCKET`)
 */
export default {
  async fetch(request, env, ctx) {
    return handleApiRequest(request, env, ctx);
  },
};
