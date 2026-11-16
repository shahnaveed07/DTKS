import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Search, Info, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import SEO from '../../components/common/SEO.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import {
  buildSanitizedTokenUrl,
  extractTokenDetailsFromUrl,
} from '../../utils/authValidation.js';
import {
  findTrackedOrder,
  formatCurrency,
  sanitizeTrackedOrder,
} from '../../utils/orderUtils.js';

const CANONICAL_TRACKING_STAGES = [
  'New Request',
  'Under Review',
  'Quotation Sent',
  'Confirmed',
  'In Progress',
  'Under Testing',
  'Completed',
];

const TRACKING_STAGE_ALIASES = {
  Pending: 'New Request',
  'New Request': 'New Request',
  Reviewed: 'Under Review',
  'In Review': 'Under Review',
  'Under Review': 'Under Review',
  'Requirements Clarification': 'Under Review',
  'Quotation Sent': 'Quotation Sent',
  'Awaiting Confirmation': 'Quotation Sent',
  'Awaiting Customer Approval': 'Quotation Sent',
  Confirmed: 'Confirmed',
  Approved: 'Confirmed',
  InProgress: 'In Progress',
  'In Progress': 'In Progress',
  'Ready for Review': 'Under Testing',
  'Under Testing': 'Under Testing',
  Completed: 'Completed',
};

function formatTrackingErrorMessage(res) {
  if (!res) return 'Unable to retrieve order tracking details right now.';
  const code = String(res.errorCode || '').toUpperCase();
  const status = Number(res.statusCode || 0);
  if (code === 'LEGACY_TRACKING_DISABLED' || status === 410) {
    return 'Reference ID and email lookup has been disabled for privacy. Please open or paste the confidential tracking token from your order confirmation email.';
  }
  if (code === 'RATE_LIMITED' || code === 'TOO_MANY_REQUESTS' || status === 429) {
    return 'Too many order tracking attempts. Please wait a few minutes before trying again.';
  }
  if (code === 'ORDER_NOT_FOUND' || code === 'INVALID_TOKEN' || status === 404) {
    return 'This order tracking token is invalid, expired, or has been revoked. Check your latest confirmation email or sign in to your Client Portal.';
  }
  return res.message || 'Unable to reach the order tracking service right now.';
}

export default function TrackOrderPage() {
  const location = useLocation();
  const { orders, settings, trackOrder, submissionMode } = useApp();
  const isLocalDemoMode = submissionMode === 'local_demo';

  // Volatile component state only; never persist tracking tokens in storage or URL history.
  const [trackingToken, setTrackingToken] = useState(() =>
    extractTokenDetailsFromUrl({
      hash: location.hash,
      search: location.search,
      paramName: 'token',
      allowQueryFallback: false,
    }).token
  );
  const [referenceId, setReferenceId] = useState(() => {
    if (!isLocalDemoMode) return '';
    const stateRef =
      typeof location.state?.prefillReferenceId === 'string'
        ? location.state.prefillReferenceId.trim()
        : '';
    if (stateRef) return stateRef;
    return extractTokenDetailsFromUrl({
      hash: location.hash,
      search: location.search,
      paramName: 'ref',
      allowQueryFallback: true,
    }).token;
  });
  const [email, setEmail] = useState(() =>
    isLocalDemoMode
      ? extractTokenDetailsFromUrl({
          hash: location.hash,
          search: location.search,
          paramName: 'email',
          allowQueryFallback: true,
        }).token
      : ''
  );
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [matchedOrder, setMatchedOrder] = useState(null);
  const autoLookupKeyRef = useRef('');

  useEffect(() => {
    const { token: urlTrackingToken } = extractTokenDetailsFromUrl({
      hash: location.hash,
      search: location.search,
      paramName: 'token',
      allowQueryFallback: false,
    });
    const urlRef = isLocalDemoMode
      ? extractTokenDetailsFromUrl({
          hash: location.hash,
          search: location.search,
          paramName: 'ref',
          allowQueryFallback: true,
        }).token
      : '';
    const urlEmail = isLocalDemoMode
      ? extractTokenDetailsFromUrl({
          hash: location.hash,
          search: location.search,
          paramName: 'email',
          allowQueryFallback: true,
        }).token
      : '';

    if (urlTrackingToken) {
      setTrackingToken(urlTrackingToken);
    }
    if (isLocalDemoMode) {
      if (urlRef) setReferenceId(urlRef);
      if (urlEmail) setEmail(urlEmail);
    }

    // Scrub sensitive fragment/query parameters BEFORE dispatching any async network lookup.
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const { nextUrl, hadTokenInUrl } = buildSanitizedTokenUrl({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        paramNames: ['token', 'ref', 'email'],
      });
      if (hadTokenInUrl) {
        window.history.replaceState(window.history.state, document.title, nextUrl);
      }
    }

    if (!isLocalDemoMode && urlTrackingToken) {
      const lookupKey = `token:${urlTrackingToken}:${submissionMode}`;
      if (autoLookupKeyRef.current === lookupKey) return;
      autoLookupKeyRef.current = lookupKey;

      if (submissionMode === 'production_unconfigured') {
        setLookupError(
          'Online order tracking is currently unavailable while the production backend API is being configured.'
        );
        setMatchedOrder(null);
        setSearched(true);
        return;
      }

      setIsSearching(true);
      trackOrder({ token: urlTrackingToken })
        .then((res) => {
          if (res?.success && res.data) {
            setMatchedOrder(res.data);
            setLookupError('');
            setTrackingToken('');
          } else {
            setMatchedOrder(null);
            setLookupError(formatTrackingErrorMessage(res));
          }
          setSearched(true);
        })
        .finally(() => setIsSearching(false));
      return;
    }

    if (isLocalDemoMode && urlRef && urlEmail) {
      const queryKey = `${urlRef}:${urlEmail}:${submissionMode}`;
      if (autoLookupKeyRef.current === queryKey) return;
      autoLookupKeyRef.current = queryKey;
      setMatchedOrder(sanitizeTrackedOrder(findTrackedOrder(orders, urlRef, urlEmail)));
      setSearched(true);
    }
  }, [isLocalDemoMode, location.hash, location.search, orders, submissionMode, trackOrder]);

  const handleLookup = async (e) => {
    e.preventDefault();
    setLookupError('');
    if (submissionMode === 'production_unconfigured') {
      setLookupError(
        'Online order tracking is currently unavailable while the production backend API is being configured.'
      );
      setMatchedOrder(null);
      setSearched(true);
      return;
    }
    if (!isLocalDemoMode) {
      const cleanToken = String(trackingToken || '').trim();
      if (!cleanToken) {
        setLookupError('Please enter the confidential tracking token from your order email.');
        setMatchedOrder(null);
        setSearched(true);
        return;
      }
      setIsSearching(true);
      try {
        const res = await trackOrder({ token: cleanToken });
        if (res?.success && res.data) {
          setMatchedOrder(res.data);
          setLookupError('');
          setTrackingToken('');
        } else {
          setMatchedOrder(null);
          setLookupError(formatTrackingErrorMessage(res));
        }
      } finally {
        setIsSearching(false);
        setSearched(true);
      }
      return;
    }

    const found = findTrackedOrder(orders, referenceId, email);
    setMatchedOrder(sanitizeTrackedOrder(found));
    setSearched(true);
  };

  const isClosedStatus =
    matchedOrder?.status === 'Cancelled' || matchedOrder?.status === 'Rejected';
  const normalizedStage = matchedOrder
    ? TRACKING_STAGE_ALIASES[matchedOrder.status] || matchedOrder.status
    : '';
  const activeStepIndex = normalizedStage
    ? CANONICAL_TRACKING_STAGES.indexOf(normalizedStage)
    : -1;
  const statusHistory = Array.isArray(matchedOrder?.statusHistory)
    ? matchedOrder.statusHistory
    : [];

  return (
    <>
      <SEO noindex referrerPolicy="no-referrer" settings={settings} />

      <section className="border-b border-[#E3EBE5] bg-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold text-[#16834A]">
            Order Status Lookup
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#17231C]">
            Track Your Project Request
          </h1>
          <p className="mt-3 text-sm text-[#64756B]">
            {isLocalDemoMode
              ? 'Enter the Reference ID generated during order submission along with your email address.'
              : 'Open the confidential tracking link sent to your order email, or paste your tracking token below.'}
          </p>

          {!isLocalDemoMode ? (
            <div className="mt-5 rounded-xl border border-[#E3EBE5] bg-[#E8F5EC]/50 px-4 py-3 flex items-start gap-2.5 text-xs text-[#17231C]/85">
              <ShieldCheck className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
              <span>
                Confidential token verification protects your project milestones and quotation details. Have a client account?{' '}
                <Link to="/login" className="font-semibold text-[#16834A] hover:underline">
                  Sign in to your Client Portal
                </Link>{' '}
                to view all orders in one place.
              </span>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-[#E3EBE5] bg-[#E8F5EC]/60 px-4 py-3 flex items-start gap-2.5 text-xs text-[#17231C]/80">
              <Info className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
              <span>
                Local development mode: order status lookup reads from your current browser’s LocalStorage until the production backend API is connected.
              </span>
            </div>
          )}

          {submissionMode === 'production_unconfigured' && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Online order tracking is currently unavailable while our production backend connection is being configured.
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="py-12 bg-[#F7FAF7]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          {isLocalDemoMode ? (
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
                  disabled={isSearching}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-60 text-white transition-colors whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  <span>{isSearching ? 'Checking...' : 'Check Status'}</span>
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={handleLookup}
              className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end"
            >
              <div className="sm:col-span-9">
                <label htmlFor="track-token" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                  Confidential Order Tracking Token
                </label>
                <input
                  id="track-token"
                  type="text"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  value={trackingToken}
                  onChange={(e) => setTrackingToken(e.target.value)}
                  placeholder="Paste the tracking token from your confirmation email"
                  className="w-full px-3.5 py-2.5 text-sm font-mono-tabular rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-60 text-white transition-colors whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  <span>{isSearching ? 'Verifying...' : 'Track Order'}</span>
                </button>
              </div>
            </form>
          )}

          {searched && !matchedOrder && (
            <div className="rounded-xl border border-red-200 bg-white shadow-xs p-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-[#17231C]">
                  {lookupError ? 'Unable to Verify Order Tracking' : 'No Matching Order Record Found'}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#64756B]">
                  {lookupError || (
                    <>
                      Verify that the Reference ID and email match your submitted website order, or{' '}
                      <Link to="/request-quote" className="text-[#16834A] hover:underline font-medium">
                        submit a new project request
                      </Link>
                      .
                    </>
                  )}
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
                    {matchedOrder.service} · Submitted{' '}
                    {matchedOrder.createdAt
                      ? new Date(matchedOrder.createdAt).toLocaleDateString()
                      : 'Recently'}
                  </p>
                </div>
                <StatusBadge status={matchedOrder.status} />
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                <div>
                  <dt className="text-xs text-[#64756B]">Selected Package</dt>
                  <dd className="mt-1 font-medium text-[#17231C]">
                    {matchedOrder.packageTitle || matchedOrder.packageId || 'Custom Scope'}
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
                  <dt className="text-xs text-[#64756B]">Expected Delivery</dt>
                  <dd className="mt-1 font-medium text-[#17231C]">
                    {matchedOrder.expectedDeliveryDate || matchedOrder.expectedTimeline || 'To be confirmed'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#64756B]">Domain &amp; Hosting</dt>
                  <dd className="mt-1 font-medium text-[#17231C]">
                    {matchedOrder.domainPreference || 'Standard'} · {matchedOrder.hostingPreference || 'To be confirmed'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#64756B]">Maintenance Preference</dt>
                  <dd className="mt-1 font-medium text-[#17231C]">
                    {matchedOrder.maintenancePlanSelected && matchedOrder.maintenancePlanSelected !== 'Undecided'
                      ? `${matchedOrder.maintenanceInterest || 'Selected'} (${matchedOrder.maintenancePlanSelected})`
                      : matchedOrder.maintenanceInterest || 'Optional'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#64756B]">Estimated Budget</dt>
                  <dd className="mt-1 font-medium text-[#17231C]">
                    {matchedOrder.estimatedBudget || 'Pending Review'}
                    {matchedOrder.urgency ? ` · ${matchedOrder.urgency}` : ''}
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
                {isClosedStatus ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
                    This project request is currently marked as <strong>{matchedOrder.status}</strong>.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {CANONICAL_TRACKING_STAGES.map((st, idx) => {
                      const isCurrent = idx === activeStepIndex;
                      const isPast = activeStepIndex > idx;
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
                )}
              </div>

              {statusHistory.length > 0 && (
                <div className="pt-4 border-t border-[#E3EBE5] space-y-3">
                  <p className="text-xs font-semibold text-[#64756B]">
                    Status History
                  </p>
                  <ol className="space-y-2.5">
                    {statusHistory.map((entry, idx) => (
                      <li
                        key={entry.id || `${entry.newStatus}-${entry.createdAt || idx}`}
                        className="rounded-lg border border-[#E3EBE5] bg-[#F7FAF7] px-3.5 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-[#17231C]">
                            {entry.previousStatus
                              ? `${entry.previousStatus} → ${entry.newStatus}`
                              : entry.newStatus}
                          </p>
                          {entry.notes && (
                            <p className="text-[#64756B]">{entry.notes}</p>
                          )}
                        </div>
                        {entry.createdAt && (
                          <span className="inline-flex items-center gap-1 text-[#64756B] shrink-0 font-mono-tabular">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
