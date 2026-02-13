import React from 'react';
import { 
  Inbox, 
  CreditCard, 
  Users, 
  Heart, 
  Search, 
  Wallet,
  Zap,
  Star,
  TrendingUp,
  Bell,
} from 'lucide-react';

const ILLUSTRATIONS = {
  transactions: {
    icon: CreditCard,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  subscriptions: {
    icon: Heart,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
  },
  creators: {
    icon: Users,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
  search: {
    icon: Search,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
  },
  wallet: {
    icon: Wallet,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
  activity: {
    icon: Zap,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  favorites: {
    icon: Star,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
  earnings: {
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  notifications: {
    icon: Bell,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  default: {
    icon: Inbox,
    color: 'text-gray-400',
    bgColor: 'bg-white/5',
    borderColor: 'border-white/10',
  },
};

/**
 * Empty state component with illustrations
 */
function EmptyState({
  type = 'default',
  title,
  description,
  action,
  actionLabel,
  icon: CustomIcon,
  className = '',
  size = 'default', // 'small' | 'default' | 'large'
}) {
  const illustration = ILLUSTRATIONS[type] || ILLUSTRATIONS.default;
  const Icon = CustomIcon || illustration.icon;
  
  const sizes = {
    small: {
      container: 'p-4',
      iconWrapper: 'w-10 h-10 mb-2',
      iconSize: 20,
      title: 'text-sm',
      description: 'text-xs',
    },
    default: {
      container: 'p-6',
      iconWrapper: 'w-16 h-16 mb-4',
      iconSize: 28,
      title: 'text-base',
      description: 'text-sm',
    },
    large: {
      container: 'p-10',
      iconWrapper: 'w-20 h-20 mb-6',
      iconSize: 36,
      title: 'text-lg',
      description: 'text-base',
    },
  };
  
  const sizeConfig = sizes[size];

  return (
    <div className={`text-center ${sizeConfig.container} ${className}`}>
      {/* Animated Icon Container */}
      <div className="relative inline-flex">
        {/* Glow effect */}
        <div className={`absolute inset-0 ${illustration.bgColor} blur-xl rounded-full animate-pulse`} />
        
        {/* Icon wrapper */}
        <div className={`
          relative ${sizeConfig.iconWrapper} rounded-2xl 
          ${illustration.bgColor} border ${illustration.borderColor}
          flex items-center justify-center
          mx-auto
        `}>
          <Icon size={sizeConfig.iconSize} className={illustration.color} />
        </div>
      </div>
      
      {/* Title */}
      {title && (
        <h3 className={`${sizeConfig.title} font-semibold text-white mb-2`}>
          {title}
        </h3>
      )}
      
      {/* Description */}
      {description && (
        <p className={`${sizeConfig.description} text-orbit-gray max-w-xs mx-auto`}>
          {description}
        </p>
      )}
      
      {/* Action Button */}
      {action && actionLabel && (
        <button
          onClick={action}
          className={`
            mt-4 px-4 py-2 rounded-lg
            ${illustration.bgColor} ${illustration.color}
            border ${illustration.borderColor}
            hover:bg-opacity-20 transition-all
            text-sm font-medium
          `}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Preset empty states for common scenarios
 */
export const EmptyTransactions = ({ onAction }) => (
  <EmptyState
    type="transactions"
    title="No Transactions Yet"
    description="Your transaction history will appear here after your first payment"
    action={onAction}
    actionLabel="Browse Creators"
  />
);

export const EmptySubscriptions = ({ onAction }) => (
  <EmptyState
    type="subscriptions"
    title="No Active Subscriptions"
    description="Subscribe to your favorite creators and support them with crypto"
    action={onAction}
    actionLabel="Find Creators"
  />
);

export const EmptyCreators = ({ onAction }) => (
  <EmptyState
    type="creators"
    title="No Creators Found"
    description="Be the first to discover amazing creators on Orbit"
    action={onAction}
    actionLabel="Add Creator"
  />
);

export const EmptySearch = ({ query }) => (
  <EmptyState
    type="search"
    title="No Results"
    description={query ? `No creators found for "${query}"` : "Try searching for a creator name or category"}
  />
);

export const EmptyWallet = ({ onAction }) => (
  <EmptyState
    type="wallet"
    title="Connect Your Wallet"
    description="Connect your Stellar wallet to start subscribing to creators"
    action={onAction}
    actionLabel="Connect Wallet"
  />
);

export const EmptyFavorites = ({ onAction }) => (
  <EmptyState
    type="favorites"
    title="No Favorites Yet"
    description="Star your favorite creators to access them quickly"
    action={onAction}
    actionLabel="Browse Creators"
  />
);

export const EmptyNotifications = () => (
  <EmptyState
    type="notifications"
    title="All Caught Up"
    description="You have no new notifications"
    size="small"
  />
);

export default EmptyState;
