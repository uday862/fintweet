const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';

// Helper to include JWT if present
function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
}

export async function fetchTweets() {
  const res = await fetch(`${API_BASE}/tweets`);
  return res.json();
}

export async function fetchNewTweets() {
  const res = await fetch(`${API_BASE}/tweets/fetch`);
  return res.json();
}

export async function postTweet(tweet) {
  const res = await fetch(`${API_BASE}/tweets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tweet)
  });
  return res.json();
}

export async function fetchStocks() {
  console.log('📡 Fetching stocks from:', `${API_BASE}/stocks`);
  const res = await fetch(`${API_BASE}/stocks`);
  console.log('📡 Stocks response status:', res.status);
  const data = await res.json();
  console.log('📡 Stocks data received:', data);
  return data;
}

export async function fetchCompany(symbol, timeframe = '1D') {
  const res = await fetch(`${API_BASE}/company/${symbol}?timeframe=${timeframe}`);
  return res.json();
}

export async function fetchSentiment(symbol) {
  const params = symbol ? `?symbol=${encodeURIComponent(symbol)}` : '';
  const res = await fetch(`${API_BASE}/sentiment${params}`);
  return res.json();
}

export async function fetchDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`);
  return res.json();
}

export async function fetchHealth() {
  console.log('📡 Fetching health status from:', `${API_BASE}/health`);
  const res = await fetch(`${API_BASE}/health`);
  console.log('📡 Health response status:', res.status);
  const data = await res.json();
  console.log('📡 Health data received:', data);
  return data;
} 

// Auth APIs
export async function authLogin(credentials) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(credentials)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function authRegister(payload) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Register failed');
  return data;
}

// User Watchlist APIs
export async function getWatchlist() {
  const res = await fetch(`${API_BASE}/user/watchlist`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function addToWatchlist(symbol, notes = '') {
  const res = await fetch(`${API_BASE}/user/watchlist`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ symbol, notes })
  });
  return res.json();
}

export async function removeFromWatchlist(symbol) {
  const res = await fetch(`${API_BASE}/user/watchlist/${encodeURIComponent(symbol)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return res.json();
}

// Orders APIs
export async function getOrders() {
  const res = await fetch(`${API_BASE}/user/orders`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function placeOrder(order) {
  const res = await fetch(`${API_BASE}/user/orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(order)
  });
  return res.json();
}

export async function cancelOrder(orderId) {
  const res = await fetch(`${API_BASE}/user/orders/${orderId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return res.json();
}

// Peer-to-peer global orders APIs
export async function createGlobalOrder(payload) {
  const res = await fetch(`${API_BASE}/global-orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function searchGlobalOrders(symbol, side) {
  const params = new URLSearchParams();
  if (symbol) params.append('symbol', symbol);
  if (side) params.append('side', side);
  const res = await fetch(`${API_BASE}/global-orders?${params.toString()}`);
  return res.json();
}

export async function buyGlobalOrder(orderId) {
  const res = await fetch(`${API_BASE}/global-orders/${orderId}/buy`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function cancelGlobalOrder(orderId) {
  const res = await fetch(`${API_BASE}/global-orders/${orderId}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function getMyGlobalOrders(role = 'seller', status) {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  if (status) params.append('status', status);
  const res = await fetch(`${API_BASE}/global-orders/mine?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export { API_BASE };

// Notifications APIs
export async function getNotifications() {
  const res = await fetch(`${API_BASE}/user/notifications`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function markNotificationsRead() {
  const res = await fetch(`${API_BASE}/user/notifications/read`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return res.json();
}

// Market News API
export async function fetchMarketNews() {
  const res = await fetch(`${API_BASE}/news/market`);
  if (!res.ok) throw new Error('Failed to fetch market news');
  return res.json();
}

// Company-specific News API
export async function fetchCompanyNews(symbol) {
  const res = await fetch(`${API_BASE}/news/company/${symbol}`);
  if (!res.ok) throw new Error(`Failed to fetch news for ${symbol}`);
  return res.json();
}