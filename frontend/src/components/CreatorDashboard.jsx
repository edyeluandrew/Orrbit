/**
 * Creator Dashboard
 * 
 * Clean, simple dashboard for creators to:
 * - View active subscriber count
 * - See pending earnings
 * - Withdraw all earnings at once
 * - View recent subscriber activity
 */

import { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Download,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Zap,
  ArrowUpRight,
  Wallet,
  XCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { usePriceConverter } from '../hooks/usePriceConverter';

/**
 * Stat Card Component
 */
function StatCard({ icon: Icon, label, value, subValue, iconColor = 'text-orbit-gold', trend, loading }) {
  return (
    <div className="card-glass p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-white/5 ${iconColor}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className={`text-xs font-medium flex items-center gap-1 ${
            trend > 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            <ArrowUpRight size={12} className={trend < 0 ? 'rotate-90' : ''} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-sm text-orbit-gray mb-1">{label}</p>
      {loading ? (
        <div className="h-8 bg-white/5 rounded animate-pulse" />
      ) : (
        <>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subValue && (
            <p className="text-xs text-orbit-gray mt-1">{subValue}</p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Stream Row Component
 */
function StreamRow({ stream, onTerminate }) {
  const progressPercent = Math.min(100, (stream.streamed / stream.total) * 100);
  const remaining = stream.total - stream.streamed;
  
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-all">
      {/* Subscriber info */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-purple-400">
        <Users size={18} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">
          {stream.subscriberName || `${stream.subscriber.slice(0, 8)}...${stream.subscriber.slice(-4)}`}
        </p>
        <p className="text-xs text-orbit-gray">
          {stream.tierName || `Tier ${stream.tierId}`} • Started {stream.startDate}
        </p>
      </div>
      
      {/* Progress */}
      <div className="w-32 hidden sm:block">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[10px] text-orbit-gray mt-1 text-center">
          {progressPercent.toFixed(0)}% streamed
        </p>
      </div>
      
      {/* Earnings */}
      <div className="text-right">
        <p className="font-semibold text-emerald-400">+{stream.streamed.toFixed(2)} XLM</p>
        <p className="text-[10px] text-orbit-gray">{remaining.toFixed(2)} remaining</p>
      </div>
      
      {/* Terminate button */}
      <button
        onClick={() => onTerminate?.(stream)}
        className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
        title="Terminate subscription"
      >
        <XCircle size={16} />
      </button>
    </div>
  );
}

export default function CreatorDashboard({ 
  wallet,
  streams = [],
  onWithdrawAll,
  onTerminateStream,
  onRefresh,
}) {
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [stats, setStats] = useState({
    activeSubscribers: 0,
    pendingEarnings: 0,
    totalEarned: 0,
    monthlyRevenue: 0,
  });
  
  const toast = useToast();
  const { convertToUSD, xlmPrice } = usePriceConverter();
  
  // Calculate stats from streams
  useEffect(() => {
    const activeStreams = streams.filter(s => s.status === 'active');
    const pendingEarnings = activeStreams.reduce((sum, s) => {
      const earned = s.streamed || 0;
      const withdrawn = s.withdrawn || 0;
      return sum + Math.max(0, earned - withdrawn);
    }, 0);
    
    const totalEarned = streams.reduce((sum, s) => sum + (s.withdrawn || 0), 0);
    
    // Estimate monthly (based on current active streams' total)
    const monthlyEstimate = activeStreams.reduce((sum, s) => sum + (s.total || 0), 0);
    
    setStats({
      activeSubscribers: activeStreams.length,
      pendingEarnings,
      totalEarned,
      monthlyRevenue: monthlyEstimate,
    });
  }, [streams]);
  
  const handleWithdrawAll = async () => {
    if (stats.pendingEarnings <= 0) {
      toast.info('Nothing to Withdraw', 'No pending earnings available');
      return;
    }
    
    setWithdrawing(true);
    try {
      if (onWithdrawAll) {
        await onWithdrawAll();
      }
      toast.success('Withdrawal Complete', `${stats.pendingEarnings.toFixed(2)} XLM sent to your wallet`);
    } catch (error) {
      toast.error('Withdrawal Failed', error.message);
    } finally {
      setWithdrawing(false);
    }
  };
  
  const handleRefresh = async () => {
    setLoading(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setLoading(false);
    }
  };
  
  const activeStreams = streams.filter(s => s.status === 'active');
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Creator Dashboard</h2>
          <p className="text-orbit-gray text-sm">Manage your earnings and subscribers</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={handleWithdrawAll}
            disabled={withdrawing || stats.pendingEarnings <= 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {withdrawing ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Withdrawing...
              </>
            ) : (
              <>
                <Download size={18} />
                Withdraw All ({stats.pendingEarnings.toFixed(2)} XLM)
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Active Subscribers"
          value={stats.activeSubscribers}
          subValue="Currently streaming"
          iconColor="text-purple-400"
          loading={loading}
        />
        <StatCard
          icon={Clock}
          label="Pending Earnings"
          value={`${stats.pendingEarnings.toFixed(2)} XLM`}
          subValue={xlmPrice ? `≈ $${convertToUSD(stats.pendingEarnings).toFixed(2)}` : undefined}
          iconColor="text-emerald-400"
          loading={loading}
        />
        <StatCard
          icon={DollarSign}
          label="Total Withdrawn"
          value={`${stats.totalEarned.toFixed(2)} XLM`}
          subValue="All time"
          iconColor="text-blue-400"
          loading={loading}
        />
        <StatCard
          icon={TrendingUp}
          label="Monthly Revenue"
          value={`${stats.monthlyRevenue.toFixed(2)} XLM`}
          subValue="Based on active subs"
          iconColor="text-orbit-gold"
          loading={loading}
        />
      </div>
      
      {/* Active Streams */}
      <div className="card-glass p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap size={20} className="text-purple-400" />
            Active Streams
          </h3>
          <span className="text-sm text-orbit-gray">
            {activeStreams.length} subscriber{activeStreams.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {activeStreams.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
              <Users size={32} className="text-orbit-gray" />
            </div>
            <p className="text-orbit-gray mb-2">No active subscribers yet</p>
            <p className="text-sm text-gray-500">Share your profile to get your first subscriber!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeStreams.map((stream) => (
              <StreamRow 
                key={stream.id} 
                stream={stream} 
                onTerminate={onTerminateStream}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Quick Info */}
      <div className="card-glass p-5 bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-purple-500/20">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <AlertCircle size={20} className="text-purple-400" />
          </div>
          <div>
            <h4 className="font-medium text-white mb-1">How Orbit Works</h4>
            <p className="text-sm text-orbit-gray">
              Orbit handles payments for your content on YouTube, Discord, Telegram, podcasts & more. 
              Subscribers deposit XLM which streams to you in real-time. 
              Withdraw anytime — 2% platform fee is deducted automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
