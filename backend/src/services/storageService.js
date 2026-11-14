import { generateRandomId } from '../utils/crypto.js';
import { validateImageUpload } from '../validators/schemas.js';

const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function decodeBase64DataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(String(dataUrl).trim());
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { mimeType, bytes };
}

/**
 * Uploads a validated image to Cloudflare R2 (env.ASSETS_BUCKET) and returns the public path.
 * Supports both multipart/form-data File uploads and JSON { dataUrl, fileName } uploads.
 */
export async function uploadImageToR2(request, env, folder = 'portfolio') {
  if (!env.ASSETS_BUCKET) {
    const err = new Error('R2 Storage bucket binding (ASSETS_BUCKET) is not configured.');
    err.status = 500;
    err.code = 'STORAGE_UNAVAILABLE';
    throw err;
  }

  const contentType = request.headers.get('content-type') || '';
  let mimeType = '';
  let bytes = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file') || formData.get('image');
    if (!file || typeof file.arrayBuffer !== 'function') {
      const err = new Error('No image file found in multipart upload.');
      err.status = 400;
      err.code = 'MISSING_FILE';
      throw err;
    }
    mimeType = (file.type || '').toLowerCase();
    const buffer = await file.arrayBuffer();
    bytes = new Uint8Array(buffer);
  } else {
    const body = await request.json().catch(() => ({}));
    if (!body.dataUrl) {
      const err = new Error('Please provide a valid image file or dataUrl.');
      err.status = 400;
      err.code = 'MISSING_FILE';
      throw err;
    }
    const decoded = decodeBase64DataUrl(body.dataUrl);
    if (!decoded) {
      const err = new Error('Malformed base64 image dataUrl.');
      err.status = 400;
      err.code = 'INVALID_DATA_URL';
      throw err;
    }
    mimeType = decoded.mimeType;
    bytes = decoded.bytes;
  }

  const validation = validateImageUpload({
    mimeType,
    sizeBytes: bytes.byteLength,
    bytes,
  });

  if (!validation.isValid) {
    const err = new Error(validation.error);
    err.status = 400;
    err.code = 'INVALID_IMAGE_UPLOAD';
    throw err;
  }

  const ext = EXTENSION_BY_MIME[mimeType] || 'jpg';
  const key = `${folder}/${generateRandomId('img')}.${ext}`;

  await env.ASSETS_BUCKET.put(key, bytes, {
    httpMetadata: {
      contentType: mimeType,
    },
  });

  return {
    key,
    url: `/api/v1/uploads/${key}`,
    mimeType,
    sizeBytes: bytes.byteLength,
  };
}

export async function deleteImageFromR2(env, keyOrUrl) {
  if (!env.ASSETS_BUCKET || !keyOrUrl) return false;
  const prefix = '/api/v1/uploads/';
  let key = String(keyOrUrl).trim();
  if (key.startsWith(prefix)) {
    key = key.slice(prefix.length);
  }
  if (!key || key.includes('..')) return false;
  await env.ASSETS_BUCKET.delete(key);
  return true;
}

export async function serveImageFromR2(env, key) {
  if (!env.ASSETS_BUCKET || !key || key.includes('..')) {
    return null;
  }
  const object = await env.ASSETS_BUCKET.get(key);
  if (!object) {
    return null;
  }
  const contentType = object.httpMetadata?.contentType || 'image/jpeg';
  const body = object.body || (await object.arrayBuffer());
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
