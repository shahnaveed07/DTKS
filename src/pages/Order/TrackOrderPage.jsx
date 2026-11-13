import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Info, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { ORDER_STATUSES } from '../../data/seedData.js';
import PageHead from '../../components/common/PageHead.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { findTrackedOrder, formatCurrency } from '../../utils/orderUtils.js';

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const { orders } = useApp();

  const [referenceId, setReferenceId] = useState(searchParams.get('ref') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [searched, setSearched] = useState(false);
  const [matchedOrder, setMatchedOrder] = useState(null);

  useEffect(() => {
    const initialRef = searchParams.get('ref');
    const initialEmail = searchParams.get('email');
    if (initialRef && initialEmail) {
      setMatchedOrder(findTrackedOrder(orders, initialRef, initialEmail));
      setSearched(true);
    }
  }, [searchParams, orders]);

  const handleLookup = (e) => {
    e.preventDefault();
    const found = findTrackedOrder(orders, referenceId, email);
    setMatchedOrder(found);
    setSearched(true);
  };

  const handleFillDemo = () => {
    setReferenceId('DKS-2026-0001');
    setEmail('demo.customer@example.com');
    setMatchedOrder(findTrackedOrder(orders, 'DKS-2026-0001', 'demo.customer@example.com'));
    setSearched(true);
  };

  const activeStepIndex = matchedOrder
    ? ORDER_STATUSES.indexOf(matchedOrder.status)
    : -1;

  return (
    <>
      <PageHead
        title="Track Order (Demo)"
        description="Look up your DreamTech Kashmir Solutions project request status using your reference ID and email."
      />

      <section className="border-b border-[#E3EBE5] bg-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold text-[#16834A]">
            Order Status Lookup
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#17231C]">
            Track Your Project Request
          </h1>
          <p className="mt-3 text-sm text-[#64756B]">
            Enter the Reference ID generated during order submission along with your email address.
          </p>

          <div className="mt-5 rounded-xl border border-[#E3EBE5] bg-[#E8F5EC]/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs text-[#17231C]/80">
              <Info className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
              <span>
                Frontend demonstration feature reading from local browser storage, not secure server-side production tracking.
              </span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-xs font-semibold text-[#16834A] hover:text-[#116438] hover:underline whitespace-nowrap shrink-0 text-left sm:text-right"
            >
              Load Sample (DKS-2026-0001)
            </button>
          </div>
        </div>
      </section>

      <section className="py-12 bg-[#F7FAF7]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <form
            onSubmit={handleLookup}
            className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end"
          >
            <div className="sm:col-span-4">
              <label htmlFor="track-ref" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                Order Reference ID
              </label>
              <input
                id="track-ref"
                type="text"
                required
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="DKS-2026-0001"
                className="w-full px-3.5 py-2.5 text-sm font-mono-tabular rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>

            <div className="sm:col-span-5">
              <label htmlFor="track-email" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                Customer Email Address
              </label>
              <input
                id="track-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                <span>Check Status</span>
              </button>
            </div>
          </form>

          {searched && !matchedOrder && (
            <div className="rounded-xl border border-red-200 bg-white shadow-xs p-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-[#17231C]">
                  No Matching Local Request Found
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#64756B]">
                  Verify that the Reference ID and email match a request saved in this browser, or{' '}
                  <Link to="/request-quote" className="text-[#16834A] hover:underline font-medium">
                    submit a new project request
                  </Link>.
                </p>
              </div>
            </div>
          )}

          {matchedOrder && (
            <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E3EBE5]">
                <div>
                  <p className="font-mono-tabular text-xs font-semibold text-[#16834A]">
                    {matchedOrder.referenceId}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold text-[#17231C]">
                    {matchedOrder.projectName}
                  </h2>
                  <p className="mt-1 text-xs text-[#64756B]">
                    {matchedOrder.service} · Submitted {new Date(matchedOrder.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={matchedOrder.status} />
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                <div>
                  <dt className="text-xs text-[#64756B]">Selected Package</dt>
                  <dd className="mt-1 font-medium text-[#17231C]">
                    {matchedOrder.packageTitle || matchedOrder.packageId}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#64756B]">Quotation Status</dt>
                  <dd className="mt-1 font-mono-tabular font-semibold text-[#116438]">
                    {matchedOrder.quotationAmount
                      ? formatCurrency(matchedOrder.quotationAmount, matchedOrder.quotationCurrency || 'INR')
                      : 'Pending Review'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#64756B]">Estimated Budget</dt>
                  <dd className="mt-1 font-medium text-[#17231C]">
                    {matchedOrder.estimatedBudget}
                  </dd>
                </div>
              </dl>

              {matchedOrder.quotationNotes && (
                <div className="pt-4 border-t border-[#E3EBE5]">
                  <p className="text-xs font-semibold text-[#17231C]">
                    Quotation Details
                  </p>
                  <p className="mt-1 text-sm text-[#64756B]">
                    {matchedOrder.quotationNotes}
                  </p>
                </div>
              )}

              {matchedOrder.customerUpdate && (
                <div className="pt-4 border-t border-[#E3EBE5]">
                  <p className="text-xs font-semibold text-[#16834A]">
                    Latest Team Update
                  </p>
                  <p className="mt-1 text-sm text-[#17231C]">
                    {matchedOrder.customerUpdate}
                  </p>
                </div>
              )}

              {/* Workflow Stages */}
              <div className="pt-4 border-t border-[#E3EBE5]">
                <p className="text-xs font-semibold text-[#64756B] mb-3">
                  Order Lifecycle Stages
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ORDER_STATUSES.slice(0, 9).map((st, idx) => {
                    const isCurrent = st === matchedOrder.status;
                    const isPast = activeStepIndex > idx && matchedOrder.status !== 'Cancelled';
                    return (
                      <div
                        key={st}
                        className={`px-3 py-2 rounded-lg border text-xs ${
                          isCurrent
                            ? 'border-[#16834A] bg-[#E8F5EC] font-semibold text-[#116438]'
                            : isPast
                            ? 'border-[#16A34A]/30 bg-[#F7FAF7] text-[#16834A]'
                            : 'border-[#E3EBE5] text-[#64756B]'
                        }`}
                      >
                        {st}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
