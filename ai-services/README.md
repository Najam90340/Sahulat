# Sahulat AI Services

> **Status:** Placeholder v1 (deterministic heuristics)  
> **Upgrade path:** Swap scoring functions for a Python FastAPI microservice without changing APIs or DB schema.

---

## Overview

Three AI capabilities power the Sahulat B2B marketplace:

| Capability | Endpoint | Purpose |
|---|---|---|
| Supplier Matching | `POST /api/ai/supplier-match` | Rank suppliers for a given RFQ |
| Buyer Credit Scoring | `POST /api/ai/credit-score` | Estimate creditworthiness from history |
| Pricing Insights | `POST /api/ai/pricing-insights` | Recommend competitive price ranges |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Sahulat Backend (Express/TS)            │
│                                                             │
│  routes/ai.ts  →  controllers/aiController.ts              │
│                         │                                   │
│              ┌──────────┼──────────┐                        │
│              ▼          ▼          ▼                        │
│    supplierMatcher  creditScorer  pricingAdvisor            │
│    (heuristic-v1)  (heuristic-v1) (heuristic-v1)           │
│              │          │          │                        │
│              └──────────┴──────────┘                        │
│                         │                                   │
│                  PostgreSQL (AI tables)                     │
│           ai_supplier_matches                               │
│           ai_credit_scores                                  │
│           ai_pricing_insights                               │
└─────────────────────────────────────────────────────────────┘

                  ▼ Future upgrade (feature-flagged)

┌─────────────────────────────────────────────────────────────┐
│              ai-services/ (Python FastAPI)                  │
│                                                             │
│   POST /match        →  ML ranking model (XGBoost/LightGBM)│
│   POST /credit-score →  Logistic regression / scorecard    │
│   POST /pricing      →  Gradient boosted regression        │
│                                                             │
│   Enabled by: AI_SERVICE_URL env var                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Supplier Matching

### Algorithm (heuristic-v1)

Scores each verified supplier against an RFQ on four dimensions:

| Dimension | Weight | Signal |
|---|---|---|
| Location | 35% | Same city = 100, same region = 60, different = 20 |
| Performance | 25% | Accepted-quote rate + verification status bonus (premium +15, verified +8) |
| Catalog | 25% | Number of catalog items matching the RFQ product name |
| Price | 15% | Supplier's avg catalog price vs market median (percentile-based) |

**Composite score** = weighted sum (0–100). Results are ranked and upserted to `ai_supplier_matches`.

### ML Upgrade Path

Replace `matchSuppliers()` in `supplierMatcher.ts` with:

```typescript
// When AI_SERVICE_URL is set, delegate to Python microservice
const response = await fetch(`${process.env.AI_SERVICE_URL}/match`, {
  method: 'POST',
  body: JSON.stringify({ rfq, suppliers }),
});
```

The Python service would use features like:
- Supplier embedding (category specialisation, geographic cluster)
- Historical win-rate per product category
- Seasonal demand patterns
- Buyer–supplier co-occurrence graph

---

## 2. Buyer Credit Scoring

### Algorithm (heuristic-v1)

Produces a **300–850 FICO-style score** from four components:

| Component | Weight | Signal |
|---|---|---|
| Payment history | 35% | Released txns / total txns; refund penalty |
| Transaction volume | 30% | Total PKR spent across all pools |
| Pool participation | 20% | Number of pools joined; avg quantity |
| Account age | 15% | Days since registration |

**Grade bands:** A (750+), B (680–749), C (580–679), D (480–579), F (<480)

**Credit limit tiers:** PKR 5k – 500k mapped to grade.

### ML Upgrade Path

Feed the same features into a logistic regression or gradient boosted classifier trained on historical dispute/refund outcomes.

---

## 3. Pricing Insights

### Algorithm (heuristic-v1)

Collects market price data from two sources:
1. Accepted quotes for the same product (cross-supplier)
2. Active catalog listings for the same product

Derives **p10 (floor)**, **p50 (median)**, **p90 (ceiling)** from the price distribution.  
Applies a **trust premium** (verified +4%, premium +8%) to the optimal price.

**Confidence** = `min(95, 50 + data_points × 2)` – honest about uncertainty with sparse data.

### ML Upgrade Path

Train a gradient boosted regressor on:
- Product category embeddings
- City-level demand/supply ratio
- Seasonal dummies
- Supplier rating features

---

## Environment Variables

```bash
# Required (existing)
DATABASE_URL=postgresql://...

# Optional – enables external ML microservice
AI_SERVICE_URL=http://localhost:8000   # Python FastAPI AI backend
AI_SERVICE_API_KEY=your_key_here       # Bearer token for AI service
AI_TIMEOUT_MS=5000                     # Fallback to heuristics if AI service times out
```

---

## API Reference

### `GET /api/ai/status`
Returns operational status and record counts for each AI capability.

### `POST /api/ai/supplier-match`
```json
{ "rfq_id": "uuid" }
```
Returns ranked supplier list with per-dimension scores and human-readable reasoning.

### `GET /api/ai/supplier-match/:rfqId`
Returns cached match results (no recomputation).

### `POST /api/ai/credit-score`
```json
{ "buyer_id": "uuid" }
```
Computes/refreshes credit score. Returns score (300–850), grade, suggested limit, and factor breakdown.

### `GET /api/ai/credit-scores`
Admin view: all buyer credit scores ordered by score descending.

### `GET /api/ai/credit-score/:buyerId`
Single buyer credit score (returns 404 if not yet computed).

### `POST /api/ai/pricing-insights`
```json
{ "supplier_id": "uuid", "product_name": "Basmati Rice", "category": "Grains" }
```
Returns min/max/optimal price range, market median, confidence score, and reasoning.

### `GET /api/ai/pricing-insights?supplier_id=<uuid>`
Returns cached pricing insights (optionally filtered by supplier).

---

## Database Schema

```sql
-- ai_supplier_matches   – one row per (rfq, supplier) pair
-- ai_credit_scores      – one row per buyer (upserted on recompute)
-- ai_pricing_insights   – one row per (supplier, product_name) pair
```

See `backend/src/db/schema.sql` for full DDL.

---

## Future Microservice Structure

```
ai-services/
├── README.md              ← this file
├── supplier_matcher/
│   ├── model.pkl          ← trained XGBoost model
│   ├── train.py           ← training script
│   └── api.py             ← FastAPI endpoint
├── credit_scorer/
│   ├── model.pkl
│   ├── train.py
│   └── api.py
├── pricing_advisor/
│   ├── model.pkl
│   ├── train.py
│   └── api.py
├── requirements.txt
└── Dockerfile
```

Each microservice exposes a simple REST endpoint that the Node.js backend calls when `AI_SERVICE_URL` is configured. The fallback to heuristics ensures **zero downtime** during the ML transition.
