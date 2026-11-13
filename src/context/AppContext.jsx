import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { packageService } from '../services/api/packageService.js';
import { orderService } from '../services/api/orderService.js';
import { portfolioService } from '../services/api/portfolioService.js';
import { teamService } from '../services/api/teamService.js';
import { inquiryService } from '../services/api/inquiryService.js';
import { settingsService } from '../services/api/settingsService.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [packages, setPackages] = useState(() => packageService.getAll());
  const [addons, setAddons] = useState(() => packageService.getAddons());
  const [maintenancePlans, setMaintenancePlans] = useState(() => packageService.getMaintenancePlans());
  const [orders, setOrders] = useState(() => orderService.getAll());
  const [portfolio, setPortfolio] = useState(() => portfolioService.getAll());
  const [team, setTeam] = useState(() => teamService.getAll());
  const [inquiries, setInquiries] = useState(() => inquiryService.getAll());
  const [settings, setSettings] = useState(() => settingsService.getSettings());
  const [services, setServices] = useState(() => settingsService.getServices());

  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const requestConfirm = useCallback(({ title, message, confirmLabel = 'Confirm', variant = 'danger', onConfirm }) => {
    setConfirmState({ title, message, confirmLabel, variant, onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState(null);
  }, []);

  // Orders
  const submitOrder = useCallback((formData) => {
    const { order, orders: nextOrders } = orderService.create(formData);
    setOrders(nextOrders);
    addToast(`Order ${order.referenceId} submitted locally.`, 'success');
    return order;
  }, [addToast]);

  const updateOrder = useCallback((id, updates) => {
    const next = orderService.update(id, updates);
    setOrders(next);
    addToast('Order updated.', 'success');
  }, [addToast]);

  const deleteOrder = useCallback((id) => {
    const next = orderService.remove(id);
    setOrders(next);
    addToast('Order deleted.', 'info');
  }, [addToast]);

  // Packages & Maintenance
  const createPackage = useCallback((payload) => {
    const next = packageService.create(payload);
    setPackages(next);
    addToast('Package created.', 'success');
  }, [addToast]);

  const updatePackage = useCallback((id, updates) => {
    const next = packageService.update(id, updates);
    setPackages(next);
    addToast('Package updated.', 'success');
  }, [addToast]);

  const deletePackage = useCallback((id) => {
    const next = packageService.remove(id);
    setPackages(next);
    addToast('Package removed.', 'info');
  }, [addToast]);

  const saveMaintenancePlans = useCallback((plans) => {
    const next = packageService.saveMaintenancePlans(plans);
    setMaintenancePlans(next);
    addToast('Maintenance plans updated.', 'success');
  }, [addToast]);

  const saveAddons = useCallback((nextAddons) => {
    const saved = packageService.saveAddons(nextAddons);
    setAddons(saved);
    addToast('Add-on services updated.', 'success');
  }, [addToast]);

  // Portfolio
  const createProject = useCallback((payload) => {
    const next = portfolioService.create(payload);
    setPortfolio(next);
    addToast('Portfolio project added.', 'success');
  }, [addToast]);

  const updateProject = useCallback((id, updates) => {
    const next = portfolioService.update(id, updates);
    setPortfolio(next);
    addToast('Project updated.', 'success');
  }, [addToast]);

  const deleteProject = useCallback((id) => {
    const next = portfolioService.remove(id);
    setPortfolio(next);
    addToast('Project deleted.', 'info');
  }, [addToast]);

  // Team
  const createTeamMember = useCallback((payload) => {
    const next = teamService.create(payload);
    setTeam(next);
    addToast('Team profile added.', 'success');
  }, [addToast]);

  const updateTeamMember = useCallback((id, updates) => {
    const next = teamService.update(id, updates);
    setTeam(next);
    addToast('Team profile updated.', 'success');
  }, [addToast]);

  const deleteTeamMember = useCallback((id) => {
    const next = teamService.remove(id);
    setTeam(next);
    addToast('Team profile removed.', 'info');
  }, [addToast]);

  const reorderTeamMember = useCallback((id, direction) => {
    const next = teamService.reorder(id, direction);
    setTeam(next);
  }, []);

  // Inquiries
  const submitInquiry = useCallback((payload) => {
    const { inquiry, inquiries: next } = inquiryService.create(payload);
    setInquiries(next);
    addToast('Your inquiry has been saved. Our team can review it in the Admin panel.', 'success');
    return inquiry;
  }, [addToast]);

  const updateInquiry = useCallback((id, updates) => {
    const next = inquiryService.update(id, updates);
    setInquiries(next);
    addToast('Inquiry updated.', 'success');
  }, [addToast]);

  const deleteInquiry = useCallback((id) => {
    const next = inquiryService.remove(id);
    setInquiries(next);
    addToast('Inquiry deleted.', 'info');
  }, [addToast]);

  // Settings
  const updateSettings = useCallback((updates) => {
    const next = settingsService.saveSettings({ ...settings, ...updates });
    setSettings(next);
    addToast('Website settings saved.', 'success');
  }, [settings, addToast]);

  const updateServices = useCallback((nextServices) => {
    const saved = settingsService.saveServices(nextServices);
    setServices(saved);
    addToast('Services configuration saved.', 'success');
  }, [addToast]);

  const resetDemoData = useCallback(() => {
    settingsService.resetAllDemoData();
    setPackages(packageService.getAll());
    setAddons(packageService.getAddons());
    setMaintenancePlans(packageService.getMaintenancePlans());
    setOrders(orderService.getAll());
    setPortfolio(portfolioService.getAll());
    setTeam(teamService.getAll());
    setInquiries(inquiryService.getAll());
    setSettings(settingsService.getSettings());
    setServices(settingsService.getServices());
    addToast('All demo data has been reset to defaults.', 'info');
  }, [addToast]);

  return (
    <AppContext.Provider
      value={{
        packages,
        addons,
        maintenancePlans,
        orders,
        portfolio,
        team,
        inquiries,
        settings,
        services,
        toasts,
        addToast,
        removeToast,
        confirmState,
        requestConfirm,
        closeConfirm,
        submitOrder,
        updateOrder,
        deleteOrder,
        createPackage,
        updatePackage,
        deletePackage,
        saveMaintenancePlans,
        saveAddons,
        createProject,
        updateProject,
        deleteProject,
        createTeamMember,
        updateTeamMember,
        deleteTeamMember,
        reorderTeamMember,
        submitInquiry,
        updateInquiry,
        deleteInquiry,
        updateSettings,
        updateServices,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
