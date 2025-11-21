import React, { useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock, Calendar, CreditCard, ExternalLink, Trash2, Ban } from 'lucide-react';

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
    <div className="card-neumorphic p-6">
      <div className="flex items-center gap-3 mb-6">
        <Activity size={24} className="text-yellow-400" />
        <h3 className="text-yellow-400 font-bold text-lg">Activity</h3>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 mb-6 bg-gray-900/50 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'subscriptions'
              ? 'bg-yellow-500 text-gray-900'
              : 'text-gray-400 hover:text-yellow-400'
          }`}
        >
          Active ({subscriptions.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-yellow-500 text-gray-900'
              : 'text-gray-400 hover:text-yellow-400'
          }`}
        >
          History ({paymentTransactions.length + cancelledSubscriptions.length})
        </button>
      </div>

      {/* Active Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-3">
          {subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={48} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-500 text-sm">No active subscriptions</p>
              <p className="text-gray-600 text-xs mt-1">Subscribe to a service to get started</p>
            </div>
          ) : (
            subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-green-500/30 hover:border-green-500/50 transition-smooth"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-200">{sub.service}</p>
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold">
                        {sub.status}
                      </span>
                    </div>
                    <p className="text-yellow-400 text-sm font-semibold">
                      {sub.amount} XLM/month
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelSubscription(sub.id)}
                    className="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-900/20 rounded-lg"
                    title="Cancel subscription"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-gray-400 text-xs mt-3 pt-3 border-t border-gray-700">
                  <Calendar size={12} />
                  <span>Started: {sub.date}</span>
                </div>
                
                <div className="mt-2 text-gray-500 text-xs">
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
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700 hover:border-yellow-500/50 transition-smooth"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-bold text-gray-200 mb-1">{tx.service}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-yellow-400 text-sm font-semibold">
                      {tx.amount} XLM
                    </p>
                    {tx.usdValue && (
                      <span className="text-gray-500 text-xs">
                        (${tx.usdValue} USD)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {tx.status === 'completed' ? (
                    <CheckCircle size={20} className="text-green-400" />
                  ) : tx.status === 'pending' ? (
                    <Clock size={20} className="text-yellow-400" />
                  ) : (
                    <XCircle size={20} className="text-red-400" />
                  )}
                </div>
              </div>

              <div className="space-y-1 text-xs text-gray-400 mt-3 pt-3 border-t border-gray-700">
                <div className="flex items-center gap-2">
                  <Clock size={12} />
                  <span>{tx.timestamp}</span>
                </div>
                
                {tx.hash && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">TX:</span>
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-400 hover:text-yellow-300 font-mono flex items-center gap-1 hover:underline"
                    >
                      {tx.hash.slice(0, 8)}...{tx.hash.slice(-8)}
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
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-red-500/30 hover:border-red-500/50 transition-smooth"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-200">{sub.service}</p>
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-semibold">
                      Cancelled
                    </span>
                  </div>
                  <p className="text-yellow-400 text-sm font-semibold">
                    {sub.amount} XLM/month
                  </p>
                </div>
                <Ban size={20} className="text-red-400" />
              </div>
              
              <div className="space-y-1 text-xs text-gray-400 mt-3 pt-3 border-t border-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar size={12} />
                  <span>Active: {sub.date} to {sub.endDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={12} />
                  <span>Cancelled: {sub.cancelledAt}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {paymentTransactions.length === 0 && cancelledSubscriptions.length === 0 && (
            <div className="text-center py-8">
              <CreditCard size={48} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-500 text-sm">No transactions yet</p>
              <p className="text-gray-600 text-xs mt-1">Your payment history will appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TransactionFeed;