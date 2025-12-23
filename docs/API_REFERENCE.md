# 🔌 API Reference

## Overview

Orbit currently operates as a frontend-only application that interacts directly with the Stellar blockchain. This document covers the external APIs used and the internal data structures.

---

## 🌐 External APIs

### Stellar Horizon API

The Horizon API is Stellar's REST API for interacting with the blockchain.

#### Networks

| Network | URL |
|---------|-----|
| Testnet | `https://horizon-testnet.stellar.org` |
| Mainnet | `https://horizon.stellar.org` |

#### Endpoints Used

##### Get Account Details

```http
GET /accounts/{account_id}
```

**Purpose:** Fetch wallet balance and account info

**Response:**
```json
{
  "id": "GXXXXXX...",
  "balances": [
    {
      "asset_type": "native",
      "balance": "100.0000000"
    }
  ],
  "sequence": "123456789"
}
```

##### Submit Transaction

```http
POST /transactions
Content-Type: application/x-www-form-urlencoded

tx={base64_encoded_transaction}
```

**Purpose:** Submit signed payment transaction

**Response:**
```json
{
  "hash": "abc123...",
  "ledger": 12345678,
  "successful": true
}
```

##### Get Account Payments

```http
GET /accounts/{account_id}/payments
```

**Purpose:** Fetch payment history

---

### Stellar Friendbot (Testnet Only)

```http
GET https://friendbot.stellar.org?addr={account_id}
```

**Purpose:** Fund testnet account with 10,000 XLM

**Response:**
```json
{
  "hash": "abc123...",
  "result": "success"
}
```

---

### CoinGecko Price API

```http
GET https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd
```

**Purpose:** Get current XLM/USD exchange rate

**Response:**
```json
{
  "stellar": {
    "usd": 0.1234
  }
}
```

---

## 🔑 Freighter Wallet API

### Check Installation

```javascript
import { isConnected } from '@stellar/freighter-api';

const connected = await isConnected();
// Returns: true | false
```

### Get Public Key

```javascript
import { getPublicKey } from '@stellar/freighter-api';

const publicKey = await getPublicKey();
// Returns: "GXXXXXX..."
```

### Get Network

```javascript
import { getNetwork } from '@stellar/freighter-api';

const network = await getNetwork();
// Returns: "TESTNET" | "PUBLIC"
```

### Sign Transaction

```javascript
import { signTransaction } from '@stellar/freighter-api';

const signedXDR = await signTransaction(transactionXDR, {
  network: 'TESTNET',
  networkPassphrase: 'Test SDF Network ; September 2015'
});
```

---

## 📦 Internal Data Structures

### LocalStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `orbit-wallet-session` | Object | Current wallet session |
| `orbit-transactions` | Array | User transaction history |
| `orbit-subscriptions` | Array | Active subscriptions |
| `orbit-payment-history` | Array | All platform payments |
| `orbit-service-providers` | Array | Service provider catalog |
| `orbit-settings` | Object | Platform settings |

---

### Wallet Session

```typescript
interface WalletSession {
  publicKey: string;
  walletType: 'freighter' | 'imported';
  balance: number;
  connectedAt: string; // ISO date
}
```

**Storage Key:** `orbit-wallet-session`

**Example:**
```json
{
  "publicKey": "GDDV7T4K4JIB7WEFXQ5AT3SQOFPFUYP5E7E4FZLIWTSJMDOLXPVZFKYV",
  "walletType": "freighter",
  "balance": 9850.5,
  "connectedAt": "2024-12-21T10:30:00Z"
}
```

---

### Transaction

```typescript
interface Transaction {
  id: number;
  hash: string;
  type: 'payment' | 'subscription' | 'cancellation';
  service: string;
  serviceName: string;
  amount: number;
  status: 'success' | 'pending' | 'failed' | 'refunded';
  timestamp: string;
  fromWallet: string;
  toWallet: string;
  platformFee?: number;
  refundedAt?: string;
}
```

**Storage Key:** `orbit-transactions` (user's own) / `orbit-payment-history` (all)

**Example:**
```json
{
  "id": 1703159400000,
  "hash": "abc123def456...",
  "type": "payment",
  "service": "chatgpt-pro",
  "serviceName": "ChatGPT Pro",
  "amount": 20,
  "status": "success",
  "timestamp": "2024-12-21T10:30:00Z",
  "fromWallet": "GDDV7T4K...",
  "toWallet": "GBXYZ123..."
}
```

---

### Subscription

```typescript
interface Subscription {
  id: number;
  service: string;
  amount: number;
  status: 'active' | 'cancelled' | 'expired';
  date: string;
  nextBilling: string;
  paymentTxHash: string;
  paymentDue?: boolean;
}
```

**Storage Key:** `orbit-subscriptions`

**Example:**
```json
{
  "id": 1703159400001,
  "service": "ChatGPT Pro",
  "amount": 20,
  "status": "active",
  "date": "12/21/2024",
  "nextBilling": "1/20/2025",
  "paymentTxHash": "abc123..."
}
```

---

### Service Provider

```typescript
interface ServiceProvider {
  id: number;
  name: string;
  wallet: string;
  amount: number;
  color: 'emerald' | 'purple' | 'orange' | 'blue' | 'green' | 'red';
  createdAt: string;
  updatedAt: string;
}
```

**Storage Key:** `orbit-service-providers`

**Example:**
```json
{
  "id": 1703159400002,
  "name": "ChatGPT Pro",
  "wallet": "GBXYZ123...",
  "amount": 20,
  "color": "emerald",
  "createdAt": "2024-12-21T10:30:00Z",
  "updatedAt": "2024-12-21T10:30:00Z"
}
```

---

### Platform Settings

```typescript
interface Settings {
  platformWallet: string;
  platformFeePercent: number;
  network: 'testnet' | 'mainnet';
  adminWallets: string[];
}
```

**Storage Key:** `orbit-settings`

**Example:**
```json
{
  "platformWallet": "GDDV7T4K...",
  "platformFeePercent": 2,
  "network": "testnet",
  "adminWallets": ["GDDV7T4K..."]
}
```

---

## 🔧 Configuration API

### Environment Variables

| Variable | Type | Description |
|----------|------|-------------|
| `VITE_PLATFORM_WALLET` | string | Platform fee recipient |
| `VITE_ADMIN_WALLETS` | string | Comma-separated admin wallets |
| `VITE_PLATFORM_FEE_PERCENT` | number | Fee percentage (e.g., 2) |
| `VITE_NETWORK` | string | `testnet` or `mainnet` |

### Config Functions

```javascript
// src/config/platform.js

// Get platform wallet
getPlatformWallet(): string

// Check if wallet is admin
isAdminWallet(publicKey: string): boolean

// Get platform fee percentage
getPlatformFeePercent(): number

// Get current network
getNetwork(): 'testnet' | 'mainnet'
```

---

## 🪝 React Hooks API

### useWalletSession

```javascript
const {
  isRestoring,      // boolean - Loading saved session
  restoredWallet,   // WalletSession | null
  saveWalletSession,// (wallet) => void
  clearWalletSession// () => void
} = useWalletSession();
```

### usePriceConverter

```javascript
const {
  xlmPrice,    // number - Current XLM/USD rate
  convertToUSD // (xlmAmount) => string - Formatted USD value
} = usePriceConverter();
```

### useRecurringPayments

```javascript
const {
  getUpcomingPayments // () => Subscription[] - Due soon
} = useRecurringPayments({
  subscriptions,      // Subscription[]
  wallet,             // WalletSession
  platformWallet,     // string
  onPaymentDue,       // callback
  onPaymentReminder,  // callback
  enabled             // boolean
});
```

### useWalletService

```javascript
const {
  importWallet,  // (secretKey) => Promise<WalletSession>
  getBalance,    // (publicKey) => Promise<number>
  sendPayment    // (params) => Promise<Transaction>
} = useWalletService();
```

---

## 🔄 Future API (Planned)

### REST API Endpoints

When backend is implemented:

```
POST   /api/auth/verify          - Verify wallet signature
GET    /api/transactions         - List transactions
POST   /api/transactions         - Record new transaction
GET    /api/subscriptions        - List subscriptions
POST   /api/subscriptions        - Create subscription
DELETE /api/subscriptions/:id    - Cancel subscription
GET    /api/providers            - List providers
POST   /api/providers            - Create provider
PUT    /api/providers/:id        - Update provider
DELETE /api/providers/:id        - Delete provider
GET    /api/users                - List users (admin)
GET    /api/analytics            - Platform analytics (admin)
```

### Webhook Events

```
payment.success      - Payment completed
payment.failed       - Payment failed
subscription.created - New subscription
subscription.cancelled - Subscription cancelled
subscription.renewed - Auto-renewal processed
```

---

*API Reference version 1.0 - December 2024*
