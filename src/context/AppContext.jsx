import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ensureSeededStorage,
  exportLocalDataSnapshot,
  resetAllDemoData,
} from '../services/storage/localStorageAdapter.js';
import { orderService } from '../services/api/orderService.js';
import { inquiryService } from '../services/api/inquiryService.js';
import { packageService } from '../services/api/packageService.js';
import { portfolioService } from '../services/api/portfolioService.js';
import { teamService } from '../services/api/teamService.js';
import { settingsService } from '../services/api/settingsService.js';
import { getDataAdapterMode } from '../services/api/apiClient.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  ensureSeededStorage();

  const [services, setServices] = useState(() => packageService.getServices());
  const [packages, setPackages] = useState(() => packageService.getPackages());
  const [maintenancePlans, setMaintenancePlans] = useState(() =>
    packageService.getMaintenancePlans()
  );
  const [addons, setAddons] = useState(() => packageService.getAddons());
  const [portfolio, setPortfolio] = useState(() => portfolioService.getAll());
  const [team, setTeam] = useState(() => teamService.getAll());
  const [orders, setOrders] = useState(() => orderService.getAll());
  const [inquiries, setInquiries] = useState(() => inquiryService.getAll());
  const [settings, setSettings] = useState(() => settingsService.get());
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const refreshAll = useCallback(() => {
    setServices(packageService.getServices());
    setPackages(packageService.getPackages());
    setMaintenancePlans(packageService.getMaintenancePlans());
    setAddons(packageService.getAddons());
    setPortfolio(portfolioService.getAll());
    setTeam(teamService.getAll());
    setOrders(orderService.getAll());
    setInquiries(inquiryService.getAll());
    setSettings(settingsService.get());
  }, []);

  useEffect(() => {
    const handleStorage = () => refreshAll();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshAll]);

  const addToast = useCallback((message, type = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const requestConfirm = useCallback((config) => {
    setConfirmDialog(config);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  // Orders
  const createOrder = useCallback(
    (payload) => {
      const created = orderService.create(payload);
      setOrders(orderService.getAll());
      addToast(`Website order ${created.referenceId} submitted.`);
      return created;
    },
    [addToast]
  );

  const updateOrder = useCallback(
    (id, patch) => {
      const updated = orderService.update(id, patch);
      setOrders(orderService.getAll());
      addToast('Order record updated.');
      return updated;
    },
    [addToast]
  );

  const deleteOrder = useCallback(
    (id) => {
      orderService.remove(id);
      setOrders(orderService.getAll());
      addToast('Order deleted.', 'info');
    },
    [addToast]
  );

  // Inquiries
  const createInquiry = useCallback(
    (payload) => {
      const created = inquiryService.create(payload);
      setInquiries(inquiryService.getAll());
      addToast('Your inquiry has been recorded.');
      return created;
    },
    [addToast]
  );

  const updateInquiry = useCallback(
    (id, patch) => {
      const updated = inquiryService.update(id, patch);
      setInquiries(inquiryService.getAll());
      addToast('Inquiry updated.');
      return updated;
    },
    [addToast]
  );

  const deleteInquiry = useCallback(
    (id) => {
      inquiryService.remove(id);
      setInquiries(inquiryService.getAll());
      addToast('Inquiry removed.', 'info');
    },
    [addToast]
  );

  // Packages & Services
  const saveServices = useCallback(
    (nextServices) => {
      packageService.saveServices(nextServices);
      setServices(packageService.getServices());
      addToast('Services catalog updated.');
    },
    [addToast]
  );

  const createPackage = useCallback(
    (payload) => {
      const created = packageService.createPackage(payload);
      setPackages(packageService.getPackages());
      addToast(`Package "${created.title}" created.`);
      return created;
    },
    [addToast]
  );

  const updatePackage = useCallback(
    (id, patch) => {
      const updated = packageService.updatePackage(id, patch);
      setPackages(packageService.getPackages());
      addToast('Package updated.');
      return updated;
    },
    [addToast]
  );

  const deletePackage = useCallback(
    (id) => {
      packageService.deletePackage(id);
      setPackages(packageService.getPackages());
      addToast('Package deleted.', 'info');
    },
    [addToast]
  );

  const saveMaintenancePlans = useCallback(
    (plans) => {
      packageService.saveMaintenancePlans(plans);
      setMaintenancePlans(packageService.getMaintenancePlans());
      addToast('Maintenance plans updated.');
    },
    [addToast]
  );

  const saveAddons = useCallback(
    (nextAddons) => {
      packageService.saveAddons(nextAddons);
      setAddons(packageService.getAddons());
      addToast('Optional add-ons updated.');
    },
    [addToast]
  );

  // Portfolio
  const createProject = useCallback(
    (payload) => {
      const created = portfolioService.create(payload);
      setPortfolio(portfolioService.getAll());
      addToast(`Project "${created.title}" added.`);
      return created;
    },
    [addToast]
  );

  const updateProject = useCallback(
    (id, patch) => {
      const updated = portfolioService.update(id, patch);
      setPortfolio(portfolioService.getAll());
      addToast('Portfolio project updated.');
      return updated;
    },
    [addToast]
  );

  const deleteProject = useCallback(
    (id) => {
      portfolioService.remove(id);
      setPortfolio(portfolioService.getAll());
      addToast('Portfolio project removed.', 'info');
    },
    [addToast]
  );

  // Team
  const createTeamMember = useCallback(
    (payload) => {
      const created = teamService.create(payload);
      setTeam(teamService.getAll());
      addToast(`Team member "${created.fullName}" added.`);
      return created;
    },
    [addToast]
  );

  const updateTeamMember = useCallback(
    (id, patch) => {
      const updated = teamService.update(id, patch);
      setTeam(teamService.getAll());
      addToast('Team member updated.');
      return updated;
    },
    [addToast]
  );

  const reorderTeamMember = useCallback((id, direction) => {
    teamService.reorder(id, direction);
    setTeam(teamService.getAll());
  }, []);

  const deleteTeamMember = useCallback(
    (id) => {
      teamService.remove(id);
      setTeam(teamService.getAll());
      addToast('Team member removed.', 'info');
    },
    [addToast]
  );

  // Settings
  const updateSettings = useCallback(
    (patch) => {
      const updated = settingsService.update(patch);
      setSettings(updated);
      addToast('Website settings saved.');
      return updated;
    },
    [addToast]
  );

  const resetDemoData = useCallback(() => {
    resetAllDemoData();
    refreshAll();
    addToast('Catalog defaults restored and backup snapshot saved.', 'info');
  }, [refreshAll, addToast]);

  const exportLocalData = useCallback(() => {
    const snapshot = exportLocalDataSnapshot();
    if (!snapshot) return null;
    try {
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dtks-local-data-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Local data backup exported as JSON.');
    } catch (err) {
      console.error('Export failed:', err);
      addToast('Failed to export local data snapshot.', 'error');
    }
    return snapshot;
  }, [addToast]);

  const value = {
    dataAdapterMode: getDataAdapterMode(),
    services,
    packages,
    maintenancePlans,
    addons,
    portfolio,
    team,
    orders,
    inquiries,
    settings,
    toasts,
    confirmDialog,
    addToast,
    dismissToast,
    requestConfirm,
    closeConfirm,
    createOrder,
    submitOrder: createOrder,
    updateOrder,
    deleteOrder,
    createInquiry,
    submitInquiry: createInquiry,
    updateInquiry,
    deleteInquiry,
    saveServices,
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
    reorderTeamMember,
    deleteTeamMember,
    updateSettings,
    resetDemoData,
    exportLocalData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
