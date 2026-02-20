/**
 * Subscriber Dashboard
 * 
 * Clean dashboard for subscribers to:
 * - View active streaming subscriptions
 * - Extend subscriptions (add more time/money)
 * - Toggle auto-renewal
 * - Cancel subscriptions (get refund)
 */

import { useState, useEffect } from 'react';
import { 
  Users, 
  Clock,
  RefreshCw,
  XCircle,
  Plus,
  Zap,
  Calendar,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Wallet,
  AlertCircle,
  ExternalLink,
  Timer,
  Droplets
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { usePriceConverter } from '../hooks/usePriceConverter';

/**
 * Subscription Card with streaming visualization
 */
function SubscriptionCard({ 
  subscription, 
  onCancel, 
  onExtend, 
  onToggleAutoRenew,
  loading 
}) {
  const [progress, setProgress] = useState(0);
  const [streamed, setStreamed] = useState(0);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const { convertToUSD, xlmPrice } = usePriceConverter();
  
  const {
    id,
    creatorName,
    tierName,
    total,
    startTime,
    endTime,
    status,
    autoRenew,
    creatorAvatar
  } = subscription;
  
  // Calculate real-time progress
  useEffect(() => {
    if (status !== 'active') return;
    
    const updateProgress = () => {
      const now = Date.now() / 1000;
      const totalDuration = endTime - startTime;
      const elapsed = Math.min(now - startTime, totalDuration);
      const newProgress = (elapsed / totalDuration) * 100;
      const newStreamed = (elapsed / totalDuration) * total;
      
      setProgress(newProgress);
      setStreamed(newStreamed);
    };
    
    updateProgress();
    const interval = setInterval(updateProgress, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime, total, status]);
  
  const remaining = total - streamed;
  const daysLeft = Math.max(0, Math.ceil((endTime - Date.now() / 1000) / 86400));
  const dailyRate = total / ((endTime - startTime) / 86400);
  
  const isActive = status === 'active';
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';
  
  return (
    <div className={`card-glass p-5 ${!isActive ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-purple-400">
          {creatorAvatar ? (
            <img src={creatorAvatar} alt="" className="w-full h-full rounded-xl object-cover" />
          ) : (
            <Users size={24} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{creatorName}</h3>
          <p className="text-sm text-orbit-gray">{tierName || 'Subscription'}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Streaming
            </span>
          )}
          {isCompleted && (
            <span className="px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs font-medium">
              Completed
            </span>
          )}
          {isCancelled && (
            <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
              Cancelled
            </span>
          )}
        </div>
      </div>
      
      {/* Progress Bar (active only) */}
      {isActive && (
        <div className="mb-4">
          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="absolute h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-emerald-400">{streamed.toFixed(2)} XLM streamed</span>
            <span className="text-orbit-gray">{remaining.toFixed(2)} XLM remaining</span>
          </div>
        </div>
      )}
      
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-4 py-3 border-y border-white/5">
        <div className="text-center">
          <p className="text-xs text-orbit-gray mb-1">Daily Rate</p>
          <p className="font-semibold text-white">{dailyRate.toFixed(2)} XLM</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-orbit-gray mb-1">Days Left</p>
          <p className="font-semibold text-white">{daysLeft}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-orbit-gray mb-1">Auto-Renew</p>
          <button
            onClick={() => isActive && onToggleAutoRenew?.(id, !autoRenew)}
            disabled={!isActive || loading}
            className={`inline-flex items-center gap-1 ${isActive ? 'cursor-pointer' : 'cursor-not-allowed'}`}
          >
            {autoRenew ? (
              <>
                <ToggleRight size={20} className="text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">On</span>
              </>
            ) : (
              <>
                <ToggleLeft size={20} className="text-gray-500" />
                <span className="text-gray-500 text-sm font-medium">Off</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Actions (active only) */}
      {isActive && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowExtendModal(true)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <Plus size={16} />
            Extend
          </button>
          <button
            onClick={() => onCancel?.(id)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
          >
            <XCircle size={16} />
            Cancel
          </button>
        </div>
      )}
      
      {/* Refund Info */}
      {isActive && remaining > 0 && (
        <p className="text-xs text-center text-orbit-gray mt-3">
          Cancel now to receive ~{remaining.toFixed(2)} XLM refund
        </p>
      )}
      
      {/* Extend Modal */}
      {showExtendModal && (
        <ExtendModal
          subscription={subscription}
          onExtend={(amount, days) => {
            onExtend?.(id, amount, days);
            setShowExtendModal(false);
          }}
          onClose={() => setShowExtendModal(false)}
        />
      )}
    </div>
  );
}

/**
 * Extend Subscription Modal
 */
function ExtendModal({ subscription, onExtend, onClose }) {
  const [days, setDays] = useState(30);
  const dailyRate = subscription.total / ((subscription.endTime - subscription.startTime) / 86400);
  const additionalAmount = dailyRate * days;
  const { convertToUSD, xlmPrice } = usePriceConverter();
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#12121a] rounded-2xl border border-white/10 p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Plus size={20} className="text-purple-400" />
          Extend Subscription
        </h3>
        
        <p className="text-orbit-gray mb-4">
          Add more time to your subscription to {subscription.creatorName}
        </p>
        
        {/* Duration selector */}
        <div className="mb-6">
          <label className="block text-sm text-orbit-gray mb-2">Additional Time</label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`p-3 rounded-lg border transition-all ${
                  days === d 
                    ? 'border-purple-500 bg-purple-500/20 text-white' 
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                <div className="font-semibold">{d} days</div>
              </button>
            ))}
          </div>
          <input
            type="range"
            min="1"
            max="365"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
        </div>
        
        {/* Cost */}
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-orbit-gray">Daily rate</span>
            <span className="text-white">{dailyRate.toFixed(4)} XLM</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-orbit-gray">Duration</span>
            <span className="text-white">{days} days</span>
          </div>
          <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
            <span className="font-medium text-white">Total</span>
            <div className="text-right">
              <span className="font-bold text-white">{additionalAmount.toFixed(2)} XLM</span>
              {xlmPrice && (
                <p className="text-xs text-orbit-gray">≈ ${convertToUSD(additionalAmount).toFixed(2)}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onExtend(additionalAmount, days)}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Extend Subscription
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Subscriber Dashboard
 */
export default function SubscriberDashboard({
  wallet,
  subscriptions = [],
  onCancel,
  onExtend,
  onToggleAutoRenew,
  onRefresh,
}) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { convertToUSD, xlmPrice } = usePriceConverter();
  
  // Separate active and past subscriptions
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const pastSubscriptions = subscriptions.filter(s => s.status !== 'active');
  
  // Calculate totals
  const totalMonthly = activeSubscriptions.reduce((sum, s) => {
    const days = (s.endTime - s.startTime) / 86400;
    return sum + (s.total / days) * 30;
  }, 0);
  
  const totalStreaming = activeSubscriptions.reduce((sum, s) => {
    const now = Date.now() / 1000;
    const elapsed = Math.min(now - s.startTime, s.endTime - s.startTime);
    const streamed = (elapsed / (s.endTime - s.startTime)) * s.total;
    return sum + (s.total - streamed);
  }, 0);
  
  const handleRefresh = async () => {
    setLoading(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancel = async (subscriptionId) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    if (!sub) return;
    
    const confirmed = window.confirm(
      `Cancel subscription to ${sub.creatorName}? You'll receive a refund for the remaining balance.`
    );
    
    if (confirmed && onCancel) {
      try {
        await onCancel(subscriptionId);
        toast.success('Subscription Cancelled', 'Your refund is on the way!');
      } catch (error) {
        toast.error('Cancel Failed', error.message);
      }
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">My Subscriptions</h2>
          <p className="text-orbit-gray text-sm">Manage your streaming subscriptions</p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-glass p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Zap size={18} className="text-purple-400" />
            </div>
            <span className="text-orbit-gray text-sm">Active Subscriptions</span>
          </div>
          <p className="text-2xl font-bold text-white">{activeSubscriptions.length}</p>
        </div>
        
        <div className="card-glass p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Droplets size={18} className="text-emerald-400" />
            </div>
            <span className="text-orbit-gray text-sm">Currently Streaming</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalStreaming.toFixed(2)} XLM</p>
          {xlmPrice && (
            <p className="text-xs text-orbit-gray">≈ ${convertToUSD(totalStreaming).toFixed(2)}</p>
          )}
        </div>
      </div>
      
      {/* Active Subscriptions */}
      {activeSubscriptions.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Active Streams
          </h3>
          <div className="grid gap-4">
            {activeSubscriptions.map(sub => (
              <SubscriptionCard
                key={sub.id}
                subscription={sub}
                onCancel={handleCancel}
                onExtend={onExtend}
                onToggleAutoRenew={onToggleAutoRenew}
                loading={loading}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="card-glass p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
            <Users size={32} className="text-orbit-gray" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Active Subscriptions</h3>
          <p className="text-orbit-gray mb-4">Browse creators and start streaming your first subscription!</p>
        </div>
      )}
      
      {/* Past Subscriptions */}
      {pastSubscriptions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-orbit-gray">Past Subscriptions</h3>
          <div className="grid gap-4">
            {pastSubscriptions.slice(0, 5).map(sub => (
              <SubscriptionCard
                key={sub.id}
                subscription={sub}
                loading={loading}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Info Card */}
      <div className="card-glass p-5 bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-purple-500/20">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <AlertCircle size={20} className="text-purple-400" />
          </div>
          <div>
            <h4 className="font-medium text-white mb-1">How Orbit Subscriptions Work</h4>
            <p className="text-sm text-orbit-gray">
              Support creators on YouTube, Discord, Telegram & more with streaming XLM payments. 
              Your funds stream in real-time — cancel anytime and get your remaining balance back instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
