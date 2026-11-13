import { useState, useMemo } from 'react';
import { Search, Eye, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { ORDER_STATUSES, WEBSITE_CATEGORIES } from '../../data/seedData.js';
import SEO from '../../components/common/SEO.jsx';
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
    const unique = new Set([
      ...WEBSITE_CATEGORIES,
      ...orders.map((o) => o.service).filter(Boolean),
    ]);
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
      expectedDeliveryDate: order.expectedDeliveryDate || '',
      quotationAmount: order.quotationAmount ?? '',
      quotationNotes: order.quotationNotes || '',
      domainPreference: order.domainPreference || 'Need domain advice',
      hostingPreference: order.hostingPreference || 'Need advice',
      hostingNotes: order.hostingNotes || '',
      maintenanceInterest: order.maintenanceInterest || 'Need more information',
      maintenancePlanSelected: order.maintenancePlanSelected || 'Undecided',
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
      expectedDeliveryDate: editDraft.expectedDeliveryDate,
      quotationAmount: Number.isNaN(numericQuote) ? null : numericQuote,
      quotationNotes: editDraft.quotationNotes,
      domainPreference: editDraft.domainPreference,
      hostingPreference: editDraft.hostingPreference,
      hostingNotes: editDraft.hostingNotes,
      maintenanceInterest: editDraft.maintenanceInterest,
      maintenancePlanSelected: editDraft.maintenancePlanSelected,
      customerUpdate: editDraft.customerUpdate,
      internalNotes: editDraft.internalNotes,
    });
    setSelectedOrderId(null);
    setEditDraft(null);
  };

  const handleDelete = (order) => {
    requestConfirm({
      title: `Delete website order ${order.referenceId}?`,
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
      <SEO noindex fullTitle="Manage Website Orders | Admin | DTKS" />

      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#17231C]">
            Website Orders, Quotations &amp; Progress
          </h1>
          <p className="mt-1 text-sm text-[#64756B]">
            Manage website development orders, update build progress, issue quotations, coordinate hosting arrangements, and assign maintenance plans.
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
              aria-label="Search website orders"
              placeholder="Search reference ID, website, business, or customer..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] placeholder:text-[#64756B]/70 focus:outline-none focus:border-[#16834A]"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by order status"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
            >
              <option value="All">All Progress Stages</option>
              {ORDER_STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              aria-label="Filter by website category"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
            >
              {serviceOptions.map((svc) => (
                <option key={svc} value={svc}>
                  {svc === 'All' ? 'All Website Categories' : svc}
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
                    <th className="py-3 px-4 font-semibold">Website &amp; Category</th>
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-4 font-semibold">Hosting &amp; Care</th>
                    <th className="py-3 px-4 font-semibold">Quotation</th>
                    <th className="py-3 px-4 font-semibold">Progress</th>
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
                        <p className="text-xs text-[#64756B]">{order.businessName || order.customerEmail}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#64756B]">
                        <p className="text-[#17231C] font-medium">{order.hostingPreference}</p>
                        <p>
                          Care: {order.maintenancePlanSelected && order.maintenancePlanSelected !== 'Undecided'
                            ? order.maintenancePlanSelected
                            : order.maintenanceInterest}
                        </p>
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
            title="No matching website orders"
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

      {/* Order Detail, Hosting, Maintenance & Quotation Modal */}
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
                <p className="text-[#64756B]">Customer &amp; Business</p>
                <p className="font-semibold text-[#17231C] mt-0.5">
                  {selectedOrder.customerName} — {selectedOrder.businessName || 'Individual'}
                </p>
                <p className="text-[#64756B]">
                  {selectedOrder.customerEmail} · {selectedOrder.customerPhone} · {selectedOrder.customerCity}
                </p>
              </div>
              <div>
                <p className="text-[#64756B]">Website Category &amp; Package</p>
                <p className="font-semibold text-[#17231C] mt-0.5">
                  {selectedOrder.service} · {selectedOrder.packageTitle || selectedOrder.packageId}
                </p>
                <p className="text-[#64756B]">
                  Target Date: {selectedOrder.expectedDeliveryDate || selectedOrder.expectedTimeline || 'Flexible'}
                </p>
              </div>
              <div className="md:col-span-2 space-y-1">
                <p className="text-[#64756B]">Website Purpose</p>
                <p className="text-[#17231C] leading-relaxed">
                  {selectedOrder.projectDescription}
                </p>
                {selectedOrder.requiredPages && (
                  <p className="text-[#64756B]">
                    <strong className="text-[#17231C]">Pages:</strong> {selectedOrder.requiredPages}
                  </p>
                )}
                {selectedOrder.requiredFunctionality && (
                  <p className="text-[#64756B]">
                    <strong className="text-[#17231C]">Functionality:</strong> {selectedOrder.requiredFunctionality}
                  </p>
                )}
                {selectedOrder.referenceWebsites && (
                  <p className="text-[#64756B]">
                    <strong className="text-[#17231C]">Reference Websites:</strong> {selectedOrder.referenceWebsites}
                  </p>
                )}
                {selectedOrder.preferredDesignStyle && (
                  <p className="text-[#64756B]">
                    <strong className="text-[#17231C]">Design Preferences:</strong> {selectedOrder.preferredDesignStyle}
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveUpdate} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="edit-order-status" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Project Progress
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
                  <label htmlFor="edit-order-quote" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Quotation Amount (INR)
                  </label>
                  <input
                    id="edit-order-quote"
                    type="number"
                    min="0"
                    value={editDraft.quotationAmount}
                    onChange={(e) => setEditDraft((d) => ({ ...d, quotationAmount: e.target.value }))}
                    placeholder="Blank if pending"
                    className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>

                <div>
                  <label htmlFor="edit-order-delivery" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    id="edit-order-delivery"
                    type="date"
                    value={editDraft.expectedDeliveryDate}
                    onChange={(e) => setEditDraft((d) => ({ ...d, expectedDeliveryDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
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
              </div>

              {/* Hosting Arrangement & Maintenance Plan Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E3EBE5]">
                <div>
                  <label htmlFor="edit-order-domain" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Domain Arrangement
                  </label>
                  <select
                    id="edit-order-domain"
                    value={editDraft.domainPreference}
                    onChange={(e) => setEditDraft((d) => ({ ...d, domainPreference: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  >
                    <option value="Already own a domain">Already own a domain</option>
                    <option value="Need new domain registration">Need new domain registration</option>
                    <option value="Need domain advice">Need domain advice</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-order-hosting" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Hosting Arrangement
                  </label>
                  <select
                    id="edit-order-hosting"
                    value={editDraft.hostingPreference}
                    onChange={(e) => setEditDraft((d) => ({ ...d, hostingPreference: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  >
                    <option value="Customer-managed">Customer-managed</option>
                    <option value="DreamTech-managed">DreamTech-managed</option>
                    <option value="Need advice">Need advice</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-order-maint-plan" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Maintenance Plan
                  </label>
                  <select
                    id="edit-order-maint-plan"
                    value={editDraft.maintenancePlanSelected}
                    onChange={(e) => setEditDraft((d) => ({ ...d, maintenancePlanSelected: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  >
                    <option value="Undecided">Undecided</option>
                    <option value="None">None</option>
                    <option value="Basic">Basic Plan</option>
                    <option value="Standard">Standard Plan</option>
                    <option value="Premium">Premium Plan</option>
                    <option value="Custom">Custom Retainer</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit-hosting-notes" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Hosting &amp; Domain Setup Notes
                </label>
                <input
                  id="edit-hosting-notes"
                  type="text"
                  value={editDraft.hostingNotes}
                  onChange={(e) => setEditDraft((d) => ({ ...d, hostingNotes: e.target.value }))}
                  placeholder="Domain registrar, DNS verification, SSL status, or renewal schedule..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
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
