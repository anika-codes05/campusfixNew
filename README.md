# CampusFix

Hyper-local campus issue reporting system for KIET Group of Institutions, Ghaziabad. Students pin an issue on a campus map (default center `28.7526, 77.4985`), attach a photo, describe it, and upvote related reports. The system detects nearby duplicate reports (same category within ~50m) so a repeated issue shows as one ticket with a rising upvote count. Admins track, prioritize, assign, and resolve everything from a management dashboard with live stats.

## Tech stack

- **Frontend** — React (Vite), `react-router-dom`, Tailwind CSS v4 (`@tailwindcss/vite`), React-Leaflet + Leaflet, `lucide-react`
- **Backend** — Node.js + Express, JWT auth, Multer photo uploads, Mongoose
- **Database** — MongoDB (Atlas or local) via `MONGO_URI`

## Project layout

```
campusfixNew/
├── backend/
│   ├── src/
│   │   ├── models/        User, Issue, Notification
│   │   ├── routes/        auth, issues, admin, notifications
│   │   ├── middleware/    auth (JWT), admin (guard), upload (multer)
│   │   ├── utils/         haversine (duplicate detection), seedAdmin
│   │   ├── app.js         express app (cors, json, static /uploads)
│   │   └── server.js      entry point
│   ├── uploads/           photo storage (auto-created)
│   └── .env.example
└── frontend/
    └── src/
        ├── api/           fetch wrapper + endpoints
        ├── components/    Navbar, map, cards, badges, tables, toasts…
        ├── context/       AuthContext, ToastContext
        └── pages/         Login, Register, StudentFeed, ReportIssue,
                           IssueDetail, MyIssues, AdminDashboard, NotFound
```

## Setup

### Prerequisites
- Node 18+
- A MongoDB database (Atlas free tier or local), and its connection string

### Backend

```bash
cd backend
npm install
cp .env.example .env   # then edit .env with real values
```

`.env` values (never commit this file):

```
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/campusfix
JWT_SECRET=some_long_random_string
PORT=5000

# Used only by the seed script to create the first admin account
ADMIN_NAME=Campus Admin
ADMIN_EMAIL=admin@kiet.edu
ADMIN_PASSWORD=changeme123
ADMIN_TEAM=general
```

Create the admin account (student accounts come from the register page; the
first admin must be seeded since self-service registration is student-only by
design):

```bash
npm run seed-admin
```

Start it:

```bash
npm start        # or: npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Vite proxies `/api` and `/uploads` to `http://localhost:5000`, so no CORS
config is needed during development.

## Features

### Students
- **Register / Login** — student-only self-service registration; login routes admins to the dashboard and students to the feed.
- **Feed** — card grid with status-count summary, filters (category, status, search by title/block), sorts (newest, most upvoted, priority, oldest), and a **List ↔ Map** toggle. Map pins are color-coded by status.
- **Report an issue** — click-to-pin map + block/room + title/description + category + optional photo with preview. A **duplicate check** runs first (same category within 50m via Haversine); when duplicates exist you get a "Is this the same issue?" screen to join an existing report (bumps its upvotes) or submit as genuinely new.
- **Upvote toggle** — two-way: upvoting again removes your upvote. Stay filled/outlined to match state.
- **Issue tracker** — each issue has a detail page with a **status timeline** (who changed what, when), comments, "follow updates", confirm-fixed feedback, and for admins a reopen action.
- **My Issues** — everything you reported or upvoted, filtered by status.
- **Notifications** — bell in the nav with an unread badge; status/priority/assignment changes and comments land here.

### Admins
- **Stats bar** — Reported / In Progress / Resolved / Total, live from the backend.
- **Analytics** — per-category breakdown and a 14-day reporting trend chart.
- **Overdue list** — issues stuck 3+ days.
- **Management table** — filterable/searchable/sortable; inline **status**, **priority**, and **assign-to-staff** controls (row-level loading, no optimistic updates), plus **bulk status/priority** actions and **CSV export**.
- **Admin map view** — same pins, with inline status change straight from the popup.
- **User management** — promote/demote roles, assign maintenance teams.
- Every status change is logged to the issue timeline and notifies affected users.

## API

```
POST   /api/auth/register                 { name, email, password } -> user + token (role always student)
POST   /api/auth/login                    { email, password } -> user + token
GET    /api/auth/me                       current user (auth)

GET    /api/issues                        ?category&status&priority&search&block&sort
GET    /api/issues/:id                    single issue (with timeline, comments, flags)
POST   /api/issues                        multipart: title, description, category, lat, lng,
                                          blockName, floorRoom?, photo?, joinExistingId?
POST   /api/issues/check-duplicate        { lat, lng, category } -> { hasDuplicates, matches }
POST   /api/issues/:id/upvote             toggle (auth)
POST   /api/issues/:id/comments           { text } (auth)
POST   /api/issues/:id/subscribe          (auth) — for future email/push
POST   /api/issues/:id/confirm-resolved   (auth, participants only)
POST   /api/issues/:id/reopen             admin
PATCH  /api/issues/:id/status             admin; sets/clears resolvedAt; logs timeline
PATCH  /api/issues/:id/priority           admin
PATCH  /api/issues/:id/assign             admin
POST   /api/issues/:id/notes              admin
DELETE /api/issues/:id                    admin or original reporter
GET    /api/issues/my-reports             (auth)

GET    /api/admin/stats                   admin
GET    /api/admin/trends?days=14          admin
GET    /api/admin/overdue?days=3          admin
GET    /api/admin/issues                  admin (management table)
GET    /api/admin/users                   admin
PATCH  /api/admin/users/:id/role          admin
PATCH  /api/admin/users/:id/team          admin
GET    /api/admin/export                  admin (CSV download)

GET    /api/notifications                 (auth)
PATCH  /api/notifications/:id/read        (auth)
POST   /api/notifications/read-all        (auth)
```

Auth uses `Authorization: Bearer <token>`. The JWT holds only the user id;
role comes from the login/register response body and is validated server-side
on every protected call (a student token cannot hit admin routes).

## Notes

- The `uploads/` folder must exist before Multer can write — it's created on
  startup and has a `.gitkeep`.
- Photo uploads are served from `/uploads/...` both directly by Express and
  through the Vite proxy.
- Admin accounts are created via `npm run seed-admin` (or directly in the DB),
  never through the register form.