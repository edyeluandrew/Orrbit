import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook for implementing pull-to-refresh functionality
 * 
 * Usage:
 * const { pullDistance, isPulling, isRefreshing, handlers, PullIndicator } = usePullToRefresh({
 *   onRefresh: async () => { ... },
 *   threshold: 80,
 * });
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  maxPull = 150,
  disabled = false,
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startYRef = useRef(0);
  const containerRef = useRef(null);
  
  const canPull = useCallback(() => {
    if (disabled || isRefreshing) return false;
    
    // Only allow pull when scrolled to top
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    return scrollTop <= 0;
  }, [disabled, isRefreshing]);
  
  const handleTouchStart = useCallback((e) => {
    if (!canPull()) return;
    startYRef.current = e.touches[0].clientY;
  }, [canPull]);
  
  const handleTouchMove = useCallback((e) => {
    if (!canPull() || startYRef.current === 0) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    
    if (diff > 0) {
      setIsPulling(true);
      // Apply resistance for natural feel
      const distance = Math.min(diff / resistance, maxPull);
      setPullDistance(distance);
      
      // Prevent default scroll when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [canPull, resistance, maxPull]);
  
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && onRefresh) {
      setIsRefreshing(true);
      setPullDistance(threshold / 2); // Keep indicator visible during refresh
      
      try {
        await onRefresh();
      } catch (err) {
        console.error('Refresh failed:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    
    startYRef.current = 0;
  }, [isPulling, pullDistance, threshold, onRefresh]);
  
  // Touch handlers to spread on container
  const handlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    ref: containerRef,
  };
  
  // Progress value 0-1
  const progress = Math.min(pullDistance / threshold, 1);
  
  // Pull indicator component
  const PullIndicator = () => {
    if (pullDistance === 0 && !isRefreshing) return null;
    
    return (
      <div 
        className="fixed left-1/2 -translate-x-1/2 z-50 transition-transform"
        style={{
          top: Math.max(16, pullDistance - 40),
          transform: `translateX(-50%) scale(${0.5 + progress * 0.5})`,
        }}
      >
        <div className={`
          w-10 h-10 rounded-full 
          bg-orbit-gold/20 border border-orbit-gold/30
          flex items-center justify-center
          ${isRefreshing ? 'animate-spin' : ''}
        `}>
          {isRefreshing ? (
            <svg className="w-5 h-5 text-orbit-gold" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="50" strokeLinecap="round" />
            </svg>
          ) : (
            <svg 
              className="w-5 h-5 text-orbit-gold transition-transform"
              style={{ transform: `rotate(${progress * 180}deg)` }}
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12l7-7 7 7" />
            </svg>
          )}
        </div>
      </div>
    );
  };
  
  return {
    pullDistance,
    isPulling,
    isRefreshing,
    progress,
    handlers,
    PullIndicator,
    containerRef,
  };
}

/**
 * Pull to refresh wrapper component
 */
export function PullToRefresh({ 
  children, 
  onRefresh,
  threshold = 80,
  disabled = false,
  className = '',
}) {
  const { pullDistance, isPulling, isRefreshing, handlers, PullIndicator } = usePullToRefresh({
    onRefresh,
    threshold,
    disabled,
  });
  
  return (
    <div 
      {...handlers}
      className={`relative ${className}`}
      style={{
        transform: isPulling || isRefreshing ? `translateY(${pullDistance * 0.3}px)` : '',
        transition: isPulling ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      <PullIndicator />
      {children}
    </div>
  );
}

export default usePullToRefresh;
