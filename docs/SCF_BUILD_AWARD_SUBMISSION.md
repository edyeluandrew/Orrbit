# Orbit - Stellar Community Fund Build Award Submission

## Project Overview

**Project Name:** Orbit  
**Track:** Open Track  
**Requested Amount:** $75,000 XLM (3 tranches)  
**Timeline:** 5 months  

---

## Executive Summary

Orbit is a **Stellar-native subscription payment platform** enabling creators worldwide to monetize their content through recurring crypto payments. We leverage Stellar's fast, low-cost infrastructure and Soroban smart contracts to deliver streaming payments—the first of its kind in the creator economy.

**Current Status:** Working MVP with complete frontend/backend, Freighter wallet integration, and testnet deployment ready for community testing.

---

## 1. Participant Eligibility ✅

### Team Information

| Role | Name | Background |
|------|------|------------|
| Founder/Lead Developer | [Your Name] | Full-stack developer with blockchain experience. Built Orbit from concept to MVP. |
| Smart Contract Developer | [To be hired/contracted with SCF funds] | Soroban expertise for streaming payments implementation |

### Eligibility Confirmation
- ☑️ Age 18+ years
- ☑️ Not on OFAC sanctions list
- ☑️ Not in prohibited jurisdictions
- ☑️ Able to receive XLM payments
- ☑️ Committed to completing milestones within timeline

### Track Record
- Built complete working MVP independently
- GitHub repository with consistent commit history
- Full documentation suite (API Reference, User Guide, Architecture docs)

---

## 2. Product Readiness & Traction ✅

### What We've Built (Pre-SCF)

| Component | Status | Evidence |
|-----------|--------|----------|
| Frontend | ✅ Complete | React 19 + Vite, 15+ components, responsive UI |
| Backend | ✅ Complete | Node.js/Fastify API with PostgreSQL |
| Wallet Integration | ✅ Complete | Freighter wallet connect, signature verification |
| Payment Flow | ✅ Complete | 98/2 atomic split transactions |
| Creator Profiles | ✅ Complete | Tier management, content gating |
| Subscriber Flow | ✅ Complete | Discovery, subscriptions, WebSocket notifications |
| Admin Dashboard | ✅ Complete | Transaction monitoring, user management |

### Verified Traction
- **Codebase:** 50+ files, professionally structured
- **Documentation:** 12 comprehensive markdown files
- **Testing:** Testnet deployment ready
- **No external funding received to date** — 100% bootstrapped

### Proof Points
```
GitHub Repository: [Your GitHub URL]
Demo Video: [Link to 3-minute demo]
Test Environment: [Testnet URL]
```

---

## 3. Stellar Use Case & Technical Integration ✅

### Why Stellar is Essential (Not Superficial)

Orbit's core functionality is **impossible without Stellar**:

#### Current Stellar Integration (Already Built)

```javascript
// Atomic multi-operation subscription payment
const transaction = new TransactionBuilder(subscriberAccount, {
  fee: '100',
  networkPassphrase: Networks.TESTNET,
})
  // Operation 1: 98% to creator
  .addOperation(Operation.payment({
    destination: creatorWallet,
    asset: Asset.native(),
    amount: (price * 0.98).toFixed(7),
  }))
  // Operation 2: 2% to platform
  .addOperation(Operation.payment({
    destination: platformWallet,
    asset: Asset.native(),
    amount: (price * 0.02).toFixed(7),
  }))
  .setTimeout(180)
  .build();
```

| Stellar Feature | How We Use It |
|-----------------|---------------|
| Multi-operation transactions | Atomic 98/2 payment splits |
| Native asset (XLM) | Subscription payments |
| Horizon API | Transaction verification, streaming |
| Freighter SDK | Non-custodial wallet auth |
| Low fees (~$0.00001) | Micro-subscriptions viable |
| 5-sec finality | Instant creator payouts |

#### Soroban Integration (SCF Scope — Novel)

**Streaming Payments Contract** — The core innovation funded by this award:

```rust
// Soroban Stream Payment Contract (To be built)
#[contracttype]
pub struct SubscriptionStream {
    subscriber: Address,
    creator: Address,
    rate_per_second: u128,    // XLM per second
    start_time: u64,
    end_time: u64,
    total_deposited: u128,
    withdrawn: u128,
}

impl StreamContract {
    // Subscriber deposits full amount, locked in contract
    pub fn create_stream(
        env: Env,
        subscriber: Address,
        creator: Address,
        amount: u128,
        duration_days: u32,
    ) -> StreamId;
    
    // Creator claims accrued amount anytime
    pub fn withdraw(env: Env, stream_id: StreamId) -> u128;
    
    // Subscriber can cancel, gets remaining pro-rated
    pub fn cancel(env: Env, stream_id: StreamId) -> (u128, u128);
}
```

**Why This Matters:**
- **Fair refunds:** Cancel Day 15 of 30 = get 50% back automatically
- **No disputes:** Smart contract enforces pro-rating
- **Real-time:** Creators can withdraw earnings anytime
- **First-of-kind:** No streaming payment solution exists for subscriptions on Stellar

---

## 4. Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORBIT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐    │
│  │   Frontend    │    │    Backend    │    │   Stellar     │    │
│  │  (React 19)   │◄──►│  (Fastify)    │◄──►│   Network     │    │
│  └───────┬───────┘    └───────┬───────┘    └───────┬───────┘    │
│          │                    │                    │            │
│          ▼                    ▼                    ▼            │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐    │
│  │   Freighter   │    │  PostgreSQL   │    │   Soroban     │    │
│  │    Wallet     │    │   Database    │    │  Contracts    │    │
│  └───────────────┘    └───────────────┘    └───────────────┘    │
│                                                   │              │
│                                                   ▼              │
│                                            ┌─────────────┐       │
│                                            │  Streaming  │       │
│                                            │  Payments   │       │
│                                            └─────────────┘       │
│                                                 [NEW]            │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Subscriber** connects Freighter wallet → authenticates via signature
2. **Browser** displays creator tiers, subscriber selects plan
3. **Soroban** creates streaming payment contract with locked funds
4. **Creator** claims accrued XLM at any time
5. **Subscriber** can cancel → contract returns remaining XLM pro-rata
6. **Backend** tracks off-chain metadata, verifies on-chain state

---

## 5. Build Readiness ✅

### We Can Start Immediately

| Requirement | Status |
|-------------|--------|
| Development environment | ✅ Set up |
| Stellar SDK integration | ✅ Working |
| Soroban development setup | ✅ Ready (stellar-sdk, soroban-cli installed) |
| Team availability | ✅ Full-time commitment |
| No blockers | ✅ Confirmed |

### Technical Prerequisites Completed
- Node.js 18+ environment
- Stellar SDK integration tested
- PostgreSQL database schema designed
- WebSocket real-time updates working
- Freighter wallet signing flow complete

---

## 6. Budget & Deliverables

### Budget Breakdown ($75,000 total)

| Category | Amount | Percentage | Justification |
|----------|--------|------------|---------------|
| Smart Contract Development | $35,000 | 47% | Soroban streaming payments contract |
| Frontend Integration | $15,000 | 20% | Contract UI, real-time streams |
| Backend Updates | $10,000 | 13% | API endpoints, contract indexing |
| Testing & Auditing | $10,000 | 13% | Security audit, testnet beta |
| Infrastructure & Deployment | $5,000 | 7% | Mainnet deployment, monitoring |

### What SCF Funds Cover (Stellar-Specific Only)

| Included ✅ | Excluded ❌ |
|------------|------------|
| Soroban smart contract development | General marketing |
| Stellar SDK integration improvements | Office space |
| Horizon API optimizations | Hardware purchases |
| Testnet/Mainnet deployment | Salaries unrelated to Stellar |
| Security audit for contracts | Legal fees |

---

## 7. Tranche Structure (3 Milestones)

### Tranche 1: MVP Streaming Contract — $25,000 (Month 1-2)

**Deliverables:**
| # | Deliverable | Verification Method |
|---|-------------|---------------------|
| 1.1 | Soroban streaming payment contract deployed to Testnet | Contract address + transaction hashes |
| 1.2 | Basic functions: create_stream, withdraw, cancel | Unit tests passing + demo video |
| 1.3 | Contract documentation | GitHub docs published |
| 1.4 | Integration with existing backend | API endpoints functional |

**Success Criteria:**
- Contract deployed to Stellar Testnet
- Subscriber can create streaming subscription
- Creator can withdraw accrued funds
- Subscriber can cancel with pro-rated refund
- All actions verifiable on-chain

---

### Tranche 2: Testnet Integration & Beta — $25,000 (Month 3-4)

**Deliverables:**
| # | Deliverable | Verification Method |
|---|-------------|---------------------|
| 2.1 | Frontend streaming payment UI | Live demo URL |
| 2.2 | Real-time balance updates (Horizon streaming) | Screen recording |
| 2.3 | Beta testing with 20+ users | User feedback report |
| 2.4 | Multi-asset support (USDC) | USDC stream demo |
| 2.5 | Contract optimizations based on feedback | Gas cost comparisons |

**Success Criteria:**
- Full user flow working on Testnet
- 20+ beta testers complete subscription cycles
- USDC streaming payments functional
- <$0.10 total transaction costs per subscription

---

### Tranche 3: Mainnet Launch & Open Source — $25,000 (Month 5)

**Deliverables:**
| # | Deliverable | Verification Method |
|---|-------------|---------------------|
| 3.1 | Mainnet contract deployment | Mainnet contract address |
| 3.2 | Security audit completion | Audit report published |
| 3.3 | Open source contract release | GitHub repo (Apache 2.0) |
| 3.4 | Documentation & tutorials | GitBook/docs site |
| 3.5 | 5 live creators using platform | Transaction evidence |

**Success Criteria:**
- Contract live on Stellar Mainnet
- Third-party security audit passed
- Full source code open sourced
- Complete developer documentation
- Minimum 5 real creator accounts with active subscribers

---

## 8. Open Source Commitment ✅

### What We Will Open Source

| Component | License | Timeline |
|-----------|---------|----------|
| Streaming Payment Contract | Apache 2.0 | Tranche 3 |
| Contract SDK/Bindings | MIT | Tranche 3 |
| Integration Examples | MIT | Tranche 3 |

### Why Open Source Benefits Stellar Ecosystem
- **Reusable primitive:** Any Stellar app can use streaming payments
- **Reference implementation:** Sets standard for subscription contracts
- **Educational value:** Shows Soroban patterns for time-based payments
- **Ecosystem growth:** Other builders can fork/extend

---

## 9. Ecosystem Value & Differentiation ✅

### Unique Value to Stellar

| Aspect | Orbit's Contribution |
|--------|---------------------|
| **New use case** | First subscription platform built natively on Stellar |
| **Novel primitive** | Streaming payments contract usable by other dApps |
| **Market expansion** | Brings 26,000+ crypto creators to Stellar ecosystem |
| **Real-world utility** | Solves actual payment problems (fees, settlement, chargebacks) |

### Competitive Differentiation

| Feature | Patreon | Ko-fi | Orbit |
|---------|---------|-------|-------|
| Fees | 5-12% | 5% | **2%** |
| Settlement | 2-30 days | 2-7 days | **Instant** |
| Streaming payments | ❌ | ❌ | **✅** |
| Pro-rated refunds | ❌ | ❌ | **✅** |
| Non-custodial | ❌ | ❌ | **✅** |
| Chargebacks | Yes | Yes | **No** |
| Built on Stellar | ❌ | ❌ | **✅** |

### Why We Chose Stellar Over Alternatives

| Alternative | Why Not |
|-------------|---------|
| Ethereum | $5-50 transaction fees make subscriptions unviable |
| Solana | Complex infrastructure, less stable |
| Polygon | Still requires bridge complexity |
| Stellar | Native USDC, 5-sec finality, <$0.001 fees ✅ |

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Soroban contract complexity | Medium | High | Start with minimal viable contract, iterate |
| Low creator adoption | Medium | Medium | Focus on African/LatAm markets with crypto demand |
| Security vulnerabilities | Low | High | Third-party audit before mainnet |
| Stellar network issues | Low | Medium | Graceful degradation, retry logic |
| Regulatory concerns | Low | Medium | Non-custodial design avoids money transmission |

---

## 11. Timeline Summary

```
Month 1: ████████░░ Contract development begins
         - Design streaming payment architecture
         - Implement core Soroban contract
         
Month 2: ██████████ Contract deployed to testnet
         - Deploy to Stellar Testnet
         - Integrate with existing backend
         - [TRANCHE 1 COMPLETE]
         
Month 3: ████████░░ Frontend integration
         - Build streaming payment UI
         - Real-time balance updates
         
Month 4: ██████████ Beta testing
         - 20+ beta testers on testnet
         - Add USDC support
         - [TRANCHE 2 COMPLETE]
         
Month 5: ██████████ Mainnet launch
         - Security audit
         - Mainnet deployment
         - Open source release
         - [TRANCHE 3 COMPLETE]
```

---

## 12. Success Metrics

### Quantitative Goals

| Metric | Tranche 1 | Tranche 2 | Tranche 3 |
|--------|-----------|-----------|-----------|
| Contract deployed | Testnet | Testnet | Mainnet |
| Active testers | 0 | 20+ | - |
| Live creators | 0 | 0 | 5+ |
| Active subscriptions | 0 | 50+ (test) | 50+ (real) |
| Transaction volume | Test XLM | Test XLM | Real XLM |

### Qualitative Goals
- Contract passes security audit
- Developer documentation is complete and clear
- Community feedback is incorporated
- Open source code is well-structured and reusable

---

## 13. Post-Award Growth Plan

### Immediate (Months 6-12)
- Apply for SDF Matching Fund
- Creator onboarding campaign (target: 100 creators)
- USDC anchor integration for fiat off-ramps
- Mobile app launch (Capacitor already configured)

### Medium-term (Year 2)
- Enterprise API for services monetization
- Partnership with Stellar anchors for local currency support
- 1,000+ active creators target
- Break-even on platform fees

### Long-term Vision
- Become the default subscription layer for Stellar ecosystem
- Streaming payments contract becomes ecosystem standard
- Global creator economy participation from unbanked regions

---

## 14. Team Commitment Statement

I/we are committed to:

- ✅ Full-time focus on Orbit development during award period
- ✅ Transparent progress updates in SCF community channels
- ✅ Completing all milestones within stated timeline
- ✅ Open sourcing smart contract code as promised
- ✅ Maintaining the platform post-award for ecosystem benefit
- ✅ Active participation in Stellar community (Discord, forums)

---

## 15. Supporting Materials

| Material | Link |
|----------|------|
| GitHub Repository | [Your URL] |
| Demo Video (3 min) | [Your URL] |
| Live Testnet Demo | [Your URL] |
| Technical Docs | [Your URL] |
| Team LinkedIn | [Your URL] |

---

## Contact Information

**Primary Contact:** [Your Name]  
**Email:** [Your Email]  
**Discord:** [Your Discord Handle]  
**Telegram:** [Your Telegram]  
**GitHub:** [Your GitHub]  

---

*Submitted for Stellar Community Fund Build Award Review*

---

## Appendix A: Code Samples (Current Implementation)

### Backend Stellar Service (Already Built)

```javascript
// backend/src/services/stellar.js

const { Server, Networks, Keypair, TransactionBuilder, Operation, Asset } = require('stellar-sdk');

const horizon = new Server(process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org');

async function verifyTransaction(transactionHash, expectedOperations) {
  const tx = await horizon.transactions().transaction(transactionHash).call();
  const operations = await horizon.operations().forTransaction(transactionHash).call();
  
  // Verify each expected payment was made
  for (const expected of expectedOperations) {
    const found = operations.records.find(op => 
      op.type === 'payment' &&
      op.to === expected.destination &&
      parseFloat(op.amount) === parseFloat(expected.amount)
    );
    if (!found) return { valid: false, reason: 'Missing expected operation' };
  }
  
  return { valid: true, transaction: tx };
}

async function buildSubscriptionTransaction(subscriberPublicKey, creatorWallet, platformWallet, price) {
  const account = await horizon.loadAccount(subscriberPublicKey);
  
  return new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.payment({
      destination: creatorWallet,
      asset: Asset.native(),
      amount: (price * 0.98).toFixed(7),
    }))
    .addOperation(Operation.payment({
      destination: platformWallet,
      asset: Asset.native(),
      amount: (price * 0.02).toFixed(7),
    }))
    .setTimeout(180)
    .build();
}

module.exports = { verifyTransaction, buildSubscriptionTransaction };
```

### Frontend Subscription Component (Already Built)

```jsx
// frontend/src/components/SubscriptionForm.jsx

import { signTransaction, getPublicKey } from '@stellar/freighter-api';

const handleSubscribe = async (tier) => {
  try {
    const publicKey = await getPublicKey();
    
    // Build transaction server-side
    const { xdr } = await api.post('/subscriptions/build-transaction', {
      subscriberWallet: publicKey,
      creatorId: creator.id,
      tierId: tier.id,
    });
    
    // Sign with Freighter
    const signedXDR = await signTransaction(xdr, {
      networkPassphrase: 'Test SDF Network ; September 2015',
    });
    
    // Submit and create subscription
    const result = await api.post('/subscriptions/create', {
      signedTransaction: signedXDR,
      creatorId: creator.id,
      tierId: tier.id,
    });
    
    showSuccess('Subscription created!');
  } catch (error) {
    showError(error.message);
  }
};
```

---

## Appendix B: Proposed Soroban Contract Interface

```rust
// streaming_contract/src/lib.rs (To be built with SCF funding)

#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec};

#[contracttype]
pub enum StreamStatus {
    Active,
    Paused,
    Cancelled,
    Completed,
}

#[contracttype]
pub struct Stream {
    pub id: u64,
    pub subscriber: Address,
    pub creator: Address,
    pub asset: Address,           // XLM or USDC
    pub total_amount: i128,
    pub rate_per_second: i128,
    pub start_time: u64,
    pub end_time: u64,
    pub withdrawn: i128,
    pub status: StreamStatus,
}

#[contract]
pub struct StreamingPaymentContract;

#[contractimpl]
impl StreamingPaymentContract {
    /// Create a new subscription stream
    /// Deposits funds and locks them in the contract
    pub fn create(
        env: Env,
        subscriber: Address,
        creator: Address,
        asset: Address,
        amount: i128,
        duration_seconds: u64,
    ) -> u64 {
        // Implementation: Transfer funds, create stream record
        todo!()
    }
    
    /// Get currently withdrawable amount for creator
    pub fn get_withdrawable(env: Env, stream_id: u64) -> i128 {
        // Implementation: Calculate based on elapsed time
        todo!()
    }
    
    /// Creator withdraws accrued funds
    pub fn withdraw(env: Env, stream_id: u64) -> i128 {
        // Implementation: Transfer accrued amount to creator
        todo!()
    }
    
    /// Subscriber cancels stream, receives refund
    pub fn cancel(env: Env, stream_id: u64) -> (i128, i128) {
        // Implementation: Calculate splits, transfer, update status
        // Returns: (creator_received, subscriber_refunded)
        todo!()
    }
    
    /// Get stream details
    pub fn get_stream(env: Env, stream_id: u64) -> Stream {
        todo!()
    }
    
    /// List all streams for an address (as creator or subscriber)
    pub fn list_streams(env: Env, address: Address) -> Vec<Stream> {
        todo!()
    }
}
```

---

*End of SCF Build Award Submission*
