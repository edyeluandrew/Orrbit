# Orrbit Backend

Node.js + PostgreSQL backend for the Orrbit creator subscription platform.

## Features

- **Fastify** - High-performance Node.js web framework
- **PostgreSQL** - Relational database with full transactional support
- **JWT Authentication** - Wallet-based authentication with signature verification
- **WebSocket** - Real-time notifications for payments and subscriptions
- **Stellar Integration** - Payment verification and transaction streaming
- **Rate Limiting** - Protection against abuse

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or pnpm

### Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

3. Run database migrations:
```bash
npm run db:migrate
```

4. (Optional) Seed sample data:
```bash
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`.

## Using Docker

From the root project directory:

```bash
# Start all services (backend + PostgreSQL)
docker-compose up -d

# Run migrations
docker-compose exec backend npm run db:migrate

# View logs
docker-compose logs -f backend
```

## API Endpoints

### Authentication
- `GET /api/auth/nonce/:walletAddress` - Get nonce for signing
- `POST /api/auth/verify` - Verify signature and get JWT
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Invalidate session

### Users
- `GET /api/users/:walletAddress` - Get user profile
- `PATCH /api/users/me` - Update profile
- `GET /api/users/me/subscriptions` - List subscriptions
- `GET /api/users/me/transactions` - List transactions
- `GET /api/users/me/notifications` - Get notifications

### Creators
- `GET /api/creators` - List creators (with pagination)
- `GET /api/creators/featured` - Get featured creators
- `GET /api/creators/:id` - Get creator by ID
- `GET /api/creators/wallet/:walletAddress` - Get creator by wallet
- `PATCH /api/creators/me` - Update creator profile
- `GET /api/creators/me/subscribers` - List subscribers
- `GET /api/creators/me/stats` - Get analytics

### Subscription Tiers
- `POST /api/creators/me/tiers` - Create tier
- `PATCH /api/creators/me/tiers/:tierId` - Update tier
- `DELETE /api/creators/me/tiers/:tierId` - Delete tier

### Subscriptions
- `POST /api/subscriptions` - Create subscription
- `GET /api/subscriptions/:id` - Get subscription
- `POST /api/subscriptions/:id/cancel` - Cancel subscription
- `POST /api/subscriptions/:id/renew` - Renew subscription

### Transactions
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:id` - Get transaction
- `POST /api/transactions/tip` - Record a tip
- `GET /api/transactions/stats` - Get statistics

### Admin (requires admin role)
- `GET /api/admin/stats` - Platform overview statistics
- `GET /api/admin/stats/chart` - Chart data for dashboard
- `GET /api/admin/users` - List all users (paginated)
- `GET /api/admin/users/:id` - Get user details
- `PATCH /api/admin/users/:id` - Update user (role, ban)
- `DELETE /api/admin/users/:id` - Deactivate user
- `GET /api/admin/creators` - List all creators
- `PATCH /api/admin/creators/:id` - Update creator (verify, feature)
- `POST /api/admin/creators/:id/verify` - Quick verify creator
- `GET /api/admin/transactions` - List all transactions
- `PATCH /api/admin/transactions/:id` - Update transaction status
- `GET /api/admin/subscriptions` - List all subscriptions
- `GET /api/admin/settings` - Get platform settings
- `GET /api/admin/audit` - Get audit log

### WebSocket
- `ws://localhost:3001/ws?token=JWT` - Real-time updates

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:5173 |
| `STELLAR_NETWORK` | TESTNET or PUBLIC | TESTNET |

## Database Schema

### Tables
- `users` - User accounts and profiles
- `creators` - Creator profiles and settings
- `tiers` - Subscription tiers
- `subscriptions` - Active subscriptions
- `transactions` - Payment history
- `notifications` - User notifications
- `sessions` - Auth sessions

## License

MIT
