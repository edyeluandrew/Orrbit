import React, { useMemo } from 'react';
import { User, Camera } from 'lucide-react';

/**
 * Generate a deterministic color and pattern based on a string (like wallet address)
 */
function generateIdenticon(seed) {
  if (!seed) return { colors: ['#6366F1', '#8B5CF6'], pattern: [] };
  
  // Create a simple hash from the seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Generate colors from hash
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40) % 360;
  
  const colors = [
    `hsl(${hue1}, 70%, 60%)`,
    `hsl(${hue2}, 70%, 50%)`,
  ];
  
  // Generate 5x5 symmetric pattern
  const pattern = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      const seedIndex = y * 3 + x;
      const charCode = seed.charCodeAt(seedIndex % seed.length) || 0;
      pattern.push(charCode % 2 === 0);
    }
  }
  
  return { colors, pattern, hash };
}

/**
 * Identicon component - generates unique avatar from wallet address
 */
export function Identicon({ 
  address, 
  size = 48,
  className = '',
  rounded = 'xl',
}) {
  const { colors, pattern, hash } = useMemo(() => generateIdenticon(address), [address]);
  
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };
  
  const cellSize = size / 5;
  
  return (
    <div 
      className={`relative overflow-hidden ${roundedClasses[rounded]} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
        }}
      />
      
      {/* Pattern overlay */}
      <svg width={size} height={size} className="relative z-10">
        {pattern.map((filled, index) => {
          if (!filled) return null;
          
          const y = Math.floor(index / 3);
          const x = index % 3;
          
          // Mirror for symmetry
          const cells = [{ x, y }];
          if (x < 2) {
            cells.push({ x: 4 - x, y });
          }
          
          return cells.map((cell, cellIndex) => (
            <rect
              key={`${index}-${cellIndex}`}
              x={cell.x * cellSize}
              y={cell.y * cellSize}
              width={cellSize}
              height={cellSize}
              fill="rgba(255,255,255,0.3)"
            />
          ));
        })}
      </svg>
    </div>
  );
}

/**
 * Avatar component with image support and identicon fallback
 */
export function Avatar({
  src,
  address,
  name,
  size = 48,
  rounded = 'xl',
  className = '',
  showBorder = false,
  borderColor = 'border-white/20',
  onClick,
  editable = false,
  onEdit,
}) {
  const sizeClasses = {
    24: 'w-6 h-6',
    32: 'w-8 h-8',
    40: 'w-10 h-10',
    48: 'w-12 h-12',
    56: 'w-14 h-14',
    64: 'w-16 h-16',
    80: 'w-20 h-20',
    96: 'w-24 h-24',
    128: 'w-32 h-32',
  };
  
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };
  
  const sizeClass = sizeClasses[size] || `w-[${size}px] h-[${size}px]`;
  
  const containerClasses = `
    ${sizeClass} 
    ${roundedClasses[rounded]} 
    ${showBorder ? `border-2 ${borderColor}` : ''}
    ${onClick || editable ? 'cursor-pointer' : ''}
    overflow-hidden flex-shrink-0 relative
    ${className}
  `;
  
  // Get initials from name
  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '';
  
  const handleClick = () => {
    if (editable && onEdit) {
      onEdit();
    } else if (onClick) {
      onClick();
    }
  };
  
  return (
    <div className={containerClasses} onClick={handleClick}>
      {src ? (
        // Custom image
        <img 
          src={src} 
          alt={name || 'Avatar'} 
          className="w-full h-full object-cover"
        />
      ) : address ? (
        // Identicon from address
        <Identicon address={address} size={size} rounded={rounded} />
      ) : initials ? (
        // Initials fallback
        <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          <span className="text-white font-bold" style={{ fontSize: size * 0.35 }}>
            {initials}
          </span>
        </div>
      ) : (
        // Default user icon
        <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
          <User size={size * 0.5} className="text-gray-400" />
        </div>
      )}
      
      {/* Edit overlay */}
      {editable && (
        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera size={size * 0.3} className="text-white" />
        </div>
      )}
    </div>
  );
}

/**
 * Avatar group for displaying multiple avatars stacked
 */
export function AvatarGroup({
  avatars = [], // [{ src, address, name }]
  max = 4,
  size = 32,
  className = '',
}) {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;
  
  return (
    <div className={`flex -space-x-2 ${className}`}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          {...avatar}
          size={size}
          rounded="full"
          showBorder
          borderColor="border-[#0A0A0C]"
          className="ring-2 ring-[#0A0A0C]"
        />
      ))}
      
      {remainingCount > 0 && (
        <div 
          className="flex items-center justify-center rounded-full bg-gray-700 border-2 border-[#0A0A0C] text-xs font-bold text-white"
          style={{ width: size, height: size }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

export default Avatar;
