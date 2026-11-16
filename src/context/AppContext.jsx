import { useRef, createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ensureSeededStorage,
  exportLocalDataSnapshot,
  getStorageDiagnostics,
  resetAllDemoData,
  restoreFromBackupSnapshot,
} from '../services/storage/localStorageAdapter.js';
import { orderService } from '../services/api/orderService.js';
import { inquiryService } from '../services/api/inquiryService.js';
import { packageService } from '../services/api/packageService.js';
import { portfolioService } from '../services/api/portfolioService.js';
import { teamService } from '../services/api/teamService.js';
import { settingsService } from '../services/api/settingsService.js';
import {
  getAdminAccessPolicy,
  getAdminAuthSession,
  getDataAdapterMode,
  getSubmissionMode,
} from '../services/api/apiClient.js';
import {
  createInitialResourceMap,
  getInitialAppState,
  loadAppResources,
} from './appResourceLoader.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [initialState] = useState(() =>
    getInitialAppState(getDataAdapterMode(), {
      ensureSeededStorage,
      getServices: () => packageService.getServices(),
      getPackages: () => packageService.getPackages(),
      getMaintenancePlans: () => packageService.getMaintenancePlans(),
      getAddons: () => packageService.getAddons(),
      getPortfolio: () => portfolioService.getAll(),
      getTeam: () => teamService.getAll(),
      getOrders: () => orderService.getAll(),
      getInquiries: () => inquiryService.getAll(),
      getSettings: () => settingsService.get(),
    })
  );

  const [services, setServices] = useState(initialState.services);
  const [packages, setPackages] = useState(initialState.packages);
  const [maintenancePlans, setMaintenancePlans] = useState(initialState.maintenancePlans);
  const [addons, setAddons] = useState(initialState.addons);
  const [portfolio, setPortfolio] = useState(initialState.portfolio);
  const [team, setTeam] = useState(initialState.team);
  const [orders, setOrders] = useState(initialState.orders);
  const [inquiries, setInquiries] = useState(initialState.inquiries);
  const [settings, setSettings] = useState(initialState.settings);
  const [isLoading, setIsLoading] = useState(initialState.isLoading);
  const [resourceStatus, setResourceStatus] = useState(initialState.resourceStatus);
  const [resourceErrors, setResourceErrors] = useState(initialState.resourceErrors);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const toastTimersRef = useRef(new Map());
  const refreshSeqRef = useRef(0);

  const dismissToast = useCallback((id) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    const timer = setTimeout(() => {
      toastTimersRef.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
    toastTimersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const requestConfirm = useCallback((config) => {
    setConfirmDialog(config);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  const refreshLocalState = useCallback(() => {
    if (getSubmissionMode() === 'production_unconfigured') {
      setResourceStatus(createInitialResourceMap('error'));
      setError('Backend API is not configured for production.');
      setIsLoading(false);
      return;
    }
    ensureSeededStorage();
    setServices(packageService.getServices());
    setPackages(packageService.getPackages());
    setMaintenancePlans(packageService.getMaintenancePlans());
    setAddons(packageService.getAddons());
    setPortfolio(portfolioService.getAll());
    setTeam(teamService.getAll());
    setOrders(orderService.getAll());
    setInquiries(inquiryService.getAll());
    setSettings(settingsService.get());
    setResourceStatus(createInitialResourceMap('ready'));
    setResourceErrors(createInitialResourceMap(null));
    setError(null);
    setIsLoading(false);
  }, []);

  const refreshAll = useCallback(
    async ({ includeAdmin = false } = {}) => {
      if (getDataAdapterMode() !== 'api') {
        refreshLocalState();
        return null;
      }

      const seq = ++refreshSeqRef.current;
      const shouldLoadAdmin =
        includeAdmin || Boolean(getAdminAuthSession()?.admin || getAdminAuthSession()?.accessToken);

      setIsLoading(true);
      setError(null);
      setResourceStatus((prev) => ({
        ...prev,
        catalog: 'loading',
        services: 'loading',
        portfolio: 'loading',
        team: 'loading',
        orders: shouldLoadAdmin ? 'loading' : prev.orders || 'skipped',
        inquiries: shouldLoadAdmin ? 'loading' : prev.inquiries || 'skipped',
        settings: 'loading',
      }));

      try {
        const result = await loadAppResources({
          includeAdmin: shouldLoadAdmin,
          packageService,
          portfolioService,
          teamService,
          orderService,
          inquiryService,
          settingsService,
        });

        if (seq !== refreshSeqRef.current) {
          return result;
        }

        const { updates } = result;
        if (Array.isArray(updates.services)) setServices(updates.services);
        if (Array.isArray(updates.packages)) setPackages(updates.packages);
        if (Array.isArray(updates.maintenancePlans)) {
          setMaintenancePlans(updates.maintenancePlans);
        }
        if (Array.isArray(updates.addons)) setAddons(updates.addons);
        if (Array.isArray(updates.portfolio)) setPortfolio(updates.portfolio);
        if (Array.isArray(updates.team)) setTeam(updates.team);
        if (Array.isArray(updates.orders)) setOrders(updates.orders);
        if (Array.isArray(updates.inquiries)) setInquiries(updates.inquiries);
        if (updates.settings && typeof updates.settings === 'object') {
          setSettings(updates.settings);
        }

        setResourceStatus(result.resourceStatus);
        setResourceErrors(result.resourceErrors);
        setError(result.error);
        return result;
      } catch (err) {
        if (seq !== refreshSeqRef.current) {
          return null;
        }
        const msg = err?.message || 'Failed loading data from API.';
        setError(msg);
        addToast(msg, 'error');
        return null;
      } finally {
        if (seq === refreshSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    [refreshLocalState, addToast]
  );

  useEffect(() => {
    if (getDataAdapterMode() === 'api') {
      refreshAll();
    }
    const handleStorage = () => {
      if (getDataAdapterMode() === 'local' && getSubmissionMode() !== 'production_unconfigured') {
        refreshLocalState();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshAll, refreshLocalState]);

  const runAsyncMutation = useCallback(
    async (operationFn, { successToast, toastType = 'success', onSuccess } = {}) => {
      setPendingOperations((c) => c + 1);
      setError(null);
      try {
        const res = await operationFn();
        if (!res || res.success === false) {
          const errMsg = res?.message || 'Operation failed. Changes were not saved.';
          setError(errMsg);
          addToast(errMsg, 'error');
          return res || { success: false, data: null, message: errMsg };
        }

        if (onSuccess) {
          onSuccess(res.data, res);
        }
        const msg =
          typeof successToast === 'function'
            ? successToast(res.data, res)
            : successToast || res.message;
        if (msg) {
          addToast(msg, toastType);
        }

        if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
          return {
            ...res.data,
            success: true,
            data: res.data,
            message: res.message,
          };
        }
        return res;
      } catch (err) {
        const errMsg = err?.message || 'Unexpected error during operation.';
        setError(errMsg);
        addToast(errMsg, 'error');
        return { success: false, data: null, message: errMsg };
      } finally {
        setPendingOperations((c) => Math.max(0, c - 1));
      }
    },
    [addToast]
  );

  // Orders
  const createOrder = useCallback(
    async (payload) =>
      runAsyncMutation(() => orderService.submitOrder(payload), {
        successToast: (created) => `Website order ${created.referenceId} submitted.`,
        onSuccess: (created) => {
          if (getDataAdapterMode() === 'local') {
            setOrders(orderService.getAll());
          } else if (created) {
            setOrders((prev) => [created, ...prev]);
          }
        },
      }),
    [runAsyncMutation]
  );

  const updateOrder = useCallback(
    async (id, patch) =>
      runAsyncMutation(() => orderService.updateOrder(id, patch), {
        successToast: 'Order record updated.',
        onSuccess: (updated) => {
          if (getDataAdapterMode() === 'local') {
            setOrders(orderService.getAll());
          } else if (updated) {
            setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
          }
        },
      }),
    [runAsyncMutation]
  );

  const deleteOrder = useCallback(
    async (id) =>
      runAsyncMutation(() => orderService.deleteOrder(id), {
        successToast: 'Order deleted.',
        toastType: 'info',
        onSuccess: () => {
          if (getDataAdapterMode() === 'local') {
            setOrders(orderService.getAll());
          } else {
            setOrders((prev) => prev.filter((o) => o.id !== id));
          }
        },
      }),
    [runAsyncMutation]
  );

  const trackOrder = useCallback(async (tokenOrRef, legacyEmail) => {
    return orderService.trackOrder(tokenOrRef, legacyEmail);
  }, []);

  // Inquiries
  const createInquiry = useCallback(
    async (payload) =>
      runAsyncMutation(() => inquiryService.submitInquiry(payload), {
        successToast: 'Your inquiry has been recorded.',
        onSuccess: (created) => {
          if (getDataAdapterMode() === 'local') {
            setInquiries(inquiryService.getAll());
          } else if (created) {
            setInquiries((prev) => [created, ...prev]);
          }
        },
      }),
    [runAsyncMutation]
  );

  const updateInquiry = useCallback(
    async (id, patch) =>
      runAsyncMutation(() => inquiryService.updateInquiry(id, patch), {
        successToast: 'Inquiry updated.',
        onSuccess: (updated) => {
          if (getDataAdapterMode() === 'local') {
            setInquiries(inquiryService.getAll());
          } else if (updated) {
            setInquiries((prev) => prev.map((i) => (i.id === id ? updated : i)));
          }
        },
      }),
    [runAsyncMutation]
  );

  const deleteInquiry = useCallback(
    async (id) =>
      runAsyncMutation(() => inquiryService.deleteInquiry(id), {
        successToast: 'Inquiry removed.',
        toastType: 'info',
        onSuccess: () => {
          if (getDataAdapterMode() === 'local') {
            setInquiries(inquiryService.getAll());
          } else {
            setInquiries((prev) => prev.filter((i) => i.id !== id));
          }
        },
      }),
    [runAsyncMutation]
  );

  // Packages & Services
  const saveServices = useCallback(
    async (nextServices) =>
      runAsyncMutation(() => packageService.saveServicesAsync(nextServices), {
        successToast: 'Services catalog updated.',
        onSuccess: (saved) => {
          if (getDataAdapterMode() === 'local') {
            setServices(packageService.getServices());
          } else if (Array.isArray(saved)) {
            setServices(saved);
          }
        },
      }),
    [runAsyncMutation]
  );

  const createPackage = useCallback(
    async (payload) =>
      runAsyncMutation(() => packageService.createPackageAsync(payload), {
        successToast: (created) => `Package "${created.title}" created.`,
        onSuccess: (created) => {
          if (getDataAdapterMode() === 'local') {
            setPackages(packageService.getPackages());
          } else if (created) {
            setPackages((prev) => [...prev, created]);
          }
        },
      }),
    [runAsyncMutation]
  );

  const updatePackage = useCallback(
    async (id, patch) =>
      runAsyncMutation(() => packageService.updatePackageAsync(id, patch), {
        successToast: 'Package updated.',
        onSuccess: (updated) => {
          if (getDataAdapterMode() === 'local') {
            setPackages(packageService.getPackages());
          } else if (updated) {
            setPackages((prev) => prev.map((p) => (p.id === id ? updated : p)));
          }
        },
      }),
    [runAsyncMutation]
  );

  const deletePackage = useCallback(
    async (id) =>
      runAsyncMutation(() => packageService.deletePackageAsync(id), {
        successToast: 'Package deleted.',
        toastType: 'info',
        onSuccess: () => {
          if (getDataAdapterMode() === 'local') {
            setPackages(packageService.getPackages());
          } else {
            setPackages((prev) => prev.filter((p) => p.id !== id));
          }
        },
      }),
    [runAsyncMutation]
  );

  const saveMaintenancePlans = useCallback(
    async (plans) =>
      runAsyncMutation(() => packageService.saveMaintenancePlansAsync(plans), {
        successToast: 'Maintenance plans updated.',
        onSuccess: (saved) => {
          if (getDataAdapterMode() === 'local') {
            setMaintenancePlans(packageService.getMaintenancePlans());
          } else if (Array.isArray(saved)) {
            setMaintenancePlans(saved);
          }
        },
      }),
    [runAsyncMutation]
  );

  const saveAddons = useCallback(
    async (nextAddons) =>
      runAsyncMutation(() => packageService.saveAddonsAsync(nextAddons), {
        successToast: 'Optional add-ons updated.',
        onSuccess: (saved) => {
          if (getDataAdapterMode() === 'local') {
            setAddons(packageService.getAddons());
          } else if (Array.isArray(saved)) {
            setAddons(saved);
          }
        },
      }),
    [runAsyncMutation]
  );

  // Portfolio
  const createProject = useCallback(
    async (payload) =>
      runAsyncMutation(() => portfolioService.createProject(payload), {
        successToast: (created) => `Project "${created.title}" added.`,
        onSuccess: (created) => {
          if (getDataAdapterMode() === 'local') {
            setPortfolio(portfolioService.getAll());
          } else if (created) {
            setPortfolio((prev) => [created, ...prev]);
          }
        },
      }),
    [runAsyncMutation]
  );

  const updateProject = useCallback(
    async (id, patch) =>
      runAsyncMutation(() => portfolioService.updateProject(id, patch), {
        successToast: 'Portfolio project updated.',
        onSuccess: (updated) => {
          if (getDataAdapterMode() === 'local') {
            setPortfolio(portfolioService.getAll());
          } else if (updated) {
            setPortfolio((prev) => prev.map((p) => (p.id === id ? updated : p)));
          }
        },
      }),
    [runAsyncMutation]
  );

  const deleteProject = useCallback(
    async (id) =>
      runAsyncMutation(() => portfolioService.deleteProject(id), {
        successToast: 'Portfolio project removed.',
        toastType: 'info',
        onSuccess: () => {
          if (getDataAdapterMode() === 'local') {
            setPortfolio(portfolioService.getAll());
          } else {
            setPortfolio((prev) => prev.filter((p) => p.id !== id));
          }
        },
      }),
    [runAsyncMutation]
  );

  // Team
  const createTeamMember = useCallback(
    async (payload) =>
      runAsyncMutation(() => teamService.createTeamMember(payload), {
        successToast: (created) => `Team member "${created.fullName}" added.`,
        onSuccess: (created) => {
          if (getDataAdapterMode() === 'local') {
            setTeam(teamService.getAll());
          } else if (created) {
            setTeam((prev) => [...prev, created]);
          }
        },
      }),
    [runAsyncMutation]
  );

  const updateTeamMember = useCallback(
    async (id, patch) =>
      runAsyncMutation(() => teamService.updateTeamMember(id, patch), {
        successToast: 'Team member updated.',
        onSuccess: (updated) => {
          if (getDataAdapterMode() === 'local') {
            setTeam(teamService.getAll());
          } else if (updated) {
            setTeam((prev) => prev.map((m) => (m.id === id ? updated : m)));
          }
        },
      }),
    [runAsyncMutation]
  );

  const reorderTeamMember = useCallback(
    async (id, direction) =>
      runAsyncMutation(() => teamService.reorderTeamMember(id, direction), {
        successToast: null,
        onSuccess: (reordered) => {
          if (getDataAdapterMode() === 'local') {
            setTeam(teamService.getAll());
          } else if (Array.isArray(reordered)) {
            setTeam(reordered);
          }
        },
      }),
    [runAsyncMutation]
  );

  const deleteTeamMember = useCallback(
    async (id) =>
      runAsyncMutation(() => teamService.deleteTeamMember(id), {
        successToast: 'Team member removed.',
        toastType: 'info',
        onSuccess: () => {
          if (getDataAdapterMode() === 'local') {
            setTeam(teamService.getAll());
          } else {
            setTeam((prev) => prev.filter((m) => m.id !== id));
          }
        },
      }),
    [runAsyncMutation]
  );

  // Settings
  const updateSettings = useCallback(
    async (patch) =>
      runAsyncMutation(() => settingsService.saveSettings(patch), {
        successToast: 'Website settings saved.',
        onSuccess: (updated) => {
          if (updated) {
            setSettings(updated);
          }
        },
      }),
    [runAsyncMutation]
  );

  const resetDemoData = useCallback(() => {
    const res = resetAllDemoData();
    if (!res.ok) {
      addToast(res.message || 'Failed resetting catalog defaults.', 'error');
      return res;
    }
    refreshLocalState();
    addToast('Catalog defaults restored and backup snapshot saved.', 'info');
    return res;
  }, [refreshLocalState, addToast]);

  const restoreFromBackup = useCallback(() => {
    const res = restoreFromBackupSnapshot();
    if (!res.ok) {
      addToast(res.message || 'No valid backup snapshot found.', 'error');
      return res;
    }
    refreshLocalState();
    addToast('LocalStorage data restored from pre-cleanup backup snapshot.', 'success');
    return res;
  }, [refreshLocalState, addToast]);

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
      if (import.meta?.env?.DEV) {
        console.error('Export failed:', err);
      }
      addToast('Failed to export local data snapshot.', 'error');
    }
    return snapshot;
  }, [addToast]);

  const value = {
    dataAdapterMode: getDataAdapterMode(),
    submissionMode: getSubmissionMode(),
    adminAccessPolicy: getAdminAccessPolicy(),
    storageDiagnostics: getStorageDiagnostics(),
    isLoading,
    resourceStatus,
    resourceErrors,
    isMutating: pendingOperations > 0,
    pendingOperations,
    error,
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
    confirmState: confirmDialog,
    addToast,
    dismissToast,
    removeToast: dismissToast,
    requestConfirm,
    closeConfirm,
    refreshAll,
    createOrder,
    submitOrder: createOrder,
    updateOrder,
    deleteOrder,
    trackOrder,
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
    restoreFromBackup,
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

