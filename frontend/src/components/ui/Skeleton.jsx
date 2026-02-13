import React from 'react';

/**
 * Skeleton loading placeholder with shimmer effect
 */
export function Skeleton({ className = '', variant = 'default' }) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-shimmer rounded';
  
  const variants = {
    default: 'h-4 w-full',
    text: 'h-4 w-3/4',
    title: 'h-6 w-1/2',
    avatar: 'h-12 w-12 rounded-full',
    'avatar-lg': 'h-20 w-20 rounded-2xl',
    button: 'h-10 w-24 rounded-lg',
    card: 'h-32 w-full rounded-xl',
    stat: 'h-16 w-full rounded-lg',
  };

  return (
    <div className={`${baseClasses} ${variants[variant] || variants.default} ${className}`} />
  );
}

/**
 * Skeleton wrapper for cards
 */
export function SkeletonCard({ children, className = '' }) {
  return (
    <div className={`card-glass p-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Balance display skeleton
 */
export function BalanceSkeleton() {
  return (
    <SkeletonCard>
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="title" className="w-32" />
        <Skeleton variant="button" />
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton variant="text" className="w-24" />
    </SkeletonCard>
  );
}

/**
 * Transaction item skeleton
 */
export function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
      <Skeleton variant="avatar" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="space-y-2 text-right">
        <Skeleton className="h-4 w-16 ml-auto" />
        <Skeleton className="h-3 w-12 ml-auto" />
      </div>
    </div>
  );
}

/**
 * Transaction feed skeleton
 */
export function TransactionFeedSkeleton({ count = 3 }) {
  return (
    <SkeletonCard>
      <Skeleton variant="title" className="w-40 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <TransactionSkeleton key={i} />
        ))}
      </div>
    </SkeletonCard>
  );
}

/**
 * Creator card skeleton
 */
export function CreatorCardSkeleton() {
  return (
    <SkeletonCard className="p-5">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="avatar-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="title" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton variant="text" className="mb-4" />
      <Skeleton variant="text" className="w-full mb-4" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton variant="stat" />
        <Skeleton variant="stat" />
        <Skeleton variant="stat" />
      </div>
    </SkeletonCard>
  );
}

/**
 * Profile skeleton
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonCard>
        <div className="flex items-start gap-4">
          <Skeleton variant="avatar-lg" />
          <div className="flex-1 space-y-3">
            <Skeleton variant="title" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton variant="text" />
          <Skeleton variant="text" className="w-3/4" />
        </div>
      </SkeletonCard>
      
      <div className="grid grid-cols-3 gap-4">
        <SkeletonCard className="p-4 text-center">
          <Skeleton variant="avatar" className="mx-auto mb-2" />
          <Skeleton className="h-6 w-12 mx-auto mb-1" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </SkeletonCard>
        <SkeletonCard className="p-4 text-center">
          <Skeleton variant="avatar" className="mx-auto mb-2" />
          <Skeleton className="h-6 w-12 mx-auto mb-1" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </SkeletonCard>
        <SkeletonCard className="p-4 text-center">
          <Skeleton variant="avatar" className="mx-auto mb-2" />
          <Skeleton className="h-6 w-12 mx-auto mb-1" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </SkeletonCard>
      </div>
    </div>
  );
}

/**
 * Stats grid skeleton
 */
export function StatsSkeleton({ count = 3 }) {
  return (
    <div className={`grid grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className="p-4 text-center">
          <Skeleton variant="avatar" className="mx-auto mb-2 h-10 w-10" />
          <Skeleton className="h-6 w-12 mx-auto mb-1" />
          <Skeleton className="h-3 w-20 mx-auto" />
        </SkeletonCard>
      ))}
    </div>
  );
}

export default Skeleton;
