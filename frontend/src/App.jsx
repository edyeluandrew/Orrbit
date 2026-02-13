import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as StellarSdk from 'stellar-sdk';
import { Zap, Loader, CreditCard, Settings, LayoutDashboard, User, Shield, Activity, Cog, UserCircle, ArrowLeft, Share2, LogOut, Home, Users, Menu, X, ChevronDown, Wallet, Sparkles } from 'lucide-react';
import WalletConnect from './components/WalletConnect';
import BalanceDisplay from './components/BalanceDisplay';
import SubscriptionForm from './components/SubscriptionForm';
import TransactionFeed from './components/TransactionFeed';
import XLMFaucet from './components/XLMFaucet';
import ServiceProviderManager from './components/ServiceProviderManager';
import AdminDashboard from './components/AdminDashboard';
import AdminTransactions from './components/AdminTransactions';
import SettingsPanel from './components/SettingsPanel';
import CreatorProfile from './components/CreatorProfile';
import SubscriberProfile from './components/SubscriberProfile';
import Onboarding from './components/Onboarding';
import { useToast } from './context/ToastContext';
import useWalletSession from './hooks/useWalletSession';
import useUserProfile from './hooks/useUserProfile';
import { getPlatformWallet, isAdminWallet } from './config/platform';

// Parse hash route for public profiles
const parseHashRoute = () => {
  const hash = window.location.hash;
  // Match /#/creator/GXXXXXX... format
  const creatorMatch = hash.match(/^#\/creator\/([A-Z0-9]{56})$/i);
  if (creatorMatch) {
    return { type: 'creator', publicKey: creatorMatch[1].toUpperCase() };
  }
  return null;
};

// Navigation Button Component
const NavButton = ({ active, onClick, icon, label, variant = 'default' }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      active
        ? variant === 'admin'
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          : 'bg-orbit-gold/20 text-orbit-gold border border-orbit-gold/30'
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// Mobile Navigation Button
const MobileNavButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
      active
        ? 'text-orbit-gold bg-orbit-gold/10'
        : 'text-gray-500'
    }`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

function App() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState({ xlm: 0 });
  const [transactions, setTransactions] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [lastTxHash, setLastTxHash] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); // home, creators, profile, admin-*
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [publicProfileView, setPublicProfileView] = useState(null); // For viewing other creators
  const [showOnboarding, setShowOnboarding] = useState(false); // Will be set after wallet connects
  
  // Platform wallet from config (no user setup needed)
  const platformWallet = getPlatformWallet();
  
  // User profile management - loads automatically when wallet connects
  const {
    profile: userProfile,
    hasProfile,
    isCreator,
    isSubscriber,
    createProfile,
    updateProfile,
    getProfileByAddress,
  } = useUserProfile(wallet?.publicKey);
  
  // Check if current user is admin
  const isAdmin = wallet?.publicKey && isAdminWallet(wallet.publicKey);
  
  // Handle hash-based routing for public profiles
  useEffect(() => {
    const handleHashChange = () => {
      const route = parseHashRoute();
      if (route?.type === 'creator') {
        // Load the creator's profile data
        const savedProfile = localStorage.getItem(`orbit-creator-${route.publicKey}`);
        if (savedProfile) {
          setPublicProfileView(JSON.parse(savedProfile));
        } else {
          // Create minimal profile for creators without saved profile
          setPublicProfileView({
            id: route.publicKey,
            name: `Creator ${route.publicKey.slice(0, 6)}`,
            bio: '',
            avatar: null,
            walletAddress: route.publicKey,
            socialLinks: {},
            stats: { subscribers: 0, totalEarnings: 0 },
            verified: false,
          });
        }
        setActiveTab('public-profile');
      } else {
        setPublicProfileView(null);
        if (activeTab === 'public-profile') {
          setActiveTab('home');
        }
      }
    };
    
    // Check on mount
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
    if (!isRestoring && !sessionRestoredRef.current && restoredWallet?.publicKey) {
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
    toast.success('Wallet Connected', `Connected to ${walletData?.publicKey?.slice(0, 8) || 'wallet'}...`);
  }, [saveWalletSession, toast]);

  // Show onboarding for new users (after wallet connects but no profile)
  useEffect(() => {
    if (wallet?.publicKey && !hasProfile) {
      // User connected wallet but has no profile - show onboarding
      setShowOnboarding(true);
    } else if (hasProfile) {
      // User has profile - no need for onboarding
      setShowOnboarding(false);
    }
  }, [wallet?.publicKey, hasProfile]);

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

  // Show onboarding for new users
  if (showOnboarding && wallet?.publicKey) {
    return (
      <Onboarding
        wallet={wallet}
        onConnectWallet={handleWalletConnect}
        onCreateProfile={createProfile}
        onComplete={(data) => {
          setShowOnboarding(false);
          // If creator with wallet connected, go to profile tab
          if (data.role === 'creator' && wallet?.publicKey) {
            setActiveTab('profile');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-gray-200 relative overflow-hidden pb-20 lg:pb-0">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-orbit-gold/[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-orbit-gold/[0.03] rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-grid opacity-30" />
      </div>
      
      {/* Clean Header */}
      <header className="relative z-50 py-4 border-b border-white/[0.06] bg-[#0A0A0C]/80 backdrop-blur-2xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button 
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-3 group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-orbit-gold/40 blur-xl rounded-full group-hover:bg-orbit-gold/50 transition-all" />
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-orbit-gold/20 to-orbit-gold/5 border border-orbit-gold/30 flex items-center justify-center">
                  <Zap size={24} className="text-orbit-gold" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-display font-black tracking-wider text-gradient-gold">ORBIT</h1>
                <p className="text-[10px] text-orbit-gray uppercase tracking-widest">Creator Subscriptions</p>
              </div>
            </button>
            
            {/* Desktop Navigation */}
            {wallet?.publicKey && (
              <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <NavButton 
                  active={activeTab === 'home'} 
                  onClick={() => setActiveTab('home')}
                  icon={<Home size={18} />}
                  label="Home"
                />
                <NavButton 
                  active={activeTab === 'creators'} 
                  onClick={() => setActiveTab('creators')}
                  icon={<Users size={18} />}
                  label="Creators"
                />
                <NavButton 
                  active={activeTab === 'profile'} 
                  onClick={() => setActiveTab('profile')}
                  icon={<UserCircle size={18} />}
                  label="My Profile"
                />
                {isAdmin && (
                  <NavButton 
                    active={activeTab.startsWith('admin')} 
                    onClick={() => setActiveTab('admin-dashboard')}
                    icon={<Shield size={18} />}
                    label="Admin"
                    variant="admin"
                  />
                )}
              </nav>
            )}
            
            {/* Right Side - Wallet Info */}
            <div className="flex items-center gap-3">
              {wallet?.publicKey ? (
                <>
                  {/* Balance Badge */}
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <Wallet size={16} className="text-orbit-gold" />
                    <span className="text-white font-bold">{balance.xlm.toFixed(2)}</span>
                    <span className="text-orbit-gray text-sm">XLM</span>
                  </div>
                  
                  {/* Wallet Address & Disconnect */}
                  <div className="flex items-center gap-2">
                    <span className="hidden lg:block text-xs text-orbit-gray font-mono">
                      {wallet.publicKey.slice(0, 6)}...{wallet.publicKey.slice(-4)}
                    </span>
                    <button
                      onClick={() => {
                        if (window.confirm('Disconnect your wallet?')) {
                          setWallet(null);
                          clearWalletSession();
                          setActiveTab('home');
                        }
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Disconnect Wallet"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                </>
              ) : (
                <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                  Testnet
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      {wallet?.publicKey && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0C]/95 backdrop-blur-xl border-t border-white/[0.06] px-2 py-2 safe-area-pb">
          <div className="flex items-center justify-around">
            <MobileNavButton 
              active={activeTab === 'home'} 
              onClick={() => setActiveTab('home')}
              icon={<Home size={22} />}
              label="Home"
            />
            <MobileNavButton 
              active={activeTab === 'creators'} 
              onClick={() => setActiveTab('creators')}
              icon={<Users size={22} />}
              label="Creators"
            />
            <MobileNavButton 
              active={activeTab === 'profile'} 
              onClick={() => setActiveTab('profile')}
              icon={<UserCircle size={22} />}
              label="Profile"
            />
            {isAdmin && (
              <MobileNavButton 
                active={activeTab.startsWith('admin')} 
                onClick={() => setActiveTab('admin-dashboard')}
                icon={<Shield size={22} />}
                label="Admin"
              />
            )}
          </div>
        </nav>
      )}

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Public Profile View (accessible without login) */}
        {publicProfileView && activeTab === 'public-profile' ? (
          <div className="animate-fade-in">
            <button
              onClick={() => {
                window.location.hash = '';
                setPublicProfileView(null);
                setActiveTab('home');
              }}
              className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
              <span>Back to Home</span>
            </button>
            
            <CreatorProfile 
              wallet={wallet}
              isOwnProfile={wallet?.publicKey === publicProfileView.walletAddress}
              creatorData={publicProfileView}
              onSubscribe={handleSubscribe}
              onPayment={handlePaymentProcessed}
              platformWallet={platformWallet}
              onWalletConnect={handleWalletConnect}
            />
            
            {/* Connect wallet prompt if not logged in */}
            {!wallet && (
              <div className="mt-8">
                <p className="text-gray-400 mb-4 text-center">Connect your wallet to subscribe to this creator</p>
                <WalletConnect onConnect={handleWalletConnect} />
              </div>
            )}
          </div>
        ) : !wallet ? (
          /* Not logged in - Landing Page */
          <div className="animate-fade-in">
            <div className="max-w-4xl mx-auto text-center py-10 lg:py-20">
              {/* Hero Section */}
              <div className="mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orbit-gold/10 border border-orbit-gold/20 mb-6">
                  <Sparkles size={16} className="text-orbit-gold" />
                  <span className="text-sm text-orbit-gold font-medium">Built on Stellar Blockchain</span>
                </div>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-wide text-white mb-6">
                  Support Creators with <span className="text-gradient-gold">Crypto</span>
                </h2>
                <p className="text-orbit-gray text-lg sm:text-xl max-w-2xl mx-auto mb-8">
                  Subscribe to your favorite content creators using XLM. Fast, low fees, and you stay in control.
                </p>
              </div>
              
              {/* Connect Wallet CTA */}
              <div className="mb-16">
                <WalletConnect onConnect={handleWalletConnect} />
              </div>
              
              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="card-glass p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Zap size={24} className="text-emerald-400" />
                  </div>
                  <h3 className="text-white font-bold mb-2">Instant Payments</h3>
                  <p className="text-sm text-orbit-gray">3-5 second settlement on Stellar</p>
                </div>
                <div className="card-glass p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Wallet size={24} className="text-blue-400" />
                  </div>
                  <h3 className="text-white font-bold mb-2">Non-Custodial</h3>
                  <p className="text-sm text-orbit-gray">Your keys, your crypto, always</p>
                </div>
                <div className="card-glass p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-orbit-gold/10 flex items-center justify-center">
                    <CreditCard size={24} className="text-orbit-gold" />
                  </div>
                  <h3 className="text-white font-bold mb-2">Low 2% Fee</h3>
                  <p className="text-sm text-orbit-gray">Way less than Patreon's 5-12%</p>
                </div>
              </div>
            </div>
          </div>
          
        ) : activeTab === 'admin-dashboard' && isAdmin ? (
          /* Admin Dashboard */
          <div className="animate-fade-in">
            <AdminDashboardView 
              onNavigate={setActiveTab}
              activeSubTab={activeTab}
            />
          </div>
          
        ) : activeTab === 'admin-creators' && isAdmin ? (
          <div className="animate-fade-in">
            <AdminBackButton onBack={() => setActiveTab('admin-dashboard')} />
            <ServiceProviderManager />
          </div>
          
        ) : activeTab === 'admin-transactions' && isAdmin ? (
          <div className="animate-fade-in">
            <AdminBackButton onBack={() => setActiveTab('admin-dashboard')} />
            <AdminTransactions />
          </div>
          
        ) : activeTab === 'admin-settings' && isAdmin ? (
          <div className="animate-fade-in">
            <AdminBackButton onBack={() => setActiveTab('admin-dashboard')} />
            <SettingsPanel />
          </div>
          
        ) : activeTab === 'profile' ? (
          /* User Profile Tab - Show different view based on role */
          <div className="animate-fade-in">
            {isCreator ? (
              <CreatorProfile 
                wallet={wallet}
                isOwnProfile={true}
                userProfile={userProfile}
                onUpdateProfile={updateProfile}
                onSubscribe={handleSubscribe}
                onPayment={handlePaymentProcessed}
                platformWallet={platformWallet}
                onWalletConnect={handleWalletConnect}
              />
            ) : (
              <SubscriberProfile
                wallet={wallet}
                userProfile={userProfile}
                onUpdateProfile={updateProfile}
                subscriptions={subscriptions}
                transactions={transactions}
              />
            )}
          </div>
          
        ) : activeTab === 'creators' ? (
          /* Browse Creators */
          <div className="animate-fade-in">
            <div className="mb-8">
              <h2 className="text-2xl font-display font-bold text-white mb-2">Browse Creators</h2>
              <p className="text-orbit-gray">Discover and subscribe to content creators</p>
            </div>
            <SubscriptionForm 
              wallet={wallet}
              platformWallet={platformWallet}
              onSubscribe={handleSubscribe}
              onPayment={handlePaymentProcessed}
            />
          </div>
          
        ) : (
          /* Home Tab (default) */
          <div className="animate-fade-in">
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-display font-bold text-white mb-1">
                Welcome back
              </h2>
              <p className="text-orbit-gray">Manage your subscriptions and balance</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Balance & Faucet */}
              <div className="lg:col-span-2 space-y-6">
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
                
                {/* Quick Stats */}
                <div className="card-glass p-6">
                  <h4 className="text-sm font-bold text-orbit-gray uppercase tracking-wider mb-4">Your Activity</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-display font-black text-orbit-gold">{activeSubscriptionsCount}</p>
                      <p className="text-xs text-orbit-gray mt-1">Subscriptions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-display font-black text-emerald-400">{monthlyCost.toFixed(1)}</p>
                      <p className="text-xs text-orbit-gray mt-1">XLM/month</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-display font-black text-blue-400">{totalTransactions}</p>
                      <p className="text-xs text-orbit-gray mt-1">Transactions</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction History */}
              <div className="lg:col-span-1">
                <TransactionFeed 
                  transactions={transactions} 
                  subscriptions={subscriptions} 
                  onCancelSubscription={handleCancelSubscription}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Simplified Footer */}
      <footer className="relative z-10 py-8 border-t border-white/[0.06] bg-[#0A0A0C]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-orbit-gold" />
              <span className="font-display font-bold text-white">ORBIT</span>
              <span className="text-orbit-gray text-sm">• Stellar Testnet</span>
            </div>
            <p className="text-orbit-gray-dark text-xs">
              Non-custodial • Your keys, your crypto
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Admin Dashboard View Component
const AdminDashboardView = ({ onNavigate, activeSubTab }) => (
  <div className="space-y-6">
    <div className="mb-8">
      <h2 className="text-2xl font-display font-bold text-white mb-2">Admin Dashboard</h2>
      <p className="text-orbit-gray">Manage your platform</p>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AdminCard 
        icon={<Users size={24} />}
        label="Manage Creators"
        description="Add, edit, or remove creators"
        onClick={() => onNavigate('admin-creators')}
        color="purple"
      />
      <AdminCard 
        icon={<Activity size={24} />}
        label="Transactions"
        description="View all platform transactions"
        onClick={() => onNavigate('admin-transactions')}
        color="blue"
      />
      <AdminCard 
        icon={<Cog size={24} />}
        label="Settings"
        description="Platform configuration"
        onClick={() => onNavigate('admin-settings')}
        color="amber"
      />
    </div>
    
    {/* Inline Admin Dashboard Stats */}
    <div className="mt-8">
      <AdminDashboard />
    </div>
  </div>
);

// Admin Card Component
const AdminCard = ({ icon, label, description, onClick, color }) => {
  const colorClasses = {
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:border-purple-500/40',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:border-blue-500/40',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:border-amber-500/40',
  };
  
  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-xl border transition-all text-left w-full ${colorClasses[color]}`}
    >
      <div className="mb-3">{icon}</div>
      <h3 className="text-white font-bold mb-1">{label}</h3>
      <p className="text-sm text-orbit-gray">{description}</p>
    </button>
  );
};

// Admin Back Button
const AdminBackButton = ({ onBack }) => (
  <button
    onClick={onBack}
    className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
  >
    <ArrowLeft size={18} />
    <span>Back to Admin</span>
  </button>
);

export default App;