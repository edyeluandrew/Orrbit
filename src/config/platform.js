/**
 * Platform Configuration
 * 
 * Configuration is loaded from environment variables (.env file)
 * Copy .env.example to .env and set your values there.
 * 
 * NEVER commit .env to git - it contains sensitive data!
 */

// Parse admin wallets from comma-separated env variable
const parseAdminWallets = () => {
  const adminEnv = import.meta.env.VITE_ADMIN_WALLETS || '';
  const wallets = adminEnv.split(',').map(w => w.trim()).filter(w => w.length > 0);
  console.log('🔐 Admin wallets loaded:', wallets);
  return wallets;
};

export const PLATFORM_CONFIG = {
  // Platform wallet address (receives the 2% fee)
  PLATFORM_WALLET: import.meta.env.VITE_PLATFORM_WALLET || '',
  
  // Platform fee percentage
  PLATFORM_FEE_PERCENT: parseInt(import.meta.env.VITE_PLATFORM_FEE_PERCENT || '2', 10),
  
  // Network configuration
  NETWORK: import.meta.env.VITE_NETWORK || 'testnet',
  HORIZON_URL: import.meta.env.VITE_NETWORK === 'mainnet' 
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org',
  NETWORK_PASSPHRASE: import.meta.env.VITE_NETWORK === 'mainnet'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015',
  
  // App info
  APP_NAME: 'Orbit',
  APP_VERSION: '1.0.0',
  
  // Admin wallet addresses (loaded from env)
  ADMIN_WALLETS: parseAdminWallets(),
};

console.log('📋 Platform config loaded:', PLATFORM_CONFIG);

// Helper to get platform wallet object
export const getPlatformWallet = () => ({
  publicKey: PLATFORM_CONFIG.PLATFORM_WALLET,
  type: 'platform',
});

// Check if a wallet is an admin
export const isAdminWallet = (publicKey) => {
  if (!publicKey) return false;
  const isAdmin = PLATFORM_CONFIG.ADMIN_WALLETS.includes(publicKey);
  console.log('🔐 isAdminWallet check:', publicKey?.slice(0, 8) + '...', '→', isAdmin);
  return isAdmin;
};

// Check if platform is properly configured
export const isPlatformConfigured = () => {
  return PLATFORM_CONFIG.PLATFORM_WALLET && 
         PLATFORM_CONFIG.PLATFORM_WALLET.startsWith('G') &&
         PLATFORM_CONFIG.PLATFORM_WALLET.length === 56;
};

export default PLATFORM_CONFIG;
