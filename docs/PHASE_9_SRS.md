# CareerAI — Phase 9: AI Career Intelligence & Personalized Recommendations
## Software Requirements Specification (SRS)

**Document Version:** 1.0.0  
**Phase:** 9 — AI Career Intelligence & Personalized Recommendations  
**Status:** Approved for Architecture & Planning  
**Product Name:** CareerAI — AI Resume Analyzer & Job Match Platform  

---

## 1. Introduction & Purpose

### 1.1 Purpose
This Software Requirements Specification (SRS) specifies the exact functional and non-functional requirements for **Phase 9: AI Career Intelligence & Personalized Recommendations** within CareerAI. It acts as the definitive contract between product management, engineering, security, and quality assurance.

### 1.2 Scope
Phase 9 aggregates data across the authenticated user's resumes (`Resume`, `ResumeAnalysis`), analyzed jobs (`JobAnalysis`), mock interviews (`InterviewSession`), and tracked job applications (`Application`). It synthesizes this multi-dimensional dataset into an actionable intelligence suite, featuring a Career Readiness Index (CRI), an aggregate skill gap matrix, an interactive personalized learning roadmap, role feasibility recommendations, a weekly momentum report, and prioritized next actions.

---

## 2. Functional Requirements (FR)

### FR-1: User Profile & Target Preferences
- **FR-1.1**: The system shall permit authenticated users to inspect and update their career preferences, including target desired role (string, max 150 chars), seniority level (`Junior`, `Mid`, `Senior`, `Lead`), and preferred industry.
- **FR-1.2**: If the user has not explicitly configured preferences, the system shall infer reasonable defaults based on their most recent `JobAnalysis` or `InterviewSession` records.

### FR-2: Data Ingestion & Cross-Model Aggregation
- **FR-2.1**: The system shall aggregate data strictly scoped to `userId: req.user._id` from:
  1. `ResumeAnalysis`: latest overall score, dimension scores, and identified strengths/weaknesses.
  2. `JobAnalysis`: all target job titles, match scores, matched skills, missing skills, and skill gaps.
  3. `InterviewSession`: all completed sessions, overall scores, rubric scores, and identified priority improvements.
  4. `Application`: active pipeline status counts, interviews scheduled, reminders pending, and outcome conversion.
- **FR-2.2**: The system shall reject cross-tenant data inclusion under all circumstances.

### FR-3: Deterministic Career Readiness Index (CRI)
- **FR-3.1**: The system shall calculate the overall CRI deterministically on a scale of 0 to 100 using weighted rubric dimensions:
  - Resume Quality: 25%
  - Job Match Alignment: 30%
  - Interview Mastery: 25%
  - Application Pipeline Execution: 20%
- **FR-3.2**: When user artifacts are missing (e.g., zero completed interviews), the system shall dynamically reweight available components proportionally and record missing components in the response payload.
- **FR-3.3**: The CRI shall map to standard competitive tiers:
  - 85–100: *Highly Qualified*
  - 70–84: *Competitive*
  - 50–69: *Emerging*
  - 0–49: *Needs Preparation*

### FR-4: Cross-Application Skill Gap Aggregator
- **FR-4.1**: The system shall compile an aggregate list of unique skills across all `JobAnalysis` documents.
- **FR-4.2**: The system shall tally the frequency of each skill across target jobs.
- **FR-4.3**: The system shall partition skills into three disjoint categories:
  - *Mastered Skills*: Verified in user resumes.
  - *Critical Gaps*: Flagged as missing/unverified in 2 or more target jobs, or marked with high criticality.
  - *Partial Gaps*: Partially matched or secondary requirements.
- **FR-4.4**: For each gap, the system shall provide contextual demand frequency (e.g., "Demanded in 3 of 4 analyzed jobs").

### FR-5: Personalized Learning Roadmap & Progress Tracking
- **FR-5.1**: The system shall generate 3 to 5 milestone-based learning modules directly addressing the user's top critical skill gaps.
- **FR-5.2**: Each milestone shall include:
  - Title and target skill.
  - Estimated duration (weeks).
  - 2 to 4 concrete learning objectives.
  - Practical project archetype with defined deliverables.
  - Verification criterion.
- **FR-5.3**: The system shall allow users to toggle milestone completion status (`isCompleted`), recording `completedAt` timestamps.

### FR-6: Job Role Recommendations & Lateral Feasibility
- **FR-6.1**: The system shall evaluate candidate competencies against adjacent and progression career tracks.
- **FR-6.2**: The system shall return 3 to 5 recommended roles classified into:
  - *Target Roles* ($\ge 75\%$ match)
  - *Growth Roles* ($50\% - 74\%$ match)
  - *Lateral Roles* (high skill transferability)
- **FR-6.3**: Each role recommendation shall specify transferable strengths and specific gaps to bridge.

### FR-7: Weekly Momentum Pulse
- **FR-7.1**: The system shall compute a 7-day activity delta summarizing:
  - Resumes updated/audited.
  - Job descriptions evaluated.
  - Mock interview sessions completed.
  - Applications advanced in Kanban.
  - Roadmap milestones checked off.
- **FR-7.2**: The system shall classify velocity into *Accelerating*, *Steady*, or *Inactive*.

### FR-8: Prioritized Next Best Actions
- **FR-8.1**: The system shall generate 3 high-impact recommended actions based on the lowest scoring or most urgent dimensions.
- **FR-8.2**: Each action shall link directly to the corresponding application route (`/resumes`, `/interviews`, `/applications`, `/job-matches`).

---

## 3. Non-Functional Requirements (NFR)

### NFR-1: Performance & Latency
- **NFR-1.1**: Cached profile and dashboard retrieval (`GET /api/v1/career-intelligence`) must return in $< 250\text{ms}$ under normal load.
- **NFR-1.2**: On-demand AI synthesis (`POST /api/v1/career-intelligence/generate`) must complete in $< 15\text{s}$ using Gemini 2.5 Flash, or failover gracefully to the deterministic fallback engine if timeout occurs.

### NFR-2: Security & IDOR Prevention
- **NFR-2.1**: All API endpoints must enforce HTTP-only JWT cookie validation via `authMiddleware`.
- **NFR-2.2**: All database lookups and updates must be strictly bound to `req.user._id`.
- **NFR-2.3**: Gemini API keys must reside exclusively in backend environment variables and must never be transmitted to the client.

### NFR-3: Reliability & Fault Tolerance
- **NFR-3.1**: The system must operate without crashes even if Gemini is down, rate-limited, or unconfigured, utilizing the deterministic fallback synthesizer.
- **NFR-3.2**: All AI output must be validated against strict Zod schemas before being persisted or sent to the client.

### NFR-4: Usability & Graceful Degradation
- **NFR-4.1**: Sparse data states (Level 0 through Level 2) must render clean, supportive guidance cards rather than blank screens or error toasts.
- **NFR-4.2**: The UI must be fully responsive across mobile (375px+), tablet (768px+), and desktop (1024px+).

---

## 4. Data Dictionary & Validation Constraints

### Target Preferences Validation (Zod)
```typescript
{
  desiredRole: string.trim().max(150).optional(),
  targetLevel: enum(['Junior', 'Mid', 'Senior', 'Lead']).default('Mid'),
  preferredIndustry: string.trim().max(100).optional()
}
```

### Roadmap Milestone Toggle (Zod)
```typescript
{
  milestoneId: string.regex(/^[0-9a-fA-F]{24}$/)
}
```

---

## 5. Interface & UX Specifications

- **Page Route**: `/career-intelligence`
- **Navigation Placement**: Navbar (with `Sparkles` icon, Phase 9 badge) and quick-access card on Dashboard (`/dashboard`).
- **Color Theme**:
  - Primary Surface: Deep Slate (`bg-slate-950`, `bg-slate-900/80`)
  - Accent / AI Synthesis: Emerald (`text-emerald-400`, `border-emerald-500/30`) & Cyan (`text-cyan-400`)
  - Warning / Gaps: Rose (`text-rose-400`) & Amber (`text-amber-400`)
  - Badges: Consistent with CareerAI design system (`teal`, `blue`, `purple`, `rose`, `slate`).
