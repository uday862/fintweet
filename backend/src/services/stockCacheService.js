const StockCache = require('../models/StockCache');

class StockCacheService {
  constructor() {
    this.defaultCacheAgeMinutes = 5; // Default cache validity
    this.batchSize = 10; // Number of stocks to process in parallel
  }

  /**
   * Get cached stock data for a symbol
   * @param {string} symbol - Stock symbol
   * @param {number} maxAgeMinutes - Maximum cache age in minutes
   * @returns {Promise<Object|null>} - Cached stock data or null
   */
  async getCachedStock(symbol, maxAgeMinutes = this.defaultCacheAgeMinutes) {
    try {
      const cachedStock = await StockCache.findValidCache(symbol, maxAgeMinutes);
      
      if (cachedStock && cachedStock.isValid(maxAgeMinutes)) {
        // Increment hit count
        await cachedStock.incrementHitCount();
        
        console.log(`📋 Cache HIT for ${symbol} (age: ${cachedStock.cacheAgeMinutes}m)`);
        
        return {
          symbol: cachedStock.symbol,
          price: cachedStock.price,
          change: cachedStock.change,
          changePercent: cachedStock.changePercent,
          volume: cachedStock.volume,
          high: cachedStock.high,
          low: cachedStock.low,
          lastUpdated: cachedStock.lastUpdated,
          currency: cachedStock.currency,
          exchange: cachedStock.exchange,
          dataSource: cachedStock.dataSource,
          cached: true,
          cacheAgeMinutes: cachedStock.cacheAgeMinutes
        };
      }
      
      console.log(`📋 Cache MISS for ${symbol}`);
      return null;
    } catch (error) {
      console.error(`❌ Error getting cached stock for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Cache stock data for a symbol
   * @param {string} symbol - Stock symbol
   * @param {Object} stockData - Stock data to cache
   * @returns {Promise<Object>} - Cached stock data
   */
  async cacheStock(symbol, stockData) {
    try {
      const cacheData = {
        symbol: symbol.toUpperCase(),
        price: stockData.price,
        change: stockData.change,
        changePercent: stockData.changePercent,
        volume: stockData.volume,
        high: stockData.high,
        low: stockData.low,
        lastUpdated: new Date(),
        currency: stockData.currency || (symbol.includes('.NS') ? 'INR' : 'USD'),
        exchange: stockData.exchange || (symbol.includes('.NS') ? 'NSE' : 'NASDAQ/NYSE'),
        dataSource: 'yfinance',
        status: 'success',
        isActive: true
      };

      // Use findOneAndUpdate to upsert (update if exists, insert if not)
      const cachedStock = await StockCache.findOneAndUpdate(
        { symbol: symbol.toUpperCase() },
        cacheData,
        { 
          new: true, 
          upsert: true,
          setDefaultsOnInsert: true 
        }
      );

      console.log(`💾 Cached stock data for ${symbol}`);
      return cachedStock;
    } catch (error) {
      console.error(`❌ Error caching stock for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Cache failed stock data
   * @param {string} symbol - Stock symbol
   * @param {string} error - Error message
   * @returns {Promise<Object>} - Cached error data
   */
  async cacheFailedStock(symbol, error) {
    try {
      const cacheData = {
        symbol: symbol.toUpperCase(),
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        high: 0,
        low: 0,
        lastUpdated: new Date(),
        currency: symbol.includes('.NS') ? 'INR' : 'USD',
        exchange: symbol.includes('.NS') ? 'NSE' : 'NASDAQ/NYSE',
        dataSource: 'yfinance',
        status: 'failed',
        error: error,
        isActive: true
      };

      const cachedStock = await StockCache.findOneAndUpdate(
        { symbol: symbol.toUpperCase() },
        cacheData,
        { 
          new: true, 
          upsert: true,
          setDefaultsOnInsert: true 
        }
      );

      console.log(`💾 Cached failed stock data for ${symbol}`);
      return cachedStock;
    } catch (error) {
      console.error(`❌ Error caching failed stock for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get cached stocks for multiple symbols
   * @param {Array} symbols - Array of stock symbols
   * @param {number} maxAgeMinutes - Maximum cache age in minutes
   * @returns {Promise<Array>} - Array of cached stock data
   */
  async getCachedStocks(symbols, maxAgeMinutes = this.defaultCacheAgeMinutes) {
    try {
      const cutoffDate = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
      
      const cachedStocks = await StockCache.find({
        symbol: { $in: symbols.map(s => s.toUpperCase()) },
        isActive: true,
        status: 'success',
        lastUpdated: { $gte: cutoffDate }
      }).sort({ lastUpdated: -1 });

      // Group by symbol and take the latest for each
      const stockMap = new Map();
      cachedStocks.forEach(stock => {
        if (!stockMap.has(stock.symbol) || stock.lastUpdated > stockMap.get(stock.symbol).lastUpdated) {
          stockMap.set(stock.symbol, stock);
        }
      });

      // Increment hit counts for all accessed stocks
      const hitPromises = Array.from(stockMap.values()).map(stock => 
        stock.incrementHitCount()
      );
      await Promise.all(hitPromises);

      const result = Array.from(stockMap.values()).map(stock => ({
        symbol: stock.symbol,
        price: stock.price,
        change: stock.change,
        changePercent: stock.changePercent,
        volume: stock.volume,
        high: stock.high,
        low: stock.low,
        lastUpdated: stock.lastUpdated,
        currency: stock.currency,
        exchange: stock.exchange,
        dataSource: stock.dataSource,
        cached: true,
        cacheAgeMinutes: stock.cacheAgeMinutes
      }));

      console.log(`📋 Cache results: ${result.length}/${symbols.length} stocks found`);
      return result;
    } catch (error) {
      console.error('❌ Error getting cached stocks:', error.message);
      return [];
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} - Cache statistics
   */
  async getCacheStats() {
    try {
      const stats = await StockCache.getCacheStats();
      const mostAccessed = await StockCache.getMostAccessed(10);
      
      return {
        ...stats[0],
        mostAccessed,
        defaultCacheAgeMinutes: this.defaultCacheAgeMinutes,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error.message);
      return {
        totalCached: 0,
        activeCached: 0,
        failedCached: 0,
        totalHits: 0,
        avgAgeMinutes: 0,
        mostAccessed: [],
        defaultCacheAgeMinutes: this.defaultCacheAgeMinutes,
        timestamp: new Date()
      };
    }
  }

  /**
   * Clean old cache entries
   * @param {number} maxAgeHours - Maximum age in hours before cleanup
   * @returns {Promise<Object>} - Cleanup results
   */
  async cleanOldCache(maxAgeHours = 24) {
    try {
      const result = await StockCache.cleanOldCache(maxAgeHours);
      console.log(`🧹 Cleaned ${result.deletedCount} old cache entries`);
      return result;
    } catch (error) {
      console.error('❌ Error cleaning old cache:', error.message);
      throw error;
    }
  }

  /**
   * Invalidate cache for a symbol
   * @param {string} symbol - Stock symbol to invalidate
   * @returns {Promise<Object>} - Invalidation result
   */
  async invalidateCache(symbol) {
    try {
      const result = await StockCache.updateMany(
        { symbol: symbol.toUpperCase() },
        { isActive: false }
      );
      console.log(`🗑️ Invalidated cache for ${symbol} (${result.modifiedCount} entries)`);
      return result;
    } catch (error) {
      console.error(`❌ Error invalidating cache for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get cache hit rate for recent requests
   * @param {number} hours - Number of hours to look back
   * @returns {Promise<number>} - Cache hit rate percentage
   */
  async getCacheHitRate(hours = 1) {
    try {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const stats = await StockCache.aggregate([
        {
          $match: {
            lastAccessed: { $gte: cutoffDate }
          }
        },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: '$cacheHitCount' },
            totalStocks: { $sum: 1 }
          }
        }
      ]);

      if (stats.length === 0) return 0;
      
      const hitRate = (stats[0].totalRequests / stats[0].totalStocks) * 100;
      return Math.round(hitRate * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('❌ Error calculating cache hit rate:', error.message);
      return 0;
    }
  }

  /**
   * Warm up cache for popular symbols
   * @param {Array} symbols - Array of symbols to warm up
   * @param {Function} fetchFunction - Function to fetch fresh data
   * @returns {Promise<Array>} - Results of warm-up operation
   */
  async warmUpCache(symbols, fetchFunction) {
    try {
      console.log(`🔥 Warming up cache for ${symbols.length} symbols...`);
      
      const results = [];
      const batchSize = this.batchSize;
      
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const batchPromises = batch.map(async (symbol) => {
          try {
            const freshData = await fetchFunction(symbol);
            if (freshData && !freshData.error) {
              await this.cacheStock(symbol, freshData);
              return { symbol, status: 'success' };
            } else {
              await this.cacheFailedStock(symbol, freshData?.error || 'Unknown error');
              return { symbol, status: 'failed', error: freshData?.error };
            }
          } catch (error) {
            await this.cacheFailedStock(symbol, error.message);
            return { symbol, status: 'error', error: error.message };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to avoid overwhelming the API
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const successCount = results.filter(r => r.status === 'success').length;
      console.log(`🔥 Cache warm-up completed: ${successCount}/${symbols.length} successful`);
      
      return results;
    } catch (error) {
      console.error('❌ Error warming up cache:', error.message);
      throw error;
    }
  }
}

module.exports = new StockCacheService();
