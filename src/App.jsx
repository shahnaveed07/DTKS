import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import PublicLayout from './components/layout/PublicLayout.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
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

import AdminDashboardPage from './pages/Admin/AdminDashboardPage.jsx';
import AdminOrdersPage from './pages/Admin/AdminOrdersPage.jsx';
import AdminPackagesPage from './pages/Admin/AdminPackagesPage.jsx';
import AdminPortfolioPage from './pages/Admin/AdminPortfolioPage.jsx';
import AdminTeamPage from './pages/Admin/AdminTeamPage.jsx';
import AdminInquiriesPage from './pages/Admin/AdminInquiriesPage.jsx';
import AdminSettingsPage from './pages/Admin/AdminSettingsPage.jsx';

function ScrollToTop() {
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

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
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

          {/* Admin Prototype Routes */}
          <Route path="/admin" element={<AdminLayout title="Overview"><AdminDashboardPage /></AdminLayout>} />
          <Route path="/admin/orders" element={<AdminLayout title="Orders"><AdminOrdersPage /></AdminLayout>} />
          <Route path="/admin/packages" element={<AdminLayout title="Packages"><AdminPackagesPage /></AdminLayout>} />
          <Route path="/admin/portfolio" element={<AdminLayout title="Portfolio"><AdminPortfolioPage /></AdminLayout>} />
          <Route path="/admin/team" element={<AdminLayout title="Team"><AdminTeamPage /></AdminLayout>} />
          <Route path="/admin/inquiries" element={<AdminLayout title="Inquiries"><AdminInquiriesPage /></AdminLayout>} />
          <Route path="/admin/settings" element={<AdminLayout title="Website Settings"><AdminSettingsPage /></AdminLayout>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
        <ConfirmDialog />
      </BrowserRouter>
    </AppProvider>
  );
}
