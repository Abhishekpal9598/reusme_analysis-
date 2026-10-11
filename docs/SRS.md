# CareerAI — Software Requirements Specification (SRS)

**Document Version:** 1.0.0  
**Status:** Approved Requirements Specification  
**Product Name:** CareerAI — AI Resume Analyzer & Job Match Platform  
**Author:** Lead Business Analyst & Software Architect  
**Last Updated:** 2026-10-10  

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) provides a comprehensive, rigorous specification of the functional, non-functional, interface, and behavioral requirements for **CareerAI**. It serves as the single source of truth for engineering, quality assurance, and architecture teams.

### 1.2 Scope
CareerAI is a web-based, AI-augmented career assistance platform. The platform enables users to securely upload and parse multi-format resumes, receive structured resume quality analyses, evaluate alignment against target job descriptions, generate tailored interview questions with AI answer evaluation, and track job applications across lifecycle stages.

### 1.3 Definitions, Acronyms, and Abbreviations
- **ATS:** Applicant Tracking System
- **IDOR:** Insecure Direct Object Reference
- **JWT:** JSON Web Token
- **MIME:** Multipurpose Internet Mail Extensions
- **NFR:** Non-Functional Requirement
- **FR:** Functional Requirement
- **STAR:** Situation, Task, Action, Result framework for behavioral interviews
- **WCAG:** Web Content Accessibility Guidelines

---

## 2. Overall System Description & Actors

### 2.1 System Context
CareerAI interacts with three external entities:
1. **Registered User / Job Seeker:** Uploads documents, triggers analyses, practices interviews, and manages application records.
2. **Google Gemini Generative AI Service:** Evaluates text semantic quality, computes match criteria, and generates interview questions/evaluations.
3. **MongoDB Atlas Managed Database:** Provides persistent, user-isolated document storage.

### 2.2 System Actors
- **Guest / Unauthenticated User:** Can view the landing page, product features, and sign-in / registration forms.
- **Authenticated User:** Can manage profile, upload resumes, execute analyses, run job matches, practice interviews, and manage applications.
- **System / Automated Worker:** Performs background validation, garbage collection, and token expiration checks.

---

## 3. Use Case Specifications & Critical User Flows

### UC-01: User Registration & Session Initialization
- **Primary Actor:** Unauthenticated User
- **Preconditions:** User is on the `/register` page and possesses a valid, unregistered email address.
- **Main Flow:**
  1. User submits name, email, and password.
  2. System validates input against Zod schema (valid email, password meeting strength criteria).
  3. System checks for email uniqueness in MongoDB.
  4. System hashes password using bcrypt (10 rounds).
  5. System persists new User document with timestamps.
  6. System issues a signed JWT token encapsulating `{ userId, email }`.
  7. System sets the JWT in an `HttpOnly`, `SameSite=Strict`, `Secure` (production) cookie.
  8. System responds with HTTP 201 and sanitized user profile payload (excluding password hash).
  9. Client updates `AuthContext` and redirects user to `/dashboard`.
- **Exception Flows:**
  - *E1 (Validation Failure):* Email format invalid or password weak $\to$ System returns HTTP 400 with specific field errors.
  - *E2 (Conflict):* Email already registered $\to$ System returns HTTP 409 Conflict ("Email already in use").
- **Expected Output:** Authenticated session established, user redirected to Dashboard.

### UC-02: Resume Upload and Multi-Format Parsing
- **Primary Actor:** Authenticated User
- **Preconditions:** User is logged in and navigates to `/resumes`.
- **Main Flow:**
  1. User selects or drags a resume file (`.pdf`, `.docx`, or `.txt`) under 5 MB.
  2. Client validates file type and size before sending `multipart/form-data` request to `POST /api/v1/resumes`.
  3. Server Multer middleware reads file buffer in memory and verifies MIME type.
  4. Parser service selects extraction engine:
     - PDF $\to$ `pdf-parse`
     - DOCX $\to$ `mammoth`
     - TXT $\to$ UTF-8 decoding
  5. Parser extracts plain text and detects sections (`Summary`, `Experience`, `Education`, `Skills`, `Projects`).
  6. Server creates a `Resume` document in MongoDB with `userId` ownership.
  7. Server returns HTTP 201 with parsed resume metadata and preview.
- **Exception Flows:**
  - *E1 (File Size Exceeded):* File $> 5\text{ MB}$ $\to$ System returns HTTP 400 ("File size exceeds 5MB limit").
  - *E2 (Invalid MIME/Corrupt File):* Unrecognized or unreadable file $\to$ System returns HTTP 422 ("Unable to parse document. Ensure file is not password-protected").
  - *E3 (Unauthenticated):* No valid cookie $\to$ System returns HTTP 401 Unauthorized.
- **Expected Output:** Resume successfully parsed, stored, and displayed in user's resume list.

### UC-03: AI Resume Analysis Execution
- **Primary Actor:** Authenticated User
- **Preconditions:** User has at least one parsed resume in their account.
- **Main Flow:**
  1. User clicks "Analyze Resume" for resume `resumeId`.
  2. Client issues `POST /api/v1/resumes/:id/analyze`.
  3. Server validates user ownership of `resumeId`.
  4. Server constructs a prompt injecting resume text and system instructions for Google Gemini.
  5. Server calls Gemini API in JSON mode.
  6. Server validates Gemini JSON response against `ResumeAnalysisOutputSchema` (Zod).
  7. Server creates a `ResumeAnalysis` document linked to `resumeId` and `userId`.
  8. Server returns HTTP 201 with comprehensive score breakdown, bullet rewrites, and strengths/weaknesses.
  9. Client renders the interactive quality dashboard and suggestions list.
- **Exception Flows:**
  - *E1 (Unauthorized / IDOR):* Resume belongs to another user $\to$ System returns HTTP 404/403 Forbidden.
  - *E2 (Gemini Outage / Rate Limit):* Gemini returns 429/503 $\to$ System retries with backoff; if persistent, returns HTTP 503 ("AI analysis service temporarily unavailable. Please retry.").
  - *E3 (Schema Validation Failure):* Gemini response does not conform to schema $\to$ System logs invalid payload, retries prompt once; if failed, returns HTTP 502 Bad Gateway.
- **Expected Output:** Validated, structured resume analysis stored in MongoDB and rendered in UI.

### UC-04: Job Description Matching & Skill Gap Analysis
- **Primary Actor:** Authenticated User
- **Preconditions:** User has an uploaded resume.
- **Main Flow:**
  1. User navigates to `/job-match`, selects a resume, and inputs a Job Title, Company, and Job Description text.
  2. Client sends `POST /api/v1/jobs/match` with `{ resumeId, jobTitle, company, jobDescription }`.
  3. Server verifies resume ownership and validates input lengths.
  4. Server calls Gemini with structured job match prompt.
  5. Gemini outputs JSON matching `JobMatchOutputSchema` containing:
     - `matchScore` (0–100)
     - `matchedSkills` (array of strings)
     - `missingSkills` (array of strings)
     - `unverifiedSkills` (array of strings)
     - `tailoringRecommendations` (array of action items)
  6. Server saves `JobAnalysis` document.
  7. Server returns HTTP 201 with data and standard disclaimer notice.
  8. Client renders Match Score Gauge, Badges, and Tailoring advice with hiring disclaimer.
- **Exception Flows:**
  - *E1 (Empty Job Description):* Description $< 50\text{ characters}$ $\to$ System returns HTTP 400.
  - *E2 (Resume Not Found):* Invalid `resumeId` $\to$ System returns HTTP 404.
- **Expected Output:** Detailed job match breakdown displayed with prominent non-guarantee disclaimer.

### UC-05: AI Interview Generation & Answer Evaluation
- **Primary Actor:** Authenticated User
- **Preconditions:** User initiates interview prep for a resume and optional job target.
- **Main Flow:**
  1. User requests interview questions via `POST /api/v1/interviews/generate`.
  2. Server generates 5–10 structured questions (Technical, STAR Behavioral, Situational).
  3. Server creates an `InterviewSession` document with pending question items.
  4. User views question and submits text answer via `POST /api/v1/interviews/:id/questions/:qId/evaluate`.
  5. Server prompts Gemini with question, user's resume context, and user's answer.
  6. Gemini evaluates response returning score (0–100), critique, missing points, and model answer.
  7. Server updates `InterviewSession` record and returns HTTP 200.
  8. Client displays interactive feedback accordion with score badge.
- **Expected Output:** User receives tailored interview feedback and model answers.

### UC-06: 1-Click Total Account and Data Deletion
- **Primary Actor:** Authenticated User
- **Preconditions:** User is logged in and navigates to `/profile/settings`.
- **Main Flow:**
  1. User clicks "Delete Account" and confirms by typing their email.
  2. Client issues `DELETE /api/v1/users/me`.
  3. Server verifies confirmation payload.
  4. Server initiates cascading deletion:
     - Delete all `User` records where `_id == req.user._id`
     - Delete all `Resume` records where `userId == req.user._id`
     - Delete all `ResumeAnalysis` records where `userId == req.user._id`
     - Delete all `JobAnalysis` records where `userId == req.user._id`
     - Delete all `InterviewSession` records where `userId == req.user._id`
     - Delete all `Application` records where `userId == req.user._id`
  5. Server clears the authentication cookie.
  6. Server returns HTTP 200 with confirmation message.
  7. Client clears local user state and redirects to `/`.
- **Expected Output:** Permanent removal of all personal data across database collections.

---

## 4. Detailed Requirements Matrix

### 4.1 Functional Requirements (FR)

| Requirement ID | Module | Description | Priority |
|---|---|---|---|
| **FR-AUTH-101** | Auth | System shall validate user registration with email, full name, and strong password. | MUST |
| **FR-AUTH-102** | Auth | System shall issue secure HttpOnly, SameSite=Strict cookies containing signed JWTs upon valid login. | MUST |
| **FR-AUTH-103** | Auth | System shall clear auth cookies upon logout and invalidate client session state. | MUST |
| **FR-AUTH-104** | Auth | System shall permit users to fetch current session user info via `GET /api/v1/auth/me`. | MUST |
| **FR-AUTH-105** | Auth | System shall execute complete cascading data wipe on account deletion request. | MUST |
| **FR-RES-201** | Resume | System shall accept PDF, DOCX, and TXT files up to 5 MB in size. | MUST |
| **FR-RES-202** | Resume | System shall extract text and parse sections (Summary, Experience, Education, Skills, Projects). | MUST |
| **FR-RES-203** | Resume | System shall allow users to view, list, and delete uploaded resumes. | MUST |
| **FR-AI-301** | AI Engine | System shall invoke Google Gemini API with structured prompts for resume evaluation. | MUST |
| **FR-AI-302** | AI Engine | System shall validate all AI output through strict Zod schemas before storing or rendering. | MUST |
| **FR-AI-303** | AI Engine | System shall generate an Overall Quality Score (0–100) and 5 category sub-scores. | MUST |
| **FR-AI-304** | AI Engine | System shall provide line-by-line bullet rewrites with impact rationale. | MUST |
| **FR-JOB-401** | Job Match | System shall evaluate resume text against submitted job description text. | MUST |
| **FR-JOB-402** | Job Match | System shall identify matched skills, missing skills, and unverified skills. | MUST |
| **FR-JOB-403** | Job Match | System shall calculate an Alignment Score (0–100) with explicit hiring disclaimer. | MUST |
| **FR-INT-501** | Interview | System shall generate 5–10 contextual interview questions based on resume & job target. | MUST |
| **FR-INT-502** | Interview | System shall score and evaluate user-submitted written answers against a rubric. | MUST |
| **FR-APP-601** | Tracker | System shall support CRUD operations for job applications across 6 status states. | MUST |
| **FR-APP-602** | Tracker | System shall optionally associate applications with stored Resume and Job Analysis records. | SHOULD |
| **FR-DASH-701**| Dashboard | System shall display aggregated user statistics (resumes, analyses, scores, applications). | MUST |

### 4.2 Non-Functional Requirements (NFR)

| Requirement ID | Category | Description | Target / Threshold |
|---|---|---|---|
| **NFR-SEC-001** | Security | Passwords hashed using bcrypt with salt rounds $\ge 10$. | $100\%$ compliance |
| **NFR-SEC-002** | Security | IDOR protection on all user resource endpoints via compound query. | 0 unauthorized leaks |
| **NFR-SEC-003** | Security | Rate limiting enforced on all API tiers. | $100\text{ req}/15\text{m}$ default |
| **NFR-SEC-004** | Security | No secret keys or environment variables exposed in client bundle. | $0\text{ leaks}$ |
| **NFR-PERF-001**| Performance| Standard REST API response latency (p95). | $< 200\text{ ms}$ |
| **NFR-PERF-002**| Performance| End-to-end AI resume analysis completion latency. | $< 15\text{ s}$ |
| **NFR-REL-001** | Reliability| AI calls retry with exponential backoff on transient errors. | Max 3 attempts |
| **NFR-A11Y-001**| Usability | Compliance with WCAG 2.1 Level AA accessibility standards. | $100\%$ core flows |
| **NFR-DAT-001** | Data | Cascade deletion cleans all foreign key references completely. | $100\%$ clean wipe |

---

## 5. Security & Authorization Test Requirements

To ensure complete IDOR and unauthorized access protection, the following test cases are mandatory in the testing suite:

```
+-----------------------------------------------------------------------------------+
|                           SECURITY TEST SUITE REQUIREMENTS                        |
+-----------------------------------------------------------------------------------+
| TEST-SEC-01: Unauthorized Endpoint Access                                         |
|   - Request: Call GET /api/v1/resumes without Cookie                              |
|   - Expected: HTTP 401 Unauthorized { "code": "UNAUTHORIZED" }                    |
+-----------------------------------------------------------------------------------+
| TEST-SEC-02: Cross-User Resource Access (IDOR Prevention)                         |
|   - Setup: User A creates Resume A. User B logs in.                               |
|   - Request: User B calls GET /api/v1/resumes/:resumeA_Id                         |
|   - Expected: HTTP 404 Not Found or HTTP 403 Forbidden (no data leakage)          |
+-----------------------------------------------------------------------------------+
| TEST-SEC-03: Cross-User Resource Deletion                                         |
|   - Request: User B calls DELETE /api/v1/resumes/:resumeA_Id                      |
|   - Expected: HTTP 404/403; Resume A remains intact in database                   |
+-----------------------------------------------------------------------------------+
| TEST-SEC-04: Malicious File Upload Rejection                                      |
|   - Request: User uploads executable disguised as .pdf (fake extension/MIME)      |
|   - Expected: HTTP 422 Unprocessable Entity; file rejected in memory              |
+-----------------------------------------------------------------------------------+
| TEST-SEC-05: Rate Limiting Enforcement                                            |
|   - Request: Send 15 consecutive AI analysis requests within 1 minute             |
|   - Expected: HTTP 429 Too Many Requests after threshold is reached               |
+-----------------------------------------------------------------------------------+
```
