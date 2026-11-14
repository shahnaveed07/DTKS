import { generateRandomId } from '../utils/crypto.js';
import { getClientIp } from '../middleware/rateLimiter.js';

/**
 * Records sensitive administrative and system operations in the `activity_logs` table.
 */
export async function logAdminActivity(
  env,
  { adminId, action, entityType, entityId, details = '', request = null }
) {
  try {
    const id = generateRandomId('act');
    const ipAddress = request ? getClientIp(request) : '';
    const timestamp = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO activity_logs (id, admin_id, action, entity_type, entity_id, details, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        adminId || null,
        String(action),
        String(entityType),
        entityId ? String(entityId) : null,
        typeof details === 'string' ? details : JSON.stringify(details),
        ipAddress,
        timestamp
      )
      .run();
  } catch (err) {
    console.error('[AuditLog Warning]: Failed to record activity log:', err?.message || err);
  }
}
