import { useState, useEffect } from 'react';
import { Check, CreditCard, X, Loader, Bot, Brain, Globe, Server, Music, Video, DollarSign, TrendingUp, TrendingDown, Sparkles, AlertCircle, Split } from 'lucide-react';
import * as StellarSdk from 'stellar-sdk';
import { isConnected, signTransaction as freighterSignTransaction } from '@stellar/freighter-api';
import { usePriceConverter } from '../hooks/usePriceConverter';
import { useToast } from '../context/ToastContext';

const PLATFORM_FEE_PERCENT = 2; // 2% platform fee

// Icon mapping for dynamic services
const iconMap = {
  AI: { Icon: Bot, color: 'from-emerald-500/20 to-emerald-600/10', iconColor: 'text-emerald-400' },
  Domain: { Icon: Globe, color: 'from-orange-500/20 to-orange-600/10', iconColor: 'text-orange-400' },
  Hosting: { Icon: Server, color: 'from-blue-500/20 to-blue-600/10', iconColor: 'text-blue-400' },
  Music: { Icon: Music, color: 'from-green-500/20 to-green-600/10', iconColor: 'text-green-400' },
  Video: { Icon: Video, color: 'from-red-500/20 to-red-600/10', iconColor: 'text-red-400' },
  default: { Icon: CreditCard, color: 'from-purple-500/20 to-purple-600/10', iconColor: 'text-purple-400' },
};

function SubscriptionForm({ wallet, platformWallet, onSubscribe, onPayment }) {
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [services, setServices] = useState([]);
  const toast = useToast();
  
  // Get XLM/USD conversion
  const { xlmPrice, change24h, convertToUSD, loading: priceLoading } = usePriceConverter();

  // Load services from localStorage (managed by ServiceProviderManager)
  useEffect(() => {
    const loadServices = () => {
      const saved = localStorage.getItem('orbit-service-providers');
      if (saved) {
        const providers = JSON.parse(saved);
        // Map providers to services with icons
        const mappedServices = providers
          .filter(p => p.active)
          .map(p => {
            const iconData = iconMap[p.type] || iconMap.default;
            return {
              id: p.id,
              name: p.name,
              type: p.type,
              amount: p.amount,
              walletAddress: p.walletAddress,
              IconComponent: iconData.Icon,
              color: iconData.color,
              iconColor: iconData.iconColor,
            };
          });
        setServices(mappedServices);
      } else {
        // Default services if none configured
        setServices([
          { id: 1, name: 'GPT Pro', type: 'AI', amount: 20, IconComponent: Bot, color: 'from-emerald-500/20 to-emerald-600/10', iconColor: 'text-emerald-400' },
          { id: 2, name: 'Claude', type: 'AI', amount: 18, IconComponent: Brain, color: 'from-purple-500/20 to-purple-600/10', iconColor: 'text-purple-400' },
          { id: 3, name: 'Namecheap', type: 'Domain', amount: 5, IconComponent: Globe, color: 'from-orange-500/20 to-orange-600/10', iconColor: 'text-orange-400' },
          { id: 4, name: 'GoDaddy', type: 'Hosting', amount: 10, IconComponent: Server, color: 'from-blue-500/20 to-blue-600/10', iconColor: 'text-blue-400' },
          { id: 5, name: 'Spotify', type: 'Music', amount: 7, IconComponent: Music, color: 'from-green-500/20 to-green-600/10', iconColor: 'text-green-400' },
          { id: 6, name: 'Netflix', type: 'Video', amount: 12, IconComponent: Video, color: 'from-red-500/20 to-red-600/10', iconColor: 'text-red-400' },
        ]);
      }
    };
    
    loadServices();
    
    // Listen for storage changes
    window.addEventListener('storage', loadServices);
    return () => window.removeEventListener('storage', loadServices);
  }, []);

  // Calculate payment split
  const calculateSplit = (amount) => {
    const platformFee = amount * PLATFORM_FEE_PERCENT / 100;
    const providerPayout = amount - platformFee;
    return { platformFee, providerPayout };
  };

  // Wait for transaction to be confirmed on blockchain
  const waitForTransactionConfirmation = async (server, hash, maxRetries = 30) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const transaction = await server.transactions().transaction(hash).call();
        if (transaction.successful) {
          console.log('Transaction confirmed on blockchain:', hash);
          return true;
        }
      } catch (error) {
        // Transaction not found yet, wait and retry
        console.log(`Waiting for transaction confirmation... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
    }
    throw new Error('Transaction confirmation timeout');
  };

  const handleSubscribe = async (service) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Create subscription object
      const subscription = {
        id: Date.now(),
        service: service.name,
        amount: service.amount,
        status: 'active',
        date: new Date().toLocaleDateString(),
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
      };
      
      onSubscribe(subscription);
      setSelectedService(null);
    } catch (err) {
      console.error('Subscription failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check if already paid this month for a service
  const hasAlreadyPaidThisMonth = (serviceId) => {
    const payments = JSON.parse(localStorage.getItem('orbit-payments') || '[]');
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return payments.some(payment => {
      const paymentDate = new Date(payment.timestamp || payment.date);
      return payment.serviceId === serviceId && 
             paymentDate.getMonth() === currentMonth && 
             paymentDate.getFullYear() === currentYear &&
             payment.status === 'completed';
    });
  };

  // Get wallet balance (try multiple sources)
  const getWalletBalance = () => {
    // Check various places where balance might be stored
    if (wallet?.balance !== undefined && wallet.balance !== null) {
      return parseFloat(wallet.balance);
    }
    // Fallback: check localStorage
    const storedBalance = localStorage.getItem('orbit-wallet-balance');
    if (storedBalance) {
      return parseFloat(storedBalance);
    }
    return 0;
  };

  const handleProcessPayment = async (service) => {
    if (!wallet?.publicKey) {
      setError('No wallet connected');
      return;
    }

    if (!platformWallet?.publicKey) {
      setError('Platform wallet not connected');
      return;
    }

    // PRE-CHECK 1: Check if already paid this month
    if (hasAlreadyPaidThisMonth(service.id)) {
      const errorMsg = `You've already paid for ${service.name} this month!`;
      setError(errorMsg);
      toast.warning('Already Paid', errorMsg);
      return;
    }

    // PRE-CHECK 2: Check balance before attempting transaction
    const currentBalance = getWalletBalance();
    const requiredAmount = service.amount + 0.001; // Amount + estimated fee
    
    if (currentBalance > 0 && currentBalance < requiredAmount) {
      const errorMsg = `Insufficient balance. You have ${currentBalance.toFixed(2)} XLM but need ${requiredAmount.toFixed(2)} XLM`;
      setError(errorMsg);
      toast.error('Insufficient Balance', errorMsg);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      
      // Load sender account to get current sequence number
      const senderAccount = await server.loadAccount(wallet.publicKey);
      
      // Verify balance from blockchain (most accurate)
      const xlmBalance = senderAccount.balances.find(b => b.asset_type === 'native');
      const blockchainBalance = xlmBalance ? parseFloat(xlmBalance.balance) : 0;
      
      if (blockchainBalance < requiredAmount) {
        throw new Error(`Insufficient balance. You have ${blockchainBalance.toFixed(2)} XLM but need ${requiredAmount.toFixed(2)} XLM`);
      }
      
      // Calculate payment split
      const { platformFee, providerPayout } = calculateSplit(service.amount);
      
      // Build transaction with split payments
      const txBuilder = new StellarSdk.TransactionBuilder(senderAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      });
      
      // Operation 1: Platform fee to platform wallet
      txBuilder.addOperation(
        StellarSdk.Operation.payment({
          destination: platformWallet.publicKey,
          asset: StellarSdk.Asset.native(), // XLM
          amount: platformFee.toFixed(7),
        })
      );
      
      // Operation 2: Provider payout (if wallet is configured)
      if (service.walletAddress && service.walletAddress.startsWith('G')) {
        try {
          // Verify provider wallet exists
          await server.loadAccount(service.walletAddress);
          
          txBuilder.addOperation(
            StellarSdk.Operation.payment({
              destination: service.walletAddress,
              asset: StellarSdk.Asset.native(),
              amount: providerPayout.toFixed(7),
            })
          );
        } catch (providerErr) {
          console.warn('Provider wallet not found, sending full amount to platform');
          // If provider wallet doesn't exist, add remaining to platform
          txBuilder.addOperation(
            StellarSdk.Operation.payment({
              destination: platformWallet.publicKey,
              asset: StellarSdk.Asset.native(),
              amount: providerPayout.toFixed(7),
            })
          );
        }
      } else {
        // No provider wallet configured, platform gets full amount
        txBuilder.addOperation(
          StellarSdk.Operation.payment({
            destination: platformWallet.publicKey,
            asset: StellarSdk.Asset.native(),
            amount: providerPayout.toFixed(7),
          })
        );
      }
      
      const transaction = txBuilder
        .addMemo(StellarSdk.Memo.text(`${service.name} subscription`))
        .setTimeout(180)
        .build();

      let signedTransaction;
      
      // Sign with Freighter
      console.log('Signing with Freighter...');
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

      signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
        signedResult.signedTxXdr,
        StellarSdk.Networks.TESTNET
      );

      console.log('Submitting split payment...');
      const result = await server.submitTransaction(signedTransaction);
      console.log('Payment submitted! Transaction hash:', result.hash);

      // Wait for transaction to be confirmed on blockchain
      console.log('Waiting for transaction confirmation...');
      await waitForTransactionConfirmation(server, result.hash);
      console.log('Transaction confirmed!');

      // Create transaction record
      const transactionRecord = {
        id: Date.now(),
        serviceId: service.id, // For duplicate payment tracking
        service: service.name,
        serviceName: service.name,
        amount: service.amount,
        platformFee: platformFee,
        providerPayout: providerPayout,
        usdValue: convertToUSD(service.amount),
        status: 'completed',
        hash: result.hash,
        timestamp: new Date().toISOString(),
        providerWallet: service.walletAddress || null,
      };
      
      // Save to payment history for admin dashboard
      const savedHistory = localStorage.getItem('orbit-payment-history');
      const paymentHistory = savedHistory ? JSON.parse(savedHistory) : [];
      paymentHistory.push(transactionRecord);
      localStorage.setItem('orbit-payment-history', JSON.stringify(paymentHistory));
      
      // Also save to orbit-payments for duplicate checking
      const savedPayments = localStorage.getItem('orbit-payments');
      const payments = savedPayments ? JSON.parse(savedPayments) : [];
      payments.push(transactionRecord);
      localStorage.setItem('orbit-payments', JSON.stringify(payments));
      
      // Create subscription record
      const subscriptionRecord = {
        id: Date.now() + 1, // Different ID from transaction
        serviceId: service.id,
        service: service.name,
        amount: service.amount,
        status: 'active',
        date: new Date().toLocaleDateString(),
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        paymentTxHash: result.hash
      };
      
      // Call both callbacks - this will trigger balance refresh
      onPayment(transactionRecord);
      onSubscribe(subscriptionRecord);
      
      // Show success toast with split info
      const { platformFee: fee } = calculateSplit(service.amount);
      toast.success(
        'Payment Confirmed',
        `${service.amount} XLM paid for ${service.name} (${PLATFORM_FEE_PERCENT}% fee: ${fee.toFixed(4)} XLM)`
      );
      
      setSelectedService(null);
      
    } catch (err) {
      console.error('Payment failed:', err);
      
      let errorMessage = 'Payment failed';
      
      if (err.message?.includes('User declined') || err.message?.includes('rejected')) {
        errorMessage = 'Transaction was rejected. Please approve in Freighter.';
      } else if (err.message?.includes('op_underfunded')) {
        errorMessage = 'Insufficient XLM balance for this payment.';
      } else if (err.message?.includes('not connected')) {
        errorMessage = 'Freighter wallet not connected.';
      } else if (err.message?.includes('confirmation timeout')) {
        errorMessage = 'Transaction is taking longer than expected to confirm. Please check your balance in a few moments.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      toast.error('Payment Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-neumorphic p-6 sm:p-8 animate-fade-in border-orbit-gold/10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orbit-gold/10 border border-orbit-gold/30 flex items-center justify-center">
            <Sparkles size={24} className="text-orbit-gold drop-shadow-[0_0_8px_rgba(247,147,26,0.5)]" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white tracking-wider uppercase">Services</h2>
        </div>
        
        {/* XLM Price Display */}
        {!priceLoading && xlmPrice && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-orbit-dark-light border border-orbit-gold/20">
            <DollarSign size={18} className="text-orbit-gold" />
            <div className="flex items-center gap-2">
              <span className="text-orbit-gray text-sm font-medium uppercase tracking-wide">1 XLM =</span>
              <span className="text-white font-bold text-lg">${xlmPrice}</span>
              {change24h !== 0 && (
                <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded-lg font-semibold ${change24h > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                  {change24h > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(change24h).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-base font-medium animate-slide-up">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map(service => {
          const IconComponent = service.IconComponent;
          const usdEquivalent = convertToUSD(service.amount);
          const isSelected = selectedService?.id === service.id;
          const { platformFee, providerPayout } = calculateSplit(service.amount);
          const alreadyPaid = hasAlreadyPaidThisMonth(service.id);
          
          return (
            <div
              key={service.id}
              onClick={() => !alreadyPaid && setSelectedService(service)}
              className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 border ${
                alreadyPaid
                  ? 'border-emerald-500/30 bg-emerald-500/5 cursor-not-allowed'
                  : isSelected 
                    ? 'border-orbit-gold/50 shadow-glow-gold-sm scale-[1.02] cursor-pointer' 
                    : 'border-white/5 hover:border-white/10 cursor-pointer'
              } bg-gradient-to-br ${service.color}`}
            >
              {/* Background glow for selected */}
              {isSelected && !alreadyPaid && (
                <div className="absolute inset-0 bg-orbit-gold/5 animate-pulse" />
              )}
              
              {/* Already paid badge */}
              {alreadyPaid && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1 font-semibold">
                    <Check size={10} />
                    Paid this month
                  </div>
                </div>
              )}
              
              {/* No wallet warning badge */}
              {!service.walletAddress && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs flex items-center gap-1">
                    <AlertCircle size={10} />
                    No wallet
                  </div>
                </div>
              )}
              
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-xl bg-orbit-dark-light/50 border border-white/10 flex items-center justify-center ${service.iconColor}`}>
                      <IconComponent size={28} />
                    </div>
                    <div>
                      <p className="font-display font-bold text-white text-xl tracking-wide">{service.name}</p>
                      <span className="text-sm text-orbit-gray uppercase tracking-widest font-semibold">
                        {service.type}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-orbit-gold font-display font-bold text-3xl tracking-wide">{service.amount} XLM</p>
                    {xlmPrice && (
                      <p className="text-white text-lg mt-1 font-bold">
                        ≈ <span className="text-emerald-400">${usdEquivalent}</span> USD
                      </p>
                    )}
                  </div>
                  <span className="text-orbit-gray-dark text-sm font-semibold uppercase tracking-wide">/month</span>
                </div>

                {isSelected && (
                  <div className="mt-5 pt-5 border-t border-white/10 space-y-3 animate-slide-up">
                    {/* Payment Split Info */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-orbit-dark/50 text-sm">
                      <div className="flex items-center gap-2 text-orbit-gray">
                        <Split size={14} />
                        <span>Payment Split:</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400">{platformFee.toFixed(4)} fee</span>
                        <span className="text-orbit-gray mx-2">+</span>
                        <span className="text-blue-400">{providerPayout.toFixed(4)} payout</span>
                      </div>
                    </div>
                    
                    {/* Subscribe Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubscribe(service);
                      }}
                      disabled={loading}
                      className="w-full btn-gold py-3.5 px-4 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(247,147,26,0.3)]"
                    >
                      {loading ? (
                        <>
                          <Loader size={18} className="animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Check size={18} />
                          <span>Subscribe</span>
                        </>
                      )}
                    </button>

                    {/* Process Payment Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProcessPayment(service);
                      }}
                      disabled={loading}
                      className="w-full py-3.5 px-4 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 bg-orbit-dark-light border-2 border-orbit-gold/40 text-orbit-gold hover:bg-orbit-gold/10 hover:border-orbit-gold/70 hover:shadow-[0_0_15px_rgba(247,147,26,0.2)]"
                    >
                      {loading ? (
                        <>
                          <Loader size={18} className="animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard size={18} />
                          <span>Pay {service.amount} XLM</span>
                        </>
                      )}
                    </button>

                    {/* Close Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedService(null);
                        setError(null);
                      }}
                      className="w-full py-3 px-4 rounded-xl font-semibold uppercase tracking-wide transition-all flex items-center justify-center gap-2 text-orbit-gray hover:text-white hover:bg-white/5"
                    >
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SubscriptionForm;