import { useState, useEffect } from 'react';
import { 
  Wallet, Loader, AlertCircle, ExternalLink, CheckCircle, 
  Smartphone, Monitor, ChevronRight, X, Zap
} from 'lucide-react';
import { isConnected, requestAccess } from '@stellar/freighter-api';
import * as StellarSdk from 'stellar-sdk';
import { useToast } from '../context/ToastContext';
import { PLATFORM_CONFIG } from '../config/platform';

// Import wallet logos
import freighterLogo from '../assets/wallets/freighter.avif';
import lobstrLogo from '../assets/wallets/lobstr.jpg';

// Wallet configurations
const WALLETS = [
  {
    id: 'freighter',
    name: 'Freighter',
    description: 'Browser extension',
    logo: freighterLogo,
    color: 'from-purple-500 to-indigo-600',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    hoverBorder: 'hover:border-purple-500/50',
    type: 'extension',
    popular: true,
  },
  {
    id: 'lobstr',
    name: 'LOBSTR',
    description: 'Mobile wallet',
    logo: lobstrLogo,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    hoverBorder: 'hover:border-blue-500/50',
    type: 'mobile',
    popular: true,
  },
];

function WalletConnect({ onConnect }) {
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('select'); // 'select', 'connect', 'manual'
  const [manualKey, setManualKey] = useState('');
  const toast = useToast();

  // Check for installed wallets
  const [installedWallets, setInstalledWallets] = useState({});
  
  useEffect(() => {
    const checkWallets = async () => {
      try {
        const { isConnected: freighterInstalled } = await isConnected();
        setInstalledWallets(prev => ({ ...prev, freighter: freighterInstalled }));
      } catch {
        setInstalledWallets(prev => ({ ...prev, freighter: false }));
      }
    };
    checkWallets();
  }, []);

  const fetchBalance = async (publicKey) => {
    const server = new StellarSdk.Horizon.Server(PLATFORM_CONFIG.HORIZON_URL);
    try {
      const account = await server.loadAccount(publicKey);
      const xlm = account.balances.find(b => b.asset_type === 'native');
      return { balance: parseFloat(xlm?.balance || 0), needsFunding: false };
    } catch (err) {
      if (err.response?.status === 404) {
        return { balance: 0, needsFunding: true };
      }
      return { balance: 0, needsFunding: false };
    }
  };

  const connectFreighter = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { isConnected: installed } = await isConnected();
      if (!installed) {
        setError('Freighter not detected. Please install it first.');
        setLoading(false);
        return;
      }

      const { address, error: accessError } = await requestAccess();
      if (accessError) throw new Error(accessError);
      if (!address) throw new Error('Failed to get wallet address');

      const { balance, needsFunding } = await fetchBalance(address);
      
      toast.success('Connected!', `${address.slice(0, 6)}...${address.slice(-4)}`);
      onConnect({ publicKey: address, balance, type: 'freighter', needsFunding });

    } catch (err) {
      setError(err.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletSelect = async (wallet) => {
    setSelectedWallet(wallet);
    setError(null);
    
    if (wallet.id === 'freighter') {
      if (installedWallets.freighter) {
        await connectFreighter();
      } else {
        setStep('connect');
      }
    } else if (wallet.id === 'lobstr') {
      setStep('connect');
    }
  };

  const handleManualConnect = async () => {
    if (!manualKey || !manualKey.startsWith('G') || manualKey.length !== 56) {
      setError('Invalid Stellar address. Must start with G and be 56 characters.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { balance, needsFunding } = await fetchBalance(manualKey);
      
      toast.success('Connected!', `${manualKey.slice(0, 6)}...${manualKey.slice(-4)}`);
      onConnect({ publicKey: manualKey, balance, type: 'readonly', needsFunding });

    } catch (err) {
      setError(err.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const getInstallUrl = (walletId) => {
    const urls = {
      freighter: 'https://freighter.app',
      lobstr: 'https://lobstr.co',
    };
    return urls[walletId] || '#';
  };

  // Wallet Selection Screen
  if (step === 'select') {
    return (
      <div className="card-glass p-6 max-w-md mx-auto overflow-hidden">
        {/* Header with animated gradient */}
        <div className="relative mb-6">
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />
          
          <div className="relative text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center backdrop-blur-sm">
              <Wallet size={28} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Connect Wallet</h2>
            <p className="text-sm text-orbit-gray">Choose your Stellar wallet</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {/* Wallet Options */}
        <div className="space-y-3 mb-6">
          {WALLETS.map(wallet => {
            const isInstalled = installedWallets[wallet.id];
            
            return (
              <button
                key={wallet.id}
                onClick={() => handleWalletSelect(wallet)}
                disabled={loading}
                className={`w-full p-4 rounded-xl ${wallet.bgColor} border ${wallet.borderColor} ${wallet.hoverBorder} transition-all group relative overflow-hidden disabled:opacity-50`}
              >
                {/* Hover glow */}
                <div className={`absolute inset-0 bg-gradient-to-r ${wallet.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                
                <div className="relative flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden">
                    <img src={wallet.logo} alt={wallet.name} className="w-10 h-10 object-contain" />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{wallet.name}</span>
                      {wallet.popular && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">Popular</span>
                      )}
                      {isInstalled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Installed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {wallet.type === 'extension' ? (
                        <Monitor size={12} className="text-orbit-gray" />
                      ) : (
                        <Smartphone size={12} className="text-orbit-gray" />
                      )}
                      <span className="text-xs text-orbit-gray">{wallet.description}</span>
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <ChevronRight size={18} className="text-orbit-gray group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Manual Entry Option */}
        <div className="pt-4 border-t border-white/5">
          <button
            onClick={() => setStep('manual')}
            className="w-full py-3 text-sm text-orbit-gray hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <Zap size={14} />
            <span>Enter wallet address manually</span>
          </button>
        </div>
      </div>
    );
  }

  // Connect/Install Screen for selected wallet
  if (step === 'connect' && selectedWallet) {
    const isExtension = selectedWallet.type === 'extension';
    const isInstalled = installedWallets[selectedWallet.id];
    
    return (
      <div className="card-glass p-6 max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={() => { setStep('select'); setSelectedWallet(null); setError(null); }}
          className="mb-4 text-sm text-orbit-gray hover:text-white transition-colors flex items-center gap-1"
        >
          <ChevronRight size={14} className="rotate-180" />
          <span>Back</span>
        </button>

        {/* Wallet Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center overflow-hidden">
            <img src={selectedWallet.logo} alt={selectedWallet.name} className="w-16 h-16 object-contain" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{selectedWallet.name}</h2>
          <p className="text-sm text-orbit-gray">{selectedWallet.description}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {/* Freighter - Extension flow */}
        {isExtension && (
          <div className="space-y-4">
            {isInstalled ? (
              <button
                onClick={connectFreighter}
                disabled={loading}
                className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${selectedWallet.color} text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg`}
              >
                {loading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    <span>Connect {selectedWallet.name}</span>
                  </>
                )}
              </button>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-300 text-center">
                    {selectedWallet.name} extension not detected
                  </p>
                </div>
                <a
                  href={getInstallUrl(selectedWallet.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${selectedWallet.color} text-white font-semibold flex items-center justify-center gap-2 shadow-lg`}
                >
                  <ExternalLink size={16} />
                  <span>Install {selectedWallet.name}</span>
                </a>
              </>
            )}
          </div>
        )}

        {/* LOBSTR - Mobile flow */}
        {selectedWallet.id === 'lobstr' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-sm text-orbit-gray mb-3">
                Scan with LOBSTR app or enter your address below
              </p>
              
              {/* QR Code Placeholder - would need a QR library */}
              <div className="w-32 h-32 mx-auto mb-4 rounded-xl bg-white flex items-center justify-center">
                <div className="text-center text-black/60 text-xs p-2">
                  <Smartphone size={24} className="mx-auto mb-1 text-black/40" />
                  Open LOBSTR
                </div>
              </div>
              
              <a
                href="https://lobstr.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline flex items-center justify-center gap-1"
              >
                Get LOBSTR <ExternalLink size={10} />
              </a>
            </div>
            
            {/* Manual entry for LOBSTR users */}
            <div className="relative">
              <input
                type="text"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value.toUpperCase())}
                placeholder="Enter your LOBSTR address (G...)"
                className="w-full py-3 px-4 pr-12 rounded-xl bg-white/5 border border-white/10 focus:border-blue-500/50 text-white text-sm placeholder:text-orbit-gray outline-none transition-colors"
              />
              {manualKey && (
                <button
                  onClick={() => setManualKey('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-orbit-gray hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <button
              onClick={handleManualConnect}
              disabled={loading || !manualKey}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Wallet size={16} />
                  <span>Connect</span>
                </>
              )}
            </button>
            
            <p className="text-[10px] text-orbit-gray text-center">
              Note: Read-only mode - transactions require signing in LOBSTR
            </p>
          </div>
        )}
      </div>
    );
  }

  // Manual Entry Screen
  if (step === 'manual') {
    return (
      <div className="card-glass p-6 max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={() => { setStep('select'); setError(null); setManualKey(''); }}
          className="mb-4 text-sm text-orbit-gray hover:text-white transition-colors flex items-center gap-1"
        >
          <ChevronRight size={14} className="rotate-180" />
          <span>Back</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-500/20 to-gray-600/20 border border-white/10 flex items-center justify-center">
            <Zap size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Manual Entry</h2>
          <p className="text-sm text-orbit-gray">Enter your Stellar public key</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value.toUpperCase())}
              placeholder="G..."
              className="w-full py-3.5 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500/50 text-white font-mono text-sm placeholder:text-orbit-gray outline-none transition-colors"
            />
          </div>
          
          <button
            onClick={handleManualConnect}
            disabled={loading || !manualKey}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>Connect</span>
              </>
            )}
          </button>
          
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-300 text-center">
              ⚠️ Read-only mode - you won't be able to sign transactions
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default WalletConnect;
