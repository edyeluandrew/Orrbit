import React, { useState, useEffect, useRef } from 'react';
import { X, GripHorizontal } from 'lucide-react';

/**
 * Bottom sheet modal for mobile-friendly interactions
 */
function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  showHandle = true,
  showCloseButton = true,
  height = 'auto', // 'auto' | 'half' | 'full' | number (px)
  className = '',
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const sheetRef = useRef(null);
  const startYRef = useRef(0);
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);
  
  // Handle drag to dismiss
  const handleTouchStart = (e) => {
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
  };
  
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
  };
  
  const getHeightStyle = () => {
    if (typeof height === 'number') return `${height}px`;
    switch (height) {
      case 'full': return '95vh';
      case 'half': return '50vh';
      default: return 'auto';
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`
          absolute bottom-0 left-0 right-0 
          bg-[#12121A] border-t border-white/10 
          rounded-t-3xl
          transform transition-transform duration-300 ease-out
          ${isDragging ? '' : 'animate-slide-up'}
          ${className}
        `}
        style={{
          maxHeight: '95vh',
          height: getHeightStyle(),
          transform: `translateY(${dragY}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center py-3">
            <div className="w-12 h-1.5 rounded-full bg-white/20" />
          </div>
        )}
        
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 pb-4 border-b border-white/5">
            <div>
              {title && <h3 className="text-lg font-bold text-white">{title}</h3>}
              {subtitle && <p className="text-sm text-orbit-gray">{subtitle}</p>}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(95vh - 120px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Action sheet with predefined button options
 */
export function ActionSheet({
  isOpen,
  onClose,
  title,
  actions = [], // [{ label, icon, onClick, variant, destructive }]
}) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title} height="auto">
      <div className="p-4 space-y-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.onClick?.();
              onClose();
            }}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl
              transition-colors text-left
              ${action.destructive 
                ? 'text-red-400 hover:bg-red-500/10' 
                : 'text-white hover:bg-white/5'
              }
            `}
          >
            {action.icon && <span className="opacity-60">{action.icon}</span>}
            <span className="font-medium">{action.label}</span>
          </button>
        ))}
        
        {/* Cancel button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 transition-colors font-medium mt-2"
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}

/**
 * Confirmation sheet with title, message, and confirm/cancel buttons
 */
export function ConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
}) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} height="auto" showCloseButton={false}>
      <div className="p-6 text-center">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        {message && <p className="text-orbit-gray mb-6">{message}</p>}
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 text-white font-semibold hover:bg-white/10 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
            className={`
              flex-1 py-3 rounded-xl font-semibold transition-colors
              ${destructive 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                : 'bg-orbit-gold/20 text-orbit-gold hover:bg-orbit-gold/30'
              }
            `}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

export default BottomSheet;
