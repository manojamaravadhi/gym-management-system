# 🏋️ Kurnool Fitness Centre — Full-Stack Gym Management & E-Commerce Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-68A063?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> **Engineered by:** **Manoj Kumar** (<123cs0023@iiitk.ac.in>)  
> **Portfolio Objective:** Full-Stack & Associate Product Engineer Portfolio (DeltaX)

---

## 📌 Executive Summary

**Kurnool Fitness Centre** is a production-grade, multi-tier gym operations, e-commerce, and facility scheduling platform engineered for the premier fitness hub in Kurnool, Andhra Pradesh. The platform solves high-concurrency booking bottlenecks, automates membership lifecycles with background cron workers, and provides executive-level analytical intelligence via advanced PostgreSQL window functions and time-series aggregation.

### Key Capabilities
- **Public Athlete Portal**: High-conversion landing page with modern emerald/mint SaaS aesthetics, plan subscriptions, supplements e-commerce store with persistent cart, trainer schedules, and member reviews.
- **Member Self-Service Dashboard**: Manage subscription status, view renewal dates, download tax invoices, track order history, and book sessions.
- **High-Concurrency Slot Booking Engine**: Pessimistic row-level locking (`FOR UPDATE`) within explicit database transactions (`BEGIN` ... `COMMIT` / `ROLLBACK`) preventing seat overbooking and race conditions.
- **Automated Background Maintenance**: Cron-driven worker executing daily at midnight to batch-transition expired memberships and log tamper-evident records to `audit_logs`.
- **Advanced Executive SQL Analytics**: Single-query computation of **Monthly Recurring Revenue (MRR)**, **Capacity Utilization Rate**, and **Retention/Churn Rates** using SQL Window Functions (`COUNT(*) OVER ()`).
- **Comprehensive Admin Dashboard**: Full CRUD over members, trainers, timetable slots, orders, inventory, and dynamic site copy.

---

## 🏛️ System Architecture

### Multi-Tier Architecture Diagram

```mermaid
graph TD
    Client["Client Browser / Mobile PWA (React 18 SPA)"]
    Proxy["Reverse Proxy / Edge CDN (Vercel / Nginx)"]
    API["Express REST API (Node.js 20)"]
    Worker["Background Cron Worker (node-cron)"]
    DB[("PostgreSQL Database (Neon / Supabase / Local)")]

    Client -->|HTTPS /api| Proxy
    Proxy -->|Load Balanced Traffic| API
    Worker -->|Scheduled Maintenance| DB
    API -->|Connection Pool (pg.Pool)| DB

    subgraph "Backend Services"
        API
        Worker
    end

    subgraph "Database Layer (PostgreSQL)"
        DB
        T1["timetable_slots (FOR UPDATE Locking)"]
        T2["memberships (State Machine)"]
        T3["audit_logs (Immutable Audit Trail)"]
        T4["orders & order_items"]
    end
```

### Relational Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o{ MEMBERS : "authenticates"
    MEMBERS ||--o{ MEMBERSHIPS : "subscribes"
    MEMBERSHIP_PLANS ||--o{ MEMBERSHIPS : "defines"
    MEMBERS ||--o{ PAYMENTS : "remits"
    MEMBERSHIPS ||--o{ PAYMENTS : "settles"
    TRAINERS ||--o{ TIMETABLE_SLOTS : "conducts"
    SERVICES ||--o{ TIMETABLE_SLOTS : "categorizes"
    TIMETABLE_SLOTS ||--o{ APPOINTMENTS : "allocates"
    MEMBERS ||--o{ APPOINTMENTS : "books"
    PRODUCT_CATEGORIES ||--o{ PRODUCTS : "groups"
    ORDERS ||--o{ ORDER_ITEMS : "contains"
    PRODUCTS ||--o{ ORDER_ITEMS : "fulfills"
    MEMBERS ||--o{ ORDERS : "places"
    AUDIT_LOGS {
        int id PK
        string event_type
        text description
        jsonb metadata
        timestamp created_at
    }
    TIMETABLE_SLOTS {
        int id PK
        int trainer_id FK
        date slot_date
        time start_time
        int capacity
        int booked_count
    }
```

---

## ⚡ Concurrency Control & Transaction Isolation

### The Problem
During peak registration hours (e.g., class releases or promotional sales), hundreds of members concurrently request limited trainer or session seats. Standard read-then-write logic creates a classic **Time-of-Check to Time-of-Use (TOCTOU)** race condition, resulting in negative capacity and overbooked facilities.

### The Solution: Row-Level Locking (`FOR UPDATE`)
Kurnool Fitness Centre wraps session reservations in an explicit PostgreSQL transaction block with pessimistic concurrency control:

```sql
-- 1. Acquire transaction boundary
BEGIN;

-- 2. Acquire exclusive pessimistic row-level lock on the specific slot
SELECT id, capacity, booked_count, is_active
FROM timetable_slots
WHERE id = $1
FOR UPDATE;

-- 3. Application enforces constraint: (booked_count < capacity)
-- If full: ROLLBACK; throw 409 Conflict

-- 4. Atomic seat increment
UPDATE timetable_slots
SET booked_count = booked_count + 1, updated_at = NOW()
WHERE id = $1;

-- 5. Atomic appointment record creation
INSERT INTO appointments (slot_id, member_id, ...) VALUES ($1, $2, ...);

-- 6. Atomically persist changes and release row lock
COMMIT;
```

**Guarantees**:
- **Isolation Level**: Read Committed with explicit Row-Level Locks (`FOR UPDATE`) guarantees serializable execution of concurrent slot updates without deadlock overhead.
- **Atomicity**: If appointment creation fails or connection drops, the lock is released and the counter is automatically rolled back.

---

## ⏰ Background Worker & Automated Status Scheduler

### Midnight Membership Expiration Job
Implemented with `node-cron` in [`backend/jobs/membershipExpiryJob.js`](backend/jobs/membershipExpiryJob.js):
1. **Detection**: Selects all subscriptions where `end_date < CURRENT_DATE` and `status = 'active'`.
2. **Batched State Transition**: Updates matching rows to `status = 'expired'` in a single atomic transaction.
3. **Profile Cascading**: Checks if the member has any other active plans; if none remain, marks the member profile as `expired`.
4. **Audit Logging**: Inserts an immutable structured JSON entry into `audit_logs` detailing timestamp, affected counts, and record IDs.

### Manual Worker Execution Endpoint
- `POST /api/admin/jobs/trigger-expiry-check`: Protected by JWT role verification (`admin`). Evaluators can trigger the job on-demand directly from the **Admin Dashboard** action bar.
- `GET /api/admin/jobs/audit-logs`: Retrieves system maintenance history.

---

## 📊 Advanced SQL Analytics & Dashboard Window Functions

Kurnool Fitness Centre replaces client-side filtering with server-side database aggregations in [`backend/controllers/dashboardController.js`](backend/controllers/dashboardController.js):

### 1. Monthly Recurring Revenue (MRR)
Normalized subscription revenue across multi-month plans in active status:
```sql
SELECT 
  COALESCE(ROUND(SUM(mp.price / GREATEST(mp.duration_months, 1)), 2), 0)::float AS mrr,
  COUNT(m.id)::int AS active_subscriptions
FROM memberships m
JOIN membership_plans mp ON mp.id = m.plan_id
WHERE m.status = 'active' AND m.end_date >= CURRENT_DATE;
```

### 2. Time-Series 6-Month Sales Trend
Uses PostgreSQL's native `generate_series` function to prevent gaps when no sales occurred:
```sql
SELECT 
  to_char(date_trunc('month', d.month), 'Mon YYYY') AS month_label,
  COALESCE(SUM(p.amount), 0)::float AS revenue,
  COUNT(p.id)::int AS transaction_count
FROM generate_series(
  date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
  date_trunc('month', CURRENT_DATE),
  '1 month'
) AS d(month)
LEFT JOIN payments p ON date_trunc('month', COALESCE(p.paid_at::timestamptz, p.created_at)) = d.month
  AND p.status = 'paid'
GROUP BY d.month
ORDER BY d.month ASC;
```

### 3. Member Retention & Churn (Window Function)
Evaluates pool retention against churned cohorts in a single efficient query scan:
```sql
WITH member_cohorts AS (
  SELECT 
    id,
    status,
    COUNT(*) OVER () AS total_pool,
    COUNT(CASE WHEN status = 'active' THEN 1 END) OVER () AS active_pool,
    COUNT(CASE WHEN status IN ('expired', 'cancelled') THEN 1 END) OVER () AS churned_pool
  FROM members
)
SELECT 
  COALESCE(MAX(total_pool), 0)::int AS total_members,
  COALESCE(MAX(active_pool), 0)::int AS active_members,
  COALESCE(MAX(churned_pool), 0)::int AS churned_members,
  CASE 
    WHEN COALESCE(MAX(total_pool), 0) > 0 
    THEN ROUND((MAX(active_pool)::numeric / MAX(total_pool)::numeric) * 100, 2)::float
    ELSE 0.0 
  END AS retention_rate_pct,
  CASE 
    WHEN COALESCE(MAX(total_pool), 0) > 0 
    THEN ROUND((MAX(churned_pool)::numeric / MAX(total_pool)::numeric) * 100, 2)::float
    ELSE 0.0 
  END AS churn_rate_pct
FROM member_cohorts;
```

---

## 🔑 Demo Evaluator Credentials

The login screen features **1-Click Auto-Fill buttons** for rapid evaluation:

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **System Admin** | `admin@kurnoolfitness.com` | `Admin@123` | Full Admin Dashboard, Job Trigger, Analytics, CRUD |
| **Active Member** | `member@kurnoolfitness.com` | `Member@123` | Member Portal, Active Subscriptions, Store Cart |

- **Admin Portal**: `/admin/login` (or `/login` with auto-fill)
- **Member Portal**: `/login`

---

## 🚀 Local Development Quickstart

### Method 1: Docker Compose (All-in-One Stack)
Runs PostgreSQL 16, Express API, and React frontend with Nginx proxy:
```bash
# Clone and enter directory
cd gym-management-system

# Build and start services
docker compose up --build
```
- Frontend: `http://localhost:8090`
- Core API Health: `http://localhost:5001/api/health`
- PostgreSQL: `localhost:5432`

---

### Method 2: Direct Node.js & Local PostgreSQL

#### Prerequisites
- Node.js ≥ 20
- npm ≥ 9
- PostgreSQL ≥ 14

#### 1. Setup Database
```bash
createdb gym_management
psql -d gym_management -f database/schema.sql
psql -d gym_management -f database/seed.demo.sql
```

#### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL, then start:
npm run dev
```

#### 3. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## ☁️ Production Cloud Deployment Guide

The platform is optimized for zero-cost production hosting on modern serverless/managed platforms:

```
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│     Vercel (Frontend)   │ ----> │    Render (Backend API) │ ----> │  Neon/Supabase (Postgres)│
│  React 18 SPA + Vite    │       │  Node 20 Express Engine │       │  PostgreSQL 16 + Triggers│
└─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
```

### 1. Database Deployment (Neon.tech or Supabase)
1. Create a free project at [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy the pooled connection string (includes `sslmode=require`).
3. In the SQL Editor, execute `database/schema.sql`, then execute `database/seed.demo.sql`.

### 2. Backend Deployment (Render or Railway)
1. Create a new **Web Service** on [Render.com](https://render.com) connected to your repository.
2. Settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. Environment Variables:
   ```env
   NODE_ENV=production
   DATABASE_URL=postgresql://user:pass@ep-xxxx.neon.tech/neondb?sslmode=require
   JWT_SECRET=production_random_secret_at_least_32_characters
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=*
   ```
4. Note your Render URL: `https://kurnool-fitness-api.onrender.com`.

### 3. Frontend Deployment (Vercel)
1. Import repository on [Vercel](https://vercel.com).
2. Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
3. Environment Variables:
   ```env
   VITE_API_BASE_URL=https://kurnool-fitness-api.onrender.com/api
   ```
4. Deploy! Vercel serves the SPA using the rewrite rules defined in `vercel.json`.

---

## 📡 Core API Reference

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | System and DB pool connectivity check |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token |
| `POST` | `/api/auth/register` | Public | Member signup & automatic code generation |
| `GET` | `/api/appointments/slots` | Public | List available concurrency-tracked session slots |
| `POST` | `/api/appointments` | Public/Member | Reserve slot with row-level lock (`FOR UPDATE`) |
| `GET` | `/api/dashboard` | Admin | Compute MRR, utilization & windowed churn analytics |
| `POST` | `/api/admin/jobs/trigger-expiry-check` | Admin | Manually trigger membership status batch worker |
| `GET` | `/api/admin/jobs/audit-logs` | Admin | Inspect system maintenance audit logs |
| `GET` | `/api/members` | Admin | List & filter gym members |
| `GET` | `/api/plans` | Public | List active membership plans |
| `GET` | `/api/products` | Public | E-commerce catalog |
| `POST` | `/api/orders` | Member | Process e-commerce cart purchase |

---

## 👨‍💻 Author

**Manoj Kumar**  
- **Email**: [123cs0023@iiitk.ac.in](mailto:123cs0023@iiitk.ac.in)  
- **Role Target**: Associate Product Engineer / Backend Engineer (DeltaX)  
- **Codebase License**: [MIT License](LICENSE)
