import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, CreditCard, DollarSign, Activity, Calendar, Building2, 
  ArrowUpRight, Settings, Shield, UserX, UserCheck, Wallet, Download,
  RefreshCw, Search, ChevronLeft, ChevronRight, AlertTriangle, Check, X,
  Eye, Edit2, Trash2, Plus
} from 'lucide-react';
import { usePriceConverter } from '../hooks/usePriceConverter';
import { adminApi } from '../services/api';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState({ users: [], pagination: {} });
  const [creators, setCreators] = useState({ creators: [], pagination: {} });
  const [transactions, setTransactions] = useState({ transactions: [], pagination: {} });
  const [settings, setSettings] = useState({});
  const [adminWallets, setAdminWallets] = useState([]);
  const [earnings, setEarnings] = useState({ summary: {}, recent: [] });
  
  // Filter states
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const [txType, setTxType] = useState('all');
  const [txStatus, setTxStatus] = useState('all');
  const [txPage, setTxPage] = useState(1);
  
  // Modal states
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminWallet, setNewAdminWallet] = useState('');
  const [newAdminLabel, setNewAdminLabel] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDest, setWithdrawDest] = useState('');
  
  const { convertToUSD, xlmPrice } = usePriceConverter();

  // Load data based on active tab
  useEffect(() => {
    loadData();
  }, [activeTab, userPage, userSearch, userRole, txPage, txType, txStatus]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'overview') {
        const [statsData, earningsData] = await Promise.all([
          adminApi.getStats(),
          adminApi.getEarnings()
        ]);
        setStats(statsData);
        setEarnings(earningsData);
      } else if (activeTab === 'users') {
        const data = await adminApi.getUsers(userPage, 20, userSearch, userRole);
        setUsers(data);
      } else if (activeTab === 'creators') {
        const data = await adminApi.getCreators(1, 50, '');
        setCreators(data);
      } else if (activeTab === 'transactions') {
        const data = await adminApi.getTransactions(txPage, 20, txType, txStatus);
        setTransactions(data);
      } else if (activeTab === 'settings') {
        const [settingsData, walletsData] = await Promise.all([
          adminApi.getSettings(),
          adminApi.getAdminWallets()
        ]);
        setSettings(settingsData);
        setAdminWallets(walletsData.wallets || []);
      }
    } catch (err) {
      console.error('Admin load error:', err);
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  // User actions
  const handleBanUser = async (userId, isBanned) => {
    try {
      await adminApi.updateUser(userId, { isBanned: !isBanned });
      loadData();
    } catch (err) {
      alert('Failed to update user: ' + err.message);
    }
  };

  // Settings actions
  const handleSaveSettings = async () => {
    try {
      await adminApi.updateSettings(settings);
      alert('Settings saved successfully');
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  // Admin wallet actions
  const handleAddAdminWallet = async () => {
    if (!newAdminWallet || newAdminWallet.length !== 56) {
      alert('Please enter a valid Stellar wallet address (56 characters)');
      return;
    }
    try {
      await adminApi.addAdminWallet(newAdminWallet, newAdminLabel);
      setShowAddAdmin(false);
      setNewAdminWallet('');
      setNewAdminLabel('');
      loadData();
    } catch (err) {
      alert('Failed to add admin: ' + err.message);
    }
  };

  const handleRemoveAdminWallet = async (id) => {
    if (!confirm('Are you sure you want to remove this admin?')) return;
    try {
      await adminApi.removeAdminWallet(id);
      loadData();
    } catch (err) {
      alert('Failed to remove admin: ' + err.message);
    }
  };

  // Withdrawal action
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!withdrawDest || withdrawDest.length !== 56) {
      alert('Please enter a valid destination wallet address');
      return;
    }
    try {
      await adminApi.requestWithdrawal(amount, withdrawDest);
      setShowWithdraw(false);
      setWithdrawAmount('');
      setWithdrawDest('');
      loadData();
      alert('Withdrawal request created');
    } catch (err) {
      alert('Failed to request withdrawal: ' + err.message);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateWallet = (addr) => {
    if (!addr) return 'N/A';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Tab navigation
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'creators', label: 'Creators', icon: Building2 },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-wider flex items-center gap-2">
            <Shield className="text-orbit-gold" size={24} />
            Admin Dashboard
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Platform management and analytics
          </p>
        </div>
        
        <button 
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1F] text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-orbit-gold text-black'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-red-400" size={20} />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && !stats && (
        <div className="text-center py-12">
          <RefreshCw size={32} className="animate-spin text-orbit-gold mx-auto mb-4" />
          <p className="text-gray-400">Loading admin data...</p>
        </div>
      )}

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Total Users"
              value={stats.users?.total || 0}
              subLabel={`${stats.users?.new_this_week || 0} this week`}
              color="blue"
            />
            <StatCard
              icon={Building2}
              label="Active Creators"
              value={stats.creators?.active || 0}
              subLabel={`${stats.creators?.verified || 0} verified`}
              color="purple"
            />
            <StatCard
              icon={Activity}
              label="Total Volume"
              value={`${parseFloat(stats.transactions?.total_volume || 0).toFixed(2)} XLM`}
              subLabel={`$${convertToUSD ? convertToUSD(parseFloat(stats.transactions?.total_volume || 0)) : '---'}`}
              color="yellow"
            />
            <StatCard
              icon={DollarSign}
              label="Platform Fees"
              value={`${parseFloat(stats.transactions?.total_fees || 0).toFixed(4)} XLM`}
              subLabel={`$${convertToUSD ? convertToUSD(parseFloat(stats.transactions?.total_fees || 0)) : '---'}`}
              color="emerald"
            />
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

          {/* Platform Earnings */}
          <div className="bg-[#14141A] border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <Wallet size={20} className="text-emerald-400" />
                Platform Earnings
              </h3>
              <button
                onClick={() => setShowWithdraw(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm"
              >
                <Download size={14} />
                Withdraw
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-[#0D0D0F] text-center">
                <p className="text-gray-400 text-sm mb-1">Total Earned</p>
                <p className="text-white font-display font-bold text-xl">
                  {parseFloat(earnings.summary?.total_earned || 0).toFixed(4)} XLM
                </p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-emerald-400 text-sm mb-1">Available</p>
                <p className="text-emerald-400 font-display font-bold text-xl">
                  {parseFloat(earnings.summary?.available || 0).toFixed(4)} XLM
                </p>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-blue-400 text-sm mb-1">Withdrawn</p>
                <p className="text-blue-400 font-display font-bold text-xl">
                  {parseFloat(earnings.summary?.withdrawn || 0).toFixed(4)} XLM
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#14141A] border border-white/10 rounded-xl p-5">
              <h3 className="text-lg font-display font-bold text-white mb-4">Subscription Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 rounded-lg bg-[#0D0D0F]">
                  <span className="text-gray-400">Active Subscriptions</span>
                  <span className="text-white font-medium">{stats.subscriptions?.active || 0}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-[#0D0D0F]">
                  <span className="text-gray-400">Cancelled</span>
                  <span className="text-red-400 font-medium">{stats.subscriptions?.cancelled || 0}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-[#0D0D0F]">
                  <span className="text-gray-400">MRR (XLM)</span>
                  <span className="text-emerald-400 font-medium">
                    {parseFloat(stats.subscriptions?.mrr_xlm || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#14141A] border border-white/10 rounded-xl p-5">
              <h3 className="text-lg font-display font-bold text-white mb-4">Recent Activity</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats.recentActivity?.map((event, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#0D0D0F] text-sm">
                    <div className="flex items-center gap-2">
                      {event.event_type === 'new_user' ? (
                        <Users size={14} className="text-blue-400" />
                      ) : (
                        <CreditCard size={14} className="text-emerald-400" />
                      )}
                      <span className="text-white">{event.title}</span>
                    </div>
                    <span className="text-gray-500 text-xs">{formatDate(event.created_at)}</span>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== USERS TAB ===== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#1A1A1F] border border-white/10 text-white placeholder-gray-500 focus:border-orbit-gold/50 outline-none"
              />
            </div>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="px-4 py-2 rounded-lg bg-[#1A1A1F] border border-white/10 text-white outline-none"
            >
              <option value="all">All Roles</option>
              <option value="subscriber">Subscribers</option>
              <option value="creator">Creators</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="bg-[#14141A] border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0D0D0F]">
                  <tr>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">User</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Wallet</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Role</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Status</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Joined</th>
                    <th className="text-right p-4 text-gray-400 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.users?.map((user) => (
                    <tr key={user.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orbit-gold/30 to-purple-500/30 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {(user.display_name || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.display_name || 'Anonymous'}</p>
                            <p className="text-gray-500 text-xs">{user.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <code className="text-gray-400 text-sm">{truncateWallet(user.wallet_address)}</code>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                          user.role === 'creator' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4">
                        {user.is_banned ? (
                          <span className="flex items-center gap-1 text-red-400 text-sm">
                            <UserX size={14} /> Banned
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-400 text-sm">
                            <UserCheck size={14} /> Active
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-400 text-sm">{formatDate(user.created_at)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleBanUser(user.id, user.is_banned)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            user.is_banned 
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          }`}
                        >
                          {user.is_banned ? 'Unban' : 'Ban'}
                        </button>
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {users.pagination?.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-white/5">
                <span className="text-gray-400 text-sm">
                  Page {users.pagination.page} of {users.pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    disabled={userPage === 1}
                    className="p-2 rounded-lg bg-[#1A1A1F] text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setUserPage(p => Math.min(users.pagination.totalPages, p + 1))}
                    disabled={userPage === users.pagination.totalPages}
                    className="p-2 rounded-lg bg-[#1A1A1F] text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== CREATORS TAB ===== */}
      {activeTab === 'creators' && (
        <div className="bg-[#14141A] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0D0D0F]">
                <tr>
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">Creator</th>
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">Category</th>
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">Subscribers</th>
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">Earnings</th>
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">Status</th>
                  <th className="text-right p-4 text-gray-400 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {creators.creators?.map((creator) => (
                  <tr key={creator.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                          {creator.avatar_url ? (
                            <img src={creator.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-white font-medium">
                              {(creator.display_name || 'C')[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">{creator.display_name || 'Anonymous'}</p>
                          <code className="text-gray-500 text-xs">{truncateWallet(creator.wallet_address)}</code>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded bg-[#1A1A1F] text-gray-400 text-xs">
                        {creator.category || 'general'}
                      </span>
                    </td>
                    <td className="p-4 text-white">{creator.subscriber_count || 0}</td>
                    <td className="p-4 text-emerald-400">
                      {parseFloat(creator.total_earnings || 0).toFixed(2)} XLM
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {creator.is_verified && (
                          <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">Verified</span>
                        )}
                        {creator.is_featured && (
                          <span className="px-2 py-1 rounded bg-orbit-gold/20 text-orbit-gold text-xs">Featured</span>
                        )}
                        {!creator.is_active && (
                          <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs">Inactive</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1 rounded bg-purple-500/20 text-purple-400 text-xs hover:bg-purple-500/30 transition-colors">
                        Edit
                      </button>
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">No creators found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== TRANSACTIONS TAB ===== */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="px-4 py-2 rounded-lg bg-[#1A1A1F] border border-white/10 text-white outline-none"
            >
              <option value="all">All Types</option>
              <option value="subscription">Subscription</option>
              <option value="renewal">Renewal</option>
              <option value="tip">Tip</option>
              <option value="payout">Payout</option>
            </select>
            <select
              value={txStatus}
              onChange={(e) => setTxStatus(e.target.value)}
              className="px-4 py-2 rounded-lg bg-[#1A1A1F] border border-white/10 text-white outline-none"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="bg-[#14141A] border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0D0D0F]">
                  <tr>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Type</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Amount</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Fee</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Status</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">TX Hash</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.transactions?.map((tx) => (
                    <tr key={tx.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          tx.type === 'subscription' ? 'bg-blue-500/20 text-blue-400' :
                          tx.type === 'renewal' ? 'bg-purple-500/20 text-purple-400' :
                          tx.type === 'tip' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-4 text-white font-medium">{parseFloat(tx.amount_xlm).toFixed(4)} XLM</td>
                      <td className="p-4 text-orbit-gold">{parseFloat(tx.platform_fee_xlm || 0).toFixed(4)} XLM</td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1 text-xs ${
                          tx.status === 'completed' ? 'text-emerald-400' :
                          tx.status === 'pending' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {tx.status === 'completed' ? <Check size={12} /> : tx.status === 'pending' ? <RefreshCw size={12} /> : <X size={12} />}
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {tx.tx_hash ? (
                          <a 
                            href={`https://stellar.expert/explorer/testnet/tx/${tx.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline text-sm"
                          >
                            {tx.tx_hash.slice(0, 8)}...
                          </a>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-400 text-sm">{formatDate(tx.created_at)}</td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">No transactions found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {transactions.pagination?.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-white/5">
                <span className="text-gray-400 text-sm">
                  Page {transactions.pagination.page} of {transactions.pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTxPage(p => Math.max(1, p - 1))}
                    disabled={txPage === 1}
                    className="p-2 rounded-lg bg-[#1A1A1F] text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setTxPage(p => Math.min(transactions.pagination.totalPages, p + 1))}
                    disabled={txPage === transactions.pagination.totalPages}
                    className="p-2 rounded-lg bg-[#1A1A1F] text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SETTINGS TAB ===== */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Platform Settings */}
          <div className="bg-[#14141A] border border-white/10 rounded-xl p-5">
            <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
              <Settings size={20} className="text-orbit-gold" />
              Platform Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Platform Fee (%)</label>
                <input
                  type="number"
                  value={settings.platform_fee_percent || ''}
                  onChange={(e) => setSettings({ ...settings, platform_fee_percent: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white outline-none focus:border-orbit-gold/50"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Platform Wallet</label>
                <input
                  type="text"
                  value={settings.platform_wallet || ''}
                  onChange={(e) => setSettings({ ...settings, platform_wallet: e.target.value })}
                  placeholder="G..."
                  className="w-full px-4 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white outline-none focus:border-orbit-gold/50"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Min Subscription (XLM)</label>
                <input
                  type="number"
                  value={settings.min_subscription_xlm || ''}
                  onChange={(e) => setSettings({ ...settings, min_subscription_xlm: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white outline-none focus:border-orbit-gold/50"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Max Subscription (XLM)</label>
                <input
                  type="number"
                  value={settings.max_subscription_xlm || ''}
                  onChange={(e) => setSettings({ ...settings, max_subscription_xlm: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white outline-none focus:border-orbit-gold/50"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Stellar Network</label>
                <select
                  value={settings.stellar_network || 'testnet'}
                  onChange={(e) => setSettings({ ...settings, stellar_network: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white outline-none"
                >
                  <option value="testnet">Testnet</option>
                  <option value="mainnet">Mainnet</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.maintenance_mode || false}
                  onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                  className="w-5 h-5 rounded bg-[#0D0D0F] border border-white/10 accent-orbit-gold"
                />
                <label className="text-gray-400">Maintenance Mode</label>
              </div>
            </div>
            <button
              onClick={handleSaveSettings}
              className="mt-4 px-6 py-2 rounded-lg bg-orbit-gold text-black font-medium hover:bg-orbit-gold/90 transition-colors"
            >
              Save Settings
            </button>
          </div>

          {/* Admin Wallets */}
          <div className="bg-[#14141A] border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <Shield size={20} className="text-red-400" />
                Admin Wallets
              </h3>
              <button
                onClick={() => setShowAddAdmin(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm"
              >
                <Plus size={14} />
                Add Admin
              </button>
            </div>
            <div className="space-y-2">
              {adminWallets.length > 0 ? adminWallets.map((wallet) => (
                <div key={wallet.id} className="flex items-center justify-between p-3 rounded-lg bg-[#0D0D0F]">
                  <div>
                    <p className="text-white font-medium">{wallet.label || 'Unnamed Admin'}</p>
                    <code className="text-gray-500 text-xs">{wallet.wallet_address}</code>
                  </div>
                  <button
                    onClick={() => handleRemoveAdminWallet(wallet.id)}
                    className="p-2 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <Shield size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No admin wallets configured</p>
                  <p className="text-xs mt-1">Add your wallet to enable admin access</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODALS ===== */}
      
      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#14141A] border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-display font-bold text-white mb-4">Add Admin Wallet</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Wallet Address *</label>
                <input
                  type="text"
                  value={newAdminWallet}
                  onChange={(e) => setNewAdminWallet(e.target.value)}
                  placeholder="G..."
                  className="w-full px-4 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white outline-none focus:border-orbit-gold/50"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Label (optional)</label>
                <input
                  type="text"
                  value={newAdminLabel}
                  onChange={(e) => setNewAdminLabel(e.target.value)}
                  placeholder="e.g. My Wallet"
                  className="w-full px-4 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white outline-none focus:border-orbit-gold/50"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddAdmin(false)}
                className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAdminWallet}
                className="flex-1 py-2 rounded-lg bg-orbit-gold text-black font-medium hover:bg-orbit-gold/90 transition-colors"
              >
                Add Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#14141A] border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-display font-bold text-white mb-4">Withdraw Platform Earnings</h3>
            <p className="text-gray-400 text-sm mb-4">
              Available: <span className="text-emerald-400 font-medium">{parseFloat(earnings.summary?.available || 0).toFixed(4)} XLM</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Amount (XLM)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white outline-none focus:border-orbit-gold/50"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Destination Wallet</label>
                <input
                  type="text"
                  value={withdrawDest}
                  onChange={(e) => setWithdrawDest(e.target.value)}
                  placeholder="G..."
                  className="w-full px-4 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white outline-none focus:border-orbit-gold/50"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowWithdraw(false)}
                className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                className="flex-1 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-400 transition-colors"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, subLabel, color }) {
  const colors = {
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    yellow: { bg: 'bg-orbit-gold/20', text: 'text-orbit-gold' },
  };
  
  const c = colors[color] || colors.blue;
  
  return (
    <div className="bg-[#14141A] border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon size={20} className={c.text} />
        </div>
      </div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-display font-bold text-white mt-1">{value}</p>
      <p className={`${c.text} text-sm mt-1`}>{subLabel}</p>
    </div>
  );
}

export default AdminDashboard;
