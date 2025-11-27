Rupio – Personalized Financial Router (AI Wallet Layer)
Project Overview
Rupio is an AI-powered financial router designed to simplify the way people make payments. Today, users juggle multiple payment methods — UPI, credit/debit cards, wallets, BNPL services, cashback apps, and EMI schemes. Choosing the right option for every transaction is complex, and users often miss out on rewards, incur unnecessary fees, or negatively affect their credit scores.
Rupio aims to solve this problem by automatically selecting the most financially beneficial payment method in real-time for every transaction. It acts as a financial brain on top of all your payment methods, helping users save money and make smarter financial decisions effortlessly.


Project Goal:
The goal of this project is to build a minimum viable product (MVP) that demonstrates the following capabilities:
Smart Payment Recommendations
Suggest the best payment method based on cashback, rewards, fees, and credit usage.
Prevent overspending by respecting personal limits.
Secure Multi-Login Mobile App
Flutter mobile app with Email/Password login, Google Sign-In, and Apple Sign-In.
Smooth onboarding and secure authentication.
Payment Instrument Management
Users can add, edit, and manage multiple cards, UPI IDs, and wallets.
Secure storage using tokenization.
Real-Time Decision Engine
Backend engine evaluates all connected payment options.
Provides optimized recommendations to the user in real-time.
Account Aggregator Integration
Pull user financial data (bank accounts, card statements, wallets) securely.
Admin Dashboard
View usage analytics, monitor recommendations, and manage app operations.


What I’m Trying to Achieve:
Create a smart financial utility that users interact with daily.
Help users maximize savings and rewards automatically.
Reduce decision fatigue in managing multiple payment methods.
Build a foundation for a global AI-powered financial operating system.
Demonstrate the feasibility of combining Flutter mobile UI, secure backend, and AI-based routing engine for real-world fintech applications.


MVP Scope:
Flutter mobile app for authentication, payment instruments, and recommendations
Backend APIs for user management, payment instruments, and recommendation engine
Basic Account Aggregator consent flow and data retrieval
Logging, consent management, and secure token storage
Admin panel for analytics



Future Vision:
Automatic execution of the recommended payment method
AI/ML-powered personalized recommendations for each user
Support for global payment methods and multi-currency transactions
Credit optimization and BNPL integration

---

## Backend Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker (optional)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run migrations
npm run migrate

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rupio_dev
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Account Aggregator (AA)
AA_BASE_URL=https://aa-sandbox.example.com
AA_CLIENT_ID=your_client_id
AA_CLIENT_SECRET=your_client_secret
AA_REDIRECT_URL=http://localhost:3000/api/aa/callback
AA_API_VERSION=v1

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3001
```

---

## Account Aggregator (AA) Integration

### Overview
The AA adapter enables secure financial data access through India's Account Aggregator framework. It handles consent management, data fetching, and transaction normalization.

### Configuration

1. **Register with an AA** (e.g., Setu, OneMoney, Finvu)
2. **Get credentials**: `client_id` and `client_secret`
3. **Configure webhook/callback URL** in AA dashboard
4. **Set environment variables**:

```env
AA_BASE_URL=https://fiu-sandbox.setu.co    # or your AA provider
AA_CLIENT_ID=your_fiu_client_id
AA_CLIENT_SECRET=your_fiu_client_secret
AA_REDIRECT_URL=http://localhost:3000/api/aa/callback
```

### Consent Flow (Development)

#### Step 1: Initiate Consent
```bash
curl -X POST http://localhost:3000/api/aa/consent/initiate \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "9876543210@aa-fi",
    "fiTypes": ["DEPOSIT", "CREDIT_CARD"],
    "fromDate": "2024-01-01",
    "toDate": "2024-11-27"
  }'
```

**Response:**
```json
{
  "success": true,
  "txnId": "uuid-here",
  "consentHandle": "CONSENT_uuid",
  "redirectUrl": "https://aa-sandbox.example.com/consent/authorize?..."
}
```

#### Step 2: User Authorization
Redirect user to `redirectUrl`. User logs into their bank and approves consent.

#### Step 3: Handle Callback
AA redirects to your callback URL with consent status:
```
GET /api/aa/callback?consentId=xxx&status=APPROVED&consentHandle=xxx
```

#### Step 4: Fetch Financial Data
```bash
curl -X POST http://localhost:3000/api/aa/data/fetch \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{ "consentId": "CONSENT_ID_HERE" }'
```

#### Step 5: Get Bank Statement
```bash
curl -X POST http://localhost:3000/api/aa/bank-statement \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{ "consentId": "CONSENT_ID_HERE" }'
```

### Testing AA Integration

```bash
# Run AA adapter tests
npm test -- aaAdapter.test.js

# Run all tests
npm test
```

### Mock Mode (Development)
The adapter returns mock responses when not connected to a real AA. This allows development without AA credentials.

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/google` | Google OAuth login |
| POST | `/api/auth/apple` | Apple OAuth login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |

### Account Aggregator
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/aa/consent/initiate` | Start consent flow |
| GET | `/api/aa/callback` | Handle AA callback |
| GET | `/api/aa/consent/status/:handle` | Check consent status |
| POST | `/api/aa/data/fetch` | Fetch financial data |
| POST | `/api/aa/bank-statement` | Get bank statement |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transactions/upload-csv` | Upload CSV statement |
| GET | `/api/transactions/csv-format` | Get sample CSV format |
| GET | `/api/transactions` | List transactions |
| GET | `/api/transactions/summary` | Get analytics |

---

## Database Migrations

```bash
# Run migrations
npm run migrate

# Rollback migrations
npm run migrate:down

# Reset database (drop + create)
npm run migrate:reset

# Drop all tables
npm run migrate:drop

# Run in specific environment
npm run migrate:prod
npm run migrate:staging
```

---

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- aaAdapter.test.js
npm test -- aaDataParser.test.js

# Run with coverage
npm test -- --coverage
```