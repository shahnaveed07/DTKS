import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import BrandLogo from '../common/BrandLogo.jsx';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '/services' },
  { label: 'Our Work', to: '/portfolio' },
  { label: 'Packages', to: '/packages' },
  { label: 'Team', to: '/team' },
  { label: 'About', to: '/about' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#E3EBE5] bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-6">
        {/* Zone 1: Brand Logo */}
        <Link
          to="/"
          aria-label="DreamTech Kashmir Solutions — Home"
          className="inline-flex items-center shrink-0 focus-visible:outline-2 focus-visible:outline-[#16834A] rounded-lg"
        >
          <BrandLogo variant="navbar" />
        </Link>

        {/* Zone 2: Clean single-line navigation links */}
        <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-150 ${
                  isActive
                    ? 'border-[#16834A] text-[#17231C]'
                    : 'border-transparent text-[#64756B] hover:text-[#16834A]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Contact link + Primary CTA */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          <Link
            to="/contact"
            className="text-sm font-medium text-[#17231C] hover:text-[#16834A] transition-colors whitespace-nowrap shrink-0 px-2 py-1.5"
          >
            Contact Us
          </Link>
          <Link
            to="/request-quote"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-[#17231C] hover:bg-[#E8F5EC] transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-200 border-[#E3EBE5] bg-white ${
          mobileOpen ? 'max-h-[460px] border-t' : 'max-h-0'
        }`}
      >
        <nav aria-label="Mobile navigation" className="px-4 py-4 flex flex-col gap-1">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#E8F5EC] text-[#116438]'
                    : 'text-[#17231C] hover:bg-[#F7FAF7]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/track-order"
            className={({ isActive }) =>
              `px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#E8F5EC] text-[#116438]'
                  : 'text-[#17231C] hover:bg-[#F7FAF7]'
              }`
            }
          >
            Track Order
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#E8F5EC] text-[#116438]'
                  : 'text-[#17231C] hover:bg-[#F7FAF7]'
              }`
            }
          >
            Contact Us
          </NavLink>
          <div className="pt-3 mt-2 border-t border-[#E3EBE5] flex items-center gap-3">
            <Link
              to="/request-quote"
              className="flex-1 text-center px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
            >
              Get Started
            </Link>
            <Link
              to="/admin"
              className="px-4 py-2.5 text-sm font-medium rounded-lg border border-[#16834A] text-[#16834A] hover:bg-[#E8F5EC] transition-colors"
            >
              Admin
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
