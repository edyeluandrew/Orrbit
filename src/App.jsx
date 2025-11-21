import React, { useState, useEffect, useCallback } from 'react';
import * as StellarSdk from 'stellar-sdk';
import { Zap } from 'lucide-react';
import WalletConnect from './components/WalletConnect';
import BalanceDisplay from './components/BalanceDisplay';
import SubscriptionForm from './components/SubscriptionForm';
import TransactionFeed from './components/TransactionFeed';
import XLMFaucet from './components/XLMFaucet';

function App() {
  const [wallet, setWallet] = useState(null);
  const [platformWallet, setPlatformWallet] = useState(null);
  const [balance, setBalance] = useState({ xlm: 0 });
  const [transactions, setTransactions] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [lastTxHash, setLastTxHash] = useState(null);

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
    console.log('👛 Wallet connected:', walletData);
    setWallet(walletData);
    setBalance({ xlm: walletData.balance || 0 });
  }, []);

  // ✅ FIXED: Memoized platform wallet connect handler
  const handlePlatformWalletConnect = useCallback((walletData) => {
    console.log('🏦 Platform wallet connected:', walletData);
    setPlatformWallet(walletData);
  }, []);

  // ✅ FIXED: Memoized balance update handler
  const handleBalanceUpdate = useCallback((newBalance) => {
    console.log('💰 Balance updated from network:', newBalance);
    setBalance(newBalance);
  }, []);

  // ✅ FIXED: Direct balance update with useCallback
  const updateBalanceDirectly = useCallback(async () => {
    if (!wallet?.publicKey) return;
    
    try {
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(wallet.publicKey);
      
      const xlmBalance = account.balances.find(balance => balance.asset_type === 'native');
      const balanceValue = xlmBalance ? parseFloat(xlmBalance.balance) : 0;

      console.log('🔗 Direct balance fetch:', balanceValue, 'XLM');
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
        alert(`✅ ${cancelledSub.service} subscription cancelled.`);
        
        return prev.filter(sub => sub.id !== subId);
      }
      
      return prev;
    });
  }, []);

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
    
    // 5. ✅ Fetch real balance after Stellar confirmation time (4 seconds)
    console.log('⏳ Scheduling blockchain balance fetch in 4 seconds...');
    setTimeout(() => {
      updateBalanceDirectly();
    }, 4000);
    
  }, [updateBalanceDirectly]);

  // Calculate stats
  const activeSubscriptionsCount = subscriptions.length;
  const monthlyCost = subscriptions.reduce((total, sub) => total + sub.amount, 0);
  const totalTransactions = transactions.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-200">
      <header className="py-8 shadow-neumorphic-lg border-b border-yellow-500/10 sticky top-0 z-50 bg-gray-800/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Zap size={40} className="text-yellow-400 animate-float" />
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 bg-clip-text text-transparent drop-shadow-lg">
                  Orbit
                </h1>
                <p className="text-yellow-600 text-lg ml-1">
                  Subscription payments on Stellar Testnet
                </p>
              </div>
            </div>
            
            {wallet && (
              <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-yellow-400 font-bold">{activeSubscriptionsCount}</p>
                  <p className="text-gray-400 text-xs">Active Subs</p>
                </div>
                <div className="text-center">
                  <p className="text-green-400 font-bold">{monthlyCost} XLM</p>
                  <p className="text-gray-400 text-xs">Monthly</p>
                </div>
                <div className="text-center">
                  <p className="text-blue-400 font-bold">{totalTransactions}</p>
                  <p className="text-gray-400 text-xs">Transactions</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {!wallet ? (
              <div className="text-center">
                <WalletConnect onConnect={handleWalletConnect} />
              </div>
            ) : (
              <>
                {/* ✅ FIXED: Passing stable, memoized callbacks */}
                <BalanceDisplay 
                  balance={balance} 
                  wallet={wallet}
                  onBalanceUpdate={handleBalanceUpdate}
                  onManualRefresh={updateBalanceDirectly}
                  lastTxHash={lastTxHash}
                />
                
                <div className="space-y-4">
                  {!platformWallet && (
                    <div className="card-neumorphic p-6 bg-blue-900/20 border-blue-500/30">
                      <h3 className="text-blue-400 font-bold text-lg mb-4">Connect Platform Wallet</h3>
                      <p className="text-gray-300 text-sm mb-4">
                        Connect your platform wallet to receive payments from subscribers. 
                      </p>
                      <WalletConnect 
                        onConnect={handlePlatformWalletConnect} 
                        buttonText="Connect Platform Wallet" 
                      />
                    </div>
                  )}
                  
                  {platformWallet && (
                    <div className="card-neumorphic p-4 bg-green-900/20 border-green-500/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-400 text-sm font-semibold">
                            Platform Wallet Connected ✅
                          </p>
                          <p className="text-gray-400 text-xs font-mono mt-1">
                            {platformWallet.publicKey.slice(0, 12)}...{platformWallet.publicKey.slice(-12)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
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
              </>
            )}
          </div>

          <div className="space-y-6">
            {wallet && (
              <>
                <div className="card-neumorphic p-4 bg-gradient-to-br from-gray-800 to-gray-900">
                  <h4 className="text-yellow-400 font-bold text-sm mb-3">Quick Stats</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-yellow-400">{activeSubscriptionsCount}</p>
                      <p className="text-gray-400 text-xs mt-1">Active</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-400">{monthlyCost}</p>
                      <p className="text-gray-400 text-xs mt-1">XLM/mo</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-400">{totalTransactions}</p>
                      <p className="text-gray-400 text-xs mt-1">Total TX</p>
                    </div>
                  </div>
                </div>

                <TransactionFeed 
                  transactions={transactions} 
                  subscriptions={subscriptions} 
                  onCancelSubscription={handleCancelSubscription}
                />
              </>
            )}
            
            {!wallet && (
              <div className="card-neumorphic p-6 text-center">
                <Zap size={48} className="mx-auto text-yellow-400 mb-4 animate-pulse" />
                <h3 className="text-yellow-400 font-bold text-lg mb-2">Welcome to Orbit</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Connect your Freighter wallet to start managing subscriptions.
                </p>
                <div className="space-y-2 text-xs text-gray-400">
                  <p>✨ Pay with XLM - No trustlines needed</p>
                  <p>⚡ Instant transactions on Stellar Testnet</p>
                  <p>🔒 Secure Freighter integration</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-6 mt-12 border-t border-yellow-500/10 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <p className="text-yellow-600 text-sm">
                Built with ⚡ on Stellar Testnet
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Real wallets • Real balances • XLM Payments • Powered by Friendbot
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-400">
              {wallet && (
                <div className="text-center">
                  <p className="text-yellow-400 font-mono">
                    {wallet.publicKey.slice(0, 8)}...{wallet.publicKey.slice(-8)}
                  </p>
                  <p className="text-gray-500">Connected Wallet</p>
                </div>
              )}
              
              {platformWallet && (
                <div className="text-center">
                  <p className="text-green-400 font-mono">
                    {platformWallet.publicKey.slice(0, 8)}...{platformWallet.publicKey.slice(-8)}
                  </p>
                  <p className="text-gray-500">Platform Wallet</p>
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