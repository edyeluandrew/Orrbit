# 🏗️ Technical Architecture

## System Overview

Orbit is a decentralized subscription payment platform with a React frontend and Stellar blockchain backend.

```
┌─────────────────────────────────────────────────────────────────┐
│                         ORBIT PLATFORM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   React UI   │◄──►│   Freighter  │◄──►│   Stellar    │     │
│  │   (Vite)     │    │   Wallet     │    │   Network    │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         │                                        │              │
│         ▼                                        ▼              │
│  ┌──────────────┐                       ┌──────────────┐       │
│  │ localStorage │                       │   Horizon    │       │
│  │  (State)     │                       │   API        │       │
│  └──────────────┘                       └──────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧱 Architecture Layers

### 1. Presentation Layer (React)

```
src/
├── App.jsx                 # Main application component
├── components/
│   ├── AdminDashboard.jsx      # Analytics & metrics
│   ├── AdminTransactions.jsx   # Transaction monitoring
│   ├── BalanceDisplay.jsx      # Wallet balance widget
│   ├── MultiWalletConnect.jsx  # Wallet connection
│   ├── ServiceProviderManager.jsx  # CRUD for providers
│   ├── SettingsPanel.jsx       # Platform configuration
│   ├── SubscriptionForm.jsx    # Payment form
│   ├── TransactionFeed.jsx     # User transaction history
│   ├── UsersManager.jsx        # User analytics
│   └── XLMFaucet.jsx          # Testnet funding
├── context/
│   └── ToastContext.jsx       # Notification system
├── hooks/
│   ├── usePriceConverter.js   # XLM/USD rates
│   ├── useRecurringPayments.js # Subscription logic
│   ├── useWalletService.js    # Wallet operations
│   └── useWalletSession.js    # Session persistence
└── config/
    └── platform.js            # Environment config
```

### 2. State Management Layer

| Store | Technology | Purpose |
|-------|------------|---------|
| User Session | localStorage | Wallet persistence |
| Transactions | localStorage | Payment history |
| Subscriptions | localStorage | Active subs |
| Providers | localStorage | Service catalog |
| Settings | localStorage | Platform config |

### 3. Blockchain Layer (Stellar)

```
┌────────────────────────────────────────────────┐
│                 Stellar Network                 │
├────────────────────────────────────────────────┤
│  Testnet: horizon-testnet.stellar.org          │
│  Mainnet: horizon.stellar.org                  │
├────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  User    │  │ Provider │  │ Platform │    │
│  │  Wallet  │  │  Wallet  │  │  Wallet  │    │
│  └──────────┘  └──────────┘  └──────────┘    │
└────────────────────────────────────────────────┘
```

---

## 🔐 Wallet Integration

### Freighter Wallet Flow

```
1. User clicks "Connect Wallet"
         │
         ▼
2. Check if Freighter installed
         │
         ▼
3. Request public key permission
         │
         ▼
4. Freighter popup → User approves
         │
         ▼
5. Receive public key
         │
         ▼
6. Fetch balance from Horizon API
         │
         ▼
7. Store session in localStorage
```

### Supported Wallet Types

| Wallet | Method | Security |
|--------|--------|----------|
| Freighter | Browser Extension | Keys in extension |
| Import | Secret Key Input | Keys in memory only |

---

## 💳 Payment Flow

### Transaction Sequence

```
┌─────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐
│  User   │     │  Orbit   │     │Freighter│     │ Stellar  │
└────┬────┘     └────┬─────┘     └────┬────┘     └────┬─────┘
     │               │                │               │
     │ Select Service│                │               │
     │──────────────►│                │               │
     │               │                │               │
     │               │ Build Transaction              │
     │               │───────────────►│               │
     │               │                │               │
     │               │    Sign Request│               │
     │               │◄───────────────│               │
     │               │                │               │
     │  Approve in   │                │               │
     │  Freighter    │                │               │
     │──────────────────────────────►│               │
     │               │                │               │
     │               │                │ Submit TX     │
     │               │                │──────────────►│
     │               │                │               │
     │               │                │   TX Result   │
     │               │                │◄──────────────│
     │               │                │               │
     │               │  Update UI     │               │
     │◄──────────────│◄───────────────│               │
     │               │                │               │
```

### Payment Split Logic

```javascript
// Current Implementation (single destination)
const payment = {
  destination: providerWallet,
  amount: totalAmount,
};

// Future Implementation (atomic split)
const operations = [
  {
    destination: providerWallet,
    amount: totalAmount * 0.98, // 98%
  },
  {
    destination: platformWallet,
    amount: totalAmount * 0.02, // 2%
  },
];
```

---

## 📊 Data Models

### User Session

```typescript
interface WalletSession {
  publicKey: string;
  walletType: 'freighter' | 'imported';
  balance: number;
  connectedAt: string;
}
```

### Transaction Record

```typescript
interface Transaction {
  id: number;
  hash: string;
  service: string;
  serviceName: string;
  amount: number;
  status: 'success' | 'pending' | 'failed' | 'refunded';
  timestamp: string;
  fromWallet: string;
  toWallet: string;
}
```

### Service Provider

```typescript
interface ServiceProvider {
  id: number;
  name: string;
  wallet: string;
  amount: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}
```

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
}
```

---

## 🔌 API Integrations

### Stellar Horizon API

| Endpoint | Purpose |
|----------|---------|
| `GET /accounts/{id}` | Fetch balance |
| `POST /transactions` | Submit payment |
| `GET /accounts/{id}/payments` | Payment history |

### CoinGecko API

| Endpoint | Purpose |
|----------|---------|
| `GET /simple/price` | XLM/USD rate |

### Stellar Friendbot (Testnet)

| Endpoint | Purpose |
|----------|---------|
| `GET /friendbot?addr={id}` | Fund test wallet |

---

## 🛡️ Security Architecture

### Frontend Security

```
┌─────────────────────────────────────────┐
│           Security Measures             │
├─────────────────────────────────────────┤
│ ✓ No secret keys stored in app          │
│ ✓ Freighter handles all signing         │
│ ✓ Environment variables for config      │
│ ✓ Admin wallet verification             │
│ ✓ Input validation on all forms         │
└─────────────────────────────────────────┘
```

### Key Management

| Key Type | Storage | Access |
|----------|---------|--------|
| User Secret Key | Freighter (encrypted) | Never exposed |
| Platform Wallet | .env file | Server-side only |
| Admin Wallets | .env file | Whitelist check |

### Transaction Security

1. **Non-Custodial** - Platform never holds user funds
2. **User Signing** - All TXs signed by user in Freighter
3. **On-Chain Verification** - All payments verifiable on blockchain
4. **No Chargebacks** - Blockchain finality

---

## 📱 Responsive Design

### Breakpoints

| Screen | Size | Layout |
|--------|------|--------|
| Mobile | < 640px | Single column |
| Tablet | 640-1024px | 2 column |
| Desktop | > 1024px | 3 column |

### Component Responsiveness

- Navigation tabs collapse on mobile
- Cards stack vertically
- Tables become scrollable
- Font sizes adjust

---

## 🚀 Deployment Architecture

### Current (Development)

```
┌─────────────┐
│   Vite      │
│   Dev Server│ → localhost:5173
└─────────────┘
```

### Production (Recommended)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   GitHub    │────►│   Vercel/   │────►│   CDN       │
│   Repo      │     │   Netlify   │     │   (Global)  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Stellar   │
                    │   Mainnet   │
                    └─────────────┘
```

### Environment Configuration

| Environment | Network | API |
|-------------|---------|-----|
| Development | Testnet | horizon-testnet.stellar.org |
| Staging | Testnet | horizon-testnet.stellar.org |
| Production | Mainnet | horizon.stellar.org |

---

## 🔄 Future Architecture (Backend)

```
┌─────────────────────────────────────────────────────────────────┐
│                      FUTURE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │  React   │◄──►│  API     │◄──►│ Database │    │  Stellar │ │
│  │  Client  │    │  Server  │    │ (Postgres)│    │  Network │ │
│  └──────────┘    └────┬─────┘    └──────────┘    └────┬─────┘ │
│                       │                               │        │
│                       └───────────────────────────────┘        │
│                                   │                             │
│                            ┌──────┴──────┐                     │
│                            │   Worker    │                     │
│                            │  (Cron Jobs)│                     │
│                            └─────────────┘                     │
│                                   │                             │
│                            ┌──────┴──────┐                     │
│                            │   Email     │                     │
│                            │   Service   │                     │
│                            └─────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📈 Performance Considerations

### Current Optimizations

- React 19 concurrent features
- Vite for fast HMR and bundling
- Lazy loading of components
- Memoized callbacks (useCallback)
- LocalStorage caching

### Metrics Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Transaction Confirmation | < 5s |
| API Response Time | < 500ms |

---

## 🧪 Testing Strategy

### Unit Tests (Future)

- Component rendering
- Hook functionality
- Utility functions

### Integration Tests (Future)

- Wallet connection flow
- Payment flow
- Admin functions

### E2E Tests (Future)

- Complete user journeys
- Cross-browser testing
- Mobile testing

---

*Architecture document version 1.0 - December 2024*
