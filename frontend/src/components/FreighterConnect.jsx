import { useState } from 'react';
import { Wallet, Loader, AlertCircle, ExternalLink, CheckCircle } from 'lucide-react';
import { isConnected, requestAccess } from '@stellar/freighter-api';
import * as StellarSdk from 'stellar-sdk';
import { useToast } from '../context/ToastContext';
import { PLATFORM_CONFIG } from '../config/platform';

function FreighterConnect({ onConnect }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const connect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { isConnected: installed } = await isConnected();
      if (!installed) {
        setError('Freighter not found. Install it first.');
        return;
      }

      const { address, error: accessError } = await requestAccess();
      if (accessError) throw new Error(accessError);
      if (!address) throw new Error('Failed to get wallet address');

      // Check balance
      const server = new StellarSdk.Horizon.Server(PLATFORM_CONFIG.HORIZON_URL);
      let balance = 0;
      let needsFunding = false;
      
      try {
        const account = await server.loadAccount(address);
        const xlm = account.balances.find(b => b.asset_type === 'native');
        balance = parseFloat(xlm?.balance || 0);
      } catch (err) {
        if (err.response?.status === 404) needsFunding = true;
      }

      toast.success('Connected', `${address.slice(0, 8)}...`);
      onConnect({ publicKey: address, balance, type: 'freighter', needsFunding });

    } catch (err) {
      setError(err.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-glass p-6 max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Wallet size={32} className="text-purple-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Connect Wallet</h2>
        <p className="text-sm text-orbit-gray">Connect Freighter to continue</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Connect Button */}
      <button
        onClick={connect}
        disabled={loading}
        className="w-full py-3.5 px-4 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader size={16} className="animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet size={16} />
            <span>Connect Freighter</span>
          </>
        )}
      </button>

      {/* Benefits */}
      <div className="mt-5 pt-5 border-t border-white/5">
        <div className="space-y-2">
          {['Non-custodial - you own your keys', 'Sign transactions securely', 'Works everywhere on Stellar'].map(text => (
            <div key={text} className="flex items-center gap-2">
              <CheckCircle size={12} className="text-emerald-400" />
              <span className="text-xs text-orbit-gray">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Install Link */}
      <div className="mt-4 text-center">
        <a
          href="https://freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-orbit-gray hover:text-white transition-colors inline-flex items-center gap-1"
        >
          Get Freighter <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

export default FreighterConnect;
