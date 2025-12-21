import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// Toast types configuration
const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    progressColor: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-400',
    progressColor: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    progressColor: 'bg-amber-500',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    progressColor: 'bg-blue-500',
  },
};

function Toast({ id, type = 'info', title, message, duration = 5000, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);

  const config = toastConfig[type] || toastConfig.info;
  const IconComponent = config.icon;

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    // Progress bar animation
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 50);

    // Auto-close timer
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border backdrop-blur-sm shadow-lg
        ${config.bgColor} ${config.borderColor}
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="p-4 pr-10">
        <div className="flex items-start gap-3">
          <IconComponent size={20} className={`${config.iconColor} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            {title && (
              <p className="font-display font-semibold text-white text-sm tracking-wide">
                {title}
              </p>
            )}
            {message && (
              <p className="text-orbit-gray text-sm mt-1 font-medium">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 transition-colors"
      >
        <X size={14} className="text-orbit-gray hover:text-white" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
        <div
          className={`h-full ${config.progressColor} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default Toast;
