import React, { useState, useEffect, useCallback } from 'react';
import { Check, Sparkles, PartyPopper, X } from 'lucide-react';

/**
 * Confetti particle component
 */
const ConfettiParticle = ({ color, delay, x }) => (
  <div
    className="absolute w-2 h-2 rounded-sm animate-confetti"
    style={{
      backgroundColor: color,
      left: `${x}%`,
      animationDelay: `${delay}ms`,
      animationDuration: `${1000 + Math.random() * 500}ms`,
    }}
  />
);

/**
 * Confetti burst animation
 */
export function Confetti({ active, duration = 3000, onComplete }) {
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    if (active) {
      const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F472B6', '#34D399'];
      const newParticles = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 200,
        x: Math.random() * 100,
      }));
      setParticles(newParticles);
      
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [active, duration, onComplete]);
  
  if (!active || particles.length === 0) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((p) => (
        <ConfettiParticle key={p.id} {...p} />
      ))}
    </div>
  );
}

/**
 * Success checkmark animation
 */
export function SuccessCheck({ 
  show, 
  size = 80,
  onComplete,
  autoHide = true,
  hideDelay = 2000,
}) {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (show) {
      setVisible(true);
      if (autoHide) {
        const timer = setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, hideDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [show, autoHide, hideDelay, onComplete]);
  
  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative">
        {/* Ripple effects */}
        <div 
          className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"
          style={{ width: size * 1.5, height: size * 1.5, margin: 'auto', left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <div 
          className="absolute inset-0 rounded-full bg-emerald-500/10 animate-pulse"
          style={{ width: size * 2, height: size * 2, margin: 'auto', left: 0, right: 0, top: 0, bottom: 0 }}
        />
        
        {/* Main check circle */}
        <div 
          className="relative rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center animate-scale-bounce shadow-2xl shadow-emerald-500/50"
          style={{ width: size, height: size }}
        >
          <Check 
            size={size * 0.5} 
            className="text-white animate-draw-check" 
            strokeWidth={3}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Success modal with animation
 */
export function SuccessModal({
  show,
  title = 'Success!',
  message,
  amount,
  currency = 'XLM',
  onClose,
  showConfetti = true,
}) {
  const [showContent, setShowContent] = useState(false);
  
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [show]);
  
  if (!show) return null;
  
  return (
    <>
      {showConfetti && <Confetti active={show} />}
      
      <div className="fixed inset-0 flex items-center justify-center z-[90] px-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className={`
          relative bg-[#12121A] border border-white/10 rounded-2xl p-8 max-w-sm w-full
          shadow-2xl transform transition-all duration-500
          ${showContent ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}
        `}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
          
          {/* Success icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center animate-scale-bounce">
              <Check size={40} className="text-white" strokeWidth={3} />
            </div>
          </div>
          
          {/* Title */}
          <h3 className="text-2xl font-bold text-white text-center mb-2">{title}</h3>
          
          {/* Amount */}
          {amount && (
            <div className="text-center mb-4">
              <span className="text-3xl font-black text-orbit-gold">{amount}</span>
              <span className="text-lg text-orbit-gray ml-2">{currency}</span>
            </div>
          )}
          
          {/* Message */}
          {message && (
            <p className="text-orbit-gray text-center mb-6">{message}</p>
          )}
          
          {/* Done button */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-400 hover:to-emerald-500 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Celebration animation for milestones
 */
export function Celebration({ 
  show, 
  title = 'Congratulations!',
  subtitle,
  onComplete,
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onComplete?.(), 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);
  
  if (!show) return null;
  
  return (
    <>
      <Confetti active={show} duration={4000} />
      
      <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none">
        <div className="text-center animate-scale-bounce">
          <PartyPopper size={60} className="text-orbit-gold mx-auto mb-4" />
          <h2 className="text-3xl font-black text-white mb-2">{title}</h2>
          {subtitle && <p className="text-orbit-gray text-lg">{subtitle}</p>}
        </div>
      </div>
    </>
  );
}

/**
 * Hook to trigger success animations
 */
export function useSuccessAnimation() {
  const [showCheck, setShowCheck] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [successModal, setSuccessModal] = useState(null);
  
  const triggerCheck = useCallback(() => {
    setShowCheck(true);
  }, []);
  
  const triggerConfetti = useCallback((duration = 3000) => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), duration);
  }, []);
  
  const triggerSuccessModal = useCallback((props) => {
    setSuccessModal(props);
  }, []);
  
  const closeSuccessModal = useCallback(() => {
    setSuccessModal(null);
  }, []);
  
  const SuccessAnimations = () => (
    <>
      <SuccessCheck show={showCheck} onComplete={() => setShowCheck(false)} />
      <Confetti active={showConfetti} />
      {successModal && (
        <SuccessModal 
          show={true}
          {...successModal}
          onClose={closeSuccessModal}
        />
      )}
    </>
  );
  
  return {
    triggerCheck,
    triggerConfetti,
    triggerSuccessModal,
    closeSuccessModal,
    SuccessAnimations,
  };
}

export default SuccessModal;
