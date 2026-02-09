import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as StellarSdk from 'stellar-sdk';
import { Zap, Loader, CreditCard, Settings, LayoutDashboard, User, Shield, Activity, Cog } from 'lucide-react';
import FreighterConnect from './components/FreighterConnect';
import BalanceDisplay from './components/BalanceDisplay';
import SubscriptionForm from './components/SubscriptionForm';
import TransactionFeed from './components/TransactionFeed';
import XLMFaucet from './components/XLMFaucet';
import ServiceProviderManager from './components/ServiceProviderManager';
import AdminDashboard from './components/AdminDashboard';
import AdminTransactions from './components/AdminTransactions';
import SettingsPanel from './components/SettingsPanel';
import { useToast } from './context/ToastContext';
import useWalletSession from './hooks/useWalletSession';
import { getPlatformWallet, isAdminWallet } from './config/platform';

function App() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState({ xlm: 0 });
  const [transactions, setTransactions] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [lastTxHash, setLastTxHash] = useState(null);
  const [activeTab, setActiveTab] = useState('payments'); // payments, providers, dashboard
  const [viewMode, setViewMode] = useState('user'); // 'user' or 'admin' - only for admin wallets
  
  // Platform wallet from config (no user setup needed)
  const platformWallet = getPlatformWallet();

  // Toast notifications
  const toast = useToast();

  // Use ref to track if session was restored (doesn't cause re-renders)
  const sessionRestoredRef = useRef(false);

  // Session persistence - auto-reconnect wallet on page load
  const {
    isRestoring,
    restoredWallet,
    saveWalletSession,
    clearWalletSession,
  } = useWalletSession();

  // Restore wallet sessions on mount (only once, using ref)
  useEffect(() => {
    if (!isRestoring && !sessionRestoredRef.current && restoredWallet) {
      sessionRestoredRef.current = true;
      console.log('🔄 Restoring session with balance:', restoredWallet.balance);
      setWallet(restoredWallet);
      setBalance({ xlm: restoredWallet.balance || 0 });
      toast.success('Wallet Restored', `Connected to ${restoredWallet.publicKey.slice(0, 8)}...`);
    }
  }, [isRestoring, restoredWallet, toast]);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedTransactions = localStorage.getItem('orbit-transactions');
    const savedSubscriptions = localStorage.getItem('orbit-subscriptions');
    
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }
    
    if (savedSubscriptions) {
      setSubscriptions(JSON.parse(savedSubscriptions));
    }
  }, []);

  // Save to localStorage whenever transactions or subscriptions change
  useEffect(() => {
    localStorage.setItem('orbit-transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('orbit-subscriptions', JSON.stringify(subscriptions));
  }, [subscriptions]);

  // ✅ FIXED: Memoized wallet connect handler
  const handleWalletConnect = useCallback((walletData) => {
    console.log('✅ Wallet connected:', walletData);
    setWallet(walletData);
    setBalance({ xlm: walletData.balance || 0 });
    saveWalletSession(walletData);
    toast.success('Wallet Connected', `Connected to ${walletData.publicKey.slice(0, 8)}...`);
  }, [saveWalletSession, toast]);

  // Memoized balance update handler
  const handleBalanceUpdate = useCallback((newBalance) => {
    console.log('💰 handleBalanceUpdate called with:', newBalance);
    setBalance(newBalance);
  }, []);

  // ✅ FIXED: Direct balance update with cache-busting
  const updateBalanceDirectly = useCallback(async () => {
    if (!wallet?.publicKey) return;
    
    try {
      // Use native fetch with cache-busting to avoid stale data
      const timestamp = Date.now();
      const url = `https://horizon-testnet.stellar.org/accounts/${wallet.publicKey}?_=${timestamp}`;
      
      console.log('🔍 Fetching fresh balance from Stellar (cache-busted)...');
      
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const account = await response.json();
      const xlmBalance = account.balances.find(b => b.asset_type === 'native');
      const balanceValue = xlmBalance ? parseFloat(xlmBalance.balance) : 0;

      console.log('🔗 Fresh balance from Stellar blockchain:', balanceValue, 'XLM');
      setBalance({ xlm: balanceValue });
      
    } catch (err) {
      console.error('❌ Direct balance update failed:', err);
    }
  }, [wallet?.publicKey]);

  // ✅ FIXED: Memoized XLM funded handler
  const handleXLMFunded = useCallback(() => {
    console.log('💵 XLM funded, refreshing balance...');
    // Increased delay for Stellar testnet finality (4 seconds recommended)
    setTimeout(() => {
      updateBalanceDirectly();
    }, 4000);
  }, [updateBalanceDirectly]);

  // ✅ FIXED: Memoized subscription handler
  const handleSubscribe = useCallback((subscription) => {
    setSubscriptions(prev => {
      const existingSub = prev.find(sub => 
        sub.service === subscription.service && sub.status === 'active'
      );
      
      if (!existingSub) {
        console.log('➕ Subscription added:', subscription);
        return [...prev, subscription];
      }
      
      return prev;
    });
  }, []);

  // ✅ FIXED: Memoized cancel subscription handler
  const handleCancelSubscription = useCallback((subId) => {
    setSubscriptions(prev => {
      const cancelledSub = prev.find(sub => sub.id === subId);
      
      if (cancelledSub) {
        const cancellationRecord = {
          id: Date.now(),
          type: 'cancellation',
          service: cancelledSub.service,
          amount: cancelledSub.amount,
          status: 'cancelled',
          startDate: cancelledSub.date,
          endDate: new Date().toLocaleDateString(),
          cancelledAt: new Date().toLocaleString(),
          timestamp: new Date().toLocaleString()
        };
        
        setTransactions(txPrev => [cancellationRecord, ...txPrev]);
        
        console.log('❌ Subscription cancelled:', cancelledSub.service);
        toast.warning('Subscription Cancelled', `${cancelledSub.service} has been cancelled`);
        
        return prev.filter(sub => sub.id !== subId);
      }
      
      return prev;
    });
  }, [toast]);

  // ✅ FIXED: Completely rewritten payment handler with proper state updates
  const handlePaymentProcessed = useCallback((transaction) => {
    console.log('🔄 Payment processed, updating UI...');
    
    // 1. Add transaction to list
    setTransactions(prev => [transaction, ...prev]);
    
    // 2. ✅ CRITICAL: Update transaction hash to trigger BalanceDisplay refresh
    if (transaction.hash) {
      console.log('📝 Setting transaction hash:', transaction.hash);
      setLastTxHash(transaction.hash);
    }
    
    // 3. Create subscription record if needed
    setSubscriptions(prev => {
      const existingSub = prev.find(sub => 
        sub.service === transaction.service && sub.status === 'active'
      );
      
      if (!existingSub) {
        const subscriptionRecord = {
          id: Date.now() + 1,
          service: transaction.service,
          amount: transaction.amount,
          status: 'active',
          date: new Date().toLocaleDateString(),
          nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          paymentTxHash: transaction.hash
        };
        
        return [...prev, subscriptionRecord];
      }
      
      return prev;
    });
    
    // 4. ✅ CRITICAL: Optimistic UI update using functional setState
    console.log('💰 Applying optimistic balance update...');
    setBalance(prevBalance => ({
      xlm: Math.max(0, prevBalance.xlm - transaction.amount)
    }));
    
    // 5. Show success toast
    toast.success('Payment Successful', `${transaction.amount} XLM sent for ${transaction.service}`);
    
    // 6. ✅ Refresh balance from blockchain after confirmation (8 seconds to be safe)
    console.log('⏳ Scheduling balance refresh in 8 seconds...');
    setTimeout(() => {
      console.log('🔄 Fetching confirmed balance from blockchain...');
      updateBalanceDirectly();
    }, 8000);
    
  }, [toast, updateBalanceDirectly]);

  // Calculate stats
  const activeSubscriptionsCount = subscriptions.length;
  const monthlyCost = subscriptions.reduce((total, sub) => total + sub.amount, 0);
  const totalTransactions = transactions.length;

  // Show loading state while restoring session
  if (isRestoring) {
    return (
      <div className="min-h-screen bg-orbit-dark flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-orbit-gold/30 blur-xl rounded-full animate-pulse" />
            <div className="relative w-full h-full flex items-center justify-center">
              <Loader size={40} className="text-orbit-gold animate-spin" />
            </div>
          </div>
          <p className="text-orbit-gray font-display tracking-wider">Restoring session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-gray-200 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-orbit-gold/[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-orbit-gold/[0.03] rounded-full blur-[100px]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid opacity-30" />
      </div>
      
      <header className="relative z-50 py-5 border-b border-white/[0.06] bg-[#0A0A0C]/80 backdrop-blur-2xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-orbit-gold/40 blur-2xl rounded-full group-hover:bg-orbit-gold/50 transition-all duration-500" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-orbit-gold/20 to-orbit-gold/5 border border-orbit-gold/30 flex items-center justify-center fire-glow">
                  <Zap size={32} className="text-orbit-gold drop-shadow-[0_0_15px_rgba(247,147,26,0.8)]" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-display font-black tracking-[0.15em] text-gradient-gold">
                  ORBIT
                </h1>
                <p className="text-muted-heading mt-0.5 hidden sm:block">
                  Stellar Subscription Payments
                </p>
              </div>
            </div>
            
            {/* Navigation with View Toggle for Admins */}
            {wallet && (
              <div className="flex items-center gap-3">
                {/* View Mode Toggle - Only for admins */}
                {isAdminWallet(wallet.publicKey) && (
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <button
                      onClick={() => {
                        setViewMode('user');
                        setActiveTab('payments');
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        viewMode === 'user'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <User size={16} />
                      <span className="hidden sm:inline">User</span>
                    </button>
                    <button
                      onClick={() => {
                        setViewMode('admin');
                        setActiveTab('transactions');
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        viewMode === 'admin'
                          ? 'bg-orbit-gold/20 text-orbit-gold border border-orbit-gold/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Shield size={16} />
                      <span className="hidden sm:inline">Admin</span>
                    </button>
                  </div>
                )}
                
                {/* Contextual Tabs based on View Mode */}
                <nav className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  {viewMode === 'user' || !isAdminWallet(wallet.publicKey) ? (
                    /* User Mode Tabs */
                    <button
                      onClick={() => setActiveTab('payments')}
                      className={`tab-btn ${activeTab === 'payments' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                    >
                      <CreditCard size={18} />
                      <span className="hidden sm:inline">Payments</span>
                    </button>
                  ) : (
                    /* Admin Mode Tabs */
                    <>
                      <button
                        onClick={() => setActiveTab('transactions')}
                        className={`tab-btn ${activeTab === 'transactions' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                      >
                        <Activity size={18} />
                        <span className="hidden sm:inline">Transactions</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('providers')}
                        className={`tab-btn ${activeTab === 'providers' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                      >
                        <Settings size={18} />
                        <span className="hidden sm:inline">Providers</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`tab-btn ${activeTab === 'dashboard' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                      >
                        <LayoutDashboard size={18} />
                        <span className="hidden sm:inline">Dashboard</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('settings')}
                        className={`tab-btn ${activeTab === 'settings' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                      >
                        <Cog size={18} />
                        <span className="hidden sm:inline">Settings</span>
                      </button>
                    </>
                  )}
                </nav>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        {!wallet ? (
          /* Not logged in - show connect wallet */
          <div className="max-w-xl mx-auto text-center animate-fade-in">
            {/* Hero Text */}
            <div className="mb-10">
              <h2 className="text-4xl sm:text-5xl font-display font-black tracking-wide text-white mb-4">
                The Future of <span className="text-fire">Payments</span>
              </h2>
              <p className="text-orbit-gray text-lg max-w-md mx-auto">
                Pay for your subscriptions with Stellar. Fast, cheap, and borderless.
              </p>
            </div>
            <FreighterConnect onConnect={handleWalletConnect} />
          </div>
        ) : viewMode === 'admin' && activeTab === 'transactions' && isAdminWallet(wallet?.publicKey) ? (
          /* Admin Transactions Tab */
          <div className="animate-fade-in">
            <AdminTransactions />
          </div>
        ) : viewMode === 'admin' && activeTab === 'providers' && isAdminWallet(wallet?.publicKey) ? (
          /* Service Providers Management Tab - Admin Only */
          <div className="animate-fade-in">
            <ServiceProviderManager />
          </div>
        ) : viewMode === 'admin' && activeTab === 'dashboard' && isAdminWallet(wallet?.publicKey) ? (
          /* Admin Dashboard Tab - Admin Only */
          <div className="animate-fade-in">
            <AdminDashboard />
          </div>
        ) : viewMode === 'admin' && activeTab === 'settings' && isAdminWallet(wallet?.publicKey) ? (
          /* Admin Settings Tab */
          <div className="animate-fade-in">
            <SettingsPanel />
          </div>
        ) : (
          /* Payments Tab (default) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Main Content */}
            <div className="lg:col-span-8 space-y-8">
                <BalanceDisplay 
                  balance={balance} 
                  wallet={wallet}
                  onBalanceUpdate={handleBalanceUpdate}
                  onManualRefresh={updateBalanceDirectly}
                  lastTxHash={lastTxHash}
                />
                
                <XLMFaucet
                  wallet={wallet}
                  currentBalance={balance.xlm}
                  onFunded={handleXLMFunded}
                />
                
                <SubscriptionForm 
                  wallet={wallet}
                  platformWallet={platformWallet}
                  onSubscribe={handleSubscribe}
                  onPayment={handlePaymentProcessed}
                />
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-8">
                {/* Quick Stats Card */}
                <div className="card-hero p-6 border-gradient">
                  <h4 className="text-muted-heading mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full bg-orbit-gold" />
                    Quick Stats
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="stat-card text-center">
                      <p className="text-3xl font-display font-black text-orbit-gold">{activeSubscriptionsCount}</p>
                      <p className="text-muted-heading mt-2">Active</p>
                    </div>
                    <div className="stat-card text-center">
                      <p className="text-3xl font-display font-black text-emerald-400">{monthlyCost}</p>
                      <p className="text-muted-heading mt-2">XLM/mo</p>
                    </div>
                    <div className="stat-card text-center">
                      <p className="text-3xl font-display font-black text-blue-400">{totalTransactions}</p>
                      <p className="text-muted-heading mt-2">Total TX</p>
                    </div>
                  </div>
                </div>

                <TransactionFeed 
                  transactions={transactions} 
                  subscriptions={subscriptions} 
                  onCancelSubscription={handleCancelSubscription}
                />
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 py-10 mt-20 border-t border-white/[0.06] bg-[#0A0A0C]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-3">
                <Zap size={24} className="text-orbit-gold" />
                <span className="font-display font-black text-xl tracking-wider text-white">ORBIT</span>
              </div>
              <p className="text-orbit-gray text-sm">
                Built with <span className="text-orbit-gold">⚡</span> on Stellar Testnet
              </p>
              <p className="text-orbit-gray-dark text-xs mt-1">
                Real wallets • Real balances • XLM Payments
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {wallet && (
                <div className="px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <p className="text-orbit-gold font-mono text-sm font-bold">
                    {wallet.publicKey.slice(0, 8)}...{wallet.publicKey.slice(-8)}
                  </p>
                  <p className="text-muted-heading mt-1">Connected Wallet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;