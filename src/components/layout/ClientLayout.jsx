import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  ClipboardList,
  FileText,
  FolderKanban,
  ShieldCheck,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  PlusCircle,
} from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import BrandLogo from '../common/BrandLogo.jsx';
import SEO from '../common/SEO.jsx';

const CLIENT_NAV = [
  { label: 'Dashboard', to: '/account', icon: LayoutDashboard, end: true },
  { label: 'Profile', to: '/account/profile', icon: User },
  { label: 'My Orders', to: '/account/orders', icon: ClipboardList },
  { label: 'Quotations', to: '/account/quotations', icon: FileText },
  { label: 'Projects', to: '/account/projects', icon: FolderKanban },
  { label: 'Security', to: '/account/security', icon: ShieldCheck },
];

export default function ClientLayout({ title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { client, logoutClient } = useClientAuth();
  const { addToast } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logoutClient();
    addToast('Signed out of your client account.', 'info');
    navigate('/login', { replace: true });
  };

  const currentSection =
    CLIENT_NAV.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    )?.label || title;

  return (
    <div className="min-h-screen flex bg-[#F7FAF7] text-[#17231C] overflow-x-hidden">
      <SEO
        noindex
        fullTitle={title ? `${title} | Client Account | DTKS` : 'Client Account | DTKS'}
      />

      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-[#E3EBE5] bg-white">
        <div className="h-[72px] px-5 flex items-center border-b border-[#E3EBE5]">
          <Link
            to="/"
            aria-label="DreamTech Kashmir Solutions"
            className="inline-flex items-center rounded-lg focus-visible:outline-2 focus-visible:outline-[#16834A]"
          >
            <BrandLogo variant="header" />
          </Link>
        </div>

        <div className="px-4 py-3 border-b border-[#E3EBE5] bg-[#E8F5EC]/60">
          <p className="text-xs font-semibold text-[#116438] truncate">
            {client?.fullName || 'Client Portal'}
          </p>
          <p className="text-xs text-[#64756B] mt-0.5 truncate">
            {client?.email || ''}
          </p>
        </div>

        <nav aria-label="Client account navigation" className="flex-1 p-3 space-y-1">
          {CLIENT_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#16834A] text-white'
                      : 'text-[#64756B] hover:bg-[#E8F5EC]/70 hover:text-[#17231C]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#E3EBE5] space-y-2">
          <Link
            to="/request-quote"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
            <span>New Project Request</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#17231C] border border-[#E3EBE5] hover:bg-[#F7FAF7] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0 text-[#16834A]" />
            <span>Sign Out</span>
          </button>
          <Link
            to="/"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#64756B] hover:bg-[#F7FAF7] hover:text-[#17231C] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Back to Website</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#17231C]/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] flex flex-col bg-white border-r border-[#E3EBE5] h-full z-10">
            <div className="h-[72px] px-4 flex items-center justify-between border-b border-[#E3EBE5]">
              <Link to="/" aria-label="DreamTech Kashmir Solutions" className="inline-flex items-center">
                <BrandLogo variant="header" />
              </Link>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close client navigation"
                className="p-2 rounded-lg text-[#64756B] hover:bg-[#F7FAF7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-[#E3EBE5] bg-[#E8F5EC]/60">
              <p className="text-xs font-semibold text-[#116438] truncate">
                {client?.fullName || 'Client Portal'}
              </p>
              <p className="text-xs text-[#64756B] truncate">{client?.email || ''}</p>
            </div>
            <nav aria-label="Mobile client account navigation" className="flex-1 p-3 space-y-1 overflow-y-auto">
              {CLIENT_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#16834A] text-white'
                          : 'text-[#64756B] hover:bg-[#E8F5EC]/70 hover:text-[#17231C]'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-3 border-t border-[#E3EBE5] space-y-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-[#E3EBE5] text-[#17231C]"
              >
                <LogOut className="w-3.5 h-3.5 text-[#16834A]" />
                <span>Sign Out</span>
              </button>
              <Link
                to="/"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#64756B]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Website</span>
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[72px] px-4 sm:px-6 lg:px-8 border-b border-[#E3EBE5] bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open client account menu"
              className="lg:hidden p-2 rounded-lg text-[#17231C] hover:bg-[#F7FAF7]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <Link to="/account" className="text-[#64756B] hover:text-[#16834A] whitespace-nowrap">
                Account
              </Link>
              <span aria-hidden="true" className="text-[#E3EBE5]">/</span>
              <span className="font-semibold text-[#17231C] truncate">{currentSection}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[#E3EBE5] text-[#17231C] hover:border-[#16834A] hover:text-[#16834A] transition-colors whitespace-nowrap"
            >
              Public Website
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
