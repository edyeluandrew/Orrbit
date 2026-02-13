import React, { useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock, Calendar, CreditCard, ExternalLink, Trash2, Ban } from 'lucide-react';

function TransactionFeed({ transactions, subscriptions, onCancelSubscription }) {
  const [tab, setTab] = useState('active');

  const cancelSub = (id) => {
    if (window.confirm('Cancel this subscription?')) {
      onCancelSubscription?.(id);
    }
  };

  const payments = transactions.filter(tx => tx.status !== 'cancelled');
  const cancelled = transactions.filter(tx => tx.status === 'cancelled');
  const historyCount = payments.length + cancelled.length;

  const StatusIcon = ({ status }) => {
    const config = {
      completed: { bg: 'bg-emerald-500/10', icon: CheckCircle, color: 'text-emerald-400' },
      pending: { bg: 'bg-amber-500/10', icon: Clock, color: 'text-amber-400' },
      failed: { bg: 'bg-red-500/10', icon: XCircle, color: 'text-red-400' }
    };
    const { bg, icon: Icon, color } = config[status] || config.failed;
    return (
      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon size={14} className={color} />
      </div>
    );
  };

  return (
    <div className="card-glass p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Activity size={18} className="text-purple-400" />
        </div>
        <h3 className="text-white font-semibold">Activity</h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg bg-white/5">
        {[
          { id: 'active', label: `Active (${subscriptions.length})` },
          { id: 'history', label: `History (${historyCount})` }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              tab === t.id ? 'bg-white/10 text-white' : 'text-orbit-gray hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active Subscriptions */}
      {tab === 'active' && (
        <div className="space-y-2">
          {subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={24} className="mx-auto mb-2 text-orbit-gray" />
              <p className="text-sm text-orbit-gray">No active subscriptions</p>
            </div>
          ) : (
            subscriptions.map(sub => (
              <div key={sub.id} className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{sub.service}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-orbit-gold mt-0.5">{sub.amount} XLM/mo</p>
                  </div>
                  <button
                    onClick={() => cancelSub(sub.id)}
                    className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-orbit-gray flex justify-between">
                  <span>Since {sub.date}</span>
                  <span>Next: {sub.nextBilling}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="space-y-2">
          {historyCount === 0 ? (
            <div className="text-center py-8">
              <CreditCard size={24} className="mx-auto mb-2 text-orbit-gray" />
              <p className="text-sm text-orbit-gray">No transactions yet</p>
            </div>
          ) : (
            <>
              {payments.map(tx => (
                <div key={tx.id} className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{tx.service}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-orbit-gold">{tx.amount} XLM</span>
                        {tx.usdValue && <span className="text-[10px] text-orbit-gray">(${tx.usdValue})</span>}
                      </div>
                    </div>
                    <StatusIcon status={tx.status} />
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-orbit-gray">
                    <span>{tx.timestamp}</span>
                    {tx.hash && (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orbit-gold hover:underline flex items-center gap-1"
                      >
                        {tx.hash.slice(0, 6)}...
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {cancelled.map(sub => (
                <div key={sub.id} className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{sub.service}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                          Cancelled
                        </span>
                      </div>
                      <p className="text-xs text-orbit-gray mt-0.5">{sub.amount} XLM/mo</p>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Ban size={14} className="text-red-400" />
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-orbit-gray">
                    Cancelled {sub.cancelledAt}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default TransactionFeed;