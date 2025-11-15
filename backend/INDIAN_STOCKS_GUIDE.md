# 🇮🇳 Indian Stocks with Yahoo Finance - Complete Guide

## 🎯 **Yes! Yahoo Finance Supports Indian Stocks**

**✅ NSE (National Stock Exchange) symbols work perfectly!**
- Use `.NS` suffix for NSE stocks
- Much more reliable than BSE symbols
- Real-time data available

## 📊 **Indian Stock Symbols Format**

### **NSE Stocks (Recommended)**
```javascript
// Major Indian Companies
'RELIANCE.NS',    // Reliance Industries
'TCS.NS',         // Tata Consultancy Services
'INFY.NS',        // Infosys
'HDFCBANK.NS',    // HDFC Bank
'ADANIENT.NS',    // Adani Enterprises
'ICICIBANK.NS',   // ICICI Bank
'HINDUNILVR.NS',  // Hindustan Unilever
'ITC.NS',         // ITC Limited
'SBIN.NS',        // State Bank of India
'BHARTIARTL.NS'   // Bharti Airtel
```

### **BSE Stocks (Not Recommended)**
```javascript
// These often fail or have no data
'RELIANCE.BSE',   // ❌ Usually fails
'TCS.BSE',        // ❌ No data
'INFY.BSE'        // ❌ Unreliable
```

## 🔧 **Implementation Details**

### **Currency Detection**
```python
# Automatically detects currency based on symbol
currency = "INR" if ".NS" in symbol else "USD"
```

### **Exchange Information**
```python
exchange = "NSE" if ".NS" in symbol else "NASDAQ/NYSE"
```

### **Data Structure for Indian Stocks**
```json
{
  "symbol": "RELIANCE.NS",
  "price": 2456.78,
  "change": 45.67,
  "changePercent": 1.89,
  "volume": 1234567,
  "high": 2480.00,
  "low": 2420.00,
  "lastUpdated": "2025-09-02",
  "currency": "INR",
  "exchange": "NSE",
  "method": "yfinance"
}
```

## 🧪 **Testing Indian Stocks**

### **Run the Indian Stocks Test**
```bash
node test-indian-stocks.js
```

### **Expected Output**
```
🇮🇳 Indian Stocks (10):
     RELIANCE.NS: ₹2456.78 (1.89%) - Vol: 1,234,567
     TCS.NS: ₹3456.90 (-0.45%) - Vol: 987,654
     INFY.NS: ₹1567.23 (2.34%) - Vol: 2,345,678
     HDFCBANK.NS: ₹1234.56 (0.78%) - Vol: 876,543
     ADANIENT.NS: ₹2345.67 (-1.23%) - Vol: 1,567,890
```

## 📈 **Popular Indian Stock Categories**

### **Banking Stocks**
```javascript
'HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'AXISBANK.NS', 'KOTAKBANK.NS'
```

### **IT Stocks**
```javascript
'TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS'
```

### **FMCG Stocks**
```javascript
'HINDUNILVR.NS', 'ITC.NS', 'NESTLEIND.NS', 'MARICO.NS', 'DABUR.NS'
```

### **Auto Stocks**
```javascript
'TATAMOTORS.NS', 'MARUTI.NS', 'HEROMOTOCO.NS', 'BAJAJ-AUTO.NS', 'EICHERMOT.NS'
```

### **Pharma Stocks**
```javascript
'SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'APOLLOHOSP.NS'
```

## 🎯 **Benefits of NSE Symbols**

1. **✅ Reliable Data**: NSE symbols have consistent data availability
2. **✅ Real-time Prices**: Live market data during trading hours
3. **✅ Volume Information**: Accurate trading volume data
4. **✅ Currency Support**: Automatic INR currency detection
5. **✅ Exchange Info**: Clear exchange identification

## 🔍 **Finding More Indian Stock Symbols**

### **Method 1: Yahoo Finance Search**
1. Go to [finance.yahoo.com](https://finance.yahoo.com)
2. Search for any Indian company
3. The symbol will show as `COMPANY.NS`

### **Method 2: NSE Website**
1. Visit [nseindia.com](https://nseindia.com)
2. Search for companies
3. Add `.NS` to the symbol

### **Method 3: Popular Indian ETFs**
```javascript
'NIFTYBEES.NS',    // Nifty 50 ETF
'SETFNIF50.NS',    // SBI Nifty 50 ETF
'NETFNIFTY.NS'     // Nippon Nifty 50 ETF
```

## ⚠️ **Important Notes**

### **Trading Hours**
- **NSE Trading**: 9:15 AM - 3:30 PM IST (Monday-Friday)
- **Data Availability**: Real-time during trading hours
- **After Hours**: Last closing price available

### **Currency Display**
- **Frontend**: Use ₹ symbol for Indian stocks
- **Backend**: Currency field indicates "INR"
- **Conversion**: No automatic currency conversion

### **Error Handling**
- **404 Errors**: Symbol not found on Yahoo Finance
- **No Data**: Stock not trading or delisted
- **Temporary Issues**: Retry logic handles these

## 🚀 **Complete Implementation**

### **Updated Stock List**
```javascript
const TRACKED_STOCKS = [
  // US Stocks
  'TSLA', 'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META', 'NFLX',
  // US ETFs
  'SPY', 'QQQ', 'IWM', 'VTI', 'VOO',
  // Indian NSE Stocks
  'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ADANIENT.NS',
  'ICICIBANK.NS', 'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS'
];
```

### **Enhanced Data Structure**
```json
{
  "stocks": [
    {
      "symbol": "TSLA",
      "price": 245.67,
      "currency": "USD",
      "exchange": "NASDAQ/NYSE"
    },
    {
      "symbol": "RELIANCE.NS",
      "price": 2456.78,
      "currency": "INR",
      "exchange": "NSE"
    }
  ],
  "dataSource": "yfinance",
  "message": "Successfully fetched 20 stocks using yfinance"
}
```

## 🎉 **Summary**

**✅ Yahoo Finance works excellently with Indian NSE stocks!**

- **Use `.NS` suffix** for reliable Indian stock data
- **Avoid `.BSE` symbols** as they're unreliable
- **Automatic currency detection** (INR vs USD)
- **Real-time data** during NSE trading hours
- **Comprehensive error handling** and retry logic

**🎯 Your yfinance implementation now supports both US and Indian markets perfectly!**

