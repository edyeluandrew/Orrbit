import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Grid, 
  List,
  Star,
  Users,
  TrendingUp,
  Sparkles,
  X,
  ChevronDown,
  Music,
  Palette,
  Gamepad2,
  Monitor,
  BookOpen,
  Dumbbell,
  ChefHat,
  Camera,
  PenTool,
} from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { Badge, BadgeGroup } from './ui/Badges';
import EmptyState, { EmptySearch } from './ui/EmptyState';

// Category definitions
const CATEGORIES = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'art', label: 'Art', icon: Palette },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'tech', label: 'Tech', icon: Monitor },
  { id: 'education', label: 'Education', icon: BookOpen },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'cooking', label: 'Cooking', icon: ChefHat },
  { id: 'photography', label: 'Photography', icon: Camera },
  { id: 'writing', label: 'Writing', icon: PenTool },
];

const SORT_OPTIONS = [
  { id: 'popular', label: 'Most Popular' },
  { id: 'recent', label: 'Recently Joined' },
  { id: 'subscribers', label: 'Most Subscribers' },
  { id: 'trending', label: 'Trending' },
];

/**
 * Creator card for discovery grid
 */
function CreatorCard({ 
  creator, 
  onView,
  onSubscribe,
  compact = false,
}) {
  const { 
    walletAddress, 
    name, 
    bio, 
    avatar, 
    category,
    badges = [],
    stats = {},
    verified = false,
    featured = false,
  } = creator;
  
  if (compact) {
    return (
      <button
        onClick={() => onView?.(creator)}
        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left w-full"
      >
        <Avatar 
          src={avatar}
          address={walletAddress}
          name={name}
          size={48}
          rounded="xl"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white truncate">{name}</span>
            {verified && <Badge type="verified" size="small" showTooltip={false} />}
          </div>
          <p className="text-xs text-orbit-gray truncate">{bio || 'No bio available'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-white">{stats.subscribers || 0}</p>
          <p className="text-xs text-orbit-gray">subs</p>
        </div>
      </button>
    );
  }
  
  return (
    <div className={`
      card-glass p-5 group hover:scale-[1.02] transition-all
      ${featured ? 'ring-2 ring-orbit-gold/30' : ''}
    `}>
      {/* Featured badge */}
      {featured && (
        <div className="absolute -top-2 left-4">
          <span className="px-2 py-0.5 rounded-full bg-orbit-gold/20 text-orbit-gold text-xs font-bold">
            ⭐ Featured
          </span>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <Avatar 
          src={avatar}
          address={walletAddress}
          name={name}
          size={64}
          rounded="xl"
          className="flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white truncate">{name}</h3>
            {verified && <Badge type="verified" size="small" />}
          </div>
          
          {category && (
            <span className="text-xs text-orbit-gray">{category}</span>
          )}
          
          {badges.length > 0 && (
            <BadgeGroup badges={badges} max={3} size="small" className="mt-2" />
          )}
        </div>
      </div>
      
      {/* Bio */}
      <p className="text-sm text-orbit-gray line-clamp-2 mb-4">
        {bio || 'No bio available'}
      </p>
      
      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5 text-orbit-gray">
          <Users size={14} />
          <span className="text-white font-medium">{stats.subscribers || 0}</span>
          <span>subs</span>
        </div>
        <div className="flex items-center gap-1.5 text-orbit-gray">
          <Star size={14} className="text-amber-400" />
          <span className="text-white font-medium">{stats.rating || '4.8'}</span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onView?.(creator)}
          className="flex-1 py-2 rounded-lg bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-colors"
        >
          View Profile
        </button>
        <button
          onClick={() => onSubscribe?.(creator)}
          className="flex-1 py-2 rounded-lg bg-orbit-gold/20 text-orbit-gold text-sm font-medium hover:bg-orbit-gold/30 transition-colors"
        >
          Subscribe
        </button>
      </div>
    </div>
  );
}

/**
 * Creator Discovery page
 */
function CreatorDiscovery({
  creators = [],
  onViewCreator,
  onSubscribe,
  loading = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter and sort creators
  const filteredCreators = useMemo(() => {
    let result = [...creators];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(query) ||
        c.bio?.toLowerCase().includes(query) ||
        c.category?.toLowerCase().includes(query)
      );
    }
    
    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(c => c.category?.toLowerCase() === selectedCategory);
    }
    
    // Sort
    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => (b.stats?.subscribers || 0) - (a.stats?.subscribers || 0));
        break;
      case 'recent':
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'subscribers':
        result.sort((a, b) => (b.stats?.subscribers || 0) - (a.stats?.subscribers || 0));
        break;
      case 'trending':
        result.sort((a, b) => (b.stats?.growth || 0) - (a.stats?.growth || 0));
        break;
    }
    
    return result;
  }, [creators, searchQuery, selectedCategory, sortBy]);
  
  // Featured creators (top 3)
  const featuredCreators = useMemo(() => {
    return creators
      .filter(c => c.featured || c.verified)
      .slice(0, 3);
  }, [creators]);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Discover Creators</h2>
          <p className="text-orbit-gray">Find and support amazing content creators</p>
        </div>
        
        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-orbit-gray" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creators..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-orbit-gray focus:border-orbit-gold/50 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-orbit-gray hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      
      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap
              transition-all
              ${selectedCategory === cat.id 
                ? 'bg-orbit-gold/20 text-orbit-gold border border-orbit-gold/30' 
                : 'bg-white/5 text-orbit-gray hover:text-white border border-transparent'
              }
            `}
          >
            <cat.icon size={16} />
            {cat.label}
          </button>
        ))}
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-orbit-gray">
          {filteredCreators.length} creator{filteredCreators.length !== 1 ? 's' : ''}
        </p>
        
        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none px-3 py-1.5 pr-8 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-orbit-gold/50 outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id} className="bg-[#12121A]">
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-orbit-gray pointer-events-none" />
          </div>
          
          {/* View toggle */}
          <div className="flex rounded-lg bg-white/5 border border-white/10 p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-orbit-gray'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-orbit-gray'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Featured Section */}
      {featuredCreators.length > 0 && !searchQuery && selectedCategory === 'all' && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-orbit-gold" />
            Featured Creators
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredCreators.map((creator, index) => (
              <CreatorCard
                key={index}
                creator={{ ...creator, featured: true }}
                onView={onViewCreator}
                onSubscribe={onSubscribe}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Results */}
      {filteredCreators.length === 0 ? (
        <EmptySearch query={searchQuery} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCreators.map((creator, index) => (
            <CreatorCard
              key={index}
              creator={creator}
              onView={onViewCreator}
              onSubscribe={onSubscribe}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCreators.map((creator, index) => (
            <CreatorCard
              key={index}
              creator={creator}
              onView={onViewCreator}
              onSubscribe={onSubscribe}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CreatorDiscovery;
