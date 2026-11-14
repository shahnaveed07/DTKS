import { generateRandomId } from '../utils/crypto.js';
import { successResponse, errorResponse, parseJsonBody, safeJsonParse } from '../utils/response.js';
import { validateServiceInput, slugifyText } from '../validators/schemas.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';
import { logAdminActivity } from '../services/auditService.js';

export function mapServiceRow(row) {
  if (!row) return null;
  const price = row.price !== null && row.price !== undefined ? Number(row.price) : null;
  const isActive = Boolean(row.is_active);
  const displayOrder = Number(row.display_order || 0);
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    order_category: row.order_category || row.title,
    orderCategory: row.order_category || row.title,
    short_description: row.short_description || row.description,
    shortDescription: row.short_description || row.description,
    description: row.description,
    features: safeJsonParse(row.features, []),
    technologies: safeJsonParse(row.technologies, []),
    suitable_for: safeJsonParse(row.suitable_for, []),
    suitableFor: safeJsonParse(row.suitable_for, []),
    image: row.image || '',
    icon_name: row.icon_name || 'Globe',
    iconName: row.icon_name || 'Globe',
    price,
    startingPrice: price,
    currency: row.currency || 'INR',
    is_active: isActive,
    isActive,
    active: isActive,
    display_order: displayOrder,
    displayOrder,
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
  };
}

export async function listServices(request, env) {
  const url = new URL(request.url);
  const includeInactive =
    url.searchParams.get('includeInactive') === 'true' ||
    url.searchParams.get('all') === 'true';

  let showAll = false;
  if (includeInactive) {
    const auth = await authenticateAdmin(request, env);
    if (auth.authenticated) {
      showAll = true;
    }
  }

  const query = showAll
    ? 'SELECT * FROM services ORDER BY display_order ASC, created_at ASC'
    : 'SELECT * FROM services WHERE is_active = 1 ORDER BY display_order ASC, created_at ASC';

  const result = await env.DB.prepare(query).all();
  const services = (result.results || []).map(mapServiceRow);

  return successResponse({ services }, 'Services fetched successfully.');
}

export async function getServiceBySlugOrId(request, env, slugOrId) {
  const row = await env.DB.prepare(
    'SELECT * FROM services WHERE slug = ? OR id = ? LIMIT 1'
  )
    .bind(slugOrId, slugOrId)
    .first();

  if (!row) {
    return errorResponse('Service not found.', 404, 'NOT_FOUND');
  }

  if (!row.is_active) {
    const auth = await authenticateAdmin(request, env);
    if (!auth.authenticated) {
      return errorResponse('Service not found.', 404, 'NOT_FOUND');
    }
  }

  return successResponse({ service: mapServiceRow(row) }, 'Service fetched successfully.');
}

export async function createService(request, env, admin) {
  const body = await parseJsonBody(request);
  const normalizedBody = {
    ...body,
    orderCategory: body.orderCategory ?? body.order_category ?? body.category,
    shortDescription: body.shortDescription ?? body.short_description,
    suitableFor: body.suitableFor ?? body.suitable_for,
    iconName: body.iconName ?? body.icon_name,
    isActive: body.isActive ?? body.is_active ?? body.active,
    displayOrder: body.displayOrder ?? body.display_order,
  };
  const validation = validateServiceInput(normalizedBody, false);
  if (!validation.isValid) {
    return errorResponse('Service validation failed.', 400, 'VALIDATION_ERROR', validation.errors);
  }

  const d = validation.data;
  const id =
    body.id && String(body.id).startsWith('svc-') ? String(body.id) : generateRandomId('svc');
  let slug = d.slug;

  const existingSlug = await env.DB.prepare('SELECT id FROM services WHERE slug = ?')
    .bind(slug)
    .first();
  if (existingSlug) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO services
     (id, title, slug, order_category, short_description, description, features, technologies, suitable_for, image, icon_name, price, currency, is_active, display_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      d.title,
      slug,
      d.orderCategory,
      d.shortDescription,
      d.description,
      JSON.stringify(d.features),
      JSON.stringify(d.technologies),
      JSON.stringify(d.suitableFor),
      d.image,
      d.iconName,
      d.price,
      d.currency,
      d.isActive ? 1 : 0,
      d.displayOrder,
      now,
      now
    )
    .run();

  const created = await env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(id).first();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'CREATE_SERVICE',
    entityType: 'Service',
    entityId: id,
    details: `Created service "${d.title}"`,
    request,
  });

  return successResponse({ service: mapServiceRow(created) }, 'Service created successfully.', 201);
}

export async function updateService(request, env, admin, id) {
  const existing = await env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(id).first();
  if (!existing) {
    return errorResponse('Service not found.', 404, 'NOT_FOUND');
  }

  const body = await parseJsonBody(request);
  const current = mapServiceRow(existing);
  const merged = {
    ...current,
    ...body,
    orderCategory:
      body.orderCategory ?? body.order_category ?? body.category ?? current.orderCategory,
    shortDescription:
      body.shortDescription ?? body.short_description ?? current.shortDescription,
    suitableFor: body.suitableFor ?? body.suitable_for ?? current.suitableFor,
    iconName: body.iconName ?? body.icon_name ?? current.iconName,
    price:
      body.price !== undefined
        ? body.price
        : body.startingPrice !== undefined
        ? body.startingPrice
        : current.price,
    isActive:
      body.isActive !== undefined
        ? body.isActive
        : body.is_active !== undefined
        ? body.is_active
        : body.active !== undefined
        ? body.active
        : current.isActive,
    displayOrder:
      body.displayOrder ?? body.display_order ?? current.displayOrder,
  };

  const validation = validateServiceInput(merged, true);
  if (!validation.isValid) {
    return errorResponse('Service validation failed.', 400, 'VALIDATION_ERROR', validation.errors);
  }

  const d = validation.data;
  let slug = body.slug ? slugifyText(body.slug) : existing.slug;
  const slugConflict = await env.DB.prepare('SELECT id FROM services WHERE slug = ? AND id != ?')
    .bind(slug, id)
    .first();
  if (slugConflict) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE services SET
       title = ?, slug = ?, order_category = ?, short_description = ?, description = ?,
       features = ?, technologies = ?, suitable_for = ?, image = ?, icon_name = ?,
       price = ?, currency = ?, is_active = ?, display_order = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind(
      d.title,
      slug,
      d.orderCategory,
      d.shortDescription,
      d.description,
      JSON.stringify(d.features),
      JSON.stringify(d.technologies),
      JSON.stringify(d.suitableFor),
      d.image,
      d.iconName,
      d.price,
      d.currency,
      d.isActive ? 1 : 0,
      d.displayOrder,
      now,
      id
    )
    .run();

  const updated = await env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(id).first();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'UPDATE_SERVICE',
    entityType: 'Service',
    entityId: id,
    details: `Updated service "${d.title}"`,
    request,
  });

  return successResponse({ service: mapServiceRow(updated) }, 'Service updated successfully.');
}

export async function deleteService(request, env, admin, id) {
  const existing = await env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(id).first();
  if (!existing) {
    return errorResponse('Service not found.', 404, 'NOT_FOUND');
  }

  await env.DB.prepare('DELETE FROM services WHERE id = ?').bind(id).run();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'DELETE_SERVICE',
    entityType: 'Service',
    entityId: id,
    details: `Deleted service "${existing.title}"`,
    request,
  });

  return successResponse({ deletedId: id }, 'Service deleted successfully.');
}
