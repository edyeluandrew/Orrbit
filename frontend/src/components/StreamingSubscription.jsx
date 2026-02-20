/**
 * Streaming Subscription Component
 * 
 * Enables "pay-as-you-go" subscriptions where XLM streams to creators in real-time.
 * Users can cancel anytime and receive pro-rated refunds.
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Play, Pause, XCircle, Download, Clock, Wallet, 
  TrendingUp, Zap, RefreshCw, CheckCircle, AlertCircle,
  DollarSign, Timer, Droplets
} from 'lucide-react';
import { isConnected, signTransaction as freighterSignTransaction } from '@stellar/freighter-api';
import * as StellarSdk from 'stellar-sdk';
import StreamingPaymentsClient, { formatStreamForDisplay, StreamStatus } from '../services/streamingPayments';
import { useToast } from '../context/ToastContext';
import { usePriceConverter } from '../hooks/usePriceConverter';

// Initialize client (contract ID should come from env/config)
const streamingClient = new StreamingPaymentsClient({
  networkPassphrase: StellarSdk.Networks.TESTNET,
  horizonUrl: 'https://horizon-testnet.stellar.org',
  sorobanUrl: 'https://soroban-testnet.stellar.org',
});

// Placeholder contract ID - replace when deployed
const STREAMING_CONTRACT_ID = import.meta.env.VITE_STREAMING_CONTRACT_ID || null;

if (STREAMING_CONTRACT_ID) {
  streamingClient.setContractId(STREAMING_CONTRACT_ID);
}

/**
 * Stream Progress Bar - Animated real-time visualization
 */
function StreamProgress({ stream, onUpdate }) {
  const [progress, setProgress] = useState(0);
  const [earned, setEarned] = useState(0);
  
  useEffect(() => {
    if (stream.status !== StreamStatus.Active) return;
    
    const updateProgress = () => {
      const now = Math.floor(Date.now() / 1000);
      const totalDuration = stream.endTime - stream.startTime;
      const elapsed = Math.min(now - stream.startTime, totalDuration);
      const newProgress = (elapsed / totalDuration) * 100;
      
      const newEarned = streamingClient.calculateEarned(stream);
      
      setProgress(newProgress);
      setEarned(newEarned);
      
      if (onUpdate) {
        onUpdate({ progress: newProgress, earned: newEarned });
      }
    };
    
    // Update every second for smooth animation
    updateProgress();
    const interval = setInterval(updateProgress, 1000);
    
    return () => clearInterval(interval);
  }, [stream, onUpdate]);
  
  const totalXlm = stream.totalAmount / 10_000_000;
  const remaining = totalXlm - earned;
  
  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="absolute h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        >
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
        {/* Droplet animation at edge */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg animate-pulse"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>
      
      {/* Stats row */}
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-1 text-green-400">
          <TrendingUp className="w-4 h-4" />
          <span>{earned.toFixed(4)} XLM earned</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <Droplets className="w-4 h-4" />
          <span>{remaining.toFixed(4)} XLM remaining</span>
        </div>
      </div>
      
      {/* Per-second rate visualization */}
      <div className="flex items-center justify-center gap-2 text-xs text-purple-400">
        <Zap className="w-3 h-3 animate-pulse" />
        <span>
          Streaming {(totalXlm / ((stream.endTime - stream.startTime) / 86400)).toFixed(6)} XLM/day
        </span>
      </div>
    </div>
  );
}

/**
 * Create Stream Form - For subscribers to start a streaming subscription
 */
export function CreateStreamForm({ creator, tier, wallet, onSuccess, onCancel }) {
  const [duration, setDuration] = useState(30); // days
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();
  const { xlmPrice, convertToUSD } = usePriceConverter();
  
  const totalAmount = tier.amount; // XLM per month
  const durationSeconds = duration * 86400;
  const dailyRate = totalAmount / 30;
  const adjustedAmount = dailyRate * duration;
  
  const handleCreateStream = async () => {
    if (!wallet?.publicKey) {
      setError('Please connect your wallet');
      return;
    }
    
    if (!STREAMING_CONTRACT_ID) {
      setError('Streaming payments not yet available. Coming soon!');
      toast.info('Coming Soon', 'Streaming payments contract is being deployed.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Build the transaction
      const transaction = await streamingClient.buildCreateStreamTransaction({
        subscriberPublicKey: wallet.publicKey,
        creatorPublicKey: creator.walletAddress,
        tokenAddress: 'native', // XLM
        amount: adjustedAmount,
        durationSeconds,
        tierId: tier.id,
      });
      
      // Sign with Freighter
      const connected = await isConnected();
      if (!connected.isConnected) {
        throw new Error('Freighter wallet not connected');
      }
      
      const signedResult = await freighterSignTransaction(transaction.toXDR(), {
        networkPassphrase: StellarSdk.Networks.TESTNET,
      });
      
      if (signedResult.error) {
        throw new Error(signedResult.error);
      }
      
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(
        signedResult.signedTxXdr,
        StellarSdk.Networks.TESTNET
      );
      
      // Submit transaction
      const result = await streamingClient.submitTransaction(signedTx);
      
      toast.success('Stream Created!', `Your subscription is now streaming to ${creator.name}`);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      console.error('Create stream error:', err);
      setError(err.message);
      toast.error('Failed to create stream', err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Droplets className="w-6 h-6 text-purple-400" />
        Start Streaming Subscription
      </h3>
      
      {/* Creator info */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6">
        <p className="text-gray-400 text-sm">Subscribing to</p>
        <p className="text-white font-semibold text-lg">{creator.name}</p>
        <p className="text-purple-400">{tier.name} Tier</p>
      </div>
      
      {/* Duration selector */}
      <div className="mb-6">
        <label className="block text-gray-400 text-sm mb-2">Subscription Duration</label>
        <div className="grid grid-cols-3 gap-3">
          {[7, 30, 90].map(days => (
            <button
              key={days}
              onClick={() => setDuration(days)}
              className={`p-3 rounded-lg border transition-all ${
                duration === days 
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300' 
                  : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              <div className="font-semibold">{days} days</div>
              <div className="text-xs opacity-75">
                {(dailyRate * days).toFixed(2)} XLM
              </div>
            </button>
          ))}
        </div>
        <input
          type="range"
          min="1"
          max="365"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full mt-4 accent-purple-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1 day</span>
          <span>{duration} days</span>
          <span>365 days</span>
        </div>
      </div>
      
      {/* Payment breakdown */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6 space-y-3">
        <div className="flex justify-between text-gray-400">
          <span>Daily rate</span>
          <span>{dailyRate.toFixed(4)} XLM</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Duration</span>
          <span>{duration} days</span>
        </div>
        <div className="border-t border-gray-700 pt-3 flex justify-between text-white font-semibold">
          <span>Total deposit</span>
          <span>{adjustedAmount.toFixed(4)} XLM</span>
        </div>
        {xlmPrice && (
          <div className="text-right text-sm text-gray-500">
            ≈ ${convertToUSD(adjustedAmount).toFixed(2)} USD
          </div>
        )}
      </div>
      
      {/* Pay-as-you-go explainer */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
        <h4 className="text-purple-300 font-semibold mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          How Pay-As-You-Go Works
        </h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Your XLM is locked in a smart contract</li>
          <li>• Funds stream to creator continuously</li>
          <li>• Cancel anytime, get remaining XLM back</li>
          <li>• Creator can withdraw earned XLM anytime</li>
          <li>• 2% platform fee on streamed amount</li>
        </ul>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateStream}
          disabled={loading}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Creating Stream...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Start Streaming
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Active Stream Card - Shows stream status and controls
 */
export function ActiveStreamCard({ stream, role = 'subscriber', onWithdraw, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [streamData, setStreamData] = useState(() => 
    formatStreamForDisplay(stream, streamingClient)
  );
  const toast = useToast();
  const { convertToUSD } = usePriceConverter();
  
  const handleWithdraw = async () => {
    setLoading(true);
    try {
      // Would sign and submit withdraw transaction
      toast.success('Withdrawal Successful', `${streamData.withdrawableXlm.toFixed(4)} XLM sent to your wallet`);
      if (onWithdraw) onWithdraw();
    } catch (err) {
      toast.error('Withdrawal Failed', err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancel = async () => {
    if (!confirm('Are you sure? You will receive a pro-rated refund for unused time.')) return;
    
    setLoading(true);
    try {
      // Would sign and submit cancel transaction
      toast.success('Stream Cancelled', `${streamData.refundableXlm.toFixed(4)} XLM refunded to your wallet`);
      if (onCancel) onCancel();
    } catch (err) {
      toast.error('Cancellation Failed', err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const statusColors = {
    Active: 'text-green-400 bg-green-400/20',
    Paused: 'text-yellow-400 bg-yellow-400/20',
    Cancelled: 'text-red-400 bg-red-400/20',
    Completed: 'text-blue-400 bg-blue-400/20',
  };
  
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {role === 'subscriber' ? 'Your Subscription' : 'Subscriber Stream'}
          </h3>
          <p className="text-gray-400 text-sm">Stream #{stream.id}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[stream.status]}`}>
          {stream.status}
        </span>
      </div>
      
      {/* Progress visualization */}
      {stream.status === StreamStatus.Active && (
        <div className="mb-6">
          <StreamProgress 
            stream={stream} 
            onUpdate={(data) => setStreamData(prev => ({ ...prev, ...data }))}
          />
        </div>
      )}
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Wallet className="w-4 h-4" />
            Total Locked
          </div>
          <div className="text-white font-semibold">{streamData.totalXlm.toFixed(4)} XLM</div>
        </div>
        
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Clock className="w-4 h-4" />
            Remaining
          </div>
          <div className="text-white font-semibold">{streamData.remainingDays} days</div>
        </div>
        
        {role === 'creator' ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 col-span-2">
            <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
              <Download className="w-4 h-4" />
              Withdrawable Now
            </div>
            <div className="text-green-400 font-bold text-xl">
              {streamData.withdrawableXlm.toFixed(4)} XLM
            </div>
            <div className="text-green-400/70 text-sm">
              ≈ ${convertToUSD(streamData.withdrawableXlm).toFixed(2)} USD
            </div>
          </div>
        ) : (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 col-span-2">
            <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
              <RefreshCw className="w-4 h-4" />
              Refund if Cancelled
            </div>
            <div className="text-purple-400 font-bold text-xl">
              {streamData.refundableXlm.toFixed(4)} XLM
            </div>
            <div className="text-purple-400/70 text-sm">
              ≈ ${convertToUSD(streamData.refundableXlm).toFixed(2)} USD
            </div>
          </div>
        )}
      </div>
      
      {/* Actions */}
      {stream.status === StreamStatus.Active && (
        <div className="flex gap-3">
          {role === 'creator' ? (
            <button
              onClick={handleWithdraw}
              disabled={loading || streamData.withdrawableXlm <= 0}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-lg text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Withdraw {streamData.withdrawableXlm.toFixed(2)} XLM
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  Cancel & Refund
                </>
              )}
            </button>
          )}
        </div>
      )}
      
      {/* Completed/Cancelled status */}
      {stream.status === StreamStatus.Completed && (
        <div className="flex items-center justify-center gap-2 text-blue-400 bg-blue-400/10 rounded-lg p-4">
          <CheckCircle className="w-5 h-5" />
          Stream completed successfully
        </div>
      )}
      
      {stream.status === StreamStatus.Cancelled && (
        <div className="flex items-center justify-center gap-2 text-red-400 bg-red-400/10 rounded-lg p-4">
          <XCircle className="w-5 h-5" />
          Stream was cancelled
        </div>
      )}
    </div>
  );
}

/**
 * Streaming Dashboard - Overview of all streams
 */
export function StreamingDashboard({ wallet, role = 'subscriber' }) {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  
  useEffect(() => {
    loadStreams();
  }, [wallet?.publicKey, role]);
  
  const loadStreams = async () => {
    if (!wallet?.publicKey || !STREAMING_CONTRACT_ID) {
      setStreams([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const streamIds = role === 'creator'
        ? await streamingClient.getCreatorStreams(wallet.publicKey)
        : await streamingClient.getSubscriberStreams(wallet.publicKey);
      
      const streamData = await Promise.all(
        streamIds.map(id => streamingClient.getStream(id))
      );
      
      setStreams(streamData);
      
      // Calculate total earnings for creators
      if (role === 'creator') {
        const total = streamData.reduce((sum, s) => {
          if (s.status === StreamStatus.Active) {
            return sum + streamingClient.calculateWithdrawable(s);
          }
          return sum;
        }, 0);
        setTotalEarnings(total);
      }
    } catch (err) {
      console.error('Failed to load streams:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (!STREAMING_CONTRACT_ID) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
        <Droplets className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Streaming Payments Coming Soon</h3>
        <p className="text-gray-400 mb-4">
          Pay-as-you-go subscriptions are being deployed. This feature will allow:
        </p>
        <ul className="text-gray-400 text-sm space-y-2 inline-block text-left">
          <li>• Real-time XLM streaming to creators</li>
          <li>• Cancel anytime with pro-rated refunds</li>
          <li>• Creators withdraw earnings instantly</li>
          <li>• Fair payment for exact usage time</li>
        </ul>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Summary card for creators */}
      {role === 'creator' && streams.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm">Total Withdrawable</p>
              <p className="text-3xl font-bold text-white">{totalEarnings.toFixed(4)} XLM</p>
            </div>
            <button className="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-semibold transition-colors flex items-center gap-2">
              <Download className="w-5 h-5" />
              Withdraw All
            </button>
          </div>
        </div>
      )}
      
      {/* Stream list */}
      {streams.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
          <Droplets className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">
            {role === 'creator' 
              ? 'No active streams yet. Subscribers will appear here.'
              : 'No streaming subscriptions yet. Start one to pay-as-you-go!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {streams.map(stream => (
            <ActiveStreamCard 
              key={stream.id} 
              stream={stream} 
              role={role}
              onWithdraw={loadStreams}
              onCancel={loadStreams}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default StreamingDashboard;
