import React from 'react';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Clock, 
  CreditCard, 
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  RefreshCcw,
  DollarSign,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { Avatar } from './Avatar';

const STATUS_CONFIG = {
  completed: {
    label: 'Completed',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    icon: Check,
  },
  pending: {
    label: 'Pending',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    icon: Clock,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    icon: X,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
    icon: RefreshCcw,
  },
};

const TYPE_CONFIG = {
  subscription: {
    label: 'Subscription Payment',
    icon: CreditCard,
    color: 'text-purple-400',
  },
  payment: {
    label: 'One-time Payment',
    icon: Zap,
    color: 'text-blue-400',
  },
  tip: {
    label: 'Tip',
    icon: DollarSign,
    color: 'text-emerald-400',
  },
  received: {
    label: 'Payment Received',
    icon: ArrowDownLeft,
    color: 'text-green-400',
  },
  sent: {
    label: 'Payment Sent',
    icon: ArrowUpRight,
    color: 'text-amber-400',
  },
  cancellation: {
    label: 'Subscription Cancelled',
    icon: RefreshCcw,
    color: 'text-red-400',
  },
};

/**
 * Transaction details modal with full info and Stellar explorer link
 */
function TransactionModal({
  isOpen,
  onClose,
  transaction,
  network = 'testnet', // 'testnet' | 'pubnet'
}) {
  const [copied, setCopied] = useState({ hash: false, address: false });
  
  if (!isOpen || !transaction) return null;
  
  const status = STATUS_CONFIG[transaction.status] || STATUS_CONFIG.completed;
  const type = TYPE_CONFIG[transaction.type] || TYPE_CONFIG.payment;
  const StatusIcon = status.icon;
  const TypeIcon = type.icon;
  
  const explorerBase = network === 'testnet' 
    ? 'https://stellar.expert/explorer/testnet'
    : 'https://stellar.expert/explorer/public';
  
  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [field]: true }));
    setTimeout(() => {
      setCopied(prev => ({ ...prev, [field]: false }));
    }, 2000);
  };
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#12121A] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">Transaction Details</h3>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Amount and Status */}
          <div className="text-center py-4">
            <p className="text-4xl font-black text-orbit-gold mb-1">
              {transaction.amount} XLM
            </p>
            {transaction.usdValue && (
              <p className="text-sm text-orbit-gray">≈ ${transaction.usdValue}</p>
            )}
            
            {/* Status badge */}
            <div className={`
              inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full
              ${status.bgColor} ${status.borderColor} border
            `}>
              <StatusIcon size={14} className={status.color} />
              <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
            </div>
          </div>
          
          {/* Details */}
          <div className="space-y-4">
            {/* Type */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-orbit-gray">Type</span>
              <div className={`flex items-center gap-2 ${type.color}`}>
                <TypeIcon size={16} />
                <span className="text-sm font-medium">{type.label}</span>
              </div>
            </div>
            
            {/* Service/Recipient */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-orbit-gray">
                {transaction.type === 'received' ? 'From' : 'To'}
              </span>
              <div className="flex items-center gap-2">
                <Avatar 
                  address={transaction.recipientAddress || transaction.service}
                  name={transaction.service}
                  size={24}
                  rounded="full"
                />
                <span className="text-sm font-medium text-white">
                  {transaction.service || 'Unknown'}
                </span>
              </div>
            </div>
            
            {/* Date */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-orbit-gray">Date</span>
              <span className="text-sm text-white">{transaction.timestamp || transaction.date}</span>
            </div>
            
            {/* Transaction Hash */}
            {transaction.hash && (
              <div className="pt-3 border-t border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-orbit-gray">Transaction Hash</span>
                  <button
                    onClick={() => copyToClipboard(transaction.hash, 'hash')}
                    className="flex items-center gap-1 text-xs text-orbit-gray hover:text-white transition-colors"
                  >
                    {copied.hash ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copied.hash ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="font-mono text-xs text-white/70 break-all bg-white/5 p-2 rounded-lg">
                  {transaction.hash}
                </p>
              </div>
            )}
            
            {/* Recipient Address */}
            {transaction.recipientAddress && (
              <div className="pt-3 border-t border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-orbit-gray">Recipient Address</span>
                  <button
                    onClick={() => copyToClipboard(transaction.recipientAddress, 'address')}
                    className="flex items-center gap-1 text-xs text-orbit-gray hover:text-white transition-colors"
                  >
                    {copied.address ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copied.address ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="font-mono text-xs text-white/70 break-all bg-white/5 p-2 rounded-lg">
                  {transaction.recipientAddress}
                </p>
              </div>
            )}
            
            {/* Fee info */}
            {transaction.fee && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-orbit-gray">Network Fee</span>
                <span className="text-white">{transaction.fee} XLM</span>
              </div>
            )}
            
            {transaction.platformFee && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-orbit-gray">Platform Fee (2%)</span>
                <span className="text-white">{transaction.platformFee} XLM</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer with Explorer Link */}
        {transaction.hash && (
          <div className="p-5 pt-0">
            <a
              href={`${explorerBase}/tx/${transaction.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
            >
              <ExternalLink size={18} />
              View on Stellar Expert
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default TransactionModal;
