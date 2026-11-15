import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, PlusCircle, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { dashboardService } from '../../services/api/dashboardService.js';
import SEO from '../../components/common/SEO.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import {
  ResourceErrorNotice,
  ResourceLoadingNotice,
} from '../../components/common/ResourceNotice.jsx';
import { computeDashboardStats, formatCurrency } from '../../utils/orderUtils.js';

export default function AdminDashboardPage() {
  const {
    orders,
    inquiries,
    portfolio,
    team,
    dataAdapterMode,
    isLoading,
    resourceStatus,
  } = useApp();
  const isApiMode = dataAdapterMode === 'api';

  const [overview, setOverview] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(isApiMode);

  const loadApiDashboard = useCallback(async () => {
    if (!isApiMode) return;
    setLoadingDashboard(true);
    try {
      const next = await dashboardService.fetchOverview(null, 5);
      setOverview(next);
    } finally {
      setLoadingDashboard(false);
    }
  }, [isApiMode]);

  useEffect(() => {
    if (isApiMode) {
      loadApiDashboard();
    }
  }, [isApiMode, loadApiDashboard]);

  const localStats = computeDashboardStats({ orders, inquiries, portfolio, team });
  const localRecentOrders = orders.slice(0, 5);
  const localRecentInquiries = inquiries.slice(0, 5);

  const statsWidget = isApiMode
    ? overview?.stats || { status: loadingDashboard ? 'loading' : 'ready', data: null, error: null }
    : { status: 'ready', data: localStats, error: null };

  const recentOrdersWidget = isApiMode
    ? overview?.recentOrders || {
        status: loadingDashboard ? 'loading' : 'ready',
        data: [],
        error: null,
      }
    : { status: 'ready', data: localRecentOrders, error: null };

  const recentMessagesWidget = isApiMode
    ? overview?.recentMessages || {
        status: loadingDashboard ? 'loading' : 'ready',
        data: [],
        error: null,
      }
    : { status: 'ready', data: localRecentInquiries, error: null };

  const analyticsWidget = isApiMode
    ? overview?.analytics || {
        status: loadingDashboard ? 'loading' : 'ready',
        data: null,
        error: null,
      }
    : {
        status: 'ready',
        data: null,
        error: null,
      };

  const renderStatValue = (val) => {
    if (isApiMode && (loadingDashboard || !overview)) {
      return '…';
    }
    if (statsWidget.status === 'error') {
      return '—';
    }
    if (val === null || val === undefined) {
      return '—';
    }
    return val;
  };

  const statsData = statsWidget.data || {};
  const kpis = [
    { label: 'Website Orders', value: renderStatValue(statsData.totalOrders), to: '/admin/orders' },
    { label: 'Active Website Builds', value: renderStatValue(statsData.activeProjects), to: '/admin/orders' },
    { label: 'Pending Quotations', value: renderStatValue(statsData.pendingQuotations), to: '/admin/orders' },
    { label: 'Completed Websites', value: renderStatValue(statsData.completedProjects), to: '/admin/orders' },
    { label: 'DreamTech Hosting', value: renderStatValue(statsData.managedHostingOrders), to: '/admin/orders' },
    { label: 'Maintenance Requests', value: renderStatValue(statsData.maintenanceInterestedOrders), to: '/admin/packages' },
    { label: 'Published Portfolio', value: renderStatValue(statsData.portfolioProjects), to: '/admin/portfolio' },
    { label: 'New Inquiries', value: renderStatValue(statsData.newInquiries), to: '/admin/inquiries' },
  ];

  const recentOrders = Array.isArray(recentOrdersWidget.data) ? recentOrdersWidget.data : [];
  const recentInquiries = Array.isArray(recentMessagesWidget.data) ? recentMessagesWidget.data : [];
  const analytics = analyticsWidget.data;

  const canEvaluateSetupBanner =
    !isApiMode ||
    (!isLoading &&
      resourceStatus?.portfolio !== 'loading' &&
      resourceStatus?.portfolio !== 'error' &&
      resourceStatus?.team !== 'loading' &&
      resourceStatus?.team !== 'error');

  const showSetupBanner = canEvaluateSetupBanner && (portfolio.length === 0 || team.length === 0);

  return (
    <>
      <SEO noindex fullTitle="Overview | Admin | DTKS" />

      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Website Operations Overview
            </h1>
            <p className="mt-1 text-sm text-[#64756B]">
              Manage incoming website development orders, quotations, project progress, hosting arrangements, maintenance plans, packages, portfolio, team, and inquiries.
            </p>
          </div>
          {isApiMode && (
            <button
              type="button"
              onClick={loadApiDashboard}
              disabled={loadingDashboard}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#E3EBE5] bg-white hover:bg-[#F7FAF7] text-[#17231C] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#16834A] ${loadingDashboard ? 'animate-spin' : ''}`} />
              <span>{loadingDashboard ? 'Refreshing...' : 'Refresh Analytics'}</span>
            </button>
          )}
        </div>

        {showSetupBanner && (
          <div className="rounded-xl border border-[#16834A]/30 bg-[#E8F5EC]/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <PlusCircle className="w-5 h-5 text-[#16834A] shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-[#17231C]">
                  Add your first project, team member or package to get started.
                </h2>
                <p className="mt-0.5 text-xs text-[#64756B]">
                  All sample records have been removed. Populate your verified portfolio, team profiles, and business contact details below.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                to="/admin/portfolio"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
              >
                Add Project
              </Link>
              <Link
                to="/admin/team"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#16834A] text-[#16834A] hover:bg-[#F7FAF7] transition-colors"
              >
                Add Team Member
              </Link>
              <Link
                to="/admin/packages"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7] transition-colors"
              >
                Configure Packages
              </Link>
            </div>
          </div>
        )}

        {statsWidget.status === 'error' && (
          <ResourceErrorNotice
            title="Dashboard KPI statistics unavailable"
            message={statsWidget.error}
            onRetry={loadApiDashboard}
            retrying={loadingDashboard}
          />
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Link
              key={kpi.label}
              to={kpi.to}
              className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-5 hover:border-[#16834A]/60 hover:shadow-sm transition-all"
            >
              <p className="text-xs font-medium text-[#64756B]">
                {kpi.label}
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-[#116438] tabular-nums">
                {kpi.value}
              </p>
              {isApiMode && statsWidget.status === 'error' && (
                <p className="mt-1 text-[11px] text-red-600">Unavailable</p>
              )}
            </Link>
          ))}
        </div>

        {/* Order Analytics Breakdown (Real Backend Data in API Mode) */}
        {isApiMode && (
          <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E3EBE5] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#16834A]" />
                <h2 className="font-display text-base font-semibold text-[#17231C]">
                  Order Analytics Breakdown
                </h2>
              </div>
              {analytics && analyticsWidget.status === 'ready' && (
                <span className="text-xs text-[#64756B] font-mono-tabular">
                  {analytics.totalAnalyzed} total orders analyzed
                </span>
              )}
            </div>

            <div className="p-6">
              {loadingDashboard && !overview ? (
                <ResourceLoadingNotice label="Loading order analytics from backend..." />
              ) : analyticsWidget.status === 'error' ? (
                <ResourceErrorNotice
                  title="Order analytics unavailable"
                  message={analyticsWidget.error}
                  onRetry={loadApiDashboard}
                  retrying={loadingDashboard}
                />
              ) : analytics &&
                (analytics.byStatus.length > 0 ||
                  analytics.byService.length > 0 ||
                  analytics.timeline.length > 0) ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {analytics.byStatus.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64756B] mb-3">
                        Orders by Stage
                      </h3>
                      <div className="space-y-2">
                        {analytics.byStatus.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between text-xs rounded-lg border border-[#E3EBE5] bg-[#F7FAF7] px-3.5 py-2"
                          >
                            <span className="font-medium text-[#17231C]">{item.label}</span>
                            <span className="font-mono-tabular font-semibold text-[#116438]">
                              {item.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analytics.byService.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64756B] mb-3">
                        Orders by Website Category
                      </h3>
                      <div className="space-y-2">
                        {analytics.byService.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between text-xs rounded-lg border border-[#E3EBE5] bg-[#F7FAF7] px-3.5 py-2"
                          >
                            <span className="font-medium text-[#17231C] truncate pr-3">
                              {item.label}
                            </span>
                            <span className="font-mono-tabular font-semibold text-[#116438] shrink-0">
                              {item.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analytics.timeline.length > 0 && (
                    <div className="lg:col-span-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64756B] mb-3">
                        Order Volume Over Time
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                        {analytics.timeline.map((point) => (
                          <div
                            key={point.label}
                            className="rounded-lg border border-[#E3EBE5] bg-[#F7FAF7] px-3 py-2 text-center"
                          >
                            <p className="text-[11px] text-[#64756B] truncate">{point.label}</p>
                            <p className="mt-1 font-display text-lg font-bold text-[#116438] tabular-nums">
                              {point.count}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#64756B]">
                  No order analytics data recorded yet.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Recent Website Orders Table */}
        <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E3EBE5] flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#17231C]">
              Recent Website Orders
            </h2>
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#16834A] hover:text-[#116438] hover:underline"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {isApiMode && loadingDashboard && !overview ? (
            <div className="p-6">
              <ResourceLoadingNotice label="Loading recent orders..." />
            </div>
          ) : recentOrdersWidget.status === 'error' ? (
            <div className="p-6">
              <ResourceErrorNotice
                title="Unable to load recent orders"
                message={recentOrdersWidget.error}
                onRetry={loadApiDashboard}
                retrying={loadingDashboard}
              />
            </div>
          ) : recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E3EBE5] bg-[#E8F5EC]/50 text-xs text-[#116438]">
                    <th className="py-3 px-4 font-semibold">Reference</th>
                    <th className="py-3 px-4 font-semibold">Website &amp; Category</th>
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-4 font-semibold">Hosting</th>
                    <th className="py-3 px-4 font-semibold">Quote</th>
                    <th className="py-3 px-4 font-semibold">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EBE5]">
                  {recentOrders.map((order) => (
                    <tr key={order.id || order.referenceId} className="hover:bg-[#F7FAF7] transition-colors">
                      <td className="py-3 px-4 font-mono-tabular text-xs font-semibold text-[#16834A] whitespace-nowrap">
                        {order.referenceId}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#17231C]">{order.projectName}</p>
                        <p className="text-xs text-[#64756B]">{order.service}</p>
                      </td>
                      <td className="py-3 px-4 text-[#64756B]">
                        {order.customerName}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#64756B] whitespace-nowrap">
                        {order.hostingPreference}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-[#17231C] whitespace-nowrap">
                        {order.quotationAmount
                          ? formatCurrency(order.quotationAmount, order.quotationCurrency || 'INR')
                          : 'Pending'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-6 py-6 text-sm text-[#64756B]">
              No orders received yet.
            </p>
          )}
        </div>

        {/* Recent Inquiries */}
        <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E3EBE5] flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#17231C]">
              Recent Customer Inquiries
            </h2>
            <Link
              to="/admin/inquiries"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#16834A] hover:text-[#116438] hover:underline"
            >
              <span>Manage Inquiries</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {isApiMode && loadingDashboard && !overview ? (
            <div className="p-6">
              <ResourceLoadingNotice label="Loading recent customer inquiries..." />
            </div>
          ) : recentMessagesWidget.status === 'error' ? (
            <div className="p-6">
              <ResourceErrorNotice
                title="Unable to load recent customer inquiries"
                message={recentMessagesWidget.error}
                onRetry={loadApiDashboard}
                retrying={loadingDashboard}
              />
            </div>
          ) : (
            <div className="divide-y divide-[#E3EBE5]">
              {recentInquiries.length > 0 ? (
                recentInquiries.map((inq) => (
                  <div
                    key={inq.id}
                    className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#17231C]">
                        {inq.subject}
                      </p>
                      <p className="text-xs text-[#64756B]">
                        {inq.name} · {inq.email}
                      </p>
                    </div>
                    <StatusBadge status={inq.status} />
                  </div>
                ))
              ) : (
                <p className="px-6 py-6 text-sm text-[#64756B]">
                  No customer inquiries yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
