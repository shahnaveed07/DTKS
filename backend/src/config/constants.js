/**
 * DTKS Backend Constants & Allowed Domain Enums
 * Strictly scoped to Website Design, Development, Redesign, Hosting & Maintenance.
 */

export const API_PREFIX = '/api/v1';

// Supports both canonical backend statuses from specification and detailed frontend progress stages
export const VALID_ORDER_STATUSES = [
  'Pending',
  'New Request',
  'Reviewed',
  'Under Review',
  'Requirements Clarification',
  'Quotation Sent',
  'Awaiting Customer Approval',
  'Approved',
  'InProgress',
  'In Progress',
  'Under Testing',
  'Completed',
  'Rejected',
  'Cancelled',
];

export const VALID_CONTACT_STATUSES = [
  'New',
  'Read',
  'In Review',
  'Replied',
  'Archived',
];

export const VALID_ADMIN_ROLES = [
  'super_admin',
  'admin',
  'editor',
];

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const ALLOWED_IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_JSON_BODY_BYTES = 1 * 1024 * 1024;  // 1 MB

export const WEBSITE_CATEGORIES = [
  'Business & Corporate Websites',
  'Personal Portfolio Websites',
  'Landing Pages',
  'E-Commerce Websites',
  'Restaurant & Hotel Websites',
  'Educational Institution Websites',
  'Real Estate Websites',
  'Blog & News Websites',
  'Booking & Appointment Websites',
  'Custom Website Development',
];
