import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, AlertTriangle, Wallet, Percent, 
  Globe, Shield, Plus, Trash2, Check, RefreshCw,
  ExternalLink, Copy, Eye, EyeOff
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

function SettingsPanel() {
  const toast = useToast();
  
  // Settings state
  const [settings, setSettings] = useState({
    platformWallet: '',
    platformFeePercent: 2,
    network: 'testnet',
    adminWallets: [],
  });
  
  const [newAdminWallet, setNewAdminWallet] = useState('');
  const [showPlatformWallet, setShowPlatformWallet] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load settings from env/localStorage
  useEffect(() => {
    const platformWallet = import.meta.env.VITE_PLATFORM_WALLET || '';
    const platformFeePercent = parseFloat(import.meta.env.VITE_PLATFORM_FEE_PERCENT) || 2;
    const network = import.meta.env.VITE_NETWORK || 'testnet';
    const adminWalletsStr = import.meta.env.VITE_ADMIN_WALLETS || '';
    const adminWallets = adminWalletsStr.split(',').map(w => w.trim()).filter(Boolean);

    // Check for localStorage overrides
    const savedSettings = localStorage.getItem('orbit-settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings({
        platformWallet: parsed.platformWallet || platformWallet,
        platformFeePercent: parsed.platformFeePercent ?? platformFeePercent,
        network: parsed.network || network,
        adminWallets: parsed.adminWallets || adminWallets,
      });
    } else {
      setSettings({
        platformWallet,
        platformFeePercent,
        network,
        adminWallets,
      });
    }
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const addAdminWallet = () => {
    if (!newAdminWallet.trim()) return;
    
    // Validate Stellar address format
    if (!newAdminWallet.startsWith('G') || newAdminWallet.length !== 56) {
      toast.error('Invalid Wallet', 'Stellar addresses start with G and are 56 characters');
      return;
    }
    
    if (settings.adminWallets.includes(newAdminWallet.trim())) {
      toast.warning('Already Added', 'This wallet is already an admin');
      return;
    }
    
    setSettings(prev => ({
      ...prev,
      adminWallets: [...prev.adminWallets, newAdminWallet.trim()]
    }));
    setNewAdminWallet('');
    setHasChanges(true);
  };

  const removeAdminWallet = (wallet) => {
    if (settings.adminWallets.length <= 1) {
      toast.error('Cannot Remove', 'You must have at least one admin wallet');
      return;
    }
    
    setSettings(prev => ({
      ...prev,
      adminWallets: prev.adminWallets.filter(w => w !== wallet)
    }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setSaving(true);
    
    try {
      // Save to localStorage (env variables can't be changed at runtime)
      localStorage.setItem('orbit-settings', JSON.stringify(settings));
      
      // Show success
      toast.success('Settings Saved', 'Changes saved locally. Restart app to apply fully.');
      setHasChanges(false);
    } catch (error) {
      toast.error('Save Failed', error.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied', 'Wallet address copied to clipboard');
  };

  const resetToDefaults = () => {
    localStorage.removeItem('orbit-settings');
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-wider flex items-center gap-3">
            <Settings className="text-orbit-gold" />
            Platform Settings
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Configure platform fees, wallets, and network settings
          </p>
        </div>
        
        {hasChanges && (
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orbit-gold text-black font-medium hover:bg-orbit-gold/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Save Changes
          </button>
        )}
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-yellow-400 font-medium">Environment Variables</p>
          <p className="text-gray-400 text-sm mt-1">
            Some settings are loaded from your <code className="text-yellow-400">.env</code> file. 
            Changes made here are saved locally and may need a server restart to take full effect.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Wallet */}
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
            <Wallet size={20} className="text-orbit-gold" />
            Platform Wallet
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            This wallet receives the platform fee from all transactions.
          </p>
          
          <div className="relative">
            <input
              type={showPlatformWallet ? 'text' : 'password'}
              value={settings.platformWallet}
              onChange={(e) => handleChange('platformWallet', e.target.value)}
              className="w-full px-4 py-3 pr-24 rounded-lg bg-[#0D0D0F] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-orbit-gold/50"
              placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={() => setShowPlatformWallet(!showPlatformWallet)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                {showPlatformWallet ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={() => copyToClipboard(settings.platformWallet)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
          
          {settings.platformWallet && (
            <a
              href={`https://stellar.expert/explorer/${settings.network}/account/${settings.platformWallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm text-orbit-gold hover:underline"
            >
              View on Stellar Expert
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        {/* Platform Fee */}
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
            <Percent size={20} className="text-orbit-gold" />
            Platform Fee
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Percentage fee collected from each transaction.
          </p>
          
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={settings.platformFeePercent}
              onChange={(e) => handleChange('platformFeePercent', parseFloat(e.target.value))}
              className="flex-1 accent-orbit-gold"
            />
            <div className="w-20 text-center">
              <span className="text-2xl font-display font-bold text-orbit-gold">
                {settings.platformFeePercent}%
              </span>
            </div>
          </div>
          
          <div className="mt-4 p-3 rounded-lg bg-[#0D0D0F] border border-white/5">
            <p className="text-gray-400 text-sm">
              <span className="text-white">Example:</span> For a 100 XLM payment:
            </p>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-emerald-400">Platform receives: {settings.platformFeePercent} XLM</span>
              <span className="text-blue-400">Provider receives: {100 - settings.platformFeePercent} XLM</span>
            </div>
          </div>
        </div>

        {/* Network */}
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
            <Globe size={20} className="text-orbit-gold" />
            Network
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Select Stellar network for transactions.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={() => handleChange('network', 'testnet')}
              className={`flex-1 py-3 px-4 rounded-xl border transition-all ${
                settings.network === 'testnet'
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-[#0D0D0F] border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {settings.network === 'testnet' && <Check size={16} />}
                <span className="font-medium">Testnet</span>
              </div>
              <p className="text-xs mt-1 opacity-70">For development</p>
            </button>
            
            <button
              onClick={() => handleChange('network', 'mainnet')}
              className={`flex-1 py-3 px-4 rounded-xl border transition-all ${
                settings.network === 'mainnet'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-[#0D0D0F] border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {settings.network === 'mainnet' && <Check size={16} />}
                <span className="font-medium">Mainnet</span>
              </div>
              <p className="text-xs mt-1 opacity-70">Real XLM</p>
            </button>
          </div>
          
          {settings.network === 'mainnet' && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">
                Mainnet uses real XLM. Ensure your wallets are funded before switching.
              </p>
            </div>
          )}
        </div>

        {/* Admin Wallets */}
        <div className="bg-[#14141A] border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
            <Shield size={20} className="text-orbit-gold" />
            Admin Wallets
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Wallets that can access the admin panel.
          </p>
          
          {/* Add new admin */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newAdminWallet}
              onChange={(e) => setNewAdminWallet(e.target.value)}
              placeholder="GXXXXXXX..."
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#0D0D0F] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-orbit-gold/50"
            />
            <button
              onClick={addAdminWallet}
              className="px-4 py-2.5 rounded-lg bg-orbit-gold/20 text-orbit-gold border border-orbit-gold/30 hover:bg-orbit-gold/30 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          
          {/* Admin list */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {settings.adminWallets.map((wallet, idx) => (
              <div 
                key={wallet}
                className="flex items-center justify-between gap-2 p-3 rounded-lg bg-[#0D0D0F] border border-white/5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Shield size={14} className="text-orbit-gold flex-shrink-0" />
                  <span className="text-white font-mono text-sm truncate">
                    {wallet.slice(0, 12)}...{wallet.slice(-8)}
                  </span>
                  {idx === 0 && (
                    <span className="px-2 py-0.5 rounded text-xs bg-orbit-gold/20 text-orbit-gold">
                      Primary
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyToClipboard(wallet)}
                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => removeAdminWallet(wallet)}
                    className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#14141A] border border-red-500/30 rounded-xl p-6">
        <h3 className="text-lg font-display font-bold text-red-400 mb-4">
          Danger Zone
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Reset to Defaults</p>
            <p className="text-gray-400 text-sm">
              Clear all local settings and reload from .env file
            </p>
          </div>
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
          >
            Reset Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
