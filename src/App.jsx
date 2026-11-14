import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import { ClientAuthProvider } from './context/ClientAuthContext.jsx';
import PublicLayout from './components/layout/PublicLayout.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import ClientLayout from './components/layout/ClientLayout.jsx';
import RequireAdmin from './components/auth/RequireAdmin.jsx';
import RequireClient from './components/auth/RequireClient.jsx';
import ToastContainer from './components/common/ToastContainer.jsx';
import ConfirmDialog from './components/common/ConfirmDialog.jsx';

import HomePage from './pages/Home/HomePage.jsx';
import ServicesPage from './pages/Services/ServicesPage.jsx';
import PackagesPage from './pages/Packages/PackagesPage.jsx';
import PortfolioPage from './pages/Portfolio/PortfolioPage.jsx';
import ProjectDetailPage from './pages/Portfolio/ProjectDetailPage.jsx';
import TeamPage from './pages/Team/TeamPage.jsx';
import AboutPage from './pages/About/AboutPage.jsx';
import ContactPage from './pages/Contact/ContactPage.jsx';
import RequestQuotePage from './pages/Order/RequestQuotePage.jsx';
import TrackOrderPage from './pages/Order/TrackOrderPage.jsx';
import LegalPage from './pages/Legal/LegalPage.jsx';
import NotFoundPage from './pages/NotFound/NotFoundPage.jsx';

import RegisterPage from './pages/Auth/RegisterPage.jsx';
import VerifyEmailPage from './pages/Auth/VerifyEmailPage.jsx';
import ClientLoginPage from './pages/Auth/ClientLoginPage.jsx';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage.jsx';

const AdminLoginPage = lazy(() => import('./pages/Admin/AdminLoginPage.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/Admin/AdminDashboardPage.jsx'));
const AdminOrdersPage = lazy(() => import('./pages/Admin/AdminOrdersPage.jsx'));
const AdminPackagesPage = lazy(() => import('./pages/Admin/AdminPackagesPage.jsx'));
const AdminPortfolioPage = lazy(() => import('./pages/Admin/AdminPortfolioPage.jsx'));
const AdminTeamPage = lazy(() => import('./pages/Admin/AdminTeamPage.jsx'));
const AdminInquiriesPage = lazy(() => import('./pages/Admin/AdminInquiriesPage.jsx'));
const AdminAccountsPage = lazy(() => import('./pages/Admin/AdminAccountsPage.jsx'));
const AdminSettingsPage = lazy(() => import('./pages/Admin/AdminSettingsPage.jsx'));

const ClientDashboardPage = lazy(() => import('./pages/Account/ClientDashboardPage.jsx'));
const ClientProfilePage = lazy(() => import('./pages/Account/ClientProfilePage.jsx'));
const ClientOrdersPage = lazy(() => import('./pages/Account/ClientOrdersPage.jsx'));
const ClientQuotationsPage = lazy(() => import('./pages/Account/ClientQuotationsPage.jsx'));
const ClientProjectsPage = lazy(() => import('./pages/Account/ClientProjectsPage.jsx'));
const ClientSecurityPage = lazy(() => import('./pages/Account/ClientSecurityPage.jsx'));

function RouteModuleFallback({ label = 'Loading module...' }) {
  return (
    <div className="rounded-xl border border-[#E3EBE5] bg-white p-8 text-sm text-[#64756B]">
      {label}
    </div>
  );
}

function renderAdmin(title, element, allowedRoles = null) {
  return (
    <RequireAdmin allowedRoles={allowedRoles}>
      <AdminLayout title={title}>
        <Suspense fallback={<RouteModuleFallback label="Loading admin module..." />}>
          {element}
        </Suspense>
      </AdminLayout>
    </RequireAdmin>
  );
}

function renderClientAccount(title, element) {
  return (
    <RequireClient>
      <ClientLayout title={title}>
        <Suspense fallback={<RouteModuleFallback label="Loading account module..." />}>
          {element}
        </Suspense>
      </ClientLayout>
    </RequireClient>
  );
}

export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/services" element={<PublicLayout><ServicesPage /></PublicLayout>} />
        <Route path="/packages" element={<PublicLayout><PackagesPage /></PublicLayout>} />
        <Route path="/portfolio" element={<PublicLayout><PortfolioPage /></PublicLayout>} />
        <Route path="/portfolio/:slug" element={<PublicLayout><ProjectDetailPage /></PublicLayout>} />
        <Route path="/team" element={<PublicLayout><TeamPage /></PublicLayout>} />
        <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
        <Route path="/request-quote" element={<PublicLayout><RequestQuotePage /></PublicLayout>} />
        <Route path="/track-order" element={<PublicLayout><TrackOrderPage /></PublicLayout>} />
        <Route path="/privacy-policy" element={<PublicLayout><LegalPage type="privacy" /></PublicLayout>} />
        <Route path="/terms" element={<PublicLayout><LegalPage type="terms" /></PublicLayout>} />

        {/* Client Authentication Routes */}
        <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />
        <Route path="/verify-email" element={<PublicLayout><VerifyEmailPage /></PublicLayout>} />
        <Route path="/login" element={<PublicLayout><ClientLoginPage /></PublicLayout>} />
        <Route path="/forgot-password" element={<PublicLayout><ForgotPasswordPage /></PublicLayout>} />
        <Route path="/reset-password" element={<PublicLayout><ResetPasswordPage /></PublicLayout>} />

        {/* Client Dashboard Routes (Protected) */}
        <Route path="/account" element={renderClientAccount('Dashboard', <ClientDashboardPage />)} />
        <Route path="/account/profile" element={renderClientAccount('Profile', <ClientProfilePage />)} />
        <Route path="/account/orders" element={renderClientAccount('My Orders', <ClientOrdersPage />)} />
        <Route path="/account/quotations" element={renderClientAccount('Quotations', <ClientQuotationsPage />)} />
        <Route path="/account/projects" element={renderClientAccount('Projects', <ClientProjectsPage />)} />
        <Route path="/account/security" element={renderClientAccount('Security', <ClientSecurityPage />)} />

        {/* Admin Authentication & Protected Routes */}
        <Route
          path="/admin/login"
          element={
            <Suspense fallback={<RouteModuleFallback label="Loading sign in..." />}>
              <AdminLoginPage />
            </Suspense>
          }
        />
        <Route path="/admin" element={renderAdmin('Overview', <AdminDashboardPage />)} />
        <Route path="/admin/orders" element={renderAdmin('Orders', <AdminOrdersPage />)} />
        <Route path="/admin/packages" element={renderAdmin('Packages', <AdminPackagesPage />)} />
        <Route path="/admin/portfolio" element={renderAdmin('Portfolio', <AdminPortfolioPage />)} />
        <Route path="/admin/team" element={renderAdmin('Team', <AdminTeamPage />)} />
        <Route path="/admin/inquiries" element={renderAdmin('Inquiries', <AdminInquiriesPage />)} />
        <Route
          path="/admin/accounts"
          element={renderAdmin('Admin Accounts', <AdminAccountsPage />, ['super_admin', 'admin'])}
        />
        <Route path="/admin/settings" element={renderAdmin('Website Settings', <AdminSettingsPage />)} />

        {/* 404 Not Found */}
        <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
      </Routes>
      <ToastContainer />
      <ConfirmDialog />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ClientAuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ClientAuthProvider>
    </AppProvider>
  );
}
