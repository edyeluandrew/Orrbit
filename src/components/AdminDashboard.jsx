import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, CreditCard, DollarSign, Activity, Calendar, Building2, ArrowUpRight } from 'lucide-react';
import { usePriceConverter } from '../hooks/usePriceConverter';

const PLATFORM_FEE_PERCENT = 2;

// Color classes mapping
const colorClasses = {
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400' },
  red: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

function AdminDashboard() {
  const [payments, setPayments] = useState([]);
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalVolume: 0,
    platformEarnings: 0,
    activeSubscriptions: 0,
  });
  const [timeFilter, setTimeFilter] = useState('all');
  
  const { convertToUSD, xlmPrice } = usePriceConverter();

  // Load data from localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        // Load payment history
        const savedPayments = localStorage.getItem('orbit-payment-history');
        const paymentsList = savedPayments ? JSON.parse(savedPayments) : [];
        setPayments(paymentsList);

        // Load services
        const savedServices = localStorage.getItem('orbit-service-providers');
        const servicesList = savedServices ? JSON.parse(savedServices) : [];
        setServices(servicesList);

        // Load subscriptions
        const savedSubs = localStorage.getItem('orbit-subscriptions');
        const subscriptionsList = savedSubs ? JSON.parse(savedSubs) : [];

        // Calculate stats
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

        let filteredPayments = paymentsList;
        if (timeFilter === 'week') {
          filteredPayments = paymentsList.filter(p => new Date(p.timestamp).getTime() > weekAgo);
        } else if (timeFilter === 'month') {
          filteredPayments = paymentsList.filter(p => new Date(p.timestamp).getTime() > monthAgo);
        }

        const totalVolume = filteredPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const platformEarnings = totalVolume * PLATFORM_FEE_PERCENT / 100;

        setStats({
          totalPayments: filteredPayments.length,
          totalVolume,
          platformEarnings,
          activeSubscriptions: subscriptionsList.filter(s => s.status === 'active').length,
        });
      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      }
    };

    loadData();
    
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [timeFilter]);

  // Group payments by service
  const paymentsByService = services.map(service => {
    const servicePayments = payments.filter(p => p.serviceName === service.name || p.service === service.name);
    const volume = servicePayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    return {
      ...service,
      paymentCount: servicePayments.length,
      volume,
      platformFee: volume * PLATFORM_FEE_PERCENT / 100,
      providerPayout: volume * (100 - PLATFORM_FEE_PERCENT) / 100,
    };
  }).sort((a, b) => b.volume - a.volume);

  // Recent payments
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
    .slice(0, 10);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getColor = (color) => colorClasses[color] || colorClasses.blue;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-wider">
            Admin Dashboard
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Platform analytics and payment tracking
          </p>
        </div>
        
        {/* Time Filter */}
        <div className="flex gap-2">
          {['all', 'month', 'week'].map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                timeFilter === filter
                  ? 'bg-orbit-gold text-black'
                  : 'bg-[#1A1A1F] text-gray-400 hover:text-white'
              }`}
            >
              {filter === 'all' ? 'All Time' : filter === 'month' ? '30 Days' : '7 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <DollarSign size={20} className="text-emerald-400" />
            </div>
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <ArrowUpRight size={12} />
              {PLATFORM_FEE_PERCENT}% fee
            </span>
          </div>
          <p className="text-gray-400 text-sm">Platform Earnings</p>
          <p className="text-2xl font-display font-bold text-white mt-1">
            {stats.platformEarnings.toFixed(4)} XLM
          </p>
          <p className="text-emerald-400 text-sm mt-1">
            ${convertToUSD ? convertToUSD(stats.platformEarnings) : '---'} USD
          </p>
        </div>

        <div className="bg-[#14141A] border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-orbit-gold/20 flex items-center justify-center">
              <Activity size={20} className="text-orbit-gold" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">Total Volume</p>
          <p className="text-2xl font-display font-bold text-white mt-1">
            {stats.totalVolume.toFixed(2)} XLM
          </p>
          <p className="text-orbit-gold text-sm mt-1">
            ${convertToUSD ? convertToUSD(stats.totalVolume) : '---'} USD
          </p>
        </div>

        <div className="bg-[#14141A] border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <CreditCard size={20} className="text-blue-400" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">Total Payments</p>
          <p className="text-2xl font-display font-bold text-white mt-1">
            {stats.totalPayments}
          </p>
          <p className="text-blue-400 text-sm mt-1">
            transactions processed
          </p>
        </div>

        <div className="bg-[#14141A] border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Users size={20} className="text-purple-400" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">Active Subscriptions</p>
          <p className="text-2xl font-display font-bold text-white mt-1">
            {stats.activeSubscriptions}
          </p>
          <p className="text-purple-400 text-sm mt-1">
            recurring payments
          </p>
        </div>
      </div>

      {/* XLM Price Banner */}
      <div className="bg-gradient-to-r from-orbit-gold/10 to-transparent border border-orbit-gold/20 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <TrendingUp size={24} className="text-orbit-gold" />
            <div>
              <p className="text-white font-medium">Live XLM Price</p>
              <p className="text-gray-400 text-sm">Stellar Lumens</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-display font-bold text-orbit-gold">
              ${xlmPrice ? xlmPrice.toFixed(4) : '---'}
            </p>
            <p className="text-gray-400 text-sm">USD per XLM</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Provider Stats */}
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-5">
          <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
            <Building2 size={20} className="text-orbit-gold" />
            Provider Performance
          </h3>
          <div className="space-y-3">
            {paymentsByService.length > 0 ? (
              paymentsByService.slice(0, 6).map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 rounded-lg bg-[#0D0D0F]">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded ${getColor(service.color).bg} flex items-center justify-center`}>
                      <Building2 size={14} className={getColor(service.color).text} />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{service.name}</p>
                      <p className="text-gray-500 text-xs">{service.paymentCount} payments</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium text-sm">{service.volume.toFixed(2)} XLM</p>
                    <p className="text-emerald-400 text-xs">
                      ${convertToUSD ? convertToUSD(service.volume) : '---'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Building2 size={32} className="mx-auto mb-2 opacity-50" />
                <p>No provider data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-5">
          <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
            <CreditCard size={20} className="text-orbit-gold" />
            Recent Payments
          </h3>
          <div className="space-y-2">
            {recentPayments.length > 0 ? (
              recentPayments.map((payment, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[#0D0D0F]">
                  <div>
                    <p className="text-white font-medium text-sm">{payment.serviceName || payment.service}</p>
                    <p className="text-gray-500 text-xs flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(payment.timestamp || payment.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium text-sm">{payment.amount} XLM</p>
                    <p className="text-orbit-gold text-xs">
                      ${convertToUSD ? convertToUSD(parseFloat(payment.amount)) : '---'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard size={32} className="mx-auto mb-2 opacity-50" />
                <p>No payments yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Split Explanation */}
      <div className="bg-[#14141A] border border-dashed border-orbit-gold/20 rounded-xl p-5">
        <h3 className="text-lg font-display font-bold text-white mb-3">
          💡 Payment Split Structure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-[#0D0D0F] text-center">
            <p className="text-gray-400 text-sm mb-1">User Pays</p>
            <p className="text-white font-display font-bold text-xl">100%</p>
            <p className="text-gray-500 text-xs mt-1">Full service amount</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
            <p className="text-emerald-400 text-sm mb-1">Platform Fee</p>
            <p className="text-emerald-400 font-display font-bold text-xl">{PLATFORM_FEE_PERCENT}%</p>
            <p className="text-gray-500 text-xs mt-1">Your earnings</p>
          </div>
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
            <p className="text-blue-400 text-sm mb-1">Provider Payout</p>
            <p className="text-blue-400 font-display font-bold text-xl">{100 - PLATFORM_FEE_PERCENT}%</p>
            <p className="text-gray-500 text-xs mt-1">Service receives</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
