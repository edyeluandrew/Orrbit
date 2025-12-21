import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, TrendingDown, TrendingUp, Wallet, 
  CreditCard, Calendar, ChevronDown, ChevronUp, Activity,
  UserMinus, UserCheck, Clock, DollarSign
} from 'lucide-react';
import { usePriceConverter } from '../hooks/usePriceConverter';

function UsersManager() {
  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('lastActive'); // lastActive, totalSpent, subscriptions
  const [expandedUser, setExpandedUser] = useState(null);
  
  const { convertToUSD } = usePriceConverter();

  // Load data
  useEffect(() => {
    const loadData = () => {
      try {
        const savedPayments = localStorage.getItem('orbit-payment-history');
        setPayments(savedPayments ? JSON.parse(savedPayments) : []);

        const savedSubs = localStorage.getItem('orbit-subscriptions');
        setSubscriptions(savedSubs ? JSON.parse(savedSubs) : []);
      } catch (e) {
        console.error('Failed to load user data:', e);
      }
    };

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Build user data from payments
  const users = useMemo(() => {
    const userMap = new Map();

    payments.forEach(payment => {
      const wallet = payment.fromWallet || payment.from;
      if (!wallet) return;

      if (!userMap.has(wallet)) {
        userMap.set(wallet, {
          wallet,
          payments: [],
          totalSpent: 0,
          firstPayment: null,
          lastPayment: null,
          services: new Set(),
        });
      }

      const user = userMap.get(wallet);
      user.payments.push(payment);
      user.totalSpent += parseFloat(payment.amount) || 0;
      user.services.add(payment.serviceName || payment.service);

      const paymentDate = new Date(payment.timestamp || payment.date);
      if (!user.firstPayment || paymentDate < user.firstPayment) {
        user.firstPayment = paymentDate;
      }
      if (!user.lastPayment || paymentDate > user.lastPayment) {
        user.lastPayment = paymentDate;
      }
    });

    // Convert to array and add computed fields
    return Array.from(userMap.values()).map(user => {
      const daysSinceLastPayment = user.lastPayment 
        ? Math.floor((Date.now() - user.lastPayment.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Check if user has active subscriptions
      const userSubs = subscriptions.filter(sub => 
        payments.some(p => 
          (p.fromWallet === user.wallet || p.from === user.wallet) && 
          (p.serviceName === sub.service || p.service === sub.service)
        )
      );
      
      const activeSubs = userSubs.filter(s => s.status === 'active');
      const churned = user.payments.length > 0 && activeSubs.length === 0 && daysSinceLastPayment > 30;

      return {
        ...user,
        services: Array.from(user.services),
        activeSubscriptions: activeSubs.length,
        totalSubscriptions: userSubs.length,
        daysSinceLastPayment,
        churned,
        paymentCount: user.payments.length,
      };
    });
  }, [payments, subscriptions]);

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.wallet.toLowerCase().includes(query) ||
        u.services.some(s => s.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sortBy) {
      case 'totalSpent':
        result.sort((a, b) => b.totalSpent - a.totalSpent);
        break;
      case 'subscriptions':
        result.sort((a, b) => b.activeSubscriptions - a.activeSubscriptions);
        break;
      case 'lastActive':
      default:
        result.sort((a, b) => (b.lastPayment?.getTime() || 0) - (a.lastPayment?.getTime() || 0));
    }

    return result;
  }, [users, searchQuery, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.activeSubscriptions > 0).length;
    const churnedUsers = users.filter(u => u.churned).length;
    const totalRevenue = users.reduce((sum, u) => sum + u.totalSpent, 0);
    const churnRate = totalUsers > 0 ? ((churnedUsers / totalUsers) * 100).toFixed(1) : 0;
    const avgSpend = totalUsers > 0 ? totalRevenue / totalUsers : 0;

    return { totalUsers, activeUsers, churnedUsers, totalRevenue, churnRate, avgSpend };
  }, [users]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRelativeDate = (date) => {
    if (!date) return 'Never';
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-bold text-white tracking-wider flex items-center gap-3">
          <Users className="text-orbit-gold" />
          User Management
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Track subscribers, payments, and churn analytics
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Users size={14} />
            Total Users
          </div>
          <p className="text-2xl font-display font-bold text-white">{stats.totalUsers}</p>
        </div>
        
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <UserCheck size={14} />
            Active
          </div>
          <p className="text-2xl font-display font-bold text-emerald-400">{stats.activeUsers}</p>
        </div>
        
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <UserMinus size={14} />
            Churned
          </div>
          <p className="text-2xl font-display font-bold text-red-400">{stats.churnedUsers}</p>
        </div>
        
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <TrendingDown size={14} />
            Churn Rate
          </div>
          <p className="text-2xl font-display font-bold text-orange-400">{stats.churnRate}%</p>
        </div>
        
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <DollarSign size={14} />
            Total Revenue
          </div>
          <p className="text-xl font-display font-bold text-white">{stats.totalRevenue.toFixed(2)} XLM</p>
        </div>
        
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <TrendingUp size={14} />
            Avg Spend
          </div>
          <p className="text-xl font-display font-bold text-orbit-gold">{stats.avgSpend.toFixed(2)} XLM</p>
        </div>
      </div>

      {/* Churn Alert */}
      {stats.churnedUsers > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3">
          <UserMinus className="text-orange-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-orange-400 font-medium">
              {stats.churnedUsers} Churned User{stats.churnedUsers > 1 ? 's' : ''}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Users who haven't made a payment in over 30 days and have no active subscriptions.
            </p>
          </div>
        </div>
      )}

      {/* Search & Sort */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by wallet or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#14141A] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orbit-gold/50"
          />
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-[#14141A] border border-white/10 text-white focus:outline-none focus:border-orbit-gold/50"
        >
          <option value="lastActive">Sort: Last Active</option>
          <option value="totalSpent">Sort: Total Spent</option>
          <option value="subscriptions">Sort: Subscriptions</option>
        </select>
      </div>

      {/* User List */}
      <div className="space-y-3">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div 
              key={user.wallet}
              className="bg-[#14141A] border border-white/10 rounded-xl overflow-hidden"
            >
              {/* User Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpandedUser(expandedUser === user.wallet ? null : user.wallet)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      user.churned ? 'bg-red-500/20' : 
                      user.activeSubscriptions > 0 ? 'bg-emerald-500/20' : 'bg-gray-500/20'
                    }`}>
                      <Wallet size={20} className={
                        user.churned ? 'text-red-400' : 
                        user.activeSubscriptions > 0 ? 'text-emerald-400' : 'text-gray-400'
                      } />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-mono text-sm truncate">
                          {user.wallet.slice(0, 12)}...{user.wallet.slice(-8)}
                        </p>
                        {user.churned && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                            Churned
                          </span>
                        )}
                        {user.activeSubscriptions > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-gray-500 text-sm">
                        <span className="flex items-center gap-1">
                          <CreditCard size={12} />
                          {user.paymentCount} payments
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatRelativeDate(user.lastPayment)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-white font-medium">{user.totalSpent.toFixed(2)} XLM</p>
                      <p className="text-orbit-gold text-sm">
                        ${convertToUSD ? convertToUSD(user.totalSpent) : '---'}
                      </p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-emerald-400 font-medium">{user.activeSubscriptions}</p>
                      <p className="text-gray-500 text-sm">active subs</p>
                    </div>
                    {expandedUser === user.wallet ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Expanded Details */}
              {expandedUser === user.wallet && (
                <div className="border-t border-white/10 p-4 bg-[#0D0D0F]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Services Used */}
                    <div>
                      <h4 className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                        <Activity size={14} />
                        Services Subscribed
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {user.services.map(service => (
                          <span 
                            key={service}
                            className="px-3 py-1 rounded-lg bg-orbit-gold/10 text-orbit-gold text-sm border border-orbit-gold/20"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Payment History */}
                    <div>
                      <h4 className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                        <Calendar size={14} />
                        Recent Payments
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {user.payments.slice(0, 5).map((payment, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">
                              {formatDate(new Date(payment.timestamp || payment.date))}
                            </span>
                            <span className="text-white">
                              {payment.serviceName || payment.service}
                            </span>
                            <span className="text-orbit-gold font-medium">
                              {payment.amount} XLM
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Lifetime Stats */}
                  <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-gray-500 text-xs">First Payment</p>
                      <p className="text-white text-sm">{formatDate(user.firstPayment)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Last Payment</p>
                      <p className="text-white text-sm">{formatDate(user.lastPayment)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Lifetime Value</p>
                      <p className="text-orbit-gold text-sm font-medium">{user.totalSpent.toFixed(2)} XLM</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-[#14141A] border border-white/10 rounded-xl p-12 text-center text-gray-500">
            <Users size={40} className="mx-auto mb-3 opacity-50" />
            <p>No users found</p>
            <p className="text-sm mt-1">Users will appear here as they make payments</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default UsersManager;
