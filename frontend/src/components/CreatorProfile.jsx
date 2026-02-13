import React, { useState, useEffect } from 'react';
import {
  User,
  Wallet,
  Twitter,
  Youtube,
  MessageCircle,
  Send,
  ExternalLink,
  Copy,
  Check,
  Star,
  Users,
  DollarSign,
  Calendar,
  Shield,
  Edit2,
  Camera,
  Globe,
  Zap,
  TrendingUp,
  Share2,
  Link,
  Plus,
  Trash2,
  X,
  Save,
  Loader,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { usePriceConverter } from '../hooks/usePriceConverter';
import * as StellarSdk from 'stellar-sdk';
import { isConnected, signTransaction as freighterSignTransaction, requestAccess } from '@stellar/freighter-api';
import { PLATFORM_CONFIG } from '../config/platform';

const PLATFORM_FEE_PERCENT = 2;

// Default avatar colors for creators without custom avatars
const AVATAR_COLORS = [
  'from-purple-500 to-pink-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-red-500 to-rose-500',
  'from-indigo-500 to-purple-500',
];

function CreatorProfile({ 
  wallet, 
  isOwnProfile = false, 
  creatorData = null,
  userProfile = null, // New: from useUserProfile hook
  onUpdateProfile = null, // New: from useUserProfile hook
  onSubscribe,
  onPayment,
  platformWallet,
  onWalletConnect,
  onEditProfile
}) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showAddTier, setShowAddTier] = useState(false);
  const [newTier, setNewTier] = useState({ name: '', type: '', amount: '', description: '' });
  const [creatorServices, setCreatorServices] = useState([]);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  
  const toast = useToast();
  const { convertToUSD, xlmPrice } = usePriceConverter();

  // Connect wallet from within the modal
  const handleConnectWalletInModal = async () => {
    setConnectingWallet(true);
    setPaymentError(null);
    
    try {
      // Check if Freighter is installed
      const connectedResult = await isConnected();
      
      if (!connectedResult.isConnected) {
        setPaymentError('Freighter wallet not found. Please install it first.');
        window.open('https://freighter.app/', '_blank');
        return;
      }

      // Request access to wallet
      const accessObj = await requestAccess();
      
      if (accessObj.error) {
        throw new Error(accessObj.error);
      }

      const publicKey = accessObj.address;
      
      if (!publicKey) {
        throw new Error('Failed to get public key from Freighter');
      }

      // Fetch balance from Stellar
      const server = new StellarSdk.Horizon.Server(PLATFORM_CONFIG.HORIZON_URL);
      let balance = 0;
      
      try {
        const account = await server.loadAccount(publicKey);
        const xlmBalance = account.balances.find(b => b.asset_type === 'native');
        balance = parseFloat(xlmBalance?.balance || 0);
      } catch (loadErr) {
        if (loadErr.response?.status !== 404) {
          console.error('Error loading account:', loadErr);
        }
      }

      const walletData = {
        publicKey,
        balance,
        type: 'freighter',
      };

      // Call parent handler to update app state
      if (onWalletConnect) {
        onWalletConnect(walletData);
      }

      toast.success('Wallet Connected!', `Connected to ${publicKey.slice(0, 8)}...`);
      
    } catch (err) {
      console.error('Wallet connection error:', err);
      setPaymentError(err.message || 'Failed to connect wallet');
    } finally {
      setConnectingWallet(false);
    }
  };

  // Load profile from props, localStorage, or create default
  useEffect(() => {
    if (creatorData) {
      setProfile(creatorData);
    } else if (userProfile && isOwnProfile) {
      // Use profile from useUserProfile hook (new system)
      setProfile({
        id: wallet?.publicKey || userProfile.id,
        name: userProfile.displayName || `Creator ${(wallet?.publicKey || '').slice(0, 6)}`,
        bio: userProfile.bio || '',
        avatar: userProfile.avatar || null,
        walletAddress: wallet?.publicKey || userProfile.walletAddress,
        socialLinks: userProfile.socialLinks || {
          twitter: '',
          youtube: '',
          discord: '',
          telegram: '',
          website: '',
        },
        services: userProfile.services || [],
        stats: userProfile.stats || {
          subscribers: 0,
          totalEarnings: 0,
          memberSince: userProfile.createdAt || new Date().toISOString(),
        },
        verified: userProfile.verified || false,
        createdAt: userProfile.createdAt || new Date().toISOString(),
      });
    } else if (wallet?.publicKey) {
      // Fallback: Load own profile from localStorage (old system)
      const savedProfile = localStorage.getItem(`orbit-creator-${wallet.publicKey}`);
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      } else {
        // Create default profile for new creators
        const defaultProfile = {
          id: wallet.publicKey,
          name: `Creator ${wallet.publicKey.slice(0, 6)}`,
          bio: '',
          avatar: null,
          walletAddress: wallet.publicKey,
          socialLinks: {
            twitter: '',
            youtube: '',
            discord: '',
            telegram: '',
            website: '',
          },
          services: [],
          stats: {
            subscribers: 0,
            totalEarnings: 0,
            memberSince: new Date().toISOString(),
          },
          verified: false,
          createdAt: new Date().toISOString(),
        };
        setProfile(defaultProfile);
      }
    }
  }, [wallet, creatorData, userProfile, isOwnProfile]);

  // Save profile to localStorage and/or via hook when editing
  const saveProfile = (updatedProfile) => {
    if (wallet?.publicKey) {
      // Save to localStorage for backwards compatibility
      localStorage.setItem(`orbit-creator-${wallet.publicKey}`, JSON.stringify(updatedProfile));
      setProfile(updatedProfile);
      
      // Also update via hook if available (new system)
      if (onUpdateProfile) {
        onUpdateProfile({
          displayName: updatedProfile.name,
          bio: updatedProfile.bio,
          avatar: updatedProfile.avatar,
          socialLinks: updatedProfile.socialLinks,
          services: updatedProfile.services,
          stats: updatedProfile.stats,
          verified: updatedProfile.verified,
        });
      }
      
      toast.success('Profile Updated', 'Your creator profile has been saved');
    }
  };

  // Copy wallet address to clipboard
  const copyWalletAddress = () => {
    if (profile?.walletAddress) {
      navigator.clipboard.writeText(profile.walletAddress);
      setCopied(true);
      toast.success('Copied', 'Wallet address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Generate shareable profile link
  const getProfileLink = () => {
    if (!profile?.walletAddress) return '';
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/creator/${profile.walletAddress}`;
  };

  // Copy profile link to clipboard
  const copyProfileLink = () => {
    const link = getProfileLink();
    if (link) {
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast.success('Link Copied!', 'Share this link with your audience');
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // Share profile via Web Share API (mobile) or copy link
  const shareProfile = async () => {
    const link = getProfileLink();
    const shareData = {
      title: `${profile?.name || 'Creator'} on Orbit`,
      text: `Subscribe to ${profile?.name || 'this creator'} with XLM on Orbit`,
      url: link,
    };

    // Try native share first (works on mobile)
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success('Shared!', 'Profile shared successfully');
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyProfileLink(); // Fallback to copy
        }
      }
    } else {
      copyProfileLink(); // Fallback to copy on desktop
    }
  };

  // Get avatar color based on wallet address
  const getAvatarColor = (address) => {
    if (!address) return AVATAR_COLORS[0];
    const index = address.charCodeAt(1) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  };

  // Handle edit form changes
  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle social link changes
  const handleSocialChange = (platform, value) => {
    setEditForm(prev => ({
      ...prev,
      socialLinks: {
        ...(prev.socialLinks || profile?.socialLinks || {}),
        [platform]: value,
      },
    }));
  };

  // Start editing
  const startEditing = () => {
    setEditForm({ ...profile });
    setIsEditing(true);
  };

  // Save edits
  const saveEdits = () => {
    const updatedProfile = {
      ...profile,
      ...editForm,
      socialLinks: editForm.socialLinks || profile.socialLinks,
    };
    saveProfile(updatedProfile);
    setIsEditing(false);
    setEditForm({});
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
  };

  // Load creator's services from localStorage
  const loadCreatorServices = () => {
    if (!profile?.walletAddress) return [];
    const allServices = JSON.parse(localStorage.getItem('orbit-service-providers') || '[]');
    return allServices.filter(s => s.walletAddress === profile.walletAddress && s.active);
  };

  // Update services when profile changes
  useEffect(() => {
    if (profile?.walletAddress) {
      setCreatorServices(loadCreatorServices());
    }
  }, [profile?.walletAddress]);

  // Add a new subscription tier
  const handleAddTier = () => {
    if (!newTier.name || !newTier.amount) {
      toast.error('Missing Info', 'Name and amount are required');
      return;
    }

    const tier = {
      id: Date.now(),
      name: newTier.name,
      type: newTier.type || 'Subscription',
      amount: parseFloat(newTier.amount),
      description: newTier.description || '',
      walletAddress: profile.walletAddress,
      color: ['emerald', 'purple', 'blue', 'orange'][Math.floor(Math.random() * 4)],
      active: true,
      createdAt: new Date().toISOString(),
    };

    // Save to global services list
    const allServices = JSON.parse(localStorage.getItem('orbit-service-providers') || '[]');
    const updatedServices = [...allServices, tier];
    localStorage.setItem('orbit-service-providers', JSON.stringify(updatedServices));

    // Update local state
    setCreatorServices(prev => [...prev, tier]);
    setNewTier({ name: '', type: '', amount: '', description: '' });
    setShowAddTier(false);
    toast.success('Tier Added', `${tier.name} subscription tier created!`);
  };

  // Delete a subscription tier
  const handleDeleteTier = (tierId) => {
    if (!window.confirm('Delete this subscription tier? This cannot be undone.')) return;

    const allServices = JSON.parse(localStorage.getItem('orbit-service-providers') || '[]');
    const updatedServices = allServices.filter(s => s.id !== tierId);
    localStorage.setItem('orbit-service-providers', JSON.stringify(updatedServices));

    setCreatorServices(prev => prev.filter(s => s.id !== tierId));
    toast.warning('Tier Deleted', 'Subscription tier removed');
  };

  // Handle subscribe button click - show payment modal or connect prompt
  const handleSubscribeClick = (tier) => {
    setSelectedTier(tier);
    setPaymentError(null);
    setShowPaymentModal(true);
    // If no wallet, the modal will show connect wallet prompt
  };

  // Calculate payment split
  const calculateSplit = (amount) => {
    const platformFee = amount * PLATFORM_FEE_PERCENT / 100;
    const providerPayout = amount - platformFee;
    return { platformFee, providerPayout };
  };

  // Process the actual payment
  const handleProcessPayment = async () => {
    if (!wallet?.publicKey || !selectedTier) return;

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      
      // Load sender account
      const senderAccount = await server.loadAccount(wallet.publicKey);
      
      // Verify balance
      const xlmBalance = senderAccount.balances.find(b => b.asset_type === 'native');
      const balance = xlmBalance ? parseFloat(xlmBalance.balance) : 0;
      const requiredAmount = selectedTier.amount + 0.001;
      
      if (balance < requiredAmount) {
        throw new Error(`Insufficient balance. You have ${balance.toFixed(2)} XLM but need ${requiredAmount.toFixed(2)} XLM`);
      }

      // Calculate split
      const { platformFee, providerPayout } = calculateSplit(selectedTier.amount);

      // Build transaction
      const txBuilder = new StellarSdk.TransactionBuilder(senderAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      });

      // Get platform wallet address
      const platformAddress = platformWallet?.publicKey || import.meta.env.VITE_PLATFORM_WALLET;
      
      if (!platformAddress) {
        throw new Error('Platform wallet not configured');
      }

      // Payment to platform
      txBuilder.addOperation(
        StellarSdk.Operation.payment({
          destination: platformAddress,
          asset: StellarSdk.Asset.native(),
          amount: platformFee.toFixed(7),
        })
      );

      // Payment to creator (if wallet configured)
      const creatorWallet = selectedTier.walletAddress || profile.walletAddress;
      if (creatorWallet && creatorWallet.startsWith('G')) {
        try {
          await server.loadAccount(creatorWallet);
          txBuilder.addOperation(
            StellarSdk.Operation.payment({
              destination: creatorWallet,
              asset: StellarSdk.Asset.native(),
              amount: providerPayout.toFixed(7),
            })
          );
        } catch {
          // Creator wallet doesn't exist, send to platform
          txBuilder.addOperation(
            StellarSdk.Operation.payment({
              destination: platformAddress,
              asset: StellarSdk.Asset.native(),
              amount: providerPayout.toFixed(7),
            })
          );
        }
      } else {
        // No creator wallet, platform gets all
        txBuilder.addOperation(
          StellarSdk.Operation.payment({
            destination: platformAddress,
            asset: StellarSdk.Asset.native(),
            amount: providerPayout.toFixed(7),
          })
        );
      }

      const transaction = txBuilder
        .addMemo(StellarSdk.Memo.text(`Sub: ${selectedTier.name}`))
        .setTimeout(180)
        .build();

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

      const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
        signedResult.signedTxXdr,
        StellarSdk.Networks.TESTNET
      );

      // Submit transaction
      const result = await server.submitTransaction(signedTransaction);

      // Create transaction record
      const transactionRecord = {
        id: Date.now(),
        serviceId: selectedTier.id,
        service: selectedTier.name,
        serviceName: selectedTier.name,
        amount: selectedTier.amount,
        platformFee,
        providerPayout,
        usdValue: convertToUSD ? convertToUSD(selectedTier.amount) : '0',
        status: 'completed',
        hash: result.hash,
        timestamp: new Date().toISOString(),
        creatorWallet: creatorWallet,
        creatorName: profile.name,
      };

      // Save to payment history
      const paymentHistory = JSON.parse(localStorage.getItem('orbit-payment-history') || '[]');
      paymentHistory.unshift(transactionRecord);
      localStorage.setItem('orbit-payment-history', JSON.stringify(paymentHistory));

      // Call parent handlers
      if (onPayment) {
        onPayment(transactionRecord);
      }
      if (onSubscribe) {
        onSubscribe({
          id: Date.now(),
          service: selectedTier.name,
          amount: selectedTier.amount,
          status: 'active',
          date: new Date().toLocaleDateString(),
          nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        });
      }

      // Update creator stats
      const creatorProfileKey = `orbit-creator-${profile.walletAddress}`;
      const creatorProfile = JSON.parse(localStorage.getItem(creatorProfileKey) || '{}');
      if (creatorProfile.stats) {
        creatorProfile.stats.subscribers = (creatorProfile.stats.subscribers || 0) + 1;
        creatorProfile.stats.totalEarnings = (creatorProfile.stats.totalEarnings || 0) + providerPayout;
        localStorage.setItem(creatorProfileKey, JSON.stringify(creatorProfile));
      }

      toast.success('Subscribed!', `You're now subscribed to ${selectedTier.name}`);
      setShowPaymentModal(false);
      setSelectedTier(null);

    } catch (err) {
      console.error('Payment failed:', err);
      setPaymentError(err.message || 'Payment failed');
      toast.error('Payment Failed', err.message || 'Something went wrong');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (!profile) {
    // If viewing own profile but no wallet connected, show connect prompt
    if (!creatorData && !wallet?.publicKey) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Wallet size={48} className="mx-auto text-gray-600" />
            <p className="text-gray-400">Connect your wallet to view your profile</p>
            <p className="text-sm text-gray-500">Your creator profile is tied to your wallet address</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <User size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Header Card */}
      <div className="card-hero p-6 sm:p-8 border-gradient relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orbit-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative">
          {/* Action Buttons (top right) */}
          <div className="absolute top-0 right-0 flex items-center gap-2">
            {/* Share Button */}
            <button
              onClick={shareProfile}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-orbit-gold hover:border-orbit-gold/30 hover:bg-orbit-gold/5 transition-all flex items-center gap-2"
              title="Share profile"
            >
              {linkCopied ? <Check size={18} className="text-emerald-400" /> : <Share2 size={18} />}
              <span className="hidden sm:inline text-sm">Share</span>
            </button>
            
            {/* Edit Button (own profile only) */}
            {isOwnProfile && !isEditing && (
              <button
                onClick={startEditing}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <Edit2 size={18} />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br ${getAvatarColor(profile.walletAddress)} flex items-center justify-center shadow-lg`}>
                {profile.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt={profile.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <span className="text-4xl sm:text-5xl font-display font-black text-white/90">
                    {profile.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              {profile.verified && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-[#0A0A0C]">
                  <Shield size={14} className="text-white" />
                </div>
              )}
              {isOwnProfile && isEditing && (
                <button className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-white" />
                </button>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left">
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => handleEditChange('name', e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white text-xl font-display font-bold focus:border-orbit-gold/50 focus:outline-none"
                  />
                  <textarea
                    value={editForm.bio || ''}
                    onChange={(e) => handleEditChange('bio', e.target.value)}
                    placeholder="Tell subscribers about yourself..."
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-gray-300 focus:border-orbit-gold/50 focus:outline-none resize-none"
                  />
                </div>
              ) : (
                /* View Mode */
                <>
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    <h2 className="text-2xl sm:text-3xl font-display font-black text-white">
                      {profile.name}
                    </h2>
                    {profile.verified && (
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-medium flex items-center gap-1">
                        <Shield size={12} />
                        Verified
                      </span>
                    )}
                  </div>
                  
                  {profile.bio ? (
                    <p className="text-gray-400 mt-2 max-w-lg">
                      {profile.bio}
                    </p>
                  ) : isOwnProfile ? (
                    <p className="text-gray-500 mt-2 italic">
                      Add a bio to tell subscribers about yourself
                    </p>
                  ) : null}
                </>
              )}

              {/* Wallet Address */}
              <div className="mt-4 flex items-center gap-2 justify-center sm:justify-start">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <Wallet size={14} className="text-orbit-gold" />
                  <span className="font-mono text-sm text-gray-400">
                    {profile.walletAddress?.slice(0, 8)}...{profile.walletAddress?.slice(-8)}
                  </span>
                  <button
                    onClick={copyWalletAddress}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Social Links */}
              {isEditing ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Twitter size={16} className="text-gray-500" />
                    <input
                      type="text"
                      value={editForm.socialLinks?.twitter || ''}
                      onChange={(e) => handleSocialChange('twitter', e.target.value)}
                      placeholder="@username"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#0D0D0F] border border-white/10 text-sm text-white focus:border-orbit-gold/50 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Youtube size={16} className="text-gray-500" />
                    <input
                      type="text"
                      value={editForm.socialLinks?.youtube || ''}
                      onChange={(e) => handleSocialChange('youtube', e.target.value)}
                      placeholder="Channel URL"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#0D0D0F] border border-white/10 text-sm text-white focus:border-orbit-gold/50 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle size={16} className="text-gray-500" />
                    <input
                      type="text"
                      value={editForm.socialLinks?.discord || ''}
                      onChange={(e) => handleSocialChange('discord', e.target.value)}
                      placeholder="Discord invite"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#0D0D0F] border border-white/10 text-sm text-white focus:border-orbit-gold/50 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Send size={16} className="text-gray-500" />
                    <input
                      type="text"
                      value={editForm.socialLinks?.telegram || ''}
                      onChange={(e) => handleSocialChange('telegram', e.target.value)}
                      placeholder="Telegram link"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#0D0D0F] border border-white/10 text-sm text-white focus:border-orbit-gold/50 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <Globe size={16} className="text-gray-500" />
                    <input
                      type="text"
                      value={editForm.socialLinks?.website || ''}
                      onChange={(e) => handleSocialChange('website', e.target.value)}
                      placeholder="Your website"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#0D0D0F] border border-white/10 text-sm text-white focus:border-orbit-gold/50 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-3 justify-center sm:justify-start flex-wrap">
                  {profile.socialLinks?.twitter && (
                    <a
                      href={`https://twitter.com/${profile.socialLinks.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/30 transition-all"
                    >
                      <Twitter size={18} />
                    </a>
                  )}
                  {profile.socialLinks?.youtube && (
                    <a
                      href={profile.socialLinks.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-[#FF0000] hover:border-[#FF0000]/30 transition-all"
                    >
                      <Youtube size={18} />
                    </a>
                  )}
                  {profile.socialLinks?.discord && (
                    <a
                      href={profile.socialLinks.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-[#5865F2] hover:border-[#5865F2]/30 transition-all"
                    >
                      <MessageCircle size={18} />
                    </a>
                  )}
                  {profile.socialLinks?.telegram && (
                    <a
                      href={profile.socialLinks.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-[#0088cc] hover:border-[#0088cc]/30 transition-all"
                    >
                      <Send size={18} />
                    </a>
                  )}
                  {profile.socialLinks?.website && (
                    <a
                      href={profile.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-orbit-gold hover:border-orbit-gold/30 transition-all"
                    >
                      <Globe size={18} />
                    </a>
                  )}
                </div>
              )}

              {/* Edit Actions */}
              {isEditing && (
                <div className="mt-4 flex gap-3 justify-center sm:justify-start">
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdits}
                    className="px-4 py-2 rounded-lg bg-orbit-gold hover:bg-orbit-gold-light text-black font-bold transition-colors"
                  >
                    Save Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-hero p-4 border-gradient text-center">
          <Users size={20} className="mx-auto text-orbit-gold mb-2" />
          <p className="text-2xl font-display font-black text-white">
            {profile.stats?.subscribers || 0}
          </p>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Subscribers</p>
        </div>
        
        <div className="card-hero p-4 border-gradient text-center">
          <DollarSign size={20} className="mx-auto text-emerald-400 mb-2" />
          <p className="text-2xl font-display font-black text-white">
            {profile.stats?.totalEarnings || 0}
          </p>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">XLM Earned</p>
        </div>
        
        <div className="card-hero p-4 border-gradient text-center">
          <Zap size={20} className="mx-auto text-purple-400 mb-2" />
          <p className="text-2xl font-display font-black text-white">
            {creatorServices.length}
          </p>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Services</p>
        </div>
        
        <div className="card-hero p-4 border-gradient text-center">
          <Calendar size={20} className="mx-auto text-blue-400 mb-2" />
          <p className="text-lg font-display font-bold text-white">
            {profile.stats?.memberSince 
              ? new Date(profile.stats.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              : 'New'
            }
          </p>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Member Since</p>
        </div>
      </div>

      {/* Services/Subscription Tiers */}
      <div className="card-hero p-6 border-gradient">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Star size={20} className="text-orbit-gold" />
            Subscription Tiers
          </h3>
          {isOwnProfile && (
            <button
              onClick={() => setShowAddTier(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orbit-gold/10 border border-orbit-gold/30 text-orbit-gold text-sm font-medium hover:bg-orbit-gold hover:text-black transition-all"
            >
              <Plus size={16} />
              Add Tier
            </button>
          )}
        </div>

        {/* Add New Tier Form */}
        {isOwnProfile && showAddTier && (
          <div className="mb-6 p-4 rounded-xl bg-white/[0.02] border border-orbit-gold/30">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-white">Create Subscription Tier</h4>
              <button
                onClick={() => {
                  setShowAddTier(false);
                  setNewTier({ name: '', type: '', amount: '', description: '' });
                }}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Tier name (e.g., Basic, Pro, VIP)"
                value={newTier.name}
                onChange={(e) => setNewTier(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white placeholder-gray-500 focus:border-orbit-gold/50 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Type (e.g., Newsletter, Discord)"
                value={newTier.type}
                onChange={(e) => setNewTier(prev => ({ ...prev, type: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white placeholder-gray-500 focus:border-orbit-gold/50 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Price in XLM"
                value={newTier.amount}
                onChange={(e) => setNewTier(prev => ({ ...prev, amount: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white placeholder-gray-500 focus:border-orbit-gold/50 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newTier.description}
                onChange={(e) => setNewTier(prev => ({ ...prev, description: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white placeholder-gray-500 focus:border-orbit-gold/50 focus:outline-none"
              />
            </div>
            {newTier.amount && (
              <p className="mt-2 text-xs text-gray-500">
                ≈ ${convertToUSD ? convertToUSD(newTier.amount) : '---'} USD/month • You receive 98% ({(parseFloat(newTier.amount) * 0.98).toFixed(2)} XLM)
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowAddTier(false);
                  setNewTier({ name: '', type: '', amount: '', description: '' });
                }}
                className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTier}
                className="px-4 py-2 rounded-lg bg-orbit-gold hover:bg-orbit-gold-light text-black font-bold transition-colors"
              >
                Create Tier
              </button>
            </div>
          </div>
        )}

        {creatorServices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {creatorServices.map((service) => (
              <div
                key={service.id}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-orbit-gold/30 transition-all group relative"
              >
                {/* Delete button for own tiers */}
                {isOwnProfile && (
                  <button
                    onClick={() => handleDeleteTier(service.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                    title="Delete tier"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-white group-hover:text-orbit-gold transition-colors">
                      {service.name}
                    </h4>
                    <span className="text-xs text-gray-500">{service.type}</span>
                    {service.description && (
                      <p className="text-xs text-gray-400 mt-1">{service.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-display font-black text-orbit-gold">
                      {service.amount} XLM
                    </p>
                    <p className="text-xs text-gray-500">
                      ~${convertToUSD ? convertToUSD(service.amount) : '---'}/mo
                    </p>
                  </div>
                </div>
                
                {!isOwnProfile && (
                  <button
                    onClick={() => handleSubscribeClick(service)}
                    className="w-full py-2 rounded-lg bg-orbit-gold/10 border border-orbit-gold/30 text-orbit-gold font-medium hover:bg-orbit-gold hover:text-black transition-all"
                  >
                    Subscribe
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Star size={32} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500">
              {isOwnProfile 
                ? "You haven't created any subscription tiers yet" 
                : "This creator hasn't set up subscription tiers yet"
              }
            </p>
            {isOwnProfile && (
              <button
                onClick={() => setShowAddTier(true)}
                className="mt-4 px-4 py-2 rounded-lg bg-orbit-gold/10 border border-orbit-gold/30 text-orbit-gold font-medium hover:bg-orbit-gold hover:text-black transition-all"
              >
                <Plus size={16} className="inline mr-2" />
                Create Your First Tier
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity / Supporters (for own profile) */}
      {isOwnProfile && (
        <div className="card-hero p-6 border-gradient">
          <h3 className="text-lg font-display font-bold text-white flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-emerald-400" />
            Recent Supporters
          </h3>
          <div className="text-center py-8">
            <Users size={32} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500">
              Your supporters will appear here
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Share your profile to start earning
            </p>
          </div>
        </div>
      )}

      {/* Share Profile Card (for own profile) */}
      {isOwnProfile && (
        <div className="card-hero p-6 border-gradient bg-gradient-to-r from-orbit-gold/5 to-transparent">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orbit-gold/20 flex items-center justify-center">
                <Link size={20} className="text-orbit-gold" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white">Your Public Profile</h3>
                <p className="text-sm text-gray-400">Share this link with your audience</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 font-mono text-xs text-gray-400 truncate max-w-xs">
                {getProfileLink().replace(window.location.origin, '').slice(0, 40)}...
              </div>
              <button
                onClick={copyProfileLink}
                className="px-4 py-2 rounded-lg bg-orbit-gold hover:bg-orbit-gold-light text-black font-bold text-sm transition-colors flex items-center gap-2"
              >
                {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                {linkCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !paymentLoading && !connectingWallet && setShowPaymentModal(false)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-md bg-[#14141A] border border-white/10 rounded-2xl p-6 shadow-2xl animate-fade-in">
            {/* Close button */}
            {!paymentLoading && !connectingWallet && (
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            )}

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orbit-gold/20 flex items-center justify-center">
                {!wallet ? <Wallet size={32} className="text-orbit-gold" /> : <Zap size={32} className="text-orbit-gold" />}
              </div>
              <h3 className="text-xl font-display font-bold text-white">
                {!wallet ? 'Connect Wallet to Subscribe' : `Subscribe to ${profile.name}`}
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                {selectedTier.name}
              </p>
            </div>

            {/* Payment Details */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-400">Subscription</span>
                <span className="text-white font-medium">{selectedTier.name}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-400">Amount</span>
                <span className="text-orbit-gold font-display font-bold text-xl">
                  {selectedTier.amount} XLM
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">≈ USD</span>
                <span className="text-gray-400">
                  ${convertToUSD ? convertToUSD(selectedTier.amount) : '---'}
                </span>
              </div>
              <div className="border-t border-white/10 mt-3 pt-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Creator receives (98%)</span>
                  <span className="text-emerald-400">
                    {(selectedTier.amount * 0.98).toFixed(4)} XLM
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="text-gray-500">Platform fee (2%)</span>
                  <span className="text-gray-400">
                    {(selectedTier.amount * 0.02).toFixed(4)} XLM
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {paymentError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {paymentError}
                {paymentError.toLowerCase().includes('insufficient') && (
                  <div className="mt-2 pt-2 border-t border-red-500/20">
                    <p className="text-gray-400 mb-2">Need testnet XLM? Use the Stellar Friendbot:</p>
                    <a
                      href={`https://friendbot.stellar.org/?addr=${wallet?.publicKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 underline text-xs"
                    >
                      <span>🚰</span> Get free testnet XLM from Friendbot
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Actions - Show different buttons based on wallet state */}
            {!wallet ? (
              /* No wallet connected - show connect button */
              <div className="space-y-3">
                <button
                  onClick={handleConnectWalletInModal}
                  disabled={connectingWallet}
                  className="w-full py-3 rounded-xl bg-orbit-gold hover:bg-orbit-gold-light text-black font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {connectingWallet ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wallet size={18} />
                      Connect Freighter Wallet
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={connectingWallet}
                  className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <p className="text-center text-xs text-gray-500">
                  Don't have Freighter?{' '}
                  <a 
                    href="https://freighter.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orbit-gold hover:underline"
                  >
                    Download here
                  </a>
                </p>
              </div>
            ) : (
              /* Wallet connected - show pay button */
              <>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    disabled={paymentLoading}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessPayment}
                    disabled={paymentLoading}
                    className="flex-1 py-3 rounded-xl bg-orbit-gold hover:bg-orbit-gold-light text-black font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {paymentLoading ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap size={18} />
                        Pay {selectedTier.amount} XLM
                      </>
                    )}
                  </button>
                </div>

                {/* Wallet Info */}
                <p className="text-center text-xs text-gray-500 mt-4">
                  Paying from {wallet.publicKey.slice(0, 8)}...{wallet.publicKey.slice(-8)}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CreatorProfile;
