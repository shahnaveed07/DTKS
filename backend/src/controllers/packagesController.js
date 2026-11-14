import { generateRandomId } from '../utils/crypto.js';
import { successResponse, errorResponse, parseJsonBody, safeJsonParse } from '../utils/response.js';
import { validatePackageInput } from '../validators/schemas.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';
import { logAdminActivity } from '../services/auditService.js';

export function mapPackageRow(row) {
  if (!row) return null;
  const price = row.price !== null && row.price !== undefined ? Number(row.price) : null;
  const isActive = Boolean(row.is_active);
  const isFeatured = Boolean(row.is_featured);
  const displayOrder = Number(row.display_order || 0);
  return {
    id: row.id,
    name: row.name,
    title: row.name,
    category: row.category || 'Business & Corporate Websites',
    description: row.description,
    price,
    startingPrice: price,
    currency: row.currency || 'INR',
    pages_count: row.pages_count || '',
    pagesCount: row.pages_count || '',
    features: safeJsonParse(row.features, []),
    revisions: row.revisions || '2 Design Revision Rounds',
    delivery_estimate: row.delivery_estimate || '2–3 Weeks',
    deliveryEstimate: row.delivery_estimate || '2–3 Weeks',
    support_duration: row.support_duration || '30 Days Post-Launch Bug Support',
    supportDuration: row.support_duration || '30 Days Post-Launch Bug Support',
    hosting_option: row.hosting_option || 'Customer-Managed or Quoted Separately',
    hostingOption: row.hosting_option || 'Customer-Managed or Quoted Separately',
    maintenance_option: row.maintenance_option || 'Optional Maintenance Plan',
    maintenanceOption: row.maintenance_option || 'Optional Maintenance Plan',
    add_ons: safeJsonParse(row.add_ons, []),
    addOns: safeJsonParse(row.add_ons, []),
    service_id: row.service_id || null,
    serviceId: row.service_id || null,
    is_active: isActive,
    isActive,
    active: isActive,
    is_featured: isFeatured,
    isFeatured,
    featured: isFeatured,
    display_order: displayOrder,
    displayOrder,
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
  };
}

export async function listPackages(request, env) {
  const url = new URL(request.url);
  const includeInactive =
    url.searchParams.get('includeInactive') === 'true' ||
    url.searchParams.get('all') === 'true';
  const serviceId = url.searchParams.get('service_id') || url.searchParams.get('serviceId');
  const category = url.searchParams.get('category') || url.searchParams.get('service');

  let showAll = false;
  if (includeInactive) {
    const auth = await authenticateAdmin(request, env);
    if (auth.authenticated) {
      showAll = true;
    }
  }

  let sql = 'SELECT * FROM packages';
  const conditions = [];
  const params = [];

  if (!showAll) {
    conditions.push('is_active = 1');
  }
  if (serviceId) {
    conditions.push('service_id = ?');
    params.push(serviceId);
  }
  if (category && category !== 'All') {
    conditions.push('lower(category) = lower(?)');
    params.push(category);
  }
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  sql += ' ORDER BY display_order ASC, created_at ASC';

  const result = await env.DB.prepare(sql)
    .bind(...params)
    .all();
  const packages = (result.results || []).map(mapPackageRow);

  // Also include maintenance plans and add-ons from site_settings
  const maintRow = await env.DB.prepare(
    "SELECT setting_value FROM site_settings WHERE setting_key = 'maintenance_plans'"
  ).first();
  const addonsRow = await env.DB.prepare(
    "SELECT setting_value FROM site_settings WHERE setting_key = 'addons'"
  ).first();

  return successResponse(
    {
      packages,
      maintenancePlans: safeJsonParse(maintRow?.setting_value, []),
      addons: safeJsonParse(addonsRow?.setting_value, []),
    },
    'Packages fetched successfully.'
  );
}

export async function getPackageById(request, env, id) {
  const row = await env.DB.prepare('SELECT * FROM packages WHERE id = ? LIMIT 1')
    .bind(id)
    .first();

  if (!row) {
    return errorResponse('Package not found.', 404, 'NOT_FOUND');
  }

  if (!row.is_active) {
    const auth = await authenticateAdmin(request, env);
    if (!auth.authenticated) {
      return errorResponse('Package not found.', 404, 'NOT_FOUND');
    }
  }

  return successResponse({ package: mapPackageRow(row) }, 'Package fetched successfully.');
}

export async function createPackage(request, env, admin) {
  const body = await parseJsonBody(request);
  const normalizedBody = {
    ...body,
    pagesCount: body.pagesCount ?? body.pages_count,
    deliveryEstimate: body.deliveryEstimate ?? body.delivery_estimate,
    supportDuration: body.supportDuration ?? body.support_duration,
    hostingOption: body.hostingOption ?? body.hosting_option,
    maintenanceOption: body.maintenanceOption ?? body.maintenance_option,
    addOns: body.addOns ?? body.add_ons,
    serviceId: body.serviceId ?? body.service_id,
    isActive: body.isActive ?? body.is_active ?? body.active,
    isFeatured: body.isFeatured ?? body.is_featured ?? body.featured,
    displayOrder: body.displayOrder ?? body.display_order,
  };

  const validation = validatePackageInput(normalizedBody, false);
  if (!validation.isValid) {
    return errorResponse('Package validation failed.', 400, 'VALIDATION_ERROR', validation.errors);
  }

  const d = validation.data;
  const id = generateRandomId('pkg');
  const now = new Date().toISOString();

  let validServiceId = null;
  if (d.serviceId) {
    const svc = await env.DB.prepare('SELECT id FROM services WHERE id = ?')
      .bind(d.serviceId)
      .first();
    if (svc) validServiceId = svc.id;
  }

  await env.DB.prepare(
    `INSERT INTO packages
     (id, name, category, description, price, currency, pages_count, features, revisions, delivery_estimate, support_duration, hosting_option, maintenance_option, add_ons, service_id, is_active, is_featured, display_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      d.name,
      d.category,
      d.description,
      d.price,
      d.currency,
      d.pagesCount,
      JSON.stringify(d.features),
      d.revisions,
      d.deliveryEstimate,
      d.supportDuration,
      d.hostingOption,
      d.maintenanceOption,
      JSON.stringify(d.addOns),
      validServiceId,
      d.isActive ? 1 : 0,
      d.isFeatured ? 1 : 0,
      d.displayOrder,
      now,
      now
    )
    .run();

  const created = await env.DB.prepare('SELECT * FROM packages WHERE id = ?').bind(id).first();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'CREATE_PACKAGE',
    entityType: 'Package',
    entityId: id,
    details: `Created package "${d.name}"`,
    request,
  });

  return successResponse({ package: mapPackageRow(created) }, 'Package created successfully.', 201);
}

export async function updatePackage(request, env, admin, id) {
  const existing = await env.DB.prepare('SELECT * FROM packages WHERE id = ?').bind(id).first();
  if (!existing) {
    return errorResponse('Package not found.', 404, 'NOT_FOUND');
  }

  const body = await parseJsonBody(request);
  const current = mapPackageRow(existing);
  const merged = {
    ...current,
    ...body,
    name: body.name !== undefined ? body.name : body.title !== undefined ? body.title : current.name,
    price:
      body.price !== undefined
        ? body.price
        : body.startingPrice !== undefined
        ? body.startingPrice
        : current.price,
    pagesCount: body.pagesCount ?? body.pages_count ?? current.pagesCount,
    deliveryEstimate: body.deliveryEstimate ?? body.delivery_estimate ?? current.deliveryEstimate,
    supportDuration: body.supportDuration ?? body.support_duration ?? current.supportDuration,
    hostingOption: body.hostingOption ?? body.hosting_option ?? current.hostingOption,
    maintenanceOption: body.maintenanceOption ?? body.maintenance_option ?? current.maintenanceOption,
    addOns: body.addOns ?? body.add_ons ?? current.addOns,
    serviceId: body.serviceId !== undefined ? body.serviceId : body.service_id !== undefined ? body.service_id : current.serviceId,
    isActive:
      body.isActive !== undefined
        ? body.isActive
        : body.is_active !== undefined
        ? body.is_active
        : body.active !== undefined
        ? body.active
        : current.isActive,
    isFeatured:
      body.isFeatured !== undefined
        ? body.isFeatured
        : body.is_featured !== undefined
        ? body.is_featured
        : body.featured !== undefined
        ? body.featured
        : current.isFeatured,
    displayOrder: body.displayOrder ?? body.display_order ?? current.displayOrder,
  };

  const validation = validatePackageInput(merged, true);
  if (!validation.isValid) {
    return errorResponse('Package validation failed.', 400, 'VALIDATION_ERROR', validation.errors);
  }

  const d = validation.data;
  const now = new Date().toISOString();

  let validServiceId = null;
  if (d.serviceId) {
    const svc = await env.DB.prepare('SELECT id FROM services WHERE id = ?')
      .bind(d.serviceId)
      .first();
    if (svc) validServiceId = svc.id;
  }

  await env.DB.prepare(
    `UPDATE packages SET
       name = ?, category = ?, description = ?, price = ?, currency = ?, pages_count = ?,
       features = ?, revisions = ?, delivery_estimate = ?, support_duration = ?,
       hosting_option = ?, maintenance_option = ?, add_ons = ?, service_id = ?,
       is_active = ?, is_featured = ?, display_order = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind(
      d.name,
      d.category,
      d.description,
      d.price,
      d.currency,
      d.pagesCount,
      JSON.stringify(d.features),
      d.revisions,
      d.deliveryEstimate,
      d.supportDuration,
      d.hostingOption,
      d.maintenanceOption,
      JSON.stringify(d.addOns),
      validServiceId,
      d.isActive ? 1 : 0,
      d.isFeatured ? 1 : 0,
      d.displayOrder,
      now,
      id
    )
    .run();

  const updated = await env.DB.prepare('SELECT * FROM packages WHERE id = ?').bind(id).first();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'UPDATE_PACKAGE',
    entityType: 'Package',
    entityId: id,
    details: `Updated package "${d.name}"`,
    request,
  });

  return successResponse({ package: mapPackageRow(updated) }, 'Package updated successfully.');
}

export async function deletePackage(request, env, admin, id) {
  const existing = await env.DB.prepare('SELECT * FROM packages WHERE id = ?').bind(id).first();
  if (!existing) {
    return errorResponse('Package not found.', 404, 'NOT_FOUND');
  }

  await env.DB.prepare('DELETE FROM packages WHERE id = ?').bind(id).run();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'DELETE_PACKAGE',
    entityType: 'Package',
    entityId: id,
    details: `Deleted package "${existing.name}"`,
    request,
  });

  return successResponse({ deletedId: id }, 'Package deleted successfully.');
}

export async function updateMaintenancePlansConfig(request, env, admin) {
  const body = await parseJsonBody(request);
  const plans = Array.isArray(body.maintenancePlans)
    ? body.maintenancePlans
    : Array.isArray(body)
    ? body
    : [];
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO site_settings (setting_key, setting_value, updated_at, updated_by_admin_id)
     VALUES ('maintenance_plans', ?, ?, ?)
     ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at, updated_by_admin_id = excluded.updated_by_admin_id`
  )
    .bind(JSON.stringify(plans), now, admin.id)
    .run();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'UPDATE_MAINTENANCE_PLANS',
    entityType: 'SiteSettings',
    entityId: 'maintenance_plans',
    details: 'Updated website maintenance plan pricing and configuration',
    request,
  });

  return successResponse({ maintenancePlans: plans }, 'Maintenance plans updated.');
}

export async function updateAddonsConfig(request, env, admin) {
  const body = await parseJsonBody(request);
  const addons = Array.isArray(body.addons) ? body.addons : Array.isArray(body) ? body : [];
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO site_settings (setting_key, setting_value, updated_at, updated_by_admin_id)
     VALUES ('addons', ?, ?, ?)
     ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at, updated_by_admin_id = excluded.updated_by_admin_id`
  )
    .bind(JSON.stringify(addons), now, admin.id)
    .run();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'UPDATE_ADDONS',
    entityType: 'SiteSettings',
    entityId: 'addons',
    details: 'Updated optional website add-ons configuration',
    request,
  });

  return successResponse({ addons }, 'Add-ons updated.');
}
