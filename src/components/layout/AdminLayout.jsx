import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Briefcase,
  Users,
  MessageSquare,
  Settings,
  ArrowLeft,
  RotateCcw,
  Menu,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import BrandLogo from '../common/BrandLogo.jsx';

const ADMIN_NAV = [
  { label: 'Overview', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Orders', to: '/admin/orders', icon: ClipboardList },
  { label: 'Packages', to: '/admin/packages', icon: Package },
  { label: 'Portfolio', to: '/admin/portfolio', icon: Briefcase },
  { label: 'Team', to: '/admin/team', icon: Users },
  { label: 'Inquiries', to: '/admin/inquiries', icon: MessageSquare },
  { label: 'Website Settings', to: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { resetDemoData, requestConfirm } = useApp();
  const location = useLocation();

  const handleReset = () => {
    requestConfirm({
      title: 'Reset local demo data?',
      message:
        'This restores packages, orders, portfolio samples, team placeholders, inquiries, and settings back to their initial defaults in browser LocalStorage.',
      confirmLabel: 'Reset Demo Data',
      variant: 'danger',
      onConfirm: resetDemoData,
    });
  };

  const currentSection =
    ADMIN_NAV.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    )?.label || title;

  return (
    <div className="min-h-screen flex bg-[#F7FAF7] text-[#17231C] overflow-x-hidden">
      {/* Desktop White Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-[#E3EBE5] bg-white">
        <div className="h-[72px] px-5 flex items-center border-b border-[#E3EBE5]">
          <Link
            to="/"
            aria-label="DreamTech Kashmir Solutions"
            className="inline-flex items-center rounded-lg focus-visible:outline-2 focus-visible:outline-[#16834A]"
          >
            <BrandLogo variant="admin" />
          </Link>
        </div>

        <div className="px-4 py-3 border-b border-[#E3EBE5] bg-[#E8F5EC]/60">
          <p className="text-xs font-semibold text-[#116438]">
            Frontend Demo Mode
          </p>
          <p className="text-xs text-[#64756B] mt-0.5">
            Changes persist in browser LocalStorage only.
          </p>
        </div>

        <nav aria-label="Admin navigation" className="flex-1 p-3 space-y-1">
          {ADMIN_NAV.map((item) => {
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
          <button
            type="button"
            onClick={handleReset}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#17231C] border border-[#E3EBE5] hover:bg-[#F7FAF7] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0 text-[#16834A]" />
            <span>Reset Demo Data</span>
          </button>
          <Link
            to="/"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#64756B] hover:bg-[#F7FAF7] hover:text-[#17231C] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Back to Public Website</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#17231C]/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] flex flex-col bg-white border-r border-[#E3EBE5] h-full z-10">
            <div className="h-[72px] px-4 flex items-center justify-between border-b border-[#E3EBE5]">
              <Link
                to="/"
                aria-label="DreamTech Kashmir Solutions"
                className="inline-flex items-center"
              >
                <BrandLogo variant="admin" />
              </Link>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close admin sidebar"
                className="p-2 rounded-lg text-[#64756B] hover:bg-[#F7FAF7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav aria-label="Mobile admin navigation" className="flex-1 p-3 space-y-1 overflow-y-auto">
              {ADMIN_NAV.map((item) => {
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
                onClick={handleReset}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-[#E3EBE5] text-[#17231C]"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#16834A]" />
                <span>Reset Demo Data</span>
              </button>
              <Link
                to="/"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#64756B]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Public Website</span>
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
              aria-label="Open admin navigation"
              className="lg:hidden p-2 rounded-lg text-[#17231C] hover:bg-[#F7FAF7]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <Link
                to="/admin"
                className="text-[#64756B] hover:text-[#16834A] whitespace-nowrap"
              >
                Admin
              </Link>
              <span aria-hidden="true" className="text-[#E3EBE5]">/</span>
              <span className="font-semibold text-[#17231C] truncate">
                {currentSection}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[#16834A] text-[#16834A] hover:bg-[#E8F5EC] transition-colors whitespace-nowrap"
            >
              View Website
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
