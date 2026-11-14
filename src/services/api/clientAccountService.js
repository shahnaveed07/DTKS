import { API_ENDPOINTS } from '../models/backendModels.js';
import { createServiceError, createServiceResponse, getDataAdapterMode } from './apiClient.js';
import {
  clientApiRequest,
  getClientAccessPolicy,
  getClientAuthSession,
} from './clientApiClient.js';
import { orderService } from './orderService.js';

function getLocalClientOrders(clientEmail) {
  const clean = String(clientEmail || '').trim().toLowerCase();
  if (!clean) return [];
  return orderService
    .getAll()
    .filter((o) => String(o.customerEmail || '').trim().toLowerCase() === clean);
}

export const clientAccountService = {
  async listOrders() {
    if (getDataAdapterMode() === 'api') {
      const res = await clientApiRequest(API_ENDPOINTS.clientAccountOrders, { method: 'GET' });
      if (!res.success) return res;
      const orders = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.orders)
        ? res.data.orders
        : [];
      return createServiceResponse(orders, res.message || 'Client orders loaded.');
    }

    if (getClientAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Backend not configured.', null, { statusCode: 503 });
    }

    const session = getClientAuthSession();
    return createServiceResponse(
      getLocalClientOrders(session?.client?.email),
      'Local client orders loaded.'
    );
  },

  async listQuotations() {
    if (getDataAdapterMode() === 'api') {
      const res = await clientApiRequest(API_ENDPOINTS.clientAccountQuotations, { method: 'GET' });
      if (!res.success) return res;
      const quotations = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.quotations)
        ? res.data.quotations
        : [];
      return createServiceResponse(quotations, res.message || 'Client quotations loaded.');
    }

    if (getClientAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Backend not configured.', null, { statusCode: 503 });
    }

    const session = getClientAuthSession();
    const quoted = getLocalClientOrders(session?.client?.email)
      .filter((o) => o.quotationAmount !== null && o.quotationAmount !== undefined || o.status === 'Quotation Sent' || o.status === 'Awaiting Customer Approval')
      .map((o) => ({
        id: `quot-${o.id}`,
        orderId: o.id,
        referenceId: o.referenceId,
        projectName: o.projectName,
        amount: o.quotationAmount,
        currency: o.quotationCurrency || 'INR',
        scopeNotes: o.quotationNotes || '',
        status: o.status,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      }));
    return createServiceResponse(quoted, 'Local client quotations loaded.');
  },

  async listProjects() {
    if (getDataAdapterMode() === 'api') {
      const res = await clientApiRequest(API_ENDPOINTS.clientAccountProjects, { method: 'GET' });
      if (!res.success) return res;
      const projects = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.projects)
        ? res.data.projects
        : [];
      return createServiceResponse(projects, res.message || 'Client projects loaded.');
    }

    if (getClientAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Backend not configured.', null, { statusCode: 503 });
    }

    const session = getClientAuthSession();
    const activeStages = new Set([
      'Approved',
      'InProgress',
      'In Progress',
      'Under Testing',
      'Completed',
    ]);
    const projects = getLocalClientOrders(session?.client?.email)
      .filter((o) => activeStages.has(o.status))
      .map((o) => ({
        id: `cproj-${o.id}`,
        orderId: o.id,
        referenceId: o.referenceId,
        title: o.projectName,
        service: o.service,
        status: o.status,
        stagingUrl: o.stagingUrl || '',
        productionUrl: o.productionUrl || '',
        expectedDeliveryDate: o.expectedDeliveryDate || o.expectedTimeline || '',
        updatedAt: o.updatedAt,
      }));
    return createServiceResponse(projects, 'Local client projects loaded.');
  },
};
