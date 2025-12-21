import React, { useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock, Calendar, CreditCard, ExternalLink, Trash2, Ban, History } from 'lucide-react';

function TransactionFeed({ transactions, subscriptions, onCancelSubscription }) {
  const [activeTab, setActiveTab] = useState('subscriptions');

  const handleCancelSubscription = (subId) => {
    if (window.confirm('Are you sure you want to cancel this subscription? You will keep access until the end of your billing period.')) {
      if (onCancelSubscription) {
        onCancelSubscription(subId);
      }
    }
  };

  // Separate transactions from subscription cancellations
  const paymentTransactions = transactions.filter(tx => tx.status !== 'cancelled');
  const cancelledSubscriptions = transactions.filter(tx => tx.status === 'cancelled');

  return (
    <div className="card-neumorphic p-5 animate-fade-in border-orbit-gold/10">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-orbit-gold/10 border border-orbit-gold/30 flex items-center justify-center">
          <Activity size={20} className="text-orbit-gold drop-shadow-[0_0_6px_rgba(247,147,26,0.5)]" />
        </div>
        <h3 className="text-white font-display font-bold tracking-wider uppercase">Activity</h3>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl bg-orbit-dark-light border border-orbit-gold/10">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 py-3 px-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
            activeTab === 'subscriptions'
              ? 'bg-orbit-gold text-orbit-dark shadow-[0_0_10px_rgba(247,147,26,0.3)]'
              : 'text-orbit-gray hover:text-white'
          }`}
        >
          Active ({subscriptions.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
            activeTab === 'history'
              ? 'bg-orbit-gold text-orbit-dark shadow-[0_0_10px_rgba(247,147,26,0.3)]'
              : 'text-orbit-gray hover:text-white'
          }`}
        >
          History ({paymentTransactions.length + cancelledSubscriptions.length})
        </button>
      </div>

      {/* Active Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-3">
          {subscriptions.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orbit-dark-light flex items-center justify-center border border-orbit-gold/10">
                <Calendar size={32} className="text-orbit-gray-dark" />
              </div>
              <p className="text-orbit-gray text-base font-medium">No active subscriptions</p>
              <p className="text-orbit-gray-dark text-xs mt-1">Subscribe to a service to get started</p>
            </div>
          ) : (
            subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-xl p-4 border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-white">{sub.service}</p>
                      <span className="badge badge-success text-xs">
                        {sub.status}
                      </span>
                    </div>
                    <p className="text-orbit-gold text-sm font-medium">
                      {sub.amount} XLM/month
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelSubscription(sub.id)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Cancel subscription"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-orbit-gray text-xs mt-3 pt-3 border-t border-white/5">
                  <Calendar size={12} />
                  <span>Started: {sub.date}</span>
                </div>
                
                <div className="mt-1.5 text-orbit-gray-dark text-xs">
                  Next billing: {sub.nextBilling}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Transaction History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {/* Payment Transactions */}
          {paymentTransactions.map((tx) => (
            <div
              key={tx.id}
              className="rounded-xl p-4 border border-white/5 bg-orbit-dark-light hover:border-white/10 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-white mb-1">{tx.service}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-orbit-gold text-sm font-medium">
                      {tx.amount} XLM
                    </p>
                    {tx.usdValue && (
                      <span className="text-orbit-gray-dark text-xs">
                        (${tx.usdValue})
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  {tx.status === 'completed' ? (
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle size={16} className="text-emerald-400" />
                    </div>
                  ) : tx.status === 'pending' ? (
                    <div className="w-7 h-7 rounded-lg bg-orbit-gold/10 flex items-center justify-center">
                      <Clock size={16} className="text-orbit-gold" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <XCircle size={16} className="text-red-400" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-orbit-gray mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Clock size={11} />
                  <span>{tx.timestamp}</span>
                </div>
                
                {tx.hash && (
                  <div className="flex items-center gap-2">
                    <History size={11} />
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orbit-gold hover:text-orbit-gold-light font-mono flex items-center gap-1 transition-colors"
                    >
                      {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Cancelled Subscriptions */}
          {cancelledSubscriptions.map((sub) => (
            <div
              key={sub.id}
              className="rounded-xl p-4 border border-red-500/20 bg-red-500/5 hover:border-red-500/30 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white">{sub.service}</p>
                    <span className="badge badge-error text-xs">
                      Cancelled
                    </span>
                  </div>
                  <p className="text-orbit-gold text-sm font-medium">
                    {sub.amount} XLM/month
                  </p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Ban size={16} className="text-red-400" />
                </div>
              </div>
              
              <div className="space-y-1 text-xs text-orbit-gray mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Calendar size={11} />
                  <span>Active: {sub.date} to {sub.endDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={11} />
                  <span>Cancelled: {sub.cancelledAt}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {paymentTransactions.length === 0 && cancelledSubscriptions.length === 0 && (
            <div className="text-center py-10">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-orbit-dark-light flex items-center justify-center">
                <CreditCard size={28} className="text-orbit-gray-dark" />
              </div>
              <p className="text-orbit-gray text-sm">No transactions yet</p>
              <p className="text-orbit-gray-dark text-xs mt-1">Your payment history will appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TransactionFeed;