# 🤝 Contributing to Orbit

Thank you for your interest in contributing to Orbit! This document provides guidelines and information for contributors.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

---

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment. All participants are expected to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Publishing others' private information
- Other unprofessional conduct

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Git
- [Freighter Wallet](https://freighter.app) browser extension
- Code editor (VS Code recommended)

### Repository Structure

```
Orbit/
├── src/
│   ├── components/     # React components
│   ├── config/         # Configuration files
│   ├── context/        # React context providers
│   ├── hooks/          # Custom React hooks
│   ├── assets/         # Images, fonts, etc.
│   ├── App.jsx         # Main application
│   └── main.jsx        # Entry point
├── docs/               # Documentation
├── public/             # Static files
└── contracts/          # (Future) Smart contracts
```

---

## 💻 Development Setup

### 1. Fork the Repository

Click the "Fork" button on GitHub to create your own copy.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/Orbit.git
cd Orbit
```

### 3. Add Upstream Remote

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/Orbit.git
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your test wallet details.

### 6. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173`

---

## ✏️ Making Changes

### 1. Create a Branch

```bash
# Update main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Branch Naming Convention

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/description` | `feature/multi-wallet-support` |
| Bug Fix | `fix/description` | `fix/payment-timeout` |
| Documentation | `docs/description` | `docs/api-reference` |
| Refactor | `refactor/description` | `refactor/transaction-handler` |

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Update documentation if needed

### 3. Test Your Changes

```bash
# Run linter
npm run lint

# Build to check for errors
npm run build

# Test in browser
npm run dev
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add multi-wallet support"
```

#### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change, no new feature or fix
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Build process, dependencies

**Examples:**
```
feat(payments): add support for USDC payments
fix(wallet): resolve connection timeout on slow networks
docs(readme): update installation instructions
refactor(hooks): simplify useWalletService logic
```

---

## 🔄 Pull Request Process

### 1. Push Your Branch

```bash
git push origin feature/your-feature-name
```

### 2. Create Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Select your branch
4. Fill out the PR template

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing Done
- [ ] Tested on testnet
- [ ] Tested admin features
- [ ] Tested user features
- [ ] Mobile responsive check

## Screenshots (if applicable)

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No console errors
- [ ] Build passes
```

### 3. Code Review

- Maintainers will review your PR
- Address any feedback
- Push additional commits if needed

### 4. Merge

Once approved, maintainers will merge your PR.

---

## 📝 Coding Standards

### JavaScript/React

```javascript
// ✅ Good: Descriptive names, proper formatting
const calculatePlatformFee = (amount, feePercent) => {
  const fee = amount * (feePercent / 100);
  return parseFloat(fee.toFixed(7));
};

// ❌ Bad: Cryptic names, no formatting
const calc = (a,f) => a*(f/100);
```

### Component Structure

```jsx
// Component template
import React, { useState, useEffect } from 'react';

/**
 * ComponentName - Brief description
 * @param {Object} props - Component props
 * @param {string} props.title - The title to display
 */
const ComponentName = ({ title }) => {
  // State
  const [data, setData] = useState(null);

  // Effects
  useEffect(() => {
    // Effect logic
  }, []);

  // Handlers
  const handleClick = () => {
    // Handler logic
  };

  // Render
  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
};

export default ComponentName;
```

### Styling (Tailwind CSS)

```jsx
// ✅ Good: Organized, responsive classes
<div className="
  flex flex-col items-center
  p-4 md:p-6 lg:p-8
  bg-[#14141A] rounded-xl
  border border-white/10
">

// ❌ Bad: Unorganized, hard to read
<div className="p-4 flex bg-[#14141A] border md:p-6 flex-col border-white/10 lg:p-8 rounded-xl items-center">
```

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `WalletConnect.jsx` |
| Hooks | camelCase with use prefix | `useWalletService.js` |
| Config | camelCase | `platform.js` |
| Constants | UPPER_SNAKE_CASE | `API_ENDPOINTS.js` |

---

## 🧪 Testing

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] **Wallet Connection**
  - Connect with Freighter
  - Disconnect properly
  - Reconnect after refresh

- [ ] **Payments**
  - One-time payment works
  - Subscription creates properly
  - Transaction appears in history

- [ ] **Admin Features** (if applicable)
  - Dashboard loads
  - Providers can be added/edited/deleted
  - Settings save properly

- [ ] **Responsiveness**
  - Desktop (1920px, 1440px, 1024px)
  - Tablet (768px)
  - Mobile (375px)

### Testnet Usage

Always test on Stellar Testnet:
- Use [Friendbot](https://friendbot.stellar.org) for test XLM
- Never use real funds for testing
- Verify transactions on [Stellar Expert](https://stellar.expert)

---

## 📚 Documentation

### When to Update Docs

- Adding new features
- Changing configuration
- Modifying API behavior
- Adding new components

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `docs/USER_GUIDE.md` | End-user documentation |
| `docs/API_REFERENCE.md` | Technical API docs |
| `docs/ARCHITECTURE.md` | System design |
| `docs/DEPLOYMENT.md` | Deployment guide |

### Code Comments

```javascript
/**
 * Submits a payment transaction to the Stellar network
 * @param {string} destination - Recipient public key
 * @param {string} amount - Amount in XLM
 * @param {string} memo - Optional transaction memo
 * @returns {Promise<Object>} Transaction result
 * @throws {Error} If transaction fails
 */
async function submitPayment(destination, amount, memo) {
  // Implementation
}
```

---

## 💡 Feature Requests

### Proposing Features

1. Check existing issues/PRs
2. Open a GitHub Discussion or Issue
3. Describe:
   - Problem being solved
   - Proposed solution
   - Alternatives considered
   - Implementation ideas

### Feature Request Template

```markdown
## Feature Description
What feature would you like?

## Problem
What problem does this solve?

## Proposed Solution
How should it work?

## Alternatives
What alternatives did you consider?

## Additional Context
Any mockups, examples, or references?
```

---

## 🐛 Bug Reports

### Reporting Bugs

1. Check if bug already reported
2. Create new issue with details
3. Include reproduction steps

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen?

## Actual Behavior
What actually happens?

## Environment
- OS: [Windows/Mac/Linux]
- Browser: [Chrome/Firefox/etc]
- Wallet: [Freighter version]
- Network: [Testnet/Mainnet]

## Screenshots
If applicable

## Console Errors
Any error messages
```

---

## 🎉 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Thanked publicly on social media (with permission)

---

## 📞 Getting Help

- **GitHub Discussions**: General questions
- **GitHub Issues**: Bug reports, feature requests
- **Discord**: Real-time community chat

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to Orbit! 🚀
