# 🔒 Security & Compliance

## Security Overview

Orbit is designed with security as a core principle. As a non-custodial platform, we minimize attack surface by never holding user funds.

---

## 🛡️ Security Architecture

### Non-Custodial Design

```
┌─────────────────────────────────────────────────┐
│               SECURITY MODEL                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  User's Private Key                             │
│  ┌─────────────┐                               │
│  │  Freighter  │ ◄── Never leaves wallet       │
│  │   Wallet    │                               │
│  └─────────────┘                               │
│         │                                       │
│         ▼ Signs transactions                    │
│  ┌─────────────┐                               │
│  │   Orbit     │ ◄── Only sees public key      │
│  │   Platform  │                               │
│  └─────────────┘                               │
│         │                                       │
│         ▼ Submits signed TX                     │
│  ┌─────────────┐                               │
│  │  Stellar    │ ◄── Processes payment         │
│  │  Network    │                               │
│  └─────────────┘                               │
│                                                 │
└─────────────────────────────────────────────────┘
```

### What Orbit NEVER Has Access To

- ❌ User's secret/private keys
- ❌ User's wallet password
- ❌ User's recovery phrase
- ❌ Ability to move user funds

### What Orbit CAN Access

- ✅ User's public address (to display balance)
- ✅ Transaction history (public on blockchain)
- ✅ Signed transaction XDR (to submit to network)

---

## 🔐 Authentication & Authorization

### Wallet-Based Authentication

No passwords or accounts needed:

1. User connects wallet (Freighter)
2. Public key becomes their identity
3. Admin access based on wallet whitelist
4. Each transaction requires explicit user approval

### Admin Authorization

```javascript
// Admin check (frontend)
const isAdmin = ADMIN_WALLETS.includes(connectedWallet);
```

**Current Limitation:** Admin check is frontend-only. For production:
- Add backend verification
- Signed message authentication
- Rate limiting per wallet

---

## 🔑 Key Management

### User Keys

| Key Type | Where Stored | Orbit Access |
|----------|--------------|--------------|
| Secret Key | Freighter (encrypted) | Never |
| Public Key | Shared with app | Read-only |
| Recovery Phrase | User's backup | Never |

### Platform Keys

| Key Type | Where Stored | Purpose |
|----------|--------------|---------|
| Platform Wallet | .env file | Receive fees |
| Admin Wallets | .env file | Access control |

### Best Practices

1. **Never commit `.env`** to version control
2. **Use environment variables** in production hosting
3. **Rotate admin wallets** periodically
4. **Use hardware wallets** for platform wallet

---

## 🌐 Network Security

### HTTPS Enforcement

For production deployment:

```
# Vercel/Netlify handle this automatically
# For custom hosting, use nginx/cloudflare SSL
```

### Content Security Policy (Recommended)

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' 
    https://horizon.stellar.org 
    https://horizon-testnet.stellar.org 
    https://api.coingecko.com 
    https://friendbot.stellar.org;
  img-src 'self' data: https:;
">
```

### Allowed External Connections

| Domain | Purpose |
|--------|---------|
| horizon.stellar.org | Mainnet API |
| horizon-testnet.stellar.org | Testnet API |
| api.coingecko.com | Price data |
| friendbot.stellar.org | Testnet funding |

---

## 🛡️ Input Validation

### Wallet Address Validation

```javascript
function isValidStellarAddress(address) {
  // Must start with 'G' and be 56 characters
  if (!address.startsWith('G') || address.length !== 56) {
    return false;
  }
  // Additional checksum validation via SDK
  try {
    StellarSdk.StrKey.decodeEd25519PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
```

### Amount Validation

```javascript
function isValidAmount(amount) {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= MAX_PAYMENT_AMOUNT;
}
```

### XSS Prevention

- React automatically escapes output
- No `dangerouslySetInnerHTML` usage
- User input sanitized before display

---

## 🔒 Transaction Security

### Transaction Flow Security

1. **Build transaction** - Using Stellar SDK
2. **Display to user** - Show exact amounts/destinations
3. **User signs** - In their own wallet (Freighter)
4. **Submit to network** - Cannot be modified after signing

### Atomic Transactions

Stellar transactions are atomic:
- Either all operations succeed
- Or entire transaction fails
- No partial execution

### Transaction Verification

After payment, verify on blockchain:

```javascript
const response = await fetch(
  `https://horizon.stellar.org/transactions/${txHash}`
);
const tx = await response.json();
// Verify: successful, correct amounts, correct destinations
```

---

## 📊 Data Privacy

### Data We Store (localStorage)

| Data | Purpose | Sensitive |
|------|---------|-----------|
| Public key | Session | No (public) |
| Transaction history | Display | No (public on chain) |
| Subscription list | Management | Low |
| Provider list | Service catalog | No |

### Data We DON'T Store

- ❌ Private keys
- ❌ Personal information
- ❌ Email addresses
- ❌ Passwords
- ❌ Real names

### Data Retention

- localStorage: Until user clears browser
- No server-side storage (currently)

---

## 🚨 Incident Response

### If Platform Wallet Compromised

1. Generate new platform wallet immediately
2. Update `.env` and redeploy
3. Audit all recent transactions
4. Notify users if needed

### If Admin Wallet Compromised

1. Remove from `VITE_ADMIN_WALLETS`
2. Redeploy application
3. Audit admin actions

### If User Reports Unauthorized Transaction

1. Verify on blockchain explorer
2. Check if legitimate (user's own wallet signed)
3. Cannot be Orbit's fault if signature is valid
4. Advise user to secure their wallet

---

## ⚖️ Compliance Considerations

### Regulatory Status

Orbit facilitates peer-to-peer cryptocurrency payments. Depending on jurisdiction:

| Aspect | Consideration |
|--------|---------------|
| Money Transmission | May require license in some jurisdictions |
| KYC/AML | May be required above certain thresholds |
| Tax Reporting | Users responsible for their own taxes |
| Securities | XLM is generally not considered a security |

### Recommended Legal Steps

1. **Consult legal counsel** in your jurisdiction
2. **Terms of Service** - Clearly define platform role
3. **Privacy Policy** - Disclose data practices
4. **Disclaimer** - Non-custodial nature
5. **Geographic restrictions** if needed

### Terms of Service (Template Points)

- Platform is non-custodial
- Users control their own funds
- No refunds through platform (contact providers)
- Service provided "as is"
- User responsible for tax obligations
- Compliance with local laws is user's responsibility

---

## 📋 Security Checklist

### Before Mainnet Launch

- [ ] Security audit of smart contract logic (if any)
- [ ] Penetration testing
- [ ] HTTPS enforcement
- [ ] CSP headers configured
- [ ] Rate limiting implemented
- [ ] Admin verification on backend
- [ ] Input validation comprehensive
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies audited (npm audit)
- [ ] Secret keys not in code/logs

### Ongoing

- [ ] Monitor for unusual transactions
- [ ] Keep dependencies updated
- [ ] Regular security reviews
- [ ] Incident response plan tested
- [ ] Backups of configuration

---

## 🔍 Audit Trail

### What's Logged

Currently: Browser console only

For production, implement:
- Payment attempts (success/fail)
- Admin actions
- Configuration changes
- Error events

### Blockchain as Audit

All payments are permanently recorded on Stellar blockchain:
- Transaction hash
- Timestamp
- Sender/receiver
- Amount
- Memo (if used)

---

## 📞 Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email: security@example.com
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
4. Allow 48 hours for initial response
5. Coordinated disclosure after fix

---

*Security & Compliance document version 1.0 - December 2024*
