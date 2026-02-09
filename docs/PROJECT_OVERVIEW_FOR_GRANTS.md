# ORBIT - Comprehensive Project Documentation for Grants & Executive Review

---

## 1. Executive Summary

Orbit is a decentralized, non-custodial subscription payment platform built on the Stellar blockchain. It enables businesses, NGOs, and individuals to accept and manage recurring XLM payments with instant settlement, ultra-low fees, and full user control. Orbit is designed for Africa and global emerging markets, empowering the unbanked and underbanked to participate in the digital economy.

---

## 2. Problem Statement

### 2.1 Market Pain Points
- **High Fees:** Traditional payment processors charge 3-5% per transaction, plus fixed fees, making micro-payments and subscriptions expensive.
- **Limited Access:** 2.5 billion adults globally are unbanked, especially in Africa, and cannot access digital services that require cards or bank accounts.
- **Slow Settlement:** Bank payments can take days to settle; crypto alternatives are often expensive or complex.
- **Lack of Control:** Users struggle to manage, track, or cancel subscriptions, leading to lost trust and revenue.

### 2.2 Opportunity
- The global subscription economy is projected to reach $275B by 2028, with Africa as a high-growth region.
- Digital transformation and mobile adoption are accelerating across the continent.

---

## 3. Solution Overview

Orbit provides a blockchain-based, non-custodial platform for subscription payments:
- **2% Platform Fee:** Lower than any traditional provider
- **Instant Settlement:** Payments clear in 3-5 seconds on Stellar
- **No Bank Required:** Anyone with a smartphone and wallet can participate
- **User Control:** Subscriptions can be managed or canceled anytime
- **Transparency:** All transactions are public and auditable on Stellar
- **Security:** Users retain full control of their funds and private keys

---

## 4. Business Model

### 4.1 Revenue Streams
- **Platform Fee:** 2% of every transaction
- **Premium Provider Accounts:** Monthly fee for advanced analytics and features
- **Enterprise Integrations:** Custom pricing for large partners

### 4.2 Target Market

**Primary: Crypto Content Creators (~26,000 globally)**
- **Crypto YouTubers** (~15,000) - Premium video content, communities
- **Newsletter Writers** (~3,000) - Premium research, market analysis
- **Discord/Telegram Owners** (~8,000) - VIP community access, alpha groups

**Secondary (Future):**
- Trading Signal Providers (~10,000)
- Web3 Tool/API Developers (~5,000)
- Crypto Educators & Courses (~8,000)

**Why This Market:**
- Creators and subscribers already have crypto wallets
- Frustrated with Patreon's 5-12% fees
- Want to accept crypto from their crypto-native audience

### 4.3 Competitive Advantage
- Non-custodial (no custody risk, regulatory advantage)
- Ultra-low fees (2% vs. 3-5%+)
- Instant, global settlement
- User-friendly, mobile-first design
- Open, auditable, and secure

---

## 5. Technical Architecture

### 5.1 System Components
- **Frontend:** React 19, Vite 7, Tailwind CSS 3
- **Blockchain:** Stellar SDK, Horizon API (Testnet/Mainnet)
- **Wallet:** Freighter browser extension (non-custodial)
- **Mobile:** Capacitor (iOS/Android ready)
- **State:** React Context, localStorage (no user data stored on servers)

### 5.2 Security Model
- **Non-custodial:** Users control their funds and private keys; Orbit never has access
- **Admin Access:** Managed via wallet whitelist (no passwords, no accounts)
- **Atomic Payments:** All payments are atomic and verifiable on-chain
- **No Sensitive Data:** No personal data or private keys stored by Orbit
- **Input Validation:** All wallet addresses and amounts are validated
- **HTTPS:** Enforced in production

### 5.3 Payment Flow
1. User connects wallet (Freighter)
2. Selects a service and subscribes
3. Approves payment in wallet (2% fee auto-split)
4. Provider receives 98%, platform receives 2% instantly
5. All activity is visible on Stellar blockchain

### 5.4 Data Privacy
- No personal data, emails, or private keys are ever stored by Orbit
- All user data is stored locally in the browser (localStorage)
- All payments and subscriptions are public on the blockchain

### 5.5 Compliance
- Non-custodial model reduces regulatory burden
- Users are responsible for their own tax and reporting
- Platform can add KYC/AML for enterprise/mainnet as needed

---

## 6. Key Features

### 6.1 For Users
- Connect wallet (Freighter)
- Subscribe to services with one click
- Real-time XLM balance and USD conversion
- View transaction and subscription history
- Cancel subscriptions anytime
- Testnet faucet for onboarding

### 6.2 For Providers/Admins
- Add/edit/remove service providers
- Live transaction feed and analytics
- User management and churn analytics
- Platform fee and network settings
- Refund management
- Export transactions to CSV

### 6.3 Security & Incident Response
- No custody of user funds or private keys
- All transactions require explicit user signature
- Platform wallets and admin wallets managed via environment variables
- HTTPS enforced in production
- Input validation for all wallet addresses and amounts
- Incident response plan for wallet compromise, user support, and audit

---

## 7. Roadmap (2025-2026)

| Quarter | Milestone |
|---------|-----------|
| Q1 2025 | Mainnet launch, payment splitting, backend infrastructure |
| Q2 2025 | Mobile apps (iOS/Android), public API, multi-wallet support |
| Q3 2025 | Provider self-service portal, enterprise features |
| Q4 2025 | Regional expansion, fiat on-ramps, compliance upgrades |
| 2026    | White-label, team subscriptions, DeFi integration |

---

## 8. Impact & Use Cases

### 8.1 Financial Inclusion
- Enables unbanked users to access digital services and subscriptions
- Supports micro-payments and micro-donations

### 8.2 NGOs & Education
- Accept micro-donations and recurring tuition payments
- Transparent, auditable funding flows

### 8.3 Content Creators & Startups
- Monetize audiences with global reach
- Reduce payment costs and expand to new markets

### 8.4 Government & Enterprise
- Enable transparent, low-cost recurring payments for public services

---

## 9. Competitive Analysis

| Provider         | Model         | Fees         | Custody | Settlement | Africa Ready | Orbit Advantage |
|------------------|--------------|--------------|---------|------------|--------------|-----------------|
| Stripe           | Custodial     | 2.9% + $0.30 | Yes     | 2-7 days   | No           | Lower fees, no custody |
| PayPal           | Custodial     | 2.9%         | Yes     | 1-3 days   | No           | Non-custodial, instant |
| Recurly          | SaaS          | Expensive    | Yes     | Days       | No           | Affordable, open |
| Request Network  | Ethereum      | $5+          | No      | Minutes    | No           | Stellar: fast, cheap |
| Orbit            | Stellar       | 2%           | No      | 3-5 sec    | Yes          | Africa focus, open |

---

## 10. Team & Contact

- **Founder:** [Your Name]
- **Email:** [your-email]
- **GitHub:** [repo-link]
- **Demo:** [testnet-demo-link]

---

*Prepared for grant applications and executive review. December 2025.*
