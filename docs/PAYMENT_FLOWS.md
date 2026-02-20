# Orbit Payment Flows - Complete Technical Breakdown

## Table of Contents
1. [How Payments Actually Work](#how-payments-actually-work)
2. [Subscriber Flow (Complete Journey)](#subscriber-flow)
3. [Creator Flow (Complete Journey)](#creator-flow)
4. [Payment Split Mechanics](#payment-split-mechanics)
5. [Current Limitations & Solutions](#current-limitations)
6. [Future: Streaming Payments](#streaming-payments)

---

## How Payments Actually Work

### The Core Reality

Orbit uses **direct, non-custodial Stellar payments**. This means:

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOW MONEY FLOWS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Subscriber's Freighter Wallet                                  │
│            │                                                      │
│            │ Signs transaction (user sees exactly what happens)  │
│            │                                                      │
│            ▼                                                      │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │        SINGLE ATOMIC TRANSACTION                         │    │
│   │        (Both payments succeed or both fail)              │    │
│   │                                                          │    │
│   │   Operation 1: 2% ────────────▶ Platform Wallet          │    │
│   │   Operation 2: 98% ───────────▶ Creator Wallet           │    │
│   │                                                          │    │
│   │   Total Time: 3-5 seconds                                │    │
│   │   Total Fee: ~0.00001 XLM                                │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│   Creator receives XLM INSTANTLY in their personal wallet         │
│   NO MIDDLEMAN HOLDS FUNDS AT ANY POINT                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Technical Facts

| Aspect | Reality |
|--------|---------|
| **Who holds funds?** | Nobody. Direct wallet-to-wallet transfer |
| **Settlement time** | 3-5 seconds (1 Stellar ledger close) |
| **Transaction fee** | ~0.00001 XLM (~$0.000001 USD) |
| **Platform fee** | 2% of subscription amount |
| **Creator receives** | 98% of subscription amount |
| **Can Orbit touch funds?** | No. Non-custodial design |
| **Reversible?** | No. Blockchain transactions are final |

---

## Subscriber Flow

### Complete Journey: From Discovery to Payment

```
SUBSCRIBER JOURNEY
==================

Step 1: CONNECT WALLET
─────────────────────────────────────────────────────────
┌──────────────────┐    ┌──────────────────┐
│  User opens      │───▶│  Click "Connect  │
│  Orbit website   │    │  with Freighter" │
└──────────────────┘    └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Freighter popup │
                        │  asks permission │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Public key      │
                        │  shared (no      │
                        │  private key!)   │
                        └──────────────────┘

Step 2: DISCOVER CREATORS
─────────────────────────────────────────────────────────
┌──────────────────┐    ┌──────────────────┐
│  Browse creator  │───▶│  View creator    │
│  discovery feed  │    │  profile & tiers │
└──────────────────┘    └────────┬─────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────┐
│  CREATOR PROFILE                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │ @cryptotrader_mike                              │    │
│  │ "Daily crypto analysis & alpha signals"         │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  TIERS:                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ BASIC       │ │ PRO         │ │ VIP         │       │
│  │ 10 XLM/mo   │ │ 25 XLM/mo   │ │ 100 XLM/mo  │       │
│  │ Newsletter  │ │ + Signals   │ │ + 1-on-1    │       │
│  │ [Subscribe] │ │ [Subscribe] │ │ [Subscribe] │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└────────────────────────────────────────────────────────┘

Step 3: INITIATE SUBSCRIPTION
─────────────────────────────────────────────────────────
┌──────────────────┐    ┌──────────────────┐
│  Click           │───▶│  Orbit shows     │
│  "Subscribe"     │    │  payment details │
└──────────────────┘    └────────┬─────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────┐
│  PAYMENT CONFIRMATION                                   │
│                                                         │
│  Subscribing to: @cryptotrader_mike                    │
│  Tier: PRO                                             │
│  Amount: 25 XLM (~$2.50 USD)                           │
│                                                         │
│  Payment breakdown:                                     │
│  ├── To Creator: 24.50 XLM (98%)                       │
│  └── Platform Fee: 0.50 XLM (2%)                       │
│                                                         │
│  Network Fee: 0.00001 XLM                              │
│                                                         │
│  [ Cancel ]                    [ Confirm Payment ]     │
└────────────────────────────────────────────────────────┘

Step 4: SIGN TRANSACTION (Freighter)
─────────────────────────────────────────────────────────
                        ┌──────────────────┐
                        │  FREIGHTER       │
                        │  WALLET POPUP    │
                        │                  │
                        │  "Sign this      │
                        │   transaction?"  │
                        │                  │
                        │  Operations:     │
                        │  • Pay 0.50 XLM  │
                        │    to GPLATF...  │
                        │  • Pay 24.50 XLM │
                        │    to GCREAT...  │
                        │                  │
                        │  Memo: "PRO      │
                        │  subscription"   │
                        │                  │
                        │ [Reject] [Sign]  │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  User enters     │
                        │  their Freighter │
                        │  password        │
                        └────────┬─────────┘
                                 │
                                 ▼

Step 5: TRANSACTION SUBMITTED TO STELLAR
─────────────────────────────────────────────────────────
┌──────────────────────────────────────────────────────────┐
│                    STELLAR NETWORK                        │
│                                                           │
│  1. Transaction received by Horizon                       │
│  2. Validated by validator nodes (~3 seconds)            │
│  3. Included in next ledger                              │
│  4. Both operations execute atomically:                  │
│     ✅ 0.50 XLM transferred to platform                  │
│     ✅ 24.50 XLM transferred to creator                  │
│  5. Transaction hash returned                            │
│                                                           │
│  Transaction Hash: abc123...def789                       │
│  Ledger: 12345678                                        │
│  Time: 2024-01-15T14:32:01Z                              │
│                                                           │
└──────────────────────────────────────────────────────────┘

Step 6: SUBSCRIPTION ACTIVE
─────────────────────────────────────────────────────────
┌────────────────────────────────────────────────────────┐
│  ✅ SUBSCRIPTION CONFIRMED!                             │
│                                                         │
│  You're now subscribed to @cryptotrader_mike           │
│  Tier: PRO                                             │
│  Started: Jan 15, 2024                                 │
│  Next billing: Feb 15, 2024                            │
│                                                         │
│  Transaction: abc123...def789                          │
│  [View on Stellar Expert]                              │
│                                                         │
│  You now have access to:                               │
│  ✓ Daily newsletter                                    │
│  ✓ Trading signals channel                             │
│  ✓ PRO Discord role                                    │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### Subscriber Actions Available

| Action | What Happens | Money Impact |
|--------|-------------|--------------|
| **Subscribe** | Pay upfront for 30 days | XLM leaves wallet instantly |
| **Renew** | Pay again when period ends | Another 30 days of access |
| **Cancel** | Stops future renewals | Access continues until period ends, NO REFUND |
| **Upgrade tier** | Pay difference + new subscription | Pro-rated not yet implemented |
| **Downgrade** | Cancel current, subscribe to lower | Takes effect next period |

### What Subscriber Sees In Their Wallet

After subscribing to PRO tier (25 XLM):

```
FREIGHTER WALLET - TRANSACTION HISTORY
=====================================
Jan 15, 2024 - 14:32:01 UTC

Transaction: abc123...def789
Type: Multi-operation Payment

Operations:
  1. Payment to GPLATFOR...LATFORM (Platform)
     Amount: -0.50 XLM

  2. Payment to GCREATOR...WALLET (Creator)  
     Amount: -24.50 XLM

Network Fee: -0.00001 XLM

Total Debit: -25.00001 XLM

New Balance: 974.99999 XLM (was 1000 XLM)
```

---

## Creator Flow

### Complete Journey: From Onboarding to Getting Paid

```
CREATOR JOURNEY
===============

Step 1: CONNECT WALLET & REGISTER
─────────────────────────────────────────────────────────
┌──────────────────┐    ┌──────────────────┐
│  Creator opens   │───▶│  Connect with    │
│  Orbit website   │    │  Freighter       │
└──────────────────┘    └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Fill creator    │
                        │  profile form    │
                        └────────┬─────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────┐
│  CREATOR REGISTRATION                                   │
│                                                         │
│  Display Name: cryptotrader_mike                       │
│  Category: [ Finance & Trading ▼ ]                     │
│  Bio: Daily crypto analysis & alpha signals            │
│                                                         │
│  Your wallet address (auto-filled):                    │
│  GCREATOR...YOUWALLET                                  │
│  ☝️ This is where you'll receive payments!              │
│                                                         │
│  [ Cancel ]                    [ Create Profile ]      │
└────────────────────────────────────────────────────────┘

Step 2: SET UP SUBSCRIPTION TIERS
─────────────────────────────────────────────────────────
┌────────────────────────────────────────────────────────┐
│  MANAGE YOUR TIERS                                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ TIER 1: Basic                                    │   │
│  │ Price: 10 XLM/month                             │   │
│  │ Benefits:                                       │   │
│  │ • Weekly newsletter                             │   │
│  │ • Community access                              │   │
│  │ [Edit] [Delete]                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ TIER 2: Pro                                      │   │
│  │ Price: 25 XLM/month                             │   │
│  │ Benefits:                                       │   │
│  │ • Everything in Basic                           │   │
│  │ • Daily trading signals                         │   │
│  │ • PRO Discord role                              │   │
│  │ [Edit] [Delete]                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [ + Add New Tier ]                                    │
│                                                         │
└────────────────────────────────────────────────────────┘

Step 3: SOMEONE SUBSCRIBES (Real-time notification)
─────────────────────────────────────────────────────────

  Creator is browsing the web...
                        
                        ┌──────────────────────────────┐
                        │  🔔 ORBIT NOTIFICATION       │
                        │                              │
                        │  New Subscriber!             │
                        │                              │
                        │  Someone just subscribed     │
                        │  to your PRO tier!           │
                        │                              │
                        │  +24.50 XLM received         │
                        │  (after 2% platform fee)     │
                        │                              │
                        │  [View Dashboard]            │
                        └──────────────────────────────┘

  👆 This notification arrives via WebSocket in ~5 seconds

Step 4: MONEY ALREADY IN WALLET
─────────────────────────────────────────────────────────

  Creator opens Freighter wallet:

  ┌────────────────────────────────────────────────────┐
  │  💰 BALANCE: 1,024.50 XLM                          │
  │      (was 1,000 XLM)                               │
  │                                                     │
  │  Recent Activity:                                   │
  │  ───────────────────────────────────────           │
  │  + 24.50 XLM  from GSUBSCR...IBER                  │
  │    Jan 15, 2024 14:32:01                           │
  │    Memo: "PRO subscription"                        │
  └────────────────────────────────────────────────────┘

  THE MONEY IS ALREADY THERE.
  No "pending" status. No "processing".
  Instant settlement.

Step 5: VIEW DASHBOARD & ANALYTICS
─────────────────────────────────────────────────────────
┌────────────────────────────────────────────────────────┐
│  CREATOR DASHBOARD                                      │
│                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ Subscribers  │ │ Monthly      │ │ Total        │    │
│  │    12        │ │ Revenue      │ │ Earnings     │    │
│  │    (+3 new)  │ │ 165 XLM      │ │ 847 XLM      │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                         │
│  SUBSCRIBER LIST                                        │
│  ───────────────────────────────────────────────────   │
│  │ Wallet        │ Tier  │ Started    │ Status    │    │
│  ├───────────────┼───────┼────────────┼───────────┤    │
│  │ GSUBS1...     │ PRO   │ Jan 15     │ Active    │    │
│  │ GSUBS2...     │ Basic │ Jan 12     │ Active    │    │
│  │ GSUBS3...     │ VIP   │ Jan 10     │ Active    │    │
│  │ GSUBS4...     │ PRO   │ Dec 20     │ Expired   │    │
│  └───────────────┴───────┴────────────┴───────────┘    │
│                                                         │
│  RECENT TRANSACTIONS                                    │
│  ───────────────────────────────────────────────────   │
│  Jan 15 │ +24.50 XLM │ New sub (PRO)  │ abc123...  │    │
│  Jan 14 │ +9.80 XLM  │ Renewal (Basic)│ def456...  │    │
│  Jan 13 │ +98.00 XLM │ New sub (VIP)  │ ghi789...  │    │
│                                                         │
└────────────────────────────────────────────────────────┘

Step 6: CASH OUT (No Orbit Involvement)
─────────────────────────────────────────────────────────

  Creator wants to convert XLM to USD:

  ┌────────────────────────────────────────────────────┐
  │  OPTIONS FOR CASHING OUT:                           │
  │                                                     │
  │  1. CEX (Centralized Exchange)                      │
  │     → Send XLM to Coinbase/Binance                 │
  │     → Sell for USD                                 │
  │     → Withdraw to bank                             │
  │                                                     │
  │  2. MoneyGram Partnership (via Stellar)            │
  │     → Use MoneyGram app                            │
  │     → Convert XLM to cash                          │
  │     → Pick up at MoneyGram location                │
  │                                                     │
  │  3. USDC On-Ramp (Circle/Stellar)                  │
  │     → Swap XLM → USDC on Stellar DEX               │
  │     → Transfer USDC to Circle                      │
  │     → Withdraw to bank                             │
  │                                                     │
  │  💡 Orbit never touches your funds.                │
  │     You control the whole process.                 │
  └────────────────────────────────────────────────────┘
```

### Creator Benefits Summary

| Benefit | Traditional (Patreon) | Orbit |
|---------|----------------------|-------|
| **Settlement time** | 2-30 days | 3-5 seconds |
| **Fee** | 5-12% | 2% |
| **Chargebacks** | Yes, lose money + fee | No chargebacks ever |
| **Custody** | Patreon holds your money | Your wallet, your keys |
| **Global access** | Limited by banking | Anyone with a wallet |
| **Minimum payout** | $25-$50+ | No minimum |

---

## Payment Split Mechanics

### The Atomic Transaction

```javascript
// This is EXACTLY what happens in SubscriptionForm.jsx

// 1. Calculate the split
const totalAmount = 25;  // XLM
const platformFeePercent = 2;
const platformFee = totalAmount * (platformFeePercent / 100);  // 0.50 XLM
const creatorPayout = totalAmount - platformFee;  // 24.50 XLM

// 2. Build multi-operation transaction
const transaction = new TransactionBuilder(subscriberAccount, {
  fee: BASE_FEE,  // ~0.00001 XLM
  networkPassphrase: Networks.TESTNET,
})
  // Operation 1: Platform fee
  .addOperation(Operation.payment({
    destination: platformWallet,  // Orbit's wallet
    asset: Asset.native(),
    amount: platformFee.toFixed(7),  // "0.5000000"
  }))
  // Operation 2: Creator payout
  .addOperation(Operation.payment({
    destination: creatorWallet,  // Creator's personal wallet
    asset: Asset.native(),
    amount: creatorPayout.toFixed(7),  // "24.5000000"
  }))
  .addMemo(Memo.text("PRO subscription"))
  .setTimeout(180)
  .build();

// 3. User signs with Freighter (sees both operations)
const signed = await freighterSignTransaction(transaction.toXDR());

// 4. Submit to Stellar network
const result = await server.submitTransaction(signed);
// result.hash = "abc123..." - permanent blockchain receipt
```

### Why Atomic Matters

```
ATOMIC TRANSACTION = ALL OR NOTHING

Scenario A: Everything works
─────────────────────────────
Operation 1: Pay platform ✅
Operation 2: Pay creator  ✅
Result: BOTH SUCCEED

Scenario B: Creator wallet has issues
─────────────────────────────
Operation 1: Pay platform (would succeed)
Operation 2: Pay creator  ❌ (invalid address)
Result: BOTH FAIL - subscriber keeps money

There is NEVER a case where:
- Platform gets paid but creator doesn't
- Subscriber loses money but nobody receives it
- Partial payments happen
```

---

## Current Limitations

### Problem 1: No Automatic Renewals

```
CURRENT STATE:
─────────────────────────────────────────────────────────
Month 1: Subscriber pays 25 XLM ✅
         (Manual payment with Freighter)

Month 2: Subscription expires...
         Subscriber gets reminder notification
         Subscriber must MANUALLY pay again
         (No auto-debit - crypto wallets can't do this)

PAIN POINTS:
• Subscriber must remember to renew
• Creator loses subscribers who forget
• No recurring revenue guarantee
```

**Solution: Reminder System (Implemented)**
```
3 days before expiry  → WebSocket notification + email
1 day before expiry   → Push notification
Day of expiry         → Final reminder
Day after             → Access revoked, "Renew" button shown
```

### Problem 2: No Refunds on Cancellation

```
CURRENT STATE:
─────────────────────────────────────────────────────────
Day 1:  Subscriber pays 25 XLM for 30 days
Day 15: Subscriber cancels
Day 30: Subscription officially ends

WHAT HAPPENS:
• Subscriber paid for 30 days
• Only used 15 days
• Gets NO REFUND for remaining 15 days
• Creator keeps all 24.50 XLM

WHY:
• Creator already received the XLM
• It's in their personal wallet
• Orbit has no way to claw it back
• Blockchain payments are irreversible
```

**This is a real UX problem that streaming payments will solve.**

### Problem 3: No Upgrade Path

```
CURRENT STATE:
─────────────────────────────────────────────────────────
Subscriber has: Basic tier (10 XLM/month)
Wants: PRO tier (25 XLM/month)

CURRENT WORKAROUND:
1. Cancel Basic (lose remaining days)
2. Subscribe to PRO (pay full 25 XLM)
3. Lose value from Basic subscription

IDEAL STATE (Not Yet Implemented):
1. Click "Upgrade to PRO"
2. Pay difference: 25 - (10 * remaining_days/30)
3. Seamless tier change
```

---

## Streaming Payments

### The Future Solution (Soroban Smart Contract)

```
STREAMING PAYMENTS MODEL
═══════════════════════════════════════════════════════════

Instead of: Pay 25 XLM upfront, locked for 30 days
We do:      Lock 25 XLM in contract, streams to creator over time

Day 1:  Subscriber deposits 25 XLM into smart contract
        Contract calculates: 25 XLM ÷ 30 days = 0.833 XLM/day
        
Day 5:  Creator can withdraw: 0.833 × 5 = 4.17 XLM
Day 10: Creator can withdraw: 0.833 × 10 = 8.33 XLM
Day 15: Subscriber cancels!
        └── Creator gets: 0.833 × 15 = 12.50 XLM (already earned)
        └── Subscriber gets: 25 - 12.50 = 12.50 XLM (refund)

FAIR FOR EVERYONE.
```

### How Streaming Works (Technical)

```rust
// Soroban Smart Contract (Rust)

#[contracttype]
pub struct Stream {
    subscriber: Address,
    creator: Address,
    total_amount: i128,      // 25 XLM
    rate_per_second: i128,   // 25 ÷ (30×24×60×60) = 0.00000964 XLM/sec
    start_time: u64,
    end_time: u64,
    withdrawn: i128,
    status: StreamStatus,
}

// Creator calls this anytime to get their earned XLM
pub fn withdraw(env: Env, stream_id: u64) -> i128 {
    let stream = get_stream(&env, stream_id);
    require_auth(&stream.creator);
    
    let elapsed = env.ledger().timestamp() - stream.start_time;
    let earned = stream.rate_per_second * elapsed as i128;
    let withdrawable = earned - stream.withdrawn;
    
    // Transfer withdrawable amount to creator
    transfer(&env, contract_address(), stream.creator, withdrawable);
    
    // Update stream
    stream.withdrawn += withdrawable;
    save_stream(&env, stream);
    
    withdrawable
}

// Subscriber calls this to cancel and get refund
pub fn cancel(env: Env, stream_id: u64) -> (i128, i128) {
    let stream = get_stream(&env, stream_id);
    require_auth(&stream.subscriber);
    
    let elapsed = env.ledger().timestamp() - stream.start_time;
    let creator_earned = stream.rate_per_second * elapsed as i128;
    let subscriber_refund = stream.total_amount - creator_earned;
    
    // Final distribution
    transfer(&env, contract_address(), stream.creator, creator_earned - stream.withdrawn);
    transfer(&env, contract_address(), stream.subscriber, subscriber_refund);
    
    stream.status = StreamStatus::Cancelled;
    save_stream(&env, stream);
    
    (creator_earned, subscriber_refund)
}
```

### Streaming Payment User Experience

```
SUBSCRIBER VIEW (with streaming)
─────────────────────────────────────────────────────────
┌────────────────────────────────────────────────────────┐
│  Your Subscription to @cryptotrader_mike               │
│                                                         │
│  Tier: PRO                                             │
│  Started: Jan 1, 2024                                  │
│  Ends: Jan 31, 2024                                    │
│                                                         │
│  ┌──────────────────────────────────────────────┐      │
│  │ 💰 STREAMING BALANCE                         │      │
│  │                                               │      │
│  │ Total locked: 25 XLM                         │      │
│  │ Streamed to creator: 12.50 XLM (15 days)     │      │
│  │ Refundable if cancelled: 12.50 XLM           │      │
│  │                                               │      │
│  │ █████████████████░░░░░░░░░░░░░░░░░░  50%     │      │
│  │                                               │      │
│  └──────────────────────────────────────────────┘      │
│                                                         │
│  [ Cancel & Get Refund (12.50 XLM) ]                   │
│                                                         │
└────────────────────────────────────────────────────────┘

CREATOR VIEW (with streaming)
─────────────────────────────────────────────────────────
┌────────────────────────────────────────────────────────┐
│  STREAMING EARNINGS                                     │
│                                                         │
│  Active streams: 12                                    │
│                                                         │
│  ┌──────────────────────────────────────────────┐      │
│  │ 💰 AVAILABLE TO WITHDRAW                      │      │
│  │                                               │      │
│  │ Accrued: 156.78 XLM                          │      │
│  │ (from 12 active subscriptions)               │      │
│  │                                               │      │
│  │ [ Withdraw Now → Your Wallet ]               │      │
│  │                                               │      │
│  └──────────────────────────────────────────────┘      │
│                                                         │
│  Total locked in contracts: 450 XLM                    │
│  Will fully stream by: Feb 28, 2024                    │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

## Summary: Current vs Future

| Aspect | Current (Working) | Future (Streaming) |
|--------|-------------------|-------------------|
| **Payment timing** | Upfront for 30 days | Streamed per-second |
| **Creator receives** | 98% instantly | 98% accrued over time |
| **Cancellation refund** | ❌ None | ✅ Pro-rated |
| **Custody** | Non-custodial (direct) | Non-custodial (contract) |
| **Smart contract** | Not needed | Soroban contract |
| **Complexity** | Simple | More complex |
| **User trust required** | High (no refunds) | Lower (fair refunds) |

---

## Quick Reference: Who Does What

### Subscriber Responsibilities
1. ✅ Connect Freighter wallet
2. ✅ Have enough XLM balance
3. ✅ Sign subscription transaction
4. ✅ Renew before expiry (manual)
5. ✅ Manage their own wallet security

### Creator Responsibilities
1. ✅ Connect Freighter wallet
2. ✅ Set up profile and tiers
3. ✅ Deliver promised content/benefits
4. ✅ Cash out XLM as needed (CEX, MoneyGram, etc.)
5. ✅ Manage their own wallet security

### Orbit Platform Responsibilities
1. ✅ Provide the interface
2. ✅ Match subscribers to creators
3. ✅ Send renewal notifications
4. ✅ Track subscription states
5. ✅ Collect 2% platform fee
6. ❌ Does NOT hold user funds
7. ❌ Does NOT facilitate refunds (currently)
8. ❌ Does NOT handle disputes (blockchain is final)

---

*Last Updated: February 2024*
