import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import resumeRoutes from './resume.routes.js';
import analysisRoutes from './analysis.routes.js';
import jobRoutes from './job.routes.js';
import interviewRoutes from './interview.routes.js';
import applicationRoutes from './application.routes.js';
import careerIntelligenceRoutes from './careerIntelligence.routes.js';

const router = Router();

// Mount API v1 sub-routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/resumes', resumeRoutes);
router.use('/analyses', analysisRoutes);
router.use('/job-matches', jobRoutes);
router.use('/jobs', jobRoutes);
router.use('/interviews', interviewRoutes);
router.use('/applications', applicationRoutes);
router.use('/career-intelligence', careerIntelligenceRoutes);

export default router;
