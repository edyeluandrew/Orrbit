import { useState } from 'react';
import { 
  Wallet, 
  Loader, 
  AlertCircle, 
  Plus, 
  Download, 
  Smartphone, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ArrowLeft,
  Shield,
  Key,
  Sparkles
} from 'lucide-react';
import { isConnected, requestAccess } from '@stellar/freighter-api';
import * as StellarSdk from 'stellar-sdk';
import { useWalletService } from '../hooks/useWalletService';
import { useToast } from '../context/ToastContext';

/**
 * Multi-Wallet Connect Component
 * Supports:
 * - Built-in wallet creation (for native apps)
 * - Secret key import
 * - Freighter (for web browser)
 */
function MultiWalletConnect({ onConnect, showFreighter = true }) {
  const [mode, setMode] = useState('select'); // select, create, import, freighter
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [newWalletKeys, setNewWalletKeys] = useState(null);
  const [copied, setCopied] = useState(false);
  const [confirmedBackup, setConfirmedBackup] = useState(false);
  
  const walletService = useWalletService();
  const toast = useToast();

  // Check if we're in a native app (no Freighter available)
  const isNativeApp = typeof window !== 'undefined' && 
    (window.Capacitor?.isNative || !window.freighter);

  /**
   * Create a new wallet
   */
  const handleCreateWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const walletData = await walletService.createWallet();
      
      // Show the new wallet keys for backup
      setNewWalletKeys({
        publicKey: walletData.publicKey,
        secretKey: walletData.secretKey,
      });
      
      setMode('backup');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Complete wallet creation after backup confirmation
   */
  const completeWalletCreation = async () => {
    if (!confirmedBackup) {
      setError('Please confirm you have backed up your secret key');
      return;
    }
    
    // Fund the wallet on testnet
    try {
      setLoading(true);
      toast.info('Funding Wallet', 'Requesting testnet XLM from Friendbot...');
      
      await walletService.fundWallet();
      await walletService.updateBalance();
      
      toast.success('Wallet Created', 'Your wallet has been funded with testnet XLM!');
      
      onConnect({
        publicKey: newWalletKeys.publicKey,
        balance: walletService.balance,
        type: 'builtin',
        hasSecretKey: true,
      });
      
    } catch (err) {
      // Still connect even if funding fails
      toast.warning('Funding Skipped', 'Wallet created but funding failed. Use the faucet to get XLM.');
      
      onConnect({
        publicKey: newWalletKeys.publicKey,
        balance: 0,
        type: 'builtin',
        hasSecretKey: true,
        needsFunding: true,
      });
    } finally {
      setLoading(false);
      setNewWalletKeys(null);
    }
  };

  /**
   * Import wallet from secret key
   */
  const handleImportWallet = async () => {
    if (!secretKeyInput.trim()) {
      setError('Please enter your secret key');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const walletData = await walletService.importWallet(secretKeyInput);
      
      toast.success('Wallet Imported', `Connected to ${walletData.publicKey.slice(0, 8)}...`);
      
      onConnect({
        publicKey: walletData.publicKey,
        balance: walletData.balance,
        type: 'imported',
        hasSecretKey: true,
        needsFunding: walletData.balance === 0,
      });
      
      setSecretKeyInput('');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Connect with Freighter (browser only)
   */
  const handleFreighterConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const connectedResult = await isConnected();
      
      if (!connectedResult.isConnected) {
        throw new Error('Freighter wallet not installed');
      }

      const accessObj = await requestAccess();
      
      if (accessObj.error) {
        throw new Error(accessObj.error);
      }

      const publicKey = accessObj.address;
      
      if (!publicKey) {
        throw new Error('Failed to get public key');
      }

      // Get balance
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      let balance = 0;
      let needsFunding = false;
      
      try {
        const account = await server.loadAccount(publicKey);
        const xlmBalance = account.balances.find(b => b.asset_type === 'native');
        balance = parseFloat(xlmBalance?.balance || 0);
      } catch (loadErr) {
        if (loadErr.response?.status === 404) {
          needsFunding = true;
        }
      }

      toast.success('Freighter Connected', `Connected to ${publicKey.slice(0, 8)}...`);

      onConnect({
        publicKey,
        balance,
        type: 'freighter',
        hasSecretKey: false, // Freighter manages keys
        needsFunding,
      });

    } catch (err) {
      if (err.message.includes('not installed')) {
        setError('Freighter not found. Install from freighter.app or use another option below.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copy to clipboard
   */
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  /**
   * Reset to selection mode
   */
  const goBack = () => {
    setMode('select');
    setError(null);
    setSecretKeyInput('');
    setNewWalletKeys(null);
    setConfirmedBackup(false);
  };

  // Backup confirmation screen
  if (mode === 'backup' && newWalletKeys) {
    return (
      <div className="card-neumorphic p-6 sm:p-8 max-w-md mx-auto border-orbit-gold/20 animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Shield size={32} className="text-amber-400" />
          </div>
          <h2 className="text-xl font-display font-bold text-white tracking-wider uppercase">
            Backup Your Wallet
          </h2>
          <p className="text-orbit-gray text-sm mt-2">
            Save your secret key securely. You'll need it to recover your wallet.
          </p>
        </div>

        {/* Public Key */}
        <div className="mb-4">
          <label className="text-orbit-gray text-xs uppercase tracking-wider mb-2 block">
            Public Key (Address)
          </label>
          <div className="p-3 rounded-lg bg-orbit-dark border border-white/10 font-mono text-sm text-white break-all">
            {newWalletKeys.publicKey}
          </div>
        </div>

        {/* Secret Key */}
        <div className="mb-6">
          <label className="text-red-400 text-xs uppercase tracking-wider mb-2 block flex items-center gap-2">
            <Key size={12} />
            Secret Key (Keep Private!)
          </label>
          <div className="relative">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 font-mono text-sm text-red-300 break-all pr-20">
              {showSecretKey ? newWalletKeys.secretKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="p-2 rounded-lg hover:bg-white/10 text-orbit-gray hover:text-white transition-colors"
              >
                {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={() => copyToClipboard(newWalletKeys.secretKey)}
                className="p-2 rounded-lg hover:bg-white/10 text-orbit-gray hover:text-white transition-colors"
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-6">
          <p className="text-red-300 text-sm font-medium">
            ⚠️ Never share your secret key! Anyone with it can steal your funds.
          </p>
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmedBackup}
            onChange={(e) => setConfirmedBackup(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-orbit-gold/50 bg-orbit-dark text-orbit-gold focus:ring-orbit-gold"
          />
          <span className="text-orbit-gray text-sm">
            I have securely saved my secret key and understand I cannot recover my wallet without it.
          </span>
        </label>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={completeWalletCreation}
          disabled={loading || !confirmedBackup}
          className="w-full btn-gold py-4 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader size={18} className="animate-spin" />
              Creating Wallet...
            </span>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    );
  }

  // Import wallet screen
  if (mode === 'import') {
    return (
      <div className="card-neumorphic p-6 sm:p-8 max-w-md mx-auto border-orbit-gold/20 animate-fade-in">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-orbit-gray hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Download size={32} className="text-blue-400" />
          </div>
          <h2 className="text-xl font-display font-bold text-white tracking-wider uppercase">
            Import Wallet
          </h2>
          <p className="text-orbit-gray text-sm mt-2">
            Enter your Stellar secret key to import your existing wallet
          </p>
        </div>

        <div className="mb-6">
          <label className="text-orbit-gray text-xs uppercase tracking-wider mb-2 block">
            Secret Key
          </label>
          <div className="relative">
            <input
              type={showSecretKey ? 'text' : 'password'}
              value={secretKeyInput}
              onChange={(e) => setSecretKeyInput(e.target.value)}
              placeholder="S..."
              className="w-full p-4 pr-12 rounded-xl bg-orbit-dark border border-white/10 text-white font-mono text-sm focus:border-orbit-gold/50 focus:outline-none"
            />
            <button
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-orbit-gray hover:text-white transition-colors"
            >
              {showSecretKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-orbit-gray-dark text-xs mt-2">
            Your secret key starts with 'S' and is 56 characters long
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleImportWallet}
          disabled={loading || !secretKeyInput.trim()}
          className="w-full btn-gold py-4 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader size={18} className="animate-spin" />
              Importing...
            </span>
          ) : (
            'Import Wallet'
          )}
        </button>
      </div>
    );
  }

  // Create wallet screen
  if (mode === 'create') {
    return (
      <div className="card-neumorphic p-6 sm:p-8 max-w-md mx-auto border-orbit-gold/20 animate-fade-in">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-orbit-gray hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Plus size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-display font-bold text-white tracking-wider uppercase">
            Create New Wallet
          </h2>
          <p className="text-orbit-gray text-sm mt-2">
            Generate a new Stellar wallet. Your keys will be stored securely on this device.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-orbit-dark-light">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Check size={16} className="text-emerald-400" />
            </div>
            <span className="text-white text-sm">Instant wallet creation</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-orbit-dark-light">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Check size={16} className="text-emerald-400" />
            </div>
            <span className="text-white text-sm">Auto-funded with testnet XLM</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-orbit-dark-light">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Check size={16} className="text-emerald-400" />
            </div>
            <span className="text-white text-sm">Keys stored securely on device</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleCreateWallet}
          disabled={loading}
          className="w-full btn-gold py-4 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader size={18} className="animate-spin" />
              Creating...
            </span>
          ) : (
            'Create Wallet'
          )}
        </button>
      </div>
    );
  }

  // Main selection screen
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
          Choose how to connect your Stellar wallet to start making payments
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 animate-slide-up">
          <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Create New Wallet */}
        <button
          onClick={() => setMode('create')}
          className="w-full p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-emerald-600/5 border border-emerald-500/25 hover:border-emerald-500/50 hover:from-emerald-500/20 transition-all duration-300 flex items-center gap-5 text-left group"
        >
          <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-all duration-300">
            <Plus size={28} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-display font-bold text-lg tracking-wide">Create New Wallet</p>
            <p className="text-orbit-gray text-sm mt-0.5">Generate a fresh Stellar wallet</p>
          </div>
        </button>

        {/* Import Wallet */}
        <button
          onClick={() => setMode('import')}
          className="w-full p-5 rounded-2xl bg-gradient-to-r from-blue-500/15 to-blue-600/5 border border-blue-500/25 hover:border-blue-500/50 hover:from-blue-500/20 transition-all duration-300 flex items-center gap-5 text-left group"
        >
          <div className="w-14 h-14 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300">
            <Download size={28} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-display font-bold text-lg tracking-wide">Import Wallet</p>
            <p className="text-orbit-gray text-sm mt-0.5">Use your existing secret key</p>
          </div>
        </button>

        {/* Freighter (if available) */}
        {showFreighter && !isNativeApp && (
          <>
            <div className="flex items-center gap-4 py-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-orbit-gray-dark text-xs uppercase tracking-widest font-bold">or</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            
            <button
              onClick={handleFreighterConnect}
              disabled={loading}
              className="w-full p-5 rounded-2xl bg-gradient-to-r from-purple-500/15 to-purple-600/5 border border-purple-500/25 hover:border-purple-500/50 hover:from-purple-500/20 transition-all duration-300 flex items-center gap-5 text-left group disabled:opacity-50"
            >
              <div className="w-14 h-14 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-300">
                <Sparkles size={28} className="text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-display font-bold text-lg tracking-wide">Freighter Extension</p>
                <p className="text-orbit-gray text-sm mt-0.5">Connect browser wallet</p>
              </div>
              {loading && <Loader size={20} className="animate-spin text-purple-400" />}
            </button>
          </>
        )}

        {/* Mobile App Notice */}
        {isNativeApp && (
          <div className="mt-6 p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-orbit-gold/15 flex items-center justify-center">
                <Smartphone size={22} className="text-orbit-gold" />
              </div>
              <p className="text-orbit-gray text-sm">
                <span className="text-white font-bold">Mobile Mode:</span> Create or import a wallet to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MultiWalletConnect;
