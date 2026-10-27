# Deployment Guide — Kurnool Fitness Centre

**Author**: Manoj Kumar (<123cs0023@iiitk.ac.in>)  
**Stack**: React (Vite/Tailwind) on Vercel · Express API on Render/Railway · PostgreSQL on Neon/Supabase

---

## 1. Cloud Architecture

```
┌─────────────────────────────────┐
│     Vercel (Frontend SPA)       │
│  Base URL: VITE_API_BASE_URL    │
└────────────────┬────────────────┘
                 │ HTTPS REST
                 ▼
┌─────────────────────────────────┐
│     Render (Node.js API)        │
│  Auto-Port, Dynamic CORS        │
└────────────────┬────────────────┘
                 │ Pooled SSL Connection
                 ▼
┌─────────────────────────────────┐
│     Neon / Supabase (Postgres)  │
│  Relational DB + Indexes        │
└─────────────────────────────────┘
```

---

## 2. Step 1: Database (Neon.tech or Supabase)

1. Sign up at [https://neon.tech](https://neon.tech) or [https://supabase.com](https://supabase.com) (free tier).
2. Create a project and retrieve your connection string:
   ```
   postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Open the **SQL Editor** in your database dashboard.
4. Paste and execute [`database/schema.sql`](database/schema.sql).
5. Paste and execute [`database/seed.demo.sql`](database/seed.demo.sql) to populate realistic demo members, timetables, and demo admin accounts.

---

## 3. Step 2: Backend (Render.com or Railway)

1. Push your repository to your personal GitHub account.
2. Sign in to [https://render.com](https://render.com) and click **New + -> Web Service**.
3. Connect your GitHub repository.
4. Configure service settings:
   - **Name**: `kurnool-fitness-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Configure Environment Variables (**Environment** tab):
   ```env
   NODE_ENV       = production
   DATABASE_URL   = <Your Neon/Supabase PostgreSQL connection string with sslmode=require>
   JWT_SECRET     = a_long_secure_random_key_min_32_characters_for_kfc
   JWT_EXPIRES_IN = 7d
   CORS_ORIGIN    = *
   ```
   *(Note: `PORT` is automatically assigned by Render, and `server.js` dynamically binds to `process.env.PORT`)*
6. Click **Deploy Web Service**.
7. Once deployment finishes, test the endpoint:
   ```
   https://kurnool-fitness-api.onrender.com/api/health
   ```
   Response should return:
   ```json
   {
     "success": true,
     "service": "Kurnool Fitness Centre Core API",
     "status": "healthy",
     "data": { "db": "connected" }
   }
   ```

---

## 4. Step 3: Frontend (Vercel)

1. Sign in to [https://vercel.com](https://vercel.com) and click **Add New... -> Project**.
2. Import the same GitHub repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
4. Configure Environment Variable:
   ```env
   VITE_API_BASE_URL = https://kurnool-fitness-api.onrender.com/api
   ```
5. Click **Deploy**. Vercel will build the frontend and serve it globally with SPA routing enabled via [`frontend/vercel.json`](frontend/vercel.json).

---

## 5. Demo Credentials for Evaluation

- **System Admin**: `admin@kurnoolfitness.com` / `Admin@123`
- **Member**: `member@kurnoolfitness.com` / `Member@123`

*(Both roles can be autofilled with 1 click on the `/login` screen)*
