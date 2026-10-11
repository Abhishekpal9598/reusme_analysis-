# CareerAI — Phase 9: AI Career Intelligence & Personalized Recommendations
## Product Requirements Document (PRD)

**Document Version:** 1.0.0  
**Phase:** 9 — AI Career Intelligence & Personalized Recommendations  
**Status:** Approved for Architecture & Planning  
**Product Name:** CareerAI — AI Resume Analyzer & Job Match Platform  
**Target Milestone:** Full Career Intelligence Synthesis  

---

## 1. Executive Summary & Product Vision

### 1.1 Vision Statement
CareerAI Phases 1 through 8 delivered standalone capabilities: resume parsing, section-by-section ATS quality auditing, bi-directional job-fit analysis, contextual mock interview simulation, and end-to-end application tracking. 

**Phase 9 (AI Career Intelligence & Personalized Recommendations)** synthesizes these discrete data points into an unified, longitudinal **Career Intelligence Engine**. Instead of analyzing isolated artifacts (one resume, one job description, or one interview), Phase 9 aggregates a candidate's complete profile—extracted technical proficiencies, recurring interview weaknesses, aggregate job match deficits, and application pipeline momentum—to deliver holistic, actionable, and personalized career guidance.

### 1.2 Core Value Proposition
- **Holistic Visibility:** Connects resume strength, job match gaps, interview readiness, and application outcomes in a single pane of glass.
- **Evidence-Based Recommendations:** Identifies systemic skill gaps across all analyzed job descriptions rather than one-off requirements.
- **Personalized Learning Pathways:** Generates realistic, milestone-based roadmaps with estimated timelines, recommended project archetypes, and validated concepts.
- **Objective Readiness Scoring:** Computes a composite **Career Readiness Index (CRI)** that benchmarks candidate competitiveness for target roles.
- **Factual Fidelity & Ethical AI:** Strict grounding in verified user data. AI suggestions are explicitly flagged as advisory recommendations and clearly differentiated from candidate ground truth.

---

## 2. Problem Statement & User Personas

### 2.1 The Problem
Job seekers often suffer from "data fragmentation and tactical myopia":
1. **Isolated Feedback:** A candidate receives feedback on an individual resume or a single job match but lacks a unified view of recurring deficiencies across their target market.
2. **Generic Career Advice:** Public career roadmaps and role descriptions are generic, failing to account for what the candidate already possesses versus what they actually lack.
3. **Preparedness Uncertainty:** Candidates lack a reliable, data-backed metric indicating when they are genuinely ready to apply, interview, or negotiate for higher seniority roles.
4. **Cold Start & Sparse Data Frustration:** Platforms often fail abruptly or generate hallucinated suggestions when candidates have only partially populated their profiles.

### 2.2 Target Personas

#### Persona A: "Elena" — Mid-Level Full Stack Engineer Seeking Senior Roles
- **Context:** Has uploaded 2 resumes, analyzed 4 Senior Backend/Distributed Systems job postings, completed 2 mock interviews, and tracked 6 applications.
- **Pain Points:** Repeatedly misses distributed caching and system design questions in mock interviews; job matches flag missing Kubernetes/Terraform skills.
- **Need in Phase 9:** Aggregate skill gap analysis showing that Kubernetes and System Design are her top blockers across 80% of target roles, paired with a 4-week step-by-step learning roadmap and project suggestions.

#### Persona B: "Devon" — Career Switcher (Bootcamp / Self-Taught)
- **Context:** Has 1 entry-level resume, 1 job match analysis, 0 mock interviews, and 2 saved applications (Sparse Data State).
- **Pain Points:** Overwhelmed by industry jargon; unsure which roles match current capabilities.
- **Need in Phase 9:** Graceful onboarding with deterministic heuristics, clear next-step action cards ("Complete your first mock interview to unlock interview readiness metrics"), and realistic alternative role recommendations.

---

## 3. Product Scope & Functional Features

Phase 9 delivers seven interrelated functional modules:

### 3.1 Feature 1: Career Insights Dashboard
- **Executive Summary:** A personalized executive overview highlighting overall market alignment, top strengths, primary growth areas, and immediate priorities.
- **Core KPIs:**
  - Career Readiness Index (0–100 score).
  - Target Role Alignment percentage.
  - Active Market Competitiveness tier (Emerging, Competitive, Highly Qualified).
  - Activity Momentum (total artifacts ingested, interviews evaluated, applications active).

### 3.2 Feature 2: Cross-Application Skill Gap Aggregator
- **Data Aggregation:** Aggregates skill data from all analyzed `JobAnalysis` documents and `Resume` models.
- **Categorization:**
  - **Core Mastered Skills:** Verified skills present across resumes with strong match frequency.
  - **High-Impact Deficits:** Critical skills demanded across multiple target job postings that are missing or unverified in candidate resumes.
  - **Emerging / Secondary Skills:** Skills appearing occasionally as "nice-to-have" in job descriptions.
- **Frequency & Impact Ranking:** Skills ranked by demand frequency across user's target jobs and criticality weight.

### 3.3 Feature 3: Personalized Learning Roadmap
- **Step-by-Step Milestones:** 3 to 5 structured learning milestones tailored specifically to close high-impact deficits.
- **Milestone Structure:**
  - Topic Title & Target Skill.
  - Estimated Time Investment (e.g., "1–2 Weeks", "3–4 Weeks").
  - Learning Objectives (core concepts to master).
  - Suggested Practical Project Archetype (hands-on portfolio project to demonstrate competency).
  - Verification Criterion (how the candidate knows they have mastered it).
- **Interactive Progress Tracking:** Users can mark milestones as "In Progress" or "Completed", updating their roadmap completion percentage.

### 3.4 Feature 4: Job Role Recommendations & Lateral Paths
- **Role Alignment Feasibility:** Recommends 3 to 5 relevant job titles based on verified profile competencies:
  - **Direct Target Roles:** Immediate fit (75%+ skill overlap).
  - **Growth / Stretch Roles:** Roles requiring 1–2 key competency additions (50%–74% overlap).
  - **Adjacent / Lateral Roles:** High skill transferability roles the candidate may not have considered.
- **Feasibility Breakdown:** Explains why the role matches and what gap remains.

### 3.5 Feature 5: Career Readiness Index (CRI)
- **Deterministic Composite Formula:** Combines multiple weighted dimensions:
  1. *Resume Quality Score* (25%): Derived from `ResumeAnalysis.overallScore`.
  2. *Job Fit Alignment* (30%): Average `JobAnalysis.matchScore` across recent targets.
  3. *Interview Mastery* (25%): Average `InterviewSession.overallScore` across completed sessions.
  4. *Application Execution* (20%): Pipeline activity health derived from `Application` tracking.
- **Cold-Start Balancing:** If a component is missing (e.g., 0 interviews), the formula dynamically reweights existing components and clearly highlights missing input data with actionable prompts.

### 3.6 Feature 6: Weekly Momentum & Progress Reports
- **Weekly Snapshot:** Summarizes activity within the trailing 7 days:
  - Resumes updated or audited.
  - Applications moved across Kanban stages.
  - Interview sessions completed and score trends.
  - Roadmap milestones ticked off.
- **Momentum Score / Trend:** Directional indicator (Accelerating, Steady, Inactive) with motivational encouragement.

### 3.7 Feature 7: Actionable Next Steps ("Next Best Actions")
- **Dynamic Prioritized Task Queue:** Identifies the top 3 highest-leverage actions the candidate can execute today:
  - e.g., *"Practice System Design in Mock Simulator — flagged as weakness in 2 recent interviews"*.
  - e.g., *"Add Docker metrics to Resume #1 — requested in 3 target job descriptions"*.
  - e.g., *"Follow up on 2 overdue application reminders in Job Tracker"*.

---

## 4. Data Grounding & Factual Fidelity Principles

To adhere strictly to CareerAI's core security and trust philosophy:
1. **Never Fabricate User Qualifications:** The AI must never invent past work experience, degrees, certifications, or metrics not present in the user's uploaded records.
2. **Explicit Visual Differentiation:**
   - **User Ground Truth:** Displayed in slate/neutral badges (e.g., "From Resume: Python, Django").
   - **Target Market Demand:** Displayed in cyan/blue badges (e.g., "Demanded by 4 Target JDs: Kubernetes").
   - **AI Synthesis / Recommendation:** Displayed in emerald/purple badges with distinct spark/AI icons (e.g., "Recommended Action", "Suggested Project").
3. **Advisory Disclaimer:** Every report prominently displays the platform disclaimer that readiness scores and career recommendations reflect semantic alignment and assistive modeling, not an employment guarantee.

---

## 5. Graceful Degradation & Sparse Data Strategy

| User Data State | Available Artifacts | Strategy & UI Treatment |
| :--- | :--- | :--- |
| **Level 0 (Cold Start)** | 0 Resumes, 0 JDs, 0 Interviews, 0 Apps | Displays welcome guide with step-by-step checklist to unlock Career Intelligence. CRI shows "Pending Data". |
| **Level 1 (Resume Only)** | $\ge$ 1 Resume, 0 JDs, 0 Interviews | CRI computes baseline resume score; Skill gap suggests uploading a target Job Description; Roadmap suggests foundational resume optimizations. |
| **Level 2 (Resume + JDs)** | $\ge$ 1 Resume, $\ge$ 1 JD, 0 Interviews | Full cross-application skill gap active; CRI computes Resume + Job Alignment; Prompts user to start first Mock Interview to benchmark conversational mastery. |
| **Level 3 (Full Ecosystem)**| $\ge$ 1 Resume, $\ge$ 1 JD, $\ge$ 1 Interview, $\ge$ 1 App | Complete 4-dimensional Career Readiness Index, comprehensive skill gap, adaptive learning roadmap, and weekly momentum active. |

---

## 6. Success Metrics & Key Performance Indicators (KPIs)

1. **Generation Reliability:** $\ge$ 99.5% success rate for AI intelligence synthesis without validation crashes.
2. **Zero-Hallucination Adherence:** 100% of suggested skills grounded in either user artifacts or target job descriptions.
3. **End-to-End Latency:** Initial load of cached intelligence under 300ms; on-demand full AI regeneration under 12 seconds with progressive skeleton loaders.
4. **Zero Cross-Tenant Data Leakage:** 100% enforcement of authenticated user scoping across all aggregated models and intelligence endpoints.
