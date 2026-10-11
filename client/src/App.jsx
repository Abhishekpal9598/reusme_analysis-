import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ResumesPage } from './pages/ResumesPage';
import { JobMatchPage } from './pages/JobMatchPage';
import { InterviewSetupPage } from './pages/InterviewSetupPage';
import { InterviewSessionPage } from './pages/InterviewSessionPage';
import { InterviewReportPage } from './pages/InterviewReportPage';
import { ApplicationTrackerPage } from './pages/ApplicationTrackerPage';
import { CareerIntelligencePage } from './pages/CareerIntelligencePage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="resumes" element={<ResumesPage />} />
            <Route path="job-matches" element={<JobMatchPage />} />
            <Route path="jobs/match" element={<JobMatchPage />} />
            <Route path="interviews" element={<InterviewSetupPage />} />
            <Route path="interviews/:id" element={<InterviewSessionPage />} />
            <Route path="interviews/:id/report" element={<InterviewReportPage />} />
            <Route path="applications" element={<ApplicationTrackerPage />} />
            <Route path="career-intelligence" element={<CareerIntelligencePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
