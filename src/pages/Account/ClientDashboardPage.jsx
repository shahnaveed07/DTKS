import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  RefreshCw,
  ClipboardList,
  FileText,
  FolderKanban,
  User,
} from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext.jsx';
import { clientAccountService } from '../../services/api/clientAccountService.js';
import SEO from '../../components/common/SEO.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { formatCurrency } from '../../utils/orderUtils.js';

export default function ClientDashboardPage() {
  const navigate = useNavigate();
  const { client } = useClientAuth();
  const [orders, setOrders] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    const [ordersRes, quotesRes, projectsRes] = await Promise.all([
      clientAccountService.listOrders(),
      clientAccountService.listQuotations(),
      clientAccountService.listProjects(),
    ]);

    if (!ordersRes.success && !quotesRes.success && !projectsRes.success) {
      setErrorMessage(
        ordersRes.message ||
          quotesRes.message ||
          projectsRes.message ||
          'Unable to load your account dashboard from the server.'
      );
      setLoading(false);
      return;
    }

    const errors = [];
    if (ordersRes.success) {
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
    } else {
      errors.push(ordersRes.message || 'Orders unavailable');
    }

    if (quotesRes.success) {
      setQuotations(Array.isArray(quotesRes.data) ? quotesRes.data : []);
    } else {
      errors.push(quotesRes.message || 'Quotations unavailable');
    }

    if (projectsRes.success) {
      setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
    } else {
      errors.push(projectsRes.message || 'Projects unavailable');
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join(' · '));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const completedBuilds = projects.filter((p) => p.status === 'Completed').length;
  const activeBuilds = projects.filter((p) => p.status !== 'Completed').length;

  const kpis = [
    { label: 'Total Orders', value: orders.length, to: '/account/orders' },
    { label: 'Active Quotations', value: quotations.length, to: '/account/quotations' },
    { label: 'Active Builds', value: activeBuilds, to: '/account/projects' },
    { label: 'Completed Websites', value: completedBuilds, to: '/account/projects' },
  ];

  const recentOrders = orders.slice(0, 5);

  return (
    <>
      <SEO noindex fullTitle="Dashboard | Client Account | DTKS" />

      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Welcome back, {client?.fullName || 'Client'}
            </h1>
            <p className="mt-1 text-sm text-[#64756B]">
              Review your website orders, project quotations, delivery progress, and account settings.
            </p>
          </div>
          <Link
            to="/request-quote"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>Request New Website</span>
          </Link>
        </div>

        {/* Account Status Strip */}
        <div className="rounded-xl border border-[#E3EBE5] bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#17231C] truncate">
                {client?.email}
              </p>
              <p className="text-xs text-[#64756B]">
                {client?.businessName ? `${client.businessName} · ` : ''}
                {client?.city || 'DreamTech Kashmir Solutions Client Portal'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {client?.emailVerified ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16834A]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Verified Email</span>
              </span>
            ) : (
              <Link
                to="/verify-email"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:underline"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Verify Email</span>
              </Link>
            )}
            <Link
              to="/account/profile"
              className="text-xs font-semibold text-[#16834A] hover:text-[#116438] hover:underline whitespace-nowrap"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">
                  Unable to load complete account data
                </p>
                <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-red-200 text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Link
              key={kpi.label}
              to={kpi.to}
              className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-5 hover:border-[#16834A]/60 hover:shadow-sm transition-all"
            >
              <p className="text-xs font-medium text-[#64756B]">{kpi.label}</p>
              <p className="mt-2 font-display text-3xl font-bold text-[#116438] tabular-nums">
                {loading ? '—' : kpi.value}
              </p>
            </Link>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E3EBE5] flex items-center justify-between gap-4">
            <h2 className="font-display text-base font-semibold text-[#17231C]">
              Recent Orders
            </h2>
            <Link
              to="/account/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#16834A] hover:text-[#116438] hover:underline whitespace-nowrap"
            >
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-6 space-y-3" aria-busy="true">
              {[1, 2, 3].map((row) => (
                <div key={row} className="h-10 rounded-lg bg-[#F7FAF7] animate-pulse" />
              ))}
            </div>
          ) : recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E3EBE5] bg-[#E8F5EC]/50 text-xs text-[#116438]">
                    <th className="py-3 px-4 font-semibold">Reference</th>
                    <th className="py-3 px-4 font-semibold">Project</th>
                    <th className="py-3 px-4 font-semibold">Quote</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
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
                      <td className="py-3 px-4 font-mono-tabular text-[#17231C] whitespace-nowrap">
                        {order.quotationAmount
                          ? formatCurrency(order.quotationAmount, order.quotationCurrency || 'INR')
                          : 'Pending Quote'}
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
            <div className="p-6">
              <EmptyState
                title="No orders associated with your account yet"
                description="Submit a website development request using your account email to track progress and quotations here."
                actionLabel="Request a Website Quote"
                onAction={() => navigate('/request-quote')}
              />
            </div>
          )}
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/account/orders"
            className="rounded-xl border border-[#E3EBE5] bg-white p-5 hover:border-[#16834A]/60 transition-colors flex items-start gap-3.5"
          >
            <div className="w-9 h-9 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#17231C]">Order History</h3>
              <p className="mt-0.5 text-xs text-[#64756B]">
                Inspect specifications, timelines, and hosting choices.
              </p>
            </div>
          </Link>

          <Link
            to="/account/quotations"
            className="rounded-xl border border-[#E3EBE5] bg-white p-5 hover:border-[#16834A]/60 transition-colors flex items-start gap-3.5"
          >
            <div className="w-9 h-9 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#17231C]">Quotations</h3>
              <p className="mt-0.5 text-xs text-[#64756B]">
                Review scope estimates and pricing notes from DTKS.
              </p>
            </div>
          </Link>

          <Link
            to="/account/projects"
            className="rounded-xl border border-[#E3EBE5] bg-white p-5 hover:border-[#16834A]/60 transition-colors flex items-start gap-3.5"
          >
            <div className="w-9 h-9 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center shrink-0">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#17231C]">Active Builds</h3>
              <p className="mt-0.5 text-xs text-[#64756B]">
                Access staging previews, launch dates, and live site URLs.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
