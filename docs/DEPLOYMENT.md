# 🚀 Deployment Guide

## Overview

This guide covers deploying Orbit to production. Orbit is a static React application that can be hosted on any static hosting provider.

---

## 📋 Pre-Deployment Checklist

### Environment

- [ ] Node.js 18+ installed locally
- [ ] All dependencies installed (`npm install`)
- [ ] Build completes successfully (`npm run build`)
- [ ] No console errors in production build

### Configuration

- [ ] `.env` configured for production (mainnet)
- [ ] Platform wallet is funded and secure
- [ ] Admin wallets are correct
- [ ] Fee percentage is set correctly

### Security

- [ ] Secret keys NOT in source code
- [ ] `.env` is in `.gitignore`
- [ ] HTTPS will be enforced
- [ ] CSP headers configured (if custom hosting)

### Testing

- [ ] All features tested on testnet
- [ ] Payment flow verified
- [ ] Admin features verified
- [ ] Mobile responsiveness checked

---

## 🌍 Production Environment Variables

Create production environment configuration:

```env
# Production .env
VITE_PLATFORM_WALLET=G... (Your funded mainnet wallet)
VITE_ADMIN_WALLETS=G...,G... (Admin public keys)
VITE_PLATFORM_FEE_PERCENT=2
VITE_NETWORK=mainnet
```

**⚠️ Critical:** 
- NEVER commit your `.env` to git
- Use your hosting provider's environment variable settings
- Ensure platform wallet has sufficient XLM for operations

---

## 🏗️ Build Process

### Local Build

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Build Output

Production files are generated in the `dist/` folder:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── ...
```

---

## ☁️ Deployment Options

### Option 1: Vercel (Recommended)

Vercel offers the easiest deployment with automatic CI/CD.

#### Quick Deploy

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Configure environment variables:
   - `VITE_PLATFORM_WALLET`
   - `VITE_ADMIN_WALLETS`
   - `VITE_PLATFORM_FEE_PERCENT`
   - `VITE_NETWORK`
5. Deploy!

#### Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

#### vercel.json Configuration

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

---

### Option 2: Netlify

#### Quick Deploy

1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. New site from Git
4. Select repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add environment variables in Site Settings
7. Deploy!

#### netlify.toml Configuration

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
```

---

### Option 3: GitHub Pages

#### Setup

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Update `package.json`:
```json
{
  "homepage": "https://yourusername.github.io/orbit",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. Update `vite.config.js`:
```javascript
export default defineConfig({
  base: '/orbit/', // Match your repo name
  // ... rest of config
})
```

4. Deploy:
```bash
npm run deploy
```

**Note:** Environment variables must be set at build time for GitHub Pages.

---

### Option 4: AWS S3 + CloudFront

#### S3 Bucket Setup

1. Create S3 bucket
2. Enable static website hosting
3. Set index document: `index.html`
4. Set error document: `index.html`
5. Upload `dist/` contents

#### CloudFront Setup

1. Create CloudFront distribution
2. Origin: Your S3 bucket
3. Enable HTTPS
4. Create custom error response for 403/404 → `/index.html`

#### AWS CLI Deployment

```bash
# Build
npm run build

# Sync to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

---

### Option 5: Docker

#### Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_PLATFORM_WALLET
ARG VITE_ADMIN_WALLETS
ARG VITE_PLATFORM_FEE_PERCENT
ARG VITE_NETWORK
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
}
```

#### Build and Run

```bash
# Build image
docker build \
  --build-arg VITE_PLATFORM_WALLET=G... \
  --build-arg VITE_ADMIN_WALLETS=G... \
  --build-arg VITE_PLATFORM_FEE_PERCENT=2 \
  --build-arg VITE_NETWORK=mainnet \
  -t orbit:latest .

# Run container
docker run -d -p 80:80 orbit:latest
```

---

## 📱 Mobile App Deployment

### Capacitor Setup

Orbit includes Capacitor for native mobile builds.

#### iOS (Requires macOS)

```bash
# Add iOS platform
npx cap add ios

# Build web assets
npm run build

# Sync to native project
npx cap sync ios

# Open in Xcode
npx cap open ios
```

Then deploy via Xcode to App Store.

#### Android

```bash
# Add Android platform
npx cap add android

# Build web assets
npm run build

# Sync to native project
npx cap sync android

# Open in Android Studio
npx cap open android
```

Then deploy via Android Studio to Play Store.

---

## 🔧 Post-Deployment

### Verification Steps

1. **Access the site** - Ensure it loads correctly
2. **Connect wallet** - Test Freighter connection
3. **Check admin access** - Verify admin wallets work
4. **Test payment flow** - Small test transaction
5. **Mobile check** - Test on various devices
6. **Console check** - No errors in browser console

### Monitoring Setup

#### Error Tracking (Sentry)

```bash
npm install @sentry/react
```

```javascript
// main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
});
```

#### Analytics (Optional)

```html
<!-- index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXX"></script>
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        env:
          VITE_PLATFORM_WALLET: ${{ secrets.VITE_PLATFORM_WALLET }}
          VITE_ADMIN_WALLETS: ${{ secrets.VITE_ADMIN_WALLETS }}
          VITE_PLATFORM_FEE_PERCENT: ${{ secrets.VITE_PLATFORM_FEE_PERCENT }}
          VITE_NETWORK: mainnet
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./
          vercel-args: '--prod'
```

---

## 🔐 Security Hardening

### Environment Variables

Never expose secrets in:
- Client-side code
- Git repository
- Build logs
- Error messages

### HTTPS

- Always enforce HTTPS in production
- Redirect HTTP → HTTPS
- Use HSTS header

### Headers

Recommended security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
```

---

## 🚨 Rollback Procedure

### Vercel/Netlify

1. Go to deployments dashboard
2. Find previous working deployment
3. Click "Promote to Production"

### Manual

1. Checkout previous version:
```bash
git checkout v1.0.0  # or commit hash
```

2. Rebuild and deploy:
```bash
npm run build
# Deploy as usual
```

---

## 📞 Support

If you encounter deployment issues:

1. Check build logs for errors
2. Verify environment variables are set
3. Test locally with `npm run preview`
4. Check browser console for runtime errors
5. Open GitHub issue with details

---

*Deployment Guide version 1.0 - December 2024*
