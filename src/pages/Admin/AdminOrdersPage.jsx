import { useState, useMemo } from 'react';
import { Search, Eye, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { ORDER_STATUSES } from '../../data/seedData.js';
import PageHead from '../../components/common/PageHead.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { filterOrders, formatCurrency } from '../../utils/orderUtils.js';

export default function AdminOrdersPage() {
  const { orders, updateOrder, deleteOrder, requestConfirm } = useApp();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const serviceOptions = useMemo(() => {
    const unique = new Set(orders.map((o) => o.service).filter(Boolean));
    return ['All', ...Array.from(unique)];
  }, [orders]);

  const filtered = useMemo(
    () => filterOrders(orders, { query, status: statusFilter, service: serviceFilter }),
    [orders, query, statusFilter, serviceFilter]
  );

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;

  const [editDraft, setEditDraft] = useState(null);

  const openEditor = (order) => {
    setSelectedOrderId(order.id);
    setEditDraft({
      status: order.status || 'New Request',
      estimatedBudget: order.estimatedBudget || '',
      quotationAmount: order.quotationAmount ?? '',
      quotationNotes: order.quotationNotes || '',
      customerUpdate: order.customerUpdate || '',
      internalNotes: order.internalNotes || '',
    });
  };

  const handleSaveUpdate = (e) => {
    e.preventDefault();
    if (!selectedOrder || !editDraft) return;
    const numericQuote =
      editDraft.quotationAmount === '' || editDraft.quotationAmount === null
        ? null
        : Number(editDraft.quotationAmount);

    updateOrder(selectedOrder.id, {
      status: editDraft.status,
      estimatedBudget: editDraft.estimatedBudget,
      quotationAmount: Number.isNaN(numericQuote) ? null : numericQuote,
      quotationNotes: editDraft.quotationNotes,
      customerUpdate: editDraft.customerUpdate,
      internalNotes: editDraft.internalNotes,
    });
    setSelectedOrderId(null);
    setEditDraft(null);
  };

  const handleDelete = (order) => {
    requestConfirm({
      title: `Delete order ${order.referenceId}?`,
      message: `This permanently removes "${order.projectName}" from local storage.`,
      confirmLabel: 'Delete Order',
      variant: 'danger',
      onConfirm: () => {
        if (selectedOrderId === order.id) {
          setSelectedOrderId(null);
          setEditDraft(null);
        }
        deleteOrder(order.id);
      },
    });
  };

  return (
    <>
      <PageHead title="Manage Orders | Admin" />

      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#17231C]">
            Order &amp; Quotation Management
          </h1>
          <p className="mt-1 text-sm text-[#64756B]">
            Review incoming project requests, update statuses, record quotations, and publish customer-visible updates.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[#64756B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search orders"
              placeholder="Search reference ID, project, or customer..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] placeholder:text-[#64756B]/70 focus:outline-none focus:border-[#16834A]"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by order status"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
            >
              <option value="All">All Statuses</option>
              {ORDER_STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              aria-label="Filter by service category"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
            >
              {serviceOptions.map((svc) => (
                <option key={svc} value={svc}>
                  {svc === 'All' ? 'All Services' : svc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Orders Table */}
        {filtered.length > 0 ? (
          <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E3EBE5] bg-[#E8F5EC]/50 text-xs text-[#116438]">
                    <th className="py-3 px-4 font-semibold">Reference</th>
                    <th className="py-3 px-4 font-semibold">Project &amp; Service</th>
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-4 font-semibold">Quotation</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EBE5]">
                  {filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-[#F7FAF7] transition-colors">
                      <td className="py-3.5 px-4 font-mono-tabular text-xs font-semibold text-[#16834A] whitespace-nowrap">
                        {order.referenceId}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#17231C]">
                          {order.projectName}
                        </p>
                        <p className="text-xs text-[#64756B]">
                          {order.service} · {order.packageTitle || order.packageId}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-[#17231C]">{order.customerName}</p>
                        <p className="text-xs text-[#64756B]">{order.customerEmail}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-[#17231C] whitespace-nowrap">
                        {order.quotationAmount
                          ? formatCurrency(order.quotationAmount, order.quotationCurrency || 'INR')
                          : 'Not Quoted'}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditor(order)}
                            aria-label={`Inspect and update ${order.referenceId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] hover:border-[#16834A] hover:text-[#16834A] hover:bg-[#E8F5EC]/50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Manage</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(order)}
                            aria-label={`Delete ${order.referenceId}`}
                            className="p-1.5 rounded-lg border border-[#E3EBE5] text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No matching orders"
            description="Adjust your search term or filter dropdowns."
            actionLabel="Clear Filters"
            onAction={() => {
              setQuery('');
              setStatusFilter('All');
              setServiceFilter('All');
            }}
          />
        )}
      </div>

      {/* Order Detail & Quotation Modal */}
      {selectedOrder && editDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17231C]/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-modal-title"
        >
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-[#E3EBE5] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E3EBE5]">
              <div>
                <p className="font-mono-tabular text-xs font-semibold text-[#16834A]">
                  {selectedOrder.referenceId}
                </p>
                <h2 id="order-modal-title" className="font-display text-xl font-bold text-[#17231C]">
                  {selectedOrder.projectName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrderId(null);
                  setEditDraft(null);
                }}
                aria-label="Close order details"
                className="p-1.5 rounded-lg text-[#64756B] hover:text-[#17231C] hover:bg-[#F7FAF7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-[#F7FAF7] rounded-lg p-4 border border-[#E3EBE5]">
              <div>
                <p className="text-[#64756B]">Customer</p>
                <p className="font-semibold text-[#17231C] mt-0.5">
                  {selectedOrder.customerName} ({selectedOrder.customerCity})
                </p>
                <p className="text-[#64756B]">
                  {selectedOrder.customerEmail} · {selectedOrder.customerPhone}
                </p>
              </div>
              <div>
                <p className="text-[#64756B]">Scope &amp; Hosting</p>
                <p className="font-semibold text-[#17231C] mt-0.5">
                  {selectedOrder.service} · {selectedOrder.packageTitle || selectedOrder.packageId}
                </p>
                <p className="text-[#64756B]">
                  Hosting: {selectedOrder.hostingPreference} · Maintenance: {selectedOrder.maintenanceInterest}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[#64756B]">Description</p>
                <p className="text-[#17231C] mt-0.5 leading-relaxed">
                  {selectedOrder.projectDescription}
                </p>
                {selectedOrder.requiredPages && (
                  <p className="mt-1 text-[#64756B]">
                    Pages: {selectedOrder.requiredPages}
                  </p>
                )}
                {selectedOrder.requiredFunctionality && (
                  <p className="mt-0.5 text-[#64756B]">
                    Functionality: {selectedOrder.requiredFunctionality}
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveUpdate} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="edit-order-status" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Order Status
                  </label>
                  <select
                    id="edit-order-status"
                    value={editDraft.status}
                    onChange={(e) => setEditDraft((d) => ({ ...d, status: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  >
                    {ORDER_STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-order-budget" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Estimated Budget
                  </label>
                  <input
                    id="edit-order-budget"
                    type="text"
                    value={editDraft.estimatedBudget}
                    onChange={(e) => setEditDraft((d) => ({ ...d, estimatedBudget: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>

                <div>
                  <label htmlFor="edit-order-quote" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Quotation Amount (INR)
                  </label>
                  <input
                    id="edit-order-quote"
                    type="number"
                    min="0"
                    value={editDraft.quotationAmount}
                    onChange={(e) => setEditDraft((d) => ({ ...d, quotationAmount: e.target.value }))}
                    placeholder="Leave blank if pending"
                    className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-quote-notes" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Quotation Notes (Visible in Order Tracking)
                </label>
                <textarea
                  id="edit-quote-notes"
                  rows={2}
                  value={editDraft.quotationNotes}
                  onChange={(e) => setEditDraft((d) => ({ ...d, quotationNotes: e.target.value }))}
                  placeholder="Scope summary, milestone payment terms, or validity..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>

              <div>
                <label htmlFor="edit-customer-update" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Customer-Visible Status Update
                </label>
                <textarea
                  id="edit-customer-update"
                  rows={2}
                  value={editDraft.customerUpdate}
                  onChange={(e) => setEditDraft((d) => ({ ...d, customerUpdate: e.target.value }))}
                  placeholder="Message shown to customer on Track Order page..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>

              <div>
                <label htmlFor="edit-internal-notes" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Internal Admin Notes (Not Shown on Tracking Page)
                </label>
                <textarea
                  id="edit-internal-notes"
                  rows={2}
                  value={editDraft.internalNotes}
                  onChange={(e) => setEditDraft((d) => ({ ...d, internalNotes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderId(null);
                    setEditDraft(null);
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
                >
                  Save Order Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
