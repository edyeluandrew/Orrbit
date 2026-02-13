import React, { useState } from 'react';
import { Droplets, Loader, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

function XLMFaucet({ wallet, currentBalance, onFunded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const needsFunding = wallet?.needsFunding || currentBalance === 0;

  const fundWithXLM = async () => {
    if (!wallet?.publicKey) {
      setError('No wallet connected');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${wallet.publicKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      setSuccess(true);
      
      // Wait for network then refresh
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (onFunded) onFunded();
      
    } catch (err) {
      if (err.message?.includes('createAccountAlreadyExist')) {
        setError('Already funded. Each account can only use the faucet once.');
      } else {
        setError('Faucet unavailable. Try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show compact version if already funded
  if (!needsFunding && !success && currentBalance > 0) {
    return (
      <div className="card-glass p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-white font-medium">Account Active</p>
              <p className="text-xs text-orbit-gray">Balance: {currentBalance.toFixed(2)} XLM</p>
            </div>
          </div>
          <button
            onClick={fundWithXLM}
            disabled={loading}
            className="text-xs text-orbit-gray hover:text-white transition-colors"
          >
            {loading ? <Loader size={14} className="animate-spin" /> : 'Request more'}
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-400 mt-3">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`card-glass p-5 ${needsFunding ? 'border-amber-500/30' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            needsFunding ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-blue-500/10'
          }`}>
            <Droplets size={20} className={needsFunding ? 'text-amber-400' : 'text-blue-400'} />
          </div>
          <div>
            <p className="text-white font-semibold">
              {needsFunding ? 'Activate Account' : 'Get Test XLM'}
            </p>
            <p className="text-xs text-orbit-gray">Free 10,000 XLM</p>
          </div>
        </div>
      </div>

      {/* Alert for new accounts */}
      {needsFunding && !success && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-300">
            Your wallet needs to be activated on Stellar Testnet before you can use it.
          </p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400" />
            <p className="text-sm text-emerald-300 font-medium">
              10,000 XLM received!
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={fundWithXLM}
        disabled={loading || success}
        className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
          needsFunding && !success
            ? 'bg-amber-500 hover:bg-amber-400 text-black'
            : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30'
        }`}
      >
        {loading ? (
          <>
            <Loader size={16} className="animate-spin" />
            <span>Requesting...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle size={16} />
            <span>Done!</span>
          </>
        ) : (
          <>
            <Sparkles size={16} />
            <span>{needsFunding ? 'Activate Account' : 'Get Free XLM'}</span>
          </>
        )}
      </button>
    </div>
  );
}

export default XLMFaucet;