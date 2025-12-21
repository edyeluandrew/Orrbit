import { useEffect, useCallback, useRef } from 'react';

/**
 * useRecurringPayments - Hook to manage recurring subscription payments
 * 
 * Checks subscriptions every minute and triggers payments when due.
 * Uses localStorage to track next payment dates.
 */
function useRecurringPayments({ 
  subscriptions, 
  wallet, 
  platformWallet, 
  onPaymentDue, 
  onPaymentReminder,
  enabled = true 
}) {
  const checkIntervalRef = useRef(null);
  const processedPaymentsRef = useRef(new Set());

  // Check if a subscription payment is due
  const isPaymentDue = useCallback((subscription) => {
    if (!subscription.nextBilling) return false;
    
    const nextBillingDate = new Date(subscription.nextBilling);
    const now = new Date();
    
    // Payment is due if current date >= next billing date
    return now >= nextBillingDate;
  }, []);

  // Check if payment reminder should be sent (3 days before due)
  const shouldSendReminder = useCallback((subscription) => {
    if (!subscription.nextBilling) return false;
    
    const nextBillingDate = new Date(subscription.nextBilling);
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    // Check if we're within 3 days of billing
    const reminderKey = `reminder-${subscription.id}-${subscription.nextBilling}`;
    const alreadyReminded = localStorage.getItem(reminderKey);
    
    if (!alreadyReminded && nextBillingDate <= threeDaysFromNow && nextBillingDate > now) {
      localStorage.setItem(reminderKey, 'true');
      return true;
    }
    
    return false;
  }, []);

  // Calculate next billing date (30 days from now)
  const calculateNextBilling = useCallback(() => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    return nextDate.toLocaleDateString();
  }, []);

  // Check all subscriptions for due payments
  const checkSubscriptions = useCallback(() => {
    if (!enabled || !wallet?.publicKey || !platformWallet?.publicKey) {
      return;
    }

    subscriptions.forEach((subscription) => {
      if (subscription.status !== 'active') return;

      // Check for reminders first
      if (shouldSendReminder(subscription)) {
        console.log('📅 Payment reminder for:', subscription.service);
        onPaymentReminder?.({
          subscription,
          daysUntilDue: Math.ceil(
            (new Date(subscription.nextBilling) - new Date()) / (1000 * 60 * 60 * 24)
          ),
        });
      }

      // Check if payment is due
      if (isPaymentDue(subscription)) {
        const paymentKey = `payment-${subscription.id}-${subscription.nextBilling}`;
        
        // Prevent duplicate processing
        if (!processedPaymentsRef.current.has(paymentKey)) {
          processedPaymentsRef.current.add(paymentKey);
          
          console.log('💳 Payment due for:', subscription.service);
          onPaymentDue?.({
            subscription,
            nextBilling: calculateNextBilling(),
          });
        }
      }
    });
  }, [
    enabled,
    subscriptions,
    wallet?.publicKey,
    platformWallet?.publicKey,
    isPaymentDue,
    shouldSendReminder,
    onPaymentDue,
    onPaymentReminder,
    calculateNextBilling,
  ]);

  // Start the recurring check interval
  useEffect(() => {
    if (!enabled) return;

    // Initial check
    checkSubscriptions();

    // Check every minute (60000ms)
    // In production, this could be less frequent (every hour)
    checkIntervalRef.current = setInterval(checkSubscriptions, 60000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [enabled, checkSubscriptions]);

  // Manual trigger for testing
  const triggerCheck = useCallback(() => {
    checkSubscriptions();
  }, [checkSubscriptions]);

  // Get upcoming payments info
  const getUpcomingPayments = useCallback(() => {
    return subscriptions
      .filter((sub) => sub.status === 'active' && sub.nextBilling)
      .map((sub) => ({
        ...sub,
        daysUntilDue: Math.ceil(
          (new Date(sub.nextBilling) - new Date()) / (1000 * 60 * 60 * 24)
        ),
        isDue: isPaymentDue(sub),
      }))
      .sort((a, b) => new Date(a.nextBilling) - new Date(b.nextBilling));
  }, [subscriptions, isPaymentDue]);

  return {
    triggerCheck,
    getUpcomingPayments,
    isPaymentDue,
  };
}

export default useRecurringPayments;
