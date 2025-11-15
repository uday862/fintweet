import React, { useState, useEffect } from 'react';
import './App.css';
import { fetchStocks, fetchDashboard, fetchSentiment, fetchCompany, fetchHealth, getWatchlist, addToWatchlist, removeFromWatchlist, getOrders, cancelOrder, searchGlobalOrders, buyGlobalOrder, createGlobalOrder, getNotifications, markNotificationsRead, getMyGlobalOrders, fetchCompanyNews } from './api';
import LineChart from './components/LineChart';
import Login from './components/Login';
import SentimentOverview from './SentimentOverview';
import Register from './components/Register';

function App() {
  const [marketNews, setMarketNews] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [dashboard, setDashboard] = useState({});
  const [sentiment, setSentiment] = useState({});
  const [companyData, setCompanyData] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('TSLA');
  const [timeFrame, setTimeFrame] = useState('1D');
  const [predictedPrice, setPredictedPrice] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [orders, setOrders] = useState([]);
  const [peerOrders, setPeerOrders] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [myPurchases, setMyPurchases] = useState([]);
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const popularStocks = [
    // US Stocks
    'TSLA', 'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META', 'NFLX',
    // US ETFs
    'SPY', 'QQQ', 'IWM', 'VTI', 'VOO',
    // Indian NSE Stocks (much more reliable than BSE)
    'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ADANIENT.NS',
    'ICICIBANK.NS', 'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS'
  ];

  // Check for existing authentication on app start
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  // Notifications polling
  useEffect(() => {
    const poll = async () => {
      try {
        if (!localStorage.getItem('token')) return;
        const res = await getNotifications();
        setNotifications(res.notifications || []);
      } catch (e) {
        // ignore polling errors
      }
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, []);

  // Authentication handlers
  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    setShowRegister(false);
  };

  const handleRegister = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    setShowRegister(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const switchToRegister = () => setShowRegister(true);
  const switchToLogin = () => setShowRegister(false);

  // Helper function to get currency symbol for a stock
  const getCurrencySymbol = (symbol) => {
    return symbol.includes('.NS') ? '₹' : '$';
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔄 Starting to load data...');
        
        // Add timeout wrapper for API calls
        const withTimeout = (promise, timeoutMs = 10000) => {
          return Promise.race([
            promise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
            )
          ]);
        };

        const [stocksData, dashboardData, sentimentData, healthData] = await Promise.all([
          withTimeout(fetchStocks(), 30000).catch(err => {
            console.log('⚠️ Stocks failed:', err.message);
            return { stocks: [], error: err.message };
          }),
          withTimeout(fetchDashboard()).catch(err => {
            console.log('⚠️ Dashboard failed:', err.message);
            return {};
          }),
          withTimeout(fetchSentiment(selectedCompany)).catch(err => {
            console.log('⚠️ Sentiment failed:', err.message);
            return { positive: 0, neutral: 0, negative: 0 };
          }),
          withTimeout(fetchHealth()).catch(err => {
            console.log('⚠️ Health check failed:', err.message);
            return { status: 'error', database: 'unknown' };
          })
        ]);
        
        console.log('✅ Data loaded successfully');
        setStocks(stocksData.stocks || []);
        setDashboard(dashboardData);
        setSentiment(sentimentData);
        setHealthStatus(healthData);

        // If authenticated, load user data
        try {
          if (localStorage.getItem('token')) {
            const wl = await getWatchlist();
            setWatchlist(wl.watchlist || []);
            const ord = await getOrders();
            setOrders(ord.orders || []);
          }
        } catch (e) {
          console.log('⚠️ User data load failed:', e.message);
        }
        
        // Show warning if stock data failed
        if (stocksData.error) {
          setError(`Warning: ${stocksData.error}. Please check your Python environment and yfinance installation.`);
        }
      } catch (err) {
        console.error('❌ Error loading data:', err);
        setError('Failed to load data. Please check your Python environment and yfinance installation.');
      } finally {
        console.log('🏁 Setting loading to false');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Fetch company-specific news when selectedCompany changes
  useEffect(() => {
    const loadNews = async () => {
      if (!selectedCompany) return;
      try {
        console.log(`🔄 Fetching news for ${selectedCompany}...`);
        const newsData = await fetchCompanyNews(selectedCompany);
        setMarketNews(newsData.news || []);
      } catch (err) {
        console.error(`❌ Error loading news for ${selectedCompany}:`, err);
        setMarketNews([]); // Clear news on error
      }
    };
    loadNews();
  }, [selectedCompany]);

  // Load peer-to-peer sell orders for the selected company
  useEffect(() => {
    const loadPeerOrders = async () => {
      try {
        if (!selectedCompany) return;
        const res = await searchGlobalOrders(selectedCompany, 'sell');
        setPeerOrders(res.orders || []);
      } catch (e) {
        console.log('⚠️ Peer orders load failed:', e.message);
        setPeerOrders([]);
      }
    };
    loadPeerOrders();
  }, [selectedCompany]);

  // Load my listings and purchases (seller/buyer views)
  useEffect(() => {
    const loadMine = async () => {
      try {
        if (!localStorage.getItem('token')) return;
        const seller = await getMyGlobalOrders('seller');
        setMyListings(seller.orders || []);
        const buyer = await getMyGlobalOrders('buyer');
        setMyPurchases(buyer.orders || []);
      } catch (e) {
        console.log('⚠️ Mine load failed:', e.message);
      }
    };
    loadMine();
  }, []);

  useEffect(() => {
    // Helper: compute sentiment from company dataPoints using last up to 3 day-over-day changes
    const computeSentimentFromDataPoints = (dataPoints) => {
      if (!dataPoints || dataPoints.length === 0) return null;

      // Map date (YYYY-MM-DD) -> last close for that date
      const dateClose = {};
      dataPoints.forEach(p => {
        try {
          const d = new Date(p.date);
          if (isNaN(d)) return;
          const key = d.toISOString().slice(0,10);
          // coerce close to number (backend may send strings) and keep last close for the date
          const close = Number(p.close);
          if (Number.isFinite(close)) dateClose[key] = close;
        } catch (e) {
          // ignore invalid point
        }
      });

      const dates = Object.keys(dateClose).sort();
      if (dates.length < 2) return null;

      const changes = [];
      for (let i = 1; i < dates.length; i++) {
        const prev = dateClose[dates[i-1]];
        const curr = dateClose[dates[i]];
        if (typeof prev !== 'number' || typeof curr !== 'number') continue;
        const diff = curr - prev;
        if (Math.abs(diff) < 1e-8) changes.push('neutral');
        else if (diff > 0) changes.push('positive');
        else changes.push('negative');
      }

      const last = changes.slice(-3); // up to last 3 day-over-day moves
      if (last.length === 0) return null;
      const counts = { positive: 0, neutral: 0, negative: 0 };
      last.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
      const total = last.length;
      return {
        positive: Math.round((counts.positive / total) * 100),
        neutral: Math.round((counts.neutral / total) * 100),
        negative: Math.round((counts.negative / total) * 100)
      };
    };

    const loadCompanyData = async () => {
      try {
        console.log('🔄 Loading company data for:', selectedCompany, timeFrame);
        setCompanyLoading(true);
        setCompanyError(null);
        
        const data = await fetchCompany(selectedCompany, timeFrame);
        console.log('✅ Company data loaded:', data);
        setCompanyData(data);
        
        // Refresh sentiment for selected symbol. If backend sentiment is missing/zero, compute from recent stock closes.
        try {
          const sentimentData = await fetchSentiment(selectedCompany);
          const isZero = !sentimentData || (
            Number(sentimentData.positive) === 0 && Number(sentimentData.neutral) === 0 && Number(sentimentData.negative) === 0
          );

          console.log('🔍 Backend sentiment:', sentimentData, 'isZero:', isZero);

          if (!isZero) {
            setSentiment(sentimentData);
          } else {
            // Try to compute from company dataPoints
            let computed = computeSentimentFromDataPoints(data.dataPoints || []);
            console.log('🔍 Computed sentiment from current timeframe:', computed);
            // If not enough daily points in current timeframe, try a longer timeframe request
            if (!computed) {
              try {
                const longData = await fetchCompany(selectedCompany, '1M');
                computed = computeSentimentFromDataPoints(longData.dataPoints || longData.data || []);
                console.log('🔍 Computed sentiment from 1M timeframe:', computed);
              } catch (e) {
                console.log('⚠️ Failed to fetch longer timeframe for sentiment fallback:', e.message || e);
              }
            }

            if (computed) {
              console.log('✅ Using computed sentiment:', computed);
              setSentiment(computed);
            } else {
              // fallback to backend result (even if zeros)
              setSentiment(sentimentData || { positive: 0, neutral: 0, negative: 0 });
            }
          }
        } catch (sentimentErr) {
          console.error('Error loading sentiment:', sentimentErr);
          // Try to compute from local data if backend fails
          const computed = computeSentimentFromDataPoints(data.dataPoints || []);
          if (computed) setSentiment(computed);
        }
      } catch (err) {
        console.error('❌ Error loading company data:', err);
        setCompanyError(err.message || 'Failed to load company data from yfinance');
        setCompanyData(null);
      } finally {
        console.log('🏁 Company loading finished');
        setCompanyLoading(false);
      }
    };

    if (selectedCompany) {
      loadCompanyData();
    }
  }, [selectedCompany, timeFrame]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCompanies([]);
      return;
    }

    const filtered = popularStocks.filter(stock =>
      stock.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCompanies(filtered);
  }, [searchQuery]);

  // Debug orders state changes
  useEffect(() => {
    console.log('🔄 Orders state changed:', orders);
    const pendingOrders = orders.filter(o => o.status === 'pending');
    console.log('📋 Pending orders count:', pendingOrders.length);
    console.log('📋 All orders statuses:', orders.map(o => ({ id: o._id, symbol: o.symbol, status: o.status })));
  }, [orders]);

  const handleCompanySelect = (company) => {
    console.log('🔄 Switching to company:', company);
    setSelectedCompany(company);
    setSearchQuery('');
    setFilteredCompanies([]);
    setCompanyError(null);
    // Clear old data immediately to prevent overlapping
    setCompanyData(null);
    setCompanyLoading(true);
    setPredictedPrice(null);
    setPredictionError(null);
  };

  // Watchlist actions
  const handleAddToWatchlist = async (symbol) => {
    try {
      const res = await addToWatchlist(symbol);
      setWatchlist(res.watchlist || []);
    } catch (e) {
      setError(e.message || 'Failed to add to watchlist');
    }
  };

  const handleRemoveFromWatchlist = async (symbol) => {
    try {
      const res = await removeFromWatchlist(symbol);
      setWatchlist(res.watchlist || []);
    } catch (e) {
      setError(e.message || 'Failed to remove from watchlist');
    }
  };

  const handleCancelOrder = async (orderId) => {
    console.log('🔄 Cancelling order with ID:', orderId);
    console.log('📋 Current orders before cancellation:', orders);
    
    // Find the order to get its details for confirmation
    const order = orders.find(o => o._id === orderId);
    console.log('🎯 Found order to cancel:', order);
    
    if (!order) {
      console.error('❌ Order not found with ID:', orderId);
      setError('Order not found');
      return;
    }
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to cancel this ${order.side.toUpperCase()} order for ${order.quantity} ${order.symbol}?`
    );
    
    if (!confirmed) {
      console.log('❌ Order cancellation cancelled by user');
      return;
    }
    
    try {
      // Add visual feedback - mark the order as cancelling
      const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
      if (orderElement) {
        orderElement.classList.add('cancelling');
        console.log('🎬 Starting cancellation animation for order:', orderId);
      }
      
      // Wait for the animation to complete
      await new Promise(resolve => setTimeout(resolve, 400));
      
      console.log('📡 Calling cancelOrder API with ID:', orderId);
      const res = await cancelOrder(orderId);
      console.log('✅ Cancel order response:', res);
      
      // Check if the response has orders
      if (!res.orders || !Array.isArray(res.orders)) {
        console.error('❌ Invalid response from backend:', res);
        setError('Invalid response from server');
        return;
      }
      
      console.log('📋 Backend returned orders:', res.orders);
      console.log('📋 Orders count from backend:', res.orders.length);
      
      // If backend returns empty array, keep current orders but mark the cancelled one
      if (res.orders.length === 0) {
        console.log('⚠️ Backend returned empty orders array, updating current orders locally');
        const updatedOrders = orders.map(o => 
          o._id === orderId ? { ...o, status: 'cancelled' } : o
        );
        setOrders(updatedOrders);
        console.log('📋 Updated orders locally:', updatedOrders);
      } else {
        // Update orders state with the response
        setOrders(res.orders);
        console.log('📋 Updated orders after cancellation:', res.orders);
      }
      
      // Log the filtered pending orders
      const currentOrders = res.orders.length > 0 ? res.orders : orders;
      const pendingOrders = currentOrders.filter(o => o.status === 'pending');
      console.log('📋 Pending orders after cancellation:', pendingOrders);
      console.log('📋 Pending orders count:', pendingOrders.length);
      
    } catch (e) {
      console.error('❌ Error cancelling order:', e);
      setError(e.message || 'Failed to cancel order');
      // Remove the cancelling class if there was an error
      const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
      if (orderElement) {
        orderElement.classList.remove('cancelling');
      }
    }
  };

  const handleTimeFrameChange = (newTimeFrame) => {
    if (timeFrame !== newTimeFrame) {
      console.log('🔄 Switching timeframe to:', newTimeFrame);
      setTimeFrame(newTimeFrame);
      setCompanyError(null);
      // Clear old data immediately to prevent overlapping
      setCompanyData(null);
      setCompanyLoading(true);
    }
  };

  // Prediction handler (calls Flask prediction service)
  const handlePredict = async () => {
    if (!selectedCompany) {
      alert('Select a company first');
      return;
    }
    setPredictionError(null);
    setPredictionLoading(true);
    setPredictedPrice(null);
    try {
      const resp = await fetch('http://localhost:5001/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: selectedCompany })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Prediction failed');
      setPredictedPrice(data.predicted_close);
      // Also set the sentiment from the prediction response
      if (data.sentiment) {
        console.log('✅ Received sentiment from prediction:', data.sentiment);
        setSentiment(data.sentiment);
      }
    } catch (err) {
      setPredictionError(err.message || String(err));
      alert('Prediction error: ' + (err.message || err));
    } finally {
      setPredictionLoading(false);
    }
  };

  // P2P: Create sell order for current user from Trading Panel (MVP hook)
  const handleCreatePeerSellOrder = async () => {
    if (!selectedCompany) return;
    try {
      const res = await createGlobalOrder({
        symbol: selectedCompany,
        side: 'sell',
        type: 'limit',
        quantity: 1,
        price: companyData?.currentPrice || undefined
      });
      // Refresh peer orders list
      const reload = await searchGlobalOrders(selectedCompany, 'sell');
      setPeerOrders(reload.orders || []);
      alert(`Listed ${selectedCompany} for sale`);
    } catch (e) {
      setError(e.message || 'Failed to create sell order');
    }
  };

  const handleBuyPeerOrder = async (orderId) => {
    try {
      const res = await buyGlobalOrder(orderId);
      // Refresh peer orders list
      const reload = await searchGlobalOrders(selectedCompany, 'sell');
      setPeerOrders(reload.orders || []);
      alert(`Buy request successful for ${selectedCompany}`);
    } catch (e) {
      setError(e.message || 'Failed to buy order');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading FinTweet Dashboard...</p>
      </div>
    );
  }

  // Show authentication screens if not logged in
  if (!isAuthenticated) {
    return showRegister ? (
      <Register 
        onRegister={handleRegister} 
        onSwitchToLogin={switchToLogin} 
      />
    ) : (
      <Login 
        onLogin={handleLogin} 
        onSwitchToRegister={switchToRegister} 
      />
    );
  }

  return (
    <div className="App">
      <header className="header">
        <div className="logo">
          <h1>FinTweet</h1>
          <span>AI-Powered Financial Sentiment Tracking</span>
        </div>
        <div className="header-controls">
          {/* User Info */}
          <div className="user-info">
            {/* Notifications */}
            <div className="notif-wrapper">
              <button
                className="notif-btn"
                title="Notifications"
                onClick={() => setShowNotifications(v => !v)}
              >
                🔔
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="notif-badge">{notifications.filter(n => !n.isRead).length}</span>
                )}
              </button>
              {showNotifications && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <span>Notifications</span>
                    <button className="link-button" onClick={async ()=>{await markNotificationsRead(); const res = await getNotifications(); setNotifications(res.notifications || []);}}>Mark all read</button>
                  </div>
                  <div className="notif-list">
                    {(notifications && notifications.length > 0) ? notifications.slice().reverse().map((n, idx) => (
                      <div key={idx} className={`notif-item ${n.isRead ? '' : 'unread'}`}>
                        <div className="notif-time">{new Date(n.createdAt || Date.now()).toLocaleString()}</div>
                        <div className="notif-message">{n.message}</div>
                      </div>
                    )) : (
                      <div className="notif-empty">No notifications</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <span className="user-name">👤 {user?.username}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>

          {/* DB status removed per request */}
          
          <div className="search-container">
            <input
              type="text"
              placeholder="Search stocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {filteredCompanies.length > 0 && (
              <div className="search-results">
                {filteredCompanies.map(company => (
                  <div
                    key={company}
                    className="search-result-item"
                    onClick={() => handleCompanySelect(company)}
                  >
                    {company}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="main-content">
        <div className="sidebar">
          <div className="watchlist">
            <h3>Watchlist</h3>
            <div className="watchlist-items">
              {watchlist.length > 0 ? (
                watchlist.map(item => (
                  <div
                    key={item.symbol}
                    className={`watchlist-item ${selectedCompany === item.symbol ? 'active' : ''}`}
                    onClick={() => handleCompanySelect(item.symbol)}
                  >
                    <div className="stock-info">
                      <span className="stock-symbol">{item.symbol}</span>
                      {/* Optional: price lookup from stocks list */}
                      <span className="stock-price">{getCurrencySymbol(item.symbol)}{(stocks.find(s=>s.symbol===item.symbol)?.price)||'-'}
                        {/* {console.log(stocks.find(s=>s.symbol===item.symbol)?.price)} */}
                      </span>
                      
                    </div>
                    <button className="link-button" onClick={(e)=>{e.stopPropagation();handleRemoveFromWatchlist(item.symbol);}}>Remove</button>
                  </div>
                ))
              ) : (
                <div className="no-stocks">
                  <p>No stock data available</p>
                  <p className="small-text">Check your Python environment and yfinance installation</p>
                </div>
              )}
            </div>
            <div style={{marginTop:'8px'}}>
              <button className="link-button" onClick={()=>handleAddToWatchlist(selectedCompany)} disabled={!selectedCompany}>+ Add {selectedCompany} to Watchlist</button>
            </div>
          </div>
        </div>

        <div className="chart-section">
          <div className="chart-header">
            <div className="company-info">
              <h2>{selectedCompany}</h2>
              {companyData && (
                <div className="price-info">
                  <span className="current-price">{getCurrencySymbol(selectedCompany)}{companyData.currentPrice}</span>
                  <span className={`price-change ${companyData.priceChange >= 0 ? 'positive' : 'negative'}`}>
                    {companyData.priceChange >= 0 ? '+' : ''}{companyData.priceChange} ({companyData.priceChangePercent}%)
                  </span>
                  <span className="data-source-badge real">
                    YFinance
                  </span>
                </div>
              )}
            </div>
            <div className="timeframe-buttons">
              {['1D', '1W', '1M', '1Y'].map(tf => (
                <button
                  key={tf}
                  className={`timeframe-btn ${timeFrame === tf ? 'active' : ''}`}
                  onClick={() => handleTimeFrameChange(tf)}
                >
                  {tf}
                </button>
              ))}
              <button
                className="predict-btn"
                onClick={handlePredict}
                disabled={!selectedCompany || predictionLoading}
                style={{marginLeft: '12px'}}
              >
                {predictionLoading ? 'Predicting...' : 'Predict'}
              </button>
              {predictedPrice !== null && (
                <div className="predicted-price" style={{marginLeft:'12px'}}>
                  Predicted: {getCurrencySymbol(selectedCompany)}{predictedPrice}
                </div>
              )}
              {predictionError && (
                <div className="prediction-error" style={{color:'var(--danger)', marginLeft:'12px'}}>{predictionError}</div>
              )}
            </div>
          </div>

          <div className="chart-container">
            {companyLoading && (
              <div className="chart-loading">
                <div className="loading-spinner" />
                <p>Loading {selectedCompany} {timeFrame} data from YFinance...</p>
              </div>
            )}
            
            {companyError && (
              <div className="chart-error">
                <h3>Data Unavailable</h3>
                <p>{companyError}</p>
                <p className="error-details">
                  This could be due to:
                  <br />• Invalid stock symbol
                  <br />• Python environment issues
                  <br />• Network connectivity issues
                </p>
                <button onClick={() => window.location.reload()}>Retry</button>
              </div>
            )}
            
            {companyData && companyData.dataPoints && !companyError ? (
              <LineChart
                data={companyData.dataPoints}
                width={800}
                height={300}
                timeframe={timeFrame}
              />
            ) : !companyLoading && !companyError ? (
              <div className="chart-placeholder">Select a company to view chart data</div>
            ) : null}
          </div>

          <div className="chart-stats">
            {companyData && (
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">High</span>
                  <span className="stat-value">{getCurrencySymbol(selectedCompany)}{companyData.high}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Low</span>
                  <span className="stat-value">{getCurrencySymbol(selectedCompany)}{companyData.low}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Volume</span>
                  <span className="stat-value">{companyData.volume?.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Peer-to-Peer Market for selected symbol */}
          <div className="market-news" style={{marginTop:'16px'}}>
            <h3>Peer Market — {selectedCompany}</h3>
            <div className="news-feed">
              {peerOrders && peerOrders.length > 0 ? (
                peerOrders.map((po) => (
                  <div key={po._id} className="news-item order-item" data-order-id={po._id}>
                    <div className="news-header">
                      <span className="news-time">{new Date(po.createdAt).toLocaleString()}</span>
                      <span className="sentiment-badge positive">SELL</span>
                    </div>
                    <p className="news-text">
                      {po.type?.toUpperCase()} {po.quantity} {po.symbol}{po.price ? ` @ ${getCurrencySymbol(po.symbol)}${po.price}`:''}
                      {' '}— by {po.sellerUsername || 'seller'}
                    </p>
                    <div style={{marginTop:'8px'}}>
                      <button className="link-button" onClick={() => handleBuyPeerOrder(po._id)}>BUY {po.symbol}</button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-news">No peer sell orders for {selectedCompany}</p>
              )}
            </div>
            <div style={{marginTop:'8px'}}>
              <button className="link-button" onClick={handleCreatePeerSellOrder}>+ List {selectedCompany} for Sale</button>
            </div>
          </div>
        </div>

        <div className="right-panel">
          {/* User-specific listings/orders removed per request */}
          
          <div className="market-news">
            <h3>Market News</h3>
            <div className="news-feed">
              {marketNews && marketNews.length > 0 ? (
                marketNews.map((newsItem) => (
                  <div key={newsItem.id} className="news-item">
                    <a href={newsItem.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="news-content-wrapper">
                        {newsItem.image && <img src={newsItem.image} alt={newsItem.headline} className="news-image" />}
                        <div className="news-text-content">
                          <div className="news-header">
                            <span className="news-time">{new Date(newsItem.datetime * 1000).toLocaleString()}</span>
                            <span className="sentiment-badge neutral">{newsItem.source}</span>
                          </div>
                          <p className="news-text" style={{ fontWeight: 'bold', marginBottom: '4px' }}>{newsItem.headline}</p>
                          {/* <p className="news-text">{newsItem.summary}</p> */}
                        </div>
                      </div>
                    </a>
                  </div>
                ))
              ) : (
                <p className="no-news">No market news available</p>
              )}
            </div>
          </div>

          <SentimentOverview sentiment={sentiment} />
        </div>
      </div>
    </div>
  );
}

export default App; 