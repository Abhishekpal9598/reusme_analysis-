# CareerAI — Phase 9: AI Career Intelligence & Personalized Recommendations
## Technical Implementation Plan

**Document Version:** 1.1.0  
**Phase:** 9 — AI Career Intelligence & Personalized Recommendations  
**Status:** Approved with Technical Conditions — Ready for Stage 1  
**Product Name:** CareerAI — AI Resume Analyzer & Job Match Platform  

---

## 1. Executive Summary & Architecture Context

CareerAI Phases 1 through 8 established:
- **Phase 1–3**: Foundation, authentication (HttpOnly JWT cookies), deterministic resume upload & ingestion (`Resume`).
- **Phase 4–5**: Server-side Gemini resume quality auditing with structured 5-dimension rubric (`ResumeAnalysis`).
- **Phase 6**: Bi-directional job-fit matching, skill gap discovery, and ATS alignment (`JobAnalysis`).
- **Phase 7**: AI Mock Interview simulator with dynamic question generation, real-time rubric answer evaluation, and final readiness report (`InterviewSession`).
- **Phase 8**: Full-lifecycle Job Application Tracker with Kanban/Table views, multi-currency compensation, interview scheduling, follow-up reminders, and timeline activity (`Application`).

**Phase 9 (AI Career Intelligence & Personalized Recommendations)** builds on top of these 5 foundational collections. It synthesizes an authenticated user's aggregate career data to compute an objective **Career Readiness Index (CRI)**, assemble a cross-application skill gap matrix, construct an interactive milestone-based learning roadmap, recommend adjacent/target career tracks, and track weekly momentum.

---

## 2. Mandatory Technical Requirements

### 2.1 Career Readiness Index (CRI)
- **Deterministic Server-Side Computation**: The CRI is calculated through a pure mathematical function. Identical inputs will strictly produce identical scores.
- **Score Range**: Integer between `0` and `100`.
- **Dimension Separation**: The composite score exposes 4 distinct dimension sub-scores:
  1. `resumeQuality`: Latest `ResumeAnalysis.overallScore` (Base weight: 25%).
  2. `jobDescriptionMatch`: Average `JobAnalysis.matchScore` across trailing analyzed jobs (Base weight: 30%).
  3. `interviewPerformance`: Average `InterviewSession.overallScore` across completed sessions (Base weight: 25%).
  4. `applicationPipeline`: Pipeline health score derived from active applications and scheduled interviews (Base weight: 20%).
- **Dynamic Reweighting for Cold-Start / Missing Data**:
  - Missing dimensions are dynamically excluded from the denominator.
  - *Example*: If a user has uploaded a resume (Score: 80) and matched a job (Score: 70) but completed 0 mock interviews and saved 0 applications:
    - Active weight sum: $0.25 + 0.30 = 0.55$.
    - Normalized weights: Resume = $0.25 / 0.55 \approx 45.45\%$; Job Match = $0.30 / 0.55 \approx 54.55\%$.
    - CRI = $(80 \times 0.4545) + (70 \times 0.5455) \approx 75$.
  - Missing dimensions are explicitly cataloged in `missingComponents` (e.g., `['Interview Simulator', 'Application Pipeline']`).
- **Zero Fabrication**: Scores are never synthesized out of thin air. If no resumes exist, `resumeQuality` is strictly marked missing.
- **Advisory Disclosure**: The payload and UI prominently disclose:
  > *"The Career Readiness Index is an assistive metric based on semantic profile alignment and does not constitute a guarantee of employment."*

### 2.2 Strict Data Grounding & Factual Fidelity
- **Data Boundary**: Input context is strictly restricted to records belonging to `req.user._id`:
  - `Resume` & `ResumeAnalysis`
  - `JobAnalysis`
  - `InterviewSession`
  - `Application`
- **Zero Hallucination / Fabrication Guarantee**:
  - The AI prompt and validation layers strictly prohibit fabricating qualifications, past employers, degrees, certifications, or achievement metrics.
  - Skill gaps must originate from actual missing skills identified in the user's `JobAnalysis` records.
  - Interview weaknesses must originate from actual low rubric evaluations in `InterviewSession`.
- **Visual & Semantic Attribution**:
  - User ground truth is tagged with `"source: 'resume'"` or `"source: 'user'"`.
  - Target market requirements are tagged with `"source: 'job_description'"`.
  - AI recommendations are clearly tagged with `"source: 'ai_recommendation'"`.

### 2.3 Prompt Injection Defense & Schema Validation
- **Untrusted Content Demarcation**: All user-supplied strings (resume text, job descriptions, notes) are treated as untrusted data and wrapped inside clearly delineated XML boundaries: `<candidate_data>...</candidate_data>`.
- **System Instruction Isolation**: System prompts explicitly command the model to ignore any instructions, prompts, or attempts to override evaluation criteria contained within the candidate data blocks.
- **Strict Output Validation (Zod)**: All AI responses are passed through `geminiCareerSynthesisSchema`. Any response containing unexpected types, missing required fields, or unparseable JSON is rejected immediately and routed to the deterministic fallback engine.

### 2.4 Career Profile Data Model (`server/src/models/CareerProfile.js`)
- **Single Profile Guarantee**: Exactly one `CareerProfile` document per user (`userId: { type: ObjectId, ref: 'User', required: true, unique: true, index: true }`).
- **Safe Upsert Operations**: Use atomic `findOneAndUpdate({ userId }, { $set: updateData }, { upsert: true, new: true, runValidators: true })` to prevent duplicate profile creation during concurrent requests.
- **Tenant Isolation**: Every database read and write explicitly filters by `{ userId: req.user._id }`.

### 2.5 Deterministic Fallback Engine
- **Failure Resilience**: If Google Gemini is unreachable, rate-limited, timed out (60s), or returns an unparseable response, the system seamlessly triggers `generateHeuristicCareerProfile(context)`.
- **Source Transparency**: The response includes `generationSource: 'ai'` or `generationSource: 'heuristic'`.
- **Zero Crashes**: Unhandled rejections during AI generation are caught and logged safely without crashing the Express server.
- **Secret Isolation**: Server logs never print API keys or JWT tokens; clients never receive credentials or raw stack traces.

### 2.6 Weekly Momentum Pulse
- **Ground Truth Activity Tracking**: Computes an activity delta over the trailing 7 days (`Date.now() - 7 * 24 * 60 * 60 * 1000`):
  - Resumes uploaded or audited in the last 7 days.
  - Job descriptions analyzed in the last 7 days.
  - Mock interview sessions completed in the last 7 days.
  - Applications updated or moved in the last 7 days.
  - Roadmap milestones completed in the last 7 days.
- **Realistic Momentum Status**: Categorized into `Accelerating` ($\ge 4$ events), `Steady` (1–3 events), or `Inactive` (0 events). Activity is never fabricated.

### 2.7 API Security & Hardening
- **Authentication**: `authMiddleware` applied to all `/api/v1/career-intelligence` endpoints.
- **Rate Limiting**: `aiRateLimiter` applied to `POST /api/v1/career-intelligence/generate` (max 30 requests per 5 minutes per user in non-test mode).
- **Concurrency & Re-trigger Guard**: Backend checks `lastGeneratedAt` and enforces a minimum 30-second cooldown between full AI syntheses to prevent accidental duplicate clicks.
- **Input Sanitization**: Request bodies for updating career preferences and toggling milestones are validated via Zod schemas. Mass assignment is disallowed.
- **Subdocument Security**: Toggling a milestone verifies that the `milestoneId` exists within the authenticated user's `CareerProfile.learningRoadmap`.

### 2.8 Performance Optimization
- **Parallel Context Aggregation**: Uses `Promise.all` to query `ResumeAnalysis`, `JobAnalysis`, `InterviewSession`, and `Application` concurrently.
- **Intelligent Caching**: `GET /api/v1/career-intelligence` serves the stored `CareerProfile` instantaneously ($< 50\text{ms}$). Full regeneration only occurs when the user explicitly triggers `POST /api/v1/career-intelligence/generate`.

---

## 3. Database Changes

### 3.1 New Collection: `careerprofiles` (`server/src/models/CareerProfile.js`)
No existing collections (`users`, `resumes`, `resumeanalyses`, `jobanalyses`, `interviewsessions`, `applications`) are altered or dropped.

```javascript
// CareerProfile Schema Outline
{
  userId: { type: ObjectId, ref: 'User', required: true, unique: true, index: true },
  targetPreferences: {
    desiredRole: { type: String, trim: true, default: '' },
    targetLevel: { type: String, enum: ['Junior', 'Mid', 'Senior', 'Lead'], default: 'Mid' },
    preferredIndustry: { type: String, trim: true, default: '' },
  },
  careerReadiness: {
    overallScore: { type: Number, min: 0, max: 100, default: 0 },
    tier: { type: String, enum: ['Needs Preparation', 'Emerging', 'Competitive', 'Highly Qualified'], default: 'Needs Preparation' },
    dimensionBreakdown: {
      resumeQuality: { score: Number, weight: Number, status: String },
      jobDescriptionMatch: { score: Number, weight: Number, status: String },
      interviewPerformance: { score: Number, weight: Number, status: String },
      applicationPipeline: { score: Number, weight: Number, status: String },
    },
    missingComponents: [String],
    disclaimer: { type: String, default: 'Advisory metric reflecting semantic profile alignment.' }
  },
  skillAnalysis: {
    masteredSkills: [{ skill: String, category: String, demandFrequency: Number, status: String }],
    criticalGaps: [{ skill: String, category: String, demandFrequency: Number, criticality: String, status: String, contextNote: String }],
    partialGaps: [{ skill: String, category: String, demandFrequency: Number, status: String }],
    totalAnalyzedJobs: { type: Number, default: 0 },
  },
  learningRoadmap: [{
    title: { type: String, required: true },
    targetSkill: { type: String, required: true },
    estimatedDuration: { type: String, default: '2-3 Weeks' },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'High' },
    objectives: [String],
    projectArchetype: {
      name: String,
      description: String,
      deliverables: [String],
    },
    verificationCriteria: String,
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  }],
  roleRecommendations: [{
    roleTitle: String,
    category: { type: String, enum: ['Target Role', 'Growth Role', 'Lateral Role'] },
    matchPercentage: Number,
    reasoning: String,
    transferableSkills: [String],
    skillGapsToAddress: [String],
  }],
  nextActions: [{
    actionType: { type: String, enum: ['RESUME_UPDATE', 'INTERVIEW_PRACTICE', 'APPLICATION_FOLLOWUP', 'SKILL_STUDY', 'JOB_MATCH'] },
    title: String,
    description: String,
    urgency: { type: String, enum: ['Immediate', 'This Week', 'Medium Term'] },
    targetRoute: String,
  }],
  weeklyMomentum: {
    startDate: Date,
    endDate: Date,
    resumesAudited: Number,
    jobsAnalyzed: Number,
    interviewsCompleted: Number,
    applicationsAdvanced: Number,
    milestonesCompleted: Number,
    momentumStatus: { type: String, enum: ['Accelerating', 'Steady', 'Inactive'] },
  },
  aiSynthesis: {
    executiveSummary: String,
    marketContext: String,
    generatedAt: Date,
    modelUsed: String,
    generationSource: { type: String, enum: ['ai', 'heuristic'], default: 'ai' },
  },
  lastGeneratedAt: { type: Date, default: null },
}
```

---

## 4. API Endpoints Specification

Mounted at `/api/v1/career-intelligence` with `authMiddleware`:

| Endpoint | Method | Middleware | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/career-intelligence` | `GET` | `authMiddleware` | Fetch user's profile and cached intelligence. Auto-initializes if empty. |
| `/api/v1/career-intelligence/generate` | `POST` | `authMiddleware`, `aiRateLimiter` | Trigger fresh AI intelligence synthesis using aggregated context. |
| `/api/v1/career-intelligence/readiness` | `GET` | `authMiddleware` | Return CRI score breakdown and missing data prompts. |
| `/api/v1/career-intelligence/skill-gap` | `GET` | `authMiddleware` | Return cross-application skill gap matrix. |
| `/api/v1/career-intelligence/roadmap` | `GET` | `authMiddleware` | Return personalized learning roadmap. |
| `/api/v1/career-intelligence/roadmap/:milestoneId/toggle` | `PATCH` | `authMiddleware` | Toggle roadmap milestone completion state. |
| `/api/v1/career-intelligence/roles` | `GET` | `authMiddleware` | Return recommended target and lateral career roles. |
| `/api/v1/career-intelligence/weekly-report` | `GET` | `authMiddleware` | Return 7-day activity delta and momentum status. |
| `/api/v1/career-intelligence/preferences` | `PUT` | `authMiddleware` | Update user's desired role, level, and industry preferences. |

---

## 5. Frontend Component Architecture

All UI components reside in `client/src/components/career-intelligence/` and adhere to CareerAI dark theme (`slate-950`/`slate-900`, `emerald-400`, `cyan-400`, `amber-400`, `rose-400`):

1. **`CareerIntelligencePage.jsx`** (`client/src/pages/CareerIntelligencePage.jsx`): Central page container with view tabs, manual refresh button, generation status banners, and preferences trigger.
2. **`ReadinessGauge.jsx`**: Visual circular SVG gauge displaying Career Readiness Index (0–100), competitive tier badge, and expandable 4-dimension breakdowns.
3. **`SkillGapMatrix.jsx`**: Three-panel card grid displaying Mastered Skills, Critical Deficits, and Partial Gaps with demand frequency counters.
4. **`LearningRoadmapTimeline.jsx`**: Step-by-step milestone timeline with duration, priority badges, project deliverables, and interactive checkboxes.
5. **`RoleRecommendationsCard.jsx`**: Cards comparing Target, Growth, and Lateral roles with feasibility percentages and transferable skill breakdowns.
6. **`NextActionsList.jsx`**: Top 3 prioritized tasks with direct navigation buttons to `/resumes`, `/interviews`, or `/applications`.
7. **`WeeklyMomentumReport.jsx`**: 7-day activity metrics card with velocity pulse.
8. **`PreferencesModal.jsx`**: Modal dialog allowing user to configure desired role, level, and industry.
9. **`SparseDataPrompt.jsx`**: Informative onboarding state for users with missing artifacts.
10. **`careerIntelligenceService.js`** (`client/src/services/careerIntelligenceService.js`): Client API service with structured error handling.

---

## 6. Implementation Stages & Execution Plan

### **Stage 0: Pre-Implementation Inspection & Plan Update** *(Current)*
- Inspect existing rate limiters, auth middleware, routes, and model indexes.
- Update `docs/PHASE_9_IMPLEMENTATION_PLAN.md` with all 8 mandatory technical requirements.
- Update artifact `implementation_plan.md`.
- Report findings and Stage 1 plan. Wait for approval.

### **Stage 1: Database Model & Validators**
- Create `server/src/models/CareerProfile.js` with unique `userId` index.
- Create `server/src/validators/careerIntelligenceValidators.js` with Zod request schemas, Gemini response schema, and pure deterministic CRI calculation function.
- Verify model compilation via unit tests.

### **Stage 2: Context Collection & AI/Fallback Service Layer**
- Create `server/src/services/careerIntelligenceService.js`.
- Implement `collectUserCareerContext(userId)` utilizing parallel `Promise.all` across models.
- Implement Gemini call with structured JSON schema and prompt injection defenses.
- Implement `generateHeuristicCareerProfile(context)` deterministic fallback engine.
- Implement mock hooks for testing (`setMockCareerIntelligenceGenerator`).

### **Stage 3: Controllers, Routes & Backend Testing Suite**
- Create `server/src/controllers/careerIntelligenceController.js`.
- Create `server/src/routes/careerIntelligence.routes.js`.
- Mount in `server/src/routes/index.js` under `/career-intelligence`.
- Create comprehensive test suite `server/tests/careerIntelligence.test.js` covering:
  - CRI deterministic scoring & cold-start reweighting.
  - Zod validation and malformed AI response handling.
  - Endpoints authentication, rate limiting, and IDOR isolation.
  - Heuristic fallback execution during simulated Gemini outages.
- Run Vitest: verify all 12 test suites pass.

### **Stage 4: Frontend Services & Modular Components**
- Create `client/src/services/careerIntelligenceService.js`.
- Create all 8 modular UI components in `client/src/components/career-intelligence/`.
- Create `client/src/pages/CareerIntelligencePage.jsx`.

### **Stage 5: Navigation, Routing & Dashboard Integration**
- Add `/career-intelligence` route in `client/src/App.jsx`.
- Add "Career Intelligence" nav item with `Sparkles` icon and update badge to "Phase 9" in `client/src/layouts/Navbar.jsx`.
- Add Career Intelligence summary card in `client/src/pages/DashboardPage.jsx`.
- Run Vite production build (`npm run build`) to ensure 0 errors.

### **Stage 6: Regression Verification & End-to-End Audit**
- Run complete backend Vitest suite (all 12 suites, 100% pass).
- Run full frontend production build.
- Perform live verification against running backend and MongoDB Atlas.
- Verify tenant isolation, cold-start handling, and heuristic fallback.
