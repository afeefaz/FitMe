# FitMe — Agent Memory & Project Guide

## Project Overview
FitMe is a mobile-first PWA for personal trainers and their clients. Built with Next.js 14 App Router, Supabase, and Tailwind CSS v4 (CSS-first). Two roles: **coach** and **trainee**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2.35, App Router, TypeScript, `src/` dir, `standalone` output |
| Styling | Tailwind CSS v4.2.2, CSS-first `@theme` (no tailwind.config.ts) |
| Database | Supabase Docker (local), PostgreSQL |
| Auth | Supabase Auth (email/password) |
| State | Zustand (notification store) |
| Testing | Playwright (e2e/smoke.spec.ts) |
| PWA | next-pwa, public/sw.js |

---

## Local Dev Setup

```bash
cd fitme
npx supabase start           # Start local Supabase (Docker required)
npm run dev                  # Dev server on :3000
npm run build                # Production build check
```

**Supabase endpoints:**
- API: http://127.0.0.1:54321
- DB: port 54322
- Studio: http://127.0.0.1:54323

**Auth keys (local only):**
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`
- `SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz`

**Test accounts (re-create after `db reset`):**
- Coach: `afeef.az11@gmail.com` / `Afeef12345` → UUID `c8c83ca5-c949-436e-9e64-ab06399af3c9`
- Trainee: `test@client.com` / `Test12345` → UUID `aefd0e98-aacd-4afa-8c37-208b9cf5e31b`

---

## Design System

**Colors:** bg `#121212`, surface `#1E1E1E`, lime `#CCFF00`, amber `#F59E0B`, red `#EF4444`  
**Radius:** `--radius-clay: 20px`, `--radius-clay-lg: 28px`  
**Shadows:** `--shadow-clay`, `--shadow-clay-sm`, `--shadow-clay-lime`  
**CSS classes:** `.card-clay`, `.btn-tap`, `.pb-safe-nav`  
**Animations:** `--animate-slide-up`, `--animate-fade-in`, `--animate-scale-in`  
**Font:** Space Grotesk (Google Fonts)

---

## Database Schema (Migrations order)

1. `00001_initial.sql` — users, clients, plans, plan_exercises, workout_logs, exercise_cache
2. `00002_rls.sql` — Row Level Security on all tables
3. `00003_notifications.sql` — Realtime notification support
4. `00004_weekly_plans_and_profiles.sql` — plan_days, water_logs, user profile fields

### Key Tables

**`users`** — profile data
```sql
id UUID PK, full_name TEXT, email TEXT, role TEXT CHECK('coach','trainee'),
height_cm NUMERIC(5,1), weight_kg NUMERIC(5,1), date_of_birth DATE
```

**`clients`** — coach↔trainee link
```sql
id UUID PK, coach_id UUID→users, trainee_id UUID→users, status TEXT
-- status: 'needs_plan' | 'active'
```

**`plans`** — workout programs
```sql
id UUID PK, client_id UUID→clients, name TEXT, is_draft BOOLEAN DEFAULT false
```

**`plan_days`** — days within a plan (up to 7)
```sql
id UUID PK, plan_id UUID→plans CASCADE, day_number INT CHECK(1-7), day_name TEXT,
UNIQUE(plan_id, day_number)
```

**`plan_exercises`** — exercises per day
```sql
id UUID PK, plan_id UUID→plans, plan_day_id UUID→plan_days CASCADE,
exercise_id TEXT, exercise_name TEXT, gif_url TEXT, target_muscles TEXT[],
muscle_group TEXT, sets INT, reps INT, rest_seconds INT, order_index INT
```

**`workout_logs`** — trainee exercise logs
```sql
id UUID PK, trainee_id UUID→users, plan_id UUID→plans, exercise_id TEXT,
exercise_name TEXT, sets_completed INT, reps_completed INT, logged_at TIMESTAMPTZ
```

**`water_logs`** — daily hydration
```sql
id UUID PK, user_id UUID→users CASCADE, amount_ml INT CHECK(>0),
logged_at TIMESTAMPTZ, logged_date DATE DEFAULT CURRENT_DATE
```

---

## App Structure

```
src/
├── app/
│   ├── coach/
│   │   ├── dashboard/page.tsx          — coach home
│   │   ├── clients/page.tsx            — client list
│   │   ├── clients/[id]/plan/page.tsx  — plan builder + client stats tabs
│   │   ├── profile/page.tsx            — coach profile
│   │   └── layout.tsx                  — coach nav + realtime dot
│   ├── trainee/
│   │   ├── today/page.tsx              — weekly workout view
│   │   ├── workouts/page.tsx           — workout history
│   │   ├── profile/page.tsx            — trainee profile
│   │   └── layout.tsx                  — trainee nav (3 tabs)
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── globals.css                     — Tailwind @theme + clay design tokens
│   └── layout.tsx                      — root HTML
├── components/
│   ├── coach/
│   │   ├── PlanBuilder.tsx             — multi-day plan builder (weekly)
│   │   ├── ExerciseSearch.tsx          — muscle group search + detail modal
│   │   ├── ExerciseCard.tsx            — search result card (tap thumbnail for gif)
│   │   ├── PlanExerciseList.tsx        — edit exercises in a day (tap name for gif)
│   │   ├── ClientStats.tsx             — per-client workout/BMI/water stats
│   │   ├── ClientsList.tsx / ClientRow.tsx / AddClientSheet.tsx
│   │   └── ExerciseCard.tsx
│   ├── trainee/
│   │   ├── WeeklyPlanView.tsx          — day pill selector + WorkoutDashboard
│   │   ├── WorkoutDashboard.tsx        — per-day progress + exercise cards
│   │   ├── WorkoutCard.tsx             — tap GIF to open detail modal
│   │   ├── LogSetSheet.tsx             — log a set bottom sheet
│   │   ├── WaterLogSheet.tsx           — water logging bottom sheet (presets + undo)
│   │   └── WorkoutHistory.tsx
│   └── ui/
│       ├── ExerciseDetailModal.tsx     — full-screen gif + muscles + instructions
│       ├── ProfileCard.tsx             — name/password/body stats/theme toggle
│       ├── TabWrapper.tsx              — client tab switcher
│       ├── Button.tsx / Badge.tsx / BottomNav.tsx
│       ├── RestTimer.tsx / SkeletonCard.tsx
│       └── LogSetSheet.tsx
├── lib/
│   ├── supabase/{client,server,admin}.ts
│   ├── types.ts                        — shared TypeScript interfaces
│   └── exercises.ts                    — MUSCLE_GROUP_MAP
├── hooks/
│   └── useRealtimeNotification.ts      — Zustand + Supabase Realtime
└── middleware.ts                       — auth guard + role routing
```

---

## Key Patterns

### Supabase queries (server components)
Always cast to `any` for nested selects pending proper type generation:
```ts
const result = await (supabase as any).from("tablename").select(`...`);
```

### MuscleGroup → ExerciseDB mapping
`src/lib/exercises.ts` exports `MUSCLE_GROUP_MAP`:
- chest → pectorals, back → lats, shoulders → deltoids
- legs → quads (+hamstrings, glutes, calves), arms → biceps (+triceps), core → abs

### Exercise API
`GET /api/exercises?muscle=<group>` — proxies ExerciseDB, cached in `exercise_cache` table for 7 days.

### Auth flow
- `/` redirects based on role → `/coach/dashboard` or `/trainee/today`
- Middleware in `src/middleware.ts` guards all routes
- Role stored in `users.role` and Supabase user metadata

---

## Features Implemented

- **Coach:** dashboard, add clients via invite code, plan builder (weekly multi-day), client stats tab (workouts/BMI/water/streak), realtime workout notification dot
- **Trainee — Navigation:** 4-tab bottom nav (Home / Plans / Activity / Profile)
- **Trainee — Home (`TraineeHome`):** greeting by time-of-day, today's plan card (taps → plan detail), today's activity stat pills (sets/calories/active-min/water), Start Workout button (→ `/trainee/workout`)
- **Trainee — Plans:** plans list page, plan detail (`PlanDetail`) with Overview / Exercises / History tabs, exercise GIF detail modal (tap thumbnail or name), sticky Start Workout button (→ `/trainee/workout`), locale-aware back button
- **Trainee — Workout (`/trainee/workout`):** `WeeklyPlanView` with day-pill selector + `WorkoutDashboard`; per-day progress + exercise cards with `−/+` steppers for sets & rest (local state, per-session), Log Set sheet, rest timer
- **Trainee — Activity:** weekly bar chart, MEASUREMENT section (4 arc-ring cards: Water / Active Min / Sets / Calories — water card tappable → `WaterLogSheet`), daily goal bars (sets + water), recent workout list
- **Trainee — History:** workout history list with set counts
- **Water Logging (`WaterLogSheet`):** bottom sheet with ☕150ml / 🥤250ml / 💧500ml / 🍶750ml presets + undo; progress bar toward 2000ml goal; triggered from Home water stat pill AND Activity water arc card; writes to `water_logs` table; `onSuccess(delta)` callback updates parent local state optimistically
- **Both:** exercise GIF detail modal, profile settings (name/password/body stats/BMI calc/theme toggle), password show/hide eye toggle on login + signup
- **Security:** Row Level Security on all tables, auth guards in middleware, `suppressHydrationWarning` on Dark Reader–affected elements

---

## Conventions

- All UI uses inline styles (no Tailwind classes in JSX except `.card-clay`, `.btn-tap`, `.pb-safe-nav`)
- CSS custom properties for all colors, use `var(--color-lime)` etc.
- `// eslint-disable-next-line @typescript-eslint/no-explicit-any` required before every `(supabase as any)` cast
- `export const dynamic = 'force-dynamic'` on all pages that read auth/user data
- Server components for data fetching, client components for interactivity

---

## Running Tests

```bash
# Ensure local Supabase + dev server are running
npx playwright test e2e/smoke.spec.ts
```
