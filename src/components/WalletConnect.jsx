import { useState } from 'react';
import { Wallet, Loader, AlertCircle, ExternalLink, Sparkles } from 'lucide-react';
import { isConnected, requestAccess } from '@stellar/freighter-api';
import * as StellarSdk from 'stellar-sdk';

function WalletConnect({ onConnect, buttonText = "Connect Freighter Wallet" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connectWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      const connectedResult = await isConnected();
      
      if (!connectedResult.isConnected) {
        throw new Error('Freighter wallet not installed. Please install the Freighter browser extension from https://www.freighter.app/');
      }

      console.log('Freighter is installed, requesting access...');

      const accessObj = await requestAccess();
      
      if (accessObj.error) {
        throw new Error(accessObj.error);
      }

      const publicKey = accessObj.address;
      
      if (!publicKey) {
        throw new Error('Failed to get public key from Freighter');
      }

      console.log('Connected wallet:', publicKey);

      // Connect to Stellar Testnet
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      
      let balance = 0;
      let needsFunding = false;
      
      try {
        // Try to load account to get balance
        const account = await server.loadAccount(publicKey);
        
        // Get XLM balance
        const xlmBalance = account.balances.find(
          balance => balance.asset_type === 'native'
        );
        balance = parseFloat(xlmBalance?.balance || 0);
      } catch (loadErr) {
        // Account not found on chain - this is OK, user just needs to fund it
        if (loadErr.response?.status === 404 || loadErr.message?.includes('Not Found')) {
          console.log('Account not yet funded on testnet - connecting with 0 balance');
          needsFunding = true;
        } else {
          throw loadErr;
        }
      }

      const walletData = {
        publicKey,
        balance,
        type: 'connected',
        needsFunding
      };

      console.log('Wallet data:', walletData);
      onConnect(walletData);

    } catch (err) {
      console.error('Wallet connection error:', err);
      
      let errorMessage = 'Failed to connect wallet';
      
      if (err.message?.includes('not installed')) {
        errorMessage = 'Freighter wallet not found. Please install the Freighter browser extension from https://www.freighter.app/';
      } else if (err.message?.includes('User declined') || err.message?.includes('rejected')) {
        errorMessage = 'Connection rejected. Please approve the connection in Freighter.';
      } else if (err.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-neumorphic p-8 sm:p-10 max-w-md mx-auto border-orbit-gold/20">
      <div className="text-center">
        {/* Icon with glow effect */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-orbit-gold/30 blur-2xl rounded-full animate-pulse" />
          <div className="relative w-full h-full flex items-center justify-center rounded-2xl bg-orbit-dark-light border border-orbit-gold/30">
            <Wallet size={48} className="text-orbit-gold drop-shadow-[0_0_10px_rgba(247,147,26,0.5)]" />
          </div>
        </div>
        
        <h2 className="text-2xl font-display font-bold text-white mb-3 tracking-wider uppercase">Connect Wallet</h2>
        <p className="text-orbit-gray text-base mb-8 font-medium">
          Connect your Freighter wallet to access the platform
        </p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-left animate-slide-up">
            <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-300 text-sm font-medium">{error}</p>
          </div>
        )}
        
        <button
          onClick={connectWallet}
          disabled={loading}
          className="w-full btn-gold py-4 px-6 rounded-xl font-bold text-base uppercase tracking-wider flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(247,147,26,0.3)]"
        >
          {loading ? (
            <>
              <Loader size={20} className="animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Wallet size={20} />
              <span>{buttonText}</span>
            </>
          )}
        </button>

        <div className="mt-8 p-5 rounded-xl bg-orbit-dark-light border border-orbit-gold/10">
          <p className="text-orbit-gray-light text-base mb-4 font-semibold uppercase tracking-wide">
            Don't have Freighter?
          </p>
          <ol className="text-left space-y-3 text-base text-orbit-gray font-medium">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-orbit-gold/20 text-orbit-gold text-sm font-bold flex items-center justify-center border border-orbit-gold/30">1</span>
              <span>Install from <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" className="text-orbit-gold hover:text-orbit-gold-light transition-colors inline-flex items-center gap-1 font-semibold">freighter.app <ExternalLink size={12} /></a></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-orbit-gold/20 text-orbit-gold text-sm font-bold flex items-center justify-center border border-orbit-gold/30">2</span>
              <span>Create or import a wallet</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-orbit-gold/20 text-orbit-gold text-sm font-bold flex items-center justify-center border border-orbit-gold/30">3</span>
              <span>Switch to <span className="text-orbit-gold font-semibold">Testnet</span> mode</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-orbit-gold/20 text-orbit-gold text-sm font-bold flex items-center justify-center border border-orbit-gold/30">4</span>
              <span>Return here and connect</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default WalletConnect;