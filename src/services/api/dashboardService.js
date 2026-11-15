import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  createServiceError,
  createServiceResponse,
  getDataAdapterMode,
} from './apiClient.js';
import { computeDashboardStats } from '../../utils/orderUtils.js';

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeDashboardStatsPayload(rawPayload) {
  const raw = rawPayload?.stats && typeof rawPayload.stats === 'object'
    ? rawPayload.stats
    : rawPayload && typeof rawPayload === 'object'
    ? rawPayload
    : null;

  if (!raw) return null;

  return {
    totalOrders: toNullableNumber(raw.totalOrders ?? raw.total_orders ?? raw.ordersCount),
    activeProjects: toNullableNumber(
      raw.activeProjects ?? raw.active_projects ?? raw.activeBuilds ?? raw.active_builds
    ),
    pendingQuotations: toNullableNumber(raw.pendingQuotations ?? raw.pending_quotations),
    completedProjects: toNullableNumber(
      raw.completedProjects ?? raw.completed_projects ?? raw.completedWebsites
    ),
    managedHostingOrders: toNullableNumber(
      raw.managedHostingOrders ?? raw.managed_hosting_orders ?? raw.dreamtechHostingOrders
    ),
    maintenanceInterestedOrders: toNullableNumber(
      raw.maintenanceInterestedOrders ?? raw.maintenance_interested_orders ?? raw.maintenanceRequests
    ),
    portfolioProjects: toNullableNumber(
      raw.portfolioProjects ?? raw.portfolio_projects ?? raw.publishedPortfolio
    ),
    newInquiries: toNullableNumber(
      raw.newInquiries ?? raw.new_inquiries ?? raw.unreadMessages ?? raw.unread_messages
    ),
    ordersUnderReview: toNullableNumber(raw.ordersUnderReview ?? raw.orders_under_review),
    teamMembers: toNullableNumber(raw.teamMembers ?? raw.team_members),
  };
}

export function normalizeRecentOrdersPayload(rawPayload) {
  if (Array.isArray(rawPayload?.orders)) return rawPayload.orders;
  if (Array.isArray(rawPayload?.recentOrders)) return rawPayload.recentOrders;
  if (Array.isArray(rawPayload?.items)) return rawPayload.items;
  if (Array.isArray(rawPayload)) return rawPayload;
  return [];
}

export function normalizeRecentMessagesPayload(rawPayload) {
  if (Array.isArray(rawPayload?.messages)) return rawPayload.messages;
  if (Array.isArray(rawPayload?.inquiries)) return rawPayload.inquiries;
  if (Array.isArray(rawPayload?.recentMessages)) return rawPayload.recentMessages;
  if (Array.isArray(rawPayload?.items)) return rawPayload.items;
  if (Array.isArray(rawPayload)) return rawPayload;
  return [];
}

function normalizeBreakdownEntries(source, kind = 'generic') {
  if (!source) return [];
  if (Array.isArray(source)) {
    return source
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const label = String(
          entry.label ??
            entry.status ??
            entry.service ??
            entry.category ??
            entry.hostingPreference ??
            entry.hosting_preference ??
            entry.name ??
            entry.period ??
            entry.month ??
            ''
        ).trim();
        const rawCount =
          entry.orderCount ??
          entry.order_count ??
          entry.count ??
          entry.total ??
          entry.orders ??
          entry.value;
        if (rawCount === null || rawCount === undefined || rawCount === '') return null;
        const count = Number(rawCount);
        if (!label || !Number.isFinite(count) || count < 0) return null;

        const quotedValue = toNullableNumber(
          entry.quotedValue ?? entry.quoted_value ?? entry.quotedTotal ?? entry.quoted_total
        );

        const normalized = {
          label,
          count,
          quotedValue,
        };
        if (kind === 'status') {
          normalized.status = label;
        } else if (kind === 'service') {
          normalized.service = label;
        } else if (kind === 'hosting') {
          normalized.hostingPreference = label;
        } else if (kind === 'monthly') {
          normalized.month = label;
          normalized.orderCount = count;
          normalized.quotedTotal = quotedValue;
        }
        return normalized;
      })
      .filter(Boolean);
  }
  if (typeof source === 'object') {
    return Object.entries(source)
      .map(([label, val]) => {
        if (val === null || val === undefined || val === '') return null;
        const count = Number(val);
        if (!label || !Number.isFinite(count) || count < 0) return null;
        const normalized = { label, count, quotedValue: null };
        if (kind === 'status') {
          normalized.status = label;
        } else if (kind === 'service') {
          normalized.service = label;
        } else if (kind === 'hosting') {
          normalized.hostingPreference = label;
        } else if (kind === 'monthly') {
          normalized.month = label;
          normalized.orderCount = count;
          normalized.quotedTotal = null;
        }
        return normalized;
      })
      .filter(Boolean);
  }
  return [];
}

export function normalizeOrderAnalyticsPayload(rawPayload) {
  const raw = rawPayload?.analytics && typeof rawPayload.analytics === 'object'
    ? rawPayload.analytics
    : rawPayload && typeof rawPayload === 'object'
    ? rawPayload
    : null;

  if (!raw) {
    return { byStatus: [], byService: [], byHosting: [], monthlyTrend: [], timeline: [], totalAnalyzed: 0 };
  }

  const byStatus = normalizeBreakdownEntries(
    raw.byStatus ?? raw.by_status ?? raw.statusBreakdown ?? raw.statuses,
    'status'
  );
  const byService = normalizeBreakdownEntries(
    raw.byService ?? raw.by_service ?? raw.serviceBreakdown ?? raw.categories,
    'service'
  );
  const byHosting = normalizeBreakdownEntries(
    raw.byHosting ?? raw.by_hosting ?? raw.hostingBreakdown ?? raw.hostings,
    'hosting'
  );
  const monthlyTrend = normalizeBreakdownEntries(
    raw.monthlyTrend ?? raw.monthly_trend ?? raw.timeline ?? raw.monthly ?? raw.series ?? raw.trend,
    'monthly'
  );

  const explicitTotal = toNullableNumber(raw.totalOrders ?? raw.total ?? raw.totalAnalyzed);
  const computedTotal =
    byStatus.length > 0
      ? byStatus.reduce((sum, item) => sum + item.count, 0)
      : monthlyTrend.length > 0
      ? monthlyTrend.reduce((sum, item) => sum + item.count, 0)
      : byService.reduce((sum, item) => sum + item.count, 0);

  return {
    byStatus,
    byService,
    byHosting,
    monthlyTrend,
    timeline: monthlyTrend,
    totalAnalyzed: explicitTotal ?? computedTotal,
  };
}

function buildLocalAnalytics(orders = []) {
  const statusMap = {};
  const serviceMap = {};
  const hostingMap = {};
  const monthlyMap = {};

  for (const order of orders) {
    const quote = toNullableNumber(order?.quotationAmount) || 0;
    const st = order?.status || 'Unknown';
    if (!statusMap[st]) statusMap[st] = { count: 0, quotedValue: 0 };
    statusMap[st].count += 1;
    statusMap[st].quotedValue += quote;

    const svc = order?.service || 'Other';
    if (!serviceMap[svc]) serviceMap[svc] = { count: 0, quotedValue: 0 };
    serviceMap[svc].count += 1;
    serviceMap[svc].quotedValue += quote;

    const hosting = order?.hostingPreference || 'Not specified';
    if (!hostingMap[hosting]) hostingMap[hosting] = { count: 0 };
    hostingMap[hosting].count += 1;

    if (order?.createdAt) {
      const d = new Date(order.createdAt);
      if (!Number.isNaN(d.getTime())) {
        const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { count: 0, quotedTotal: 0 };
        monthlyMap[monthKey].count += 1;
        monthlyMap[monthKey].quotedTotal += quote;
      }
    }
  }

  const monthlyTrend = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, val]) => ({
      label: month,
      month,
      count: val.count,
      orderCount: val.count,
      quotedValue: val.quotedTotal,
      quotedTotal: val.quotedTotal,
    }));

  return {
    byStatus: Object.entries(statusMap).map(([status, val]) => ({
      label: status,
      status,
      count: val.count,
      quotedValue: val.quotedValue,
    })),
    byService: Object.entries(serviceMap).map(([service, val]) => ({
      label: service,
      service,
      count: val.count,
      quotedValue: val.quotedValue,
    })),
    byHosting: Object.entries(hostingMap).map(([hostingPreference, val]) => ({
      label: hostingPreference,
      hostingPreference,
      count: val.count,
      quotedValue: null,
    })),
    monthlyTrend,
    timeline: monthlyTrend,
    totalAnalyzed: orders.length,
  };
}

export const dashboardService = {
  async getStats(localContext = null) {
    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(API_ENDPOINTS.dashboardStats, { method: 'GET' });
      if (!res.success) return res;
      const normalized = normalizeDashboardStatsPayload(res.data);
      if (!normalized) {
        return createServiceError('Dashboard statistics response was empty or invalid.', null, {
          errorCode: 'INVALID_DASHBOARD_RESPONSE',
        });
      }
      return createServiceResponse(normalized, res.message || 'Dashboard statistics loaded.');
    }
    const stats = computeDashboardStats(localContext || {});
    return createServiceResponse(stats, 'Dashboard statistics computed from local storage.');
  },

  async getRecentOrders(localContext = null, limit = 5) {
    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(
        `${API_ENDPOINTS.dashboardRecentOrders}?limit=${encodeURIComponent(limit)}`,
        { method: 'GET' }
      );
      if (!res.success) return res;
      return createServiceResponse(
        normalizeRecentOrdersPayload(res.data).slice(0, limit),
        res.message || 'Recent orders loaded.'
      );
    }
    const orders = Array.isArray(localContext?.orders) ? localContext.orders.slice(0, limit) : [];
    return createServiceResponse(orders, 'Recent orders loaded from local storage.');
  },

  async getRecentMessages(localContext = null, limit = 5) {
    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(
        `${API_ENDPOINTS.dashboardRecentMessages}?limit=${encodeURIComponent(limit)}`,
        { method: 'GET' }
      );
      if (!res.success) return res;
      return createServiceResponse(
        normalizeRecentMessagesPayload(res.data).slice(0, limit),
        res.message || 'Recent messages loaded.'
      );
    }
    const inquiries = Array.isArray(localContext?.inquiries)
      ? localContext.inquiries.slice(0, limit)
      : [];
    return createServiceResponse(inquiries, 'Recent messages loaded from local storage.');
  },

  async getOrderAnalytics(localContext = null) {
    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(API_ENDPOINTS.dashboardOrderAnalytics, { method: 'GET' });
      if (!res.success) return res;
      return createServiceResponse(
        normalizeOrderAnalyticsPayload(res.data),
        res.message || 'Order analytics loaded.'
      );
    }
    return createServiceResponse(
      buildLocalAnalytics(localContext?.orders || []),
      'Order analytics computed from local storage.'
    );
  },

  async fetchOverview(localContext = null, limit = 5) {
    const settled = await Promise.allSettled([
      this.getStats(localContext),
      this.getRecentOrders(localContext, limit),
      this.getRecentMessages(localContext, limit),
      this.getOrderAnalytics(localContext),
    ]);

    const parseWidget = (entry, fallbackMsg) => {
      if (entry.status === 'rejected') {
        return {
          status: 'error',
          data: null,
          error: entry.reason?.message || fallbackMsg,
        };
      }
      if (!entry.value || entry.value.success === false) {
        return {
          status: 'error',
          data: null,
          error: entry.value?.message || fallbackMsg,
        };
      }
      return {
        status: 'ready',
        data: entry.value.data,
        error: null,
      };
    };

    return {
      stats: parseWidget(settled[0], 'Failed loading dashboard statistics.'),
      recentOrders: parseWidget(settled[1], 'Failed loading recent orders.'),
      recentMessages: parseWidget(settled[2], 'Failed loading recent messages.'),
      analytics: parseWidget(settled[3], 'Failed loading order analytics.'),
    };
  },
};
