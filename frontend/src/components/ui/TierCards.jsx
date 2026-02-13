import React from 'react';
import { Check, Star, Zap, Crown, Sparkles, ArrowRight } from 'lucide-react';

const TIER_STYLES = {
  basic: {
    gradient: 'from-gray-600/20 to-gray-700/20',
    border: 'border-gray-500/30',
    accent: 'text-gray-300',
    badge: 'bg-gray-500/20 text-gray-300',
    icon: Zap,
    glow: '',
  },
  standard: {
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30',
    accent: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-400',
    icon: Star,
    glow: '',
  },
  premium: {
    gradient: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/30',
    accent: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-400',
    icon: Crown,
    glow: 'shadow-lg shadow-purple-500/10',
  },
  vip: {
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30',
    accent: 'text-orbit-gold',
    badge: 'bg-orbit-gold/20 text-orbit-gold',
    icon: Sparkles,
    glow: 'shadow-lg shadow-amber-500/20',
  },
};

/**
 * Subscription tier card with visual hierarchy
 */
export function TierCard({
  tier = 'standard', // basic, standard, premium, vip
  name,
  price,
  currency = 'XLM',
  interval = 'month',
  description,
  features = [],
  popular = false,
  disabled = false,
  loading = false,
  onSubscribe,
  className = '',
}) {
  const style = TIER_STYLES[tier] || TIER_STYLES.standard;
  const Icon = style.icon;
  
  return (
    <div className={`
      relative rounded-2xl overflow-hidden
      bg-gradient-to-br ${style.gradient}
      border ${style.border}
      ${style.glow}
      ${disabled ? 'opacity-50 pointer-events-none' : ''}
      ${popular ? 'ring-2 ring-orbit-gold/50' : ''}
      transition-all duration-300
      hover:scale-[1.02] hover:shadow-xl
      ${className}
    `}>
      {/* Popular badge */}
      {popular && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2">
          <div className="bg-orbit-gold text-black text-xs font-bold px-3 py-1 rounded-b-lg">
            MOST POPULAR
          </div>
        </div>
      )}
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${style.badge} mb-2`}>
              <Icon size={12} />
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </div>
            <h3 className="text-xl font-bold text-white">{name}</h3>
          </div>
          
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.gradient} border ${style.border} flex items-center justify-center`}>
            <Icon size={24} className={style.accent} />
          </div>
        </div>
        
        {/* Price */}
        <div className="mb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-white">{price}</span>
            <span className="text-lg text-orbit-gray">{currency}</span>
          </div>
          <p className="text-sm text-orbit-gray">per {interval}</p>
        </div>
        
        {/* Description */}
        {description && (
          <p className="text-sm text-orbit-gray mb-4">{description}</p>
        )}
        
        {/* Features */}
        {features.length > 0 && (
          <ul className="space-y-2 mb-6">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check size={16} className={`${style.accent} flex-shrink-0 mt-0.5`} />
                <span className="text-sm text-white/80">{feature}</span>
              </li>
            ))}
          </ul>
        )}
        
        {/* Subscribe Button */}
        <button
          onClick={onSubscribe}
          disabled={disabled || loading}
          className={`
            w-full py-3 rounded-xl font-semibold
            flex items-center justify-center gap-2
            transition-all
            ${popular 
              ? 'bg-orbit-gold text-black hover:bg-amber-400' 
              : `bg-white/10 ${style.accent} hover:bg-white/20`
            }
            ${loading ? 'opacity-70 cursor-wait' : ''}
          `}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Subscribe
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Horizontal tier comparison cards
 */
export function TierCardCompact({
  tier = 'standard',
  name,
  price,
  currency = 'XLM',
  interval = 'month',
  features = [],
  subscribed = false,
  onSubscribe,
  className = '',
}) {
  const style = TIER_STYLES[tier] || TIER_STYLES.standard;
  const Icon = style.icon;
  
  return (
    <div className={`
      p-4 rounded-xl
      bg-gradient-to-r ${style.gradient}
      border ${style.border}
      flex items-center gap-4
      ${subscribed ? 'ring-2 ring-emerald-500/50' : ''}
      ${className}
    `}>
      {/* Icon */}
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${style.gradient} border ${style.border} flex items-center justify-center flex-shrink-0`}>
        <Icon size={24} className={style.accent} />
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-semibold truncate">{name}</h4>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-white">{price}</span>
          <span className="text-sm text-orbit-gray">{currency}/{interval}</span>
        </div>
      </div>
      
      {/* Features preview */}
      {features.length > 0 && (
        <div className="hidden sm:block text-xs text-orbit-gray max-w-32">
          {features.slice(0, 2).join(' • ')}
          {features.length > 2 && ' ...'}
        </div>
      )}
      
      {/* Action */}
      {subscribed ? (
        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-1">
          <Check size={14} />
          Active
        </div>
      ) : (
        <button
          onClick={onSubscribe}
          className={`px-4 py-2 rounded-lg ${style.badge} font-medium text-sm hover:opacity-80 transition-opacity`}
        >
          Subscribe
        </button>
      )}
    </div>
  );
}

/**
 * Mini tier badge for display in lists
 */
export function TierBadge({ tier = 'standard', className = '' }) {
  const style = TIER_STYLES[tier] || TIER_STYLES.standard;
  const Icon = style.icon;
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.badge} ${className}`}>
      <Icon size={10} />
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </div>
  );
}

/**
 * Tier pricing grid for comparison
 */
export function TierGrid({ 
  tiers = [],
  onSubscribe,
  className = '',
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {tiers.map((tier, index) => (
        <TierCard
          key={index}
          {...tier}
          onSubscribe={() => onSubscribe?.(tier)}
        />
      ))}
    </div>
  );
}

export default TierCard;
