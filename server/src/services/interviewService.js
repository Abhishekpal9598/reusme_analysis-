import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import {
  geminiQuestionsListSchema,
  geminiAnswerEvaluationSchema,
  geminiFinalReportSchema,
  calculateDeterministicOverallScore,
  PRACTICE_VERDICT_DISCLAIMER,
} from '../validators/interviewValidators.js';
import { GeminiServiceError } from './geminiService.js';

let genAIClient = null;

function getClient() {
  if (!env.GEMINI_API_KEY) {
    throw new GeminiServiceError(
      'Gemini API key is not configured on this server.',
      503,
      'GEMINI_UNCONFIGURED'
    );
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return genAIClient;
}

// Test hooks for mocking Gemini calls in tests
let mockQuestionGenerator = null;
let mockAnswerEvaluator = null;
let mockReportGenerator = null;

export function setMockInterviewQuestionGenerator(fn) {
  mockQuestionGenerator = fn;
}

export function setMockInterviewEvaluator(fn) {
  mockAnswerEvaluator = fn;
}

export function setMockInterviewReportGenerator(fn) {
  mockReportGenerator = fn;
}

/**
 * Standardized call helper for Google Gemini
 */
async function callGemini(ai, modelName, prompt, systemInstruction, responseSchema, timeoutMs = 60000, temperature = 0.3) {
  const effectiveTimeout = Math.max(timeoutMs, 60000);
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), effectiveTimeout);

  const requestPayload = {
    model: modelName,
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema,
      temperature,
      abortSignal: abortController.signal,
    },
  };

  try {
    let response;
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await ai.models.generateContent(requestPayload);
        break;
      } catch (callErr) {
        const errMsg = callErr.message || '';
        const status = callErr.status || callErr.statusCode;
        const is503 =
          status === 503 ||
          errMsg.includes('503') ||
          errMsg.toLowerCase().includes('high demand') ||
          errMsg.toLowerCase().includes('unavailable');
        const is429 = status === 429 || errMsg.includes('429');

        if ((is503 || is429) && attempt < maxRetries) {
          // Exponential backoff retry for transient demand/rate limits
          await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
          continue;
        }
        throw callErr;
      }
    }

    if (!response || !response.text) {
      throw new GeminiServiceError('Gemini returned an empty response.', 502, 'GEMINI_EMPTY_RESPONSE');
    }

    return response.text.trim();
  } catch (err) {
    if (err instanceof GeminiServiceError) {
      throw err;
    }
    if (err.name === 'AbortError' || abortController.signal.aborted) {
      throw new GeminiServiceError(
        `Gemini request timed out after ${timeoutMs}ms. Please try again.`,
        504,
        'GEMINI_TIMEOUT'
      );
    }

    const errMsg = err.message || '';
    const status = err.status || err.statusCode;

    if (status === 429 || errMsg.includes('429') || errMsg.toLowerCase().includes('quota')) {
      throw new GeminiServiceError(
        'Gemini API rate limit exceeded. Please try again shortly.',
        429,
        'GEMINI_RATE_LIMITED'
      );
    }

    if (status === 503 || errMsg.includes('503') || errMsg.toLowerCase().includes('high demand') || errMsg.toLowerCase().includes('unavailable')) {
      throw new GeminiServiceError(
        'Google Gemini is currently experiencing temporary high demand. Please try again shortly.',
        503,
        'GEMINI_HIGH_DEMAND'
      );
    }

    throw new GeminiServiceError(
      `Gemini request failed: ${errMsg || 'Unknown provider error'}`,
      502,
      'GEMINI_API_ERROR'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 1. Generate Interview Questions
 */
export async function generateInterviewQuestions({
  jobRole,
  experienceLevel = 'Mid',
  category = 'Technical',
  difficulty = 'Medium',
  questionCount = 5,
  resumeText = null,
  meta = {},
}) {
  const modelName = meta.model || env.GEMINI_MODEL || 'gemini-3.8-flash';
  const timeoutMs = meta.timeoutMs || env.GEMINI_TIMEOUT_MS || 35000;

  if (mockQuestionGenerator) {
    const raw = await mockQuestionGenerator({
      jobRole,
      experienceLevel,
      category,
      difficulty,
      questionCount,
      resumeText,
    });
    return geminiQuestionsListSchema.parse(raw);
  }

  const ai = getClient();

  const systemInstruction = `You are CareerAI's Principal Technical Interviewer and Hiring Evaluator.
Generate exactly ${questionCount} realistic, high-caliber interview questions tailored for the specified candidate role, category, seniority, and difficulty.

CRITICAL RULES:
1. STRICT SEPARATION OF EXPERIENCE LEVEL AND DIFFICULTY:
   - EXPERIENCE LEVEL is '${experienceLevel}' (Junior, Mid, Senior, or Lead).
   - INTERVIEW DIFFICULTY is '${difficulty}' (Easy, Medium, or Hard).
   - In each generated question's 'difficulty' field, output strictly 'Easy', 'Medium', or 'Hard'. NEVER output experience levels (Junior, Mid, Senior, Lead) in question difficulty.
2. ROLE & EXPERIENCE ALIGNMENT: Calibrate question depth to '${experienceLevel}' level for the role of '${jobRole}'.
3. CATEGORY FOCUS: Category is '${category}'.
   - If Technical: Focus on real-world architecture, design decisions, debugging, core principles, and edge cases.
   - If Behavioral: Focus on past workplace conflict, leadership, failures, team collaboration, and cross-functional trade-offs.
   - If HR: Focus on career motivation, cultural alignment, work style, compensation expectations, and long-term trajectory.
   - If Role-Based: Focus on scenario-based challenges specific to '${jobRole}' (e.g. system design, operational triage, sprint planning).
   - If General: Provide a balanced mix across technical depth and behavioral scenarios.
4. RESUME CONTEXT: ${
    resumeText
      ? "The candidate provided their resume below. You MUST tailor questions directly to their stated projects, technical stack, metrics, and background, probing their actual involvement and architectural decisions."
      : "No resume was provided. Generate realistic industry-standard questions for the target role."
  }
5. NO TRIVIA: Avoid textbook rote memorization questions (e.g., 'What is polymorphism?'). Ask scenario, problem-solving, or experiential questions.
6. Provide 3-5 concise bullet points in 'sampleKeyPoints' outlining what a top-tier candidate's answer should ideally mention or address.`;

  const promptContent = `TARGET ROLE: ${jobRole}
CANDIDATE SENIORITY / EXPERIENCE LEVEL: ${experienceLevel}
INTERVIEW CATEGORY: ${category}
INTERVIEW DIFFICULTY: ${difficulty}
TOTAL QUESTIONS REQUESTED: ${questionCount}
${resumeText ? `\n--- CANDIDATE RESUME EXCERPT ---\n${resumeText.slice(0, 15000)}\n--- END RESUME ---` : ''}

Generate exactly ${questionCount} questions formatted strictly as JSON matching the schema.`;

  const schema = {
    type: 'OBJECT',
    properties: {
      questions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            questionText: { type: 'STRING' },
            category: { type: 'STRING' },
            difficulty: { type: 'STRING', enum: ['Easy', 'Medium', 'Hard'] },
            sampleKeyPoints: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
          },
          required: ['questionText', 'category', 'difficulty', 'sampleKeyPoints'],
        },
      },
    },
    required: ['questions'],
  };

  const text = await callGemini(
    ai,
    modelName,
    promptContent,
    systemInstruction,
    schema,
    timeoutMs,
    0.5
  );

  let parsedJson;
  try {
    parsedJson = JSON.parse(text);
  } catch (err) {
    throw new GeminiServiceError(
      'Failed to parse JSON response from Gemini question generator.',
      502,
      'GEMINI_INVALID_JSON'
    );
  }

  const rawList = Array.isArray(parsedJson) ? parsedJson : parsedJson.questions || [];
  const normalizedList = rawList.map((q) => {
    let qDiff = q.difficulty;
    if (qDiff === 'Junior') qDiff = 'Easy';
    else if (qDiff === 'Mid') qDiff = 'Medium';
    else if (qDiff === 'Senior') qDiff = 'Hard';
    else if (!['Easy', 'Medium', 'Hard'].includes(qDiff)) qDiff = difficulty;
    return {
      ...q,
      difficulty: qDiff,
    };
  });

  const validated = geminiQuestionsListSchema.safeParse(normalizedList);
  if (!validated.success) {
    throw new GeminiServiceError(
      `Gemini generated questions schema mismatch: ${validated.error.message}`,
      502,
      'GEMINI_SCHEMA_VALIDATION_ERROR'
    );
  }

  return validated.data.slice(0, questionCount);
}

/**
 * 2. Evaluate Candidate Answer
 */
export async function evaluateAnswer({
  questionText,
  userAnswer,
  category = 'Technical',
  difficulty = 'Medium',
  experienceLevel = 'Mid',
  jobRole = 'Software Engineer',
  sampleKeyPoints = [],
  meta = {},
}) {
  const modelName = meta.model || env.GEMINI_MODEL || 'gemini-3.8-flash';
  const timeoutMs = meta.timeoutMs || env.GEMINI_TIMEOUT_MS || 35000;

  if (mockAnswerEvaluator) {
    const raw = await mockAnswerEvaluator({
      questionText,
      userAnswer,
      category,
      difficulty,
      experienceLevel,
      jobRole,
      sampleKeyPoints,
    });
    return geminiAnswerEvaluationSchema.parse(raw);
  }

  const ai = getClient();

  const systemInstruction = `You are CareerAI's Senior Interview Assessor and Hiring Bar Raiser.
Evaluate the candidate's answer with rigorous, honest, and actionable feedback.

CRITICAL ASSESSMENT RULES:
1. FACTUAL FIDELITY & HONESTY: Never encourage fabricating experience, lying, or buzzword stuffing. Evaluate the authenticity, logic, and depth demonstrated in the response.
2. RUBRIC SCORING (0 to 100 integer for each dimension):
   - technicalAccuracy: Accuracy of concepts, correctness of logic, or soundness of methodology.
   - completeness: Whether the answer addressed all facets of the prompt and articulated edge cases/tradeoffs.
   - clarity: Articulation, structure, concise communication, and absence of excessive rambling.
   - problemSolving: Practicality, reasoning skills, and real-world applicability of the solution.
3. OVERALL SCORE: A weighted integer (0-100) reflecting the overall strength of this answer given the candidate's seniority (${experienceLevel}) for ${jobRole}.
4. STAR METHOD EVALUATION:
   - If the category is Behavioral, HR, or situational (isStarApplicable: true), analyze whether the answer demonstrated Situation, Task, Action, and Result. Provide specific feedback on which STAR steps were strong or missing.
   - If pure technical theory (isStarApplicable: false), set situation, task, action, result to empty strings and provide general feedback.
5. ACTIONABLE GUIDANCE:
   - strengths: 2-4 specific positive aspects.
   - missingPoints: 1-3 essential concepts or nuances the candidate omitted.
   - improvements: 2-3 concrete tips on how to elevate the response.
   - modelAnswer: A compelling, senior-level exemplar answer (200-350 words) showing how to answer this question masterfully.`;

  const promptContent = `ROLE: ${jobRole}
SENIORITY: ${experienceLevel}
QUESTION CATEGORY: ${category}
DIFFICULTY: ${difficulty}

QUESTION:
"${questionText}"

ASSESSMENT KEY POINTS / BENCHMARKS:
${sampleKeyPoints.length ? sampleKeyPoints.map((k) => `- ${k}`).join('\n') : '- General domain excellence and structured reasoning'}

CANDIDATE'S SUBMITTED ANSWER:
"${userAnswer}"

Evaluate this answer and output JSON strictly following the required schema.`;

  const schema = {
    type: 'OBJECT',
    properties: {
      score: { type: 'NUMBER' },
      rubricScores: {
        type: 'OBJECT',
        properties: {
          technicalAccuracy: { type: 'NUMBER' },
          completeness: { type: 'NUMBER' },
          clarity: { type: 'NUMBER' },
          problemSolving: { type: 'NUMBER' },
        },
        required: ['technicalAccuracy', 'completeness', 'clarity', 'problemSolving'],
      },
      starAssessment: {
        type: 'OBJECT',
        properties: {
          isStarApplicable: { type: 'BOOLEAN' },
          situation: { type: 'STRING' },
          task: { type: 'STRING' },
          action: { type: 'STRING' },
          result: { type: 'STRING' },
          starFeedback: { type: 'STRING' },
        },
        required: [
          'isStarApplicable',
          'situation',
          'task',
          'action',
          'result',
          'starFeedback',
        ],
      },
      strengths: { type: 'ARRAY', items: { type: 'STRING' } },
      weaknesses: { type: 'ARRAY', items: { type: 'STRING' } },
      missingPoints: { type: 'ARRAY', items: { type: 'STRING' } },
      improvements: { type: 'ARRAY', items: { type: 'STRING' } },
      modelAnswer: { type: 'STRING' },
    },
    required: [
      'score',
      'rubricScores',
      'starAssessment',
      'strengths',
      'missingPoints',
      'improvements',
      'modelAnswer',
    ],
  };

  const text = await callGemini(
    ai,
    modelName,
    promptContent,
    systemInstruction,
    schema,
    timeoutMs,
    0.3
  );

  let parsedJson;
  try {
    parsedJson = JSON.parse(text);
  } catch (err) {
    throw new GeminiServiceError(
      'Failed to parse JSON response from Gemini answer evaluation.',
      502,
      'GEMINI_INVALID_JSON'
    );
  }

  const validated = geminiAnswerEvaluationSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new GeminiServiceError(
      `Gemini answer evaluation schema mismatch: ${validated.error.message}`,
      502,
      'GEMINI_SCHEMA_VALIDATION_ERROR'
    );
  }

  return {
    ...validated.data,
    evaluatedAt: new Date(),
  };
}

/**
 * 3. Generate Final Report Insights & Synthesis
 */
export async function generateInterviewReportInsights({ session, meta = {} }) {
  const modelName = meta.model || env.GEMINI_MODEL || 'gemini-3.8-flash';
  const timeoutMs = meta.timeoutMs || env.GEMINI_TIMEOUT_MS || 35000;

  if (mockReportGenerator) {
    const raw = await mockReportGenerator(session);
    return geminiFinalReportSchema.parse(raw);
  }

  const ai = getClient();

  const questionsSummary = session.questions.map((q, idx) => ({
    number: idx + 1,
    questionText: q.questionText,
    category: q.category,
    userAnswer: q.userAnswer,
    score: q.evaluation?.score || 0,
    strengths: q.evaluation?.strengths || [],
    missingPoints: q.evaluation?.missingPoints || [],
  }));

  const systemInstruction = `You are CareerAI's Principal Career Coach and Senior Hiring Committee Lead.
Review the complete mock interview transcript and provide a cohesive, high-impact synthesis of the candidate's interview performance.

CRITICAL RULES:
1. Provide an executive summary of the performance (2-4 concise paragraphs).
2. Synthesize 3-5 macro strengths observed across responses.
3. Synthesize 3-5 macro areas for improvement / recurring gaps.
4. Recommend 3-5 specific study topics or technical domains to review.
5. Create a step-by-step 4-stage personalized preparation roadmap to prepare the candidate for actual interviews.`;

  const promptContent = `ROLE: ${session.jobRole}
EXPERIENCE LEVEL: ${session.experienceLevel}
INTERVIEW CATEGORY: ${session.category}

INTERVIEW QUESTIONS & EVALUATIONS:
${JSON.stringify(questionsSummary, null, 2)}

Provide the synthesized final report matching the JSON schema.`;

  const schema = {
    type: 'OBJECT',
    properties: {
      summary: { type: 'STRING' },
      strengthsSummary: { type: 'ARRAY', items: { type: 'STRING' } },
      weaknessesSummary: { type: 'ARRAY', items: { type: 'STRING' } },
      studyRecommendations: { type: 'ARRAY', items: { type: 'STRING' } },
      personalizedRoadmap: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: [
      'summary',
      'strengthsSummary',
      'weaknessesSummary',
      'studyRecommendations',
      'personalizedRoadmap',
    ],
  };

  const text = await callGemini(
    ai,
    modelName,
    promptContent,
    systemInstruction,
    schema,
    timeoutMs,
    0.4
  );

  let parsedJson;
  try {
    parsedJson = JSON.parse(text);
  } catch (err) {
    throw new GeminiServiceError(
      'Failed to parse JSON response from Gemini final report synthesis.',
      502,
      'GEMINI_INVALID_JSON'
    );
  }

  const validated = geminiFinalReportSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new GeminiServiceError(
      `Gemini report schema mismatch: ${validated.error.message}`,
      502,
      'GEMINI_SCHEMA_VALIDATION_ERROR'
    );
  }

  return validated.data;
}

/**
 * 4. Complete Session: Computes deterministic scores and attaches synthesized report
 */
export async function compileFinalSessionReport(session, meta = {}) {
  // Compute deterministic metrics
  const deterministicMetrics = calculateDeterministicOverallScore(session.questions);

  // Generate qualitative synthesis from Gemini
  const insights = await generateInterviewReportInsights({ session, meta });

  const finalReport = {
    overallScore: deterministicMetrics.overallScore,
    verdict: deterministicMetrics.verdict,
    categoryBreakdown: deterministicMetrics.categoryBreakdown,
    rubricAverages: deterministicMetrics.rubricAverages,
    summary: insights.summary,
    strengthsSummary: insights.strengthsSummary,
    weaknessesSummary: insights.weaknessesSummary,
    studyRecommendations: insights.studyRecommendations,
    personalizedRoadmap: insights.personalizedRoadmap,
    disclaimer: PRACTICE_VERDICT_DISCLAIMER,
    completedAt: new Date(),
  };

  return finalReport;
}
