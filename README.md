# 🚀 ORBIT

**Stellar-Powered Subscription Payment Platform**

Orbit is a decentralized subscription payment platform built on the Stellar blockchain. It enables businesses to accept recurring XLM payments with automatic fee splitting between the platform and service providers.

![Stellar](https://img.shields.io/badge/Stellar-Testnet-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Vite](https://img.shields.io/badge/Vite-7-646CFF)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38B2AC)

---

## ✨ Features

### For Users
- 🔗 **Multi-Wallet Support** - Connect via Freighter browser extension or import wallet
- 💳 **One-Click Subscriptions** - Subscribe to services with a single transaction
- 💰 **Real-Time Balance** - Live XLM balance with USD conversion
- 📊 **Transaction History** - Track all your payments and subscriptions
- 🔔 **Payment Reminders** - Get notified before subscription renewals
- 🚰 **Testnet Faucet** - Get free test XLM for development

### For Platform Admins
- 📈 **Live Transaction Feed** - Real-time monitoring of all payments
- 👥 **User Management** - Track subscribers, churn rate, and lifetime value
- 🏪 **Provider Management** - Add/edit/remove service providers
- 📊 **Analytics Dashboard** - Revenue, volume, and performance metrics
- ⚙️ **Settings Panel** - Configure fees, network, and admin wallets
- ↩️ **Refund Management** - Process refunds with transaction tracking
- 📥 **Export to CSV** - Download transaction reports

### Payment Flow
```
User pays 100 XLM
    ├── 98 XLM → Service Provider (98%)
    └── 2 XLM  → Platform Wallet (2% fee)
```

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite 7, Tailwind CSS 3
- **Blockchain:** Stellar SDK, Horizon API
- **Wallet:** Freighter API (browser extension)
- **Mobile:** Capacitor (iOS/Android ready)
- **State:** React Context, localStorage persistence

---

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- [Freighter Wallet](https://freighter.app/) browser extension

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/orbit.git
cd orbit

# Install all dependencies
npm run install:all

# Or install separately:
cd frontend && npm install
cd ../backend && npm install

# Copy environment files
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Start both frontend and backend
npm run dev

# Or start separately:
npm run dev:frontend  # Frontend at http://localhost:5173
npm run dev:backend   # Backend at http://localhost:3001
```

### Database Setup

```bash
# Run database migrations
npm run db:migrate

# Seed with sample data (optional)
npm run db:seed
```

---

## ⚙️ Configuration

### Frontend (`frontend/.env`)

```env
# Platform wallet address (receives the platform fee)
VITE_PLATFORM_WALLET=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Admin wallet addresses (comma-separated)
VITE_ADMIN_WALLETS=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Platform fee percentage (e.g., 2 = 2%)
VITE_PLATFORM_FEE_PERCENT=2

# Network: testnet or mainnet
VITE_NETWORK=testnet

# Backend API URL
VITE_API_URL=http://localhost:3001/api

# WebSocket URL
VITE_WS_URL=ws://localhost:3001
```

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orbit_dev
DATABASE_SSL=false

# Stellar Network
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Platform
PLATFORM_WALLET_PUBLIC=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
PLATFORM_FEE_PERCENT=2

# Auth
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
REQUIRE_SIGNATURE=false

# Security
INTERNAL_API_KEY=your-internal-api-key
STELLAR_WEBHOOK_SECRET=your-webhook-secret
```

### Generating Wallets

1. Go to [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
2. Click **"Generate keypair"**
3. Fund with Friendbot for testnet
4. Use the Public Key (G...) in your config

---

## 🚀 Usage

### As a User

1. **Connect Wallet** - Click "Connect Freighter" or import a wallet
2. **Get Test XLM** - Use the faucet to fund your wallet (testnet only)
3. **Subscribe** - Select a service and click "Pay"
4. **Confirm** - Approve the transaction in Freighter
5. **Track** - View your subscriptions and transaction history

### As an Admin

1. **Connect Admin Wallet** - Log in with a wallet listed in `VITE_ADMIN_WALLETS`
2. **Toggle Admin Mode** - Click the "Admin" button in the header
3. **Manage Platform:**
   - **Transactions** - Monitor live payments, filter, search, process refunds
   - **Users** - View subscribers, track churn, analyze user behavior
   - **Providers** - Add/edit service providers with their wallet addresses
   - **Dashboard** - View analytics, revenue, and platform performance
   - **Settings** - Adjust fees, network, and admin access

---

## 📁 Project Structure

```
orbit/
├── frontend/                       # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.jsx      # Analytics dashboard
│   │   │   ├── AdminTransactions.jsx   # Live transaction feed
│   │   │   ├── BalanceDisplay.jsx      # Wallet balance widget
│   │   │   ├── CreatorDiscovery.jsx    # Creator browsing
│   │   │   ├── CreatorProfile.jsx      # Creator profile page
│   │   │   ├── FreighterConnect.jsx    # Freighter wallet connection
│   │   │   ├── Onboarding.jsx          # User onboarding flow
│   │   │   ├── ServiceProviderManager.jsx  # Provider CRUD
│   │   │   ├── SettingsPanel.jsx       # Platform settings
│   │   │   ├── SubscriberProfile.jsx   # Subscriber dashboard
│   │   │   ├── SubscriptionForm.jsx    # Payment form
│   │   │   ├── TransactionFeed.jsx     # Transaction history
│   │   │   ├── WalletConnect.jsx       # Multi-wallet support
│   │   │   └── XLMFaucet.jsx           # Testnet faucet
│   │   ├── config/
│   │   │   └── platform.js             # Environment config loader
│   │   ├── context/
│   │   │   ├── ThemeContext.jsx        # Dark/light mode
│   │   │   └── ToastContext.jsx        # Toast notifications
│   │   ├── hooks/
│   │   │   ├── useApi.js               # Backend API calls
│   │   │   ├── usePriceConverter.js    # XLM/USD conversion
│   │   │   ├── usePullToRefresh.js     # Mobile pull-to-refresh
│   │   │   ├── useUserProfile.js       # User profile management
│   │   │   └── useWalletSession.js     # Wallet session persistence
│   │   ├── services/
│   │   │   └── api.js                  # API service layer
│   │   ├── App.jsx                     # Main app component
│   │   └── main.jsx                    # Entry point
│   ├── .env.example                    # Frontend env template
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                        # Fastify Backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── admin.js                # Admin endpoints
│   │   │   ├── auth.js                 # Wallet authentication
│   │   │   ├── creators.js             # Creator management
│   │   │   ├── subscriptions.js        # Subscription handling
│   │   │   ├── transactions.js         # Transaction history
│   │   │   ├── users.js                # User profiles
│   │   │   └── webhooks.js             # Stellar webhooks
│   │   ├── services/
│   │   │   └── stellar.js              # Stellar blockchain integration
│   │   ├── db/
│   │   │   ├── index.js                # Database connection & ORM
│   │   │   ├── migrate.js              # Database migrations
│   │   │   └── seed.js                 # Sample data seeding
│   │   ├── websocket/
│   │   │   └── index.js                # Real-time notifications
│   │   ├── workers/
│   │   │   └── renewalWorker.js        # Subscription renewal cron
│   │   └── index.js                    # Server entry point
│   ├── .env.example                    # Backend env template
│   └── package.json
│
├── docs/                           # Documentation
│   ├── API_REFERENCE.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   └── ...
│
├── docker-compose.yml              # Docker setup
├── package.json                    # Root workspace config
└── README.md
```

---

## 💰 Adding a Service Provider

1. **Generate a wallet** for the provider at [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
2. **Fund the wallet** with Friendbot
3. **Go to Admin → Providers**
4. **Click "Add Provider"** and fill in:
   - Name (e.g., "Netflix", "Spotify")
   - Wallet Address (provider's public key)
   - Monthly Amount (in XLM)
   - Color theme

When users pay, the payment automatically splits:
- 98% goes to the provider's wallet
- 2% goes to your platform wallet

---

## 🔐 Security Notes

- ⚠️ **Never commit `.env` files** to version control
- 🔑 **Secret keys** are only needed for the provider to access their funds
- 🌐 **Testnet** is for development - switch to mainnet for production
- 👛 **Freighter** handles all transaction signing securely

---

## 🧪 Testing

### Test Payment Flow

1. Create a user wallet and fund it via faucet
2. Create a provider wallet and fund it via faucet
3. Add the provider in Admin → Providers
4. Switch to User mode and subscribe
5. Check both wallets on [Stellar Expert](https://stellar.expert/explorer/testnet)

### Verify Payment Split
```
Payment: 20 XLM
├── Provider receives: 19.6 XLM (98%)
└── Platform receives: 0.4 XLM (2%)
```

---

## 📱 Mobile Support

Orbit uses Capacitor for native mobile apps:

```bash
# Add platforms
npx cap add ios
npx cap add android

# Build and sync
npm run build
npx cap sync

# Open in native IDE
npx cap open ios
npx cap open android
```

---

## � Documentation

Comprehensive documentation is available in the [docs/](docs/) folder:

| Document | Description |
|----------|-------------|
| [Business Model](docs/BUSINESS_MODEL.md) | Revenue model, market analysis, financial projections |
| [Architecture](docs/ARCHITECTURE.md) | System design, data models, security architecture |
| [User Guide](docs/USER_GUIDE.md) | End-user guide for payments and subscriptions |
| [Admin Guide](docs/ADMIN_GUIDE.md) | Platform administration and management |
| [API Reference](docs/API_REFERENCE.md) | Stellar API, Freighter API, data structures |
| [Security](docs/SECURITY.md) | Security model, compliance, best practices |
| [Deployment](docs/DEPLOYMENT.md) | Production deployment guide (Vercel, Netlify, Docker) |
| [Contributing](docs/CONTRIBUTING.md) | Contribution guidelines and coding standards |
| [Roadmap](docs/ROADMAP.md) | Product roadmap and planned features |
| [Changelog](docs/CHANGELOG.md) | Version history and release notes |
| [Pitch Deck](docs/PITCH_DECK.md) | Investor presentation |

---

## 🛣️ Roadmap

### Q1 2025
- [ ] Payment splitting (atomic multi-destination)
- [ ] Backend infrastructure
- [ ] Multi-wallet support (Lobstr, xBull)

### Q2 2025
- [ ] Mobile apps (iOS/Android)
- [ ] Public API
- [ ] Mainnet launch

### Q3 2025+
- [ ] Multi-currency support (USDC)
- [ ] Provider self-service portal
- [ ] Enterprise features

See [full roadmap](docs/ROADMAP.md) for details.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](docs/CONTRIBUTING.md) first.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📞 Support

- 📖 Check the [documentation](docs/)
- 🐛 Create an issue on GitHub
- 💬 Join discussions
- 📚 Stellar docs at [developers.stellar.org](https://developers.stellar.org)

---

**Built with ⚡ on Stellar**
