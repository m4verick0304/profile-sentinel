
## Fake Profile Detection Platform — Frontend-First Build Plan

### Overview
A production-style, enterprise SaaS web platform for detecting fake social media profiles. Built with React + TypeScript + Tailwind CSS, connected to a Supabase backend for auth, database, and edge functions. The UI will support both light and dark mode with a clean, minimal, "security tech" aesthetic.

---

### 1. Design System & Theme
- **Color palette**: Slate/neutral grays as base, indigo/violet as primary accent, red for "Fake", amber for "Suspicious", green for "Real"
- **Dark/light toggle** in the top nav
- Consistent typography, spacing, and component styles across all pages
- All animations: subtle fade-ins and loading states — no flashy effects

---

### 2. Landing Page (`/`)
A public-facing homepage that sells the product:
- **Hero section**: Headline, subheadline, and a primary CTA ("Try Free Analysis")
- **Features section**: 3–4 cards highlighting AI detection, instant results, admin insights, and scalability
- **How it works**: 3-step visual (Submit → Analyze → Get Results)
- **Stats bar**: Mock numbers (e.g., "200K+ profiles scanned", "94% accuracy")
- **Footer** with nav links

---

### 3. Auth Pages (`/login`, `/signup`)
- Clean, centered card layout
- Email + password fields with validation (Zod)
- Toggle between Login and Signup
- Supabase Auth integration (email/password)
- Role-based redirect: regular users go to `/dashboard`, admins go to `/admin`

---

### 4. Analysis Dashboard (`/dashboard`)
The core user-facing experience:

**Profile Submission Form**
- Fields: Username, Account Age (days), Posts Count, Followers, Following, Bio Length, and optional Username Flags (checkboxes for numbers-heavy, no profile pic, etc.)
- "Analyze Profile" button

**Animated Loading State**
- 2–3 second progress animation with "Analyzing profile data..." message and a pulsing indicator

**Results Panel** (appears after analysis)
- **Risk Score**: Large circular or linear progress bar (0–100), color-coded by severity
- **Status Badge**: `REAL` (green), `SUSPICIOUS` (amber), or `FAKE` (red) — prominent, pill-shaped
- **Explanation Cards**: 3–4 cards showing the top contributing factors (e.g., "Follower/Following ratio is abnormally high", "Account age is very short")
- **Action buttons**: "Analyze Another" and "View in History"

**Recent Scans sidebar/section**: A compact list of the user's past 5 analyses

---

### 5. Admin Panel (`/admin`) — Role-Protected
Only accessible to users with the `admin` role:

**Stats Cards Row**
- Total Scans, Fake Detected, Suspicious Flagged, Accuracy Estimate

**Charts Section** (using Recharts)
- Bar chart: Daily scans over the past 7 days
- Pie/donut chart: Risk distribution (Real / Suspicious / Fake)

**Flagged Profiles Table**
- Columns: Username, Risk Score, Label, Date, Analyzed By
- Filter tabs: All | High Risk | Recent
- Sortable columns
- Row click to expand and see full explanation

---

### 6. Supabase Backend

**Database tables:**
- `profiles` (user profiles)
- `user_roles` (admin/user roles — separate table for security)
- `analysis_results` (all scan records: input features + output scores + labels + explanations)

**Edge Function: `analyze-profile`**
- Accepts profile feature inputs
- Runs a deterministic mock ML scoring algorithm (weighted formula simulating a real model)
- Returns: `risk_score`, `label`, `top_factors[]`
- Logs result to `analysis_results` table

**Row-Level Security:**
- Users can only read their own analysis results
- Admins can read all results (enforced via `has_role()` function)

---

### 7. UX Polish
- Toast notifications (Sonner) for success, errors, and warnings
- Full loading and error states on all data-fetching operations
- Fully responsive — mobile-first layout
- Protected routes (redirect to login if unauthenticated)
- Admin-only route guard (redirect non-admins to dashboard)

---

### Build Order
1. Design system + theme + dark mode toggle
2. Landing page
3. Auth pages + Supabase auth
4. Database schema + RLS + roles
5. Analysis dashboard + edge function (mock ML)
6. Admin panel + charts
7. Polish: toasts, loading/error states, mobile responsiveness
