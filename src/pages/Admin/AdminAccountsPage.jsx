import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Eye,
  Edit3,
  Power,
  KeyRound,
  Mail,
  X,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
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

function getAccountStatusDisplay(admin) {
  if (admin?.invitePending && admin?.inviteExpired) {
    return {
      label: 'Invitation Expired',
      textClass: 'text-red-600',
      description: 'Invitation link expired before setup was completed. Resend an invitation.',
    };
  }
  if (admin?.invitePending) {
    return {
      label: 'Invitation Pending',
      textClass: 'text-amber-700',
      description: 'Invited administrator has not set a password or accepted the invitation yet.',
    };
  }
  if (admin?.isActive) {
    return {
      label: 'Active',
      textClass: 'text-[#16834A]',
      description: 'Account is active and permitted to sign in.',
    };
  }
  return {
    label: 'Inactive',
    textClass: 'text-red-600',
    description: 'Account is deactivated and blocked from signing in.',
  };
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

  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const refreshInFlightRef = useRef(false);
  const activeRequestIdRef = useRef(0);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Local dev helper banner for newly issued invite token
  const [localInvitePreview, setLocalInvitePreview] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteDeliveryIssue, setInviteDeliveryIssue] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [viewingAdmin, setViewingAdmin] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    if (!viewingAdmin && !editingAdmin && !showCreateModal) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (viewingAdmin) {
          setViewingAdmin(null);
        } else if (editingAdmin) {
          setEditingAdmin(null);
        } else if (showCreateModal) {
          setShowCreateModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingAdmin, editingAdmin, showCreateModal]);

  // Form state (invitation creation has name, email, role ONLY — no initial password)
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    role: 'editor',
  });
  const [formErrors, setFormErrors] = useState({});
  const [formServerError, setFormServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAdmins = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return { success: false, skipped: true };
    }
    const requestId = ++activeRequestIdRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await authService.listAdminUsers({
        search,
        role: roleFilter,
        status: statusFilter,
        page,
        limit: PAGE_SIZE,
      });
      if (requestId !== activeRequestIdRef.current) {
        return res;
      }
      if (!res.success) {
        setLoadError({
          message: res.message || 'Failed loading administrator accounts.',
          statusCode: res.statusCode,
          errorCode: res.errorCode,
        });
        setAccounts([]);
      } else {
        const list = Array.isArray(res.data?.accounts) ? res.data.accounts : [];
        setAccounts(list);
        setPagination(res.data?.pagination || null);
      }
      return res;
    } catch (err) {
      if (requestId !== activeRequestIdRef.current) {
        return { success: false, message: err?.message || 'Failed loading administrator accounts.' };
      }
      const message = err?.message || 'Failed loading administrator accounts.';
      setLoadError({
        message,
        statusCode: null,
        errorCode: 'UNEXPECTED_ERROR',
      });
      setAccounts([]);
      return { success: false, message };
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [canView, search, roleFilter, statusFilter, page]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleRefresh = async () => {
    if (!canView || loading || refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setIsRefreshing(true);
    try {
      const res = await fetchAdmins();
      if (res?.skipped) return;
      if (res?.success) {
        addToast('Administrator accounts refreshed.', 'success');
      } else {
        addToast(res?.message || 'Failed to refresh administrator accounts.', 'error');
      }
    } finally {
      refreshInFlightRef.current = false;
      setIsRefreshing(false);
    }
  };

  // Client-side fallback filtering if backend omits pagination
  const displayedAdmins = useMemo(() => {
    if (pagination) return accounts;
    const q = search.trim().toLowerCase();
    return accounts.filter((item) => {
      if (roleFilter !== 'all' && item.role !== roleFilter) return false;
      if (statusFilter === 'active' && (item.invitePending || !item.isActive)) return false;
      if (statusFilter === 'inactive' && (item.invitePending || item.isActive)) return false;
      if (statusFilter === 'pending' && !item.invitePending) return false;
      if (q) {
        const hay = `${item.name} ${item.email} ${item.role}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [accounts, pagination, search, roleFilter, statusFilter]);

  const openCreateModal = () => {
    setFormValues({
      name: '',
      email: '',
      role: 'editor',
    });
    setFormErrors({});
    setFormServerError('');
    setInviteDeliveryIssue(null);
    setShowCreateModal(true);
  };

  const openEditModal = (admin) => {
    setFormValues({
      name: admin.name || '',
      email: admin.email || '',
      role: admin.role || 'editor',
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
      if (res.success && res.data?.account) {
        setViewingAdmin(res.data.account);
      }
      setViewLoading(false);
    }
  };

  const handleResendInvite = async (admin) => {
    if (!canManage || !admin?.id || resendingId) return;
    setResendingId(admin.id);
    try {
      const res = await authService.resendAdminInvite(admin.id);
      if (!res.success) {
        addToast(res.message || `Failed sending invitation email to ${admin.email}.`, 'error');
        return;
      }
      addToast(`Invitation resent to ${admin.email}.`, 'success');
      if (res.data?.localInviteToken) {
        setLocalInvitePreview({
          email: admin.email,
          token: res.data.localInviteToken,
        });
      }
      if (inviteDeliveryIssue?.account?.id === admin.id) {
        setInviteDeliveryIssue(null);
        setShowCreateModal(false);
      }
      await fetchAdmins();
    } finally {
      setResendingId(null);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !canManage) return;
    setFormErrors({});
    setFormServerError('');

    const validation = validateAdminAccountForm({
      name: formValues.name,
      email: formValues.email,
      role: formValues.role,
      isEdit: false,
    });
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await authService.createAdminUser(validation.data);

      // Handle partial creation where backend created the account despite invitation email failure
      if (
        (!res.success && res.accountCreated) ||
        (res.success && res.data?.inviteEmailSent === false)
      ) {
        const createdAccount = res.partialAccount || res.data?.account || {
          id: null,
          name: validation.data.name,
          email: validation.data.email,
          role: validation.data.role,
          invitePending: true,
        };
        await fetchAdmins();
        setInviteDeliveryIssue({
          account: createdAccount,
          message:
            res.message ||
            `Account for ${validation.data.email} was created and is pending invitation delivery, but the invitation email could not be sent.`,
        });
        return;
      }

      if (!res.success) {
        if (res.details && typeof res.details === 'object') {
          setFormErrors(res.details);
        }
        setFormServerError(res.message || 'Unable to send administrator invitation.');
        return;
      }

      if (res.data?.localInviteToken) {
        setLocalInvitePreview({
          email: validation.data.email,
          token: res.data.localInviteToken,
        });
      }
      addToast(`Invitation sent to ${validation.data.email}.`, 'success');
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
      name: formValues.name,
      role: formValues.role,
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
          if (res.details && typeof res.details === 'object') {
            setFormErrors(res.details);
          }
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
    if (!canManage || admin.invitePending) return;
    const nextState = !admin.isActive;
    requestConfirm({
      title: nextState ? `Activate ${admin.name}?` : `Deactivate ${admin.name}?`,
      message: nextState
        ? `${admin.email} will regain access to the DTKS Administration Console.`
        : `${admin.email} will be blocked from signing in and any active sessions will be revoked.`,
      confirmLabel: nextState ? 'Activate Account' : 'Deactivate Account',
      variant: nextState ? 'primary' : 'danger',
      onConfirm: async () => {
        const res = await authService.updateAdminUserStatus(admin.id, nextState);
        if (!res.success) {
          addToast(res.message || 'Failed updating account status.', 'error');
          return;
        }
        addToast(
          nextState ? `${admin.email} activated.` : `${admin.email} deactivated.`,
          nextState ? 'success' : 'info'
        );
        if (viewingAdmin?.id === admin.id && res.data?.account) {
          setViewingAdmin(res.data.account);
        }
        await fetchAdmins();
      },
    });
  };

  const handleRevokeSessions = (admin) => {
    if (!canManage || admin.invitePending) return;
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
                ? 'Invite administrators, manage roles, activate or deactivate access, and revoke active sessions.'
                : 'Read-only directory of DTKS administrator accounts and assigned roles.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
              aria-label="Refresh administrator accounts"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-[#E3EBE5] bg-white hover:bg-[#F7FAF7] text-[#17231C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`w-4 h-4 text-[#16834A] ${loading || isRefreshing ? 'animate-spin' : ''}`}
              />
              <span>{loading || isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {canManage && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Admin</span>
              </button>
            )}
          </div>
        </div>

        {!canManage && (
          <div className="rounded-xl border border-[#E3EBE5] bg-[#E8F5EC]/60 px-4 py-3 text-xs text-[#17231C]">
            Signed in as <span className="font-semibold">{formatAdminRole(currentRole)}</span>.
            Invitations, role changes, account activation/deactivation, and session revocation are restricted to Super Admins.
          </div>
        )}

        {localInvitePreview && (
          <div className="rounded-xl border border-[#16834A]/30 bg-[#E8F5EC]/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-[#116438] space-y-0.5">
              <p className="font-semibold">
                Local Development Invitation Link ({localInvitePreview.email})
              </p>
              <p className="text-[#64756B]">
                Open the invitation acceptance route to test password setup and activation locally.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                to={`/admin/accept-invite?token=${encodeURIComponent(localInvitePreview.token)}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16834A] hover:underline"
              >
                <span>Accept Invite</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setLocalInvitePreview(null)}
                aria-label="Dismiss invitation link notice"
                className="p-1 rounded text-[#64756B] hover:text-[#17231C]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
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
              <option value="pending">Invitation Pending</option>
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
                    <th className="py-3 px-4 font-semibold">Administrator</th>
                    <th className="py-3 px-3 font-semibold">Role</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-3 font-semibold hidden lg:table-cell">Created</th>
                    <th className="py-3 px-3 font-semibold hidden md:table-cell">Last Login</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EBE5]">
                  {displayedAdmins.map((admin) => {
                    const isSelf = sessionAdmin?.id && admin.id === sessionAdmin.id;
                    const statusDisplay = getAccountStatusDisplay(admin);
                    return (
                      <tr key={admin.id} className="hover:bg-[#F7FAF7] transition-colors">
                        <td className="py-3.5 px-4 min-w-[200px] max-w-[280px]">
                          <div className="font-semibold text-[#17231C] leading-snug">
                            {admin.name}
                            {isSelf && (
                              <span className="ml-2 text-xs font-normal text-[#16834A]">(You)</span>
                            )}
                          </div>
                          <div
                            className="text-xs text-[#64756B] truncate mt-0.5"
                            title={admin.email}
                          >
                            {admin.email}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-xs font-medium text-[#17231C] whitespace-nowrap">
                          {formatAdminRole(admin.role)}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className={`text-xs font-semibold ${statusDisplay.textClass}`}>
                            {statusDisplay.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono-tabular text-xs text-[#64756B] whitespace-nowrap hidden lg:table-cell">
                          {formatDateTime(admin.createdAt)}
                        </td>
                        <td className="py-3.5 px-3 font-mono-tabular text-xs text-[#64756B] whitespace-nowrap hidden md:table-cell">
                          {formatDateTime(admin.lastLoginAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
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
                                  title="Edit name & role"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {admin.invitePending && (
                                  <button
                                    type="button"
                                    disabled={resendingId === admin.id}
                                    onClick={() => handleResendInvite(admin)}
                                    aria-label={`Resend invitation to ${admin.name}`}
                                    title="Resend invitation email"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>
                                      {resendingId === admin.id ? 'Sending...' : 'Resend Invite'}
                                    </span>
                                  </button>
                                )}

                                {!isSelf && !admin.invitePending && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleActive(admin)}
                                      aria-label={
                                        admin.isActive
                                          ? `Deactivate ${admin.name}`
                                          : `Activate ${admin.name}`
                                      }
                                      title={
                                        admin.isActive ? 'Deactivate account' : 'Activate account'
                                      }
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

      {/* Invite Admin Modal */}
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
                {inviteDeliveryIssue ? 'Invitation Pending Delivery' : 'Invite Administrator'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setInviteDeliveryIssue(null);
                }}
                aria-label="Close modal"
                className="p-1 rounded text-[#64756B] hover:text-[#17231C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteDeliveryIssue ? (
              <div className="space-y-4">
                <div
                  role="status"
                  className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-xs text-amber-900"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">
                      Account created as Invitation Pending ({inviteDeliveryIssue.account?.email})
                    </p>
                    <p className="leading-relaxed text-amber-800">
                      {inviteDeliveryIssue.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setInviteDeliveryIssue(null);
                    }}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7]"
                  >
                    Close
                  </button>
                  {inviteDeliveryIssue.account?.id && (
                    <button
                      type="button"
                      disabled={resendingId === inviteDeliveryIssue.account.id}
                      onClick={() => handleResendInvite(inviteDeliveryIssue.account)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-50 text-white"
                    >
                      <Mail className="w-4 h-4" />
                      <span>
                        {resendingId === inviteDeliveryIssue.account.id
                          ? 'Resending...'
                          : 'Resend Invitation'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="space-y-4" noValidate>
                <p className="text-xs text-[#64756B] leading-relaxed">
                  The invited administrator will receive an email link to set their own password and activate their account.
                </p>

                {formServerError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
                  >
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
                    Email<span className="text-red-600 ml-0.5">*</span>
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
                  {formErrors.role && <p className="mt-1 text-xs text-red-600">{formErrors.role}</p>}
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
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-50 text-white"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{submitting ? 'Sending Invitation...' : 'Send Invitation'}</span>
                  </button>
                </div>
              </form>
            )}
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
                  <dd className={`mt-0.5 font-semibold ${getAccountStatusDisplay(viewingAdmin).textClass}`}>
                    {getAccountStatusDisplay(viewingAdmin).label}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#64756B]">Invitation Accepted</dt>
                  <dd className="mt-0.5 font-mono-tabular text-xs text-[#17231C]">
                    {viewingAdmin.inviteAcceptedAt
                      ? formatDateTime(viewingAdmin.inviteAcceptedAt)
                      : viewingAdmin.invitePending
                      ? 'Pending'
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#64756B]">Invited By</dt>
                  <dd className="mt-0.5 font-mono-tabular text-xs text-[#17231C] truncate">
                    {viewingAdmin.invitedByAdminId || '—'}
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
                {viewingAdmin.deactivatedAt && (
                  <div className="col-span-2">
                    <dt className="text-xs text-[#64756B]">Deactivated At</dt>
                    <dd className="mt-0.5 font-mono-tabular text-xs text-red-600">
                      {formatDateTime(viewingAdmin.deactivatedAt)}
                    </dd>
                  </div>
                )}
              </dl>
            )}

            <div className="pt-2 flex flex-wrap justify-end gap-3 border-t border-[#E3EBE5]">
              {canManage && viewingAdmin.invitePending && (
                <button
                  type="button"
                  disabled={resendingId === viewingAdmin.id}
                  onClick={() => handleResendInvite(viewingAdmin)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{resendingId === viewingAdmin.id ? 'Sending...' : 'Resend Invitation'}</span>
                </button>
              )}
              {canManage &&
                sessionAdmin?.id !== viewingAdmin.id &&
                !viewingAdmin.invitePending && (
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
