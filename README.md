# Sahulat

Sahulat is a full-stack monorepo application built with Node.js/Express (backend), Next.js (frontend & admin dashboard), and React Native (mobile app), backed by PostgreSQL and Redis.

---

## Folder Structure

```
Sahulat/
├── .gitignore
├── .env.example
├── package.json              # root - npm workspaces
├── docker-compose.yml        # PostgreSQL + Redis
├── README.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── config/
│       │   ├── database.ts
│       │   └── redis.ts
│       ├── routes/
│       │   └── index.ts
│       ├── middleware/
│       │   └── errorHandler.ts
│       ├── models/
│       ├── controllers/
│       ├── services/
│       └── utils/
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── public/
│   └── src/
│       └── app/
│           ├── layout.tsx
│           ├── page.tsx
│           └── globals.css
├── admin-dashboard/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── public/
│   └── src/
│       └── app/
│           ├── layout.tsx
│           ├── page.tsx
│           └── globals.css
└── mobile-app/
    ├── package.json
    ├── tsconfig.json
    ├── app.json
    ├── babel.config.js
    ├── metro.config.js
    ├── index.js
    └── App.tsx
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Docker](https://www.docker.com/) & Docker Compose
- [React Native CLI](https://reactnative.dev/docs/environment-setup) & Android/iOS SDK (for mobile development)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Najam90340/Sahulat.git
cd Sahulat
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Start infrastructure (PostgreSQL + Redis)

```bash
docker-compose up -d
```

### 5. Run development servers

```bash
# Backend (http://localhost:5000)
npm run dev:backend

# Frontend (http://localhost:3000)
npm run dev:frontend

# Admin Dashboard (http://localhost:3001)
npm run dev:admin
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev:backend` | Start the backend in development mode |
| `npm run dev:frontend` | Start the frontend Next.js dev server |
| `npm run dev:admin` | Start the admin dashboard Next.js dev server |
| `npm run build:frontend` | Build the frontend for production |
| `npm run build:admin` | Build the admin dashboard for production |
| `npm run start:backend` | Start the backend in production mode |
| `npm run lint` | Lint all workspaces |
| `npm run test` | Run tests across all workspaces |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (via `pg`) |
| Cache | Redis (via `ioredis`) |
| Frontend | Next.js 14, React, TypeScript |
| Admin | Next.js 14, React, TypeScript |
| Mobile | React Native, TypeScript |
| Infrastructure | Docker, Docker Compose |