import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import api, { authApi, setAuthToken, getAuthToken, wsClient } from '../services/api.js';

// Auth context
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check existing auth on mount
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      authApi.me()
        .then(data => {
          setUser(data.user);
          wsClient.connect(token);
        })
        .catch(() => {
          setAuthToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);
  
  // Auth with wallet
  const loginWithWallet = useCallback(async (walletAddress, signMessage) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get nonce
      const { nonce } = await authApi.getNonce(walletAddress);
      
      // Sign the nonce
      const signedMessage = await signMessage(nonce);
      
      // Verify signature
      const { token, user } = await authApi.verify(walletAddress, signedMessage, walletAddress);
      
      setAuthToken(token);
      setUser(user);
      wsClient.connect(token);
      
      return { success: true, user };
    } catch (err) {
      if (err.status === 404) {
        // User not registered, return nonce for registration
        return { success: false, needsRegistration: true, walletAddress };
      }
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Register new user
  const register = useCallback(async (walletAddress, signMessage, displayName) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get nonce
      const { nonce } = await authApi.getNonce(walletAddress);
      
      // Sign the nonce
      const signedMessage = await signMessage(nonce);
      
      // Register
      const { token, user } = await authApi.register(walletAddress, signedMessage, walletAddress, displayName);
      
      setAuthToken(token);
      setUser(user);
      wsClient.connect(token);
      
      return { success: true, user };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Logout
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Ignore logout errors
    }
    setAuthToken(null);
    setUser(null);
    wsClient.disconnect();
  }, []);
  
  // Update user profile
  const updateProfile = useCallback(async (data) => {
    const { user: updatedUser } = await api.users.updateProfile(data);
    setUser(prev => ({ ...prev, ...updatedUser }));
    return updatedUser;
  }, []);
  
  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    loginWithWallet,
    register,
    logout,
    updateProfile,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Generic data fetching hook
export function useApiQuery(queryFn, deps = [], options = {}) {
  const [data, setData] = useState(options.initialData ?? null);
  const [loading, setLoading] = useState(!options.initialData);
  const [error, setError] = useState(null);
  
  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await queryFn();
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, deps);
  
  useEffect(() => {
    if (!options.skip) {
      refetch();
    }
  }, [...deps, options.skip]);
  
  return { data, loading, error, refetch };
}

// Creators hooks
export function useCreators(page = 1, limit = 20, category = null) {
  return useApiQuery(
    () => api.creators.list(page, limit, category),
    [page, limit, category]
  );
}

export function useFeaturedCreators() {
  return useApiQuery(() => api.creators.featured(), []);
}

export function useCreator(id) {
  return useApiQuery(
    () => api.creators.getById(id),
    [id],
    { skip: !id }
  );
}

export function useCreatorStats() {
  const { user } = useAuth();
  return useApiQuery(
    () => api.creators.getStats(),
    [user?.id],
    { skip: !user?.is_creator }
  );
}

// Subscriptions hooks
export function useMySubscriptions(page = 1, limit = 20) {
  const { user } = useAuth();
  return useApiQuery(
    () => api.users.getSubscriptions(page, limit),
    [page, limit, user?.id],
    { skip: !user }
  );
}

// Transactions hooks
export function useTransactions(page = 1, limit = 20, type = 'all', status = 'all') {
  const { user } = useAuth();
  return useApiQuery(
    () => api.transactions.list(page, limit, type, status),
    [page, limit, type, status, user?.id],
    { skip: !user }
  );
}

export function useTransactionStats() {
  const { user } = useAuth();
  return useApiQuery(
    () => api.transactions.getStats(),
    [user?.id],
    { skip: !user }
  );
}

// Notifications hooks
export function useNotifications(unreadOnly = false) {
  const { user } = useAuth();
  return useApiQuery(
    () => api.users.getNotifications(unreadOnly),
    [unreadOnly, user?.id],
    { skip: !user }
  );
}

// WebSocket hooks
export function useWebSocket(events = []) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  
  useEffect(() => {
    const unsubConnected = wsClient.on('connected', () => setIsConnected(true));
    const unsubDisconnected = wsClient.on('disconnected', () => setIsConnected(false));
    const unsubMessage = wsClient.on('message', setLastMessage);
    
    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubMessage();
    };
  }, []);
  
  useEffect(() => {
    if (isConnected && events.length > 0) {
      wsClient.subscribe(events);
    }
  }, [isConnected, events.join(',')]);
  
  return { isConnected, lastMessage };
}

// Mutation hooks
export function useSubscribe() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const subscribe = async (creatorId, tierId, amountXlm, txHash) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.subscriptions.subscribe(creatorId, tierId, amountXlm, txHash);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { subscribe, loading, error };
}

export function useTip() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const tip = async (creatorId, amountXlm, txHash, message = null) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.transactions.tip(creatorId, amountXlm, txHash, message);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { tip, loading, error };
}
