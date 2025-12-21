import { useEffect, useCallback, useState } from 'react';
import { isConnected, requestAccess } from '@stellar/freighter-api';
import * as StellarSdk from 'stellar-sdk';

const WALLET_SESSION_KEY = 'orbit-wallet-session';
const PLATFORM_WALLET_SESSION_KEY = 'orbit-platform-wallet-session';

/**
 * useWalletSession - Hook to manage wallet session persistence
 * 
 * Saves wallet info to localStorage and auto-reconnects on page load.
 */
function useWalletSession() {
  const [isRestoring, setIsRestoring] = useState(true);
  const [restoredWallet, setRestoredWallet] = useState(null);
  const [restoredPlatformWallet, setRestoredPlatformWallet] = useState(null);

  // Save wallet session to localStorage
  const saveWalletSession = useCallback((wallet) => {
    if (wallet?.publicKey) {
      const sessionData = {
        publicKey: wallet.publicKey,
        type: wallet.type,
        savedAt: Date.now(),
      };
      localStorage.setItem(WALLET_SESSION_KEY, JSON.stringify(sessionData));
      console.log('💾 Wallet session saved');
    }
  }, []);

  // Save platform wallet session
  const savePlatformWalletSession = useCallback((wallet) => {
    if (wallet?.publicKey) {
      const sessionData = {
        publicKey: wallet.publicKey,
        type: wallet.type,
        savedAt: Date.now(),
      };
      localStorage.setItem(PLATFORM_WALLET_SESSION_KEY, JSON.stringify(sessionData));
      console.log('💾 Platform wallet session saved');
    }
  }, []);

  // Clear wallet session
  const clearWalletSession = useCallback(() => {
    localStorage.removeItem(WALLET_SESSION_KEY);
    console.log('🗑️ Wallet session cleared');
  }, []);

  // Clear platform wallet session
  const clearPlatformWalletSession = useCallback(() => {
    localStorage.removeItem(PLATFORM_WALLET_SESSION_KEY);
    console.log('🗑️ Platform wallet session cleared');
  }, []);

  // Restore wallet from session
  const restoreWalletSession = useCallback(async () => {
    try {
      const sessionStr = localStorage.getItem(WALLET_SESSION_KEY);
      if (!sessionStr) return null;

      const session = JSON.parse(sessionStr);
      
      // Check if session is older than 24 hours
      const sessionAge = Date.now() - session.savedAt;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (sessionAge > maxAge) {
        console.log('⏰ Wallet session expired, clearing...');
        clearWalletSession();
        return null;
      }

      // Verify Freighter is still connected
      const connectedResult = await isConnected();
      if (!connectedResult.isConnected) {
        console.log('🔌 Freighter not connected, clearing session...');
        clearWalletSession();
        return null;
      }

      // Request access to verify the same wallet
      const accessObj = await requestAccess();
      if (accessObj.error || accessObj.address !== session.publicKey) {
        console.log('🔄 Wallet changed, clearing session...');
        clearWalletSession();
        return null;
      }

      // Get current balance with cache-busting
      let balance = 0;
      let needsFunding = false;

      try {
        const timestamp = Date.now();
        const url = `https://horizon-testnet.stellar.org/accounts/${session.publicKey}?_=${timestamp}`;
        
        const response = await fetch(url, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        
        if (response.ok) {
          const account = await response.json();
          const xlmBalance = account.balances.find((b) => b.asset_type === 'native');
          balance = parseFloat(xlmBalance?.balance || 0);
        } else if (response.status === 404) {
          needsFunding = true;
        }
      } catch (loadErr) {
        console.error('Failed to load balance:', loadErr);
        needsFunding = true;
      }

      const walletData = {
        publicKey: session.publicKey,
        balance,
        type: session.type,
        needsFunding,
        restored: true,
      };

      console.log('✅ Wallet session restored with balance:', balance, 'XLM');
      return walletData;

    } catch (err) {
      console.error('❌ Failed to restore wallet session:', err);
      clearWalletSession();
      return null;
    }
  }, [clearWalletSession]);

  // Restore platform wallet from session
  const restorePlatformWalletSession = useCallback(async () => {
    try {
      const sessionStr = localStorage.getItem(PLATFORM_WALLET_SESSION_KEY);
      if (!sessionStr) return null;

      const session = JSON.parse(sessionStr);
      
      // Check session age
      const sessionAge = Date.now() - session.savedAt;
      const maxAge = 24 * 60 * 60 * 1000;
      
      if (sessionAge > maxAge) {
        clearPlatformWalletSession();
        return null;
      }

      // Get current balance for platform wallet
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      let balance = 0;

      try {
        const account = await server.loadAccount(session.publicKey);
        const xlmBalance = account.balances.find((b) => b.asset_type === 'native');
        balance = parseFloat(xlmBalance?.balance || 0);
      } catch (loadErr) {
        // Platform wallet might not be funded yet
      }

      const walletData = {
        publicKey: session.publicKey,
        balance,
        type: session.type,
        restored: true,
      };

      console.log('✅ Platform wallet session restored');
      return walletData;

    } catch (err) {
      console.error('❌ Failed to restore platform wallet session:', err);
      clearPlatformWalletSession();
      return null;
    }
  }, [clearPlatformWalletSession]);

  // Auto-restore on mount - runs only once
  useEffect(() => {
    let isMounted = true;
    
    const restore = async () => {
      // Only restore once
      if (!isMounted) return;
      
      setIsRestoring(true);
      
      try {
        const [wallet, platformWallet] = await Promise.all([
          restoreWalletSession(),
          restorePlatformWalletSession(),
        ]);
        
        if (isMounted) {
          setRestoredWallet(wallet);
          setRestoredPlatformWallet(platformWallet);
          setIsRestoring(false);
        }
      } catch (err) {
        console.error('Session restore failed:', err);
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    };

    restore();
    
    return () => {
      isMounted = false;
    };
    // Empty dependency array - run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isRestoring,
    restoredWallet,
    restoredPlatformWallet,
    saveWalletSession,
    savePlatformWalletSession,
    clearWalletSession,
    clearPlatformWalletSession,
  };
}

export default useWalletSession;
