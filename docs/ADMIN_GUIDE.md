# 🛡️ Admin Guide

## Overview

This guide covers all administrative functions in Orbit. Admin access is restricted to wallets listed in the `VITE_ADMIN_WALLETS` environment variable.

---

## 🔐 Accessing Admin Mode

### Requirements

Your wallet must be in the admin whitelist (`.env` file):

```env
VITE_ADMIN_WALLETS=GXXXXXX...,GYYYYYY...
```

### Switching to Admin Mode

1. Connect your admin wallet
2. Look for the **User/Admin toggle** in the header
3. Click **"Admin"** to switch modes
4. Admin tabs will appear: Transactions, Users, Providers, Dashboard, Settings

---

## 📊 Transactions Tab

### Live Transaction Feed

Monitor all platform payments in real-time:

- **Auto-refresh:** Updates every 5 seconds
- **Live indicator:** Shows "Live updating" status

### Filtering Transactions

| Filter | Options |
|--------|---------|
| Search | Service name, wallet address, TX hash |
| Status | All, Successful, Pending, Failed |
| Service | All services or specific provider |
| Date | All Time, Today, This Week, This Month |

### Quick Stats

- **Total Received:** All XLM volume
- **Successful:** Completed transactions
- **Pending:** Awaiting confirmation
- **Failed:** Transactions that need attention

### Processing Refunds

1. Find the transaction
2. Click the **refund icon** (↩️)
3. Review refund details in modal
4. Click **"Confirm Refund"**
5. Manually send XLM back to user's wallet

*Note: "Refund" marks the transaction in the system. You must manually send the XLM.*

### Exporting Data

1. Apply any filters you want
2. Click **"Export CSV"**
3. Download contains: Date, Service, Amount, Status, Wallet, TX Hash

---

## 👥 Users Tab

### User Overview

Track all users who have made payments:

| Metric | Description |
|--------|-------------|
| Total Users | Unique wallets that paid |
| Active | Users with active subscriptions |
| Churned | Users inactive 30+ days |
| Churn Rate | Percentage of churned users |
| Total Revenue | All-time XLM received |
| Avg Spend | Average per user |

### User List

Each user card shows:

- Wallet address (truncated)
- Status badge (Active/Churned)
- Payment count
- Last activity
- Total spent
- Active subscriptions

### User Details (Expanded)

Click a user to see:

- **Services Subscribed:** All services they've paid for
- **Recent Payments:** Last 5 transactions
- **Lifetime Stats:** First payment, last payment, total value

### Sorting Options

- **Last Active:** Most recently active first
- **Total Spent:** Highest spenders first
- **Subscriptions:** Most subscriptions first

---

## 🏪 Providers Tab

### Adding a Service Provider

1. Click **"Add Provider"**
2. Fill in the form:
   - **Name:** Display name (e.g., "Netflix", "Spotify")
   - **Wallet:** Provider's Stellar public key (G...)
   - **Amount:** Monthly subscription in XLM
   - **Color:** Theme color for UI
3. Click **"Save"**

### Editing a Provider

1. Find the provider card
2. Click the **edit icon** (✏️)
3. Modify details
4. Click **"Save"**

### Deleting a Provider

1. Find the provider card
2. Click the **delete icon** (🗑️)
3. Confirm deletion

*Warning: Existing subscriptions won't be affected, but users can't make new payments.*

### Provider Wallet Requirements

Before adding a provider:

1. Generate wallet at [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
2. Fund the wallet (Friendbot for testnet)
3. Verify it's active on [Stellar Expert](https://stellar.expert/explorer/testnet)

---

## 📈 Dashboard Tab

### Platform Earnings

Shows your 2% platform fee earnings:

- Current period earnings in XLM
- USD equivalent
- Breakdown by time period

### Statistics Cards

| Card | Description |
|------|-------------|
| Platform Earnings | Your 2% cut |
| Total Volume | All payments processed |
| Total Payments | Transaction count |
| Active Subscriptions | Current active subs |

### Live XLM Price

Real-time price from CoinGecko:

- Current USD price
- Updates automatically

### Provider Performance

Rankings by volume:

- Which services generate most revenue
- Payment counts per provider
- Revenue breakdown

### Recent Payments

Quick view of latest transactions across all providers.

### Payment Split Visualization

Visual breakdown showing:
- User pays: 100%
- Platform fee: 2%
- Provider payout: 98%

---

## ⚙️ Settings Tab

### Platform Wallet

Your wallet that receives the 2% fee:

- View current wallet (hidden by default)
- Copy to clipboard
- View on Stellar Expert

### Platform Fee

Adjust the fee percentage:

- Slider: 0% to 10%
- Default: 2%
- Shows example calculation

*Note: Changes save to localStorage. Update `.env` for permanent changes.*

### Network Selection

Toggle between networks:

| Network | Use Case |
|---------|----------|
| Testnet | Development, testing |
| Mainnet | Production, real money |

⚠️ **Warning:** Mainnet uses real XLM. Ensure wallets are funded.

### Admin Wallets

Manage who can access admin panel:

1. **Add Admin:** Enter wallet address, click +
2. **Remove Admin:** Click trash icon
3. **Primary:** First wallet has "Primary" badge

*Minimum 1 admin required.*

### Reset to Defaults

Click to clear all localStorage settings and reload from `.env` file.

---

## 📊 Key Metrics to Monitor

### Daily Checks

- [ ] Failed transactions (need attention?)
- [ ] Pending transactions (stuck?)
- [ ] New user signups
- [ ] Daily volume

### Weekly Checks

- [ ] Churn rate trend
- [ ] Top performing providers
- [ ] User growth
- [ ] Revenue growth

### Monthly Checks

- [ ] Total platform earnings
- [ ] Provider payouts
- [ ] User retention
- [ ] Export reports for accounting

---

## 🚨 Handling Issues

### Failed Transactions

1. Check user's balance
2. Verify provider wallet is active
3. Check Stellar network status
4. Contact user if needed

### Stuck Pending Transactions

1. Check TX hash on Stellar Expert
2. Usually resolves within 30 seconds
3. If persisted, may be network issue

### User Complaints

1. Look up user by wallet in Users tab
2. Check their transaction history
3. Verify payments on blockchain
4. Process refund if needed

### Provider Issues

1. Verify provider wallet is active
2. Check they're receiving payments
3. Update wallet address if changed

---

## 🔒 Security Best Practices

### Access Control

- Limit admin wallet list
- Use hardware wallets for admin accounts
- Rotate admin access periodically

### Monitoring

- Check transactions daily
- Watch for unusual patterns
- Set up alerts (future feature)

### Data Protection

- Never share `.env` file
- Use environment variables in production
- Regular backups of settings

---

## 📱 Mobile Admin Access

Admin features work on mobile:

- Tabs collapse into scrollable bar
- Cards stack vertically
- All functions accessible
- Touch-friendly interface

---

*Admin Guide version 1.0 - December 2024*
