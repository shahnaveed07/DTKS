import { Link, Navigate, useLocation } from 'react-router-dom';
import { Lock, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext.jsx';
import SEO from '../common/SEO.jsx';
import BrandLogo from '../common/BrandLogo.jsx';

export default function RequireClient({ children }) {
  const location = useLocation();
  const { authStatus, isClientAuthenticated } = useClientAuth();

  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex items-center justify-center p-6">
        <SEO noindex fullTitle="Verifying Client Session | DTKS" />
        <div className="max-w-md w-full rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs text-center space-y-3">
          <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="font-display text-lg font-bold text-[#17231C]">
            Loading Your Account
          </h1>
          <p className="text-xs text-[#64756B]">
            Verifying your client portal session...
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === 'blocked') {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex flex-col justify-center items-center p-6">
        <SEO noindex fullTitle="Client Portal Unavailable | DTKS" />
        <div className="max-w-lg w-full rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <BrandLogo variant="header" />
            <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#16834A]">Client Portal</p>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Client Accounts Unavailable in Public Static Mode
            </h1>
            <p className="text-sm text-[#64756B] leading-relaxed">
              Client account sign-in and dashboards require an active DTKS backend API connection.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Website</span>
            </Link>
            <Link
              to="/track-order"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7] transition-colors"
            >
              <span>Track Order</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isClientAuthenticated) {
    const requested = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from: requested }} />;
  }

  return children;
}
