import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clientAuthService } from '../services/api/clientAuthService.js';
import { getClientAccessPolicy, subscribeClientAuth } from '../services/api/clientApiClient.js';

const ClientAuthContext = createContext(null);

export function ClientAuthProvider({ children }) {
  const [client, setClient] = useState(() => clientAuthService.getSession()?.client || null);
  const [authStatus, setAuthStatus] = useState(() => {
    const policy = getClientAccessPolicy();
    if (policy === 'blocked_production_local') return 'blocked';
    return 'checking';
  });
  const [authMessage, setAuthMessage] = useState('');

  const refreshClientSession = useCallback(async () => {
    const policy = getClientAccessPolicy();
    if (policy === 'blocked_production_local') {
      setClient(null);
      setAuthStatus('blocked');
      return { authenticated: false, client: null, policy };
    }

    setAuthStatus('checking');
    const res = await clientAuthService.verifySession();
    if (res.authenticated && res.client) {
      setClient(res.client);
      setAuthStatus('authenticated');
      setAuthMessage('');
    } else {
      setClient(null);
      setAuthStatus(policy === 'blocked_production_local' ? 'blocked' : 'unauthenticated');
      setAuthMessage(res.message || '');
    }
    return res;
  }, []);

  useEffect(() => {
    let active = true;
    refreshClientSession();

    const unsubscribe = subscribeClientAuth((session) => {
      if (!active) return;
      if (getClientAccessPolicy() === 'blocked_production_local') {
        setClient(null);
        setAuthStatus('blocked');
        return;
      }
      if (session?.client) {
        setClient(session.client);
        setAuthStatus('authenticated');
      } else {
        setClient(null);
        setAuthStatus('unauthenticated');
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [refreshClientSession]);

  const loginClient = useCallback(async (credentials) => {
    const res = await clientAuthService.login(credentials);
    if (res.success && res.data?.client) {
      setClient(res.data.client);
      setAuthStatus('authenticated');
      setAuthMessage('');
    }
    return res;
  }, []);

  const logoutClient = useCallback(async (options = {}) => {
    const res = await clientAuthService.logout(options);
    setClient(null);
    setAuthStatus(
      getClientAccessPolicy() === 'blocked_production_local' ? 'blocked' : 'unauthenticated'
    );
    return res;
  }, []);

  const updateClientProfile = useCallback(async (patch) => {
    const res = await clientAuthService.updateProfile(patch);
    if (res.success && res.data?.client) {
      setClient(res.data.client);
    }
    return res;
  }, []);

  const value = {
    client,
    isClientAuthenticated: authStatus === 'authenticated' && Boolean(client),
    authStatus,
    authMessage,
    clientAccessPolicy: getClientAccessPolicy(),
    refreshClientSession,
    registerClient: clientAuthService.register,
    verifyClientEmail: clientAuthService.verifyEmail,
    resendVerification: clientAuthService.resendVerification,
    loginClient,
    logoutClient,
    forgotPassword: clientAuthService.forgotPassword,
    resetPassword: clientAuthService.resetPassword,
    updateClientProfile,
    changeClientPassword: clientAuthService.changePassword,
    revokeAllClientSessions: clientAuthService.revokeAllSessions,
  };

  return <ClientAuthContext.Provider value={value}>{children}</ClientAuthContext.Provider>;
}

export function useClientAuth() {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) {
    throw new Error('useClientAuth must be used inside ClientAuthProvider');
  }
  return ctx;
}
