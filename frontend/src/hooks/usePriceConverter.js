import { useState, useEffect } from 'react';

// Custom hook to fetch and manage XLM to USD conversion
export function usePriceConverter() {
  const [xlmPrice, setXlmPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchXLMPrice = async () => {
    try {
      setLoading(true);
      
      // Using CoinGecko's free API - no API key needed for basic calls
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd&include_24hr_change=true'
      );

      if (!response.ok) {
        throw new Error('Failed to fetch XLM price');
      }

      const data = await response.json();
      
      if (data.stellar && data.stellar.usd) {
        setXlmPrice({
          usd: data.stellar.usd,
          change24h: data.stellar.usd_24h_change || 0
        });
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error('Invalid price data received');
      }
    } catch (err) {
      console.error('Error fetching XLM price:', err);
      setError(err.message);
      // Fallback price if API fails
      setXlmPrice({ usd: 0.25, change24h: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Fetch price on mount
  useEffect(() => {
    fetchXLMPrice();
    
    // Refresh price every 60 seconds
    const interval = setInterval(fetchXLMPrice, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Helper function to convert XLM to USD
  const convertToUSD = (xlmAmount) => {
    if (!xlmPrice || !xlmAmount) return 0;
    return (parseFloat(xlmAmount) * xlmPrice.usd).toFixed(2);
  };

  // Helper function to convert USD to XLM
  const convertToXLM = (usdAmount) => {
    if (!xlmPrice || !usdAmount) return 0;
    return (parseFloat(usdAmount) / xlmPrice.usd).toFixed(2);
  };

  return {
    xlmPrice: xlmPrice?.usd,
    change24h: xlmPrice?.change24h,
    loading,
    error,
    lastUpdated,
    convertToUSD,
    convertToXLM,
    refresh: fetchXLMPrice
  };
}

export default usePriceConverter;