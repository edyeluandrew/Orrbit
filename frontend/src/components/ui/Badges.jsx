import React from 'react';
import { 
  Shield, 
  Star, 
  Zap, 
  Crown, 
  Award, 
  CheckCircle, 
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Heart,
  Flame,
} from 'lucide-react';
import Tooltip from './Tooltip';

// Badge definitions
const BADGE_DEFINITIONS = {
  // Verification badges
  verified: {
    icon: CheckCircle,
    label: 'Verified',
    description: 'Identity verified by Orbit',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
  },
  official: {
    icon: Shield,
    label: 'Official',
    description: 'Official Orbit partner',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
  },
  
  // Achievement badges
  topCreator: {
    icon: Crown,
    label: 'Top Creator',
    description: 'Top 1% of creators by subscribers',
    color: 'text-orbit-gold',
    bgColor: 'bg-orbit-gold/20',
    borderColor: 'border-orbit-gold/30',
  },
  risingstar: {
    icon: TrendingUp,
    label: 'Rising Star',
    description: 'Fastest growing creator this month',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/30',
  },
  earlyAdopter: {
    icon: Zap,
    label: 'Early Adopter',
    description: 'Joined during beta',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
  },
  
  // Milestone badges
  '100subs': {
    icon: Users,
    label: '100 Subs',
    description: 'Reached 100 subscribers',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30',
  },
  '1000subs': {
    icon: Star,
    label: '1K Subs',
    description: 'Reached 1,000 subscribers',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
  },
  '100xlm': {
    icon: DollarSign,
    label: '100 XLM',
    description: 'Earned 100 XLM',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
  },
  
  // Engagement badges
  streak: {
    icon: Flame,
    label: 'Hot Streak',
    description: '30-day posting streak',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
  },
  supporter: {
    icon: Heart,
    label: 'Super Supporter',
    description: 'Subscribed to 10+ creators',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
  },
  veteran: {
    icon: Calendar,
    label: 'Veteran',
    description: '1 year on Orbit',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20',
    borderColor: 'border-indigo-500/30',
  },
};

/**
 * Single badge component
 */
export function Badge({
  type,
  size = 'default', // 'small' | 'default' | 'large'
  showLabel = false,
  showTooltip = true,
  className = '',
}) {
  const badge = BADGE_DEFINITIONS[type];
  if (!badge) return null;
  
  const Icon = badge.icon;
  
  const sizes = {
    small: { icon: 12, padding: 'p-1', text: 'text-[10px]' },
    default: { icon: 14, padding: 'p-1.5', text: 'text-xs' },
    large: { icon: 18, padding: 'p-2', text: 'text-sm' },
  };
  
  const sizeConfig = sizes[size];
  
  const badgeElement = (
    <div className={`
      inline-flex items-center gap-1 
      ${sizeConfig.padding} rounded-full
      ${badge.bgColor} ${badge.borderColor} border
      ${className}
    `}>
      <Icon size={sizeConfig.icon} className={badge.color} />
      {showLabel && (
        <span className={`${sizeConfig.text} font-medium ${badge.color}`}>
          {badge.label}
        </span>
      )}
    </div>
  );
  
  if (showTooltip) {
    return (
      <Tooltip content={`${badge.label}: ${badge.description}`}>
        {badgeElement}
      </Tooltip>
    );
  }
  
  return badgeElement;
}

/**
 * Verification badge (blue checkmark)
 */
export function VerifiedBadge({ size = 'default', className = '' }) {
  return <Badge type="verified" size={size} className={className} />;
}

/**
 * Badge group for displaying multiple badges
 */
export function BadgeGroup({
  badges = [], // Array of badge type strings
  max = 5,
  size = 'small',
  className = '',
}) {
  const visibleBadges = badges.slice(0, max);
  const remainingCount = badges.length - max;
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {visibleBadges.map((badge, index) => (
        <Badge key={index} type={badge} size={size} />
      ))}
      
      {remainingCount > 0 && (
        <Tooltip content={`${remainingCount} more badges`}>
          <span className="text-xs text-orbit-gray px-1.5 py-0.5 rounded-full bg-white/5">
            +{remainingCount}
          </span>
        </Tooltip>
      )}
    </div>
  );
}

/**
 * Badge showcase for profile pages
 */
export function BadgeShowcase({
  badges = [],
  title = 'Badges',
  className = '',
}) {
  if (badges.length === 0) return null;
  
  return (
    <div className={`card-glass p-5 ${className}`}>
      <h4 className="text-sm font-bold text-orbit-gray uppercase tracking-wider mb-4">
        {title}
      </h4>
      
      <div className="flex flex-wrap gap-3">
        {badges.map((badgeType, index) => {
          const badge = BADGE_DEFINITIONS[badgeType];
          if (!badge) return null;
          
          const Icon = badge.icon;
          
          return (
            <Tooltip key={index} content={badge.description}>
              <div className={`
                flex items-center gap-2 px-3 py-2 rounded-xl
                ${badge.bgColor} ${badge.borderColor} border
              `}>
                <Icon size={18} className={badge.color} />
                <span className={`text-sm font-medium ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Badge unlock notification
 */
export function BadgeUnlockNotification({
  type,
  show,
  onClose,
}) {
  const badge = BADGE_DEFINITIONS[type];
  if (!badge || !show) return null;
  
  const Icon = badge.icon;
  
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className={`
        flex items-center gap-3 px-5 py-3 rounded-2xl
        bg-[#12121A] border ${badge.borderColor}
        shadow-2xl
      `}>
        <div className={`w-10 h-10 rounded-xl ${badge.bgColor} flex items-center justify-center animate-bounce`}>
          <Icon size={20} className={badge.color} />
        </div>
        <div>
          <p className="text-xs text-orbit-gray">Badge Unlocked!</p>
          <p className={`font-bold ${badge.color}`}>{badge.label}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/**
 * Get available badge types
 */
export function getAvailableBadges() {
  return Object.keys(BADGE_DEFINITIONS);
}

/**
 * Get badge definition by type
 */
export function getBadgeDefinition(type) {
  return BADGE_DEFINITIONS[type] || null;
}

export default Badge;
