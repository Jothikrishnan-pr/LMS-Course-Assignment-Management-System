# LMS – Course & Assignment Management System

React.js · Node.js · Express.js · MongoDB. Roles: **Admin**, **Trainer**, **Student**.
All authorization is enforced on the **backend**; frontend route guards are only UX.

## 1. Setup

**Prerequisites:** Node 18+, MongoDB running locally (or use Docker below).

```bash
# Backend
cd backend
cp .env.example .env          # set JWT secrets for real use
npm install
npm run seed                  # demo users + sample course (optional)
npm run dev                   # http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api -> :5000)
```

**Docker (MongoDB + API + UI):** `docker compose up --build` → open http://localhost:8080, then
`docker compose exec backend node src/scripts/seed.js` to load demo data.

**Demo logins (after seeding):** `admin@lms.com / Admin@123` · `trainer@lms.com / Trainer@123` · `student@lms.com / Student@123`
Public registration (`/register`) always creates a **Student**. Admin creates Trainers/Admins from *Users*.

## 2. Architecture / folder structure

```
lms/
├── docker-compose.yml
├── backend/src/
│   ├── server.js            # bootstrap: DB connect, listen, graceful shutdown
│   ├── app.js               # express app: helmet, cors, rate limit, routes, error handler
│   ├── config/              # env.js (validated env), db.js
│   ├── models/              # User, Course, Enrollment, Assignment, Submission, RefreshToken, AuditLog
│   ├── routes/index.js      # all routes + middleware chain (auth -> role -> id check -> validation)
│   ├── controllers/         # request handlers (auth, users, courses, assignments, submissions, audit)
│   ├── services/access.js   # ownership / enrollment checks reused by controllers
│   ├── middleware/          # auth (authenticate/authorize), validate (zod + ObjectId), rateLimit, errorHandler
│   ├── validators/          # zod schemas
│   ├── utils/               # ApiError, asyncHandler, pagination, audit
│   └── scripts/seed.js
└── frontend/src/
    ├── api/                 # axios client (token refresh interceptor) + service functions
    ├── context/AuthContext  # auth state, login/register/logout, session restore
    ├── hooks/               # useFetch (loading/error/data), useAction (mutations)
    ├── components/          # Layout, ProtectedRoute (role aware), shared UI (Async, Pagination...), AssignmentForm
    └── pages/               # Login, Register, Dashboard, Courses, MyCourses, CourseDetail,
                             # Assignments, Submissions, ManageCourses (Trainer Dashboard), AdminUsers, AuditLog
```
Layering: `routes → middleware → controllers → services/models`. Errors are thrown as `ApiError` and converted to a uniform JSON response in one place.

## 3. API details

Base: `/api`. Success: `{ success: true, data, meta? }`. Error: `{ success: false, message, code, details? }`.
Lists accept `?page=&limit=` (max 100) and return `meta { page, limit, total, totalPages }`.

| Method & path | Roles | Notes |
|---|---|---|
| POST `/auth/register` | public | creates STUDENT |
| POST `/auth/login` | public | returns user, accessToken, refreshToken |
| POST `/auth/refresh` | public | rotates refresh token |
| POST `/auth/logout` | public | revokes refresh token |
| GET `/auth/me` | any | current user |
| GET/POST `/users`, PUT/DELETE `/users/:id` | Admin | `?q=&role=`; cannot demote/delete self |
| POST `/courses` | Trainer, Admin | Admin must pass `trainerId` |
| GET `/courses` | any | `?q=` search, `?mine=true` (trainer); students get `isEnrolled` |
| GET `/courses/mine` | any | enrolled (student) / owned (trainer) / all (admin) |
| GET `/courses/:id` | any | includes `enrolledCount` |
| PUT/DELETE `/courses/:id` | owner Trainer, Admin | 403 for another trainer's course; delete cascades |
| POST `/courses/:courseId/enroll` | Student | 409 if already enrolled |
| GET `/courses/:courseId/enrollments` | owner Trainer, Admin | |
| POST `/courses/:courseId/assignments` | owner Trainer, Admin | title, description, dueDate, maxMarks |
| GET `/courses/:courseId/assignments` | owner Trainer, Admin, enrolled Student | |
| GET `/assignments` | any | scoped to the user's courses; `?courseId=&q=` |
| GET/PUT/DELETE `/assignments/:id` | see above | PUT/DELETE: owner Trainer, Admin |
| POST `/assignments/:assignmentId/submit` | Student | must be enrolled, before due date, once only |
| GET `/assignments/:assignmentId/submissions` | owner Trainer, Admin | |
| GET `/submissions` | any | student: own only; trainer: own courses; `?status=&assignmentId=` |
| GET `/submissions/:id` | owner Student, owner Trainer, Admin | 403 for another student |
| PUT `/submissions/:id/evaluate` | owner Trainer, Admin | `marks`, `feedback`, `status` (SUBMITTED/EVALUATED) |
| GET `/audit` | Admin | activity history, `?action=` |

## 4. Database design (MongoDB / Mongoose)

- **User**: name, email (unique), password (bcrypt, `select:false`), role, isActive
- **Course**: title, description, trainer → User (indexed)
- **Enrollment**: student → User, course → Course · **unique index (student, course)**
- **Assignment**: course → Course (indexed), title, description, dueDate, maxMarks, createdBy
- **Submission**: assignment, course (denormalised for fast trainer queries), student, content, fileUrl, status (SUBMITTED|EVALUATED), marks, feedback, submittedAt, evaluatedAt, evaluatedBy · **unique index (assignment, student)**
- **RefreshToken**: user, tokenHash (SHA-256), expiresAt (TTL index auto-deletes)
- **AuditLog**: actor, action, entity, entityId, meta, createdAt

Relationships: User 1–N Course; User N–N Course via Enrollment; Course 1–N Assignment; Assignment 1–N Submission. Deleting a course/assignment cascades to dependents.

## 5. Authentication & authorization

- Login returns a short-lived **access JWT** (15m) and a **refresh JWT** (7d). Refresh tokens are stored hashed, **rotated on every use**, and reuse of an old token revokes all of that user's sessions. The frontend axios interceptor refreshes transparently (one shared in-flight refresh) and logs out if refresh fails.
- `authenticate` verifies the JWT and reloads the user from the DB each request, so deactivated/deleted users lose access immediately. Distinct codes: `NO_TOKEN`, `INVALID_TOKEN`, `TOKEN_EXPIRED`.
- `authorize(...roles)` guards routes by role; **ownership checks** (`services/access.js`) guard resources: course owner, enrolled student, own submission.
- Passwords hashed with bcrypt; login errors are generic (no user enumeration); public registration cannot choose a role.

## 6. Scenarios handled

| Scenario | Result |
|---|---|
| Enroll twice | 409 `ALREADY_ENROLLED` (pre-check + unique index for races) |
| Access another student's submission | 403 |
| Submit without enrollment | 403 `NOT_ENROLLED` |
| Trainer modifies another trainer's course | 403 `NOT_COURSE_OWNER` |
| Invalid course/assignment id | 400 `INVALID_ID` (malformed) / 404 (not found) |
| Submit after due date | 400 `DUE_DATE_PASSED` |
| Invalid marks (negative, non-number, > maxMarks) | 400 `VALIDATION_ERROR` / `INVALID_MARKS` |
| Missing/invalid/expired token | 401 `NO_TOKEN` / `INVALID_TOKEN` / `TOKEN_EXPIRED` |
| DB/validation/duplicate/unknown errors | central handler → 400/409/500 with safe messages |

## 7. Bonus features implemented

Pagination · Search/filtering · Request validation (zod) · Rate limiting (global + stricter on auth) · Refresh-token authentication · Activity/audit history · Docker setup.

## 8. Assumptions

- Self-registration creates Students only; Trainers/Admins are created by an Admin.
- Admin "manages all courses": may update/delete any course and create one on behalf of a trainer.
- One submission per student per assignment (no resubmission); late submissions are rejected.
- Evaluating sets marks/feedback/status; a trainer can re-evaluate later.
- Submission is text plus an optional URL (no file uploads).
- Deleting a course removes its assignments, submissions and enrollments.
- Tokens are kept in `localStorage` for simplicity (see production notes).

## 9. What changes for thousands of users in production?

- **Stateless horizontal scaling**: run multiple API instances behind a load balancer; keep sessions in JWT + DB (already stateless). Use a shared store (Redis) for rate limiting instead of in-memory.
- **Database**: MongoDB replica set (HA + read scaling), index review via `explain()`, keep list queries paginated (cursor-based for very large collections), consider sharding by course for huge growth; use transactions for multi-document operations if needed.
- **Caching**: Redis for hot reads (course catalogue, enrolment checks); HTTP caching/CDN for the static frontend.
- **Async work**: move notifications, audit writes and evaluations emails to a queue (BullMQ/SQS); add WebSocket/SSE for real-time notifications.
- **File uploads**: store submissions in S3-compatible storage with signed URLs and virus scanning rather than in the API server.
- **Security**: httpOnly + SameSite cookies for refresh tokens, secrets from a vault, HTTPS/HSTS, account lockout, stricter CORS, dependency scanning.
- **Observability**: structured logging (pino), request IDs, metrics (Prometheus), tracing, health/readiness probes, alerting.
- **Delivery**: CI/CD with automated unit/integration tests, Docker images, Kubernetes autoscaling, staged environments, DB backups and migrations.
- **Frontend**: code splitting, React Query/SWR for caching and request deduping, error boundaries.
