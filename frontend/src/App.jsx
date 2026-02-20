import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as StellarSdk from 'stellar-sdk';
import { Zap, Loader, CreditCard, Settings, LayoutDashboard, User, Shield, Activity, Cog, UserCircle, ArrowLeft, Share2, LogOut, Home, Users, Menu, X, ChevronDown, Wallet, Sparkles, BarChart3 } from 'lucide-react';
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
import Onboarding from './components/OnboardingSimple';
import CreatorDashboard from './components/CreatorDashboard';
import SubscriberDashboard from './components/SubscriberDashboard';
import CreatorDiscovery from './components/CreatorDiscovery';
import { useToast } from './context/ToastContext';
import useWalletSession from './hooks/useWalletSession';
import useUserProfile from './hooks/useUserProfile';
import { getPlatformWallet, isAdminWallet } from './config/platform';
import { StreamingPaymentsClient } from './services/streamingPayments';
import PLATFORM_CONFIG from './config/platform';
import { creatorsApi } from './services/api';

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
  const [creators, setCreators] = useState([]);
  const [lastTxHash, setLastTxHash] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); // home, creators, profile, admin-*
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [publicProfileView, setPublicProfileView] = useState(null); // For viewing other creators
  const [showOnboarding, setShowOnboarding] = useState(false); // Will be set after wallet connects
  const [isReturningUser, setIsReturningUser] = useState(false); // Track if user has visited before
  
  // Platform wallet from config (no user setup needed)
  const platformWallet = getPlatformWallet();
  
  // Initialize streaming payments client
  const streamingClient = React.useMemo(() => {
    const client = new StreamingPaymentsClient({
      networkPassphrase: PLATFORM_CONFIG.NETWORK_PASSPHRASE,
      horizonUrl: PLATFORM_CONFIG.HORIZON_URL,
      sorobanUrl: PLATFORM_CONFIG.SOROBAN_RPC_URL,
    });
    if (PLATFORM_CONFIG.STREAMING_CONTRACT_ID) {
      client.setContractId(PLATFORM_CONFIG.STREAMING_CONTRACT_ID);
    }
    return client;
  }, []);
  
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
    const savedProviders = localStorage.getItem('orbit-service-providers');
    
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }
    
    if (savedSubscriptions) {
      setSubscriptions(JSON.parse(savedSubscriptions));
    }
    
    // Load creators from API
    const loadCreators = async () => {
      try {
        const response = await creatorsApi.list(1, 50);
        if (response.creators) {
          const creatorList = response.creators.map(c => ({
            id: c.id,
            walletAddress: c.walletAddress,
            name: c.displayName || 'Creator',
            bio: c.bio || '',
            category: c.category || 'general',
            avatar: c.avatarUrl || null,
            verified: c.isVerified || false,
            featured: false,
            stats: {
              subscribers: c.subscriberCount || 0,
              rating: 4.5,
            },
            badges: c.badges || [],
            tiers: [],
          }));
          setCreators(creatorList);
          console.log('📋 Loaded', creatorList.length, 'creators from API');
        }
      } catch (err) {
        console.log('API creators load failed, using localStorage fallback:', err.message);
        // Fallback to localStorage
        if (savedProviders) {
          const providers = JSON.parse(savedProviders);
          const creatorList = providers.filter(p => p.active).map(p => ({
            walletAddress: p.walletAddress,
            name: p.name,
            bio: p.description || '',
            category: p.type || 'general',
            avatar: p.avatar || null,
            verified: p.verified || false,
            featured: p.featured || false,
            stats: {
              subscribers: p.subscriberCount || 0,
              rating: p.rating || 4.5,
            },
            badges: p.badges || [],
            tiers: p.tiers || [{ name: 'Standard', amount: p.amount }],
          }));
          setCreators(creatorList);
        }
      }
    };
    loadCreators();
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
    
    // Check if returning user (had session before)
    const hadPreviousSession = localStorage.getItem('orbit-wallet-session') || localStorage.getItem('orbit-onboarding');
    if (hadPreviousSession) {
      setIsReturningUser(true);
    }
    
    toast.success('Wallet Connected', `Connected to ${walletData?.publicKey?.slice(0, 8) || 'wallet'}...`);
  }, [saveWalletSession, toast]);

  // Check for returning user on mount
  useEffect(() => {
    const hadPreviousSession = localStorage.getItem('orbit-onboarding');
    if (hadPreviousSession) {
      setIsReturningUser(true);
    }
  }, []);

  // Show onboarding for FIRST-TIME users only (after wallet connects but no profile and not returning)
  useEffect(() => {
    if (wallet?.publicKey && !hasProfile && !isReturningUser) {
      // First-time user connected wallet but has no profile - show onboarding
      setShowOnboarding(true);
    } else if (hasProfile || isReturningUser) {
      // User has profile OR is returning - no need for onboarding
      setShowOnboarding(false);
    }
  }, [wallet?.publicKey, hasProfile, isReturningUser]);

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

  // ===== STREAMING CONTRACT HANDLERS =====
  
  // Sign and submit a transaction using Freighter
  const signAndSubmitTransaction = useCallback(async (transaction) => {
    try {
      // Import freighter dynamically
      const freighter = await import('@stellar/freighter-api');
      
      // Sign the transaction
      const signedXdr = await freighter.signTransaction(
        transaction.toXDR(),
        { networkPassphrase: PLATFORM_CONFIG.NETWORK_PASSPHRASE }
      );
      
      // Convert back to Transaction object
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(
        signedXdr.signedTxXdr,
        PLATFORM_CONFIG.NETWORK_PASSPHRASE
      );
      
      // Submit using the streaming client
      const result = await streamingClient.submitTransaction(signedTx);
      return result;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }, [streamingClient]);
  
  // Creator: Withdraw all earnings from active streams
  const handleWithdrawAll = useCallback(async () => {
    if (!wallet?.publicKey) {
      toast.error('No Wallet', 'Please connect your wallet first');
      return;
    }
    
    if (!PLATFORM_CONFIG.STREAMING_CONTRACT_ID) {
      toast.error('Contract Missing', 'Streaming contract not configured');
      return;
    }
    
    try {
      const tx = await streamingClient.buildWithdrawAllTransaction({
        creatorPublicKey: wallet.publicKey,
      });
      
      await signAndSubmitTransaction(tx);
      toast.success('Withdrawal Complete', 'All earnings have been sent to your wallet');
      
      // Refresh balance
      setTimeout(() => setLastTxHash(Date.now().toString()), 2000);
    } catch (error) {
      toast.error('Withdrawal Failed', error.message);
    }
  }, [wallet, streamingClient, signAndSubmitTransaction, toast]);
  
  // Creator: Terminate a subscriber's stream
  const handleTerminateStream = useCallback(async (stream) => {
    if (!wallet?.publicKey) {
      toast.error('No Wallet', 'Please connect your wallet first');
      return;
    }
    
    if (!PLATFORM_CONFIG.STREAMING_CONTRACT_ID) {
      toast.error('Contract Missing', 'Streaming contract not configured');
      return;
    }
    
    try {
      const tx = await streamingClient.buildTerminateStreamTransaction({
        creatorPublicKey: wallet.publicKey,
        streamId: stream.id,
      });
      
      await signAndSubmitTransaction(tx);
      toast.success('Stream Terminated', 'Subscriber has been refunded remaining balance');
      
      // Update local state
      setSubscriptions(prev => prev.filter(s => s.id !== stream.id));
    } catch (error) {
      toast.error('Termination Failed', error.message);
    }
  }, [wallet, streamingClient, signAndSubmitTransaction, toast]);
  
  // Subscriber: Extend a subscription
  const handleExtendSubscription = useCallback(async (subscriptionId, additionalAmount, additionalDays) => {
    if (!wallet?.publicKey) {
      toast.error('No Wallet', 'Please connect your wallet first');
      return;
    }
    
    if (!PLATFORM_CONFIG.STREAMING_CONTRACT_ID) {
      toast.error('Contract Missing', 'Streaming contract not configured');
      return;
    }
    
    try {
      const additionalDuration = additionalDays * 86400; // Convert days to seconds
      
      const tx = await streamingClient.buildExtendStreamTransaction({
        subscriberPublicKey: wallet.publicKey,
        streamId: subscriptionId,
        additionalAmount,
        additionalDuration,
      });
      
      await signAndSubmitTransaction(tx);
      toast.success('Subscription Extended', `Added ${additionalDays} days to your subscription`);
      
      // Refresh balance
      setTimeout(() => setLastTxHash(Date.now().toString()), 2000);
    } catch (error) {
      toast.error('Extension Failed', error.message);
    }
  }, [wallet, streamingClient, signAndSubmitTransaction, toast]);
  
  // Subscriber: Toggle auto-renewal
  const handleToggleAutoRenew = useCallback(async (subscriptionId, enabled) => {
    if (!wallet?.publicKey) {
      toast.error('No Wallet', 'Please connect your wallet first');
      return;
    }
    
    if (!PLATFORM_CONFIG.STREAMING_CONTRACT_ID) {
      toast.error('Contract Missing', 'Streaming contract not configured');
      return;
    }
    
    try {
      const tx = await streamingClient.buildToggleAutoRenewTransaction({
        subscriberPublicKey: wallet.publicKey,
        streamId: subscriptionId,
      });
      
      await signAndSubmitTransaction(tx);
      
      // Update local state
      setSubscriptions(prev => prev.map(sub => 
        sub.id === subscriptionId 
          ? { ...sub, autoRenew: enabled }
          : sub
      ));
      
      toast.success(
        enabled ? 'Auto-Renew Enabled' : 'Auto-Renew Disabled',
        enabled ? 'Your subscription will renew automatically' : 'Your subscription will end when complete'
      );
    } catch (error) {
      toast.error('Toggle Failed', error.message);
    }
  }, [wallet, streamingClient, signAndSubmitTransaction, toast]);
  
  // Refresh streams from contract
  const handleRefreshStreams = useCallback(async () => {
    if (!wallet?.publicKey || !PLATFORM_CONFIG.STREAMING_CONTRACT_ID) {
      return;
    }
    
    try {
      // Get stream IDs for this user
      const streamIds = isCreator 
        ? await streamingClient.getCreatorStreams(wallet.publicKey)
        : await streamingClient.getSubscriberStreams(wallet.publicKey);
      
      // Fetch details for each stream
      const streams = await Promise.all(
        streamIds.map(id => streamingClient.getStream(id))
      );
      
      // Transform to subscription format
      const transformedStreams = streams.map(stream => ({
        id: stream.id,
        service: stream.creator,
        creatorName: `Creator ${stream.creator.slice(0, 6)}`,
        subscriber: stream.subscriber,
        amount: stream.totalAmount / 10_000_000,
        total: stream.totalAmount / 10_000_000,
        startTime: stream.startTime,
        endTime: stream.endTime,
        status: stream.status.toLowerCase(),
        autoRenew: stream.autoRenew,
        withdrawn: stream.withdrawn / 10_000_000,
        streamed: ((Date.now() / 1000 - stream.startTime) / (stream.endTime - stream.startTime)) * (stream.totalAmount / 10_000_000),
        tierName: `Tier ${stream.tierId}`,
        tierId: stream.tierId,
      }));
      
      setSubscriptions(transformedStreams);
    } catch (error) {
      console.error('Failed to refresh streams:', error);
    }
  }, [wallet, isCreator, streamingClient]);

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
          setIsReturningUser(true); // Mark as returning user
          localStorage.setItem('orbit-onboarding', 'completed'); // Persist for future visits
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
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-orbit-gold/20 to-orbit-gold/5 border border-orbit-gold/30 flex items-center justify-center overflow-hidden">
                  <img src="/orbit-logo.png" alt="Orbit" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-display font-black tracking-wider text-gradient-gold">ORBIT</h1>
                <p className="text-[10px] text-orbit-gray uppercase tracking-widest">Crypto Payments</p>
              </div>
            </button>
            
            {/* Desktop Navigation */}
            {/* Desktop Navigation - Always visible */}
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
              {wallet?.publicKey && (
                <>
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
                </>
              )}
            </nav>
            
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
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                    Testnet
                  </span>
                  <button
                    onClick={() => document.getElementById('wallet-connect-btn')?.click()}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-orbit-gold/10 border border-orbit-gold/30 text-orbit-gold text-sm font-medium hover:bg-orbit-gold/20 transition-all"
                  >
                    <Wallet size={16} />
                    Connect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation - Always visible */}
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
          {wallet?.publicKey ? (
            <>
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
            </>
          ) : (
            <MobileNavButton 
              active={false} 
              onClick={() => document.getElementById('wallet-connect-btn')?.click()}
              icon={<Wallet size={22} />}
              label="Connect"
            />
          )}
        </div>
      </nav>

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
        ) : activeTab === 'creators' ? (
          /* Browse Creators - accessible without wallet */
          <div className="animate-fade-in">
            <CreatorDiscovery
              creators={creators}
              wallet={wallet}
              onViewCreator={(creator) => {
                // Navigate to creator's public profile
                setPublicProfileView(creator);
                setActiveTab('public-profile');
                window.location.hash = `#/creator/${creator.walletAddress}`;
              }}
              onSubscribe={handleSubscribe}
              onWalletConnect={handleWalletConnect}
            />
          </div>
        ) : activeTab === 'profile' && !wallet ? (
          /* Profile tab but no wallet - prompt connect */
          <div className="animate-fade-in">
            <div className="max-w-md mx-auto text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
                <UserCircle size={40} className="text-orbit-gray" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Connect to View Profile</h2>
              <p className="text-orbit-gray mb-8">Connect your wallet to access your profile and manage subscriptions</p>
              <WalletConnect onConnect={handleWalletConnect} />
            </div>
          </div>
        ) : !wallet && activeTab === 'home' ? (
          /* Not logged in + Home tab - Landing Page */
          <div className="animate-fade-in">
            <div className="max-w-4xl mx-auto text-center py-10 lg:py-20">
              {/* Hero Section */}
              <div className="mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orbit-gold/10 border border-orbit-gold/20 mb-6">
                  <Sparkles size={16} className="text-orbit-gold" />
                  <span className="text-sm text-orbit-gold font-medium">Crypto Payments for Creators</span>
                </div>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-wide text-white mb-6">
                  Get Paid for Your <span className="text-gradient-gold">Content</span>
                </h2>
                <p className="text-orbit-gray text-lg sm:text-xl max-w-2xl mx-auto mb-8">
                  Accept streaming payments for your YouTube, Discord, Telegram, podcasts & more. Low fees, instant settlement.
                </p>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <WalletConnect onConnect={handleWalletConnect} />
                <span className="text-orbit-gray hidden sm:block">or</span>
                <button
                  onClick={() => setActiveTab('creators')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all"
                >
                  <Users size={20} />
                  Explore Creators
                </button>
              </div>
              
              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="card-glass p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Zap size={24} className="text-purple-400" />
                  </div>
                  <h3 className="text-white font-bold mb-2">Streaming Payments</h3>
                  <p className="text-sm text-orbit-gray">XLM flows to you in real-time</p>
                </div>
                <div className="card-glass p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Users size={24} className="text-blue-400" />
                  </div>
                  <h3 className="text-white font-bold mb-2">Any Platform</h3>
                  <p className="text-sm text-orbit-gray">YouTube, Discord, Telegram & more</p>
                </div>
                <div className="card-glass p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-orbit-gold/10 flex items-center justify-center">
                    <CreditCard size={24} className="text-orbit-gold" />
                  </div>
                  <h3 className="text-white font-bold mb-2">Low 2% Fee</h3>
                  <p className="text-sm text-orbit-gray">Keep more of what you earn</p>
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
              <div className="space-y-8">
                {/* Creator Dashboard - Earnings & Subscribers */}
                <CreatorDashboard
                  wallet={wallet}
                  streams={subscriptions}
                  onWithdrawAll={handleWithdrawAll}
                  onTerminateStream={handleTerminateStream}
                  onRefresh={handleRefreshStreams}
                />
                
                {/* Creator Profile Editor */}
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
              </div>
            ) : (
              <div className="space-y-8">
                {/* Subscriber Dashboard - Active Subscriptions */}
                <SubscriberDashboard
                  wallet={wallet}
                  subscriptions={subscriptions.map(sub => ({
                    ...sub,
                    // Transform to expected format
                    startTime: sub.startTime || Math.floor(Date.now() / 1000) - 86400 * 15,
                    endTime: sub.endTime || Math.floor(Date.now() / 1000) + 86400 * 15,
                    total: sub.amount || 100,
                    status: sub.status || 'active',
                    autoRenew: sub.autoRenew || false,
                    creatorName: sub.service || sub.creatorName || 'Creator',
                    tierName: sub.tierName || 'Standard',
                  }))}
                  onCancel={handleCancelSubscription}
                  onExtend={handleExtendSubscription}
                  onToggleAutoRenew={handleToggleAutoRenew}
                  onRefresh={handleRefreshStreams}
                />
                
                {/* Subscriber Profile */}
                <SubscriberProfile
                  wallet={wallet}
                  userProfile={userProfile}
                  onUpdateProfile={updateProfile}
                  subscriptions={subscriptions}
                  transactions={transactions}
                  hasTiers={isCreator}
                  onBecomeCreator={() => {
                    // Switch to creator mode by creating a profile with creator role
                    if (userProfile) {
                      updateProfile({ ...userProfile, role: 'creator' });
                    } else {
                      createProfile('creator', {});
                    }
                    setActiveTab('profile');
                  }}
                />
              </div>
            )}
          </div>
          
        ) : (
          /* Home Tab (default - requires wallet) */
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
              <img src="/orbit-logo.png" alt="Orbit" className="w-5 h-5 object-contain" />
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