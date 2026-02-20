import React, { useState } from 'react';
import { 
  Zap, 
  Wallet, 
  User, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Shield,
  Coins,
  Camera,
  Sparkles
} from 'lucide-react';

/**
 * Simplified Onboarding - No role selection
 * Users become creators when they create tiers, subscribers when they subscribe
 */
const OnboardingSimple = ({ onComplete, onConnectWallet, onCreateProfile, wallet }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState({
    displayName: '',
    avatar: null,
  });

  // Simplified steps - no role selection
  const steps = wallet 
    ? [
        { id: 'welcome', title: 'Welcome' },
        { id: 'profile', title: 'Your Profile' },
        { id: 'ready', title: 'Ready!' },
      ]
    : [
        { id: 'welcome', title: 'Welcome' },
        { id: 'wallet', title: 'Connect Wallet' },
        { id: 'profile', title: 'Your Profile' },
        { id: 'ready', title: 'Ready!' },
      ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Create profile
    if (onCreateProfile) {
      onCreateProfile('user', {
        displayName: profile.displayName || `User_${wallet?.publicKey?.slice(-6) || 'anon'}`,
        avatar: profile.avatar,
      });
    }
    
    // Save onboarding completion
    const onboardingData = {
      completedAt: new Date().toISOString(),
    };
    localStorage.setItem('orbit-onboarding', JSON.stringify(onboardingData));
    
    onComplete(onboardingData);
  };

  const handleSkip = () => {
    // Create minimal profile
    if (onCreateProfile) {
      onCreateProfile('user', {
        displayName: `User_${wallet?.publicKey?.slice(-6) || 'anon'}`,
      });
    }
    localStorage.setItem('orbit-onboarding', JSON.stringify({ 
      skippedAt: new Date().toISOString() 
    }));
    onComplete({ skipped: true });
  };

  const canProceed = () => {
    const step = steps[currentStep];
    if (step.id === 'wallet') return !!wallet;
    return true;
  };

  // Step: Welcome
  const WelcomeStep = () => (
    <div className="text-center space-y-8">
      {/* Hero Logo */}
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-orbit-gold/30 blur-3xl rounded-full" />
        <div className="relative w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-orbit-gold/30 to-orbit-gold/10 border border-orbit-gold/40 flex items-center justify-center overflow-hidden">
          <img src="/orbit-logo.png" alt="Orbit" className="w-16 h-16 object-contain" />
        </div>
      </div>

      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-display font-black tracking-wide text-white">
          Welcome to <span className="text-gradient-gold">ORBIT</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-lg mx-auto">
          The crypto payment layer for content creators on YouTube, Discord, Telegram & more
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
          <h3 className="font-semibold text-white">Streaming Payments</h3>
          <p className="text-sm text-gray-500">Real-time payment flow</p>
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
          Stellar Testnet — No real money
        </span>
      </div>
    </div>
  );

  // Step: Connect Wallet
  const WalletStep = () => (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 flex items-center justify-center">
          <Wallet size={40} className="text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-white">Connect Your Wallet</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Connect a Stellar wallet to start supporting creators or earning
        </p>
      </div>

      {wallet?.publicKey ? (
        <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle className="text-emerald-400" size={24} />
          <div className="text-left">
            <p className="text-emerald-400 font-semibold">Wallet Connected!</p>
            <p className="text-sm text-gray-400 font-mono">
              {wallet.publicKey.slice(0, 8)}...{wallet.publicKey.slice(-8)}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <button
            onClick={onConnectWallet}
            className="px-8 py-4 rounded-xl bg-orbit-gold hover:bg-orbit-gold-light text-black font-bold text-lg transition-all duration-200 hover:scale-105"
          >
            Connect Wallet
          </button>
          
          <div className="text-sm text-gray-500">
            <a
              href="https://www.freighter.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
            >
              Get Freighter wallet <ExternalLink size={12} />
            </a>
            {' or '}
            <a
              href="https://lobstr.co"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
            >
              LOBSTR <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  );

  // Step: Profile Setup (optional)
  const ProfileStep = () => (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 flex items-center justify-center">
          <User size={40} className="text-purple-400" />
        </div>
        <h2 className="text-3xl font-bold text-white">Set Up Your Profile</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Add a name so creators know who you are (optional)
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-6">
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orbit-gold/20 to-purple-500/20 border-2 border-white/10 flex items-center justify-center overflow-hidden">
              {profile.avatar ? (
                <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-gray-500" />
              )}
            </div>
            <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
              <Camera size={14} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-400 text-left">Display Name</label>
          <input
            type="text"
            value={profile.displayName}
            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
            placeholder={`User_${wallet?.publicKey?.slice(-6) || 'anon'}`}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] focus:border-orbit-gold/50 text-white placeholder:text-gray-600 outline-none transition-colors"
            maxLength={30}
          />
          <p className="text-xs text-gray-600 text-left">
            Leave blank to stay anonymous
          </p>
        </div>
      </div>
    </div>
  );

  // Step: Ready
  const ReadyStep = () => (
    <div className="text-center space-y-8">
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-emerald-500/30 blur-3xl rounded-full" />
        <div className="relative w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
          <CheckCircle size={48} className="text-emerald-400" />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-white">You're All Set!</h2>
        <p className="text-xl text-gray-400 max-w-lg mx-auto">
          Start exploring creators or set up your own payment page
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto pt-4">
        <div className="p-5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-left">
          <Sparkles className="w-6 h-6 text-blue-400 mb-2" />
          <h3 className="font-semibold text-white mb-1">Discover Creators</h3>
          <p className="text-sm text-gray-400">
            Browse and support creators you love
          </p>
        </div>
        <div className="p-5 rounded-xl bg-orbit-gold/10 border border-orbit-gold/30 text-left">
          <Coins className="w-6 h-6 text-orbit-gold mb-2" />
          <h3 className="font-semibold text-white mb-1">Start Earning</h3>
          <p className="text-sm text-gray-400">
            Set up your creator page in Profile
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    const step = steps[currentStep];
    switch (step.id) {
      case 'welcome': return <WelcomeStep />;
      case 'wallet': return <WalletStep />;
      case 'profile': return <ProfileStep />;
      case 'ready': return <ReadyStep />;
      default: return <WelcomeStep />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-orbit-gold/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orbit-gold/30 to-orbit-gold/10 border border-orbit-gold/30 flex items-center justify-center overflow-hidden">
              <img src="/orbit-logo.png" alt="Orbit" className="w-7 h-7 object-contain" />
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
            Skip
          </button>
        </div>
      </header>

      {/* Progress Dots */}
      <div className="relative z-10 px-4 mb-8">
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, idx) => (
            <div 
              key={step.id}
              className={`w-2 h-2 rounded-full transition-all ${
                idx < currentStep 
                  ? 'bg-emerald-500' 
                  : idx === currentStep 
                    ? 'bg-orbit-gold w-6' 
                    : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="relative z-10 flex-1 px-4 pb-8 flex items-center">
        <div className="max-w-4xl mx-auto w-full">
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
              Continue
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default OnboardingSimple;
