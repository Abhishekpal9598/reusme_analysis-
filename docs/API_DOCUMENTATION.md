# CareerAI — REST API Specification

**Document Version:** 1.0.0  
**Base URL:** `/api/v1`  
**Status:** **PROPOSED CONTRACT** (Subject to implementation & test verification)  
**Security Model:** HttpOnly, SameSite=Strict Cookie JWT (`token`)  
**Content-Type:** `application/json` (unless `multipart/form-data` for file uploads)  
**Author:** Backend Architecture Lead  
**Last Updated:** 2026-10-10  

---

## 1. Global Standards & Envelope Structure

### 1.1 Success Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "totalCount": 45,
    "totalPages": 3
  } // (meta included on paginated endpoints)
}
```

### 1.2 Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resume was not found or access is denied.",
    "details": []
  },
  "timestamp": "2026-10-10T21:45:00.000Z"
}
```

### 1.3 Standard HTTP Status Codes
| Code | Meaning | Use Case |
|---|---|---|
| `200 OK` | Successful request | Retrieval or update operation completed. |
| `201 Created` | Resource created | Document upload, user registered, analysis created. |
| `400 Bad Request` | Input validation failed | Missing required fields, invalid format. |
| `401 Unauthorized` | Authentication missing/invalid | Missing or expired JWT cookie. |
| `403 Forbidden` | Access denied | Attempting to access another user's resource. |
| `404 Not Found` | Resource not found | Invalid resource ID or resource belongs to another user. |
| `409 Conflict` | Unique constraint violated | Email address already registered. |
| `422 Unprocessable` | Unparseable payload | Corrupted PDF file, invalid JSON structure. |
| `429 Too Many Requests` | Rate limit exceeded | Exceeded throttle quota. |
| `500 Internal Server Error` | Server defect | Unhandled operational exception. |
| `502 / 503 Bad Gateway` | AI service disruption | Gemini API temporary failure. |

---

## 2. Authentication Endpoints

### 2.1 Register User
- **Method & Path:** `POST /api/v1/auth/register`
- **Auth Required:** No
- **Rate Limit:** 5 requests / 15 minutes
- **Request Body Schema (Zod):**
  ```json
  {
    "fullName": "Priya Sharma",
    "email": "priya.sharma@example.com",
    "password": "Password123!"
  }
  ```
- **Validation Rules:**
  - `fullName`: string, min 2, max 100 chars, trimmed.
  - `email`: valid email string, lowercased, trimmed.
  - `password`: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char.
- **Success Response (`201 Created`):**
  - **Header:** `Set-Cookie: token=<jwt>; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "6708304f5e709c0012ab1111",
        "fullName": "Priya Sharma",
        "email": "priya.sharma@example.com",
        "createdAt": "2026-10-10T21:45:00.000Z"
      }
    }
  }
  ```

### 2.2 Login User
- **Method & Path:** `POST /api/v1/auth/login`
- **Auth Required:** No
- **Rate Limit:** 5 requests / 15 minutes
- **Request Body:**
  ```json
  {
    "email": "priya.sharma@example.com",
    "password": "Password123!"
  }
  ```
- **Success Response (`200 OK`):**
  - **Header:** `Set-Cookie: token=<jwt>; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "6708304f5e709c0012ab1111",
        "fullName": "Priya Sharma",
        "email": "priya.sharma@example.com"
      }
    }
  }
  ```

### 2.3 Logout User
- **Method & Path:** `POST /api/v1/auth/logout`
- **Auth Required:** Yes
- **Success Response (`200 OK`):**
  - **Header:** `Set-Cookie: token=; Path=/; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  ```json
  {
    "success": true,
    "data": { "message": "Successfully logged out." }
  }
  ```

### 2.4 Get Current User (Session Bootstrap)
- **Method & Path:** `GET /api/v1/auth/me`
- **Auth Required:** Yes
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "6708304f5e709c0012ab1111",
        "fullName": "Priya Sharma",
        "email": "priya.sharma@example.com",
        "targetRole": "Full Stack Engineer",
        "careerLevel": "Mid"
      }
    }
  }
  ```

### 2.5 Refresh Session
- **Method & Path:** `POST /api/v1/auth/refresh`
- **Auth Required:** Yes
- **Success Response (`200 OK`):** Refreshes cookie expiration.

---

## 3. Profile & Account Management Endpoints

### 3.1 Get Profile
- **Method & Path:** `GET /api/v1/users/profile`
- **Auth Required:** Yes
- **Success Response (`200 OK`):** Returns user profile with preference metadata.

### 3.2 Update Profile
- **Method & Path:** `PATCH /api/v1/users/profile`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "fullName": "Priya Sharma",
    "targetRole": "Senior Frontend Engineer",
    "careerLevel": "Senior"
  }
  ```
- **Success Response (`200 OK`):** Returns updated profile.

### 3.3 1-Click Total Account Deletion (GDPR/Privacy Wipe)
- **Method & Path:** `DELETE /api/v1/users/me`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "confirmEmail": "priya.sharma@example.com"
  }
  ```
- **Validation:** `confirmEmail` must match current authenticated user's email.
- **Action:** Cascades deletion across all collections and clears auth cookie.
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": { "message": "Account and all associated data permanently deleted." }
  }
  ```

---

## 4. Resume Management Endpoints

### 4.1 Upload & Parse Resume
- **Method & Path:** `POST /api/v1/resumes`
- **Auth Required:** Yes
- **Content-Type:** `multipart/form-data`
- **Form Field:** `file` (single file, max 5MB, `.pdf`, `.docx`, or `.txt`)
- **Success Response (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "resume": {
        "id": "6708311a5e709c0012ab2222",
        "originalFileName": "Priya_Sharma_Resume.pdf",
        "fileFormat": "pdf",
        "fileSize": 245120,
        "rawTextSnippet": "Priya Sharma\nFull Stack Engineer\nExperience...",
        "parsedSections": {
          "experience": true,
          "education": true,
          "skills": true,
          "projects": true
        },
        "createdAt": "2026-10-10T21:46:00.000Z"
      }
    }
  }
  ```

### 4.2 List User Resumes
- **Method & Path:** `GET /api/v1/resumes`
- **Auth Required:** Yes
- **Query Params:** `page=1`, `limit=20`
- **Success Response (`200 OK`):** Returns array of user's resumes.

### 4.3 Get Resume Details
- **Method & Path:** `GET /api/v1/resumes/:id`
- **Auth Required:** Yes (Ownership enforced: `{ _id: id, userId: req.user.id }`)
- **Success Response (`200 OK`):** Returns full raw text and section metadata.

### 4.4 Delete Resume
- **Method & Path:** `DELETE /api/v1/resumes/:id`
- **Auth Required:** Yes (Ownership enforced)
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": { "message": "Resume deleted successfully." }
  }
  ```

---

## 5. AI Resume Analysis Endpoints

### 5.1 Create / Trigger Resume Analysis
- **Method & Path:** `POST /api/v1/resumes/:id/analyze`
- **Auth Required:** Yes
- **Rate Limit:** 10 requests / 5 minutes
- **Success Response (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "analysis": {
        "id": "6708320b5e709c0012ab3333",
        "resumeId": "6708311a5e709c0012ab2222",
        "overallScore": 78,
        "categoryScores": {
          "impactAndMetrics": 65,
          "brevityAndFormatting": 85,
          "actionVerbsAndStyle": 80,
          "skillsCoverage": 75,
          "atsReadability": 85
        },
        "summaryFeedback": "Strong technical foundation with clear progression. Needs more quantifiable business metrics in bullet points.",
        "bulletImprovements": [
          {
            "originalBullet": "Worked on the frontend team building React components.",
            "issueCritique": "Lacks measurable impact, scale, and strong action verbs.",
            "recommendedRewrite": "Architected and delivered 15+ reusable React/Tailwind components, reducing page load latency by 32% across 200k monthly users.",
            "impactExplanation": "Demonstrates architectural ownership and quantifiable user impact."
          }
        ],
        "strengths": ["Modern tech stack listed", "Clean section taxonomy"],
        "weaknesses": ["Passive voice in experience bullets", "Missing cloud deployment details"],
        "identifiedSkills": {
          "technical": ["React", "Node.js", "TypeScript", "MongoDB", "Express.js"],
          "soft": ["Cross-functional collaboration", "Agile sprint planning"],
          "toolsAndFrameworks": ["Docker", "Git", "Jest", "Vite"]
        },
        "createdAt": "2026-10-10T21:46:30.000Z"
      }
    }
  }
  ```

### 5.2 List Analyses for Resume
- **Method & Path:** `GET /api/v1/resumes/:id/analyses`
- **Auth Required:** Yes
- **Success Response (`200 OK`):** Chronological history of analyses for the resume.

### 5.3 Get Analysis Details
- **Method & Path:** `GET /api/v1/analyses/:id`
- **Auth Required:** Yes (Ownership enforced)
- **Success Response (`200 OK`):** Detailed analysis record.

---

## 6. Job Matching Endpoints

### 6.1 Create Job Description Match
- **Method & Path:** `POST /api/v1/jobs/match`
- **Auth Required:** Yes
- **Rate Limit:** 10 requests / 5 minutes
- **Request Body:**
  ```json
  {
    "resumeId": "6708311a5e709c0012ab2222",
    "jobTitle": "Senior Frontend Engineer",
    "company": "Stripe",
    "jobDescription": "We are seeking a Senior Frontend Engineer proficient in React, TypeScript, GraphQL, CI/CD, and web performance optimization..."
  }
  ```
- **Success Response (`201 Created`):**
  ```json
  {
    "success": true,
    "disclaimer": "Match score indicates semantic keyword and experience alignment. It does not represent guaranteed interview or hiring probability.",
    "data": {
      "jobAnalysis": {
        "id": "670833115e709c0012ab4444",
        "jobTitle": "Senior Frontend Engineer",
        "company": "Stripe",
        "matchScore": 72,
        "matchedSkills": ["React", "TypeScript", "Performance Optimization", "Jest"],
        "missingSkills": ["GraphQL", "CI/CD Pipelines", "Apollo Client"],
        "unverifiedSkills": ["System Design", "Mentorship"],
        "tailoringRecommendations": [
          "Incorporate experience with GraphQL queries or REST-to-GraphQL migration if applicable.",
          "Explicitly highlight automated testing workflows and CI/CD pipelines in your latest role."
        ],
        "createdAt": "2026-10-10T21:47:00.000Z"
      }
    }
  }
  ```

### 6.2 List Job Match Analyses
- **Method & Path:** `GET /api/v1/jobs/matches`
- **Auth Required:** Yes
- **Success Response (`200 OK`):** List of past match analyses.

### 6.3 Get Job Match Details
- **Method & Path:** `GET /api/v1/jobs/matches/:id`
- **Auth Required:** Yes
- **Success Response (`200 OK`):** Specific job match record.

---

## 7. AI Interview Preparation Endpoints

### 7.1 Generate Interview Session
- **Method & Path:** `POST /api/v1/interviews/generate`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "resumeId": "6708311a5e709c0012ab2222",
    "jobTitle": "Senior Frontend Engineer",
    "difficulty": "Mid"
  }
  ```
- **Success Response (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "interviewSession": {
        "id": "670834005e709c0012ab5555",
        "jobTitle": "Senior Frontend Engineer",
        "questions": [
          {
            "id": "q1",
            "questionText": "Can you explain how you optimized React component rendering in your previous project?",
            "category": "Technical",
            "difficulty": "Mid",
            "sampleKeyPoints": ["useMemo / useCallback", "Virtual DOM profiling", "State colocation"]
          },
          {
            "id": "q2",
            "questionText": "Describe a situation where you had a disagreement with a product manager over technical debt versus feature velocity.",
            "category": "Behavioral",
            "difficulty": "Mid",
            "sampleKeyPoints": ["STAR format", "Data-driven negotiation", "Collaborative compromise"]
          }
        ]
      }
    }
  }
  ```

### 7.2 Evaluate Interview Answer
- **Method & Path:** `POST /api/v1/interviews/:id/questions/:qId/evaluate`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "answer": "In my last role, we had slow render times on our dashboard. I used React Profiler to identify unneeded re-renders in our charts, implemented React.memo, and relocated global state closer to leaf components, reducing render cycles from 120ms to 24ms."
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "evaluation": {
        "score": 88,
        "strengths": ["Clear metrics provided (120ms to 24ms)", "Specific technical tools cited (React Profiler, React.memo)"],
        "weaknesses": ["Could briefly explain trade-offs of memoization memory overhead"],
        "missingPoints": ["Mention of code splitting or lazy loading"],
        "modelAnswer": "In my previous role, I systematically diagnosed a 120ms dashboard render bottleneck using React Profiler...",
        "evaluatedAt": "2026-10-10T21:48:00.000Z"
      }
    }
  }
  ```

---

## 8. Application Tracker Endpoints

### 8.1 Create Job Application Record
- **Method & Path:** `POST /api/v1/applications`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "companyName": "Stripe",
    "positionTitle": "Senior Frontend Engineer",
    "status": "Applied",
    "jobUrl": "https://stripe.com/jobs/123",
    "salaryExpectation": 140000,
    "notes": "Applied via referral. Screening call expected next week.",
    "appliedDate": "2026-10-10T00:00:00.000Z",
    "resumeId": "6708311a5e709c0012ab2222"
  }
  ```
- **Success Response (`201 Created`):** Returns created application entity.

### 8.2 List Applications
- **Method & Path:** `GET /api/v1/applications`
- **Auth Required:** Yes
- **Query Params:** `status=Applied`, `page=1`, `limit=50`
- **Success Response (`200 OK`):** Array of applications.

### 8.3 Update Application
- **Method & Path:** `PATCH /api/v1/applications/:id`
- **Auth Required:** Yes (Ownership enforced)
- **Request Body:** (Partial updates allowed, e.g. `{ "status": "Interviewing", "interviewDate": "2026-10-15T15:00:00.000Z" }`)
- **Success Response (`200 OK`):** Returns updated application.

### 8.4 Delete Application
- **Method & Path:** `DELETE /api/v1/applications/:id`
- **Auth Required:** Yes (Ownership enforced)
- **Success Response (`200 OK`):** Confirmation message.

---

## 9. Dashboard Analytics Endpoint

### 9.1 Get Dashboard Overview Statistics
- **Method & Path:** `GET /api/v1/dashboard/stats`
- **Auth Required:** Yes
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "resumesCount": 3,
      "averageQualityScore": 78,
      "applicationsCount": {
        "total": 12,
        "saved": 2,
        "applied": 5,
        "interviewing": 3,
        "offered": 1,
        "rejected": 1,
        "withdrawn": 0
      },
      "recentAnalyses": [ ... ],
      "recentApplications": [ ... ]
    }
  }
  ```
