import { generateRandomId } from '../utils/crypto.js';
import { successResponse, errorResponse, parseJsonBody, safeJsonParse } from '../utils/response.js';
import { validatePortfolioInput, slugifyText } from '../validators/schemas.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';
import { logAdminActivity } from '../services/auditService.js';
import { uploadImageToR2, deleteImageFromR2 } from '../services/storageService.js';

export function mapPortfolioRow(row) {
  if (!row) return null;
  const isPublished = Boolean(row.is_published);
  const isFeatured = Boolean(row.is_featured);
  const isSample = Boolean(row.is_sample);
  const displayOrder = Number(row.display_order || 0);
  const images = safeJsonParse(row.images, [row.thumbnail].filter(Boolean));
  return {
    id: row.id,
    project_title: row.project_title,
    projectTitle: row.project_title,
    title: row.project_title,
    slug: row.slug,
    short_overview: row.short_overview || row.description,
    shortOverview: row.short_overview || row.description,
    description: row.description,
    problem_addressed: row.problem_addressed || '',
    problemAddressed: row.problem_addressed || '',
    solution_implemented: row.solution_implemented || '',
    solutionImplemented: row.solution_implemented || '',
    category: row.category,
    thumbnail: row.thumbnail,
    coverImage: row.thumbnail,
    images,
    gallery: images,
    key_features: safeJsonParse(row.key_features, []),
    keyFeatures: safeJsonParse(row.key_features, []),
    technologies: safeJsonParse(row.technologies, []),
    project_url: row.project_url || '',
    projectUrl: row.project_url || '',
    liveUrl: row.project_url || '',
    github_url: row.github_url || '',
    githubUrl: row.github_url || '',
    demo_video_url: row.demo_video_url || '',
    demoVideoUrl: row.demo_video_url || '',
    status: row.status || 'Completed',
    completion_date: row.completion_date || '',
    completionDate: row.completion_date || '',
    is_sample: isSample,
    isSample,
    is_published: isPublished,
    isPublished,
    published: isPublished,
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

export async function listPortfolio(request, env) {
  const url = new URL(request.url);
  const includeDrafts =
    url.searchParams.get('includeDrafts') === 'true' ||
    url.searchParams.get('all') === 'true';
  const category = url.searchParams.get('category');
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '50', 10) || 50));
  const offset = (page - 1) * limit;

  let showAll = false;
  if (includeDrafts) {
    const auth = await authenticateAdmin(request, env);
    if (auth.authenticated) {
      showAll = true;
    }
  }

  const conditions = [];
  const params = [];

  if (!showAll) {
    conditions.push('is_published = 1');
  }
  if (category && category !== 'All') {
    conditions.push('category = ?');
    params.push(category);
  }

  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
  const countRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM portfolio${whereClause}`)
    .bind(...params)
    .first();
  const total = Number(countRow?.total || 0);

  const sql = `SELECT * FROM portfolio${whereClause} ORDER BY display_order ASC, created_at DESC LIMIT ? OFFSET ?`;
  const result = await env.DB.prepare(sql)
    .bind(...params, limit, offset)
    .all();

  const portfolio = (result.results || []).map(mapPortfolioRow);
  return successResponse(
    {
      portfolio,
      projects: portfolio,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    },
    'Portfolio projects fetched successfully.'
  );
}

export async function getPortfolioBySlugOrId(request, env, slugOrId) {
  const row = await env.DB.prepare(
    'SELECT * FROM portfolio WHERE slug = ? OR id = ? LIMIT 1'
  )
    .bind(slugOrId, slugOrId)
    .first();

  if (!row) {
    return errorResponse('Portfolio project not found.', 404, 'NOT_FOUND');
  }

  if (!row.is_published) {
    const auth = await authenticateAdmin(request, env);
    if (!auth.authenticated) {
      return errorResponse('Portfolio project not found.', 404, 'NOT_FOUND');
    }
  }

  return successResponse({ project: mapPortfolioRow(row) }, 'Portfolio project fetched successfully.');
}

export async function createPortfolioProject(request, env, admin) {
  const body = await parseJsonBody(request);
  const normalizedBody = {
    ...body,
    projectTitle: body.projectTitle ?? body.project_title ?? body.title,
    shortOverview: body.shortOverview ?? body.short_overview,
    problemAddressed: body.problemAddressed ?? body.problem_addressed,
    solutionImplemented: body.solutionImplemented ?? body.solution_implemented,
    thumbnail: body.thumbnail ?? body.coverImage ?? body.cover_image,
    images: body.images ?? body.gallery ?? body.galleryImages,
    keyFeatures: body.keyFeatures ?? body.key_features,
    projectUrl: body.projectUrl ?? body.project_url ?? body.liveUrl,
    githubUrl: body.githubUrl ?? body.github_url,
    demoVideoUrl: body.demoVideoUrl ?? body.demo_video_url,
    completionDate: body.completionDate ?? body.completion_date,
    isSample: body.isSample ?? body.is_sample,
    isPublished: body.isPublished ?? body.is_published ?? body.published,
    isFeatured: body.isFeatured ?? body.is_featured ?? body.featured,
    displayOrder: body.displayOrder ?? body.display_order,
  };
  const validation = validatePortfolioInput(normalizedBody, false);
  if (!validation.isValid) {
    return errorResponse('Portfolio project validation failed.', 400, 'VALIDATION_ERROR', validation.errors);
  }

  const d = validation.data;
  const id = generateRandomId('proj');
  let slug = d.slug || `project-${Date.now()}`;

  const existingSlug = await env.DB.prepare('SELECT id FROM portfolio WHERE slug = ?')
    .bind(slug)
    .first();
  if (existingSlug) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO portfolio
     (id, project_title, slug, short_overview, description, problem_addressed, solution_implemented, category, thumbnail, images, key_features, technologies, project_url, github_url, demo_video_url, status, completion_date, is_sample, is_published, is_featured, display_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      d.projectTitle,
      slug,
      d.shortOverview,
      d.description,
      d.problemAddressed,
      d.solutionImplemented,
      d.category,
      d.thumbnail,
      JSON.stringify(d.images),
      JSON.stringify(d.keyFeatures),
      JSON.stringify(d.technologies),
      d.projectUrl,
      d.githubUrl,
      d.demoVideoUrl,
      d.status,
      d.completionDate,
      d.isSample ? 1 : 0,
      d.isPublished ? 1 : 0,
      d.isFeatured ? 1 : 0,
      d.displayOrder,
      now,
      now
    )
    .run();

  const created = await env.DB.prepare('SELECT * FROM portfolio WHERE id = ?').bind(id).first();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'CREATE_PORTFOLIO_PROJECT',
    entityType: 'Portfolio',
    entityId: id,
    details: `Created portfolio project "${d.projectTitle}"`,
    request,
  });

  return successResponse({ project: mapPortfolioRow(created) }, 'Portfolio project created.', 201);
}

export async function updatePortfolioProject(request, env, admin, id) {
  const existing = await env.DB.prepare('SELECT * FROM portfolio WHERE id = ?').bind(id).first();
  if (!existing) {
    return errorResponse('Portfolio project not found.', 404, 'NOT_FOUND');
  }

  const body = await parseJsonBody(request);
  const current = mapPortfolioRow(existing);
  const merged = {
    ...current,
    ...body,
    projectTitle:
      body.projectTitle !== undefined
        ? body.projectTitle
        : body.project_title !== undefined
        ? body.project_title
        : body.title !== undefined
        ? body.title
        : current.projectTitle,
    shortOverview: body.shortOverview ?? body.short_overview ?? current.shortOverview,
    problemAddressed: body.problemAddressed ?? body.problem_addressed ?? current.problemAddressed,
    solutionImplemented:
      body.solutionImplemented ?? body.solution_implemented ?? current.solutionImplemented,
    thumbnail:
      body.thumbnail !== undefined
        ? body.thumbnail
        : body.coverImage !== undefined
        ? body.coverImage
        : body.cover_image !== undefined
        ? body.cover_image
        : current.thumbnail,
    images:
      body.images !== undefined
        ? body.images
        : body.gallery !== undefined
        ? body.gallery
        : body.galleryImages !== undefined
        ? body.galleryImages
        : current.images,
    keyFeatures: body.keyFeatures ?? body.key_features ?? current.keyFeatures,
    projectUrl:
      body.projectUrl !== undefined
        ? body.projectUrl
        : body.project_url !== undefined
        ? body.project_url
        : body.liveUrl !== undefined
        ? body.liveUrl
        : current.projectUrl,
    githubUrl: body.githubUrl ?? body.github_url ?? current.githubUrl,
    demoVideoUrl: body.demoVideoUrl ?? body.demo_video_url ?? current.demoVideoUrl,
    completionDate: body.completionDate ?? body.completion_date ?? current.completionDate,
    isSample: body.isSample ?? body.is_sample ?? current.isSample,
    isPublished:
      body.isPublished !== undefined
        ? body.isPublished
        : body.is_published !== undefined
        ? body.is_published
        : body.published !== undefined
        ? body.published
        : current.isPublished,
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

  const validation = validatePortfolioInput(merged, true);
  if (!validation.isValid) {
    return errorResponse('Portfolio project validation failed.', 400, 'VALIDATION_ERROR', validation.errors);
  }

  const d = validation.data;
  let slug = body.slug ? slugifyText(body.slug) : existing.slug;
  const slugConflict = await env.DB.prepare('SELECT id FROM portfolio WHERE slug = ? AND id != ?')
    .bind(slug, id)
    .first();
  if (slugConflict) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // If thumbnail was replaced and the old thumbnail was an R2 upload, clean it up
  if (
    existing.thumbnail &&
    existing.thumbnail !== d.thumbnail &&
    String(existing.thumbnail).startsWith('/api/v1/uploads/')
  ) {
    await deleteImageFromR2(env, existing.thumbnail).catch(() => {});
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE portfolio SET
       project_title = ?, slug = ?, short_overview = ?, description = ?,
       problem_addressed = ?, solution_implemented = ?, category = ?,
       thumbnail = ?, images = ?, key_features = ?, technologies = ?,
       project_url = ?, github_url = ?, demo_video_url = ?, status = ?,
       completion_date = ?, is_sample = ?, is_published = ?, is_featured = ?,
       display_order = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind(
      d.projectTitle,
      slug,
      d.shortOverview,
      d.description,
      d.problemAddressed,
      d.solutionImplemented,
      d.category,
      d.thumbnail,
      JSON.stringify(d.images),
      JSON.stringify(d.keyFeatures),
      JSON.stringify(d.technologies),
      d.projectUrl,
      d.githubUrl,
      d.demoVideoUrl,
      d.status,
      d.completionDate,
      d.isSample ? 1 : 0,
      d.isPublished ? 1 : 0,
      d.isFeatured ? 1 : 0,
      d.displayOrder,
      now,
      id
    )
    .run();

  const updated = await env.DB.prepare('SELECT * FROM portfolio WHERE id = ?').bind(id).first();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'UPDATE_PORTFOLIO_PROJECT',
    entityType: 'Portfolio',
    entityId: id,
    details: `Updated portfolio project "${d.projectTitle}" (Published: ${d.isPublished})`,
    request,
  });

  return successResponse({ project: mapPortfolioRow(updated) }, 'Portfolio project updated.');
}

export async function deletePortfolioProject(request, env, admin, id) {
  const existing = await env.DB.prepare('SELECT * FROM portfolio WHERE id = ?').bind(id).first();
  if (!existing) {
    return errorResponse('Portfolio project not found.', 404, 'NOT_FOUND');
  }

  if (existing.thumbnail && String(existing.thumbnail).startsWith('/api/v1/uploads/')) {
    await deleteImageFromR2(env, existing.thumbnail).catch(() => {});
  }
  const gallery = safeJsonParse(existing.images, []);
  for (const imgUrl of gallery) {
    if (typeof imgUrl === 'string' && imgUrl.startsWith('/api/v1/uploads/')) {
      await deleteImageFromR2(env, imgUrl).catch(() => {});
    }
  }

  await env.DB.prepare('DELETE FROM portfolio WHERE id = ?').bind(id).run();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'DELETE_PORTFOLIO_PROJECT',
    entityType: 'Portfolio',
    entityId: id,
    details: `Deleted portfolio project "${existing.project_title}"`,
    request,
  });

  return successResponse({ deletedId: id }, 'Portfolio project deleted.');
}

export async function uploadPortfolioImage(request, env, admin) {
  const uploaded = await uploadImageToR2(request, env, 'portfolio');

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'UPLOAD_PORTFOLIO_IMAGE',
    entityType: 'PortfolioAsset',
    entityId: uploaded.key,
    details: `Uploaded image (${uploaded.mimeType}, ${uploaded.sizeBytes} bytes) to R2`,
    request,
  });

  return successResponse({ ...uploaded, asset: uploaded }, 'Image uploaded to R2 storage.', 201);
}

export async function deletePortfolioImage(request, env, admin, key) {
  let targetKey = key;
  if (!targetKey) {
    const body = await parseJsonBody(request).catch(() => ({}));
    targetKey = body.key || body.url || '';
  }
  await deleteImageFromR2(env, targetKey);

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'DELETE_PORTFOLIO_IMAGE',
    entityType: 'PortfolioAsset',
    entityId: targetKey,
    details: `Deleted image ${targetKey} from R2 storage`,
    request,
  });

  return successResponse({ deletedKey: targetKey }, 'Image removed from R2 storage.');
}
