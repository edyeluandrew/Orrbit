import React, { useState } from 'react';
import { Droplets, Loader, CheckCircle, AlertCircle, Info, Sparkles, AlertTriangle } from 'lucide-react';

function XLMFaucet({ wallet, currentBalance, onFunded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState(null);

  const needsFunding = wallet?.needsFunding || currentBalance === 0;

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
        setError('Account already funded. You can only use Friendbot once per account. Try refreshing your balance.');
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
    <div className={`card-neumorphic p-6 animate-fade-in ${needsFunding && !success ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
      {/* New Account Alert */}
      {needsFunding && !success && (
        <div className="mb-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-semibold text-sm">Account Not Yet Active</p>
              <p className="text-amber-300/70 text-xs mt-1">
                Your wallet exists but hasn't been funded on the Stellar Testnet yet. 
                Click the button below to activate it with 10,000 free test XLM!
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${needsFunding && !success ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-blue-500/10 border border-blue-500/20'}`}>
            <Droplets size={20} className={needsFunding && !success ? 'text-amber-400' : 'text-blue-400'} />
          </div>
          <div>
            <h3 className="text-white font-display font-bold">
              {needsFunding && !success ? 'Activate Account' : 'Get Test XLM'}
            </h3>
            <p className="text-orbit-gray text-xs">Balance: {currentBalance.toFixed(2)} XLM</p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-orbit-dark-light border border-white/5">
          <span className="text-orbit-gold font-mono text-sm font-medium">10,000 XLM</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl p-4 bg-orbit-dark-light border border-white/5">
          <p className="text-orbit-gray-light text-sm leading-relaxed">
            Get free test XLM tokens from Stellar's Friendbot. Perfect for testing payments on the Stellar Testnet.
          </p>
        </div>

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={18} className="text-emerald-400" />
              <p className="text-emerald-300 text-sm font-semibold">Successfully funded!</p>
            </div>
            <p className="text-emerald-300/80 text-xs">
              You received 10,000 XLM from Friendbot
            </p>
            {txHash && (
              <p className="text-emerald-400/60 text-xs font-mono mt-2 truncate">
                TX: {txHash}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={18} className="text-red-400" />
              <p className="text-red-300 text-sm font-semibold">Error</p>
            </div>
            <p className="text-red-300/80 text-xs">{error}</p>
          </div>
        )}

        <button
          onClick={fundWithXLM}
          disabled={loading || success}
          className={`w-full py-3.5 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
            needsFunding && !success
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white hover:shadow-amber-500/25 animate-pulse'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white hover:shadow-blue-500/25'
          }`}
        >
          {loading ? (
            <>
              <Loader size={18} className="animate-spin" />
              <span>{needsFunding ? 'Activating Account...' : 'Requesting XLM...'}</span>
            </>
          ) : success ? (
            <>
              <CheckCircle size={18} />
              <span>Account Activated!</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>{needsFunding ? '🚀 Activate & Get 10,000 XLM' : 'Get 10,000 Test XLM'}</span>
            </>
          )}
        </button>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
          <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-300/80 space-y-1">
            <p>
              <span className="font-medium text-blue-300">Note:</span> Friendbot can only fund each account once.
            </p>
            <p className="text-blue-300/60">
              This is instant and requires no approvals!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default XLMFaucet;