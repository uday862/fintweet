import React, { useRef, useEffect } from 'react';

const LineChart = ({ data, width = 800, height = 300, timeframe }) => {
  const baseCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const tooltipDateRef = useRef(null);
  const tooltipTimeRef = useRef(null);
  const tooltipPriceRef = useRef(null);
  const rafIdRef = useRef(null);
  const scalesRef = useRef({ xScale: null, yScale: null, padding: null, chartWidth: 0, chartHeight: 0, minPrice: 0, maxPrice: 0 });

  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  useEffect(() => {
    if (!data || data.length === 0) return;

    const baseCanvas = baseCanvasRef.current;
    const ctx = setupCanvas(baseCanvas);

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 60, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const prices = data.map(p => p.close);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const xScale = (index) => padding.left + (index / (data.length - 1)) * chartWidth;
    const yScale = (price) => padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

    scalesRef.current = { xScale, yScale, padding, chartWidth, chartHeight, minPrice, maxPrice };

    // Grid
    ctx.strokeStyle = '#2a2f3e';
    ctx.lineWidth = 1;

    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (i / gridLines) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const price = maxPrice - (i / gridLines) * priceRange;
      ctx.fillStyle = '#888';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`$${price.toFixed(2)}`, padding.left - 10, y + 4);
    }

    // Vertical grid + labels
    const timeLabels = timeframe === '1D' ? 6 : timeframe === '1W' ? 7 : timeframe === '1M' ? 5 : 6;
    for (let i = 0; i <= timeLabels; i++) {
      const x = padding.left + (i / timeLabels) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();

      const idx = Math.floor((i / timeLabels) * (data.length - 1));
      const date = new Date(data[idx].timestamp);
      let label;
      if (timeframe === '1D') label = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      else if (timeframe === '1W') label = date.toLocaleDateString('en-US', { weekday: 'short' });
      else if (timeframe === '1M') label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      else label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      ctx.fillStyle = '#888';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, height - padding.bottom + 20);
    }

    // Price line
    ctx.strokeStyle = '#f0c419';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((p, i) => {
      const x = xScale(i);
      const y = yScale(p.close);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(240, 196, 25, 0.25)');
    gradient.addColorStop(1, 'rgba(240, 196, 25, 0.05)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    data.forEach((p, i) => {
      const x = xScale(i);
      const y = yScale(p.close);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Prepare overlay canvas
    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = setupCanvas(overlayCanvas);
    overlayCtx.clearRect(0, 0, width, height);

    if (tooltipRef.current) tooltipRef.current.style.display = 'none';
  }, [data, width, height, timeframe]);

  const drawOverlay = (index) => {
    if (!overlayCanvasRef.current || !data || data.length === 0) return;
    const overlay = overlayCanvasRef.current;
    const ctx = overlay.getContext('2d');
    const { xScale, yScale, padding } = scalesRef.current;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const x = xScale(index);
    const y = yScale(data[index].close);

    // Crosshair
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1; // thin
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Marker
    ctx.fillStyle = '#f0c419';
    ctx.strokeStyle = '#1a1f2e';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tooltip
    const tooltip = tooltipRef.current;
    if (!tooltip) return;

    const date = new Date(data[index].timestamp);
    if (tooltipDateRef.current) tooltipDateRef.current.textContent = date.toLocaleDateString();
    if (tooltipTimeRef.current) tooltipTimeRef.current.textContent = date.toLocaleTimeString();
    if (tooltipPriceRef.current) tooltipPriceRef.current.textContent = `$${data[index].close.toFixed(2)}`;

    // Position intelligently: prefer right of point; flip if near edge; above unless near top
    const TOOLTIP_W = 190;
    const TOOLTIP_H = 70;
    let left = x + 12;
    if (left + TOOLTIP_W > width) left = x - TOOLTIP_W - 12;
    let top = y - TOOLTIP_H - 10;
    if (top < 10) top = y + 10;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.display = 'block';
  };

  const handleMouseMove = (e) => {
    if (!data || data.length === 0) return;
    
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return; // Check if overlayCanvas is available
    
    const { padding, chartWidth } = scalesRef.current;
    const rect = overlayCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (x - padding.left) / chartWidth));
    const index = Math.round(ratio * (data.length - 1));

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => drawOverlay(index));
  };

  const handleMouseLeave = () => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return; // Check if overlayCanvas is available
    
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (tooltipRef.current) tooltipRef.current.style.display = 'none';
  };

  if (!data || data.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
        No data available
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width, height }}>
      <canvas ref={baseCanvasRef} style={{ position: 'absolute', left: 0, top: 0 }} />
      <canvas
        ref={overlayCanvasRef}
        style={{ position: 'absolute', left: 0, top: 0, cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Single tooltip updated via refs (no re-renders on move) */}
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          display: 'none',
          backgroundColor: '#1a1f2e',
          border: '1px solid #2a2f3e',
          borderRadius: 4,
          padding: '8px 10px',
          color: '#fff',
          fontSize: 12,
          pointerEvents: 'none',
          zIndex: 2,
          minWidth: 160,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        <div ref={tooltipDateRef} style={{ marginBottom: 4 }}></div>
        <div ref={tooltipTimeRef} style={{ marginBottom: 6, color: '#888' }}></div>
        <div ref={tooltipPriceRef} style={{ color: '#f0c419', fontWeight: 'bold' }}></div>
      </div>
    </div>
  );
};

export default LineChart;
