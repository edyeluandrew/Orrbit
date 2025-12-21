import { useState, useCallback, useRef } from 'react';
import { Wallet, RefreshCw, AlertCircle, Link2, TrendingUp, DollarSign } from 'lucide-react';
import * as StellarSdk from 'stellar-sdk';
import { usePriceConverter } from '../hooks/usePriceConverter';

function BalanceDisplay({ balance, wallet, onBalanceUpdate, onManualRefresh, lastTxHash }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const { convertToUSD, xlmPrice } = usePriceConverter();

  // Manual refresh only - no automatic fetching
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
      
      const xlmBalance = account.balances.find(b => b.asset_type === 'native');
      const balanceValue = xlmBalance ? parseFloat(xlmBalance.balance) : 0;

      const newBalance = { xlm: balanceValue };
      
      // Update parent component with new balance
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
  }, [wallet?.publicKey, onBalanceUpdate]);

  // Memoized manual refresh handler - only way to trigger a fetch
  const handleManualRefresh = useCallback(() => {
    console.log('👆 Manual refresh triggered by user');
    fetchBalance();
    
    if (onManualRefresh) {
      onManualRefresh();
    }
  }, [fetchBalance, onManualRefresh]);

  const usdValue = convertToUSD(balance.xlm);

  return (
    <div className="card-hero p-7 animate-fade-in border-gradient">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-orbit-gold/30 blur-xl rounded-xl" />
            <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-orbit-gold/20 to-orbit-gold/5 border border-orbit-gold/40 flex items-center justify-center">
              <Wallet size={28} className="text-orbit-gold drop-shadow-[0_0_10px_rgba(247,147,26,0.6)]" />
            </div>
          </div>
          <div>
            <h3 className="text-white font-display font-black text-xl tracking-wider uppercase">Wallet Balance</h3>
            <div className="flex items-center gap-2 text-orbit-gray text-sm font-medium mt-1">
              <div className={`status-dot ${loading ? 'status-dot-pending' : 'status-dot-active'}`} />
              <span>{loading ? 'Syncing...' : 'Live on-chain'}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleManualRefresh}
          disabled={loading}
          className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-orbit-gold/40 text-orbit-gray hover:text-orbit-gold transition-all duration-300 disabled:opacity-50"
          title="Refresh balance"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-slide-up">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <p className="text-red-300 text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Main Balance Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orbit-gold/[0.12] via-orbit-gold/[0.06] to-transparent border border-orbit-gold/25 p-7">
          {/* Glow effects */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-orbit-gold/15 blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-orbit-gold/10 blur-[60px]" />
          
          <div className="relative">
            {/* XLM Balance */}
            <div className="mb-6">
              <p className="text-muted-heading mb-2">Available Balance</p>
              <div className="flex items-baseline gap-3">
                <p className="text-white font-display font-black text-5xl tracking-wide">
                  {balance.xlm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
                <span className="text-orbit-gold text-2xl font-display font-bold">XLM</span>
              </div>
            </div>
            
            {/* USD Value Card */}
            <div className="p-5 rounded-xl bg-[#0A0A0C]/60 border border-emerald-500/20 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                    <DollarSign size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-muted-heading">USD Value</p>
                    <p className="text-emerald-400 font-display font-black text-3xl mt-1">
                      ${usdValue}
                    </p>
                  </div>
                </div>
                <div className="text-right p-3 rounded-lg bg-white/[0.03]">
                  <p className="text-muted-heading mb-1">XLM Price</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-orbit-gold" />
                    <p className="text-white font-display font-bold text-xl">
                      ${xlmPrice?.toFixed(4) || '---'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-sm px-2 font-medium">
          <div className="flex items-center gap-2 text-orbit-gray">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <span>Stellar Testnet</span>
          </div>
          
          {lastUpdated && (
            <span className="text-orbit-gray-dark">
              Updated {lastUpdated}
            </span>
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleManualRefresh}
          disabled={loading}
          className="w-full py-4 px-5 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-3 bg-white/[0.03] border border-white/[0.08] hover:border-orbit-gold/40 text-orbit-gray hover:text-orbit-gold disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Syncing with Blockchain...' : 'Refresh Balance'}
        </button>
      </div>
    </div>
  );
}

export default BalanceDisplay;