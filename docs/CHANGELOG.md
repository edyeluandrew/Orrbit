# Changelog

All notable changes to Orbit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Real payment splitting (98% provider, 2% platform)
- Multi-wallet support (Lobstr, xBull, Rabet)
- Backend infrastructure with database
- Mobile app deployment (iOS/Android)

---

## [0.2.0] - 2024-12-XX

### Added
- **Admin Panel Enhancements**
  - Transactions tab with live feed and search/filter
  - Users tab with churn analytics
  - Settings tab with fee slider and network toggle
  - Admin wallet management (add/remove)

- **User Experience**
  - User/Admin view toggle in header
  - Real-time transaction monitoring (5-second refresh)
  - Failed payment alerts and refund workflow
  - CSV export for transactions

- **Analytics**
  - User churn rate calculation
  - Lifetime value (LTV) tracking
  - Payment history per user
  - Active vs churned user segmentation

- **Documentation**
  - Comprehensive README.md
  - Business model documentation
  - Technical architecture guide
  - User guide
  - API reference
  - Security & compliance guide
  - Product roadmap
  - Deployment guide
  - Contributing guidelines

### Changed
- Recreated ServiceProviderManager with inline Tailwind classes
- Recreated AdminDashboard with inline Tailwind classes
- Updated App.jsx with 5 admin tabs routing

### Fixed
- Black screen on Providers tab (CSS class issue)
- Black screen on Dashboard tab (CSS class issue)
- 400 error on payments (platform wallet not funded)

---

## [0.1.0] - 2024-12-XX

### Added
- **Core Features**
  - Freighter wallet integration
  - One-time XLM payments
  - Subscription creation and management
  - Service provider management (CRUD)
  - Transaction history with localStorage persistence

- **Admin Features**
  - Admin dashboard with analytics
  - Provider management interface
  - Admin access control via wallet whitelist

- **UI/UX**
  - Dark theme with orbit-gold accent (#F7931A)
  - Neumorphic card design
  - Responsive layout
  - Toast notifications
  - Loading states

- **Price Conversion**
  - XLM/USD conversion via CoinGecko API
  - Real-time price updates
  - Display in both currencies

- **Configuration**
  - Environment variable configuration
  - Platform fee percentage setting
  - Network toggle (testnet/mainnet)

### Technical
- React 19 with Vite 7
- Tailwind CSS 3 styling
- Stellar SDK integration
- Freighter API integration
- Capacitor for mobile builds
- ESLint configuration

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 0.2.0 | Dec 2024 | Admin panel enhancements, documentation |
| 0.1.0 | Dec 2024 | Initial MVP with core features |

---

## Migration Notes

### From 0.1.0 to 0.2.0

No breaking changes. The update adds new admin tabs and documentation.

**New Components:**
- `AdminTransactions.jsx`
- `UsersManager.jsx`
- `SettingsPanel.jsx`

**Updated Components:**
- `App.jsx` - New imports and routing

**New Files:**
- `docs/` folder with full documentation

---

## Upcoming Releases

### v0.3.0 (Planned)
- Payment splitting implementation
- Backend API setup
- Multi-wallet support

### v0.4.0 (Planned)
- Provider self-service portal
- Subscription reminders
- Payment notifications

### v1.0.0 (Planned)
- Mainnet launch
- Mobile apps
- Public API

---

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create git tag: `git tag -a v0.2.0 -m "Version 0.2.0"`
4. Push with tags: `git push origin main --tags`
5. Create GitHub Release
6. Deploy to production

---

[Unreleased]: https://github.com/username/orbit/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/username/orbit/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/username/orbit/releases/tag/v0.1.0
