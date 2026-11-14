import { successResponse, errorResponse, safeJsonParse } from '../utils/response.js';
import { mapOrderRow } from './ordersController.js';
import { mapContactRow } from './contactController.js';

/**
 * Dashboard & Analytics Controller (Phase 4.7 & Phase 5)
 * All statistics are computed directly from real D1 SQLite queries on the 12 snake_case tables.
 */

export async function getDashboardStats(request, env) {
  const [
    ordersSummary,
    inquiriesSummary,
    portfolioSummary,
    servicesSummary,
    packagesSummary,
    customersSummary,
    teamSettingRow,
  ] = await Promise.all([
    env.DB.prepare(
      `SELECT
         COUNT(*) AS totalOrders,
         SUM(CASE WHEN status = 'Pending' OR status = 'New Request' THEN 1 ELSE 0 END) AS pendingOrders,
         SUM(CASE WHEN status IN ('Approved', 'In Progress', 'InProgress', 'Under Testing') THEN 1 ELSE 0 END) AS activeProjects,
         SUM(CASE WHEN status IN ('Pending', 'New Request', 'Reviewed', 'Under Review', 'Requirements Clarification', 'Quotation Sent', 'Awaiting Customer Approval') THEN 1 ELSE 0 END) AS pendingQuotations,
         SUM(CASE WHEN status IN ('Pending', 'New Request', 'Reviewed', 'Under Review', 'Requirements Clarification') THEN 1 ELSE 0 END) AS ordersUnderReview,
         SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completedOrders,
         SUM(CASE WHEN hosting_preference = 'DreamTech-managed' THEN 1 ELSE 0 END) AS managedHostingOrders,
         SUM(CASE WHEN maintenance_interest = 'Interested' THEN 1 ELSE 0 END) AS maintenanceInterestedOrders,
         COALESCE(SUM(quotation_amount), 0) AS totalQuotedValue
       FROM orders`
    ).first(),
    env.DB.prepare(
      `SELECT
         COUNT(*) AS totalInquiries,
         SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) AS newInquiries
       FROM contact_messages`
    ).first(),
    env.DB.prepare(
      `SELECT
         COUNT(*) AS totalPortfolio,
         SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) AS publishedPortfolio
       FROM portfolio`
    ).first(),
    env.DB.prepare(
      `SELECT
         COUNT(*) AS totalServices,
         SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeServices
       FROM services`
    ).first(),
    env.DB.prepare(
      `SELECT
         COUNT(*) AS totalPackages,
         SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activePackages
       FROM packages`
    ).first(),
    env.DB.prepare('SELECT COUNT(*) AS totalCustomers FROM customers').first(),
    env.DB.prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'team_members'").first(),
  ]);

  const teamArray = safeJsonParse(teamSettingRow?.setting_value, []);
  const visibleTeamCount = Array.isArray(teamArray)
    ? teamArray.filter((m) => m && m.visible !== false).length
    : 0;

  const stats = {
    totalOrders: Number(ordersSummary?.totalOrders || 0),
    total_orders: Number(ordersSummary?.totalOrders || 0),
    pendingOrders: Number(ordersSummary?.pendingOrders || 0),
    pending_orders: Number(ordersSummary?.pendingOrders || 0),
    completedOrders: Number(ordersSummary?.completedOrders || 0),
    completed_orders: Number(ordersSummary?.completedOrders || 0),
    completedProjects: Number(ordersSummary?.completedOrders || 0),
    activeProjects: Number(ordersSummary?.activeProjects || 0),
    pendingQuotations: Number(ordersSummary?.pendingQuotations || 0),
    ordersUnderReview: Number(ordersSummary?.ordersUnderReview || 0),
    managedHostingOrders: Number(ordersSummary?.managedHostingOrders || 0),
    maintenanceInterestedOrders: Number(ordersSummary?.maintenanceInterestedOrders || 0),
    totalQuotedValue: Number(ordersSummary?.totalQuotedValue || 0),
    totalInquiries: Number(inquiriesSummary?.totalInquiries || 0),
    totalContactMessages: Number(inquiriesSummary?.totalInquiries || 0),
    total_contact_messages: Number(inquiriesSummary?.totalInquiries || 0),
    newInquiries: Number(inquiriesSummary?.newInquiries || 0),
    totalPortfolio: Number(portfolioSummary?.totalPortfolio || 0),
    totalPortfolioItems: Number(portfolioSummary?.totalPortfolio || 0),
    total_portfolio_items: Number(portfolioSummary?.totalPortfolio || 0),
    portfolioProjects: Number(portfolioSummary?.publishedPortfolio || 0),
    totalServices: Number(servicesSummary?.totalServices || 0),
    activeServices: Number(servicesSummary?.activeServices || 0),
    active_services: Number(servicesSummary?.activeServices || 0),
    totalPackages: Number(packagesSummary?.totalPackages || 0),
    activePackages: Number(packagesSummary?.activePackages || 0),
    active_packages: Number(packagesSummary?.activePackages || 0),
    totalCustomers: Number(customersSummary?.totalCustomers || 0),
    total_customers: Number(customersSummary?.totalCustomers || 0),
    teamMembers: visibleTeamCount,
  };

  return successResponse({ stats }, 'Dashboard statistics computed from database.');
}

export async function getRecentOrders(request, env) {
  const url = new URL(request.url);
  const limit = Math.min(25, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '5', 10)));

  const result = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?')
    .bind(limit)
    .all();

  const recentOrders = (result.results || []).map((r) => mapOrderRow(r, { includeInternal: true }));
  return successResponse({ recentOrders, orders: recentOrders }, 'Recent orders fetched.');
}

export async function getRecentMessages(request, env) {
  const url = new URL(request.url);
  const limit = Math.min(25, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '5', 10)));

  const result = await env.DB.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT ?')
    .bind(limit)
    .all();

  const recentMessages = (result.results || []).map(mapContactRow);
  return successResponse(
    { recentMessages, inquiries: recentMessages, messages: recentMessages },
    'Recent messages fetched.'
  );
}

export async function getOrderAnalytics(request, env) {
  const [byStatus, byService, byHosting, monthlyTrend] = await Promise.all([
    env.DB.prepare(
      'SELECT status, COUNT(*) AS count, COALESCE(SUM(quotation_amount), 0) AS quotedValue FROM orders GROUP BY status ORDER BY count DESC'
    ).all(),
    env.DB.prepare(
      'SELECT service_name AS service, COUNT(*) AS count, COALESCE(SUM(quotation_amount), 0) AS quotedValue FROM orders GROUP BY service_name ORDER BY count DESC'
    ).all(),
    env.DB.prepare(
      'SELECT hosting_preference AS hostingPreference, COUNT(*) AS count FROM orders GROUP BY hosting_preference ORDER BY count DESC'
    ).all(),
    env.DB.prepare(
      'SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS orderCount, COALESCE(SUM(quotation_amount), 0) AS quotedTotal FROM orders GROUP BY substr(created_at, 1, 7) ORDER BY month DESC LIMIT 12'
    ).all(),
  ]);

  return successResponse(
    {
      analytics: {
        byStatus: (byStatus.results || []).map((r) => ({
          status: r.status,
          count: Number(r.count || 0),
          quotedValue: Number(r.quotedValue || 0),
        })),
        byService: (byService.results || []).map((r) => ({
          service: r.service,
          count: Number(r.count || 0),
          quotedValue: Number(r.quotedValue || 0),
        })),
        byHosting: (byHosting.results || []).map((r) => ({
          hostingPreference: r.hostingPreference,
          count: Number(r.count || 0),
        })),
        monthlyTrend: (monthlyTrend.results || []).map((r) => ({
          month: r.month,
          orderCount: Number(r.orderCount || 0),
          quotedTotal: Number(r.quotedTotal || 0),
        })),
      },
    },
    'Order analytics computed from database.'
  );
}

export async function listCustomers(request, env) {
  const result = await env.DB.prepare(
    `SELECT
       c.id, c.full_name, c.email, c.phone, c.city, c.business_name, c.created_at, c.updated_at,
       COUNT(o.id) AS orderCount,
       COALESCE(SUM(o.quotation_amount), 0) AS totalQuotedAmount
     FROM customers c
     LEFT JOIN orders o ON o.customer_id = c.id OR lower(o.customer_email) = lower(c.email)
     GROUP BY c.id
     ORDER BY c.created_at DESC`
  ).all();

  const customers = (result.results || []).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    city: row.city || '',
    business_name: row.business_name || '',
    businessName: row.business_name || '',
    orderCount: Number(row.orderCount || 0),
    totalQuotedAmount: Number(row.totalQuotedAmount || 0),
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
  }));

  return successResponse({ customers }, 'Customers fetched successfully.');
}

export async function getCustomerById(request, env, id) {
  const customer = await env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first();
  if (!customer) {
    return errorResponse('Customer not found.', 404, 'NOT_FOUND');
  }

  const ordersResult = await env.DB.prepare(
    'SELECT * FROM orders WHERE customer_id = ? OR lower(customer_email) = lower(?) ORDER BY created_at DESC'
  )
    .bind(customer.id, customer.email)
    .all();

  return successResponse(
    {
      customer: {
        id: customer.id,
        full_name: customer.full_name,
        fullName: customer.full_name,
        email: customer.email,
        phone: customer.phone,
        city: customer.city || '',
        business_name: customer.business_name || '',
        businessName: customer.business_name || '',
        created_at: customer.created_at,
        createdAt: customer.created_at,
        updated_at: customer.updated_at,
        updatedAt: customer.updated_at,
        orders: (ordersResult.results || []).map((r) => mapOrderRow(r, { includeInternal: true })),
      },
    },
    'Customer details fetched.'
  );
}

export async function listActivityLogs(request, env) {
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '50', 10)));

  const result = await env.DB.prepare(
    `SELECT l.*, a.name AS admin_name, a.email AS admin_email
     FROM activity_logs l
     LEFT JOIN admins a ON a.id = l.admin_id
     ORDER BY l.timestamp DESC
     LIMIT ?`
  )
    .bind(limit)
    .all();

  const logs = (result.results || []).map((r) => ({
    id: r.id,
    admin_id: r.admin_id,
    adminId: r.admin_id,
    adminName: r.admin_name || 'System',
    adminEmail: r.admin_email || '',
    action: r.action,
    entity_type: r.entity_type,
    entityType: r.entity_type,
    entity_id: r.entity_id,
    entityId: r.entity_id,
    details: r.details || '',
    ip_address: r.ip_address || '',
    ipAddress: r.ip_address || '',
    timestamp: r.timestamp,
  }));

  return successResponse({ logs }, 'Activity logs fetched.');
}

export async function listNotifications(request, env) {
  const result = await env.DB.prepare(
    "SELECT * FROM activity_logs WHERE action LIKE 'EMAIL_NOTIFICATION_%' ORDER BY timestamp DESC LIMIT 50"
  ).all();

  const notifications = (result.results || []).map((r) => ({
    id: r.id,
    eventType: r.action,
    relatedEntityId: r.entity_id,
    details: r.details || '',
    createdAt: r.timestamp,
  }));

  return successResponse({ notifications }, 'Notification logs fetched.');
}
