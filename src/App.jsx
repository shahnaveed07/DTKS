import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import PublicLayout from './components/layout/PublicLayout.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import RequireAdmin from './components/auth/RequireAdmin.jsx';
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

const AdminDashboardPage = lazy(() => import('./pages/Admin/AdminDashboardPage.jsx'));
const AdminOrdersPage = lazy(() => import('./pages/Admin/AdminOrdersPage.jsx'));
const AdminPackagesPage = lazy(() => import('./pages/Admin/AdminPackagesPage.jsx'));
const AdminPortfolioPage = lazy(() => import('./pages/Admin/AdminPortfolioPage.jsx'));
const AdminTeamPage = lazy(() => import('./pages/Admin/AdminTeamPage.jsx'));
const AdminInquiriesPage = lazy(() => import('./pages/Admin/AdminInquiriesPage.jsx'));
const AdminSettingsPage = lazy(() => import('./pages/Admin/AdminSettingsPage.jsx'));

function AdminRouteFallback() {
  return (
    <div className="rounded-xl border border-[#E3EBE5] bg-white p-8 text-sm text-[#64756B]">
      Loading admin module...
    </div>
  );
}

function renderAdmin(title, element) {
  return (
    <RequireAdmin>
      <AdminLayout title={title}>
        <Suspense fallback={<AdminRouteFallback />}>{element}</Suspense>
      </AdminLayout>
    </RequireAdmin>
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

        {/* Admin Prototype Routes (code-split) */}
        <Route path="/admin" element={renderAdmin('Overview', <AdminDashboardPage />)} />
        <Route path="/admin/orders" element={renderAdmin('Orders', <AdminOrdersPage />)} />
        <Route path="/admin/packages" element={renderAdmin('Packages', <AdminPackagesPage />)} />
        <Route path="/admin/portfolio" element={renderAdmin('Portfolio', <AdminPortfolioPage />)} />
        <Route path="/admin/team" element={renderAdmin('Team', <AdminTeamPage />)} />
        <Route path="/admin/inquiries" element={renderAdmin('Inquiries', <AdminInquiriesPage />)} />
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
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
