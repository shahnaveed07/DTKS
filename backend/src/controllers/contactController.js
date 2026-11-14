import { generateRandomId } from '../utils/crypto.js';
import { successResponse, errorResponse, parseJsonBody } from '../utils/response.js';
import { validateContactSubmission, validateContactUpdate } from '../validators/schemas.js';
import { logAdminActivity } from '../services/auditService.js';
import { notifyContactSubmitted } from '../services/emailService.js';

export function mapContactRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    subject: row.subject,
    message: row.message,
    status: row.status || 'New',
    admin_notes: row.admin_notes || '',
    adminNotes: row.admin_notes || '',
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
  };
}

export async function createContactMessage(request, env) {
  const body = await parseJsonBody(request);
  const validation = validateContactSubmission(body);
  if (!validation.isValid) {
    return errorResponse('Contact form validation failed.', 400, 'VALIDATION_ERROR', validation.errors);
  }

  const d = validation.data;
  const id = generateRandomId('inq');
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO contact_messages (id, name, email, phone, subject, message, status, admin_notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'New', '', ?, ?)`
  )
    .bind(id, d.name, d.email, d.phone, d.subject, d.message, now, now)
    .run();

  const createdRow = await env.DB.prepare('SELECT * FROM contact_messages WHERE id = ?').bind(id).first();
  const inquiry = mapContactRow(createdRow);

  await notifyContactSubmitted(env, inquiry);

  return successResponse(
    {
      inquiry: {
        id: inquiry.id,
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone,
        subject: inquiry.subject,
        message: inquiry.message,
        status: inquiry.status,
        created_at: inquiry.created_at,
        createdAt: inquiry.createdAt,
      },
      message: {
        id: inquiry.id,
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone,
        subject: inquiry.subject,
        message: inquiry.message,
        status: inquiry.status,
        created_at: inquiry.created_at,
        createdAt: inquiry.createdAt,
      },
    },
    'Contact message submitted successfully.',
    201
  );
}

export async function listContactMessages(request, env) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const search = (url.searchParams.get('search') || url.searchParams.get('q') || '').trim();

  let sql = 'SELECT * FROM contact_messages';
  const conditions = [];
  const params = [];

  if (status && status !== 'All') {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ? OR phone LIKE ?)');
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern, pattern, pattern);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  sql += ' ORDER BY created_at DESC';

  const result = await env.DB.prepare(sql)
    .bind(...params)
    .all();

  const inquiries = (result.results || []).map(mapContactRow);
  return successResponse({ inquiries, messages: inquiries }, 'Contact messages fetched.');
}

export async function getContactMessageById(request, env, id) {
  const row = await env.DB.prepare('SELECT * FROM contact_messages WHERE id = ?').bind(id).first();
  if (!row) {
    return errorResponse('Contact message not found.', 404, 'NOT_FOUND');
  }
  const inquiry = mapContactRow(row);
  return successResponse({ inquiry, message: inquiry }, 'Contact message fetched.');
}

export async function updateContactMessage(request, env, admin, id) {
  const existing = await env.DB.prepare('SELECT * FROM contact_messages WHERE id = ?').bind(id).first();
  if (!existing) {
    return errorResponse('Contact message not found.', 404, 'NOT_FOUND');
  }

  const body = await parseJsonBody(request);
  const validation = validateContactUpdate(body);
  if (!validation.isValid) {
    return errorResponse('Invalid contact message update.', 400, 'VALIDATION_ERROR', validation.errors);
  }

  const status = validation.data.status !== undefined ? validation.data.status : existing.status;
  const adminNotes =
    validation.data.adminNotes !== undefined ? validation.data.adminNotes : existing.admin_notes;
  const now = new Date().toISOString();

  await env.DB.prepare(
    'UPDATE contact_messages SET status = ?, admin_notes = ?, updated_at = ? WHERE id = ?'
  )
    .bind(status, adminNotes, now, id)
    .run();

  const updatedRow = await env.DB.prepare('SELECT * FROM contact_messages WHERE id = ?').bind(id).first();
  const inquiry = mapContactRow(updatedRow);

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'UPDATE_CONTACT_MESSAGE',
    entityType: 'ContactMessage',
    entityId: id,
    details: `Updated contact message from ${existing.name} (Status: ${status})`,
    request,
  });

  return successResponse({ inquiry, message: inquiry }, 'Contact message updated.');
}

export async function deleteContactMessage(request, env, admin, id) {
  const existing = await env.DB.prepare('SELECT * FROM contact_messages WHERE id = ?').bind(id).first();
  if (!existing) {
    return errorResponse('Contact message not found.', 404, 'NOT_FOUND');
  }

  await env.DB.prepare('DELETE FROM contact_messages WHERE id = ?').bind(id).run();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'DELETE_CONTACT_MESSAGE',
    entityType: 'ContactMessage',
    entityId: id,
    details: `Deleted contact message from ${existing.name} (${existing.subject})`,
    request,
  });

  return successResponse({ deletedId: id }, 'Contact message deleted.');
}
