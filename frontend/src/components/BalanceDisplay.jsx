import { useState, useCallback } from 'react';
import { Wallet, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import * as StellarSdk from 'stellar-sdk';
import { usePriceConverter } from '../hooks/usePriceConverter';

function BalanceDisplay({ balance, wallet, onBalanceUpdate, onManualRefresh, lastTxHash }) {
  const [loading, setLoading] = useState(false);
  const { convertToUSD, xlmPrice, change24h } = usePriceConverter();

  const fetchBalance = useCallback(async () => {
    if (!wallet?.publicKey) return;

    setLoading(true);
    try {
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(wallet.publicKey);
      const xlmBalance = account.balances.find(b => b.asset_type === 'native');
      const balanceValue = xlmBalance ? parseFloat(xlmBalance.balance) : 0;

      if (onBalanceUpdate) {
        onBalanceUpdate({ xlm: balanceValue });
      }
    } catch (err) {
      console.error('Balance fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [wallet?.publicKey, onBalanceUpdate]);

  const handleRefresh = useCallback(() => {
    fetchBalance();
    if (onManualRefresh) onManualRefresh();
  }, [fetchBalance, onManualRefresh]);

  const usdValue = convertToUSD(balance.xlm);

  return (
    <div className="card-glass p-6 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-orbit-gold/10 rounded-full blur-3xl" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orbit-gold/10 border border-orbit-gold/20 flex items-center justify-center">
              <Wallet size={20} className="text-orbit-gold" />
            </div>
            <div>
              <p className="text-xs text-orbit-gray uppercase tracking-wider font-medium">Your Balance</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className="text-[10px] text-orbit-gray-dark">
                  {loading ? 'Syncing...' : 'Live'}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-orbit-gray hover:text-white transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Main Balance */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-display font-black text-white">
              {balance.xlm.toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </span>
            <span className="text-xl text-orbit-gold font-bold">XLM</span>
          </div>
          <p className="text-lg text-emerald-400 font-semibold mt-1">
            ≈ ${usdValue} USD
          </p>
        </div>

        {/* XLM Price Info */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-orbit-gray">XLM Price:</span>
            <span className="text-white font-semibold">${xlmPrice?.toFixed(4) || '---'}</span>
          </div>
          {change24h !== undefined && change24h !== 0 && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
              change24h > 0 
                ? 'text-emerald-400 bg-emerald-400/10' 
                : 'text-red-400 bg-red-400/10'
            }`}>
              {change24h > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(change24h).toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BalanceDisplay;