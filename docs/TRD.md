# CareerAI — Technical Requirements Document (TRD)

**Document Version:** 1.0.0  
**Status:** Approved Architecture Specification  
**Product Name:** CareerAI — AI Resume Analyzer & Job Match Platform  
**Author:** Full-Stack Engineering Lead & Technical Architect  
**Last Updated:** 2026-10-10  

---

## 1. System Architecture Overview

CareerAI is engineered as a decoupled, multi-tier client-server application optimized for security, developer ergonomics, and deterministic AI output handling.

```
+-------------------------------------------------------------------------------+
|                                CLIENT TIER                                    |
|   React (Vite) + Tailwind CSS + Lucide Icons + Axios / Fetch + React Router   |
+-------------------------------------------------------------------------------+
                                     |  HTTPS / JSON
                                     |  Credentials: "include" (HttpOnly Cookies)
                                     v
+-------------------------------------------------------------------------------+
|                           API GATEWAY / SERVER TIER                           |
|   Node.js (LTS v20+) + Express.js                                             |
|   - Security: Helmet, CORS allowlist, Express Rate Limit, Mongo Sanitize      |
|   - Middleware: Auth (JWT Verification), Request Validation (Zod), Multer     |
|   - Modules: Auth, User, Resume, AI Engine, JobMatch, Interview, Application  |
+-------------------------------------------------------------------------------+
                   |                                           |
                   | Mongoose (ODM)                            | Google Generative AI SDK
                   v                                           v
+------------------------------------+      +-----------------------------------+
|         PERSISTENCE TIER           |      |            AI SERVICE             |
|   MongoDB Atlas (v7.0+)            |      |   Google Gemini API               |
|   - User Data, Resumes, Analyses   |      |   - gemini-1.5-flash (Analysis)   |
|   - Indexed Schemas & Ownership    |      |   - Structured JSON + Zod Schema  |
+------------------------------------+      +-----------------------------------+
```

---

## 2. Technology Stack & Dependency Matrix

All library choices reflect actively maintained, stable ecosystem packages.

### 2.1 Frontend Stack
- **Framework & Build Tool:** React 18+ with Vite (ESNext build target)
- **Routing:** React Router v6
- **Styling:** Tailwind CSS + PostCSS + Autoprefixer
- **UI Components & Icons:** Lucide React, Headless UI / Radix primitives
- **HTTP Client:** Axios (configured with interceptors for credentials and CSRF)
- **State Management:** React Context API + Custom Hooks (lightweight, zero boilerplate for MVP)
- **Notifications & UI Polish:** Sonner or React Hot Toast

### 2.2 Backend Stack
- **Runtime Environment:** Node.js (v20 LTS or higher)
- **Web Framework:** Express.js (v4.19+)
- **Database Driver / ODM:** Mongoose (v8+)
- **Validation Engine:** Zod (v3.23+)
- **Authentication & Security:**
  - `jsonwebtoken` (JWT creation and signature verification)
  - `bcryptjs` (password hashing with 10 salt rounds)
  - `cookie-parser` (HttpOnly cookie parsing)
  - `helmet` (HTTP security headers)
  - `cors` (strict origin allowlisting)
  - `express-rate-limit` (DDoS and brute-force mitigation)
- **File Upload & Document Parsing:**
  - `multer` (in-memory buffer handling; no unverified disk writes)
  - `pdf-parse` (deterministic PDF text extraction)
  - `mammoth` (DOCX document structure & text extraction)
- **AI Integration:**
  - `@google/generative-ai` (Official Google Gemini SDK)

---

## 3. Frontend Architecture

### 3.1 Directory Structure Plan
```
client/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/         # Button, Input, Modal, Card, Badge, Skeleton, Alert
│   │   ├── layout/         # Navbar, Sidebar, Footer, PageContainer
│   │   ├── dashboard/      # StatCards, RecentActivity, QuickActions
│   │   ├── resume/         # FileUploader, ResumeViewer, ScoreGauge, SuggestionsList
│   │   ├── job-match/      # JobInputForm, MatchScoreCard, SkillGapBadges
│   │   ├── interview/      # QuestionCard, AnswerBox, FeedbackAccordion
│   │   └── tracker/        # ApplicationKanban, ApplicationModal, StatusDropdown
│   ├── context/
│   │   ├── AuthContext.jsx # Global user auth, login, logout, session check
│   │   └── ToastContext.jsx# Notification messaging
│   ├── hooks/
│   │   ├── useAuth.js      # Auth context consumer
│   │   ├── useResume.js    # Resume upload and state handling
│   │   └── useAsync.js     # Generic loading/error wrapper
│   ├── pages/
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── ResumesPage.jsx
│   │   ├── ResumeDetailPage.jsx
│   │   ├── JobMatchPage.jsx
│   │   ├── InterviewPrepPage.jsx
│   │   ├── ApplicationTrackerPage.jsx
│   │   ├── ProfilePage.jsx
│   │   └── NotFoundPage.jsx
│   ├── services/
│   │   ├── api.js          # Central Axios instance with interceptors
│   │   ├── authService.js
│   │   ├── resumeService.js
│   │   ├── jobService.js
│   │   ├── interviewService.js
│   │   └── trackerService.js
│   ├── utils/
│   │   ├── formatters.js   # Dates, score color mappers, truncate strings
│   │   └── validators.js   # Client-side input validation rules
│   ├── App.jsx             # Router definition and route guards
│   ├── index.css           # Tailwind base styles and custom utility classes
│   └── main.jsx            # Entry point
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

### 3.2 State Management & Network Strategy
- **Authentication State:** Centralized in `AuthContext`, automatically bootstrapped on application mount via `GET /api/v1/auth/me`.
- **API Communication:** Axios instance configured with `withCredentials: true` ensures HttpOnly JWT cookies are automatically attached without exposing tokens to `localStorage` (protecting against XSS token theft).
- **UI State Machine:** All async operations adopt a 4-phase state: `idle` | `loading` | `success` | `error`. Skeletons and spinners reflect active network requests.

---

## 4. Backend Architecture

### 4.1 Modular Directory Structure Plan
```
server/
├── src/
│   ├── config/
│   │   ├── db.js             # Mongoose connection with retry & pool config
│   │   ├── env.js            # Environment variable validation via Zod
│   │   └── ai.js             # Google Gemini client initialization
│   ├── constants/
│   │   ├── httpStatusCodes.js
│   │   └── errorCodes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── resumeController.js
│   │   ├── jobMatchController.js
│   │   ├── interviewController.js
│   │   ├── applicationController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT validation & user attachment
│   │   ├── validateMiddleware.js   # Zod request schema validator
│   │   ├── uploadMiddleware.js     # Multer memory storage & MIME guard
│   │   ├── rateLimitMiddleware.js  # Express rate limiting presets
│   │   └── errorHandler.js         # Centralized error formatter
│   ├── models/
│   │   ├── User.js
│   │   ├── Resume.js
│   │   ├── ResumeAnalysis.js
│   │   ├── JobAnalysis.js
│   │   ├── InterviewSession.js
│   │   └── Application.js
│   ├── routes/
│   │   ├── v1/
│   │   │   ├── authRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── resumeRoutes.js
│   │   │   ├── jobMatchRoutes.js
│   │   │   ├── interviewRoutes.js
│   │   │   ├── applicationRoutes.js
│   │   │   ├── dashboardRoutes.js
│   │   │   └── index.js
│   │   └── healthRoutes.js
│   ├── schemas/
│   │   ├── authSchemas.js          # Zod validation schemas
│   │   ├── resumeSchemas.js
│   │   ├── jobMatchSchemas.js
│   │   ├── interviewSchemas.js
│   │   └── aiResponseSchemas.js    # Strict Zod schemas for Gemini output
│   ├── services/
│   │   ├── parserService.js        # PDF, DOCX, TXT extraction engine
│   │   ├── geminiService.js        # Gemini prompt builder & JSON parser
│   │   ├── resumeAnalysisService.js
│   │   ├── jobMatchService.js
│   │   └── interviewService.js
│   ├── utils/
│   │   ├── apiResponse.js          # Standardized JSON response helper
│   │   ├── appError.js             # Custom Error class with HTTP status
│   │   └── logger.js               # Structured logging utility
│   ├── app.js                      # Express app setup and middleware pipeline
│   └── server.js                   # Server bootstrap & graceful shutdown
├── tests/
│   ├── unit/
│   └── integration/
├── .env.example
├── package.json
└── README.md
```

---

## 5. AI Service & Structured Output Architecture

### 5.1 Gemini Model Strategy
- **Official SDK:** `@google/genai` (Unified Google Gen AI SDK for Node.js 20+).
- **Primary Model:** `gemini-2.5-flash` for high throughput, low latency analysis, with configurable model identifier via `GEMINI_MODEL`.
- **Output Mode:** JSON Schema enforced via `generationConfig: { responseMimeType: 'application/json', responseSchema: ANALYSIS_JSON_SCHEMA }`.
- **Timeout & Rate Limits:** 30-second AbortSignal timeout and 10 requests per 5 minutes rate limiting.

### 5.2 Deterministic Server-Side Scoring Formula
The overall composite score is computed deterministically on the server from the 5 validated rubric dimensions:
$$\text{overallScore} = \text{round}(0.25 \times \text{impact} + 0.25 \times \text{skillsCoverage} + 0.20 \times \text{actionVerbs} + 0.15 \times \text{atsReadability} + 0.15 \times \text{brevity})$$

### 5.3 Anti-Prompt Injection & Factual Safety
- **Untrusted Input:** All uploaded resume text is treated strictly as untrusted data in user parts.
- **System Instructions:** Enforces prompt-injection resilience (ignoring override attempts, fake grading instructions).
- **Factual Fidelity:** Prohibits fabricating numbers, companies, or accomplishments; provides bracketed metric templates instead of false statistics.

### 5.2 Structured Output Validation Pipeline

```
+------------------+     +------------------------+     +------------------------+
|  User Input /    | --> |  Structured Prompt     | --> |  Google Gemini 1.5     |
|  Parsed Document |     |  System Instruction    |     |  (JSON Output Mode)    |
+------------------+     +------------------------+     +------------------------+
                                                                     |
                                                                     v Raw JSON String
                                                        +------------------------+
                                                        |  JSON.parse()          |
                                                        +------------------------+
                                                                     |
                                                                     v JS Object
                                                        +------------------------+
                                                        |  Zod Schema Validation |
                                                        |  (aiResponseSchemas)   |
                                                        +------------------------+
                                                          |                    |
                                            (Valid Schema)|                    |(Invalid Schema)
                                                          v                    v
                                                +------------------+  +------------------+
                                                | Save to MongoDB  |  | Log Parse Error  |
                                                | & Return to User |  | & Retry / Error  |
                                                +------------------+  +------------------+
```

### 5.3 Deterministic Schema Example (Zod Schema for Resume Analysis)
```javascript
// server/src/schemas/aiResponseSchemas.js
import { z } from 'zod';

export const ResumeAnalysisOutputSchema = z.object({
  overallScore: z.number().min(0).max(100),
  categoryScores: z.object({
    impactAndMetrics: z.number().min(0).max(100),
    brevityAndFormatting: z.number().min(0).max(100),
    actionVerbsAndStyle: z.number().min(0).max(100),
    skillsCoverage: z.number().min(0).max(100),
    atsReadability: z.number().min(0).max(100),
  }),
  summaryFeedback: z.string().min(10),
  bulletImprovements: z.array(
    z.object({
      originalBullet: z.string(),
      issueCritique: z.string(),
      recommendedRewrite: z.string(),
      impactExplanation: z.string(),
    })
  ).min(1),
  strengths: z.array(z.string()).min(1),
  weaknesses: z.array(z.string()).min(1),
  identifiedSkills: z.object({
    technical: z.array(z.string()),
    soft: z.array(z.string()),
    toolsAndFrameworks: z.array(z.string()),
  }),
});
```

---

## 6. Document Parsing Engine

### 6.1 Parsing Pipeline
1. **MIME & Buffer Inspection:** File is received in memory via Multer (`multer.memoryStorage()`, `5MB limit`).
2. **Format-Specific Extraction:**
   - **PDF:** Processed with `pdf-parse`. Text streams extracted page-by-page, stripping binary artifacts.
   - **DOCX:** Processed with `mammoth.extractRawText()`.
   - **TXT:** Direct UTF-8 buffer decoding.
3. **Section Detection & Normalization:** Regex heuristics categorize extracted text into core blocks:
   - Summary / Objective
   - Work Experience / History
   - Education
   - Technical & Professional Skills
   - Certifications & Projects

---

## 7. Security Architecture & Threat Model

| Vulnerability Vector | Defense Implementation |
|---|---|
| **Cross-Site Scripting (XSS)** | Tokens never stored in `localStorage`/`sessionStorage`. Cookies set to `HttpOnly; SameSite=Strict; Secure`. React auto-escapes HTML bindings. |
| **Cross-Site Request Forgery (CSRF)** | `SameSite=Strict` cookie policy, custom header verification (`X-Requested-With: XMLHttpRequest`), and CORS restricted to client origin. |
| **Insecure Direct Object References (IDOR)** | Every controller query enforces compound ownership predicates: `findOne({ _id: req.params.id, userId: req.user._id })`. |
| **Denial of Service / Brute Force** | Rate limiting tiers: Global (100 req/15 min), Auth (5 req/15 min), AI Generation (10 req/5 min). |
| **File Upload Exploits** | Files parsed purely in memory (no disk execution), strict MIME validation (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`), 5 MB cap. |
| **SQL/NoSQL Injection** | Mongoose schema enforcement and query parameter sanitization (`express-mongo-sanitize`). |
| **Secrets Leakage** | All environment variables loaded via server `.env` validated by Zod at startup. No sensitive keys prefixed with `VITE_` in frontend. |

---

## 8. Database Architecture & Connection Management

- **Database Engine:** MongoDB Atlas (v7.0+)
- **Connection Configuration:**
  - `maxPoolSize: 10`
  - `serverSelectionTimeoutMS: 5000`
  - `socketTimeoutMS: 45000`
  - Graceful reconnection and error event listeners.
- **Data Integrity & Cascading Operations:**
  - Account deletion initiates an atomic or sequential cascade removing all dependent documents across `resumes`, `resumeanalyses`, `jobanalyses`, `interviewsessions`, and `applications`.

---

## 9. Error Handling & Structured Logging

### 9.1 Standardized Error Envelope
All error responses conform strictly to the following JSON structure:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email or password format",
    "details": [
      {
        "field": "password",
        "issue": "Password must contain at least one uppercase letter and one number"
      }
    ]
  },
  "timestamp": "2026-10-10T21:45:00.000Z"
}
```

### 9.2 Centralized Error Handling Hierarchy
- `AppError`: Base custom error extending `Error`, encapsulating `statusCode`, `errorCode`, and `isOperational`.
- Global error handling middleware intercepts uncaught operational errors, logs stack traces in non-production environments, and yields sanitised responses to clients.

---

## 10. Environments & Deployment Architecture

### 10.1 Environment Strategy
| Setting | Local Development | Production |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| Frontend Server | Vite Dev Server (`http://localhost:5173`) | Static assets served via Vercel/Netlify or Nginx |
| Backend Server | Express on Node (`http://localhost:5000`) | Containerized Node.js (Render / Railway / AWS ECS) |
| Cookie `Secure` Flag | `false` (for localhost HTTP) | `true` (HTTPS mandatory) |
| CORS Origin | `http://localhost:5173` | `https://careerai.example.com` |

---

## 11. Testing Strategy

### 11.1 Unit & Integration Testing
- **Test Runner:** Jest or Vitest + Supertest for Express route integration testing.
- **Mocking Strategy:** `mongodb-memory-server` for isolated DB testing; mocked Google Gemini SDK for deterministic CI test runs.
- **Coverage Target:** $> 80\%$ statement coverage on authentication, parser, and controller layers.
