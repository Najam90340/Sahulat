# Sahulat – Security Guide

## Overview

This document describes the security controls implemented in the Sahulat platform and the
checks that must pass before promoting to production.

---

## 1. HTTPS / HSTS

| Requirement | Implementation |
|---|---|
| **All traffic over HTTPS** | Nginx / load-balancer terminates TLS; backend only listens on `localhost:5000` |
| **HSTS** | `Strict-Transport-Security: max-age=31536000; includeSubDomains` header set by reverse proxy |
| **Minimum TLS version** | TLS 1.2+ enforced at the load-balancer; TLS 1.0 and 1.1 disabled |
| **Certificate management** | Let's Encrypt (staging) / AWS ACM (production); auto-renewed |

**Next.js frontend** is deployed on Vercel which enforces HTTPS automatically.

**React Native mobile app** communicates exclusively over HTTPS with certificate pinning planned for v1.1.

---

## 2. Authentication & Two-Factor Authentication (2FA)

| Layer | Control |
|---|---|
| **Session tokens** | Stateless JWT; signed with `JWT_SECRET` (min 32 random bytes) |
| **Token expiry** | Access token: 15 min; Refresh token: 7 days, stored in `HttpOnly` cookie |
| **2FA (TOTP)** | OTP sent to registered phone number via Easypaisa / JazzCash SMS for: login from new device, payment initiation, escrow release |
| **2FA library** | `speakeasy` (TOTP RFC 6238) — to be wired in v1.1 |
| **Brute-force protection** | `express-rate-limit` — 10 attempts / 15 min per IP on `/api/auth/login` |
| **Phone OTP** | 6-digit OTP, expires in 10 minutes, single-use |

### 2FA Flow (planned v1.1)

```
POST /api/auth/login → { requires_2fa: true, session_token: "<ephemeral>" }
POST /api/auth/verify-otp { session_token, otp } → { access_token, refresh_token }
```

---

## 3. PCI-DSS Compliance (Card Payments)

Sahulat **never stores raw card data** (PAN, CVV, expiry). Card payments use a
gateway-hosted payment page or a tokenisation SDK (e.g. Stripe.js / PayFast.js):

1. Browser/app calls the gateway SDK → receives an opaque `card_token`
2. `card_token` is sent to `POST /api/payments/initiate` — this is the only card field our backend accepts
3. Backend forwards the token to the gateway adapter; raw card data never touches our servers

See `backend/src/services/gateways/base.ts` for the `PaymentGatewayAdapter` interface which
documents this constraint.

### PCI-DSS Checklist

- [x] No raw card data in request payloads (enforced by schema — no `card_number`/`cvv` fields)
- [x] No raw card data logged (Morgan logs only method, path, status)
- [x] No raw card data in database (`transactions.metadata` stores gateway ref only)
- [ ] SAQ-A self-assessment questionnaire (before go-live with card payments)
- [ ] Network segmentation for payment gateway callbacks

---

## 4. Encryption at Rest

| Data | Encryption |
|---|---|
| PostgreSQL data | Encrypted at the volume level (AWS EBS / GCP PD with AES-256) |
| Redis cache | In-transit encrypted via TLS; no sensitive data cached |
| Backups | AWS S3 SSE-S3 encryption |
| Secrets | AWS Secrets Manager / GCP Secret Manager (never in `.env` in production) |

---

## 5. HTTP Security Headers (Helmet)

Applied globally in `backend/src/index.ts`:

```typescript
app.use(helmet());
```

Headers set by Helmet 7:

| Header | Value |
|---|---|
| `Content-Security-Policy` | Default Helmet policy |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-XSS-Protection` | `0` (legacy auditor disabled per OWASP) |
| `Strict-Transport-Security` | Set at proxy layer |
| `Referrer-Policy` | `no-referrer` |

---

## 6. Input Validation & SQL Injection Prevention

- All database queries use **parameterised statements** via the `pg` library — no string interpolation
- Request bodies validated in controllers before any DB call
- Contact information in chat messages filtered by `utils/contactMask.ts` to prevent off-platform deals

---

## 7. CORS

```typescript
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
```

In production, `FRONTEND_URL` is set to the exact Vercel domain. Wildcard `*` is not used.

---

## 8. Rate Limiting

`express-rate-limit` is applied at the app level. Endpoint-specific limits (planned v1.1):

| Endpoint | Limit |
|---|---|
| `POST /api/auth/login` | 10 / 15 min |
| `POST /api/payments/initiate` | 5 / min |
| `POST /api/rfqs` | 20 / min |

---

## 9. Secrets Management

**Development**: `.env` file (never commit — excluded by `.gitignore`)

**Staging / Production**: Secrets injected as environment variables via CI/CD (GitHub Actions → cloud secrets manager)

Required secrets:

```
JWT_SECRET          # min 32 random bytes (openssl rand -hex 32)
DATABASE_URL        # includes credentials
REDIS_URL
POSTGRES_PASSWORD
TRANSLATION_API_KEY # optional
AI_SERVICE_API_KEY  # optional
```

---

## 10. Security Testing

Automated regression tests run with `npm test` in the `backend` workspace:

| Test file | Coverage |
|---|---|
| `security.test.ts` | HTTP headers, input validation, PCI-DSS, masking, 2FA checklist |
| `e2e.rfq-pool-payment.test.ts` | Full RFQ→Pool→Payment→Escrow-release flow |
| `e2e.shipment.test.ts` | Shipment creation, status progression, delivery proof |
| `i18n.test.ts` | Urdu RTL localisation, Pakistan city list, key coverage |

Run: `cd backend && npm test`

---

## 11. Vulnerability Disclosure

To report a security vulnerability, email **security@sahulat.pk** (set up before go-live).
Do not open public GitHub issues for security bugs.
