import { useState } from 'react';
import { 
  Wallet, 
  Loader, 
  AlertCircle,
  ExternalLink,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { isConnected, requestAccess } from '@stellar/freighter-api';
import * as StellarSdk from 'stellar-sdk';
import { useToast } from '../context/ToastContext';
import { PLATFORM_CONFIG } from '../config/platform';

/**
 * Freighter-Only Wallet Connect Component
 * 
 * Simplified wallet connection - Freighter only
 * Target market (crypto creators) already uses Freighter
 */
function FreighterConnect({ onConnect }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  /**
   * Connect with Freighter browser extension
   */
  const handleFreighterConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if Freighter is installed
      const connectedResult = await isConnected();
      
      if (!connectedResult.isConnected) {
        setError('Freighter wallet not found. Please install it first.');
        return;
      }

      // Request access to wallet
      const accessObj = await requestAccess();
      
      if (accessObj.error) {
        throw new Error(accessObj.error);
      }

      const publicKey = accessObj.address;
      
      if (!publicKey) {
        throw new Error('Failed to get public key from Freighter');
      }

      // Fetch balance from Stellar
      const server = new StellarSdk.Horizon.Server(PLATFORM_CONFIG.HORIZON_URL);
      let balance = 0;
      let needsFunding = false;
      
      try {
        const account = await server.loadAccount(publicKey);
        const xlmBalance = account.balances.find(b => b.asset_type === 'native');
        balance = parseFloat(xlmBalance?.balance || 0);
      } catch (loadErr) {
        if (loadErr.response?.status === 404) {
          // Account doesn't exist yet - needs funding
          needsFunding = true;
        } else {
          console.error('Error loading account:', loadErr);
        }
      }

      toast.success('Wallet Connected', `Connected to ${publicKey.slice(0, 8)}...`);

      onConnect({
        publicKey,
        balance,
        type: 'freighter',
        needsFunding,
      });

    } catch (err) {
      console.error('Freighter connection error:', err);
      setError(err.message || 'Failed to connect to Freighter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-hero p-8 sm:p-10 max-w-lg mx-auto border-gradient animate-fade-in">
      <div className="text-center mb-10">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-orbit-gold/40 blur-3xl rounded-full" />
          <div className="relative w-full h-full flex items-center justify-center rounded-2xl bg-gradient-to-br from-orbit-gold/20 to-orbit-gold/5 border border-orbit-gold/40 fire-glow">
            <Wallet size={48} className="text-orbit-gold drop-shadow-[0_0_15px_rgba(247,147,26,0.8)]" />
          </div>
        </div>
        <h2 className="text-3xl font-display font-black text-white tracking-wider uppercase mb-3">
          Connect Wallet
        </h2>
        <p className="text-orbit-gray text-base max-w-xs mx-auto">
          Connect your Freighter wallet to start making subscription payments
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 animate-slide-up">
          <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Freighter Connect Button */}
        <button
          onClick={handleFreighterConnect}
          disabled={loading}
          className="w-full p-5 rounded-2xl bg-gradient-to-r from-purple-500/15 to-purple-600/5 border border-purple-500/25 hover:border-purple-500/50 hover:from-purple-500/20 transition-all duration-300 flex items-center gap-5 text-left group disabled:opacity-50"
        >
          <div className="w-14 h-14 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-300">
            <Sparkles size={28} className="text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-display font-bold text-lg tracking-wide">
              Connect Freighter
            </p>
            <p className="text-orbit-gray text-sm mt-0.5">
              Secure browser wallet extension
            </p>
          </div>
          {loading && <Loader size={20} className="animate-spin text-purple-400" />}
        </button>

        {/* Benefits */}
        <div className="mt-8 p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-orbit-gray text-xs uppercase tracking-wider mb-4 font-bold">
            Why Freighter?
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle size={16} className="text-emerald-400" />
              <span className="text-gray-300 text-sm">Your keys, your crypto - non-custodial</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle size={16} className="text-emerald-400" />
              <span className="text-gray-300 text-sm">Sign transactions securely</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle size={16} className="text-emerald-400" />
              <span className="text-gray-300 text-sm">Works with all Stellar apps</span>
            </div>
          </div>
        </div>

        {/* Install Freighter Link */}
        <div className="text-center pt-4">
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-orbit-gray hover:text-orbit-gold transition-colors text-sm"
          >
            <span>Don't have Freighter? Install it here</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default FreighterConnect;
