import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Search, Filter, AlertTriangle, RefreshCw, 
  ArrowDownLeft, ArrowUpRight, Calendar, Wallet, Building2,
  XCircle, CheckCircle, Clock, Download, RotateCcw
} from 'lucide-react';
import { usePriceConverter } from '../hooks/usePriceConverter';

const PLATFORM_FEE_PERCENT = parseFloat(import.meta.env.VITE_PLATFORM_FEE_PERCENT) || 2;

function AdminTransactions() {
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, success, pending, failed
  const [filterService, setFilterService] = useState('all');
  const [dateRange, setDateRange] = useState('all'); // all, today, week, month
  const [showRefundModal, setShowRefundModal] = useState(null);
  const [services, setServices] = useState([]);
  
  const { convertToUSD, xlmPrice } = usePriceConverter();

  // Load payments from localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        const savedPayments = localStorage.getItem('orbit-payment-history');
        const paymentsList = savedPayments ? JSON.parse(savedPayments) : [];
        setPayments(paymentsList);

        const savedServices = localStorage.getItem('orbit-service-providers');
        const servicesList = savedServices ? JSON.parse(savedServices) : [];
        setServices(servicesList);
      } catch (e) {
        console.error('Failed to load transactions:', e);
      }
    };

    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Get unique services for filter
  const uniqueServices = useMemo(() => {
    const serviceNames = [...new Set(payments.map(p => p.serviceName || p.service).filter(Boolean))];
    return serviceNames;
  }, [payments]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    let result = [...payments];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        (p.serviceName || p.service || '').toLowerCase().includes(query) ||
        (p.fromWallet || p.from || '').toLowerCase().includes(query) ||
        (p.hash || '').toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(p => (p.status || 'success') === filterStatus);
    }
    
    // Service filter
    if (filterService !== 'all') {
      result = result.filter(p => (p.serviceName || p.service) === filterService);
    }
    
    // Date filter
    if (dateRange !== 'all') {
      const now = Date.now();
      const ranges = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - ranges[dateRange];
      result = result.filter(p => new Date(p.timestamp || p.date).getTime() > cutoff);
    }
    
    // Sort by date (newest first)
    return result.sort((a, b) => 
      new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)
    );
  }, [payments, searchQuery, filterStatus, filterService, dateRange]);

  // Stats
  const stats = useMemo(() => {
    const successful = payments.filter(p => (p.status || 'success') === 'success');
    const failed = payments.filter(p => p.status === 'failed');
    const pending = payments.filter(p => p.status === 'pending');
    const totalVolume = successful.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const platformFees = totalVolume * PLATFORM_FEE_PERCENT / 100;
    
    return {
      total: payments.length,
      successful: successful.length,
      failed: failed.length,
      pending: pending.length,
      totalVolume,
      platformFees,
    };
  }, [payments]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'failed': return <XCircle size={16} className="text-red-400" />;
      case 'pending': return <Clock size={16} className="text-yellow-400" />;
      default: return <CheckCircle size={16} className="text-emerald-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return styles[status] || styles.success;
  };

  const handleRefund = (payment) => {
    // Mark payment as refunded
    const updatedPayments = payments.map(p => 
      p.hash === payment.hash ? { ...p, status: 'refunded', refundedAt: new Date().toISOString() } : p
    );
    localStorage.setItem('orbit-payment-history', JSON.stringify(updatedPayments));
    setPayments(updatedPayments);
    setShowRefundModal(null);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Service', 'Amount (XLM)', 'USD Value', 'Status', 'From Wallet', 'TX Hash'];
    const rows = filteredPayments.map(p => [
      formatDate(p.timestamp || p.date),
      p.serviceName || p.service,
      p.amount,
      convertToUSD ? convertToUSD(parseFloat(p.amount)) : 'N/A',
      p.status || 'success',
      p.fromWallet || p.from || 'N/A',
      p.hash || 'N/A',
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbit-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-wider flex items-center gap-3">
            <Activity className="text-orbit-gold" />
            Live Transactions
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Real-time payment monitoring and management
          </p>
        </div>
        
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1F] text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <ArrowDownLeft size={14} />
            Total Received
          </div>
          <p className="text-xl font-display font-bold text-white">{stats.totalVolume.toFixed(2)} XLM</p>
          <p className="text-emerald-400 text-xs">${convertToUSD ? convertToUSD(stats.totalVolume) : '---'}</p>
        </div>
        
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <CheckCircle size={14} />
            Successful
          </div>
          <p className="text-xl font-display font-bold text-emerald-400">{stats.successful}</p>
          <p className="text-gray-500 text-xs">transactions</p>
        </div>
        
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Clock size={14} />
            Pending
          </div>
          <p className="text-xl font-display font-bold text-yellow-400">{stats.pending}</p>
          <p className="text-gray-500 text-xs">awaiting confirmation</p>
        </div>
        
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <XCircle size={14} />
            Failed
          </div>
          <p className="text-xl font-display font-bold text-red-400">{stats.failed}</p>
          <p className="text-gray-500 text-xs">need attention</p>
        </div>
      </div>

      {/* Failed Payments Alert */}
      {stats.failed > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-red-400 font-medium">
              {stats.failed} Failed Transaction{stats.failed > 1 ? 's' : ''}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Some payments failed and may need manual review or refund processing.
            </p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-[#14141A] border border-white/10 rounded-xl p-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by service, wallet, or tx hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#0D0D0F] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orbit-gold/50"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-[#0D0D0F] border border-white/10 text-white focus:outline-none focus:border-orbit-gold/50"
          >
            <option value="all">All Status</option>
            <option value="success">Successful</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          
          {/* Service Filter */}
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-[#0D0D0F] border border-white/10 text-white focus:outline-none focus:border-orbit-gold/50"
          >
            <option value="all">All Services</option>
            {uniqueServices.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
          
          {/* Date Filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-[#0D0D0F] border border-white/10 text-white focus:outline-none focus:border-orbit-gold/50"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-[#14141A] border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-medium">
            {filteredPayments.length} Transaction{filteredPayments.length !== 1 ? 's' : ''}
          </h3>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <RefreshCw size={14} className="animate-spin-slow" />
            Live updating
          </div>
        </div>
        
        {filteredPayments.length > 0 ? (
          <div className="divide-y divide-white/5">
            {filteredPayments.map((payment, idx) => (
              <div 
                key={payment.hash || idx} 
                className="p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Status Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      payment.status === 'failed' ? 'bg-red-500/20' :
                      payment.status === 'pending' ? 'bg-yellow-500/20' :
                      'bg-emerald-500/20'
                    }`}>
                      <ArrowDownLeft size={20} className={
                        payment.status === 'failed' ? 'text-red-400' :
                        payment.status === 'pending' ? 'text-yellow-400' :
                        'text-emerald-400'
                      } />
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium truncate">
                          {payment.serviceName || payment.service}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusBadge(payment.status || 'success')}`}>
                          {payment.status || 'success'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-gray-500 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(payment.timestamp || payment.date)}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <Wallet size={12} />
                          {(payment.fromWallet || payment.from || 'Unknown').slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Amount & Actions */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white font-medium">{payment.amount} XLM</p>
                      <p className="text-orbit-gold text-sm">
                        ${convertToUSD ? convertToUSD(parseFloat(payment.amount)) : '---'}
                      </p>
                    </div>
                    
                    {/* Refund Button */}
                    {(payment.status === 'success' || !payment.status) && payment.status !== 'refunded' && (
                      <button
                        onClick={() => setShowRefundModal(payment)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Process Refund"
                      >
                        <RotateCcw size={18} />
                      </button>
                    )}
                    
                    {payment.status === 'refunded' && (
                      <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-xs">
                        Refunded
                      </span>
                    )}
                  </div>
                </div>
                
                {/* TX Hash */}
                {payment.hash && (
                  <div className="mt-2 pl-14">
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${payment.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-orbit-gold font-mono"
                    >
                      TX: {payment.hash.slice(0, 16)}...{payment.hash.slice(-16)}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Activity size={40} className="mx-auto mb-3 opacity-50" />
            <p>No transactions found</p>
            <p className="text-sm mt-1">Transactions will appear here as users subscribe</p>
          </div>
        )}
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#14141A] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-display font-bold text-white mb-4">
              Process Refund
            </h3>
            <p className="text-gray-400 mb-4">
              Are you sure you want to refund this payment?
            </p>
            <div className="bg-[#0D0D0F] rounded-lg p-4 mb-6">
              <p className="text-white font-medium">{showRefundModal.serviceName || showRefundModal.service}</p>
              <p className="text-orbit-gold text-lg font-bold mt-1">{showRefundModal.amount} XLM</p>
              <p className="text-gray-500 text-sm mt-1">
                From: {(showRefundModal.fromWallet || showRefundModal.from || 'Unknown').slice(0, 16)}...
              </p>
            </div>
            <p className="text-yellow-400 text-sm mb-6 flex items-start gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              Note: This marks the payment as refunded in the system. You'll need to manually send the XLM back to the user's wallet.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRefundModal(null)}
                className="flex-1 py-2.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRefund(showRefundModal)}
                className="flex-1 py-2.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTransactions;
