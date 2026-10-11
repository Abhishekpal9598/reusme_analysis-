import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 9 Stage 4 - Frontend Services, Components & Dashboard Contract', () => {
  const clientDir = path.resolve(__dirname, '../../client/src');

  it('1. client service careerIntelligenceService.js exists and exports expected methods', () => {
    const servicePath = path.join(clientDir, 'services/careerIntelligenceService.js');
    expect(fs.existsSync(servicePath)).toBe(true);

    const content = fs.readFileSync(servicePath, 'utf8');
    expect(content).toContain('getCareerIntelligence');
    expect(content).toContain('generateCareerIntelligence');
    expect(content).toContain('regenerateCareerIntelligence');
    expect(content).toContain('updateCareerPreferences');
    expect(content).toContain('toggleRoadmapMilestone');
    expect(content).toContain("apiClient.get('/career-intelligence')");
    expect(content).toContain("apiClient.post('/career-intelligence/generate'");
    expect(content).toContain("apiClient.post('/career-intelligence/regenerate'");
    expect(content).toContain("apiClient.patch('/career-intelligence/preferences'");
    expect(content).toContain('/career-intelligence/milestones/');
  });

  it('2. all 8 career intelligence UI components exist with valid exports', () => {
    const componentFiles = [
      'ReadinessGauge.jsx',
      'SkillGapMatrix.jsx',
      'LearningRoadmapTimeline.jsx',
      'RoleRecommendationsCard.jsx',
      'NextActionsList.jsx',
      'WeeklyMomentumReport.jsx',
      'PreferencesModal.jsx',
      'SparseDataPrompt.jsx',
    ];

    for (const file of componentFiles) {
      const fullPath = path.join(clientDir, 'components/career-intelligence', file);
      expect(fs.existsSync(fullPath), `Expected ${file} to exist`).toBe(true);

      const content = fs.readFileSync(fullPath, 'utf8');
      expect(content.length).toBeGreaterThan(100);
      expect(content).toContain('export');
    }
  });

  it('3. ReadinessGauge.jsx includes deterministic SVG gauge and dimension breakdowns', () => {
    const filePath = path.join(clientDir, 'components/career-intelligence/ReadinessGauge.jsx');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('Career Readiness Index (CRI)');
    expect(content).toContain('Pending Data');
    expect(content).toContain('resumeQuality');
    expect(content).toContain('jobFitAlignment');
    expect(content).toContain('interviewMastery');
    expect(content).toContain('applicationPipeline');
  });

  it('4. LearningRoadmapTimeline.jsx supports interactive milestone toggling and resource links', () => {
    const filePath = path.join(clientDir, 'components/career-intelligence/LearningRoadmapTimeline.jsx');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('Personalized Learning Roadmap');
    expect(content).toContain('onToggleMilestone');
    expect(content).toContain('Portfolio Deliverable');
    expect(content).toContain('Recommended Resources');
  });

  it('5. SkillGapMatrix.jsx renders Mastered, Critical, and Partial skill tabs', () => {
    const filePath = path.join(clientDir, 'components/career-intelligence/SkillGapMatrix.jsx');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('Critical Gaps');
    expect(content).toContain('Mastered Skills');
    expect(content).toContain('Partial / In-Progress');
    expect(content).toContain('demandFrequency');
  });

  it('6. CareerIntelligencePage.jsx incorporates cooldown handling and components', () => {
    const pagePath = path.join(clientDir, 'pages/CareerIntelligencePage.jsx');
    expect(fs.existsSync(pagePath)).toBe(true);

    const content = fs.readFileSync(pagePath, 'utf8');
    expect(content).toContain('ReadinessGauge');
    expect(content).toContain('WeeklyMomentumReport');
    expect(content).toContain('SkillGapMatrix');
    expect(content).toContain('RoleRecommendationsCard');
    expect(content).toContain('LearningRoadmapTimeline');
    expect(content).toContain('NextActionsList');
    expect(content).toContain('PreferencesModal');
    expect(content).toContain('SparseDataPrompt');
    expect(content).toContain('COOLDOWN_ACTIVE');
    expect(content).toContain('cooldownSeconds');
  });

  it('7. App.jsx defines route for career-intelligence', () => {
    const appPath = path.join(clientDir, 'App.jsx');
    const content = fs.readFileSync(appPath, 'utf8');

    expect(content).toContain('CareerIntelligencePage');
    expect(content).toContain('path="career-intelligence"');
  });

  it('8. Navbar.jsx includes Career Intelligence nav link and displays Phase 9 badge', () => {
    const navbarPath = path.join(clientDir, 'layouts/Navbar.jsx');
    const content = fs.readFileSync(navbarPath, 'utf8');

    expect(content).toContain("name: 'Career Intelligence'");
    expect(content).toContain("path: '/career-intelligence'");
    expect(content).toContain('Phase 9');
  });

  it('9. DashboardPage.jsx incorporates Career Intelligence metric card and roadmap milestone', () => {
    const dashPath = path.join(clientDir, 'pages/DashboardPage.jsx');
    const content = fs.readFileSync(dashPath, 'utf8');

    expect(content).toContain('careerIntelligenceService');
    expect(content).toContain('Career Readiness Index');
    expect(content).toContain('Phase 9 Active');
    expect(content).toContain('/career-intelligence');
  });
});
