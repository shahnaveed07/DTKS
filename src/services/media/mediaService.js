import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  createServiceError,
  createServiceResponse,
  getDataAdapterMode,
  isProductionEnvironment,
  resolveBackendAssetUrl,
} from '../api/apiClient.js';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB max per image

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
];

const IDB_DB_NAME = 'dtks_media_db';
const IDB_DB_VERSION = 1;
const IDB_STORE_NAME = 'media_blobs';
const MEDIA_INDEX_STORAGE_KEY = 'dks_v2_media_index';

// In-memory store and ObjectURL cache (supports both browser and Node.js test environments)
const memoryBlobStore = new Map();
const objectUrlCache = new Map();

function hasIndexedDB() {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function openMediaDatabase() {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed opening IndexedDB media store.'));
    } catch (err) {
      reject(err);
    }
  });
}

async function putBlobInIndexedDB(record) {
  const db = await openMediaDatabase();
  if (!db) return false;
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put(record);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error || new Error('Failed writing image blob to IndexedDB.'));
      };
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

async function getBlobFromIndexedDB(id) {
  const db = await openMediaDatabase();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        db.close();
        resolve(req.result || null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error || new Error('Failed reading image blob from IndexedDB.'));
      };
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

async function removeBlobFromIndexedDB(id) {
  const db = await openMediaDatabase();
  if (!db) return false;
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error || new Error('Failed deleting image blob from IndexedDB.'));
      };
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

function readMediaIndex() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(MEDIA_INDEX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMediaIndex(indexList) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(MEDIA_INDEX_STORAGE_KEY, JSON.stringify(indexList));
  } catch {
    // Index metadata is optional; binary blob is already stored in IndexedDB
  }
}

function extractExtension(filename = '') {
  const trimmed = String(filename || '').trim().toLowerCase();
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot === -1) return '';
  return trimmed.slice(lastDot);
}

function createBlobObjectUrl(id, blob) {
  if (objectUrlCache.has(id)) {
    return objectUrlCache.get(id);
  }
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && blob instanceof Blob) {
    try {
      const objectUrl = URL.createObjectURL(blob);
      objectUrlCache.set(id, objectUrl);
      return objectUrl;
    } catch {
      // Fallback for environments where createObjectURL is mocked or restricted
    }
  }
  const fallbackRef = `idb://${id}`;
  objectUrlCache.set(id, fallbackRef);
  return fallbackRef;
}

export function extractMediaId(refOrId = '') {
  const str = String(refOrId || '').trim();
  if (str.startsWith('idb://')) {
    return str.slice('idb://'.length);
  }
  return str;
}

export function extractUploadedAssetKey(refOrUrl = '') {
  const str = String(refOrUrl || '').trim();
  if (!str || str.startsWith('idb://') || str.startsWith('data:') || str.startsWith('blob:')) {
    return '';
  }
  const uploadsMarker = '/api/v1/uploads/';
  const markerIndex = str.indexOf(uploadsMarker);
  if (markerIndex !== -1) {
    return decodeURIComponent(str.slice(markerIndex + uploadsMarker.length).split('?')[0]);
  }
  if (!str.startsWith('/') && !/^https?:\/\//i.test(str)) {
    return str;
  }
  return '';
}

/**
 * Validates an uploaded image file against MIME type, extension, and size limits.
 */
export function validateImage(file, options = {}) {
  const maxBytes = options.maxSizeBytes || MAX_IMAGE_SIZE_BYTES;

  if (!file || typeof file !== 'object') {
    return {
      valid: false,
      errorType: 'InvalidFileError',
      message: 'Please select a valid image file.',
    };
  }

  const sizeBytes = Number(file.size ?? file.byteLength ?? 0);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return {
      valid: false,
      errorType: 'EmptyFileError',
      message: 'The selected image file is empty.',
    };
  }

  if (sizeBytes > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '');
    const actualMb = (sizeBytes / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      errorType: 'FileTooLargeError',
      message: `Image size (${actualMb} MB) exceeds the ${maxMb} MB maximum upload limit.`,
    };
  }

  const mimeType = String(file.type || '').trim().toLowerCase();
  const extension = extractExtension(file.name || '');

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      errorType: 'UnsupportedFileTypeError',
      message: `Unsupported image type "${mimeType || 'unknown'}". Allowed formats: JPG, PNG, WebP.`,
    };
  }

  if (extension && !ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      errorType: 'UnsupportedExtensionError',
      message: `Unsupported file extension "${extension}". Allowed extensions: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}.`,
    };
  }

  return {
    valid: true,
    mimeType,
    extension: extension || `.${mimeType.split('/')[1]}`,
    sizeBytes,
    name: String(file.name || `image.${mimeType.split('/')[1]}`),
  };
}

async function readLeadingFileBytes(file, maxBytes = 12) {
  if (!file || typeof file !== 'object') return null;
  try {
    if (typeof file.slice === 'function' && typeof Blob !== 'undefined' && file instanceof Blob) {
      const buf = await file.slice(0, maxBytes).arrayBuffer();
      return new Uint8Array(buf);
    }
    if (typeof file.arrayBuffer === 'function') {
      const buf = await file.arrayBuffer();
      return new Uint8Array(buf.slice(0, maxBytes));
    }
    const raw = file.buffer ?? file.content;
    if (raw instanceof Uint8Array) {
      return raw.subarray(0, maxBytes);
    }
    if (raw instanceof ArrayBuffer) {
      return new Uint8Array(raw.slice(0, maxBytes));
    }
    if (Array.isArray(raw)) {
      return Uint8Array.from(raw.slice(0, maxBytes));
    }
  } catch {
    return null;
  }
  return null;
}

export function matchesImageMagicBytes(bytes, mimeType = '') {
  if (!(bytes instanceof Uint8Array) || bytes.length < 3) return false;
  const normalized = String(mimeType || '').trim().toLowerCase();

  if (normalized === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (normalized === 'image/png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (normalized === 'image/webp') {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}

export async function validateImageMagicBytes(file, mimeType = '') {
  const bytes = await readLeadingFileBytes(file, 12);
  if (!bytes || !matchesImageMagicBytes(bytes, mimeType)) {
    return {
      valid: false,
      errorType: 'InvalidFileSignatureError',
      message: 'The selected file signature does not match a valid JPG, PNG, or WebP image.',
    };
  }
  return { valid: true };
}

/**
 * Uploads an image file:
 * - In 'api' mode: sends multipart FormData to /uploads (Cloudflare R2 / backend ready) without hardcoded credentials.
 * - In 'local' mode: stores binary Blob in IndexedDB (`dtks_media_db`) and returns a lightweight `idb://media-...` reference
 *   so Base64 strings never bloat LocalStorage.
 */
export async function uploadImage(file, options = {}) {
  const validation = validateImage(file, options);
  if (!validation.valid) {
    return createServiceError(validation.message, {
      errorType: validation.errorType,
    });
  }

  const signatureCheck = await validateImageMagicBytes(file, validation.mimeType);
  if (!signatureCheck.valid) {
    return createServiceError(signatureCheck.message, null, {
      errorType: signatureCheck.errorType,
      errorCode: 'INVALID_IMAGE_SIGNATURE',
      statusCode: 400,
    });
  }

  if (getDataAdapterMode() === 'api') {
    if (typeof FormData === 'undefined') {
      return createServiceError('Multipart upload requires FormData support.');
    }
    const formData = new FormData();
    if (file instanceof Blob) {
      formData.append('file', file, validation.name);
    } else {
      const blob = new Blob([file.buffer || file.content || ''], { type: validation.mimeType });
      formData.append('file', blob, validation.name);
    }
    if (options.entityType) {
      formData.append('entityType', String(options.entityType));
    }
    if (options.entityId) {
      formData.append('entityId', String(options.entityId));
    }

    const res = await apiRequest(API_ENDPOINTS.portfolioUpload, {
      method: 'POST',
      body: formData,
    });
    if (!res.success) {
      return res;
    }

    const uploadedData = res.data?.asset || res.data || {};
    const rawRef = uploadedData.url || uploadedData.publicUrl || '';
    const resolvedUrl = resolveBackendAssetUrl(rawRef);
    const key = uploadedData.key || extractUploadedAssetKey(rawRef);

    return createServiceResponse(
      {
        id: uploadedData.id || key || `media-${Date.now()}`,
        key,
        reference: rawRef || key,
        url: resolvedUrl || rawRef,
        mimeType: validation.mimeType,
        sizeBytes: validation.sizeBytes,
        name: validation.name,
      },
      res.message || 'Image uploaded to R2 media storage.'
    );
  }

  if (isProductionEnvironment()) {
    return createServiceError(
      'Media upload requires an active backend API connection in production.',
      null,
      {
        errorType: 'BackendNotConfiguredError',
        errorCode: 'BACKEND_NOT_CONFIGURED',
        statusCode: 503,
      }
    );
  }

  // Local mode: store binary Blob in IndexedDB + memory cache (never store Base64 in LocalStorage)
  const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const reference = `idb://${id}`;
  const createdAt = new Date().toISOString();

  const blob =
    file instanceof Blob
      ? file
      : new Blob([file.buffer || file.content || ''], { type: validation.mimeType });

  const record = {
    id,
    reference,
    name: validation.name,
    mimeType: validation.mimeType,
    sizeBytes: validation.sizeBytes,
    entityType: options.entityType || 'general',
    createdAt,
    blob,
  };

  memoryBlobStore.set(id, record);

  try {
    await putBlobInIndexedDB(record);
  } catch (err) {
    // If IndexedDB quota is exceeded, remove from memory store and report error
    memoryBlobStore.delete(id);
    return createServiceError(
      err?.message || 'Browser media storage quota exceeded while saving image.',
      { errorType: 'MediaStorageError' }
    );
  }

  const previewUrl = createBlobObjectUrl(id, blob);

  // Store lightweight metadata only (no Base64) in index
  const currentIndex = readMediaIndex().filter((item) => item.id !== id);
  writeMediaIndex([
    {
      id,
      reference,
      name: validation.name,
      mimeType: validation.mimeType,
      sizeBytes: validation.sizeBytes,
      entityType: options.entityType || 'general',
      createdAt,
    },
    ...currentIndex,
  ]);

  return createServiceResponse(
    {
      id,
      reference,
      url: previewUrl,
      name: validation.name,
      mimeType: validation.mimeType,
      sizeBytes: validation.sizeBytes,
      createdAt,
    },
    'Image stored in browser IndexedDB media storage.'
  );
}

/**
 * Deletes an uploaded image by reference (`idb://media-...`) or ID.
 */
export async function deleteImage(mediaRefOrId) {
  if (!mediaRefOrId || typeof mediaRefOrId !== 'string') {
    return createServiceError('A valid media reference or ID is required to delete an image.');
  }

  const id = extractMediaId(mediaRefOrId);

  if (getDataAdapterMode() === 'api') {
    const key = extractUploadedAssetKey(mediaRefOrId);
    if (!key) {
      return createServiceResponse(
        { id, skipped: true },
        'External or static asset URL left unchanged.'
      );
    }
    const encodedKeyPath = key
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const res = await apiRequest(
      `${API_ENDPOINTS.portfolioUpload}/${encodedKeyPath}`,
      { method: 'DELETE' }
    );
    if (!res.success) {
      return res;
    }
    return createServiceResponse({ id, key }, res.message || 'Image deleted from R2 media storage.');
  }

  memoryBlobStore.delete(id);

  if (objectUrlCache.has(id)) {
    const cachedUrl = objectUrlCache.get(id);
    if (
      typeof URL !== 'undefined' &&
      typeof URL.revokeObjectURL === 'function' &&
      typeof cachedUrl === 'string' &&
      cachedUrl.startsWith('blob:')
    ) {
      try {
        URL.revokeObjectURL(cachedUrl);
      } catch {
        // Ignore revoke errors
      }
    }
    objectUrlCache.delete(id);
  }

  try {
    await removeBlobFromIndexedDB(id);
  } catch {
    // Ignore if IndexedDB unavailable in test environment
  }

  const nextIndex = readMediaIndex().filter((item) => item.id !== id);
  writeMediaIndex(nextIndex);

  return createServiceResponse({ id }, 'Image removed from browser media storage.');
}

/**
 * Synchronously returns a renderable URL if already cached or if `mediaRef` is a standard URL
 * (`/assets/...`, `/api/v1/uploads/...`, `https://...`, `blob:...`, or legacy `data:image/...`).
 */
export function getCachedImageUrl(mediaRef) {
  if (!mediaRef || typeof mediaRef !== 'string') return '';
  const trimmed = mediaRef.trim();
  if (!trimmed) return '';

  if (!trimmed.startsWith('idb://')) {
    return resolveBackendAssetUrl(trimmed);
  }

  const id = extractMediaId(trimmed);
  if (objectUrlCache.has(id)) {
    return objectUrlCache.get(id);
  }

  if (memoryBlobStore.has(id)) {
    const record = memoryBlobStore.get(id);
    if (record?.blob) {
      return createBlobObjectUrl(id, record.blob);
    }
  }

  return '';
}

/**
 * Asynchronously resolves any image reference (`idb://media-...`, `/assets/...`, `/api/v1/uploads/...`, `https://...`)
 * to a renderable browser URL.
 */
export async function getImageUrl(mediaRef) {
  if (!mediaRef || typeof mediaRef !== 'string') return '';
  const trimmed = mediaRef.trim();
  if (!trimmed) return '';

  if (!trimmed.startsWith('idb://')) {
    return resolveBackendAssetUrl(trimmed);
  }

  const cached = getCachedImageUrl(trimmed);
  if (cached) return cached;

  const id = extractMediaId(trimmed);
  try {
    const record = await getBlobFromIndexedDB(id);
    if (record && record.blob) {
      memoryBlobStore.set(id, record);
      return createBlobObjectUrl(id, record.blob);
    }
  } catch {
    // Fall through if IndexedDB read fails
  }

  return '';
}

export const mediaService = {
  validateImage,
  validateImageMagicBytes,
  uploadImage,
  deleteImage,
  getImageUrl,
  getCachedImageUrl,
};
