import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Sparkles,
  Target,
  MessageSquareCode,
  Kanban,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';

export const LandingPage = () => {
  const features = [
    {
      icon: FileText,
      title: 'Deterministic Document Parsing',
      description: 'Reliable text extraction from PDF, DOCX, and TXT files, preserving document section taxonomy without data corruption.',
      tag: 'Phase 4',
    },
    {
      icon: Sparkles,
      title: 'AI Resume Quality Audit',
      description: 'Overall score (0–100) and 5 category sub-scores (Impact, Brevity, Style, Skills, ATS Readability) with line-by-line bullet rewrites.',
      tag: 'Phase 5',
    },
    {
      icon: Target,
      title: 'Bi-Directional Job Matching',
      description: 'Semantic skill gap analysis identifying matched competencies, missing prerequisites, and unverified experiences.',
      tag: 'Phase 6',
    },
    {
      icon: MessageSquareCode,
      title: 'Contextual Interview Simulator',
      description: 'Dynamic generation of technical and STAR behavioral questions tailored to your resume with AI rubric evaluations.',
      tag: 'Phase 7',
    },
    {
      icon: Kanban,
      title: 'Application Lifecycle Tracker',
      description: 'Centralized Kanban pipeline managing job applications from Saved and Applied to Interviewing and Offer stages.',
      tag: 'Phase 8',
    },
    {
      icon: ShieldCheck,
      title: 'Privacy-First & 1-Click Wipe',
      description: 'Secure HttpOnly cookie session management and 1-click total account and data deletion for absolute privacy.',
      tag: 'Phase 3',
    },
  ];

  return (
    <div className="space-y-24 py-6">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-medium">
          <Zap className="w-3.5 h-3.5" />
          <span>Production-Oriented Full-Stack Career Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Supercharge Your Job Search with{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
            Structured AI Intelligence
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Transform raw resumes into actionable, high-impact career assets. Evaluate alignment with target job descriptions, practice tailored interviews, and track every application stage.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link to="/dashboard">
            <Button variant="primary" size="lg">
              Explore Dashboard Demo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="secondary" size="lg">
              Create Free Account
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Banner */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Google Gemini 1.5 Integration
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Strict Zod Schema Validation
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            HttpOnly Cookie Security
          </span>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Engineered for Precision & Career Acceleration
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            A modular architecture designed from the ground up to provide deterministic, schema-validated outputs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} hoverEffect className="flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant="info" size="sm">{feature.tag}</Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Advisory & Non-Guarantee Notice Card */}
      <section className="max-w-3xl mx-auto">
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 text-center">
          <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Important Advisory & Design Philosophy
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            CareerAI match scores and alignment ratings are calculated through semantic keyword extraction and structural taxonomy analysis. <strong>They do not represent or guarantee hiring probabilities, interview selections, or job offers.</strong> CareerAI serves strictly as an assistive advisory tool.
          </p>
        </div>
      </section>
    </div>
  );
};
