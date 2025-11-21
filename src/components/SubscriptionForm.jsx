import { useState } from 'react';
import { Check, CreditCard, X, Loader, Bot, Brain, Globe, Server, Music, Video, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import * as StellarSdk from 'stellar-sdk';
import { isConnected, signTransaction } from '@stellar/freighter-api';
import { usePriceConverter } from '../hooks/usePriceConverter';

function SubscriptionForm({ wallet, platformWallet, onSubscribe, onPayment }) {
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get XLM/USD conversion
  const { xlmPrice, change24h, convertToUSD, loading: priceLoading } = usePriceConverter();

  const services = [
    { id: 1, name: 'GPT Pro', type: 'AI', amount: 20, IconComponent: Bot },
    { id: 2, name: 'Claude', type: 'AI', amount: 18, IconComponent: Brain },
    { id: 3, name: 'Namecheap', type: 'Domain', amount: 5, IconComponent: Globe },
    { id: 4, name: 'GoDaddy', type: 'Hosting', amount: 10, IconComponent: Server },
    { id: 5, name: 'Spotify', type: 'Music', amount: 7, IconComponent: Music },
    { id: 6, name: 'Netflix', type: 'Video', amount: 12, IconComponent: Video },
  ];

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

  const handleProcessPayment = async (service) => {
    if (!wallet?.publicKey) {
      setError('No wallet connected');
      return;
    }

    if (!platformWallet?.publicKey) {
      setError('Platform wallet not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      
      // Load sender account to get current sequence number
      const senderAccount = await server.loadAccount(wallet.publicKey);
      
      // Build XLM payment transaction to platform wallet
      const transaction = new StellarSdk.TransactionBuilder(senderAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: platformWallet.publicKey,
            asset: StellarSdk.Asset.native(), // XLM
            amount: service.amount.toString(),
          })
        )
        .addMemo(StellarSdk.Memo.text(`Payment for ${service.name}`))
        .setTimeout(180)
        .build();

      // Check if Freighter is connected
      const connected = await isConnected();
      if (!connected.isConnected) {
        throw new Error('Freighter wallet not connected');
      }

      // Sign transaction with Freighter
      console.log('Signing XLM payment transaction...');
      const signedResult = await signTransaction(transaction.toXDR(), {
        networkPassphrase: StellarSdk.Networks.TESTNET,
      });

      if (signedResult.error) {
        throw new Error(signedResult.error);
      }

      // Extract signed XDR
      const signedXDR = signedResult.signedTxXdr;

      // Reconstruct and submit transaction
      const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
        signedXDR,
        StellarSdk.Networks.TESTNET
      );

      console.log('Submitting XLM payment...');
      const result = await server.submitTransaction(signedTransaction);
      console.log('Payment submitted! Transaction hash:', result.hash);

      // Wait for transaction to be confirmed on blockchain
      console.log('Waiting for transaction confirmation...');
      await waitForTransactionConfirmation(server, result.hash);
      console.log('Transaction confirmed!');

      // Create transaction record
      const transactionRecord = {
        id: Date.now(),
        service: service.name,
        amount: service.amount,
        usdValue: convertToUSD(service.amount),
        status: 'completed',
        hash: result.hash,
        timestamp: new Date().toLocaleString(),
      };
      
      // Create subscription record
      const subscriptionRecord = {
        id: Date.now() + 1, // Different ID from transaction
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
      
      setSelectedService(null);
      
      // Force a small delay to ensure balance updates
      setTimeout(() => {
        // This will trigger the balance refresh in App.jsx
        if (wallet?.publicKey) {
          // The refreshTrigger will force BalanceDisplay to refetch
        }
      }, 3000);
      
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-neumorphic p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-yellow-400 flex items-center gap-3">
          <CreditCard size={32} /> Services
        </h2>
        
        {/* XLM Price Display */}
        {!priceLoading && xlmPrice && (
          <div className="bg-gray-900/50 rounded-xl px-4 py-2 border border-gray-700">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-yellow-400" />
              <span className="text-gray-400 text-xs">1 XLM =</span>
              <span className="text-yellow-400 font-bold text-sm">${xlmPrice}</span>
              {change24h !== 0 && (
                <span className={`text-xs flex items-center gap-1 ${change24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {change24h > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(change24h).toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border-2 border-red-500/50 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map(service => {
          const IconComponent = service.IconComponent;
          const usdEquivalent = convertToUSD(service.amount);
          
          return (
            <div
              key={service.id}
              onClick={() => setSelectedService(service)}
              className={`bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 rounded-2xl p-6 cursor-pointer transition-smooth hover:scale-105 ${
                selectedService?.id === service.id 
                  ? 'border-yellow-500 shadow-glow-gold' 
                  : 'border-yellow-600/30 hover:border-yellow-500/50 shadow-neumorphic'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="mb-3 text-yellow-400 animate-float">
                    <IconComponent size={48} />
                  </div>
                  <p className="font-bold text-gray-200 text-lg">{service.name}</p>
                  <p className="text-xs text-yellow-600 font-semibold mt-1 uppercase tracking-wider">
                    {service.type}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-yellow-400 font-bold text-2xl">{service.amount} XLM</p>
                  {xlmPrice && (
                    <p className="text-gray-400 text-sm mt-1">
                      ≈ ${usdEquivalent} USD
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-yellow-600">/month</p>

              {selectedService?.id === service.id && (
                <div className="mt-6 pt-6 border-t-2 border-yellow-500/20 space-y-3">
                  {/* Subscribe Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubscribe(service);
                    }}
                    disabled={loading}
                    className="w-full btn-gold py-3 px-4 rounded-xl font-bold transition-smooth flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader size={18} className="animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <Check size={18} /> Subscribe
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
                    className="w-full bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 disabled:opacity-50 text-yellow-400 font-bold py-3 px-4 rounded-xl transition-smooth shadow-neumorphic border-2 border-yellow-500/30 hover:border-yellow-500 hover:shadow-glow-gold flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader size={18} className="animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} /> Pay {service.amount} XLM (${usdEquivalent})
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
                    className="w-full bg-gray-800/80 hover:bg-gray-800 text-yellow-600 font-semibold py-2 px-4 rounded-xl transition-smooth shadow-neumorphic border border-yellow-600/30 hover:border-yellow-600 flex items-center justify-center gap-2"
                  >
                    <X size={18} /> Close
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SubscriptionForm;