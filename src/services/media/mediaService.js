import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  createServiceError,
  createServiceResponse,
  getApiBaseUrl,
  getDataAdapterMode,
} from '../api/apiClient.js';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB max per image

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.avif',
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
      message: `Unsupported image type "${mimeType || 'unknown'}". Allowed formats: JPG, PNG, WebP, GIF, AVIF.`,
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

  if (getDataAdapterMode() === 'api') {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${API_ENDPOINTS.fileUploads}`;
    try {
      const formData = new FormData();
      if (file instanceof Blob) {
        formData.append('file', file, validation.name);
      }
      if (options.entityType) {
        formData.append('entityType', String(options.entityType));
      }
      if (options.entityId) {
        formData.append('entityId', String(options.entityId));
      }

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const contentType = response.headers?.get?.('content-type') || '';
      const payload = contentType.includes('application/json') ? await response.json() : null;

      if (!response.ok) {
        return createServiceError(
          payload?.message || `Image upload failed with status ${response.status}.`,
          payload?.data ?? null
        );
      }

      const uploadedData = payload?.data || payload;
      return createServiceResponse(
        {
          id: uploadedData?.id || `media-${Date.now()}`,
          reference: uploadedData?.publicUrl || uploadedData?.url || '',
          url: uploadedData?.publicUrl || uploadedData?.url || '',
          mimeType: validation.mimeType,
          sizeBytes: validation.sizeBytes,
          name: validation.name,
        },
        payload?.message || 'Image uploaded to storage.'
      );
    } catch (err) {
      return createServiceError(
        err?.message || 'Network error while uploading image to backend storage.',
        null
      );
    }
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
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${API_ENDPOINTS.fileUploads}/${encodeURIComponent(id)}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        return createServiceError(`Failed deleting media "${id}" (status ${response.status}).`);
      }
      return createServiceResponse({ id }, 'Image deleted from backend storage.');
    } catch (err) {
      return createServiceError(err?.message || 'Network error while deleting image.');
    }
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
 * (`/assets/...`, `https://...`, `blob:...`, or legacy `data:image/...`).
 */
export function getCachedImageUrl(mediaRef) {
  if (!mediaRef || typeof mediaRef !== 'string') return '';
  const trimmed = mediaRef.trim();
  if (!trimmed) return '';

  if (!trimmed.startsWith('idb://')) {
    return trimmed;
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
 * Asynchronously resolves any image reference (`idb://media-...`, `/assets/...`, `https://...`, `data:image/...`)
 * to a renderable browser URL.
 */
export async function getImageUrl(mediaRef) {
  if (!mediaRef || typeof mediaRef !== 'string') return '';
  const trimmed = mediaRef.trim();
  if (!trimmed) return '';

  if (!trimmed.startsWith('idb://')) {
    return trimmed;
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
  uploadImage,
  deleteImage,
  getImageUrl,
  getCachedImageUrl,
};
