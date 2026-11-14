import { generateRandomId } from '../utils/crypto.js';
import {
  successResponse,
  errorResponse,
  parseJsonBody,
  safeJsonParse,
  sanitizeText,
} from '../utils/response.js';
import { logAdminActivity } from '../services/auditService.js';
import { mapServiceRow } from './servicesController.js';
import { mapPackageRow } from './packagesController.js';
import { mapPortfolioRow } from './portfolioController.js';

const FORBIDDEN_SECRET_KEYS = [
  'jwtSecret',
  'jwt_secret',
  'apiKey',
  'api_key',
  'resendApiKey',
  'resend_api_key',
  'passwordHash',
  'password_hash',
  'databaseSecret',
  'privateKey',
];

function stripSensitiveSettings(settingsObj = {}) {
  if (!settingsObj || typeof settingsObj !== 'object') return {};
  const cleaned = { ...settingsObj };
  for (const key of Object.keys(cleaned)) {
    if (
      FORBIDDEN_SECRET_KEYS.includes(key) ||
      /secret|password|private_key|api_key/i.test(key)
    ) {
      delete cleaned[key];
    }
  }
  return cleaned;
}

export async function getSiteSettings(request, env) {
  const row = await env.DB.prepare(
    'SELECT setting_value, updated_at FROM site_settings WHERE setting_key = ?'
  )
    .bind('general')
    .first();

  const rawSettings = safeJsonParse(row?.setting_value, {});
  const settings = stripSensitiveSettings(rawSettings);
  return successResponse({ settings }, 'Site settings fetched.');
}

export async function updateSiteSettings(request, env, admin) {
  const body = await parseJsonBody(request);
  const existingRow = await env.DB.prepare(
    'SELECT setting_value FROM site_settings WHERE setting_key = ?'
  )
    .bind('general')
    .first();

  const currentSettings = safeJsonParse(existingRow?.setting_value, {});
  const nextSettings = stripSensitiveSettings({
    ...currentSettings,
    ...body,
  });

  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO site_settings (setting_key, setting_value, updated_at, updated_by_admin_id)
     VALUES ('general', ?, ?, ?)
     ON CONFLICT(setting_key) DO UPDATE SET
       setting_value = excluded.setting_value,
       updated_at = excluded.updated_at,
       updated_by_admin_id = excluded.updated_by_admin_id`
  )
    .bind(JSON.stringify(nextSettings), now, admin.id)
    .run();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'UPDATE_SITE_SETTINGS',
    entityType: 'SiteSettings',
    entityId: 'general',
    details: 'Updated website settings and contact configuration',
    request,
  });

  return successResponse({ settings: nextSettings }, 'Website settings updated successfully.');
}

async function readSettingArray(env, key) {
  const row = await env.DB.prepare(
    'SELECT setting_value FROM site_settings WHERE setting_key = ?'
  )
    .bind(key)
    .first();
  const parsed = safeJsonParse(row?.setting_value, []);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeSettingArray(env, key, arr, adminId) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO site_settings (setting_key, setting_value, updated_at, updated_by_admin_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(setting_key) DO UPDATE SET
       setting_value = excluded.setting_value,
       updated_at = excluded.updated_at,
       updated_by_admin_id = excluded.updated_by_admin_id`
  )
    .bind(key, JSON.stringify(arr), now, adminId || null)
    .run();
}

export async function listTeamMembers(request, env) {
  const team = await readSettingArray(env, 'team_members');
  team.sort((a, b) => Number(a.sortOrder || 1) - Number(b.sortOrder || 1));
  return successResponse({ team }, 'Team members fetched.');
}

export async function createTeamMember(request, env, admin) {
  const body = await parseJsonBody(request);
  const fullName = sanitizeText(body.fullName ?? body.full_name, 160);
  if (!fullName || fullName.length < 2) {
    return errorResponse('Team member full name is required.', 400, 'VALIDATION_ERROR');
  }

  const team = await readSettingArray(env, 'team_members');
  const maxOrder = team.reduce((max, m) => Math.max(max, Number(m.sortOrder || 0)), 0);
  const now = new Date().toISOString();
  const id = generateRandomId('team');
  const initials =
    sanitizeText(body.initials, 6) ||
    fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');

  const member = {
    id,
    fullName,
    role: sanitizeText(body.role || 'Full-Stack Web Developer', 120),
    title: sanitizeText(body.title || '', 200),
    bio: sanitizeText(body.bio || '', 1500),
    skills: Array.isArray(body.skills) ? body.skills : [],
    technologies: Array.isArray(body.technologies) ? body.technologies : [],
    avatarUrl: sanitizeText(body.avatarUrl || '', 2000),
    initials,
    linkedinUrl: sanitizeText(body.linkedinUrl || '', 500),
    githubUrl: sanitizeText(body.githubUrl || '', 500),
    websiteUrl: sanitizeText(body.websiteUrl || '', 500),
    visible: body.visible !== false,
    isPlaceholder: Boolean(body.isPlaceholder),
    sortOrder: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };

  team.push(member);
  await writeSettingArray(env, 'team_members', team, admin.id);

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'CREATE_TEAM_MEMBER',
    entityType: 'TeamMember',
    entityId: id,
    details: `Added team member "${fullName}"`,
    request,
  });

  return successResponse({ member }, 'Team profile created.', 201);
}

export async function updateTeamMember(request, env, admin, id) {
  const team = await readSettingArray(env, 'team_members');
  const idx = team.findIndex((m) => m.id === id);
  if (idx < 0) {
    return errorResponse('Team member not found.', 404, 'NOT_FOUND');
  }

  const body = await parseJsonBody(request);
  const now = new Date().toISOString();
  const updated = {
    ...team[idx],
    ...body,
    id,
    updatedAt: now,
  };
  team[idx] = updated;
  await writeSettingArray(env, 'team_members', team, admin.id);

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'UPDATE_TEAM_MEMBER',
    entityType: 'TeamMember',
    entityId: id,
    details: `Updated team member "${updated.fullName}"`,
    request,
  });

  return successResponse({ member: updated }, 'Team member updated.');
}

export async function deleteTeamMember(request, env, admin, id) {
  const team = await readSettingArray(env, 'team_members');
  const existing = team.find((m) => m.id === id);
  if (!existing) {
    return errorResponse('Team member not found.', 404, 'NOT_FOUND');
  }

  const filtered = team.filter((m) => m.id !== id);
  await writeSettingArray(env, 'team_members', filtered, admin.id);

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'DELETE_TEAM_MEMBER',
    entityType: 'TeamMember',
    entityId: id,
    details: `Removed team member "${existing.fullName}"`,
    request,
  });

  return successResponse({ deletedId: id }, 'Team member removed.');
}

export async function reorderTeamMember(request, env, admin, id) {
  const body = await parseJsonBody(request);
  const direction = body.direction === 'up' ? 'up' : 'down';

  const team = await readSettingArray(env, 'team_members');
  team.sort((a, b) => Number(a.sortOrder || 1) - Number(b.sortOrder || 1));
  const idx = team.findIndex((m) => m.id === id);
  if (idx < 0) {
    return errorResponse('Team member not found.', 404, 'NOT_FOUND');
  }

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx >= 0 && targetIdx < team.length) {
    const [moved] = team.splice(idx, 1);
    team.splice(targetIdx, 0, moved);
    const now = new Date().toISOString();
    team.forEach((m, i) => {
      m.sortOrder = i + 1;
      m.updatedAt = now;
    });
    await writeSettingArray(env, 'team_members', team, admin.id);
  }

  return successResponse({ team }, 'Team reordered.');
}

export async function listTestimonials(request, env) {
  const testimonials = await readSettingArray(env, 'testimonials');
  return successResponse({ testimonials }, 'Testimonials fetched.');
}

export async function createTestimonial(request, env, admin) {
  const body = await parseJsonBody(request);
  const clientName = sanitizeText(body.clientName ?? body.client_name, 160);
  const quote = sanitizeText(body.quote, 2000);
  if (!clientName || !quote) {
    return errorResponse('Client name and testimonial quote are required.', 400, 'VALIDATION_ERROR');
  }

  const testimonials = await readSettingArray(env, 'testimonials');
  const id = generateRandomId('testi');
  const now = new Date().toISOString();
  const testimonial = {
    id,
    clientName,
    clientRole: sanitizeText(body.clientRole || '', 120),
    companyName: sanitizeText(body.companyName || '', 160),
    quote,
    rating: Math.min(5, Math.max(1, Number(body.rating || 5))),
    projectSlug: sanitizeText(body.projectSlug || '', 160),
    isApproved: body.isApproved !== false,
    displayOrder: Number(body.displayOrder || testimonials.length + 1),
    createdAt: now,
  };

  testimonials.push(testimonial);
  await writeSettingArray(env, 'testimonials', testimonials, admin.id);

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'CREATE_TESTIMONIAL',
    entityType: 'Testimonial',
    entityId: id,
    details: `Added testimonial from ${clientName}`,
    request,
  });

  return successResponse({ testimonial }, 'Testimonial created.', 201);
}

export async function deleteTestimonial(request, env, admin, id) {
  const testimonials = await readSettingArray(env, 'testimonials');
  const filtered = testimonials.filter((t) => t.id !== id);
  await writeSettingArray(env, 'testimonials', filtered, admin.id);

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'DELETE_TESTIMONIAL',
    entityType: 'Testimonial',
    entityId: id,
    details: `Deleted testimonial ${id}`,
    request,
  });
  return successResponse({ deletedId: id }, 'Testimonial deleted.');
}

/**
 * Public Bootstrap Endpoint: returns all public website catalog & configuration data in one fast query.
 */
export async function getPublicBootstrap(request, env) {
  const [servicesRes, packagesRes, portfolioRes, settingsRows] = await Promise.all([
    env.DB.prepare('SELECT * FROM services ORDER BY display_order ASC, created_at ASC').all(),
    env.DB.prepare('SELECT * FROM packages ORDER BY display_order ASC, created_at ASC').all(),
    env.DB.prepare('SELECT * FROM portfolio ORDER BY display_order ASC, created_at DESC').all(),
    env.DB.prepare('SELECT setting_key, setting_value FROM site_settings').all(),
  ]);

  const settingsMap = {};
  for (const r of settingsRows.results || []) {
    settingsMap[r.setting_key] = safeJsonParse(r.setting_value, {});
  }

  return successResponse(
    {
      services: (servicesRes.results || []).map(mapServiceRow),
      packages: (packagesRes.results || []).map(mapPackageRow),
      portfolio: (portfolioRes.results || []).map(mapPortfolioRow),
      team: Array.isArray(settingsMap.team_members) ? settingsMap.team_members : [],
      testimonials: Array.isArray(settingsMap.testimonials) ? settingsMap.testimonials : [],
      settings: stripSensitiveSettings(settingsMap.general || {}),
      addons: Array.isArray(settingsMap.addons) ? settingsMap.addons : [],
      maintenancePlans: Array.isArray(settingsMap.maintenance_plans)
        ? settingsMap.maintenance_plans
        : [],
    },
    'Public site bootstrap data loaded.'
  );
}
