import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { clientAccountService } from '../../services/api/clientAccountService.js';
import SEO from '../../components/common/SEO.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { formatCurrency } from '../../utils/orderUtils.js';

export default function ClientQuotationsPage() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadQuotations = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    const res = await clientAccountService.listQuotations();
    if (!res.success) {
      setErrorMessage(res.message || 'Unable to load project quotations.');
      setLoading(false);
      return;
    }
    setQuotations(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  return (
    <>
      <SEO noindex fullTitle="Quotations | Client Account | DTKS" />

      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#17231C]">
            Project Quotations
          </h1>
          <p className="mt-1 text-sm text-[#64756B]">
            Custom scope quotes, itemized pricing notes, and approval status for your orders.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Failed to load quotations</p>
                <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadQuotations}
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
          ) : quotations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E3EBE5] bg-[#E8F5EC]/50 text-xs text-[#116438]">
                    <th className="py-3 px-4 font-semibold">Order Ref</th>
                    <th className="py-3 px-4 font-semibold">Project &amp; Scope Notes</th>
                    <th className="py-3 px-4 font-semibold">Quoted Amount</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EBE5]">
                  {quotations.map((q) => (
                    <tr key={q.id || q.referenceId} className="hover:bg-[#F7FAF7] transition-colors">
                      <td className="py-3.5 px-4 font-mono-tabular text-xs font-semibold text-[#16834A] whitespace-nowrap">
                        {q.referenceId}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-[#17231C]">{q.projectName}</p>
                        {q.scopeNotes && (
                          <p className="text-xs text-[#64756B] mt-0.5 line-clamp-2">
                            {q.scopeNotes}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[#116438] whitespace-nowrap">
                        {formatCurrency(q.amount, q.currency || 'INR')}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={q.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No quotations issued yet"
                description="Once DTKS reviews your project requirements and issues a quotation, pricing details will appear here."
                actionLabel="Request a Website Quote"
                onAction={() => navigate('/request-quote')}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
