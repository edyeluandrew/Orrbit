import React, { useState, useRef, useEffect } from 'react';

/**
 * Tooltip component with multiple positioning options
 */
function Tooltip({
  children,
  content,
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  delay = 200,
  className = '',
  maxWidth = 200,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  // Calculate position
  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const trigger = triggerRef.current.getBoundingClientRect();
      const tooltip = tooltipRef.current.getBoundingClientRect();
      
      let x = 0;
      let y = 0;
      
      switch (position) {
        case 'top':
          x = trigger.left + trigger.width / 2 - tooltip.width / 2;
          y = trigger.top - tooltip.height - 8;
          break;
        case 'bottom':
          x = trigger.left + trigger.width / 2 - tooltip.width / 2;
          y = trigger.bottom + 8;
          break;
        case 'left':
          x = trigger.left - tooltip.width - 8;
          y = trigger.top + trigger.height / 2 - tooltip.height / 2;
          break;
        case 'right':
          x = trigger.right + 8;
          y = trigger.top + trigger.height / 2 - tooltip.height / 2;
          break;
      }
      
      // Keep tooltip within viewport
      x = Math.max(8, Math.min(x, window.innerWidth - tooltip.width - 8));
      y = Math.max(8, Math.min(y, window.innerHeight - tooltip.height - 8));
      
      setCoords({ x, y });
    }
  }, [isVisible, position]);

  if (!content) return children;

  const arrowClasses = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent border-t-[#1E1E28]',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent border-b-[#1E1E28]',
    left: 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[#1E1E28]',
    right: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[#1E1E28]',
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className={`inline-flex ${className}`}
      >
        {children}
      </span>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[200] pointer-events-none animate-fade-in"
          style={{
            left: coords.x,
            top: coords.y,
            maxWidth,
          }}
        >
          <div className="relative bg-[#1E1E28] border border-white/10 rounded-lg px-3 py-2 text-sm text-white shadow-xl">
            {content}
            <div className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`} />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Info tooltip with question mark icon
 */
export function InfoTooltip({ content, className = '' }) {
  return (
    <Tooltip content={content} position="top" className={className}>
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 text-[10px] text-gray-400 hover:text-white hover:bg-white/20 transition-colors cursor-help">
        ?
      </span>
    </Tooltip>
  );
}

/**
 * Help text tooltip that wraps any element
 */
export function HelpTooltip({ children, help, position = 'top' }) {
  return (
    <Tooltip content={help} position={position}>
      <span className="cursor-help border-b border-dashed border-gray-500">
        {children}
      </span>
    </Tooltip>
  );
}

export default Tooltip;
