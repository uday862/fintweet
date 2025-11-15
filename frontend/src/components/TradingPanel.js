import React, { useState } from 'react';
import { placeOrder } from '../api';

function TradingPanel({ selectedCompany, onOrdersUpdate }) {
  const [orderType, setOrderType] = useState('market');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(900);
  const [side, setSide] = useState('buy');
  const [predictedPrice, setPredictedPrice] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState(null);

  // Helper function to get currency symbol for a stock
  const getCurrencySymbol = (symbol) => {
    return symbol && symbol.includes('.NS') ? '₹' : '$';
  };

  const handleOrder = async () => {
    const order = {
      symbol: selectedCompany,
      side,
      type: orderType,
      quantity: parseInt(quantity),
      price: orderType === 'market' ? null : parseFloat(price),
      timestamp: new Date().toISOString()
    };
    
    try {
      const res = await placeOrder(order);
      if (onOrdersUpdate) onOrdersUpdate(res.orders || []);
      alert(`${side.toUpperCase()} order placed for ${quantity} shares of ${selectedCompany}`);
      
      // Reset form after successful order
      setQuantity(1);
      setPrice(900);
    } catch (e) {
      alert(e.message || 'Failed to place order');
    }
  };

  const handlePredict = async () => {
    if (!selectedCompany) {
      alert('Select a company first');
      return;
    }
    setPredictionError(null);
    setPredictionLoading(true);
    try {
      const resp = await fetch('http://localhost:5001/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: selectedCompany })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Prediction failed');
      setPredictedPrice(data.predicted_close);
    } catch (err) {
      setPredictionError(err.message || String(err));
      alert('Prediction error: ' + (err.message || err));
    } finally {
      setPredictionLoading(false);
    }
  };

  const totalValue = quantity * price;

  return (
    <div className="trading-panel">
      <div className="trading-header">
        <h3>📈 Trading Panel</h3>
        <div className="selected-symbol">{selectedCompany || 'Select Stock'}</div>
        <div className="predict-controls">
          <button
            className="predict-btn"
            onClick={handlePredict}
            disabled={!selectedCompany || predictionLoading}
          >
            {predictionLoading ? 'Predicting...' : 'Predict'}
          </button>
          {predictedPrice !== null && (
            <div className="predicted-price">Predicted: {predictedPrice}</div>
          )}
          {predictionError && (
            <div className="prediction-error">{predictionError}</div>
          )}
        </div>
      </div>
      
      <div className="order-form">
        {/* Buy/Sell Toggle */}
        <div className="order-side-toggle">
          <button 
            className={`side-toggle-btn buy ${side === 'buy' ? 'active' : ''}`}
            onClick={() => setSide('buy')}
          >
            <span className="side-icon">📈</span>
            <span className="side-text">BUY</span>
          </button>
          <button 
            className={`side-toggle-btn sell ${side === 'sell' ? 'active' : ''}`}
            onClick={() => setSide('sell')}
          >
            <span className="side-icon">📉</span>
            <span className="side-text">SELL</span>
          </button>
        </div>

        {/* Order Type */}
        <div className="form-group">
          <label className="form-label">Order Type</label>
          <div className="order-type-selector">
            <button 
              className={`type-btn ${orderType === 'market' ? 'active' : ''}`}
              onClick={() => setOrderType('market')}
            >
              Market
            </button>
            <button 
              className={`type-btn ${orderType === 'limit' ? 'active' : ''}`}
              onClick={() => setOrderType('limit')}
            >
              Limit
            </button>
            <button 
              className={`type-btn ${orderType === 'stop' ? 'active' : ''}`}
              onClick={() => setOrderType('stop')}
            >
              Stop
            </button>
          </div>
        </div>

        {/* Quantity Input */}
        <div className="form-group">
          <label className="form-label">Quantity</label>
          <div className="input-with-buttons">
            <button 
              className="qty-btn minus"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              −
            </button>
            <input 
              type="number" 
              className="qty-input"
              value={quantity} 
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
            />
            <button 
              className="qty-btn plus"
              onClick={() => setQuantity(quantity + 1)}
            >
              +
            </button>
          </div>
        </div>

        {/* Price Input (for non-market orders) */}
        {orderType !== 'market' && (
          <div className="form-group">
            <label className="form-label">Price ({getCurrencySymbol(selectedCompany)})</label>
            <input 
              type="number" 
              className="price-input"
              value={price} 
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              step="0.01"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Order Summary */}
        <div className="order-summary">
          <div className="summary-row">
            <span className="summary-label">Total Value:</span>
            <span className="summary-value">{getCurrencySymbol(selectedCompany)}{totalValue.toLocaleString()}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Order Type:</span>
            <span className="summary-value">{orderType.charAt(0).toUpperCase() + orderType.slice(1)}</span>
          </div>
        </div>

        {/* Place Order Button */}
        <button 
          className={`place-order-btn ${side}`}
          onClick={handleOrder}
          disabled={!selectedCompany}
        >
          <span className="order-icon">{side === 'buy' ? '📈' : '📉'}</span>
          <span className="order-text">Place {side.toUpperCase()} Order</span>
        </button>
      </div>

      {/* Open Positions */}
      <div className="positions-section">
        <div className="section-header">
          <h4>💼 Open Positions</h4>
          <span className="position-count">1</span>
        </div>
        <div className="positions-list">
          <div className="position-item">
            <div className="position-header">
              <span className="position-symbol">TSLA</span>
              <span className="position-side long">LONG</span>
            </div>
            <div className="position-details">
              <div className="position-info">
                <span className="position-quantity">10 shares</span>
                <span className="position-price">@ $850.00</span>
              </div>
              <div className="position-pnl positive">
                <span className="pnl-label">P&L:</span>
                <span className="pnl-value">+$500.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TradingPanel;
