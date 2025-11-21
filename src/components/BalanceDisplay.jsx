import { useState, useEffect, useCallback } from 'react';
import { Wallet, RefreshCw, AlertCircle, Link } from 'lucide-react';
import * as StellarSdk from 'stellar-sdk';
import { usePriceConverter } from '../hooks/usePriceConverter';

function BalanceDisplay({ balance, wallet, onBalanceUpdate, onManualRefresh, lastTxHash }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const { convertToUSD } = usePriceConverter();

  // ✅ FIXED: Memoized fetchBalance function with all dependencies
  const fetchBalance = useCallback(async () => {
    if (!wallet?.publicKey) {
      console.log('⚠️ No wallet public key, skipping balance fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔗 Fetching balance from Stellar Horizon for:', wallet.publicKey.slice(0, 8) + '...');
      
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(wallet.publicKey);
      
      const xlmBalance = account.balances.find(balance => balance.asset_type === 'native');
      const balanceValue = xlmBalance ? parseFloat(xlmBalance.balance) : 0;

      const newBalance = { xlm: balanceValue };
      
      // ✅ Update parent component with new balance
      if (onBalanceUpdate) {
        onBalanceUpdate(newBalance);
      }
      
      setLastUpdated(new Date().toLocaleTimeString());
      console.log('✅ Balance fetched successfully:', balanceValue, 'XLM');
      
    } catch (err) {
      console.error('❌ Error fetching on-chain balance:', err);
      setError('Failed to fetch on-chain balance. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [wallet?.publicKey, onBalanceUpdate]); // ✅ CRITICAL: All dependencies included

  // ✅ FIXED: Initial balance fetch with proper dependencies
  useEffect(() => {
    if (wallet?.publicKey) {
      console.log('🚀 Initial balance fetch on mount/wallet change');
      fetchBalance();
    }
  }, [wallet?.publicKey, fetchBalance]); // ✅ CRITICAL: fetchBalance in dependencies

  // ✅ FIXED: Auto-refresh when transaction hash changes
  useEffect(() => {
    if (lastTxHash && wallet?.publicKey) {
      console.log('🔔 Transaction detected! Hash:', lastTxHash);
      console.log('⏳ Waiting 4 seconds for Stellar network confirmation...');
      
      // ✅ CRITICAL: 4-second delay for Stellar testnet finality
      // Based on Stellar docs: average confirmation time is ~4 seconds
      const timer = setTimeout(() => {
        console.log('🔄 Fetching updated balance after transaction...');
        fetchBalance();
      }, 4000);
      
      return () => {
        console.log('🧹 Cleaning up transaction timer');
        clearTimeout(timer);
      };
    }
  }, [lastTxHash, wallet?.publicKey, fetchBalance]); // ✅ CRITICAL: All dependencies

  // ✅ FIXED: Memoized manual refresh handler
  const handleManualRefresh = useCallback(() => {
    console.log('👆 Manual refresh triggered by user');
    fetchBalance();
    
    if (onManualRefresh) {
      onManualRefresh();
    }
  }, [fetchBalance, onManualRefresh]);

  const usdValue = convertToUSD(balance.xlm);

  return (
    <div className="card-neumorphic p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link size={24} className="text-yellow-400" />
          <h3 className="text-yellow-400 font-bold text-lg">On-Chain Balance</h3>
        </div>
        
        <button
          onClick={handleManualRefresh}
          disabled={loading}
          className="text-yellow-400 hover:text-yellow-300 transition-colors p-2 hover:bg-yellow-400/10 rounded-lg disabled:opacity-50"
          title="Refresh on-chain balance"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* XLM Balance */}
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">On-Chain Balance</p>
              <p className="text-yellow-400 font-bold text-3xl mt-1">
                {balance.xlm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })} XLM
              </p>
              <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                <Link size={12} />
                Live from Stellar Blockchain
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">USD Value</p>
              <p className="text-gray-300 font-semibold text-xl mt-1">
                ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
            <span>{loading ? 'Querying blockchain...' : 'On-chain data'}</span>
          </div>
          
          {lastUpdated && (
            <span>Updated: {lastUpdated}</span>
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleManualRefresh}
          disabled={loading}
          className="w-full bg-gray-800 hover:bg-gray-700 text-yellow-400 py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Querying Blockchain...' : 'Refresh On-Chain Balance'}
        </button>
      </div>
    </div>
  );
}

export default BalanceDisplay;