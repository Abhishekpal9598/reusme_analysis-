# CareerAI — AI Resume Analyzer & Job Match Platform

![Project Status: Phase 6 Job Matcher Complete](https://img.shields.io/badge/Status-Phase_6_Job_Matcher_Complete-emerald)
![Stack: MERN + Gemini](https://img.shields.io/badge/Stack-React%20%7C%20Vite%20%7C%20Express%20%7C%20MongoDB%20%7C%20Node%20%7C%20@google/genai-blue)
![Security: HttpOnly Cookie Auth + IDOR Safe + Anti-Prompt Injection](https://img.shields.io/badge/Security-HttpOnly_JWT_%7C_IDOR_Safe_%7C_Anti--Injection-green)
![Tests: 100% Passing](https://img.shields.io/badge/Tests-67%20Passed%20(100%25)-brightgreen)

> **Current Phase Status:**  
> **Phase 6 (Bi-Directional Job Description Matcher) is complete.**  
> Semantic skill gap analysis, 4-dimension alignment evaluation ($0.40 \times \text{Skills} + 0.30 \times \text{Experience} + 0.15 \times \text{Education} + 0.15 \times \text{Responsibility}$), structured Zod response validation, actionable resume tailoring recommendations, MongoDB persistence with match history, rate limiting (10 req/5 min), interactive Job Matcher UI, and 67 automated integration tests (100% passing) are fully functional and verified.

---

## 🚀 Product Overview

**CareerAI** is a production-oriented, full-stack, AI-powered career acceleration platform designed to empower job seekers in optimizing their application assets, evaluating alignment with target job descriptions, preparing for technical and behavioral interviews, and tracking job applications throughout their hiring lifecycle.

By combining deterministic document parsing (PDF, DOCX, TXT) with Google Gemini AI models and strict Zod schema validation, CareerAI transforms raw resumes into structured, actionable intelligence.

> [!NOTE]
> **Hiring Disclaimer:**  
> CareerAI's match scores and alignment metrics evaluate semantic keyword overlap, structural presentation, and competency relevance. **They do not guarantee interviews, employment offers, or hiring outcomes.**

---

## 📋 Prerequisites

- **Node.js:** `v20.0.0` or higher (LTS recommended, tested on Node v24)
- **npm:** `v10.0.0` or higher
- **MongoDB:** MongoDB Atlas cluster or local MongoDB instance (optional during local testing via in-memory mock engine)

---

## 🛠 Technology Stack

### Frontend (`/client`)
- **Framework & Build:** [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing:** [React Router v6](https://reactrouter.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + PostCSS + Autoprefixer
- **State Management:** React Context API (`AuthContext`) + Custom Hooks (`useAuth`)
- **Security:** Pure HttpOnly cookie credentials (`credentials: 'include'`), zero tokens in `localStorage`

### Backend (`/server`)
- **Runtime & Framework:** [Node.js](https://nodejs.org/) (ES Modules) + [Express.js](https://expressjs.com/) (v4.19+)
- **Database & ODM:** [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/) (v8.6+)
- **Authentication & Security:** `bcryptjs` (10 rounds), `jsonwebtoken`, `cookie-parser`, `helmet`, `cors`, `express-rate-limit`
- **Validation Engine:** [Zod](https://zod.dev/) (Request schemas & environment validation)
- **Testing:** `vitest` + `supertest` + `mongodb-memory-server`

---

## 📁 Repository Directory Structure

```
CareerAI/
├── client/                    # Frontend React + Vite SPA
│   ├── public/                # Static assets & favicons
│   ├── src/
│   │   ├── assets/
│   │   ├── components/        # Reusable UI components (Button, Card, Badge, Spinner)
│   │   ├── context/           # AuthContext (state management & session bootstrap)
│   │   ├── hooks/             # useAuth hook
│   │   ├── layouts/           # MainLayout, Navbar, Footer
│   │   ├── pages/             # Landing, Login, Register, Dashboard, NotFound
│   │   ├── services/          # api.js, authService.js
│   │   ├── utils/
│   │   ├── App.jsx            # Application Router definition
│   │   ├── main.jsx           # React DOM entry point
│   │   └── index.css          # Tailwind CSS directives
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                    # Backend Node.js + Express API
│   ├── src/
│   │   ├── config/            # env.js, db.js (Mongoose connection & lifecycle)
│   │   ├── controllers/       # authController.js
│   │   ├── middleware/        # authMiddleware.js, errorHandler.js, notFoundHandler.js, rateLimitMiddleware.js
│   │   ├── models/            # User, Resume, ResumeAnalysis, JobAnalysis, InterviewSession, Application
│   │   ├── routes/            # health.routes.js, auth.routes.js, index.js
│   │   ├── services/          # AI and parsing services (Planned)
│   │   ├── validators/        # authValidators.js (Zod schemas)
│   │   ├── utils/             # apiResponse.js, token.js
│   │   ├── app.js             # Express app instance & middleware pipeline
│   │   └── server.js          # HTTP server listener & graceful shutdown
│   ├── tests/                 # Vitest test suite
│   │   ├── auth.test.js       # Complete auth pipeline integration tests
│   │   ├── models.test.js     # Mongoose schema validation tests
│   │   ├── health.test.js     # Health endpoint assertions
│   │   ├── notFound.test.js   # 404 handler assertions
│   │   └── cors.test.js       # CORS and Helmet security tests
│   ├── package.json
│   └── .env.example           # Environment template
│
├── docs/                      # Architectural & Requirements Documentation
│   ├── PRD.md                 # Product Requirements Document
│   ├── TRD.md                 # Technical Requirements Document
│   ├── SRS.md                 # Software Requirements Specification
│   ├── APP_FLOW.md            # UX Architecture & Mermaid Flows
│   ├── DATABASE_SCHEMA.md     # MongoDB Collections & ER Diagram
│   ├── API_DOCUMENTATION.md   # REST API Contracts
│   └── IMPLEMENTATION_ROADMAP.md # 13-Phase Engineering Roadmap
│
├── .gitignore
├── package.json               # Root scripts
└── README.md
```

---

## ⚡ Quick Start & Development

### 1. Installation
Install all dependencies across backend and frontend with a single command:
```bash
npm run install:all
```

### 2. Environment Configuration
Copy the environment template in `/server`:
```bash
cp server/.env.example server/.env
```
Default configuration values in `server/.env`:
```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/careerai?retryWrites=true&w=majority
```
*(Note: Integration tests run automatically with an isolated in-memory MongoDB server and do not require external MongoDB credentials)*

### 3. Run Development Servers
Start backend API server (runs on `http://localhost:5000`):
```bash
npm run dev:server
```

Start frontend client (runs on `http://localhost:5173`):
```bash
npm run dev:client
```

---

## 🧪 Testing & Verification

Run the automated backend test suite:
```bash
npm test
```
*(Runs `vitest run --testTimeout 30000` in the server package)*

### Test Coverage Summary:
- ✅ **Job Description Matcher (Phase 6):** Structured `@google/genai` matching with mocked provider tests, deterministic weighted score formula computation ($0.40 \times \text{Skills} + 0.30 \times \text{Experience} + 0.15 \times \text{Education} + 0.15 \times \text{Responsibility}$), dimension bounds $[0, 100]$, input validation (max 20,000 chars), malformed JSON recovery (422), Zod validation error mapping (422), Gemini timeout mapping (504), rate limit mapping (429), unauthenticated rejection (401), cross-user IDOR protection (404), match history retrieval and owner deletion, and zero API key exposure in payloads.
- ✅ **AI Resume Quality Audit (Phase 5):** Structured `@google/genai` integration with mocked provider tests, deterministic weighted score formula computation, dimension bounds $[0, 100]$, malformed JSON recovery (422), Zod validation error mapping (422), Gemini timeout mapping (504), rate limit mapping (429), unconfigured key handling (503), unauthenticated rejection (401), cross-user IDOR protection (404), empty resume text handling (422), audit history isolation, and zero API key exposure in payloads.
- ✅ **Resume Ingestion & Parsing (Phase 4):** PDF parsing via `unpdf`, DOCX extraction via `mammoth`, TXT extraction, file size limits (5 MB), empty document detection (422), unauthenticated rejection (401), user-isolated resume listing, IDOR cross-user protection (404), and resume deletion.
- ✅ **Authentication (Phase 3):** Registration, password hashing, HttpOnly cookie issuance, duplicate email conflict (409), weak password validation (400), login verification, invalid credential rejection (401), session bootstrap (`/auth/me`), and cookie clearance on logout.
- ✅ **Mongoose Models:** Schema types, constraints, defaults, references, and password exclusion for `User`, `Resume`, `ResumeAnalysis`, `JobAnalysis`, `InterviewSession`, and `Application`.
- ✅ **API Health & Security:** Health status check (`GET /api/v1/health`), 404 handler, CORS origin rejection, Helmet headers.

### Frontend Production Build:
```bash
npm run build:client
```

---

## 🔌 API Endpoints

### Authentication & Health
| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register new user, hash password (bcrypt), set `token` HttpOnly cookie. |
| `POST` | `/api/v1/auth/login` | Public | Authenticate email/password, set `token` HttpOnly cookie. |
| `POST` | `/api/v1/auth/logout` | Public | Clear `token` cookie and invalidate session. |
| `GET` | `/api/v1/auth/me` | Protected | Return currently authenticated user profile from session cookie. |
| `GET` | `/api/v1/health` | Public | Operational health check. |

### Resume Management (Phase 4)
| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/resumes` | Protected | In-memory upload & parse (`.pdf`, `.docx`, `.txt`, max 5 MB). |
| `GET` | `/api/v1/resumes` | Protected | List paginated user resumes with metadata & section tags. |
| `GET` | `/api/v1/resumes/:id` | Protected | Retrieve single resume by ID (enforces ownership / IDOR safe). |
| `DELETE` | `/api/v1/resumes/:id` | Protected | Delete resume by ID (enforces ownership / IDOR safe). |

### AI Resume Quality Audit (Phase 5)
| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/resumes/:id/analyze` | Protected | Run AI resume quality audit via Gemini (rate limited: 10 req/5 min). |
| `GET` | `/api/v1/resumes/:id/analyses` | Protected | List all historical audit reports for a specific resume. |
| `GET` | `/api/v1/analyses/:id` | Protected | Fetch single detailed analysis report by ID (IDOR safe). |
| `GET` | `/api/v1/analyses` | Protected | List recent analyses for current authenticated user. |

### Job Description Matcher (Phase 6)
| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/job-matches` | Protected | Analyze match between resume and job description (Rate limited: 10 req/5 min). |
| `GET` | `/api/v1/job-matches` | Protected | List all historical job match reports for authenticated user. |
| `GET` | `/api/v1/job-matches/:id` | Protected | Get single job match report by ID (IDOR safe). |
| `DELETE` | `/api/v1/job-matches/:id` | Protected | Delete job match report by ID (IDOR safe). |

---

## 🛣️ Engineering Roadmap Progress

- [x] **Phase 0:** Requirements & Architecture Documentation
- [x] **Phase 1:** Architectural Review & Project Planning
- [x] **Phase 2:** Repository & Application Foundation
- [x] **Phase 3:** Database Connection & Authentication Engine *(Complete)*
- [x] **Phase 4:** Resume Multi-Format Ingestion & Parser *(Complete)*
- [x] **Phase 5:** Google Gemini AI Resume Quality Audit *(Complete)*
- [x] **Phase 6:** Bi-Directional Job Description Matcher *(Complete)*
- [ ] **Phase 7:** AI Mock Interview Simulator & Evaluator
- [ ] **Phase 8:** Job Application Pipeline Tracker
- [ ] **Phase 9:** Frontend Full-Stack Integration
- [ ] **Phase 10:** End-to-End Testing & Security Hardening
- [ ] **Phase 11:** Production CI/CD & Deployment
- [ ] **Phase 12:** Final Verification & Architecture Handover
