import React, { useState, useEffect } from 'react';
import {
  User,
  Wallet,
  Copy,
  Check,
  Edit2,
  Save,
  X,
  CreditCard,
  Calendar,
  TrendingUp,
  Heart,
  Star,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { usePriceConverter } from '../hooks/usePriceConverter';

function SubscriberProfile({ 
  wallet, 
  userProfile,
  onUpdateProfile,
  subscriptions = [],
  transactions = [],
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
  });
  
  const toast = useToast();
  const { convertToUSD, xlmPrice } = usePriceConverter();

  // Load edit form from profile
  useEffect(() => {
    if (userProfile) {
      setEditForm({
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
      });
    }
  }, [userProfile]);

  const copyWalletAddress = () => {
    if (wallet?.publicKey) {
      navigator.clipboard.writeText(wallet.publicKey);
      setCopied(true);
      toast.success('Copied', 'Wallet address copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    if (onUpdateProfile) {
      onUpdateProfile({
        displayName: editForm.displayName,
        bio: editForm.bio,
      });
      toast.success('Profile Saved', 'Your profile has been updated');
    }
    setIsEditing(false);
  };

  // Calculate stats
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const totalSpent = transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const memberSince = userProfile?.createdAt 
    ? new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Recently';

  const displayName = userProfile?.displayName || `User ${wallet?.publicKey?.slice(0, 6) || ''}`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Header */}
      <div className="card-glass p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
            <User size={36} className="text-blue-400" />
          </div>

          {/* Info */}
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                placeholder="Your display name"
                className="text-xl font-bold text-white bg-transparent border-b border-white/20 focus:border-blue-400 outline-none w-full"
              />
            ) : (
              <h2 className="text-xl font-bold text-white">{displayName}</h2>
            )}
            
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">Subscriber</span>
              <span className="text-xs text-orbit-gray">Member since {memberSince}</span>
            </div>

            {/* Wallet Address */}
            <button
              onClick={copyWalletAddress}
              className="mt-2 flex items-center gap-2 text-xs text-orbit-gray hover:text-white transition-colors"
            >
              <Wallet size={12} />
              <span className="font-mono">{wallet?.publicKey?.slice(0, 8)}...{wallet?.publicKey?.slice(-8)}</span>
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
          </div>

          {/* Edit Button */}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  <Save size={18} />
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 rounded-lg bg-white/5 text-orbit-gray hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-lg bg-white/5 text-orbit-gray hover:text-white transition-colors"
              >
                <Edit2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Bio */}
        {isEditing ? (
          <textarea
            value={editForm.bio}
            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
            placeholder="Tell us about yourself..."
            rows={2}
            className="mt-4 w-full p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-orbit-gray focus:border-blue-400 outline-none resize-none"
          />
        ) : userProfile?.bio ? (
          <p className="mt-4 text-sm text-orbit-gray">{userProfile.bio}</p>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-glass p-4 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Heart size={18} className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{activeSubscriptions}</p>
          <p className="text-xs text-orbit-gray">Active Subs</p>
        </div>
        
        <div className="card-glass p-4 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{totalSpent.toFixed(1)}</p>
          <p className="text-xs text-orbit-gray">XLM Spent</p>
        </div>
        
        <div className="card-glass p-4 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Star size={18} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{transactions.length}</p>
          <p className="text-xs text-orbit-gray">Payments</p>
        </div>
      </div>

      {/* Active Subscriptions */}
      {subscriptions.length > 0 && (
        <div className="card-glass p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-blue-400" />
            Your Subscriptions
          </h3>
          
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div 
                key={sub.id}
                className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-white">{sub.service}</p>
                  <p className="text-xs text-orbit-gray">Since {sub.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-orbit-gold">{sub.amount} XLM</p>
                  <p className="text-xs text-orbit-gray">/month</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {subscriptions.length === 0 && (
        <div className="card-glass p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Heart size={28} className="text-blue-400" />
          </div>
          <h3 className="text-white font-semibold mb-2">No Subscriptions Yet</h3>
          <p className="text-sm text-orbit-gray max-w-sm mx-auto">
            Browse creators and subscribe to support your favorites with crypto payments.
          </p>
        </div>
      )}
    </div>
  );
}

export default SubscriberProfile;
