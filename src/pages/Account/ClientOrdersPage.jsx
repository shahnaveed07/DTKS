import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Eye, X, AlertCircle, RefreshCw, PlusCircle } from 'lucide-react';
import { clientAccountService } from '../../services/api/clientAccountService.js';
import SEO from '../../components/common/SEO.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { formatCurrency } from '../../utils/orderUtils.js';

export default function ClientOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    const res = await clientAccountService.listOrders();
    if (!res.success) {
      setErrorMessage(res.message || 'Unable to load your website orders.');
      setLoading(false);
      return;
    }
    setOrders(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const statuses = useMemo(() => {
    const unique = Array.from(new Set(orders.map((o) => o.status).filter(Boolean)));
    return ['All', ...unique];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== 'All' && order.status !== statusFilter) return false;
      if (!q) return true;
      return [order.referenceId, order.projectName, order.service, order.businessName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [orders, query, statusFilter]);

  return (
    <>
      <SEO noindex fullTitle="My Orders | Client Account | DTKS" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              My Website Orders
            </h1>
            <p className="mt-1 text-sm text-[#64756B]">
              Track submitted project requests, quotations, and delivery timelines.
            </p>
          </div>
          <Link
            to="/request-quote"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>New Website Request</span>
          </Link>
        </div>

        {/* Search & Filter */}
        <div className="rounded-xl border border-[#E3EBE5] bg-white p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#64756B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by reference ID, project title, or service..."
              aria-label="Search orders"
              className="w-full pl-10 pr-3.5 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by order status"
            className="px-3.5 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
          >
            {statuses.map((st) => (
              <option key={st} value={st}>
                {st === 'All' ? 'All Statuses' : st}
              </option>
            ))}
          </select>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Failed to fetch orders</p>
                <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadOrders}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-red-200 text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3" aria-busy="true">
              {[1, 2, 3].map((row) => (
                <div key={row} className="h-12 rounded-lg bg-[#F7FAF7] animate-pulse" />
              ))}
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E3EBE5] bg-[#E8F5EC]/50 text-xs text-[#116438]">
                    <th className="py-3 px-4 font-semibold">Reference</th>
                    <th className="py-3 px-4 font-semibold">Project</th>
                    <th className="py-3 px-4 font-semibold">Hosting</th>
                    <th className="py-3 px-4 font-semibold">Quotation</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EBE5]">
                  {filteredOrders.map((order) => (
                    <tr key={order.id || order.referenceId} className="hover:bg-[#F7FAF7] transition-colors">
                      <td className="py-3.5 px-4 font-mono-tabular text-xs font-semibold text-[#16834A] whitespace-nowrap">
                        {order.referenceId}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-[#17231C]">{order.projectName}</p>
                        <p className="text-xs text-[#64756B]">{order.service}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#64756B] whitespace-nowrap">
                        {order.hostingPreference || 'Not specified'}
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-[#17231C] whitespace-nowrap">
                        {order.quotationAmount
                          ? formatCurrency(order.quotationAmount, order.quotationCurrency || 'INR')
                          : 'Pending'}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E3EBE5] text-[#17231C] hover:border-[#16834A] hover:text-[#16834A] transition-colors whitespace-nowrap"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title={orders.length === 0 ? 'No orders yet' : 'No matching orders'}
                description={
                  orders.length === 0
                    ? 'You have not placed any website orders with your account email yet.'
                    : 'Try clearing your search filter to view all orders.'
                }
                actionLabel={orders.length === 0 ? 'Request a Quote' : 'Reset Filters'}
                onAction={() => {
                  if (orders.length === 0) {
                    navigate('/request-quote');
                  } else {
                    setQuery('');
                    setStatusFilter('All');
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-order-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17231C]/45 backdrop-blur-xs"
        >
          <div className="w-full max-w-xl rounded-xl border border-[#E3EBE5] bg-white shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E3EBE5] flex items-center justify-between">
              <div>
                <p className="font-mono-tabular text-xs font-semibold text-[#16834A]">
                  {selectedOrder.referenceId}
                </p>
                <h2 id="client-order-detail-title" className="text-base font-bold text-[#17231C]">
                  {selectedOrder.projectName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
                className="p-1.5 rounded-lg text-[#64756B] hover:text-[#17231C] hover:bg-[#F7FAF7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-sm">
              <div className="flex items-center justify-between py-2 border-b border-[#E3EBE5]">
                <span className="text-[#64756B]">Current Status</span>
                <StatusBadge status={selectedOrder.status} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#64756B]">Website Category</p>
                  <p className="font-medium text-[#17231C] mt-0.5">{selectedOrder.service || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64756B]">Package</p>
                  <p className="font-medium text-[#17231C] mt-0.5">{selectedOrder.packageName || 'Custom Quote'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64756B]">Hosting Preference</p>
                  <p className="font-medium text-[#17231C] mt-0.5">{selectedOrder.hostingPreference || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64756B]">Maintenance Plan</p>
                  <p className="font-medium text-[#17231C] mt-0.5">{selectedOrder.maintenanceInterest || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64756B]">Estimated Budget</p>
                  <p className="font-medium text-[#17231C] mt-0.5">{selectedOrder.estimatedBudget || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64756B]">Quotation</p>
                  <p className="font-mono-tabular font-semibold text-[#116438] mt-0.5">
                    {selectedOrder.quotationAmount
                      ? formatCurrency(selectedOrder.quotationAmount, selectedOrder.quotationCurrency || 'INR')
                      : 'Under Review'}
                  </p>
                </div>
              </div>

              {selectedOrder.projectDescription && (
                <div>
                  <p className="text-xs text-[#64756B]">Project Brief</p>
                  <p className="mt-1 text-sm text-[#17231C] leading-relaxed whitespace-pre-line">
                    {selectedOrder.projectDescription}
                  </p>
                </div>
              )}

              {selectedOrder.quotationNotes && (
                <div className="rounded-lg border border-[#E3EBE5] bg-[#F7FAF7] p-3.5">
                  <p className="text-xs font-semibold text-[#116438]">Quotation Notes</p>
                  <p className="mt-1 text-xs text-[#17231C] leading-relaxed">
                    {selectedOrder.quotationNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#E3EBE5] bg-[#F7FAF7] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] hover:bg-[#E8F5EC]/50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
