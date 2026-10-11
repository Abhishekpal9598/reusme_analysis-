import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bot, Menu, X, LayoutDashboard, Home, LogIn, UserPlus, LogOut, User, FileText, Target, MessageSquareCode, Kanban, Sparkles } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../hooks/useAuth';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ...(isAuthenticated
      ? [
          { name: 'Resumes', path: '/resumes', icon: FileText },
          { name: 'Job Match', path: '/job-matches', icon: Target },
          { name: 'Mock Interview', path: '/interviews', icon: MessageSquareCode },
          { name: 'Tracker', path: '/applications', icon: Kanban },
          { name: 'Career Intelligence', path: '/career-intelligence', icon: Sparkles },
        ]
      : []),
  ];

  const isActive = (path) =>
    location.pathname === path ||
    (path === '/job-matches' && location.pathname === '/jobs/match') ||
    (path === '/interviews' && location.pathname.startsWith('/interviews')) ||
    (path === '/applications' && location.pathname.startsWith('/applications')) ||
    (path === '/career-intelligence' && location.pathname.startsWith('/career-intelligence'));

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Cluster: Brand Logo + Primary Nav Links */}
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1 transition-opacity hover:opacity-90"
              aria-label="CareerAI Home"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">CareerAI</span>
                <Badge variant="teal" size="sm">Phase 9</Badge>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      active
                        ? 'bg-slate-900 text-emerald-400 font-semibold border border-slate-800 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Cluster: Auth Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link to="/resumes">
                  <Button variant="secondary" size="sm">
                    <FileText className="w-4 h-4" />
                    <span>My Resumes</span>
                  </Button>
                </Link>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <span className="max-w-[120px] truncate">{user?.fullName}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Sign Out">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            ) : (
              <>
                <Link to="/login" tabIndex={-1}>
                  <Button variant="ghost" size="sm">
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </Button>
                </Link>
                <Link to="/register" tabIndex={-1}>
                  <Button variant="primary" size="sm">
                    <UserPlus className="w-4 h-4" />
                    <span>Get Started</span>
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors flex items-center justify-center"
              aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {isOpen && (
        <div
          id="mobile-navigation"
          className="md:hidden border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 pt-3 pb-6 space-y-4 shadow-xl"
        >
          <nav className="flex flex-col space-y-1.5" aria-label="Mobile Navigation">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] ${
                    active
                      ? 'bg-slate-800 text-emerald-400 font-semibold border border-slate-700/60'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2.5">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-sm font-medium text-slate-200">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span>{user?.fullName} ({user?.email})</span>
                </div>
                <Link to="/resumes" onClick={() => setIsOpen(false)} className="w-full">
                  <Button variant="secondary" size="md" className="w-full justify-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Manage Resumes
                  </Button>
                </Link>
                <Button variant="outline" size="md" onClick={handleLogout} className="w-full justify-center">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsOpen(false)} className="w-full">
                  <Button variant="outline" size="md" className="w-full justify-center">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setIsOpen(false)} className="w-full">
                  <Button variant="primary" size="md" className="w-full justify-center">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
