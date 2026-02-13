const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

let authToken = localStorage.getItem('orrbit_token');

// Token management
export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('orrbit_token', token);
  } else {
    localStorage.removeItem('orrbit_token');
  }
}

export function getAuthToken() {
  return authToken;
}

// HTTP client
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

// Auth API
export const authApi = {
  getNonce: (walletAddress) => 
    request(`/auth/nonce/${walletAddress}`),
  
  verify: (walletAddress, signedMessage, publicKey) =>
    request('/auth/verify', {
      method: 'POST',
      body: { walletAddress, signedMessage, publicKey },
    }),
  
  register: (walletAddress, signedMessage, publicKey, displayName) =>
    request('/auth/register', {
      method: 'POST',
      body: { walletAddress, signedMessage, publicKey, displayName },
    }),
  
  me: () => request('/auth/me'),
  
  logout: () => request('/auth/logout', { method: 'POST' }),
};

// Users API
export const usersApi = {
  getByWallet: (walletAddress) =>
    request(`/users/${walletAddress}`),
  
  updateProfile: (data) =>
    request('/users/me', { method: 'PATCH', body: data }),
  
  getSubscriptions: (page = 1, limit = 20) =>
    request(`/users/me/subscriptions?page=${page}&limit=${limit}`),
  
  getTransactions: (page = 1, limit = 20) =>
    request(`/users/me/transactions?page=${page}&limit=${limit}`),
  
  getNotifications: (unreadOnly = false) =>
    request(`/users/me/notifications?unreadOnly=${unreadOnly}`),
  
  markNotificationsRead: (ids) =>
    request('/users/me/notifications/read', { method: 'POST', body: { ids } }),
};

// Creators API
export const creatorsApi = {
  list: (page = 1, limit = 20, category = null) => {
    let url = `/creators?page=${page}&limit=${limit}`;
    if (category) url += `&category=${category}`;
    return request(url);
  },
  
  featured: () => request('/creators/featured'),
  
  getById: (id) => request(`/creators/${id}`),
  
  getByWallet: (walletAddress) => request(`/creators/wallet/${walletAddress}`),
  
  updateProfile: (data) =>
    request('/creators/me', { method: 'PATCH', body: data }),
  
  getSubscribers: (page = 1, limit = 20) =>
    request(`/creators/me/subscribers?page=${page}&limit=${limit}`),
  
  getStats: () => request('/creators/me/stats'),
  
  // Tiers
  createTier: (data) =>
    request('/creators/me/tiers', { method: 'POST', body: data }),
  
  updateTier: (tierId, data) =>
    request(`/creators/me/tiers/${tierId}`, { method: 'PATCH', body: data }),
  
  deleteTier: (tierId) =>
    request(`/creators/me/tiers/${tierId}`, { method: 'DELETE' }),
};

// Subscriptions API
export const subscriptionsApi = {
  subscribe: (creatorId, tierId, amountXlm, txHash) =>
    request('/subscriptions', {
      method: 'POST',
      body: { creatorId, tierId, amountXlm, txHash },
    }),
  
  getById: (id) => request(`/subscriptions/${id}`),
  
  cancel: (id, reason = null) =>
    request(`/subscriptions/${id}/cancel`, {
      method: 'POST',
      body: { reason },
    }),
  
  renew: (id, txHash) =>
    request(`/subscriptions/${id}/renew`, {
      method: 'POST',
      body: { txHash },
    }),
};

// Transactions API
export const transactionsApi = {
  list: (page = 1, limit = 20, type = 'all', status = 'all') =>
    request(`/transactions?page=${page}&limit=${limit}&type=${type}&status=${status}`),
  
  getById: (id) => request(`/transactions/${id}`),
  
  tip: (creatorId, amountXlm, txHash, message = null) =>
    request('/transactions/tip', {
      method: 'POST',
      body: { creatorId, amountXlm, txHash, message },
    }),
  
  getStats: () => request('/transactions/stats'),
};

// WebSocket client
class WebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
  }
  
  connect(token = authToken) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    
    const params = token ? `?token=${token}` : '';
    this.ws = new WebSocket(`${WS_BASE}/ws${params}`);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
        this.emit('message', data);
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.emit('disconnected');
      this.attemptReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  ping() {
    this.send({ type: 'ping' });
  }
  
  subscribe(events) {
    this.send({ type: 'subscribe', events });
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }
  
  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }
  
  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

export const wsClient = new WebSocketClient();

export default {
  setAuthToken,
  getAuthToken,
  auth: authApi,
  users: usersApi,
  creators: creatorsApi,
  subscriptions: subscriptionsApi,
  transactions: transactionsApi,
  ws: wsClient,
};
