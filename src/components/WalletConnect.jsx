import { useState } from 'react';
import { Wallet, Loader, AlertCircle } from 'lucide-react';
import { isConnected, requestAccess } from '@stellar/freighter-api';
import * as StellarSdk from 'stellar-sdk';

function WalletConnect({ onConnect, buttonText = "Connect Freighter Wallet" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connectWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if Freighter is installed
      const connectedResult = await isConnected();
      
      if (!connectedResult.isConnected) {
        throw new Error('Freighter wallet not installed. Please install the Freighter browser extension from https://www.freighter.app/');
      }

      console.log('Freighter is installed, requesting access...');

      // Request access and get public key
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
      
      // Load account to get balance
      const account = await server.loadAccount(publicKey);
      
      // Get XLM balance
      const xlmBalance = account.balances.find(
        balance => balance.asset_type === 'native'
      );

      const walletData = {
        publicKey,
        balance: parseFloat(xlmBalance?.balance || 0),
        type: 'connected'
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
      } else if (err.response?.status === 404 || err.message?.includes('Not Found')) {
        errorMessage = 'Account not found on testnet. Please fund your account using the XLM Faucet first.';
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
    <div className="card-neumorphic p-8">
      <div className="text-center">
        <Wallet size={64} className="mx-auto text-yellow-400 mb-4 animate-float" />
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">Connect Your Wallet</h2>
        
        <p className="text-gray-400 text-sm mb-6">
          Connect your Freighter wallet to access the platform
        </p>
        
        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border-2 border-red-500/50 rounded-xl flex items-start gap-2">
            <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-300 text-sm text-left">{error}</p>
          </div>
        )}
        
        <button
          onClick={connectWallet}
          disabled={loading}
          className="btn-gold py-3 px-8 rounded-xl font-bold text-lg transition-smooth disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
        >
          {loading ? (
            <>
              <Loader size={20} className="animate-spin" /> Connecting...
            </>
          ) : (
            <>
              <Wallet size={20} /> {buttonText}
            </>
          )}
        </button>

        <div className="mt-6 bg-gray-900/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs leading-relaxed">
            <strong className="text-gray-300">Don't have Freighter?</strong><br />
            1. Install from <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">freighter.app</a><br />
            2. Create or import a wallet<br />
            3. Switch to <strong className="text-yellow-400">Testnet</strong> mode in settings<br />
            4. Return here and click "Connect Wallet"
          </p>
        </div>
      </div>
    </div>
  );
}

export default WalletConnect;