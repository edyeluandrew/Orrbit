import React, { useState } from 'react';
import { 
  Zap, 
  Wallet, 
  User, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Youtube,
  Music,
  Palette,
  BookOpen,
  Globe,
  Shield,
  Coins,
  Users
} from 'lucide-react';

const Onboarding = ({ onComplete, onConnectWallet, onCreateProfile, wallet }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState(null);
  const [creatorProfile, setCreatorProfile] = useState({
    name: '',
    category: '',
  });

  const steps = [
    { id: 'welcome', title: 'Welcome' },
    { id: 'wallet', title: 'Connect Wallet' },
    { id: 'role', title: 'Choose Role' },
    { id: 'setup', title: 'Quick Setup' },
    { id: 'ready', title: 'Ready!' },
  ];

  const categories = [
    { id: 'youtube', label: 'YouTube / Video', icon: Youtube },
    { id: 'music', label: 'Music / Audio', icon: Music },
    { id: 'art', label: 'Art / Design', icon: Palette },
    { id: 'writing', label: 'Writing / Blog', icon: BookOpen },
    { id: 'other', label: 'Other', icon: Globe },
  ];

  const handleNext = () => {
    // Skip wallet step if already connected
    if (currentStep === 0 && wallet) {
      setCurrentStep(2); // Go to role selection
    } else if (currentStep === 1 && wallet) {
      setCurrentStep(2);
    } else if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      // Skip wallet step when going back if already connected
      if (currentStep === 2 && wallet) {
        setCurrentStep(0);
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  const handleComplete = () => {
    // Create profile using the new profile system
    if (onCreateProfile && selectedRole) {
      const profileData = {
        displayName: selectedRole === 'creator' ? creatorProfile.name : '',
        creatorData: selectedRole === 'creator' ? {
          category: creatorProfile.category,
        } : undefined,
      };
      onCreateProfile(selectedRole, profileData);
    }
    
    // Save onboarding completion flag
    const onboardingData = {
      completedAt: new Date().toISOString(),
      role: selectedRole,
    };
    localStorage.setItem('orbit-onboarding', JSON.stringify(onboardingData));
    
    onComplete(onboardingData);
  };

  const handleSkip = () => {
    // Create a basic subscriber profile if skipping
    if (onCreateProfile) {
      onCreateProfile('subscriber', {});
    }
    localStorage.setItem('orbit-onboarding', JSON.stringify({ 
      skippedAt: new Date().toISOString() 
    }));
    onComplete({ skipped: true, role: 'subscriber' });
  };

  // Step 0: Welcome
  const WelcomeStep = () => (
    <div className="text-center space-y-8">
      {/* Hero Logo */}
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-orbit-gold/30 blur-3xl rounded-full" />
        <div className="relative w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-orbit-gold/30 to-orbit-gold/10 border border-orbit-gold/40 flex items-center justify-center">
          <Zap size={48} className="text-orbit-gold" />
        </div>
      </div>

      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-display font-black tracking-wide text-white">
          Welcome to <span className="text-gradient-gold">ORBIT</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-lg mx-auto">
          The decentralized subscription platform built on Stellar
        </p>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <Coins className="w-8 h-8 text-orbit-gold mx-auto mb-2" />
          <h3 className="font-semibold text-white">Low Fees</h3>
          <p className="text-sm text-gray-500">Only 2% platform fee</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <Zap className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <h3 className="font-semibold text-white">Instant Payments</h3>
          <p className="text-sm text-gray-500">5-second settlements</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <h3 className="font-semibold text-white">Non-Custodial</h3>
          <p className="text-sm text-gray-500">You control your funds</p>
        </div>
      </div>

      {/* Testnet Notice */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-amber-400 text-sm font-medium">
          Running on Stellar Testnet — No real money involved
        </span>
      </div>
    </div>
  );

  // Step 1: Connect Wallet
  const WalletStep = () => (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 flex items-center justify-center">
          <Wallet size={40} className="text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-white">Connect Your Wallet</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          You'll need a Stellar wallet to send and receive payments. We recommend Freighter — it's free and takes 30 seconds to set up.
        </p>
      </div>

      {wallet?.publicKey ? (
        <div className="space-y-4">
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle className="text-emerald-400" size={24} />
            <div className="text-left">
              <p className="text-emerald-400 font-semibold">Wallet Connected!</p>
              <p className="text-sm text-gray-400 font-mono">
                {wallet.publicKey.slice(0, 8)}...{wallet.publicKey.slice(-8)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Install Freighter */}
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] max-w-md mx-auto">
            <h3 className="font-semibold text-white mb-3">Don't have a wallet yet?</h3>
            <ol className="text-left text-sm text-gray-400 space-y-2 mb-4">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orbit-gold/20 text-orbit-gold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <span>Install the Freighter browser extension</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orbit-gold/20 text-orbit-gold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <span>Create a new wallet (save your recovery phrase!)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orbit-gold/20 text-orbit-gold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <span>Come back here and click Connect</span>
              </li>
            </ol>
            <a
              href="https://www.freighter.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
            >
              Get Freighter <ExternalLink size={14} />
            </a>
          </div>

          {/* Connect Button */}
          <button
            onClick={onConnectWallet}
            className="px-8 py-4 rounded-xl bg-orbit-gold hover:bg-orbit-gold-light text-black font-bold text-lg transition-all duration-200 hover:scale-105"
          >
            Connect Freighter Wallet
          </button>
        </div>
      )}
    </div>
  );

  // Step 2: Choose Role
  const RoleStep = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-white">How will you use Orbit?</h2>
        <p className="text-gray-400">Choose your primary role — you can always do both!</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {/* Creator Option */}
        <button
          onClick={() => setSelectedRole('creator')}
          className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.02] ${
            selectedRole === 'creator'
              ? 'bg-orbit-gold/10 border-orbit-gold'
              : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
            selectedRole === 'creator' 
              ? 'bg-orbit-gold/20' 
              : 'bg-white/[0.05]'
          }`}>
            <Sparkles size={28} className={selectedRole === 'creator' ? 'text-orbit-gold' : 'text-gray-400'} />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${selectedRole === 'creator' ? 'text-orbit-gold' : 'text-white'}`}>
            I'm a Creator
          </h3>
          <p className="text-gray-400 text-sm">
            Accept subscriptions and tips from your fans. Set up tiers, share your profile, and get paid instantly.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-500">
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              Create subscription tiers
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              Shareable profile link
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              98% of every payment
            </li>
          </ul>
        </button>

        {/* Subscriber Option */}
        <button
          onClick={() => setSelectedRole('subscriber')}
          className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.02] ${
            selectedRole === 'subscriber'
              ? 'bg-blue-500/10 border-blue-500'
              : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
            selectedRole === 'subscriber' 
              ? 'bg-blue-500/20' 
              : 'bg-white/[0.05]'
          }`}>
            <Users size={28} className={selectedRole === 'subscriber' ? 'text-blue-400' : 'text-gray-400'} />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${selectedRole === 'subscriber' ? 'text-blue-400' : 'text-white'}`}>
            I'm a Supporter
          </h3>
          <p className="text-gray-400 text-sm">
            Support your favorite creators with crypto subscriptions. Fast payments, low fees.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-500">
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              Subscribe to creators
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              Pay with XLM
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              Track your subscriptions
            </li>
          </ul>
        </button>
      </div>
    </div>
  );

  // Step 3: Quick Setup (for creators)
  const SetupStep = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-white">
          {selectedRole === 'creator' ? 'Set Up Your Profile' : 'Get Some Testnet XLM'}
        </h2>
        <p className="text-gray-400">
          {selectedRole === 'creator' 
            ? 'Let\'s get the basics ready — you can customize more later'
            : 'You\'ll need XLM to make payments on Stellar'}
        </p>
      </div>

      {selectedRole === 'creator' ? (
        <div className="max-w-md mx-auto space-y-6">
          {/* Creator Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Creator Name *
            </label>
            <input
              type="text"
              value={creatorProfile.name}
              onChange={(e) => setCreatorProfile({ ...creatorProfile, name: e.target.value })}
              placeholder="e.g., CryptoArtist, MusicMaker..."
              className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-gray-500 focus:border-orbit-gold/50 focus:ring-1 focus:ring-orbit-gold/50 outline-none transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Content Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCreatorProfile({ ...creatorProfile, category: cat.id })}
                  className={`p-3 rounded-xl border text-sm flex items-center gap-2 transition-all ${
                    creatorProfile.category === cat.id
                      ? 'bg-orbit-gold/10 border-orbit-gold text-orbit-gold'
                      : 'bg-white/[0.02] border-white/[0.08] text-gray-400 hover:border-white/20'
                  }`}
                >
                  <cat.icon size={16} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {creatorProfile.name && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-sm text-gray-500 mb-2">Preview</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orbit-gold/30 to-purple-500/30 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {creatorProfile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-white">{creatorProfile.name}</p>
                  <p className="text-sm text-gray-500">
                    {categories.find(c => c.id === creatorProfile.category)?.label || 'Creator'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Subscriber - Get testnet XLM */
        <div className="max-w-md mx-auto space-y-6">
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <h3 className="font-semibold text-white mb-4">Get Free Testnet XLM</h3>
            <p className="text-gray-400 text-sm mb-4">
              Since we're on testnet, you can get free XLM from Stellar's Friendbot to test payments.
            </p>
            {wallet?.publicKey && (
              <a
                href={`https://friendbot.stellar.org/?addr=${wallet.publicKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                <span>🚰</span> Get 10,000 Testnet XLM
                <ExternalLink size={14} />
              </a>
            )}
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-emerald-400 text-sm">
              <strong>Tip:</strong> After getting XLM, you can browse creators and subscribe to test the platform!
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // Step 4: Ready!
  const ReadyStep = () => (
    <div className="text-center space-y-8">
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-emerald-500/30 blur-3xl rounded-full" />
        <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
          <CheckCircle size={48} className="text-emerald-400" />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-white">You're All Set!</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          {selectedRole === 'creator'
            ? 'Your creator profile is ready. Add subscription tiers and share your profile link to start earning!'
            : 'You\'re ready to explore and support creators on Orbit!'}
        </p>
      </div>

      {/* Quick Tips */}
      <div className="max-w-md mx-auto">
        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] text-left">
          <h3 className="font-semibold text-white mb-4">Quick Start Tips</h3>
          {selectedRole === 'creator' ? (
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-gold/20 text-orbit-gold text-xs flex items-center justify-center flex-shrink-0">1</span>
                <span>Go to your <strong className="text-white">Profile</strong> tab to add subscription tiers</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-gold/20 text-orbit-gold text-xs flex items-center justify-center flex-shrink-0">2</span>
                <span>Click <strong className="text-white">Share Profile</strong> to get your public link</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-gold/20 text-orbit-gold text-xs flex items-center justify-center flex-shrink-0">3</span>
                <span>Share it with your audience to start receiving subscriptions!</span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center flex-shrink-0">1</span>
                <span>Get testnet XLM from Friendbot (if you haven't)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center flex-shrink-0">2</span>
                <span>Visit a creator's profile link to subscribe</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center flex-shrink-0">3</span>
                <span>Track your subscriptions in the <strong className="text-white">Payments</strong> tab</span>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0: return WelcomeStep();
      case 1: return WalletStep();
      case 2: return RoleStep();
      case 3: return SetupStep();
      case 4: return ReadyStep();
      default: return WelcomeStep();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true;
      case 1: return !!wallet;
      case 2: return !!selectedRole;
      case 3: 
        if (selectedRole === 'creator') return creatorProfile.name.trim().length > 0;
        return true;
      case 4: return true;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex flex-col">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-radial from-orbit-gold/[0.03] via-transparent to-transparent" />
      <div className="fixed top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="fixed bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <header className="relative z-10 py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orbit-gold/30 to-orbit-gold/10 border border-orbit-gold/30 flex items-center justify-center">
              <Zap size={20} className="text-orbit-gold" />
            </div>
            <span className="text-xl font-display font-bold tracking-wider text-white">ORBIT</span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
              Testnet
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="relative z-10 px-4 mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    idx < currentStep 
                      ? 'bg-emerald-500 text-white' 
                      : idx === currentStep 
                        ? 'bg-orbit-gold text-black' 
                        : 'bg-white/[0.05] text-gray-500'
                  }`}
                >
                  {idx < currentStep ? <CheckCircle size={16} /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-12 sm:w-24 h-0.5 mx-1 ${
                    idx < currentStep ? 'bg-emerald-500' : 'bg-white/[0.08]'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            {steps.map((step, idx) => (
              <span key={step.id} className={`${idx === currentStep ? 'text-white' : ''}`}>
                {step.title}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="relative z-10 flex-1 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {renderStep()}
        </div>
      </main>

      {/* Navigation */}
      <footer className="relative z-10 py-6 px-4 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              currentStep === 0
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <ArrowLeft size={18} />
            Back
          </button>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orbit-gold hover:bg-orbit-gold-light text-black font-bold transition-all hover:scale-105"
            >
              Get Started
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                canProceed()
                  ? 'bg-orbit-gold hover:bg-orbit-gold-light text-black hover:scale-105'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {currentStep === 1 && !wallet ? 'Connect First' : 'Continue'}
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default Onboarding;
