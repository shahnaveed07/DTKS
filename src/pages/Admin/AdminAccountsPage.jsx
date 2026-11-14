import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Eye,
  Edit3,
  Power,
  KeyRound,
  Trash2,
  X,
  RefreshCw,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { authService } from '../../services/api/authService.js';
import { getAdminAccessPolicy, getAdminAuthSession } from '../../services/api/apiClient.js';
import {
  canManageAdminAccounts,
  canViewAdminAccounts,
  formatAdminRole,
  validateAdminAccountForm,
} from '../../utils/authValidation.js';
import { PasswordInput } from '../../components/auth/PasswordStrengthMeter.jsx';
import SEO from '../../components/common/SEO.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

const PAGE_SIZE = 10;

function formatDateTime(value) {
  if (!value) return 'Never';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminAccountsPage() {
  const { addToast, requestConfirm } = useApp();
  const policy = getAdminAccessPolicy();
  const isApiMode = policy === 'session_required';
  const sessionAdmin = isApiMode
    ? getAdminAuthSession()?.admin
    : {
        id: 'adm-local-super',
        name: 'Local Development Admin',
        email: 'support@dreamtechkashmirsolutions.studio',
        role: 'super_admin',
      };

  const currentRole = sessionAdmin?.role || '';
  const canView = canViewAdminAccounts(currentRole);
  const canManage = canManageAdminAccounts(currentRole);

  const [admins, setAdmins] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [viewingAdmin, setViewingAdmin] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Form state
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    password: '',
    role: 'editor',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [formServerError, setFormServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAdmins = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const res = await authService.listAdminUsers({
      search,
      role: roleFilter,
      status: statusFilter,
      page,
      limit: PAGE_SIZE,
    });
    if (!res.success) {
      setLoadError({
        message: res.message || 'Failed loading administrator accounts.',
        statusCode: res.statusCode,
        errorCode: res.errorCode,
      });
      setAdmins([]);
    } else {
      const list = Array.isArray(res.data?.admins) ? res.data.admins : [];
      setAdmins(list);
      setPagination(res.data?.pagination || null);
    }
    setLoading(false);
  }, [canView, search, roleFilter, statusFilter, page]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Client-side fallback filtering/pagination if backend returns the full unpaginated array
  const displayedAdmins = useMemo(() => {
    if (pagination) return admins;
    const q = search.trim().toLowerCase();
    return admins.filter((item) => {
      if (roleFilter !== 'all' && item.role !== roleFilter) return false;
      if (statusFilter === 'active' && !item.isActive) return false;
      if (statusFilter === 'inactive' && item.isActive) return false;
      if (q) {
        const hay = `${item.name} ${item.email} ${item.role}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [admins, pagination, search, roleFilter, statusFilter]);

  const openCreateModal = () => {
    setFormValues({
      name: '',
      email: '',
      password: '',
      role: 'editor',
      isActive: true,
    });
    setFormErrors({});
    setFormServerError('');
    setShowCreateModal(true);
  };

  const openEditModal = (admin) => {
    setFormValues({
      name: admin.name || '',
      email: admin.email || '',
      password: '',
      role: admin.role || 'editor',
      isActive: Boolean(admin.isActive),
    });
    setFormErrors({});
    setFormServerError('');
    setEditingAdmin(admin);
  };

  const openViewModal = async (admin) => {
    setViewingAdmin(admin);
    if (isApiMode) {
      setViewLoading(true);
      const res = await authService.getAdminUser(admin.id);
      if (res.success && res.data?.admin) {
        setViewingAdmin(res.data.admin);
      }
      setViewLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !canManage) return;
    setFormErrors({});
    setFormServerError('');

    const validation = validateAdminAccountForm({
      ...formValues,
      isEdit: false,
    });
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await authService.createAdminUser({
        ...validation.data,
        isActive: formValues.isActive,
      });
      if (!res.success) {
        if (res.details && typeof res.details === 'object') {
          setFormErrors(res.details);
        }
        setFormServerError(res.message || 'Unable to create administrator account.');
        return;
      }
      addToast(`Administrator account for ${validation.data.email} created.`, 'success');
      setShowCreateModal(false);
      await fetchAdmins();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !editingAdmin || !canManage) return;
    setFormErrors({});
    setFormServerError('');

    const validation = validateAdminAccountForm({
      ...formValues,
      isEdit: true,
    });
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    const roleChanged = validation.data.role !== editingAdmin.role;
    const executeUpdate = async () => {
      setSubmitting(true);
      try {
        const res = await authService.updateAdminUser(editingAdmin.id, {
          name: validation.data.name,
          role: validation.data.role,
        });
        if (!res.success) {
          setFormServerError(res.message || 'Failed updating administrator account.');
          return;
        }
        addToast(`Updated administrator ${editingAdmin.email}.`, 'success');
        setEditingAdmin(null);
        await fetchAdmins();
      } finally {
        setSubmitting(false);
      }
    };

    if (roleChanged) {
      requestConfirm({
        title: `Change role for ${editingAdmin.name}?`,
        message: `This updates ${editingAdmin.email} from ${formatAdminRole(editingAdmin.role)} to ${formatAdminRole(validation.data.role)}.`,
        confirmLabel: 'Confirm Role Change',
        variant: 'primary',
        onConfirm: executeUpdate,
      });
      return;
    }

    await executeUpdate();
  };

  const handleToggleActive = (admin) => {
    if (!canManage) return;
    const nextState = !admin.isActive;
    requestConfirm({
      title: nextState ? `Activate ${admin.name}?` : `Deactivate ${admin.name}?`,
      message: nextState
        ? `${admin.email} will regain access to the DTKS Administration Console.`
        : `${admin.email} will be blocked from signing in and any active sessions will be revoked.`,
      confirmLabel: nextState ? 'Activate Account' : 'Deactivate Account',
      variant: nextState ? 'primary' : 'danger',
      onConfirm: async () => {
        const res = await authService.updateAdminUser(admin.id, { isActive: nextState });
        if (!res.success) {
          addToast(res.message || 'Failed updating account status.', 'error');
          return;
        }
        addToast(
          nextState ? `${admin.email} activated.` : `${admin.email} deactivated.`,
          nextState ? 'success' : 'info'
        );
        await fetchAdmins();
      },
    });
  };

  const handleRevokeSessions = (admin) => {
    if (!canManage) return;
    requestConfirm({
      title: `Revoke active sessions for ${admin.name}?`,
      message: `${admin.email} will be signed out across all browsers and devices and must sign in again.`,
      confirmLabel: 'Revoke Sessions',
      variant: 'danger',
      onConfirm: async () => {
        const res = await authService.revokeAdminSessions(admin.id);
        if (!res.success) {
          addToast(res.message || 'Unable to revoke sessions.', 'error');
          return;
        }
        addToast(`Active sessions revoked for ${admin.email}.`, 'info');
        await fetchAdmins();
      },
    });
  };

  const handleDeleteAdmin = (admin) => {
    if (!canManage) return;
    requestConfirm({
      title: `Delete administrator ${admin.name}?`,
      message: `This permanently deletes ${admin.email}. Consider deactivating instead if you want to retain audit history.`,
      confirmLabel: 'Delete Account',
      variant: 'danger',
      onConfirm: async () => {
        const res = await authService.deleteAdminUser(admin.id);
        if (!res.success) {
          addToast(res.message || 'Failed deleting administrator account.', 'error');
          return;
        }
        addToast(`Administrator ${admin.email} removed.`, 'info');
        if (viewingAdmin?.id === admin.id) setViewingAdmin(null);
        await fetchAdmins();
      },
    });
  };

  if (!canView) {
    return (
      <div className="rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs space-y-3">
        <SEO noindex fullTitle="Access Denied | Admin Accounts | DTKS" />
        <div className="inline-flex items-center gap-2 text-red-600 text-sm font-semibold">
          <ShieldAlert className="w-5 h-5" />
          <span>403 · Access Restricted</span>
        </div>
        <h1 className="font-display text-xl font-bold text-[#17231C]">
          Admin Accounts Access Restricted
        </h1>
        <p className="text-sm text-[#64756B]">
          Only Super Admin and Admin roles may view administrator accounts.
        </p>
      </div>
    );
  }

  return (
    <>
      <SEO noindex fullTitle="Admin Accounts | Admin | DTKS" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Admin Accounts
            </h1>
            <p className="mt-1 text-sm text-[#64756B]">
              {canManage
                ? 'Manage DTKS administrator accounts, roles, activation status, and active sessions.'
                : 'Read-only directory of DTKS administrator accounts and assigned roles.'}
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Admin Account</span>
            </button>
          )}
        </div>

        {!canManage && (
          <div className="rounded-xl border border-[#E3EBE5] bg-[#E8F5EC]/60 px-4 py-3 text-xs text-[#17231C]">
            Signed in as <span className="font-semibold">{formatAdminRole(currentRole)}</span>.
            Account creation, role elevation, deactivation, and session revocation are restricted to Super Admins.
          </div>
        )}

        {/* Search & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-[#64756B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search admin accounts by name or email"
              placeholder="Search administrator name or email..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] placeholder:text-[#64756B]/70 focus:outline-none focus:border-[#16834A]"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by admin role"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by account status"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs overflow-hidden">
            <div className="divide-y divide-[#E3EBE5]">
              {[1, 2, 3].map((row) => (
                <div key={row} className="px-4 py-4 flex items-center justify-between gap-4 animate-pulse">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-40 bg-[#E3EBE5] rounded" />
                    <div className="h-3 w-56 bg-[#F7FAF7] rounded" />
                  </div>
                  <div className="h-6 w-20 bg-[#E3EBE5] rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && loadError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-red-700">
                Unable to Load Administrator Accounts
                {loadError.statusCode ? ` (HTTP ${loadError.statusCode})` : ''}
              </h2>
              <p className="text-xs sm:text-sm text-[#64756B]">{loadError.message}</p>
            </div>
            <button
              type="button"
              onClick={fetchAdmins}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7] transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Populated Table */}
        {!loading && !loadError && displayedAdmins.length > 0 && (
          <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E3EBE5] bg-[#E8F5EC]/50 text-xs text-[#116438]">
                    <th className="py-3 px-4 font-semibold">Admin Name</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Created</th>
                    <th className="py-3 px-4 font-semibold">Last Login</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EBE5]">
                  {displayedAdmins.map((admin) => {
                    const isSelf = sessionAdmin?.id && admin.id === sessionAdmin.id;
                    return (
                      <tr key={admin.id} className="hover:bg-[#F7FAF7] transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#17231C]">
                          {admin.name}
                          {isSelf && (
                            <span className="ml-2 text-xs font-normal text-[#16834A]">(You)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#64756B]">{admin.email}</td>
                        <td className="py-3.5 px-4 text-xs font-medium text-[#17231C] whitespace-nowrap">
                          {formatAdminRole(admin.role)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`text-xs font-semibold ${
                              admin.isActive ? 'text-[#16834A]' : 'text-red-600'
                            }`}
                          >
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono-tabular text-xs text-[#64756B] whitespace-nowrap">
                          {formatDateTime(admin.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 font-mono-tabular text-xs text-[#64756B] whitespace-nowrap">
                          {formatDateTime(admin.lastLoginAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openViewModal(admin)}
                              aria-label={`View details for ${admin.name}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] hover:border-[#16834A] hover:text-[#16834A] transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(admin)}
                                  aria-label={`Edit ${admin.name}`}
                                  className="p-1.5 rounded-lg border border-[#E3EBE5] text-[#17231C] hover:border-[#16834A] hover:text-[#16834A] transition-colors"
                                  title="Edit account & role"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {!isSelf && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleActive(admin)}
                                      aria-label={
                                        admin.isActive
                                          ? `Deactivate ${admin.name}`
                                          : `Activate ${admin.name}`
                                      }
                                      title={admin.isActive ? 'Deactivate account' : 'Activate account'}
                                      className="p-1.5 rounded-lg border border-[#E3EBE5] text-[#17231C] hover:border-[#16834A] hover:text-[#16834A] transition-colors"
                                    >
                                      <Power className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeSessions(admin)}
                                      aria-label={`Revoke sessions for ${admin.name}`}
                                      title="Revoke active sessions"
                                      className="p-1.5 rounded-lg border border-[#E3EBE5] text-amber-700 hover:bg-amber-50 transition-colors"
                                    >
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAdmin(admin)}
                                      aria-label={`Delete ${admin.name}`}
                                      title="Delete account"
                                      className="p-1.5 rounded-lg border border-[#E3EBE5] text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[#E3EBE5] flex items-center justify-between text-xs text-[#64756B]">
                <span className="tabular-nums">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} accounts)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E3EBE5] text-[#17231C] disabled:opacity-40 hover:bg-[#F7FAF7]"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E3EBE5] text-[#17231C] disabled:opacity-40 hover:bg-[#F7FAF7]"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !loadError && displayedAdmins.length === 0 && (
          <EmptyState
            title="No matching administrator accounts"
            description="Adjust your search query or role/status filters."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearch('');
              setRoleFilter('all');
              setStatusFilter('all');
              setPage(1);
            }}
          />
        )}
      </div>

      {/* Create Admin Account Modal */}
      {showCreateModal && canManage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17231C]/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-admin-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-[#E3EBE5] bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 id="create-admin-title" className="font-display text-lg font-bold text-[#17231C]">
                Create Admin Account
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close modal"
                className="p-1 rounded text-[#64756B] hover:text-[#17231C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4" noValidate>
              {formServerError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                  {formServerError}
                </div>
              )}

              <div>
                <label htmlFor="create-admin-name" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Full Name<span className="text-red-600 ml-0.5">*</span>
                </label>
                <input
                  id="create-admin-name"
                  type="text"
                  value={formValues.name}
                  onChange={(e) => setFormValues((v) => ({ ...v, name: e.target.value }))}
                  placeholder="Enter full name"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3EBE5] text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
                {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
              </div>

              <div>
                <label htmlFor="create-admin-email" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Administrator Email<span className="text-red-600 ml-0.5">*</span>
                </label>
                <input
                  id="create-admin-email"
                  type="email"
                  value={formValues.email}
                  onChange={(e) => setFormValues((v) => ({ ...v, email: e.target.value }))}
                  placeholder="admin@dreamtechkashmirsolutions.studio"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3EBE5] text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
                {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
              </div>

              <PasswordInput
                id="create-admin-password"
                label="Initial Password"
                value={formValues.password}
                onChange={(e) => setFormValues((v) => ({ ...v, password: e.target.value }))}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                required
                showStrength
                error={formErrors.password}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="create-admin-role" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Role
                  </label>
                  <select
                    id="create-admin-role"
                    value={formValues.role}
                    onChange={(e) => setFormValues((v) => ({ ...v, role: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  >
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-[#17231C]">
                    <input
                      type="checkbox"
                      checked={formValues.isActive}
                      onChange={(e) => setFormValues((v) => ({ ...v, isActive: e.target.checked }))}
                      className="accent-[#16834A]"
                    />
                    <span>Account active immediately</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-50 text-white"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {editingAdmin && canManage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17231C]/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-admin-title"
        >
          <div className="w-full max-w-md rounded-xl border border-[#E3EBE5] bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 id="edit-admin-title" className="font-display text-lg font-bold text-[#17231C]">
                Edit Admin Account
              </h2>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                aria-label="Close modal"
                className="p-1 rounded text-[#64756B] hover:text-[#17231C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
              {formServerError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                  {formServerError}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-[#64756B]">Email</p>
                <p className="mt-0.5 text-sm font-medium text-[#17231C]">{editingAdmin.email}</p>
              </div>

              <div>
                <label htmlFor="edit-admin-name" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Full Name<span className="text-red-600 ml-0.5">*</span>
                </label>
                <input
                  id="edit-admin-name"
                  type="text"
                  value={formValues.name}
                  onChange={(e) => setFormValues((v) => ({ ...v, name: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3EBE5] text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
                {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
              </div>

              <div>
                <label htmlFor="edit-admin-role" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Role
                </label>
                <select
                  id="edit-admin-role"
                  value={formValues.role}
                  disabled={sessionAdmin?.id === editingAdmin.id}
                  onChange={(e) => setFormValues((v) => ({ ...v, role: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] disabled:opacity-60 focus:outline-none focus:border-[#16834A]"
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                {sessionAdmin?.id === editingAdmin.id && (
                  <p className="mt-1 text-xs text-[#64756B]">
                    You cannot change your own Super Admin role.
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-50 text-white"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Admin Details Modal */}
      {viewingAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17231C]/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-admin-title"
        >
          <div className="w-full max-w-md rounded-xl border border-[#E3EBE5] bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 id="view-admin-title" className="font-display text-lg font-bold text-[#17231C]">
                Administrator Details
              </h2>
              <button
                type="button"
                onClick={() => setViewingAdmin(null)}
                aria-label="Close details modal"
                className="p-1 rounded text-[#64756B] hover:text-[#17231C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {viewLoading ? (
              <p className="text-xs text-[#64756B]">Loading latest account details...</p>
            ) : (
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <dt className="text-xs text-[#64756B]">Full Name</dt>
                  <dd className="mt-0.5 font-semibold text-[#17231C]">{viewingAdmin.name}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-[#64756B]">Email</dt>
                  <dd className="mt-0.5 text-[#17231C]">{viewingAdmin.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#64756B]">Role</dt>
                  <dd className="mt-0.5 font-medium text-[#17231C]">
                    {formatAdminRole(viewingAdmin.role)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#64756B]">Status</dt>
                  <dd
                    className={`mt-0.5 font-semibold ${
                      viewingAdmin.isActive ? 'text-[#16834A]' : 'text-red-600'
                    }`}
                  >
                    {viewingAdmin.isActive ? 'Active' : 'Inactive'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#64756B]">Created</dt>
                  <dd className="mt-0.5 font-mono-tabular text-xs text-[#17231C]">
                    {formatDateTime(viewingAdmin.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#64756B]">Last Login</dt>
                  <dd className="mt-0.5 font-mono-tabular text-xs text-[#17231C]">
                    {formatDateTime(viewingAdmin.lastLoginAt)}
                  </dd>
                </div>
              </dl>
            )}

            <div className="pt-2 flex justify-end gap-3 border-t border-[#E3EBE5]">
              {canManage && sessionAdmin?.id !== viewingAdmin.id && (
                <button
                  type="button"
                  onClick={() => handleRevokeSessions(viewingAdmin)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#E3EBE5] text-amber-700 hover:bg-amber-50"
                >
                  Revoke Sessions
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingAdmin(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#16834A] text-white hover:bg-[#116438]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
