# WorkChain Setup Guide

Complete guide to setting up WorkChain for development, testing, and production deployment.

---

## 📋 Prerequisites

### Required Software

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** >= 14.0
- **Redis** >= 6.0 (optional, for caching)
- **Git**

### Recommended Tools

- **Docker** & **Docker Compose** (for containerized development)
- **Postman** or **Insomnia** (for API testing)
- **pgAdmin** or **TablePlus** (for database management)

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/workchain.git
cd workchain
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and configure:
- Database connection
- JWT secret
- Payment gateway keys (at least Stripe)
- Any integrations you want to test

### 4. Set Up Database

```bash
# Create database
createdb workchain

# Run migrations (using Prisma)
npx prisma migrate dev

# Seed database with sample data (optional)
npm run seed
```

### 5. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

---

## 🔧 Detailed Setup

### Database Setup

#### Option 1: Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database and user
psql postgres
CREATE DATABASE workchain;
CREATE USER workchain_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE workchain TO workchain_user;
\q

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://workchain_user:your_password@localhost:5432/workchain
```

#### Option 2: Docker

```bash
# Start PostgreSQL in Docker
docker run --name workchain-postgres \
  -e POSTGRES_USER=workchain_user \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=workchain \
  -p 5432:5432 \
  -d postgres:14

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://workchain_user:your_password@localhost:5432/workchain
```

#### Option 3: Cloud (Recommended for Production)

Use managed PostgreSQL from:
- **AWS RDS**
- **Google Cloud SQL**
- **DigitalOcean Managed Databases**
- **Supabase** (includes free tier)

### Payment Gateway Setup

#### Stripe (Primary)

1. Sign up at [stripe.com](https://stripe.com)
2. Get your API keys from Dashboard → Developers → API keys
3. Add to `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. Set up webhooks:
   - Go to Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/webhooks/stripe`
   - Select events: `payment_intent.*`, `charge.*`
   - Copy webhook secret to `.env`

#### PayPal

1. Sign up at [developer.paypal.com](https://developer.paypal.com)
2. Create an app in Dashboard
3. Get Client ID and Secret
4. Add to `.env`:
   ```env
   PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   PAYPAL_MODE=sandbox
   ```

#### Braintree (for Venmo)

1. Sign up at [braintreepayments.com](https://braintreepayments.com)
2. Get API credentials
3. Add to `.env`:
   ```env
   BRAINTREE_MERCHANT_ID=...
   BRAINTREE_PUBLIC_KEY=...
   BRAINTREE_PRIVATE_KEY=...
   ```

### Integration Setup

#### GitHub

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new OAuth App:
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/auth/github/callback`
3. Get Client ID and Secret
4. Add to `.env`

#### Jira

1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create API token
3. Add to `.env`:
   ```env
   JIRA_API_TOKEN=...
   JIRA_USER_EMAIL=your-email@example.com
   ```

#### Slack

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create new app
3. Add Bot Token Scopes:
   - `chat:write`
   - `channels:read`
   - `groups:read`
4. Install app to workspace
5. Get Bot Token from OAuth & Permissions
6. Add to `.env`

#### Microsoft Teams

1. Go to [portal.azure.com](https://portal.azure.com)
2. Register new application in Azure AD
3. Add Microsoft Graph API permissions
4. Get Client ID, Secret, and Tenant ID
5. Add to `.env`

---

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Manual API Testing

#### Create User

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice_dev",
    "email": "alice@example.com",
    "password": "SecurePass123!",
    "roles": ["freelancer"],
    "skills": ["TypeScript", "React"]
  }'
```

#### Create Project

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Build authentication system",
    "description": "Need JWT-based auth",
    "projectType": "feature",
    "budget": {
      "type": "fixed",
      "amount": 1000,
      "currency": "USD"
    },
    "skills": ["TypeScript", "Node.js"]
  }'
```

---

## 🚢 Deployment

### Environment Setup

#### Staging

```bash
# Use separate database
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/workchain_staging

# Use test mode for payments
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_MODE=sandbox

# Lower rate limits
RATE_LIMIT_MAX_REQUESTS=50
```

#### Production

```bash
# Production database
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/workchain

# Live payment credentials
STRIPE_SECRET_KEY=sk_live_...
PAYPAL_MODE=live
BRAINTREE_ENVIRONMENT=production

# Strict settings
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_RATE_LIMITING=true
```

### Deployment Options

#### Option 1: Vercel (Recommended for MVP)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

#### Option 2: Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway up
```

#### Option 3: DigitalOcean App Platform

1. Push code to GitHub
2. Connect repository in DigitalOcean dashboard
3. Configure environment variables
4. Deploy

#### Option 4: AWS (Advanced)

```bash
# Use Elastic Beanstalk
eb init workchain
eb create workchain-prod

# Or use ECS with Docker
docker build -t workchain .
docker push your-ecr-repo/workchain:latest
```

### Database Migration

```bash
# Run migrations in production
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### SSL/HTTPS

Use:
- **Cloudflare** (free SSL)
- **Let's Encrypt** (free, auto-renew)
- **AWS Certificate Manager** (free with AWS)

---

## 📊 Monitoring & Logging

### Application Monitoring

Recommended services:
- **Sentry** (error tracking)
- **DataDog** (APM)
- **New Relic** (performance)
- **LogRocket** (session replay)

### Database Monitoring

- **pgAnalyze** (PostgreSQL performance)
- **CloudWatch** (for AWS RDS)

### Uptime Monitoring

- **UptimeRobot** (free)
- **Pingdom**
- **StatusCake**

---

## 🔒 Security Checklist

### Before Production

- [ ] Change all default secrets in `.env`
- [ ] Enable rate limiting
- [ ] Set up CORS properly
- [ ] Use HTTPS everywhere
- [ ] Enable Helmet.js security headers
- [ ] Validate all user inputs
- [ ] Sanitize database queries (use Prisma)
- [ ] Enable SQL injection protection
- [ ] Set up WAF (Web Application Firewall)
- [ ] Configure CSP (Content Security Policy)
- [ ] Enable audit logging
- [ ] Set up backup strategy
- [ ] Test payment webhooks
- [ ] Enable 2FA for admin accounts
- [ ] Run security audit: `npm audit`

---

## 🐛 Troubleshooting

### Common Issues

#### "Cannot connect to database"

```bash
# Check PostgreSQL is running
pg_isready

# Verify DATABASE_URL format
# postgresql://user:password@host:port/database

# Test connection
psql $DATABASE_URL
```

#### "Stripe key invalid"

```bash
# Verify key starts with sk_test_ or sk_live_
# Check no extra spaces in .env file
# Restart server after changing .env
```

#### "Port 3000 already in use"

```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

#### "Redis connection failed"

```bash
# Redis is optional for MVP
# Comment out Redis-related code or start Redis:
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis
```

---

## 🤝 Getting Help

- **Documentation**: [docs.workchain.io](https://docs.workchain.io)
- **Discord**: [discord.gg/workchain](https://discord.gg/workchain)
- **GitHub Issues**: [github.com/yourusername/workchain/issues](https://github.com/yourusername/workchain/issues)
- **Email**: support@workchain.io

---

## 📚 Additional Resources

- [Stripe Integration Guide](https://stripe.com/docs)
- [PayPal Developer Docs](https://developer.paypal.com/docs)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps)
- [Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3)
- [Slack API](https://api.slack.com)
- [Prisma Docs](https://www.prisma.io/docs)

---

**Happy coding! 🚀**
