import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, AlertCircle, RefreshCw, Calendar } from 'lucide-react';
import { clientAccountService } from '../../services/api/clientAccountService.js';
import SEO from '../../components/common/SEO.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

export default function ClientProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    const res = await clientAccountService.listProjects();
    if (!res.success) {
      setErrorMessage(res.message || 'Unable to load your active website builds.');
      setLoading(false);
      return;
    }
    setProjects(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <>
      <SEO noindex fullTitle="Projects | Client Account | DTKS" />

      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#17231C]">
            Website Projects &amp; Previews
          </h1>
          <p className="mt-1 text-sm text-[#64756B]">
            Monitor active builds in progress, review staging previews, and access launched websites.
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
                <p className="text-sm font-semibold text-red-900">Failed to load projects</p>
                <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadProjects}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-red-200 text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true">
            {[1, 2].map((card) => (
              <div
                key={card}
                className="h-44 rounded-xl border border-[#E3EBE5] bg-white animate-pulse"
              />
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((project) => (
              <article
                key={project.id || project.referenceId}
                className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono-tabular text-xs font-semibold text-[#16834A]">
                        {project.referenceId}
                      </p>
                      <h2 className="mt-1 font-display text-base font-bold text-[#17231C]">
                        {project.title}
                      </h2>
                      {project.service && (
                        <p className="text-xs text-[#64756B] mt-0.5">{project.service}</p>
                      )}
                    </div>
                    <StatusBadge status={project.status} />
                  </div>

                  {project.expectedDeliveryDate && (
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#64756B]">
                      <Calendar className="w-3.5 h-3.5 text-[#16834A] shrink-0" />
                      <span>Target Delivery: {project.expectedDeliveryDate}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#E3EBE5] flex flex-wrap items-center gap-3">
                  {project.stagingUrl && (
                    <a
                      href={project.stagingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E3EBE5] text-[#17231C] hover:border-[#16834A] hover:text-[#16834A] transition-colors whitespace-nowrap"
                    >
                      <span>Staging Preview</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {project.productionUrl && (
                    <a
                      href={project.productionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors whitespace-nowrap"
                    >
                      <span>Live Website</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {!project.stagingUrl && !project.productionUrl && (
                    <span className="text-xs text-[#64756B]">
                      Preview link will appear once staging deployment is ready.
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No active website builds yet"
            description="Approved orders move into active build tracking here with staging and launch links."
            actionLabel="View My Orders"
            onAction={() => navigate('/account/orders')}
          />
        )}
      </div>
    </>
  );
}
