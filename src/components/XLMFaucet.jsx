import React, { useState } from 'react';
import { Droplet, Loader, CheckCircle, AlertCircle, Info } from 'lucide-react';

function XLMFaucet({ wallet, currentBalance, onFunded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState(null);

  const fundWithXLM = async () => {
    if (!wallet?.publicKey) {
      setError('No wallet connected');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    setTxHash(null);

    try {
      console.log('Requesting XLM from Friendbot...');
      
      // Use Friendbot to fund the account with XLM
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${wallet.publicKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Friendbot request failed: ${errorText}`);
      }

      const result = await response.json();
      console.log('Friendbot result:', result);

      // Extract transaction hash
      const hash = result.hash || result.id;
      
      if (!hash) {
        throw new Error('No transaction hash received from Friendbot');
      }

      setTxHash(hash);
      setSuccess(true);
      
      // Wait a bit for the network to update
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Notify parent to refresh balance
      if (onFunded) {
        onFunded();
      }
      
    } catch (err) {
      console.error('XLM funding error:', err);
      
      if (err.message?.includes('createAccountAlreadyExist')) {
        setError('Account already funded. You can only use Friendbot once per account. Check your balance above.');
      } else if (err.message?.includes('Friendbot')) {
        setError('Friendbot service unavailable. Please try again in a few moments.');
      } else {
        setError(err.message || 'Failed to fund with XLM. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-neumorphic p-6">
      <div className="flex items-center gap-3 mb-4">
        <Droplet size={24} className="text-blue-400" />
        <div>
          <h3 className="text-blue-400 font-bold text-lg">Get Test XLM</h3>
          <p className="text-gray-400 text-xs">Current Balance: {currentBalance} XLM</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-300 text-sm leading-relaxed">
            Get free test XLM tokens from Stellar's Friendbot. You'll receive 10,000 XLM for testing on the Stellar Testnet.
          </p>
        </div>

        {success && (
          <div className="p-4 bg-green-900/30 border-2 border-green-500/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={18} className="text-green-400" />
              <p className="text-green-300 text-sm font-semibold">Successfully funded!</p>
            </div>
            <p className="text-green-300 text-xs mt-2">
              You received 10,000 XLM from Friendbot
            </p>
            {txHash && (
              <p className="text-green-200 text-xs font-mono mt-1 break-all">
                TX: {txHash}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/30 border-2 border-red-500/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={18} className="text-red-400" />
              <p className="text-red-300 text-sm font-semibold">Error</p>
            </div>
            <p className="text-red-300 text-xs">{error}</p>
          </div>
        )}

        <button
          onClick={fundWithXLM}
          disabled={loading || success}
          className="w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader size={20} className="animate-spin" /> Requesting XLM...
            </>
          ) : success ? (
            <>
              <CheckCircle size={20} /> Funded Successfully
            </>
          ) : (
            <>
              <Droplet size={20} /> Get 10,000 Test XLM
            </>
          )}
        </button>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-300 text-xs">
                <strong>Note:</strong> Friendbot can only fund each account once. If you've already used Friendbot for this wallet, this will fail.
              </p>
              <p className="text-blue-300 text-xs mt-2">
                💡 This is instant and requires no approvals - Friendbot directly credits your account!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default XLMFaucet;