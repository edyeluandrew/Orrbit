import { useState, useCallback, useEffect } from 'react';
import * as StellarSdk from 'stellar-sdk';
import { Preferences } from '@capacitor/preferences';

// Storage keys
const WALLET_KEY = 'orbit-wallet-data';
const WALLET_TYPE_KEY = 'orbit-wallet-type';

/**
 * Wallet Service Hook
 * Supports multiple wallet types for native Capacitor apps:
 * - Built-in wallet (keypair stored securely)
 * - Imported wallet (secret key)
 * - External wallet (WalletConnect - future)
 */
export function useWalletService() {
  const [wallet, setWallet] = useState(null);
  const [walletType, setWalletType] = useState(null); // 'builtin' | 'imported' | 'external'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check for existing wallet on mount
  useEffect(() => {
    loadStoredWallet();
  }, []);

  /**
   * Load wallet from secure storage
   */
  const loadStoredWallet = async () => {
    try {
      setLoading(true);
      
      const { value: typeValue } = await Preferences.get({ key: WALLET_TYPE_KEY });
      const { value: walletData } = await Preferences.get({ key: WALLET_KEY });
      
      if (walletData && typeValue) {
        const parsed = JSON.parse(walletData);
        setWallet(parsed);
        setWalletType(typeValue);
        console.log('💼 Wallet restored from storage:', parsed.publicKey?.slice(0, 8) + '...');
        return parsed;
      }
    } catch (err) {
      console.error('Failed to load stored wallet:', err);
    } finally {
      setLoading(false);
    }
    return null;
  };

  /**
   * Save wallet to secure storage
   */
  const saveWallet = async (walletData, type) => {
    try {
      await Preferences.set({
        key: WALLET_KEY,
        value: JSON.stringify(walletData),
      });
      await Preferences.set({
        key: WALLET_TYPE_KEY,
        value: type,
      });
      console.log('💾 Wallet saved to secure storage');
    } catch (err) {
      console.error('Failed to save wallet:', err);
      throw err;
    }
  };

  /**
   * Create a new Stellar keypair (built-in wallet)
   */
  const createWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Generate new keypair
      const keypair = StellarSdk.Keypair.random();
      
      const walletData = {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(), // Stored securely
        balance: 0,
        type: 'builtin',
        createdAt: new Date().toISOString(),
      };
      
      // Save to secure storage
      await saveWallet(walletData, 'builtin');
      
      setWallet(walletData);
      setWalletType('builtin');
      
      console.log('🆕 New wallet created:', walletData.publicKey.slice(0, 8) + '...');
      
      return walletData;
    } catch (err) {
      setError('Failed to create wallet: ' + err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Import wallet from secret key
   */
  const importWallet = useCallback(async (secretKey) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate and create keypair from secret
      const keypair = StellarSdk.Keypair.fromSecret(secretKey.trim());
      
      // Check if account exists on network
      let balance = 0;
      try {
        const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
        const account = await server.loadAccount(keypair.publicKey());
        const xlmBalance = account.balances.find(b => b.asset_type === 'native');
        balance = xlmBalance ? parseFloat(xlmBalance.balance) : 0;
      } catch (err) {
        // Account may not exist yet (unfunded)
        console.log('Account not funded yet');
      }
      
      const walletData = {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
        balance,
        type: 'imported',
        importedAt: new Date().toISOString(),
      };
      
      // Save to secure storage
      await saveWallet(walletData, 'imported');
      
      setWallet(walletData);
      setWalletType('imported');
      
      console.log('📥 Wallet imported:', walletData.publicKey.slice(0, 8) + '...');
      
      return walletData;
    } catch (err) {
      let errorMsg = 'Failed to import wallet';
      
      // Provide helpful error messages for common mistakes
      const input = secretKey.trim();
      
      if (input.length === 0) {
        errorMsg = 'Please enter a secret key';
      } else if (input.startsWith('G')) {
        errorMsg = 'That\'s a public key (starts with G). You need a secret key that starts with S';
      } else if (!input.startsWith('S')) {
        errorMsg = 'Invalid key format. Stellar secret keys start with the letter S';
      } else if (input.length !== 56) {
        errorMsg = `Secret key should be 56 characters (yours is ${input.length})`;
      } else if (err.message.includes('checksum')) {
        errorMsg = 'Invalid secret key - please check for typos';
      } else if (err.message.includes('Invalid')) {
        errorMsg = 'Invalid Stellar secret key format';
      } else {
        errorMsg = 'Failed to import wallet: ' + err.message;
      }
      
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign a transaction with the built-in/imported wallet
   */
  const signTransaction = useCallback(async (transaction) => {
    if (!wallet?.secretKey) {
      throw new Error('No wallet secret key available for signing');
    }
    
    try {
      const keypair = StellarSdk.Keypair.fromSecret(wallet.secretKey);
      transaction.sign(keypair);
      return transaction;
    } catch (err) {
      throw new Error('Failed to sign transaction: ' + err.message);
    }
  }, [wallet]);

  /**
   * Get keypair for signing
   */
  const getKeypair = useCallback(() => {
    if (!wallet?.secretKey) {
      return null;
    }
    return StellarSdk.Keypair.fromSecret(wallet.secretKey);
  }, [wallet]);

  /**
   * Disconnect and clear wallet
   */
  const disconnectWallet = useCallback(async () => {
    try {
      await Preferences.remove({ key: WALLET_KEY });
      await Preferences.remove({ key: WALLET_TYPE_KEY });
      setWallet(null);
      setWalletType(null);
      console.log('🔌 Wallet disconnected');
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
    }
  }, []);

  /**
   * Update wallet balance
   */
  const updateBalance = useCallback(async () => {
    if (!wallet?.publicKey) return;
    
    try {
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(wallet.publicKey);
      const xlmBalance = account.balances.find(b => b.asset_type === 'native');
      const balance = xlmBalance ? parseFloat(xlmBalance.balance) : 0;
      
      const updatedWallet = { ...wallet, balance };
      setWallet(updatedWallet);
      await saveWallet(updatedWallet, walletType);
      
      return balance;
    } catch (err) {
      console.error('Failed to update balance:', err);
      return wallet.balance || 0;
    }
  }, [wallet, walletType]);

  /**
   * Fund wallet using Friendbot (testnet only)
   */
  const fundWallet = useCallback(async () => {
    if (!wallet?.publicKey) {
      throw new Error('No wallet to fund');
    }
    
    try {
      setLoading(true);
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${wallet.publicKey}`
      );
      
      if (!response.ok) {
        throw new Error('Friendbot request failed');
      }
      
      // Wait for transaction to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update balance
      await updateBalance();
      
      console.log('💰 Wallet funded via Friendbot');
      return true;
    } catch (err) {
      throw new Error('Failed to fund wallet: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet, updateBalance]);

  /**
   * Export secret key (with warning)
   */
  const exportSecretKey = useCallback(() => {
    if (!wallet?.secretKey) {
      return null;
    }
    return wallet.secretKey;
  }, [wallet]);

  return {
    // State
    wallet,
    walletType,
    loading,
    error,
    isConnected: !!wallet,
    
    // Actions
    createWallet,
    importWallet,
    signTransaction,
    getKeypair,
    disconnectWallet,
    updateBalance,
    fundWallet,
    exportSecretKey,
    loadStoredWallet,
    
    // Helpers
    hasSecretKey: !!wallet?.secretKey,
    publicKey: wallet?.publicKey || null,
    balance: wallet?.balance || 0,
  };
}

export default useWalletService;
